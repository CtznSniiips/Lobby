// One-off generator for the screenshots embedded in the READMEs. Not part of `npm run check`.
//
// Rationale: scripts/check-media.mjs's mock catalogue uses real, recognisable titles and team
// names (as fixtures for assertions, which is fine for a test nobody looks at). README screenshots
// are different — they're published, so this script drives the same preview/mock-API harness with
// an entirely invented catalogue instead: invented movies, an invented show, an invented sports
// league and invented people, no real posters. Backdrops borrow the project's own bundled
// wallpaper photos (already used elsewhere in the app and its docs), not anyone else's artwork.
//
// Run: node scripts/generate-readme-screenshots.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { openPreview, root } from './browser.mjs';

const SERVER = 'https://cf.test:8096', TOKEN = 'tok_0123456789abcdefghijklmnop', EMBY_APP = 'vYmY3ACVaa.emby';
const out = root + 'docs/screenshots/';
mkdirSync(out, { recursive: true });

/* ---------- Invented catalogue: no real titles, teams, posters or people ---------- */
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
const art$ = t => '/emby/Items/' + encodeURIComponent(t) + '/Images/Primary?tag=x';
const ITEMS = {
  continue: [
    { Id: '101', Kind: 'movie', Title: 'Paper Moonlight', Year: 2022, LandscapeUrl: '/emby/Items/101/Images/Backdrop?tag=a', PosterUrl: art$('Paper Moonlight'), ProgressPercent: 42, PlayItemId: '101', DefaultAction: 'resume' },
    { Id: '102', Kind: 'episode', Title: 'Glass Orchard', Subtitle: 'S2:E3 · The Long Tide', LandscapeUrl: art$('Glass Orchard'), ProgressPercent: 12, PlayItemId: '102', DefaultAction: 'resume' },
    { Id: '103', Kind: 'movie', Title: 'The Tin Garden', Year: 2021, LandscapeUrl: art$('The Tin Garden'), PlayItemId: '103', DefaultAction: 'resume', ProgressPercent: 80 }
  ],
  nextup: Array.from({ length: 9 }, (_, i) => ({ Id: String(200 + i), Kind: 'episode', Title: 'Harbor Signal', Subtitle: 'S1:E' + (i + 2) + ' · Episode', LandscapeUrl: art$('Harbor Signal ' + (i + 2)), PlayItemId: String(200 + i), DefaultAction: 'play' })),
  livenow: [{ Id: 'p1', Kind: 'program', Title: 'Evening Report', Subtitle: 'Local news', ChannelName: 'Civic 4', PlayItemId: '901', DefaultAction: 'play', StartDate: began, EndDate: ends, IsAiring: true, ProgressPercent: 50, LandscapeUrl: art$('Evening Report') }],
  sports: [{ Id: 'p2', Kind: 'program', Title: 'River City Hockey League', Subtitle: 'Rockets at Comets', ChannelName: 'Metro Sports Network', PlayItemId: '902', DefaultAction: 'play', StartDate: soon, EndDate: soon, IsAiring: false, LandscapeUrl: art$('Rockets at Comets') }],
  'seerr-trending': Array.from({ length: 14 }, (_, i) => ({ Id: 'movie:' + (500 + i), Kind: 'discover', Title: 'Program ' + (i + 1), Year: 2020 + (i % 5), TmdbId: 500 + i, MediaType: i % 3 ? 'movie' : 'tv',
    RequestStatus: i === 0 ? 'available' : i === 1 ? 'requested' : i === 4 ? 'partial' : 'none', PosterUrl: art$('Program ' + (i + 1)), Overview: 'A story about ' + (i + 1) + ' things.',
    ...(i === 0 ? { PlayItemId: '701', PlayAction: 'resume', DefaultAction: 'resume' } : i === 4 ? { PlayItemId: '702', PlayAction: 'play', DefaultAction: 'request' } : { DefaultAction: 'request' }) })),
  'seerr-movies': [{ Id: 'movie:502', Kind: 'discover', Title: 'Low Tide Harbor', Year: 2022, TmdbId: 502, MediaType: 'movie', RequestStatus: 'none', PosterUrl: art$('Low Tide Harbor'), DefaultAction: 'request' }],
  'seerr-tv': []
};
const FEATURED = [
  { Id: 'f1', Kind: 'movie', Title: 'Paper Moonlight', Tagline: 'A quiet town, a missing lighthouse keeper, and one night that won’t stay buried.', Overview: 'A ferry operator investigates a string of disappearances along a foggy coastline.',
    BackdropUrl: '/emby/Items/f1/Images/Backdrop?tag=1', Meta: '2022 · PG-13 · 1h 10m left', FeatureReason: 'resume', PlayItemId: '101', DefaultAction: 'resume', ProgressPercent: 42 },
  { Id: 'movie:502', Kind: 'discover', Title: 'Low Tide Harbor', Overview: 'Three siblings return to their childhood harbour town to settle an inheritance.', BackdropUrl: '/emby/Items/f2/Images/Backdrop?tag=b',
    Meta: '2022 · Movie · Drama · 1h 48m', FeatureReason: 'trending', TmdbId: 502, MediaType: 'movie', RequestStatus: 'none', DefaultAction: 'request' },
  { Id: 'f3', Kind: 'series', Title: 'Glass Orchard', Tagline: 'Every season has its roots', Overview: 'A family orchard becomes the centre of a town’s long-buried rivalries.', LogoUrl: '/emby/Items/f3/Images/Logo?tag=2',
    BackdropUrl: '/emby/Items/f3/Images/Backdrop?tag=3', Meta: 'S2 E4 · TV-MA · Drama', FeatureReason: 'new', PlayItemId: '305', DefaultAction: 'play' },
  { Id: 'g1', Kind: 'program', Title: 'River City Hockey League', Subtitle: 'Rockets at Comets', Tagline: 'Rockets at Comets', ChannelName: 'Metro Sports Network', FeatureReason: 'game',
    PlayItemId: '903', DefaultAction: 'play', StartDate: began, EndDate: ends, IsAiring: true, LandscapeUrl: '/emby/Items/ch1/Images/Primary?tag=c' }
];
function freshApi(over = {}) {
  return {
    order: ROWS.map(r => r.Id), hidden: [], teams: ['River City Rockets'], limit: 20, look: 12, delay: 1500, wait: 45, customized: false,
    approveAfter: 2, statusCalls: 0, pairs: [], plays: [], requests: [], saves: [], calls: [], unauthorized: false, unreachable: false, noPlugin: false,
    featured: FEATURED, playStatus: 'queued', requesters: [{ Id: 1, Name: 'Alex' }, { Id: 2, Name: 'Sam' }], lastRequester: 2, requestStatus: 2, requestsEnabled: true,
    teamsList: [
      { Name: 'River City Rockets', League: 'River City Hockey League', Games: 2, NextStartDate: soon, Selected: true },
      { Name: 'Lakeside Comets', League: 'River City Hockey League', Games: 1, NextStartDate: soon, Selected: false },
      { Name: 'Riverside Harbormen', League: 'Coastal Baseball League', Games: 3, NextStartDate: soon, Selected: false }
    ],
    ...over
  };
}
function settingsJson(api) {
  return {
    Rows: api.order.map(id => { const r = ROWS.find(x => x.Id === id); return { Id: id, Title: r.Title, Source: r.Source, Visible: !api.hidden.includes(id), Available: id !== 'seerr-tv', Reason: id === 'seerr-tv' ? 'Seerr isn’t set up on the server.' : null }; }),
    RowLimit: api.limit, SportsLookaheadHours: api.look, PlayDelayMs: api.delay, PlayTimeoutSeconds: api.wait, SportsTeams: api.teams.slice(), Customized: api.customized,
    Ranges: { RowLimit: { Min: 1, Max: 100, Default: 20 } }
  };
}
function homeJson(api) {
  return {
    TvName: 'Living Room', UserName: 'alex', RequestsEnabled: api.requestsEnabled, Warnings: [], Featured: api.featured,
    Rows: api.order.filter(id => !api.hidden.includes(id) && ITEMS[id].length).map(id => ({ Id: id, Title: ROWS.find(r => r.Id === id).Title, Layout: id.startsWith('seerr') ? 'poster' : 'landscape', Items: ITEMS[id].slice(0, api.limit) }))
  };
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
function art(text, w, h) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#3a5568"/><stop offset="1" stop-color="#8a6a4a"/></linearGradient></defs>'
    + '<rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="54%" fill="#fff" font-family="sans-serif" font-size="' + Math.round(h / 8) + '" text-anchor="middle">' + text.replace(/[<&]/g, '') + '</text></svg>';
}
let api;
async function handle(route) {
  const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method();
  const json = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
  if (path.includes('/Images/Backdrop')) return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'image/jpeg' }, body: readFileSync(root + 'app/assets/wallpapers/' + (path.includes('/f3/') ? 'bridge' : path.includes('/f2/') ? 'cove' : 'alpine') + '.jpg') });
  if (path.includes('/Images/Logo')) return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'image/svg+xml' }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140"><text x="100%" y="110" fill="#fff" font-family="serif" font-size="96" text-anchor="end" letter-spacing="6">GLASS ORCHARD</text></svg>' });
  if (path.startsWith('/emby/Items/')) return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'image/svg+xml' }, body: art(decodeURIComponent(path.split('/')[3]), 320, 180) });
  const body = req.postData() ? JSON.parse(req.postData()) : null, auth = req.headers().authorization || '';
  api.calls.push({ method, path, body, auth, search: url.search });
  if (path === '/emby/System/Info/Public') return json(200, { ServerName: 'Living Room', Version: '4.10.2.0', Id: 'abc' });
  if (path === '/emby/Lobby/Pair' && method === 'POST') { api.pairs.push(body); return json(200, { PairingId: 'pid1', Code: 'K7QX', Secret: 'sec1', ExpiresInSeconds: 900 }); }
  if (path === '/emby/Lobby/Pair/Status') { api.statusCalls++; return json(200, api.statusCalls >= api.approveAfter ? { Status: 'approved', Token: TOKEN, TvName: 'Living Room' } : { Status: 'pending' }); }
  if (!path.startsWith('/emby/Lobby/')) return json(404, { message: 'nope' });
  if (auth !== 'Lobby ' + TOKEN) return json(401, { Message: 'This TV is not paired with Lobby (or was removed). Pair it again.' });
  const op = path.slice('/emby/Lobby'.length);
  if (op === '/Home') return json(200, homeJson(api));
  if (op === '/Settings' && method === 'GET') return json(200, settingsJson(api));
  if (op === '/Sports/Teams') return json(200, { Days: 7, Teams: api.teamsList.map(t => ({ ...t })), Message: null });
  if (op === '/Details') return json(200, {
    Tagline: 'A quiet harbour keeps its secrets.', Overview: 'Three siblings return to settle an inheritance.', Genres: ['Drama', 'Mystery'], RuntimeMinutes: 108, Rating: 7.6,
    Directors: ['Mara Voss'], Writers: ['Theo Lindqvist', 'Mara Voss'], Creators: [], Networks: [],
    Cast: [{ Name: 'Juno Castellano', Character: 'Reyna' }, { Name: 'Priya Narayanan', Character: 'Dev' }, { Name: 'Elif Demir', Character: 'Mrs. Aldaine' },
      { Name: 'Oskar Lindgren', Character: 'Pete' }, { Name: 'Noor Bergström', Character: 'Captain Hale' }, { Name: 'Darius Okafor', Character: 'Sal' }]
  });
  if (op === '/Requesters') return json(200, { RequestsEnabled: api.requestsEnabled, Requesters: api.requesters, LastRequesterId: api.lastRequester, UsingFallback: false });
  if (op === '/Request') { api.requests.push(body); return json(200, { Status: 'approved', RequestId: 9 }); }
  if (op === '/Play') { api.plays.push(body); return json(200, { Status: api.playStatus }); }
  return json(404, { Message: 'Unknown' });
}

