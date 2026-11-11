// Lobby rows, pairing, requests and per-TV settings. The Emby plugin's TV API is mocked at
// the network boundary (including CORS preflights); the public Tizen API is mocked as in
// check-browser.mjs. No Emby server, Seerr or TV is contacted.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { openPreview, root } from './browser.mjs';

const SERVER = 'https://cf.test:8096', TOKEN = 'tok_0123456789abcdefghijklmnop', EMBY_APP = 'vYmY3ACVaa.emby';
const out = root + '.local/qa/media/';
mkdirSync(out, { recursive: true });
const report = { scope: 'Production UI in Chromium; mocked Lobby plugin API and Tizen API; no network.', checks: [], failures: [], pageErrors: [] };
let preview, current, section = '', api;

function check(name, pass, detail) {
  const result = { section, name, passed: !!pass, ...(pass ? {} : { detail }) };
  report.checks.push(result);
  if (!pass) { report.failures.push(result); throw Error(name + (detail !== undefined ? ': ' + JSON.stringify(detail).slice(0, 600) : '')); }
}
async function run(name, fn) {
  if (process.env.CHECK_SECTION && !name.toLowerCase().includes(process.env.CHECK_SECTION.toLowerCase())) return;
  section = name;
  try { await fn(); console.log(name + ': passed'); }
  catch (error) { if (!report.failures.some(f => f.section === name)) report.failures.push({ section: name, error: error.stack }); console.error(name + ': ' + error.message); }
  finally { if (current) { current.__closing = true; await current.close(); current = null; } }
}

/* ---------- Mock Lobby plugin ---------- */
const ROWS = [
  { Id: 'continue', Title: 'Continue Watching', Source: 'library' },
  { Id: 'nextup', Title: 'Next Up', Source: 'library' },
  { Id: 'livenow', Title: 'On Now', Source: 'livetv' },
  { Id: 'sports', Title: 'Your Teams', Source: 'livetv' },
  { Id: 'seerr-trending', Title: 'Trending', Source: 'seerr' },
  { Id: 'seerr-movies', Title: 'Popular Movies', Source: 'seerr' },
  { Id: 'seerr-tv', Title: 'Popular Shows', Source: 'seerr' }
];
const soon = new Date(Date.now() + 3 * 3600e3).toISOString(), began = new Date(Date.now() - 1800e3).toISOString(), ends = new Date(Date.now() + 1800e3).toISOString();
const ITEMS = {
  continue: [
    { Id: '101', Kind: 'movie', Title: 'Arrival', Year: 2016, Subtitle: '2016', LandscapeUrl: '/emby/Items/101/Images/Backdrop?tag=a', PosterUrl: '/emby/Items/101/Images/Primary?tag=b', ProgressPercent: 42, PositionTicks: 300e8, RuntimeTicks: 700e8, PlayItemId: '101', DefaultAction: 'resume' },
    { Id: '102', Kind: 'episode', Title: 'Severance', Subtitle: 'S2:E3 · Who Is Alive?', LandscapeUrl: '/emby/Items/102/Images/Primary?tag=c', LogoUrl: '/emby/Items/f3/Images/Logo?tag=2', ProgressPercent: 12, PositionTicks: 60e8, RuntimeTicks: 500e8, PlayItemId: '102', DefaultAction: 'resume' },
    { Id: '103', Kind: 'movie', Title: 'Title <img src=x onerror="window.__mediaXss=1">', Year: 2001, LandscapeUrl: '', PlayItemId: '103', DefaultAction: 'resume', ProgressPercent: 80 }
  ],
  nextup: Array.from({ length: 9 }, (_, i) => ({ Id: String(200 + i), Kind: 'episode', Title: 'Show ' + (i + 1), Subtitle: 'S1:E' + (i + 2) + ' · Episode', LandscapeUrl: '/emby/Items/' + (200 + i) + '/Images/Primary?tag=x', PlayItemId: String(200 + i), DefaultAction: 'play' })),
  livenow: [{ Id: 'p1', Kind: 'program', Title: 'The News', Subtitle: 'Evening', ChannelName: 'CBC', PlayItemId: '901', DefaultAction: 'play', StartDate: began, EndDate: ends, IsAiring: true, ProgressPercent: 50, LandscapeUrl: '/emby/Items/901/Images/Primary?tag=l' }],
  sports: [{ Id: 'p2', Kind: 'program', Title: 'NHL Hockey', Subtitle: 'Maple Leafs at Bruins', ChannelName: 'Sportsnet', PlayItemId: '902', DefaultAction: 'play', StartDate: soon, EndDate: soon, IsAiring: false }],
  'seerr-trending': Array.from({ length: 14 }, (_, i) => ({ Id: 'movie:' + (500 + i), Kind: 'discover', Title: 'Trending ' + (i + 1), Year: 2020 + (i % 5), TmdbId: 500 + i, MediaType: i % 3 ? 'movie' : 'tv',
    RequestStatus: i === 0 ? 'available' : i === 1 ? 'requested' : i === 4 ? 'partial' : 'none', PosterUrl: 'https://image.tmdb.org/t/p/w342/p' + i + '.jpg', Overview: 'A film about ' + (i + 1) + ' things.',
    // The plugin links available and partly available titles to the library.
    ...(i === 0 ? { PlayItemId: '701', PlayAction: 'resume', DefaultAction: 'resume' } : i === 4 ? { PlayItemId: '702', PlayAction: 'play', DefaultAction: 'request' } : { DefaultAction: 'request' }) })),
  'seerr-movies': [{ Id: 'movie:603', Kind: 'discover', Title: 'The Matrix', Year: 1999, TmdbId: 603, MediaType: 'movie', RequestStatus: 'none', PosterUrl: 'https://image.tmdb.org/t/p/w342/m.jpg', DefaultAction: 'request' }],
  'seerr-tv': []
};
const FEATURED = [
  { Id: 'f1', Kind: 'movie', Title: 'Arrival', Tagline: 'Twelve ships, one language, and plenty of questions — why are they really here, anyway?', Overview: 'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.',
    BackdropUrl: '/emby/Items/f1/Images/Backdrop?tag=1', Meta: '2016 · PG-13 · 1h 10m left', FeatureReason: 'resume', PlayItemId: '101', DefaultAction: 'resume', ProgressPercent: 42 },
  { Id: 'movie:880', Kind: 'discover', Title: 'The Long Walk', Overview: 'Teenage boys compete in an annual walking contest with deadly rules.', BackdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
    Meta: '2025 · Movie · Thriller · 1h 48m', FeatureReason: 'trending', TmdbId: 880, MediaType: 'movie', RequestStatus: 'none', DefaultAction: 'request' },
  { Id: 'f3', Kind: 'series', Title: 'Severance', Tagline: 'Work is a mystery', Overview: 'Office workers have their memories surgically divided between work and personal lives.', LogoUrl: '/emby/Items/f3/Images/Logo?tag=2',
    BackdropUrl: '/emby/Items/f3/Images/Backdrop?tag=3', Meta: 'S2 E4 · TV-MA · Drama', FeatureReason: 'new', PlayItemId: '305', DefaultAction: 'play' },
  { Id: 'g1', Kind: 'program', Title: 'NHL Hockey', Subtitle: 'Maple Leafs at Bruins', Tagline: 'Maple Leafs at Bruins', ChannelName: 'Sportsnet', FeatureReason: 'game',
    PlayItemId: '903', DefaultAction: 'play', StartDate: began, EndDate: ends, IsAiring: true, LandscapeUrl: '/emby/Items/ch1/Images/Primary?tag=c' }
];
function freshApi(over = {}) {
  return {
    order: ROWS.map(r => r.Id), hidden: [], teams: ['Toronto Maple Leafs'], limit: 20, look: 12, delay: 1500, wait: 45, customized: false,
    approveAfter: 2, statusCalls: 0, pairs: [], plays: [], requests: [], saves: [], calls: [], unauthorized: false, unreachable: false, noPlugin: false,
    featured: FEATURED, playStatus: 'queued', requesters: [{ Id: 1, Name: 'Steve' }, { Id: 2, Name: 'Jess' }], lastRequester: 2, requestStatus: 2, requestsEnabled: true,
    teamsList: [
      { Name: 'Toronto Maple Leafs', League: 'NHL Hockey', Games: 2, NextStartDate: soon, Selected: true },
      { Name: 'Boston Bruins', League: 'NHL Hockey', Games: 1, NextStartDate: soon, Selected: false },
      { Name: 'Toronto Blue Jays', League: 'MLB Baseball', Games: 3, NextStartDate: soon, Selected: false }
    ],
    ...over
  };
}
function settingsJson() {
  return {
    Rows: api.order.map(id => { const r = ROWS.find(x => x.Id === id); return { Id: id, Title: r.Title, Source: r.Source, Visible: !api.hidden.includes(id), Available: id !== 'seerr-tv', Reason: id === 'seerr-tv' ? 'Seerr isn’t set up on the server.' : null }; }),
    RowLimit: api.limit, SportsLookaheadHours: api.look, PlayDelayMs: api.delay, PlayTimeoutSeconds: api.wait, SportsTeams: api.teams.slice(), Customized: api.customized,
    Ranges: { RowLimit: { Min: 1, Max: 100, Default: 20 } }
  };
}
function homeJson() {
  return {
    TvName: 'Living Room', UserName: 'steve', RequestsEnabled: api.requestsEnabled, Warnings: [], Featured: api.featured,
    Rows: api.order.filter(id => !api.hidden.includes(id) && ITEMS[id].length).map(id => ({ Id: id, Title: ROWS.find(r => r.Id === id).Title, Layout: id.startsWith('seerr') ? 'poster' : 'landscape', Items: ITEMS[id].slice(0, api.limit) }))
  };
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
function art(text, w, h) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#3a5568"/><stop offset="1" stop-color="#8a6a4a"/></linearGradient></defs>'
    + '<rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="54%" fill="#fff" font-family="sans-serif" font-size="' + Math.round(h / 8) + '" text-anchor="middle">' + text.replace(/[<&]/g, '') + '</text></svg>';
}
async function handle(route) {
  const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method();
  const json = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
  // Featured backdrops borrow the bundled photographs, so screenshots show how text sits over a real image.
  if (path.includes('/Images/Backdrop')) return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'image/jpeg' }, body: readFileSync(root + 'app/assets/wallpapers/' + (path.includes('/f3/') ? 'bridge' : 'alpine') + '.jpg') });
  if (path.includes('/Images/Logo')) return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'image/svg+xml' }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140"><text x="100%" y="110" fill="#fff" font-family="serif" font-size="112" text-anchor="end" letter-spacing="8">LOGO</text></svg>' });
  if (path.startsWith('/emby/Items/')) return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'image/svg+xml' }, body: art(path.split('/')[3], 320, 180) });
  if (api.unreachable) return route.abort('connectionrefused');
  const body = req.postData() ? JSON.parse(req.postData()) : null, auth = req.headers().authorization || '';
  api.calls.push({ method, path, body, auth, search: url.search });
  if (path === '/emby/System/Info/Public') return json(200, { ServerName: 'Basement', Version: '4.10.2.0', Id: 'abc' });
  if (path === '/emby/Lobby/Pair' && method === 'POST') {
    if (api.noPlugin) return json(404, { message: 'not found' });
    api.pairs.push(body); return json(200, { PairingId: 'pid1', Code: 'K7QX', Secret: 'sec1', ExpiresInSeconds: 900 });
  }
  if (path === '/emby/Lobby/Pair/Status') {
    api.statusCalls++;
    if (url.searchParams.get('Secret') !== 'sec1') return json(200, { Status: 'expired' });
    return json(200, api.statusCalls >= api.approveAfter ? { Status: 'approved', Token: TOKEN, TvName: 'Living Room' } : { Status: 'pending' });
  }
  if (!path.startsWith('/emby/Lobby/')) return json(404, { message: 'nope' });
  if (api.unauthorized || auth !== 'Lobby ' + TOKEN) return json(401, { Message: 'This TV is not paired with Lobby (or was removed). Pair it again.' });
  const op = path.slice('/emby/Lobby'.length);
  if (op === '/Home') return json(200, homeJson());
  if (op.startsWith('/Search')) {
    const q = (url.searchParams.get('query') || '').trim();
    const rows = q.length >= 2 ? [
      { Id: 'search-library', Title: 'In your library', Layout: 'poster', Items: [
        { Id: '101', Kind: 'movie', Title: 'Arrival', Year: 2016, PosterUrl: '/emby/Items/101/Images/Primary?tag=b', PlayItemId: '101', DefaultAction: 'play' }
      ] },
      { Id: 'search-seerr', Title: 'Request from Seerr', Layout: 'poster', Items: [
        { Id: 'movie:603', Kind: 'discover', Title: 'The Matrix', Year: 1999, TmdbId: 603, MediaType: 'movie', RequestStatus: 'none', PosterUrl: 'https://image.tmdb.org/t/p/w342/m.jpg', DefaultAction: 'request' }
      ] }
    ] : [];
    return json(200, { TvName: 'Living Room', UserName: 'steve', RequestsEnabled: api.requestsEnabled, Warnings: [], Rows: rows });
  }
  if (op === '/Settings' && method === 'GET') return json(200, settingsJson());
  if (op === '/Settings' && method === 'POST') {
    api.saves.push(body); api.customized = true;
    if (body.RowOrder) api.order = body.RowOrder.concat(ROWS.map(r => r.Id).filter(id => !body.RowOrder.includes(id)));
    if (body.HiddenRows) api.hidden = body.HiddenRows.slice();
    if (body.RowLimit) api.limit = body.RowLimit;
    if (body.SportsLookaheadHours) api.look = body.SportsLookaheadHours;
    if (body.PlayDelayMs !== undefined && body.PlayDelayMs !== null) api.delay = body.PlayDelayMs;
    if (body.PlayTimeoutSeconds) api.wait = body.PlayTimeoutSeconds;
    if (body.SportsTeams) { api.teams = body.SportsTeams.slice(); api.teamsList.forEach(t => { t.Selected = api.teams.includes(t.Name); }); }
    return json(200, settingsJson());
  }
  if (op === '/Settings/Reset') { api.customized = false; api.hidden = []; api.order = ROWS.map(r => r.Id); api.limit = 20; return json(200, settingsJson()); }
  if (op === '/Sports/Teams') return json(200, { Days: 7, Teams: api.teamsList.map(t => ({ ...t })), Message: null });
  if (op === '/Details') {
    if (api.detailsDelay) await new Promise(r => setTimeout(r, api.detailsDelay));
    const id = Number(url.searchParams.get('TmdbId'));
    return json(200, id === 502 ? {
      Tagline: 'Three things, one night.', Overview: 'A film about 3 things.', Genres: ['Science Fiction', 'Adventure'], RuntimeMinutes: 166, Rating: 8.16,
      Directors: ['Denis Villeneuve'], Writers: ['Jon Spaihts', 'Denis Villeneuve'], Creators: [], Networks: [],
      Cast: [{ Name: 'Timothée Chalamet', Character: 'Paul Atreides', PhotoUrl: 'https://image.tmdb.org/t/p/w185/tc.jpg' }, { Name: 'Zendaya', Character: 'Chani', PhotoUrl: 'https://image.tmdb.org/t/p/w185/z.jpg' },
        { Name: 'Rebecca Ferguson', Character: 'Lady Jessica' }, { Name: 'Javier Bardem', Character: 'Stilgar', PhotoUrl: 'https://image.tmdb.org/t/p/w185/jb.jpg' },
        { Name: 'Josh Brolin', Character: 'Gurney Halleck', PhotoUrl: 'https://image.tmdb.org/t/p/w185/jbr.jpg' }, { Name: 'Austin Butler', Character: 'Feyd-Rautha', PhotoUrl: 'https://image.tmdb.org/t/p/w185/ab.jpg' },
        { Name: 'Florence Pugh', Character: 'Princess Irulan', PhotoUrl: 'https://image.tmdb.org/t/p/w185/fp.jpg' }, { Name: 'Dave Bautista', Character: 'Rabban', PhotoUrl: 'https://image.tmdb.org/t/p/w185/db.jpg' }]
    } : { Genres: [], Directors: [], Writers: [], Creators: [], Networks: [], Cast: [] });
  }
  if (op === '/Requesters') return json(200, { RequestsEnabled: api.requestsEnabled, Requesters: api.requesters, LastRequesterId: api.lastRequester, UsingFallback: false });
  if (op === '/Request') { api.requests.push(body); return json(200, api.requestStatus === 0 ? { Status: 'failed', Message: 'Request for this media already exists.' } : { Status: api.requestStatus === 2 ? 'approved' : 'requested', RequestId: 9 }); }
  if (op === '/Play') { api.plays.push(body); return json(200, api.playStatus === 'failed' ? { Status: 'failed', Message: 'This TV has no Emby app device assigned in the Lobby settings.' } : { Status: api.playStatus }); }
  return json(404, { Message: 'Unknown' });
}