/* ---------- Page harness (trimmed from check-media.mjs) ---------- */
let preview, current;
function installHarness({ paired, look }) {
  if (!sessionStorage.getItem('__seeded')) {
    localStorage.setItem('cleanframe.home.v1', JSON.stringify({ dock: ['stremio', 'netflix', 'disneyplus', 'youtube', 'appletv', 'primevideo', 'abciview', 'sbs', 'applemusic'], wallpaper: 'misty', mode: 'fixed', lastApp: 'netflix', theme: 'shore', ...(look ? { look: { layout: look } } : {}) }));
    if (paired) localStorage.setItem('lobby.server.v1', JSON.stringify({ url: 'https://cf.test:8096', token: 'tok_0123456789abcdefghijklmnop', tvName: 'Living Room' }));
    sessionStorage.setItem('__seeded', '1');
  }
  window.ShoreQA = { minuteMs: 60000, pollMs: 40, staleMs: 30000, featureMs: 600000 };
  window.__tv = { calls: [], launchFailure: false, sources: null };
  window.tizen = {
    ApplicationControlData: function (key, value) { this.key = key; this.value = value; },
    ApplicationControl: function (operation, uri, mime, category, data) { Object.assign(this, { operation, uri, mime, category, data }); },
    application: {
      getCurrentApplication() { return { appInfo: { id: 'lobbyTV001.Lobby' } }; },
      getAppsInfo(ok) { setTimeout(() => ok([]), 0); },
      launch(id, ok) { window.__tv.calls.push({ method: 'launch', id }); setTimeout(ok, 0); },
      launchAppControl(control, id, ok) { window.__tv.calls.push({ method: 'launchAppControl', id }); setTimeout(ok, 0); }
    }
  };
}
async function page(options = {}) {
  current = await preview.browser.newPage({ viewport: options.viewport || { width: 1920, height: 1080 } });
  current.setDefaultTimeout(10000);
  await current.route(SERVER + '/**', handle);
  await current.addInitScript(installHarness, { paired: !!options.paired, look: options.look || null });
  await current.goto(preview.baseURL + '/home/');
  await current.waitForFunction(() => window.ShoreQA && ShoreQA.ready && ShoreQA.ready());
  if (options.paired && options.waitRows !== false) await current.waitForFunction(() => ShoreQA.state().media.rows.length > 0 && !ShoreQA.state().media.loading);
  await current.waitForTimeout(250);
  return current;
}
const act = action => current.evaluate(a => ShoreQA.activate(a), action);
const scene = name => current.evaluate(n => ShoreQA.scene(n), name);
async function nav(...keys) { for (const k of keys) await current.evaluate(key => ShoreQA.nav(key), k); }
const shot = name => current.screenshot({ path: out + name + '.png' });
const until = (fn, arg) => current.waitForFunction(fn, arg, { timeout: 8000 });
const settle = () => current.waitForTimeout(220);
async function reach(action) {
  for (let i = 0; i < 24; i++) {
    if ((await current.evaluate(() => ShoreQA.actions())).includes(action)) return act(action);
    await nav('down');
  }
  throw Error('Could not reach ' + action);
}
async function close() { if (current) { await current.close(); current = null; } }