/* ---------- Page harness ---------- */
function installHarness({ paired, cacheHome, staleMs, look, featureMs, catalog, sources, dock, combine }) {
  if (!sessionStorage.getItem('__seeded')) {
    localStorage.setItem('cleanframe.home.v1', JSON.stringify({ dock: dock || ['stremio', 'netflix', 'disneyplus', 'youtube', 'appletv', 'primevideo', 'abciview', 'sbs', 'applemusic'], wallpaper: 'misty', mode: 'fixed', lastApp: 'netflix', theme: 'shore', ...(combine ? { combineResume: true } : {}), ...(look ? { look: { layout: look } } : {}) }));
    if (paired) localStorage.setItem('lobby.server.v1', JSON.stringify({ url: 'https://cf.test:8096', token: 'tok_0123456789abcdefghijklmnop', tvName: 'Living Room' }));
    if (cacheHome) localStorage.setItem('lobby.home.cache.v1', JSON.stringify({ at: 1, data: cacheHome }));
    sessionStorage.setItem('__seeded', '1');
  }
  window.ShoreQA = { minuteMs: 60000, pollMs: 40, staleMs: staleMs || 30000, featureMs: featureMs || 600000 };
  window.__tv = { calls: [], launchFailure: false, sources: sources || null };
  window.tizen = {
    ApplicationControlData: function (key, value) { this.key = key; this.value = value; },
    ApplicationControl: function (operation, uri, mime, category, data) { Object.assign(this, { operation, uri, mime, category, data }); },
    application: {
      getCurrentApplication() { return { appInfo: { id: 'lobbyTV001.Lobby' } }; },
      getAppsInfo(ok) { setTimeout(() => ok((catalog || []).map(a => ({ ...a }))), 0); },
      launch(id, ok, fail) { window.__tv.calls.push({ method: 'launch', id }); setTimeout(() => window.__tv.launchFailure ? fail({ name: 'NotFoundError', message: 'missing' }) : ok(), 0); },
      launchAppControl(control, id, ok) { window.__tv.calls.push({ method: 'launchAppControl', id }); setTimeout(ok, 0); }
    },
    ...(sources ? {
      systeminfo: { getPropertyValue(name, ok, fail) { setTimeout(() => name === 'VIDEOSOURCE' ? ok(JSON.parse(JSON.stringify(window.__tv.sources))) : fail({ name: 'NotSupportedError' }), 0); } },
      tvwindow: { setSource(source, ok, fail, type) { window.__tv.calls.push({ method: 'setSource', source, type }); setTimeout(ok, 0); } }
    } : {})
  };
}
async function page(options = {}) {
  current = await preview.browser.newPage({ viewport: options.viewport || { width: 1920, height: 1080 } });
  current.setDefaultTimeout(10000);
  current.on('pageerror', error => report.pageErrors.push({ section, error: error.message }));
  current.on('requestfailed', request => {
    const allowed = api.unreachable && request.url().startsWith(SERVER);
    if (!current || current.__closing || allowed || request.failure()?.errorText === 'net::ERR_ABORTED') return;
    report.pageErrors.push({ section, url: request.url(), error: request.failure()?.errorText });
  });
  await current.route(SERVER + '/**', handle);
  await current.route('https://image.tmdb.org/**', route => route.fulfill({ status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, body: art('Poster', 200, 300) }));
  // Registered last, so it is matched first.
  await current.route('https://image.tmdb.org/t/p/w1280/**', route => route.fulfill({ status: 200, headers: { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' }, body: readFileSync(root + 'app/assets/wallpapers/amber.jpg') }));
  await current.addInitScript(installHarness, { paired: !!options.paired, cacheHome: options.cacheHome || null, staleMs: options.staleMs || 0, look: options.look || null, featureMs: options.featureMs || 0, catalog: options.catalog || null, sources: options.sources || null, dock: options.dock || null, combine: !!options.combine });
  await current.goto(preview.baseURL + '/home/');
  await current.waitForFunction(() => window.ShoreQA && ShoreQA.ready && ShoreQA.ready());
  if (options.paired && options.waitRows !== false) await current.waitForFunction(() => ShoreQA.state().media.rows.length > 0 && !ShoreQA.state().media.loading);
  await current.waitForTimeout(250);
  return current;
}
const state = () => current.evaluate(() => ShoreQA.state());
const where = () => current.evaluate(() => ShoreQA.where());
const act = action => current.evaluate(a => ShoreQA.activate(a), action);
const scene = name => current.evaluate(n => ShoreQA.scene(n), name);
async function nav(...keys) { for (const k of keys) await current.evaluate(key => ShoreQA.nav(key), k); }
const shot = name => current.screenshot({ path: out + name + '.png' });
const until = (fn, arg) => current.waitForFunction(fn, arg, { timeout: 8000 });
const settle = () => current.waitForTimeout(220);
async function untilNode(fn, ms = 8000) { const end = Date.now() + ms; while (!fn()) { if (Date.now() > end) throw Error('Timed out waiting for the mock server'); await new Promise(r => setTimeout(r, 30)); } }
/* Settings lines outside the visible list are not rendered as targets; move down until one is. */
async function reach(action) {
  for (let i = 0; i < 24; i++) {
    if ((await current.evaluate(() => ShoreQA.actions())).includes(action)) return act(action);
    await nav('down');
  }
  throw Error('Could not reach ' + action);
}

async function main() {
  preview = await openPreview({ publicFonts: true });
  try {
    await run('Unpaired Home is unchanged and contacts no server', async () => {
      api = freshApi(); await page();
      const s = await state();
      check('no media state', !s.media.paired && s.media.rows.length === 0);
      check('no request to any server', api.calls.length === 0, api.calls);
      check('rows hidden', await current.locator('#media').evaluate(el => getComputedStyle(el).display) === 'none');
      await nav('up'); check('Up from the dock still reaches the Home controls', (await where()).zone === 'util');
      await scene('settings');
      check('Settings lists Emby & Seerr, not connected', (await current.locator('[data-action="settings.group.media"]').textContent()).includes('Not connected'));
      const box = await current.locator('.settings-group').evaluateAll(els => els.map(e => e.getBoundingClientRect().bottom));
      const hint = await current.locator('.settings-overview-hint').evaluate(e => e.getBoundingClientRect().top);
      check('eight groups fit above the hint', Math.max(...box) < hint, { box, hint });
      await shot('settings-overview');
    });

    await run('Pairing with keypad, remote digits and approval', async () => {
      api = freshApi(); await page();
      await scene('settings'); await act('settings.group.media');
      check('Connect opens', (await state()).view === 'connect');
      await current.keyboard.type('cftest');
      check('letters are ignored by the keypad', (await current.locator('.cn-field').textContent()).trim() === '192.168.1.10', await current.locator('.cn-field').textContent());
      await act('connect.key.go');
      check('empty address explains the format', (await current.locator('.s-sub').textContent()).includes('like 192.168.1.10'));
      await current.keyboard.type('10.0.0.5');
      check('focus stays on Connect after using it', (await where()).focusAction === 'connect.key.go');
      await nav('up', 'ok');                                     // ':' sits above Connect
      for (const d of '8096') await current.keyboard.press(d);
      check('address typed with keys and keypad', (await current.locator('.cn-field').textContent()).trim() === '10.0.0.5:8096');
      await nav('down', 'left', 'ok');                           // Delete
      check('Delete removes one character', (await current.locator('.cn-field').textContent()).trim() === '10.0.0.5:809');
      await current.keyboard.press('6'); await shot('connect-keypad');
      for (let i = 0; i < 13; i++) await current.keyboard.press('Backspace');
      check('Backspace deletes rather than closing', (await state()).view === 'connect' && (await current.locator('.cn-field').textContent()).trim() === '192.168.1.10');
      for (let i = 0; i < 12; i++) await current.keyboard.press('Backspace');
      // The mocked server has a hostname: ABC switches to the hostname pad, which connects over https.
      check('ABC offers the hostname pad', (await current.locator('[data-action="connect.key.mode"]').textContent()).trim() === 'ABC');
      await act('connect.key.mode');
      check('the hostname pad explains https', (await current.locator('.s-sub').textContent()).includes('https'));
      check('123 switches back to the IP pad', (await current.locator('[data-action="connect.key.mode"]').textContent()).trim() === '123');
      await current.keyboard.type('CF.TEST:8096');
      check('letters are accepted on the hostname pad', (await current.locator('.cn-field').textContent()).trim() === 'CF.TEST:8096');
      await shot('connect-keypad-fqdn');
      await act('connect.key.go');
      await until(() => ShoreQA.state().media.step === 'code');
      check('pairing code shown', (await current.locator('.cn-code').textContent()).trim() === 'K7QX');
      check('pairing sent a device name', api.pairs[0] && api.pairs[0].DeviceName === 'Samsung TV', api.pairs);
      await shot('connect-code');
      await until(() => ShoreQA.state().media.step === 'done');
      const saved = await current.evaluate(() => JSON.parse(localStorage.getItem('lobby.server.v1')));
      check('token saved for the server', saved.url === SERVER && saved.token === TOKEN && saved.tvName === 'Living Room', saved);
      check('token never shown on screen', !(await current.locator('body').textContent()).includes(TOKEN));
      check('a newly paired TV switches Home to Watch', (await state()).layout === 'watch');
      await nav('ok');
      await until(() => ShoreQA.state().view === 'mediaset' && !!ShoreQA.state().media.settings);
      await nav('back', 'back');
      await until(() => ShoreQA.state().view === 'home' && ShoreQA.state().media.rows.length > 0);
      check('every authenticated call used the Lobby scheme', api.calls.filter(c => c.path.startsWith('/emby/Lobby/') && !c.path.includes('/Pair')).every(c => c.auth === 'Lobby ' + TOKEN));
      check('token never sent in a URL', api.calls.every(c => !c.search.includes(TOKEN)));
    });

    await run('Pairing failures explain themselves', async () => {
      api = freshApi({ unreachable: true }); await page();
      await scene('settings'); await act('settings.group.media');
      await current.evaluate(() => ShoreQA.typeAddress('cf.test:8096'));
      await act('connect.key.go');
      await until(() => ShoreQA.state().media.step === 'error');
      check('unreachable server', (await current.locator('.s-sub').textContent()).includes('Couldn’t reach cf.test:8096'));
      check('retry and change address offered', (await current.evaluate(() => ShoreQA.actions())).join(',') === 'act.retry,act.edit');
      api.unreachable = false; api.noPlugin = true;
      await act('act.retry');
      await until(() => ShoreQA.state().media.step === 'error' && document.querySelector('.s-sub').textContent.includes('plugin'));
      check('missing plugin named', (await current.locator('.s-sub').textContent()).includes('Lobby plugin isn’t installed'));
      await act('act.edit');
      check('Change address returns to the keypad with the address kept', (await state()).media.step === 'address' && (await current.locator('.cn-field').textContent()).trim() === 'cf.test:8096');
      await nav('back');
      check('Back closes Connect', (await state()).view === 'settings');
    });

    await run('Rows on Home: Dock navigation', async () => {
      api = freshApi(); await page({ paired: true });
      const s = await state();
      check('rows in server order, empty rows dropped', s.media.rows.map(r => r.id).join() === 'continue,nextup,livenow,sports,seerr-trending,seerr-movies', s.media.rows.map(r => r.id));
      check('Home starts on the apps', (await where()).zone === 'apps');
      await shot('dock-apps');
      await nav('up');
      check('Up from the dock enters the first row', (await where()).focusAction === 'media.continue.101', await where());
      await nav('left');
      check('Left at the first card stays', (await where()).focusAction === 'media.continue.101');
      await nav('right', 'right', 'right');
      check('Right stops at the last card', (await where()).focusAction === 'media.continue.103');
      check('item titles are escaped', await current.evaluate(() => !window.__mediaXss && !document.querySelector('#media img[src="x"]')));
      await nav('down');
      check('Down moves to the next row', (await where()).focusAction === 'media.nextup.200');
      await nav('right', 'right', 'right', 'right', 'right', 'right');
      await settle(); await shot('dock-row-scroll');
      check('long rows scroll to keep focus visible', await current.evaluate(() => { const f = document.querySelector('.mc.is-focus').getBoundingClientRect(), v = document.querySelector('#mediaView').getBoundingClientRect(); return f.left >= v.left - 1 && f.right <= v.right + 1; }));
      await nav('up');
      check('rows remember their own card', (await where()).focusAction === 'media.continue.103');
      await nav('up');
      check('Up from the first row reaches the Home controls', (await where()).zone === 'util');
      await nav('down');
      check('Down from the controls enters the first row', (await where()).focusAction === 'media.continue.103');
      await nav('down', 'down', 'down', 'down', 'down', 'down');
      check('Down from the last row returns to the apps', (await where()).zone === 'apps');
      await nav('up');
      check('Up returns to the last used row', (await state()).media.row === 'seerr-movies');
      await nav('back');
      check('Back from the rows returns to the apps', (await where()).zone === 'apps');
      check('exactly one focused control', (await where()).focusCount === 1);
      await nav('up'); await settle(); await shot('dock-rows');
      const overlap = await current.evaluate(() => { const v = document.querySelector('#mediaView').getBoundingClientRect(), d = document.querySelector('#dock').getBoundingClientRect(); return v.bottom <= d.top; });
      check('rows end above the dock', overlap);
      await nav('down', 'down', 'down', 'down', 'down'); await settle();
      const titles = await current.evaluate(() => { const v = document.querySelector('#mediaView').getBoundingClientRect(); return Array.from(document.querySelectorAll('.mr-title')).filter(t => { const r = t.getBoundingClientRect(); return r.bottom > v.top && r.top < v.bottom; }).map(t => t.getBoundingClientRect().top >= v.top - 1); });
      check('the last rows scroll to whole rows, titles included', titles.length > 0 && titles.every(Boolean), titles);
    });

    await run('Rows on Home: List layout and other backgrounds', async () => {
      api = freshApi(); await page({ paired: true });
      await current.evaluate(() => ShoreQA.look({ layout: 'list' })); await until(() => ShoreQA.ready());
      await settle(); await shot('list-apps');
      const plates = await current.evaluate(() => ({ list: document.querySelector('#phList').getBoundingClientRect().right, media: document.querySelector('#mediaView').getBoundingClientRect().left }));
      check('List leaves room for the rows column', plates.list <= plates.media, plates);
      await nav('right');
      check('Right from the List enters the rows', (await where()).focusAction === 'media.continue.101');
      await nav('left');
      check('Left from the first card returns to the List', (await where()).zone === 'apps');
      await nav('right', 'down', 'down', 'down', 'down', 'down', 'down');
      check('Down from the last row reaches the controls', (await where()).zone === 'util');
      await nav('up');
      check('Up from the first control returns to the last row', (await state()).media.row === 'seerr-movies');
      await settle(); await shot('list-rows');
      for (const bg of ['dark', 'light']) {
        await current.evaluate(b => ShoreQA.look({ bg: b }), bg); await until(() => ShoreQA.ready()); await settle();
        await shot('list-rows-' + bg);
      }
      await current.evaluate(() => ShoreQA.look({ layout: 'dock', bg: 'light' })); await until(() => ShoreQA.ready());
      await nav('back', 'up'); await settle(); await shot('dock-rows-light');
    });

    await run('Rows fit at 720p', async () => {
      api = freshApi(); await page({ paired: true, viewport: { width: 1280, height: 720 } });
      await nav('up'); await settle(); await shot('dock-rows-720');
      const fits = await current.evaluate(() => { const v = document.querySelector('#mediaView').getBoundingClientRect(), d = document.querySelector('#dock').getBoundingClientRect(); return v.bottom <= d.top + 1 && v.right <= window.innerWidth; });
      check('rows stay above the dock and inside the screen', fits);
    });

    await run('Play and resume ask the server first, then open Emby', async () => {
      api = freshApi(); await page({ paired: true });
      await nav('up', 'ok');
      await until(() => window.__tv.calls.length === 1);
      check('resume sent before launch', api.plays.length === 1 && api.plays[0].ItemId === '101' && api.plays[0].Action === 'resume', api.plays);
      check('Emby app launched', (await current.evaluate(() => window.__tv.calls))[0].id === EMBY_APP);
      await nav('down', 'down', 'ok');
      await until(() => window.__tv.calls.length === 2);
      check('Live TV plays the channel', api.plays[1].ItemId === '901' && api.plays[1].Action === 'play', api.plays);
      api.playStatus = 'failed';
      await nav('ok'); await until(() => ShoreQA.state().view === 'message');
      check('server refusal is shown and Emby is not opened', (await current.locator('.msg-line').textContent()).includes('no Emby app device') && (await current.evaluate(() => window.__tv.calls.length)) === 2);
      await nav('back');
      api.playStatus = 'queued';
      await current.evaluate(() => { window.__tv.launchFailure = true; });
      await nav('ok'); await until(() => ShoreQA.state().view === 'message');
      check('missing Emby app explained', (await current.locator('.msg-line').textContent()).includes('Emby isn’t installed'));
    });

    await run('Seerr request with a shared account', async () => {
      api = freshApi(); await page({ paired: true });
      await nav('up', 'down', 'down', 'down', 'down', 'right', 'right', 'ok');
      await until(() => ShoreQA.state().view === 'request' && document.querySelectorAll('.rq-acts .btn').length === 3);
      check('one button per person, last requester first in focus', (await where()).focusAction === 'act.as.2', await where());
      await until(() => document.querySelectorAll('.rq-person').length > 0);
      check('details join the year and type', (await current.locator('.rq-meta').textContent()) === '2022 · Film · 2h 46m · Science Fiction, Adventure · TMDB 8.2', await current.locator('.rq-meta').textContent());
      check('the tagline shows', (await current.locator('.rq-tagline').textContent()) === 'Three things, one night.');
      check('director and writers are named', (await current.locator('.rq-facts').textContent()) === 'Directed by Denis Villeneuve' + 'Written by Jon Spaihts, Denis Villeneuve', await current.locator('.rq-facts').textContent());
      check('up to seven cast members, with their roles', (await current.locator('.rq-person').count()) === 7 && (await current.locator('.rq-person').first().textContent()) === 'Timothée ChalametPaul Atreides');
      check('someone without a photo shows initials', (await current.locator('.rq-person').nth(2).locator('.rq-initials').textContent()) === 'RF');
      const acts = await current.locator('.rq-acts').evaluate(e => e.getBoundingClientRect().bottom), cast = await current.locator('.rq-cast').evaluate(e => e.getBoundingClientRect().bottom), status = await current.locator('.rq-status').evaluate(e => e.getBoundingClientRect().top);
      check('the cast sits above the status and buttons, which stay on screen', cast <= status && acts <= 1060, { cast, status, acts });
      check('people named', (await current.locator('.rq-acts').textContent()).includes('Request as Steve'));
      check('Home rows stay hidden behind the sheet', await current.evaluate(() => Array.from(document.querySelectorAll('#media .mc, #media .mr-title')).every(el => getComputedStyle(el).visibility === 'hidden')));
      await shot('request-choose');
      await nav('left', 'ok');
      await until(() => ShoreQA.state().view === 'request' && document.querySelector('.rq-status').textContent.includes('approved'));
      check('request sent as the chosen person', api.requests[0].SeerrUserId === 1 && api.requests[0].TmdbId === 502 && api.requests[0].MediaType === 'movie', api.requests);
      await shot('request-done');
      await nav('ok');
      check('Done returns to Home', (await state()).view === 'home');
      await untilNode(() => api.calls.filter(c => c.path.endsWith('/Home')).length >= 2);
      await nav('left', 'left');
      check('an available title offers Resume', (await current.locator('.mi-ok').textContent()).includes('Resume'));
      await nav('ok');
      await until(() => window.__tv.calls.length === 1);
      check('OK on an available title resumes it in Emby, no request screen', api.plays[0].ItemId === '701' && api.plays[0].Action === 'resume' && (await state()).view === 'home', api.plays);
      await nav('right', 'ok');
      await until(() => ShoreQA.state().view === 'request');
      check('already requested titles only explain their status', (await current.locator('.rq-status').textContent()).includes('already been requested') && api.calls.filter(c => c.path.endsWith('/Requesters')).length === 1);
      await nav('back', 'left');
      api.requestStatus = 0;
      await nav('right', 'right', 'right', 'ok');
      await until(() => document.querySelectorAll('.rq-acts .btn').length === 3);
      await nav('ok'); await until(() => document.querySelector('.rq-status .setting-error'));
      check('Seerr’s refusal is shown with Try again', (await current.locator('.rq-status').textContent()).includes('already exists') && (await current.evaluate(() => ShoreQA.actions())).includes('act.retry'));
    });

    await run('Request details load without moving the buttons', async () => {
      api = freshApi({ detailsDelay: 600 }); await page({ paired: true });
      await nav('up', 'down', 'down', 'down', 'down', 'right', 'right', 'ok');
      await until(() => ShoreQA.state().view === 'request' && document.querySelectorAll('.rq-acts .btn').length === 3);
      const before = await current.locator('.rq-acts').evaluate(e => e.getBoundingClientRect().top);
      await until(() => document.querySelectorAll('.rq-person').length > 0);
      const after = await current.locator('.rq-acts').evaluate(e => e.getBoundingClientRect().top);
      check('the buttons keep their place when details arrive', before === after, { before, after });
      await nav('back');
      await nav('right', 'ok');
      await until(() => ShoreQA.state().view === 'request' && document.querySelectorAll('.rq-acts .btn').length >= 2);
      await current.waitForTimeout(800);
      check('a title with no credits shows no empty cast section', await current.locator('.rq-cast.has-cast').count() === 0 && (await current.locator('.rq-facts').textContent()) === '');
    });

    await run('Partly available titles offer Play and Request', async () => {
      api = freshApi(); await page({ paired: true });
      await nav('up', 'down', 'down', 'down', 'down', 'right', 'right', 'right', 'right');
      check('the info line says both', (await current.locator('.mi-ok').textContent()).includes('Play or request'));
      await nav('ok');
      await until(() => ShoreQA.state().view === 'request' && document.querySelectorAll('.rq-acts .btn').length === 4);
      check('Play first and focused, then one Request per person', (await current.evaluate(() => ShoreQA.actions())).filter(a => a.startsWith('act.')).join() === 'act.play,act.as.1,act.as.2,act.close' && (await where()).focusAction === 'act.play');
      check('explains what is available', (await current.locator('.rq-status').textContent()).includes('Some of this is in your Emby library'));
      await shot('request-partial');
      await nav('ok');
      await until(() => window.__tv.calls.length === 1);
      check('Play starts the library copy', api.plays[0].ItemId === '702' && api.plays[0].Action === 'play' && (await state()).view === 'home', api.plays);
      await nav('ok');
      await until(() => document.querySelectorAll('.rq-acts .btn').length === 4);
      await nav('right', 'ok');
      await until(() => document.querySelector('.rq-status').textContent.includes('approved'));
      check('Request still works for the rest', api.requests[0].TmdbId === 504 && api.requests[0].SeerrUserId === 1, api.requests);
    });

    await run('Single requester and unlinked accounts', async () => {
      api = freshApi({ requesters: [{ Id: 1, Name: 'Steve' }], lastRequester: null }); await page({ paired: true });
      await nav('up', 'down', 'down', 'down', 'down', 'right', 'right', 'ok');
      await until(() => document.querySelectorAll('.rq-acts .btn').length === 2);
      check('one person: a plain Request button', (await current.locator('.rq-acts .btn').first().textContent()).trim() === 'Request');
      await nav('back');
      api.requesters = [];
      await nav('right', 'ok');
      await until(() => document.querySelector('.rq-status').textContent.length > 0);
      check('unlinked account explained', (await current.locator('.rq-status').textContent()).includes('isn’t linked to a Seerr account'));
    });

    await run('Unified search: keyboard, library and Seerr results', async () => {
      api = freshApi(); await page({ paired: true });
      await current.evaluate(() => ShoreQA.openSearch());
      check('Search opens from the rail control', (await state()).view === 'search');
      check('the on-screen keyboard shows every key', await current.locator('.sr-key').count() === 39);
      check('no results prompt before typing', (await current.locator('.sr-status').textContent()).includes('at least two letters'));
      // Type "AB" on the on-screen keys (A is the first key); a short pause then triggers the search.
      await nav('ok');                 // A
      await nav('right'); await nav('ok'); // B -> "AB"
      await until(() => document.querySelectorAll('.sr-group').length === 2);
      check('both result groups render', (await current.locator('.sr-group-title').allTextContents()).join('|') === 'In your library|Request from Seerr');
      check('results show library and Seerr cards', await current.locator('.sr-card').count() === 2);
      check('the search query reached the server', api.calls.some(c => c.path.endsWith('/Search') && c.search.includes('query=AB')), api.calls.map(c => c.path));
      // Into the results and play the library title.
      await nav('down', 'down', 'down', 'down', 'down', 'down', 'down');
      check('Down from the keyboard enters the results', (await where()).zone === 'results');
      await nav('ok');
      await untilNode(() => api.plays.length > 0);
      check('OK on a library result plays it', api.plays[0].ItemId === '101', api.plays);
    });

    await run('Emby & Seerr settings change this TV', async () => {
      api = freshApi(); await page({ paired: true });
      await scene('settings'); await act('settings.group.media');
      await until(() => !!ShoreQA.state().media.settings);
      await shot('mediaset');
      await act('list.row.nextup.toggle');
      await until(() => !ShoreQA.state().media.saving);
      check('Hide sends HiddenRows', JSON.stringify(api.saves[0]) === JSON.stringify({ HiddenRows: ['nextup'] }), api.saves);
      await act('list.row.seerr-trending.up');
      await until(() => !ShoreQA.state().media.saving);
      check('Move up sends the new order', api.saves[1].RowOrder.indexOf('seerr-trending') === 3, api.saves[1]);
      check('focus follows the moved row', (await where()).focusAction === 'list.row.seerr-trending.up');
      await reach('list.limit.RowLimit:8');
      await until(() => !ShoreQA.state().media.saving);
      check('items per row', api.saves[2].RowLimit === 8);
      await reach('list.delay.PlayDelayMs:3000');
      await until(() => !ShoreQA.state().media.saving);
      check('play delay', api.saves[3].PlayDelayMs === 3000);
      await reach('list.teams.teams');
      await until(() => ShoreQA.state().view === 'teams' && document.querySelectorAll('.ls-line').length > 3);
      await shot('teams');
      await act('list.team.Toronto Blue Jays.toggle');
      await until(() => !ShoreQA.state().media.saving);
      check('following a team saves the list', JSON.stringify(api.saves[4].SportsTeams) === JSON.stringify(['Toronto Maple Leafs', 'Toronto Blue Jays']), api.saves[4]);
      await act('list.done.done');
      check('Done returns to settings', (await state()).view === 'mediaset');
      await nav('back', 'back');
      await until(() => ShoreQA.state().media.rows.map(r => r.id).join() === 'continue,livenow,seerr-trending,sports,seerr-movies');
      check('Home follows the new order and hidden rows', true);
      await scene('settings'); await act('settings.group.media'); await until(() => !!ShoreQA.state().media.settings);
      await reach('list.reset.reset'); await until(() => !ShoreQA.state().media.saving && ShoreQA.state().media.note);
      check('Use defaults resets', !api.customized && (await state()).media.note.includes('server’s defaults'));
    });

    await run('Disconnect and a removed TV', async () => {
      api = freshApi(); await page({ paired: true });
      await scene('settings'); await act('settings.group.media'); await until(() => !!ShoreQA.state().media.settings);
      await reach('list.disconnect.disconnect');
      check('asks first', (await state()).view === 'message');
      await nav('right', 'ok');
      const s = await state();
      check('back on Settings, forgotten', s.view === 'settings' && !s.media.paired && s.media.rows.length === 0);
      check('storage cleared', await current.evaluate(() => !localStorage.getItem('lobby.server.v1') && !localStorage.getItem('lobby.home.cache.v1')));
      await nav('back');
      check('Home rows gone', await current.locator('#media').evaluate(el => getComputedStyle(el).display) === 'none');
      await current.close(); current = null;

      api = freshApi({ unauthorized: true });
      await page({ paired: true, waitRows: false, cacheHome: homeJson() });
      await until(() => ShoreQA.state().media.unauthorized);
      check('rows hidden when the server no longer knows this TV', (await state()).media.rows.length === 0);
      await scene('settings');
      check('Settings says to connect again', (await current.locator('[data-action="settings.group.media"]').textContent()).includes('Connect again'));
      await act('settings.group.media');
      check('opens Connect with the old address', (await state()).view === 'connect' && (await current.locator('.cn-field').textContent()).trim() === 'cf.test:8096');
    });

    await run('Watch layout: featured titles, bands and navigation', async () => {
      // Combine on, so this exercises the merged Continue Watching + Next Up row and cross-row nav.
      api = freshApi(); await page({ paired: true, look: 'watch', combine: true });
      let s = await state();
      const rect = sel => current.locator(sel).first().evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; });
      check('Watch is in use', s.media.layout === 'watch' && await current.locator('#watch').evaluate(el => getComputedStyle(el).display) === 'block');
      check('the Dock and rows of the other layouts are hidden', await current.locator('#dock').evaluate(el => getComputedStyle(el).display) === 'none');
      check('featured titles in server order', s.media.featured.join() === 'f1,movie:880,f3,g1', s.media.featured);
      check('one row per band; Continue Watching and Next Up merge, Your Teams stands alone', s.media.bands.join() === 'continue,livenow,sports,seerr-trending,seerr-movies', s.media.bands);
      const dock = await rect('#wDock');
      check('the apps dock shows at the bottom from the start', (await current.locator('#wDock .wapp').count()) === 9 && dock.b <= 1080 && dock.y >= 900, dock);
      check('Home starts on the featured title', (await where()).focusAction === 'watch.featured.f1', await where());
      check('the tagline heads the featured title', (await current.locator('.wi-head').textContent()) === 'Twelve ships, one language, and plenty of questions — why are they really here, anyway?');
      // Letters below the line (g, j, p, q, y) need room inside the two-line clamp.
      const clip = await current.evaluate(() => {
        const head = document.querySelector('.wi-head'), size = parseFloat(getComputedStyle(head).fontSize), range = document.createRange();
        range.selectNodeContents(head);
        const box = head.getBoundingClientRect(), line = parseFloat(getComputedStyle(head).lineHeight);
        // Text past the two-line clamp still has line boxes; only the shown lines matter.
        // A line's text box spans its full ascent and descent, so it must sit inside the headline.
        const shown = Array.prototype.filter.call(range.getClientRects(), r => (r.top + r.bottom) / 2 < box.top + 2 * line);
        return { room: box.bottom - Math.max.apply(null, shown.map(r => r.bottom)), size, lines: new Set(shown.map(r => Math.round(r.top))).size };
      });
      check('a long tagline takes two lines and leaves room for descenders', clip.lines === 2 && clip.room >= 0, clip);
      const info = await rect('.w-info'), firstRow = await rect('.wr-title');
      check('the featured text stays above the first row', info.b <= firstRow.y, { info, firstRow });
      check('the button names the action', (await current.locator('.wi-btn').textContent()) === 'Resume');
      check('reason and details beside the button', (await current.locator('.wi-meta').textContent()) === 'Continue watching · 2016 · PG-13 · 1h 10m left');
      check('the title shows as art when there is no logo', (await current.locator('.wa-title').textContent()) === 'Arrival');
      check('date and time at the top', /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}\d{1,2}:\d{2} [AP]M$/.test(await current.locator('#wTop').textContent()), await current.locator('#wTop').textContent());
      check('four dots, the first current', (await current.locator('.wd').count()) === 4 && (await current.locator('.wd.is-on').count()) === 1);
      await until(() => document.querySelector('.w-backdrop.is-on'));
      await current.waitForTimeout(450); await shot('watch-home');
      await nav('right');
      s = await state();
      check('Right shows the next featured title', s.media.featuredIndex === 1 && (await current.locator('.wi-head').textContent()) === 'The Long Walk');
      check('a Seerr title offers Request', (await current.locator('.wi-btn').textContent()) === 'Request');
      await nav('right');
      check('a logo replaces the title art', await current.locator('.wa-logo').count() === 1 && await current.locator('.wa-title').count() === 0);
      await nav('right');
      check('a game leads with its matchup', (await current.locator('.wi-head').textContent()) === 'Maple Leafs at Bruins' && (await current.locator('.wi-btn').textContent()) === 'Watch live');
      check('the game names the team reason, channel and time', (await current.locator('.wi-meta').textContent()) === 'Your team · Sportsnet · On now', await current.locator('.wi-meta').textContent());
      check('a game without artwork shows no backdrop', await current.locator('.w-backdrop.is-on').count() === 0);
      await nav('right');
      check('Right from the last title wraps to the first', (await state()).media.featuredIndex === 0);
      await nav('left');
      check('Left from the first title reaches the rail', (await where()).focusAction === 'util.search');
      check('the rail names the focused control', await current.locator('.wr-btn.is-focus .wr-label').evaluate(el => getComputedStyle(el).opacity) !== '0');
      await nav('down', 'down', 'down');
      check('the rail holds Search, Art Mode, All apps and Settings', (await where()).focusAction === 'util.settings');
      await nav('down');
      check('Down from Settings reaches the app dock', (await where()).focusAction === 'home.app.stremio', await where());
      await nav('left');
      check('Left from the first app returns to the rail where it left', (await where()).focusAction === 'util.settings', await where());
      await nav('ok');
      check('Settings opens from the rail', (await state()).view === 'settings');
      await nav('back');
      await nav('right');
      check('Right from the rail returns to the featured title', (await where()).zone === 'whero');
      await nav('down');
      check('Down enters the first band', (await where()).focusAction === 'media.continue.101');
      check('the top describes the focused title', (await current.locator('.wi-head').textContent()) === 'Arrival' && await current.locator('.wi-head.is-title').count() === 1);
      check('a library card carries its title and detail', (await current.locator('.wc.is-focus .wc-title').textContent()) === 'Arrival');
      check('the merged row is titled Continue Watching', (await current.locator('.wrow.is-active .wr-title').textContent()) === 'Continue Watching');
      check('a title with its own logo art shows the logo instead of its name', (await current.locator('[data-action="media.continue.102"] .wc-logo img').getAttribute('src')).includes('/emby/Items/f3/Images/Logo')
        && await current.locator('[data-action="media.continue.102"] .wc-title').count() === 0);
      check('a title with no logo still falls back to its muted name', await current.locator('[data-action="media.continue.101"] .wc-logo').count() === 0);
      await nav('right', 'right', 'right');
      check('next episodes follow the titles in progress in the same row', (await where()).focusAction === 'media.continue.200', await where());
      await nav('left');
      check('Left steps back along the row', (await where()).focusAction === 'media.continue.103');
      await nav('down', 'down');
      check('Your Teams has its own row', (await where()).focusAction === 'media.sports.p2', await where());
      await nav('down');
      check('Trending follows', (await where()).focusAction === 'media.seerr-trending.movie:500', await where());
      check('Seerr tiles carry no labels', await current.locator('.wc.is-focus .wc-label').count() === 0);
      await current.waitForTimeout(450); await shot('watch-rows');
      await nav('down', 'down');
      check('Down from the last band reaches the dock', (await where()).focusAction === 'home.app.stremio', await where());
      check('the dock names its apps', (await current.locator('.wapp.is-focus .wapp-name').textContent()) === 'Stremio');
      await current.waitForTimeout(400);
      const app = await rect('.wapp.is-focus');
      check('the dock stays in place', app.b <= 1080 && app.y >= 900, app);
      await nav('up');
      check('Up from the dock returns to the band last used', (await where()).focusAction === 'media.seerr-movies.movie:603', await where());
      await nav('down');
      await current.waitForTimeout(450); await shot('watch-apps');
      await nav('right', 'ok');
      await current.waitForTimeout(80);
      check('OK on an app launches it', (await current.evaluate(() => window.__tv.calls)).some(c => c.id === 'org.tizen.netflix-app'));
      await current.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
      await nav('back');
      check('Back returns to the featured title', (await where()).zone === 'whero');
      await nav('ok');
      await untilNode(() => api.plays.length === 1);
      check('OK on the featured title resumes it', api.plays[0].ItemId === '101' && api.plays[0].Action === 'resume', api.plays);
    });

    await run('Continue Watching and Next Up: the combine option', async () => {
      // Separate in every layout by default.
      api = freshApi(); await page({ paired: true, look: 'list' });
      let s = await state();
      check('separate by default (List shows both rows)', s.media.rows.map(r => r.id).join().includes('continue,nextup'), s.media.rows.map(r => r.id));
      // The option folds Next Up into Continue Watching, in every layout (here Dock).
      api = freshApi(); await page({ paired: true, look: 'dock', combine: true });
      s = await state();
      const row = s.media.rows.find(r => r.id === 'continue');
      check('combined drops the Next Up row (Dock)', !!row && !s.media.rows.some(r => r.id === 'nextup'), s.media.rows.map(r => r.id));
      check('titles in progress lead, then the next episodes', row.items.indexOf('101') >= 0 && row.items.indexOf('200') > row.items.indexOf('101'), row.items);
      // The toggle lives in Emby/Jellyfin & Seerr settings, after Home rows, and folds live.
      api = freshApi(); await page({ paired: true, look: 'list' });
      await scene('settings'); await act('settings.group.media'); await until(() => !!ShoreQA.state().media.settings);
      check('the Emby settings screen offers the Continue Watching toggle', await current.locator('[data-action="list.combine.on"]').count() === 1);
      // The list virtualises off-screen rows, so bring the toggle into view before activating it.
      for (let i = 0; i < 12 && await current.locator('[data-action="list.combine.on"]').evaluate(el => getComputedStyle(el).visibility === 'hidden'); i++) await nav('down');
      await act('list.combine.on');
      s = await state();
      check('turning it on merges the rows live', s.media.rows.some(r => r.id === 'continue') && !s.media.rows.some(r => r.id === 'nextup'), s.media.rows.map(r => r.id));
      await act('list.combine.off');
      s = await state();
      check('turning it off restores both rows', s.media.rows.some(r => r.id === 'continue') && s.media.rows.some(r => r.id === 'nextup'), s.media.rows.map(r => r.id));
    });

    await run('Watch layout: rotation, fallback and missing titles', async () => {
      let s2;
      api = freshApi(); await page({ paired: true, look: 'watch', featureMs: 300 });
      await until(() => ShoreQA.state().media.featuredIndex === 1);
      check('featured titles change on their own', true);
      await nav('down');
      const at = (await state()).media.featuredIndex;
      await until(n => ShoreQA.state().media.featuredIndex !== n, at);
      check('they keep changing behind a focused card', (await state()).media.featuredIndex !== at);
      check('while the top keeps describing the card', (await current.locator('.wi-head').textContent()) === 'Arrival' && (await where()).focusAction === 'media.continue.101');
      await current.close(); current = null;

      api = freshApi({ featured: undefined }); await page({ paired: true, look: 'watch' });
      s2 = await state();
      check('without featured titles from the server, the first of Continue Watching and Next Up are featured', s2.media.featured.join() === '101,200', s2.media.featured);
      check('they leave their rows', !s2.media.rows.find(r => r.id === 'continue').items.includes('101') && !s2.media.rows.find(r => r.id === 'nextup').items.includes('200'));
      check('the headline is the title, with the reason beside the button', (await current.locator('.wi-head').textContent()) === 'Arrival' && (await current.locator('.wi-meta').textContent()).startsWith('Continue watching'));
      await current.close(); current = null;

      api = freshApi({ featured: [] });
      ITEMS.continue.forEach(i => { i.__l = i.LandscapeUrl; i.LandscapeUrl = ''; }); ITEMS.nextup.forEach(i => { i.__l = i.LandscapeUrl; i.LandscapeUrl = ''; });
      try { await page({ paired: true, look: 'watch' }); }
      finally { ITEMS.continue.concat(ITEMS.nextup).forEach(i => { i.LandscapeUrl = i.__l; delete i.__l; }); }
      check('with nothing to feature, Home starts in the first band', (await where()).focusAction === 'media.continue.101', await where());
      await nav('left');
      check('Left from the first card reaches the rail', (await where()).zone === 'wrail');
      await current.close(); current = null;

      api = freshApi(); await page({ look: 'watch' });
      check('an unpaired TV uses Dock', (await state()).media.layout === 'dock' && await current.locator('#watch').evaluate(el => getComputedStyle(el).display) === 'none');
      await scene('appearance');
      check('Layout offers Watch', (await current.evaluate(() => ShoreQA.actions())).length > 0);
    });

    await run('Watch dock: installed apps and HDMI inputs', async () => {
      // The apps and inputs of the owner's Frame, as its app list and source list report them.
      const TV_APPS = [['org.tizen.netflix-app', 'Netflix'], ['9Ur5IzDKqV.TizenYouTube', 'YouTube'], ['org.tizen.primevideo', 'Prime Video'], ['MCmYXNxgcu.DisneyPlus', 'Disney+'],
        ['LBUAQX1exg.Hulu', 'Hulu'], ['com.samsung.tv.aria-video', 'Apple TV'], ['gzcc4LRFBF.Peacock', 'Peacock TV'], ['PvWgqxV3Xa.YouTubeTV', 'YouTube TV'], ['vYmY3ACVaa.emby', 'Emby'],
        ['3KA0pm7a7V.TubiTV', 'Tubi - Free Movies & TV'], ['XtU8fQk2gN.ESPN', 'ESPN'], ['rJeHak5zRg.Spotify', 'Spotify - Music and Podcasts']].map(([id, name]) => ({ id, name, show: true, iconPath: '' }));
      const SOURCES = { connected: [{ type: 'HDMI', number: 1, editName: 'Xbox' }], disconnected: [{ type: 'HDMI', number: 2, editName: 'HDMI2' }, { type: 'TV', number: 0 }, { type: 'HDMI', number: 3 }] };
      api = freshApi(); await page({ paired: true, look: 'watch', catalog: TV_APPS, sources: SOURCES });
      await until(() => document.querySelectorAll('#wDock .wapp.is-input').length === 3 && ShoreQA.state().home.length === 9);
      const s = await state();
      check('inherited defaults that aren’t installed give way to the TV’s own services', s.home.join() === 'netflix,youtube,primevideo,disneyplus,LBUAQX1exg.Hulu,appletv,gzcc4LRFBF.Peacock,PvWgqxV3Xa.YouTubeTV,vYmY3ACVaa.emby', s.home);
      check('the change is saved', (await current.evaluate(() => JSON.parse(localStorage.getItem('cleanframe.home.v1')).dock)).join() === s.home.join());
      const names = await current.locator('#wDock .wapp').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
      check('HDMI inputs follow the apps, named as the TV names them', names.slice(9).join() === 'Xbox,HDMI 2, no signal,HDMI 3, no signal', names);
      check('the tuner isn’t listed as an input', !names.some(n => /^TV/.test(n)));
      const dock = await current.locator('#wDock').evaluate(e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right }; });
      check('twelve tiles still fit on screen', dock.l >= 0 && dock.r <= 1920, dock);
      for (let i = 0; i < 10 && (await where()).zone !== 'wapps'; i++) await nav('down');
      check('Down reaches the dock', (await where()).zone === 'wapps', await where());
      for (let i = 0; i < 9; i++) await nav('right');
      check('the first input follows the last app', (await where()).focusAction === 'home.input.1', await where());
      await current.waitForTimeout(400); await shot('watch-inputs');
      await nav('ok');
      await until(() => window.__tv.calls.some(c => c.id === 'org.tizen.tv-viewer'));
      const calls = await current.evaluate(() => window.__tv.calls);
      const set = calls.find(c => c.method === 'setSource');
      check('OK switches the main picture to that input, then opens the TV viewer', set && set.source.number === 1 && set.source.editName === 'Xbox' && set.type === 'MAIN' && calls.indexOf(set) < calls.findIndex(c => c.id === 'org.tizen.tv-viewer'), calls);
      await current.close(); current = null;

      // Named devices get their own icons; inputs can be taken off Home and put back.
      const DEVICES = { connected: [{ type: 'HDMI', number: 1, editName: 'Nintendo Switch' }, { type: 'HDMI', number: 3, editName: 'Q-Series Soundbar' }], disconnected: [{ type: 'HDMI', number: 2, editName: 'HDMI2' }] };
      api = freshApi(); await page({ paired: true, look: 'watch', catalog: TV_APPS, sources: DEVICES });
      await until(() => document.querySelectorAll('#wDock .wapp.is-input').length === 3 && ShoreQA.state().home.length === 9);
      const icons = await current.locator('#wDock .wapp.is-input .wapp-input svg').evaluateAll(els => els.map(e => e.innerHTML.length));
      const kinds = await current.evaluate(() => [...document.querySelectorAll('#wDock .wapp.is-input')].map(e => e.querySelector('svg').innerHTML.includes('rect') ? 'soundbar' : e.querySelector('svg').innerHTML.includes('circle') ? 'gamepad' : 'hdmi'));
      check('Switch gets a controller, the soundbar a soundbar, a plain input the HDMI plug', kinds.join() === 'gamepad,hdmi,soundbar', { kinds, icons });
      const colour = await current.evaluate(() => ['emby', 'youtube', 'primevideo'].map(id => { const m = document.querySelector('#wDock .mark[data-mark="' + id + '"]'); return m && !!m.querySelector('img') && !m.querySelector('.mk'); }));
      check('Emby, YouTube and Prime Video show their marks in colour', colour.every(Boolean), colour);
      const tinted = await current.evaluate(() => !!document.querySelector('#wDock .mark[data-mark="netflix"] .mk'));
      check('other marks stay tinted to the theme', tinted);
      await scene('settings');
      check('Settings offers Inputs on Home with a count', (await current.locator('[data-action="settings.group.inputs"]').textContent()).includes('3 of 3'));
      const sbox = await current.locator('.settings-group').evaluateAll(els => els.map(e => e.getBoundingClientRect().bottom));
      const shint = await current.locator('.settings-overview-hint').evaluate(e => e.getBoundingClientRect().top);
      check('nine groups still fit above the hint', Math.max(...sbox) < shint, { sbox, shint });
      await act('settings.group.inputs');
      check('Inputs on Home opens', (await state()).view === 'inputs');
      await reach('list.input.2.toggle');
      await until(() => JSON.parse(localStorage.getItem('cleanframe.home.v1')).hiddenInputs.join() === '2');
      check('the hidden input is saved', true);
      check('the line now offers Add to Home', (await current.locator('[data-action="list.input.2.toggle"]').textContent()).includes('Add to Home'));
      await shot('inputs-on-home');
      await nav('back'); await nav('back');
      await until(() => document.querySelectorAll('#wDock .wapp.is-input').length === 2);
      const left = await current.locator('#wDock .wapp.is-input').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
      check('the dock leaves it out', !left.some(n => /^HDMI 2/.test(n)), left);
      await current.reload(); await until(() => ShoreQA.ready() && document.querySelectorAll('#wDock .wapp.is-input').length === 2);
      check('it stays hidden after a restart', true);
      await scene('settings'); await act('settings.group.inputs'); await reach('list.input.2.toggle');
      await until(() => JSON.parse(localStorage.getItem('cleanframe.home.v1')).hiddenInputs.length === 0);
      check('Add to Home puts it back', true);
      await current.close(); current = null;

      api = freshApi(); await page({ paired: true, look: 'watch', catalog: TV_APPS, sources: { connected: [], disconnected: [] }, dock: ['espn', 'stremio', 'netflix'] });
      await until(() => ShoreQA.state().catalog.loaded);
      await current.waitForTimeout(200);
      check('a Home the owner arranged keeps its order and drops only what isn’t installed', (await state()).home.join() === 'netflix', (await state()).home);
      check('no inputs, no input tiles', await current.locator('#wDock .wapp.is-input').count() === 0);
      await scene('settings');
      check('no inputs, no Inputs on Home setting', await current.locator('[data-action="settings.group.inputs"]').count() === 0);
    });

    await run('Watch layout follows Background', async () => {
      api = freshApi(); await page({ paired: true, look: 'watch' });
      const bgOf = sel => current.locator(sel).evaluate(el => getComputedStyle(el).backgroundColor);
      await current.evaluate(() => ShoreQA.look({ bg: 'dark' }));
      await until(() => ShoreQA.ready());
      check('Dark: a dark page', await bgOf('#watch') === 'rgb(11, 13, 17)');
      await current.waitForTimeout(400); await shot('watch-dark');
      check('names stay on but muted until focus', await current.locator('.wc:not(.is-focus) .wc-title').evaluateAll(els => els.every(e => getComputedStyle(e).color === 'rgba(244, 242, 238, 0.6)')));
      check('detail lines stay off until focus', await current.locator('.wc:not(.is-focus) .wc-sub').evaluateAll(els => els.every(e => getComputedStyle(e).opacity === '0')));
      await nav('down');
      await current.waitForTimeout(300);
      check('the focused card\'s name brightens', await current.locator('.wc.is-focus .wc-title').evaluate(e => getComputedStyle(e).color) === 'rgb(244, 242, 238)');
      check('the focused card\'s detail line joins it', await current.locator('.wc.is-focus .wc-sub').evaluate(e => getComputedStyle(e).opacity) === '1');
      check('the focus ring is a light outline', /0px 0px 0px 2px/.test(await current.locator('.wc.is-focus .mc-art').evaluate(e => getComputedStyle(e).boxShadow)));
      await nav('up');
      await current.evaluate(() => ShoreQA.look({ bg: 'light' }));
      await until(() => ShoreQA.ready());
      await current.waitForTimeout(300);
      check('Light: a light page with dark text', await bgOf('#watch') === 'rgb(238, 234, 226)' && await current.locator('.wi-head').evaluate(e => getComputedStyle(e).color) === 'rgb(28, 26, 23)');
      await shot('watch-light');
      await current.evaluate(() => ShoreQA.look({ bg: 'photo' }));
      await until(() => ShoreQA.ready());
      await current.waitForTimeout(500);
      check('Photo: the wallpaper shows behind Watch', await bgOf('#watch') === 'rgba(0, 0, 0, 0)' && await current.locator('#photo').evaluate(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e.parentNode).display !== 'none'));
      check('Photo: the Dock layout’s shading stays hidden', await current.locator('#bg .scrim').evaluate(e => getComputedStyle(e).display) === 'none');
      await shot('watch-photo');
    });

    await run('Screen saver, hero pan and backdrop accent', async () => {
      api = freshApi(); await page({ paired: true, look: 'watch' });
      check('the hero backdrop has the slow ambient pan', await current.locator('#wBackA').evaluate(el => getComputedStyle(el).animationName) === 'wKen');
      check('the backdrop accent layer is present', await current.locator('#wAccent').count() === 1);
      const red = await current.evaluate(() => { var d = []; for (var i = 0; i < 60; i++) d.push(200, 32, 32, 255); return ShoreQA.vibrant(d); });
      const rc = (red.match(/\d+/g) || []).map(Number);
      check('a red-dominant image yields a red accent', /^rgb\(/.test(red) && rc[0] > rc[1] + 40 && rc[0] > rc[2] + 40, red);
      check('screen saver is off by default', (await state()).saver === 0);
      await current.evaluate(() => ShoreQA.fireSaver());
      await current.waitForTimeout(50);
      check('with the saver off, idle does not open Art Mode', (await current.evaluate(() => window.__tv.calls)).every(c => c.id !== 'org.tizen.art-app'));
      await scene('settings');
      await act('settings.group.saver');
      check('the screen-saver screen opens from Settings', (await state()).settingsGroup === 'saver');
      await act('saver.5');
      check('choosing 5 min is saved', (await state()).saver === 5 && (await current.evaluate(() => JSON.parse(localStorage.getItem('cleanframe.home.v1')).saver)) === 5);
      check('the idle timeout reflects the chosen minutes', (await current.evaluate(() => ShoreQA.saverMs())) === 300000);
      await current.evaluate(() => ShoreQA.fireSaver());
      await until(() => window.__tv.calls.some(c => c.id === 'org.tizen.art-app'));
      const call = (await current.evaluate(() => window.__tv.calls)).find(c => c.id === 'org.tizen.art-app');
      check('with a timeout set, idle enters Samsung Art Mode', call && call.method === 'launchAppControl');
      await act('saver.0');
      check('it can be turned back off', (await state()).saver === 0);
      await current.close(); current = null;
    });

    await run('Weather chip on the Watch hero', async () => {
      api = freshApi(); await page({ paired: true, look: 'watch' });
      const icons = await current.evaluate(() => ({
        clearDay: ShoreQA.weatherIcon(0, true), clearNight: ShoreQA.weatherIcon(0, false),
        partly: ShoreQA.weatherIcon(2, true), cloud: ShoreQA.weatherIcon(3, true),
        fog: ShoreQA.weatherIcon(45, true), drizzle: ShoreQA.weatherIcon(53, true),
        rain: ShoreQA.weatherIcon(65, true), showers: ShoreQA.weatherIcon(81, true),
        snow: ShoreQA.weatherIcon(73, true), storm: ShoreQA.weatherIcon(95, true)
      }));
      check('weather codes map to the right icons', icons.clearDay === 'wx-sun' && icons.clearNight === 'wx-moon'
        && icons.partly === 'wx-partly' && icons.cloud === 'wx-cloud' && icons.fog === 'wx-fog'
        && icons.drizzle === 'wx-rain' && icons.rain === 'wx-rain' && icons.showers === 'wx-rain'
        && icons.snow === 'wx-snow' && icons.storm === 'wx-storm', icons);
      check('no chip before any weather arrives', await current.locator('#wTop .wt-wx').count() === 0);
      await current.evaluate(() => ShoreQA.applyWeather({ temp: 14, code: 61, day: true }));
      await until(() => document.querySelectorAll('#wTop .wt-wx').length === 1);
      check('the chip shows the temperature by the clock', (await current.locator('#wTop .wt-temp').textContent()) === '14\u00b0'
        && await current.locator('#wTop .wt-wx .ico').count() === 1);
      await current.evaluate(() => ShoreQA.applyWeather(null));
      await until(() => document.querySelectorAll('#wTop .wt-wx').length === 0);
      check('clearing weather removes the chip', true);
      await current.close(); current = null;
    });

    await run('Cached rows show at once and refresh on return', async () => {
      api = freshApi(); api.hidden = ['nextup'];
      await page({ paired: true, cacheHome: { Rows: [{ Id: 'cached', Title: 'From cache', Layout: 'landscape', Items: [{ Id: '1', Kind: 'movie', Title: 'Old', PlayItemId: '1' }] }] }, staleMs: 50, waitRows: false });
      await until(() => ShoreQA.state().media.rows.some(r => r.id === 'continue'));
      check('fresh rows replace the cache', !(await state()).media.rows.some(r => r.id === 'cached'));
      const before = api.calls.filter(c => c.path.endsWith('/Home')).length;
      api.hidden = [];
      await current.waitForTimeout(80);
      await current.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
      await until(n => ShoreQA.state().media.rows.some(r => r.id === 'nextup'), before);
      check('returning to Home refreshes the rows', api.calls.filter(c => c.path.endsWith('/Home')).length === before + 1);
    });
  } finally {
    await preview.close();
  }
  writeFileSync(out + 'checks.json', JSON.stringify(report, null, 2));
  const passed = report.checks.filter(c => c.passed).length;
  console.log(passed + ' checks passed; ' + report.failures.length + ' failure(s); ' + report.pageErrors.length + ' page error(s). Report: .local/qa/media/checks.json');
  if (report.pageErrors.length) console.error(JSON.stringify(report.pageErrors.slice(0, 10), null, 1));
  if (report.failures.length || report.pageErrors.length) process.exit(1);
}
main().catch(error => { console.error(error); process.exit(1); });