async function main() {
  preview = await openPreview({ publicFonts: true });
  try {
    // Watch layout: featured hero + bands.
    api = freshApi(); await page({ paired: true, look: 'watch' });
    await until(() => document.querySelector('.w-backdrop.is-on'));
    await current.waitForTimeout(450);
    await shot('lobby-watch-hero');
    await nav('down', 'down', 'down');
    await current.waitForTimeout(350);
    await shot('lobby-watch-rows');
    await close();

    // Classic Dock layout with Lobby's rows alongside apps.
    api = freshApi(); await page({ paired: true });
    await nav('up');
    await settle();
    await shot('lobby-dock-rows');
    await close();

    // Connect: hostname keypad (the FQDN/ABC toggle).
    api = freshApi(); await page();
    await scene('settings'); await act('settings.group.media');
    for (let i = 0; i < 12; i++) await current.keyboard.press('Backspace');
    await act('connect.key.mode');
    await current.keyboard.type('CF.HOME.LAN:8096');
    await shot('lobby-connect-keypad');
    await close();

    // Request screen (invented title, invented cast). Navigate down from Continue Watching
    // through Next Up, On Now, Your Teams and Trending to reach the single Popular Movies card.
    api = freshApi(); await page({ paired: true });
    await nav('up', 'down', 'down', 'down', 'down', 'down', 'ok');
    await until(() => document.querySelectorAll('.rq-acts .btn').length === 3);
    await until(() => document.querySelectorAll('.rq-person').length > 0);
    const title = await current.locator('.rq-head, h1, .rq-title').first().textContent().catch(() => '');
    if (!title || !title.includes('Low Tide Harbor')) console.warn('Request screenshot title check: got "' + title + '" — verify the nav path still lands on Low Tide Harbor.');
    await shot('lobby-request');
    await close();

    // Settings: Emby & Seerr row controls, and the team picker.
    api = freshApi(); await page({ paired: true });
    await scene('settings'); await act('settings.group.media');
    await until(() => !!ShoreQA.state().media.settings);
    await shot('lobby-settings');
    await reach('list.teams.teams');
    await until(() => ShoreQA.state().view === 'teams' && document.querySelectorAll('.ls-line').length > 2);
    await shot('lobby-teams');
    await close();

    console.log('Wrote screenshots to ' + out);
  } finally {
    await preview.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
