/* CleanFrame Home. Static materials, local preferences and public Tizen app controls. */
(function () {
  'use strict';

  /* ---------- Bundled data ---------- */
  var ASSETS = 'assets/', ICONS = ASSETS + 'icons/', WP = ASSETS + 'wallpapers/';
  var CAP = 9, SCRIM_Y = 560;
  var DOCK_MODES = { both: { tw: 288, th: 200, pitch: 296 }, text: { tw: 288, th: 104, pitch: 296 }, icons: { tw: 176, th: 144, pitch: 184 } };
  var GRID_ROW = 240, GRID_COL = 344, COLS = 5;
  var ED_ROW = 80, ED_SEP = 56, ED_VIEW = 752;
  var PH_TOP = 220, PH_PITCH = 128, PH_FULL = 5, PH_HEIGHT = 944, PH_COMPACT_TOP = 144, PH_COMPACT_PITCH = 88, PH_COMPACT_VISIBLE = 9;
  var WALL_VISIBLE = 6, WALL_ROW = 92, WALL_DELAY = 200;
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 10009: 'back', 461: 'back' };
  var FULL = 'Home holds nine apps. Remove one first.', LAST = 'Home needs one app';

  var PRIMARY_APPS = [
    { id: 'stremio', name: 'Stremio', mark: true, appId: 'IkWsFHtOY9.Stremio' },
    { id: 'netflix', name: 'Netflix', mark: true, appId: 'org.tizen.netflix-app' },
    { id: 'disneyplus', name: 'Disney+', mark: true, appId: 'MCmYXNxgcu.DisneyPlus' },
    { id: 'youtube', name: 'YouTube', mark: true, appId: '9Ur5IzDKqV.TizenYouTube' },
    { id: 'appletv', name: 'Apple TV', mark: true, appId: 'com.samsung.tv.aria-video' },
    { id: 'primevideo', name: 'Prime Video', mark: true, appId: 'org.tizen.primevideo' },
    { id: 'abciview', name: 'ABC iview', mark: true, appId: 'mWK87Xghap.ABCiview' },
    { id: 'sbs', name: 'SBS On Demand', mark: true, appId: 'OyE7OuxlUi.SBSOnDemand' },
    { id: 'applemusic', name: 'Apple Music', mark: true, appId: 'org.tizen.apple.apple-music' }
  ];
  /* Brand marks for apps outside the primary set, matched by app ID in device.js. */
  var EXTRA_MARKS = ['hbomax', 'spotify', 'tubi', 'emby'];
  /* Marks drawn in their own brand colours, shown as images rather than tinted masks. */
  var COLOR_MARKS = ['emby', 'youtube', 'primevideo'];
  var PRIMARY = PRIMARY_APPS.map(function (a) { return a.id; }), APPS = PRIMARY_APPS.slice(), ALPHA = [];
  var WALLS = window.CleanFrameWallpapers || [{ id: 'misty', name: 'Misty coast', tone: 'light', ut: { tr: 'mist', br: 'mist' }, frostVeil: .20 }];
  var ADAPTIVE_INK = window.CleanFrameAdaptiveInk || {};
  WALLS.forEach(function (w) { w.ut = w.ut || { tr: 'light', br: 'light' }; w.frostVeil = w.frostVeil || .12; });
  var MODES = [
    { id: 'fixed', name: 'Fixed', min: 0 }, { id: 'open', name: 'Each time Home opens', min: 0 },
    { id: '5', name: 'Every 5 minutes', min: 5 }, { id: '15', name: 'Every 15 minutes', min: 15 },
    { id: '60', name: 'Every hour', min: 60 }
  ];
  var SAVER_VALUES = [0, 2, 5, 10, 15, 30];
  var KEY = 'cleanframe.home.v1', storageOk = true, catalog = { loading: false, loaded: false, error: null, request: 0, revision: 0 };
  var QA = window.ShoreQA = { minuteMs: window.ShoreQA && window.ShoreQA.minuteMs || 60000, pollMs: window.ShoreQA && window.ShoreQA.pollMs || 3000, staleMs: window.ShoreQA && window.ShoreQA.staleMs || 30000,
    featureMs: window.ShoreQA && window.ShoreQA.featureMs || 9000 };
  var FONTS = {
    manrope: { name: 'Manrope', family: 'Manrope', display: 600, ui: 500, clock: 500 },
    montreal: { name: 'Neue Montreal', family: 'Study Montreal', display: 300, ui: 400, clock: 300 },
    mori: { name: 'Mori', family: 'Study Mori', display: 200, ui: 400, clock: 200 },
    pangram: { name: 'Pangram Sans', family: 'Study Pangram', display: 300, ui: 400, clock: 300 },
    geist: { name: 'Geist', family: 'Study Geist', display: 300, ui: 400, clock: 300 },
    newsreader: { name: 'Newsreader', family: 'Study Newsreader', display: 400, ui: 400, clock: 400 }
  };
  var PRIVATE_FONTS = window.CleanFramePrivateFontIDs || [], fontMetrics = {}, unavailableFonts = {}, widthCache = {}, fontRevision = 0, fontsReady = false;
  var LOOK_VALUES = { bg: ['dark', 'light', 'photo'], layout: ['list', 'dock', 'watch'], apps: ['icons', 'both', 'text'], font: Object.keys(FONTS).filter(function (id) { return id === 'manrope' || PRIVATE_FONTS.indexOf(id) >= 0; }), controls: ['icons', 'both', 'text'], focus: ['type', 'glass'], material: ['soft', 'frost', 'tint'] };
  var LOOK_NAMES = { bg: 'Background', layout: 'Layout', apps: 'Apps', font: 'Font', controls: 'Home controls', focus: 'Focus', material: 'Material' };
  var VALUE_NAMES = { dark: 'Dark', light: 'Light', photo: 'Photo', list: 'List', dock: 'Dock', watch: 'Watch', type: 'Type', glass: 'Glass', soft: 'Soft', frost: 'Frost', tint: 'Clear tint', icons: 'Icons', both: 'Icons and text', text: 'Text' };
  var UTIL = { art: ['Art Mode', 'art'], apps: ['All apps', 'apps'], arrange: ['Arrange', 'arrange'], settings: ['Settings', 'settings'] };
  var MSG = {
    leave: { title: 'Leave Home?', line: 'Open Samsung Home?', note: '', actions: [['stay', 'Stay'], ['samsung', 'Samsung Home']] }
  };
  var SVG = {
    art: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.8" r="1.5"/><path d="m4.5 17.5 4.5-4.5 3 3 2.5-2.5 5 5"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    arrange: '<path d="M4 8.5h14M15 5.5l3 3-3 3M20 15.5H6M9 12.5l-3 3 3 3"/>',
    settings: '<path d="m9 3-.6 2.4-2 1.2L4 6l-2 3.5L3.8 11v2L2 14.5 4 18l2.4-.6 2 1.2L9 21h6l.6-2.4 2-1.2 2.4.6 2-3.5-1.8-1.5v-2L22 9.5 20 6l-2.4.6-2-1.2L15 3Z"/><circle cx="12" cy="12" r="3.2"/>',
    home: '<path d="M4 11 12 4.5l8 6.5v8a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"/>',
    undo: '<path d="M9 6 5 10l4 4"/><path d="M5 10h9.5a4.5 4.5 0 0 1 0 9H11"/>',
    check: '<path d="m5.5 12.5 4 4 9-9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>',
    right: '<path d="m9.5 5 7 7-7 7"/>',
    up: '<path d="m5 15.5 7-7 7 7"/>',
    down: '<path d="m5 8.5 7 7 7-7"/>',
    updown: '<path d="m7.5 9.5 4.5-4.5 4.5 4.5M7.5 14.5l4.5 4.5 4.5-4.5"/>',
    tv: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7"/>',
    hdmi: '<path d="M3.5 8.5h17v4.2l-2.6 3.3H6.1l-2.6-3.3Z"/><path d="M7.5 11.6h9"/>',
    soundbar: '<rect x="2" y="9" width="20" height="6.5" rx="2.2"/><circle cx="6.5" cy="12.25" r="1.4"/><circle cx="17.5" cy="12.25" r="1.4"/><path d="M10.5 12.25h3"/>',
    gamepad: '<path d="M7.2 8h9.6a4 4 0 0 1 3.9 3.2l.8 4.1a2.4 2.4 0 0 1-4.1 2.1L15.6 16H8.4l-1.8 1.4a2.4 2.4 0 0 1-4.1-2.1l.8-4.1A4 4 0 0 1 7.2 8Z"/><path d="M7.5 11v3M6 12.5h3"/><circle cx="15.5" cy="11.6" r=".6"/><circle cx="17.3" cy="13.4" r=".6"/>',
    'wx-sun': '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5"/>',
    'wx-moon': '<path d="M20 14.4A8 8 0 1 1 9.6 4a6.5 6.5 0 0 0 10.4 10.4Z"/>',
    'wx-cloud': '<path d="M7 18h10a4 4 0 0 0 .3-8A5.5 5.5 0 0 0 6.5 11 3.5 3.5 0 0 0 7 18Z"/>',
    'wx-partly': '<circle cx="8" cy="8" r="3"/><path d="M8 2.6v1.6M3.4 8H5M4.5 4.5l1.1 1.1M11.5 8H13M11.4 4.5l-1.1 1.1"/><path d="M11 19h7a3 3 0 0 0 .2-6A4 4 0 0 0 10.6 14 2.6 2.6 0 0 0 11 19Z"/>',
    'wx-fog': '<path d="M4 9h16M3 12.5h18M5 16h14"/>',
    'wx-rain': '<path d="M7 14h10a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 7 9.5 3.2 3.2 0 0 0 7 14Z"/><path d="M9 16.5l-1 2.5M12.5 16.5l-1 2.5M16 16.5l-1 2.5"/>',
    'wx-snow': '<path d="M7 14h10a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 7 9.5 3.2 3.2 0 0 0 7 14Z"/><path d="M9 18h.01M12.3 19.6h.01M15.6 18h.01M10.6 20.8h.01M14 21h.01"/>',
    'wx-storm': '<path d="M7 13h10a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 7 8.5 3.2 3.2 0 0 0 7 13Z"/><path d="M13 14l-3 4h3l-1 3"/>',
    warn: '<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4.5M12 17.3v.1"/>'
  };

  /* ---------- State ---------- */
  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var S = {
    variant: 'B', geom: 'broad', c: null, stack: null,
    sel: null, selIdx: 0, lastUtil: 0, appsFocus: null, settingsFocus: 'background', appearanceFocus: 'bg', detailFocus: {},
    undo: [], removedAt: {}, note: null, err: null,
    writes: 0, failed: 0, log: [], logN: 0, lastLaunch: null, press: null,
    wallShown: null, wallPending: null, wallError: null,
    shown: null, pending: null, lookError: null, bundleKey: null, previewBundle: null, reflow: false, fontSwitch: false
  };
  var scroll = { first: 0, off: 0, photo: 0, photoArrange: 0 };

  /* Lobby: Emby and Seerr rows from the paired server. Absent until the owner pairs this TV,
     so an unpaired Home is unchanged. */
  var Media = window.LobbyMedia;
  var INPUTS = [];
  var W = { i: 0, timer: 0, src: null, back: 0, pre: null, preImg: null, band: 0, side: 0 };
  var M = { cfg: null, data: null, rows: [], loading: false, error: null, at: 0, request: 0, unauthorized: false,
    featured: [], cols: {}, row: 0, settings: null, settingsLoading: false, settingsError: null, saving: null, note: null, timer: 0, weather: null, weatherCfg: null };
  var MEDIA_KINDS = ['movie', 'episode', 'series', 'program', 'discover'];
  var REASON_NAMES = { game: 'Your team', resume: 'Continue watching', nextup: 'Up next', 'new': 'New in your library', trending: 'Trending' };
  var STATUS_NAMES = { available: 'Available', partial: 'Partly available', processing: 'Processing', requested: 'Requested' };
  var SOURCE_NAMES = { library: 'From your Emby library', livetv: 'From Emby Live TV', seerr: 'From Seerr' };
  var REFRESH_MS = 5 * 60000;
  function text(v, n) { return typeof v === 'string' ? v.slice(0, n || 200) : ''; }
  function count(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function cleanItem(it) {
    if (!it || typeof it !== 'object') return null;
    return { id: text(it.Id, 80), kind: MEDIA_KINDS.indexOf(it.Kind) >= 0 ? it.Kind : 'movie', title: text(it.Title, 200), subtitle: text(it.Subtitle, 200),
      year: count(it.Year), overview: text(it.Overview, 700), poster: text(it.PosterUrl, 800), landscape: text(it.LandscapeUrl, 800),
      progress: count(it.ProgressPercent) === null ? null : clamp(it.ProgressPercent, 0, 100), position: count(it.PositionTicks), runtime: count(it.RuntimeTicks),
      playId: text(it.PlayItemId, 40), action: it.DefaultAction === 'resume' ? 'resume' : it.DefaultAction === 'request' ? 'request' : 'play',
      channel: text(it.ChannelName, 80), start: text(it.StartDate, 40), airing: it.IsAiring === true,
      tmdb: count(it.TmdbId) || 0, mediaType: it.MediaType === 'tv' ? 'tv' : it.MediaType === 'movie' ? 'movie' : '', status: STATUS_NAMES[it.RequestStatus] ? it.RequestStatus : 'none',
      playAction: it.PlayAction === 'resume' ? 'resume' : 'play',
      tagline: text(it.Tagline, 160), backdrop: text(it.BackdropUrl, 800), logo: text(it.LogoUrl, 800), meta: text(it.Meta, 120), reason: REASON_NAMES[it.FeatureReason] ? it.FeatureReason : '' };
  }
  function cleanFeatured(data) {
    var seen = {};
    return (data && Array.isArray(data.Featured) ? data.Featured : []).slice(0, 8).map(cleanItem).filter(function (it) {
      // Games may have no artwork; they still lead the featured area.
      if (!it || !it.id || seen[it.id] || !(it.backdrop || it.landscape || it.kind === 'program')) return false; seen[it.id] = true; return true;
    });
  }
  /* Rows and featured titles always change together. */
  function setHome(data) {
    M.rows = data ? cleanRows(data) : []; M.featured = data ? cleanFeatured(data) : [];
    M.weatherCfg = cleanWeather(data); refreshWeather();
    if (!M.featured.length) pickFeatured();
    W.i = clamp(W.i, 0, Math.max(0, M.featured.length - 1));
  }
  /* When the server sends no featured titles (an older plugin, or none with background art), take
     them from the rows: the first of Continue Watching and Next Up, then the top of Trending.
     They leave their rows, so each title still appears once. */
  function pickFeatured() {
    var picks = [], from = [['continue', 1, 'resume'], ['nextup', 1, 'nextup'], ['seerr-trending', 3, 'trending']];
    from.forEach(function (source) {
      var row = M.rows.filter(function (r) { return r.id === source[0]; })[0], taken = 0;
      if (!row) return;
      row.items = row.items.filter(function (it) {
        if (taken >= source[1] || picks.length >= 5 || !it.landscape) return true;
        it.reason = source[2];
        // Seerr art comes as a small TMDB backdrop; the featured area wants the larger one.
        it.backdrop = it.landscape.replace(/^(https:\/\/image\.tmdb\.org\/t\/p\/)w\d+\//, '$1w1280/');
        picks.push(it); taken++;
        return false;
      });
    });
    M.rows = M.rows.filter(function (r) { return r.items.length > 0; });
    M.featured = picks;
  }
  function cleanRows(data) {
    return (data && Array.isArray(data.Rows) ? data.Rows : []).slice(0, 12).map(function (r) {
      var seen = {}, items = (r && Array.isArray(r.Items) ? r.Items : []).slice(0, 100).map(cleanItem).filter(function (it) {
        if (!it || !it.id || seen[it.id]) return false; seen[it.id] = true; return true;
      });
      return { id: text(r && r.Id, 40), title: text(r && r.Title, 80), layout: r && r.Layout === 'poster' ? 'poster' : 'landscape', items: items };
    }).filter(function (r) { return r.id && r.items.length; });
  }
  function mediaOn() { return !!M.cfg && !M.unauthorized && M.rows.length > 0; }
  function mediaCol(row) { return M.cols[row.id] || (M.cols[row.id] = { i: 0, first: 0 }); }
  function mediaError(err) {
    if (!err) return { message: 'Something went wrong.' };
    if (err.code === 'unauthorized') return { message: 'This TV isn’t paired any more.', detail: 'Connect it again in Settings → Emby & Seerr.' };
    if (err.code === 'network' || err.code === 'timeout') return { message: 'Couldn’t reach your Emby server.', detail: M.cfg ? Media.host(M.cfg.url) : '' };
    return { message: err.message || 'The Emby server returned an error.', detail: '' };
  }
  function pick(v, list, fallback) {
    v = String(v || '').toLowerCase();
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === v) return list[i];
    return fallback;
  }
  function lookOf(c) { return { bg: c.bg, wall: c.wall, layout: c.layout, apps: c.apps, font: c.font, controls: c.controls, focus: c.focus, material: c.material }; }
  function materialApplies(c) { c = c || S.c; return c.bg === 'photo' && (c.layout !== 'list' || c.focus === 'glass'); }
  /* Watch needs the paired server; until it has something to show, Home falls back to Dock. */
  function watchOn() { return S.c.layout === 'watch' && !!M.cfg && !M.unauthorized && (M.rows.length > 0 || M.featured.length > 0); }
  function layoutNow() { return S.c.layout === 'watch' ? (watchOn() ? 'watch' : 'dock') : S.c.layout; }

  /* ---------- Helpers ---------- */
  function app(id) { for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) return APPS[i]; return null; }
  function wall(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return WALLS[i]; return null; }
  function wallIndex(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return i; return 0; }
  function frostClass(w) { var i = [.12, .20, .30, .36, .44].indexOf(w.frostVeil); return i > 0 ? ' fv-' + (i + 1) : ''; }
  function wallClasses(w) { return frostClass(w) + (w.listColumn ? ' lc-' + w.listColumn : '') + (w.dockQuiet ? ' db-quiet' : '') + (w.clockMist ? ' tl-mist' : ''); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function without(list, id) { return list.filter(function (x) { return x !== id; }); }
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function onHome(id) { return S.c.home.indexOf(id) >= 0; }
  function top() { return S.stack[S.stack.length - 1]; }
  function push(e) { S.stack.push(e); return e; }
  function pop() { if (S.stack.length > 1) S.stack.pop(); }
  function px(n) { return n.toFixed(2) + 'px'; }
  function icon(name, cls, underlay) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">'
      + (underlay ? '<g class="ut-underlay" transform="translate(0 .5)">' + SVG[name] + '</g><g class="ut-ink">' + SVG[name] + '</g>' : SVG[name]) + '</svg>';
  }
  function badge(on) {
    return on
      ? '<svg class="badge is-on" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path class="badge-tick" d="m7.6 12.4 3 3 5.8-6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg class="badge is-off" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  }
  function log(text) { S.log.unshift('#' + (++S.logN) + ' ' + text); if (S.log.length > 10) S.log.pop(); }

  var maskSupport = 'webkitMaskImage' in document.documentElement.style || 'maskImage' in document.documentElement.style, markProbes = {};
  function probeMark(id) {
    if (markProbes[id]) return;
    var im = new Image(); markProbes[id] = 'loading';
    im.onload = function () { markProbes[id] = 'ok'; };
    im.onerror = function () {
      markProbes[id] = 'bad';
      Array.prototype.forEach.call(document.querySelectorAll('[data-mark="' + id + '"]'), function (el) { el.className += ' is-bad'; });
    };
    im.src = ICONS + id + '.svg';
  }
  /* Optical placement is identical for the CSS mask and the image fallback. */
  function markHtml(id, w, h, size) {
    var m = window.FrameIconMetrics && window.FrameIconMetrics[id], st;
    if (m) {
      var weight = clamp(Math.pow(0.45 / m.fill, 0.3), 0.84, 1.25);
      var k = Math.min(w / m.w, h / m.h, size * weight / Math.sqrt(m.w * m.h)), s = m.n * k;
      st = 'width:' + px(s) + ';height:' + px(s) + ';left:' + px(w / 2 - (m.x + m.w / 2) * k) + ';top:' + px(h / 2 - (m.y + m.h / 2) * k);
    } else st = 'width:' + w + 'px;height:' + h + 'px;left:0;top:0;object-fit:contain';
    probeMark(id);
    return '<span class="mark' + (markProbes[id] === 'bad' ? ' is-bad' : '') + '" data-mark="' + id + '" style="width:' + w + 'px;height:' + h + 'px">'
      + (maskSupport && COLOR_MARKS.indexOf(id) < 0 ? '<span class="mk" style="' + st + ';-webkit-mask-image:url(' + ICONS + id + '.svg);mask-image:url(' + ICONS + id + '.svg)"></span>' : '<img alt="" src="' + ICONS + id + '.svg" style="' + st + '">') + '</span>';
  }
  function appMark(a, w, h, size) {
    if (a.mark && (maskSupport || S.c.bg !== 'light' || COLOR_MARKS.indexOf(a.brand || a.id) >= 0)) return markHtml(a.brand || a.id, w, h, size);
    var words = a.name.split(/\s+/), letters = words[0].charAt(0) + (words.length > 1 ? words[1].charAt(0) : '');
    return '<span class="mark monogram' + (a.icon ? ' native-icon' : '') + '" style="width:' + w + 'px;height:' + h + 'px;font-size:' + Math.round(size * .65) + 'px"><span>' + esc(letters.toUpperCase()) + '</span>'
      + (a.icon ? '<img alt="" data-native-icon="true" src="' + esc(a.icon) + '">' : '') + '</span>';
  }
  function smallMark(a) { return appMark(a, 56, 44, 36); }
  var measureCanvas = document.createElement('canvas'), measureContext = measureCanvas.getContext('2d'), measureSpan = document.createElement('span');
  measureSpan.setAttribute('aria-hidden', 'true');
  measureSpan.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;white-space:pre;font-synthesis:none;';
  document.body.appendChild(measureSpan);
  function homeFont() { return S.shown && S.shown.font || 'manrope'; }
  function fontRole(id, role, size) {
    var f = FONTS[id], serif = id === 'newsreader';
    return { family: f.family,
      weight: role === 'display' ? f.display : role === 'clock' ? f.clock : serif ? 400 : f.ui,
      opsz: serif ? role === 'display' ? 72 : role === 'clock' ? 48 : role === 'ui' && (!size || size === 28) ? 28 : 36 : 0 };
  }
  function measureFace(id, faces) {
    var result = { roles: {}, digits: [], digitCell: 0 }, roles = { display: [88, 76, 56], clock: [48], primary: [30, 32, 34, 36, 40], ui: [28, 30, 48] };
    var face = id === 'newsreader' ? faces[0][0] : null, original = face ? face.variationSettings : '', r, widths, min, max;
    Object.keys(roles).forEach(function (role) {
      result.roles[role] = {};
      // Canvas has no optical-size property. Set this face's default only while measuring;
      // CSS specifies each rendered role explicitly, and the descriptor is restored below.
      roles[role].forEach(function (size) {
        r = fontRole(id, role, size);
        if (face) face.variationSettings = r.opsz ? '"opsz" ' + r.opsz : original;
        measureContext.font = r.weight + ' ' + size + 'px "' + r.family + '"';
        var m = measureContext.measureText('H'), d = measureContext.measureText('gjpqy');
        result.roles[role][size] = { cap: m.actualBoundingBoxAscent || size * .72, ascent: m.fontBoundingBoxAscent || size * 1.066, descent: m.fontBoundingBoxDescent || size * .3, lower: d.actualBoundingBoxDescent || size * .255 };
      });
    });
    if (face) face.variationSettings = original;
    r = fontRole(id, 'clock');
    measureSpan.style.font = r.weight + ' 48px/64px "' + r.family + '"';
    measureSpan.style.letterSpacing = '0'; measureSpan.style.fontVariantNumeric = 'tabular-nums';
    measureSpan.style.fontVariationSettings = r.opsz ? '"opsz" ' + r.opsz : 'normal';
    widths = '0123456789'.split('').map(function (n) { measureSpan.textContent = n; return measureSpan.getBoundingClientRect().width; });
    min = Math.min.apply(Math, widths); max = Math.max.apply(Math, widths);
    result.digits = widths; result.digitCell = max - min > .02 ? max : 0;
    return result;
  }
  function fontChoices() {
    LOOK_VALUES.font = Object.keys(FONTS).filter(function (id) { return id === 'manrope' || PRIVATE_FONTS.indexOf(id) >= 0 && !unavailableFonts[id]; });
  }
  function retryFontFaces(id) {
    // A rejected CSS FontFace cannot load again. Recreate only that failed family's
    // rules; the displayed family's faces and the rest of the stylesheet stay intact.
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules, i, rule, family, css;
      try { rules = sheet.cssRules; } catch (e) { return; }
      if (!rules) return;
      for (i = 0; i < rules.length; i++) {
        rule = rules[i];
        if (rule.type !== 5) continue;
        family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
        if (family !== FONTS[id].family) continue;
        css = rule.cssText; sheet.deleteRule(i); sheet.insertRule(css, i);
      }
    });
  }
  function loadFont(id, done) {
    var f = FONTS[id], weights = [f.display], timer, ended = false;
    if (fontMetrics[id]) { done(true); return; }
    if (!document.fonts || !document.fonts.load) { if (id === 'manrope') { fontMetrics.manrope = measureFace('manrope', []); fontsReady = true; done(true); } else done(false, 'unsupported'); return; }
    if (unavailableFonts[id]) retryFontFaces(id);
    if (id !== 'newsreader' && weights.indexOf(f.ui) < 0) weights.push(f.ui);
    function finish(ok, reason, faces) {
      if (ended) return;
      ended = true; clearTimeout(timer);
      if (ok) {
        fontMetrics[id] = measureFace(id, faces); delete unavailableFonts[id];
        // Measurements and cached markup belong to a particular loaded font.
        widthCache = {}; fontRevision++;
        if (id === 'manrope') fontsReady = true;
      } else if (reason !== 'timeout') unavailableFonts[id] = true;
      fontChoices(); done(ok, reason);
    }
    timer = setTimeout(function () { finish(false, 'timeout'); }, 3000);
    Promise.all(weights.map(function (weight) { return document.fonts.load(weight + ' 88px "' + f.family + '"'); })).then(function (faces) {
      finish(faces.every(function (list) { return list.length > 0 && list.every(function (face) { return face.status === 'loaded'; }); }), 'load', faces);
    }, function () { finish(false, 'load'); });
  }
  var baselineRecovery = false;
  function ensureFont(id, done) {
    loadFont('manrope', function (ok, reason) {
      if (!ok && id === 'manrope') {
        // The local fallback keeps Home usable if the baseline face is slow or missing.
        fontMetrics.manrope = measureFace('manrope', []); fontMetrics.manrope.fallback = true; fontsReady = true;
        done(true, reason);
        if (!baselineRecovery && document.fonts && document.fonts.ready) {
          baselineRecovery = true;
          document.fonts.ready.then(function () {
            delete fontMetrics.manrope; delete unavailableFonts.manrope;
            loadFont('manrope', function (loaded) {
              if (!loaded) { fontMetrics.manrope = measureFace('manrope', []); fontMetrics.manrope.fallback = true; fontsReady = true; }
              render();
            });
          });
        }
        return;
      }
      if (!ok || id === 'manrope') done(ok, reason); else loadFont(id, done);
    });
  }
  function fontShift(role, size) {
    var id = homeFont(), base = fontMetrics.manrope, metrics = fontMetrics[id], a, b;
    if (id === 'manrope' || !base || !metrics) return 0;
    a = base.roles[role][size]; b = metrics.roles[role][size];
    return (a.ascent - a.descent - a.cap - b.ascent + b.descent + b.cap) / 2;
  }
  function textWidth(text, size, weight, spacing, role) {
    var id = homeFont(), r = fontRole(id, role || 'ui', size), key, width;
    if (id !== 'manrope') { weight = r.weight; spacing = role === 'display' ? -size * .01 : 0; }
    key = [id, role || 'ui', text, size, weight, spacing].join('|');
    if (widthCache.hasOwnProperty(key)) return widthCache[key];
    if (r.opsz) {
      measureSpan.style.font = weight + ' ' + size + 'px "' + r.family + '"';
      measureSpan.style.fontVariationSettings = '"opsz" ' + r.opsz;
      measureSpan.style.fontVariantNumeric = 'normal'; measureSpan.style.letterSpacing = '0'; measureSpan.textContent = text;
      width = measureSpan.getBoundingClientRect().width;
    } else {
      measureContext.font = (weight || 500) + ' ' + size + 'px "' + r.family + '", Arial, sans-serif';
      width = measureContext.measureText(text).width;
    }
    width += Math.max(0, text.length - 1) * (spacing || 0);
    // Do not retain fallback measurements made before the baseline font is ready.
    if (fontMetrics[id] && !fontMetrics[id].fallback) widthCache[key] = width;
    return width;
  }
  function dockLabelSize(id) { return S.c.apps === 'text' ? (textWidth(app(id).name, 40, 600, -.8, 'primary') > 264 ? 34 : 40) : textWidth(app(id).name, 36, 500, -.8, 'primary') > 280 ? 32 : 36; }
  function reducedDockLabel(id) { return S.c.apps !== 'icons' && dockLabelSize(id) === (S.c.apps === 'text' ? 34 : 32); }
  function actionWidth(text) { return clamp(Math.ceil(textWidth(text, 30, 500, -.3) + 40), 288, 400); }
  /* With rows beside the List, app names give way to a 760px media column on the right. */
  function listNarrow() { return S.c.layout === 'list' && mediaOn(); }
  function photoLabel(id, compact) {
    var text = app(id).name, size = compact ? 56 : 88, limit = compact ? 640 : listNarrow() ? 720 : 992, width = textWidth(text, size, 600, -1.8, 'display');
    if (!compact && width > limit) { size = 76; width = textWidth(text, size, 600, -1.8, 'display'); }
    // Newsreader's ninth compact Type row otherwise enters the lower fade by .63px.
    return { size: size, top: (compact ? 10.66 : size === 76 ? 10.36 : 9.68) + fontShift('display', size) - (compact && homeFont() === 'newsreader' ? .7 : 0), width: Math.min(limit, width), ellipsis: width > limit };
  }
  function listPlateWidth(id, compact) {
    if (S.c.apps === 'icons') return compact ? 120 : 144;
    var text = S.c.apps === 'text';
    return clamp(Math.ceil(photoLabel(id, compact).width + (text ? 84 : compact ? 156 : 184)), text ? 280 : 360, text ? compact ? 724 : listNarrow() ? 804 : 1076 : compact ? 796 : listNarrow() ? 904 : 1176);
  }

  /* Keyed children: elements persist by key so transforms animate instead of re-creating.
     Children are absolutely positioned, so DOM order never needs to change. */
  function keyed(parent, items, update) {
    var map = parent._k || (parent._k = {}), seen = {}, i, it, el, isNew, k;
    for (i = 0; i < items.length; i++) {
      it = items[i]; el = map[it.key]; isNew = !el;
      if (isNew) { el = document.createElement('div'); map[it.key] = el; }
      update(el, it, i);
      if (isNew) parent.appendChild(el);
      seen[it.key] = 1;
    }
    for (k in map) if (map.hasOwnProperty(k) && !seen[k]) { if (map[k].parentNode === parent) parent.removeChild(map[k]); delete map[k]; }
  }
  function setContent(el, sig, renderContent) {
    sig += '|' + catalog.revision + '|' + fontRevision;
    if (el._sig === sig) return;
    el.innerHTML = renderContent();
    el._sig = sig;
    Array.prototype.forEach.call(el.querySelectorAll('[data-native-icon]'), function (img) {
      function ready() { img.parentNode.classList.add('has-native-icon'); }
      function failed() { img.style.display = 'none'; img.parentNode.classList.remove('has-native-icon'); }
      img.onload = ready; img.onerror = failed;
      if (img.complete) { if (img.naturalWidth) ready(); else failed(); }
    });
  }
  function setHTML(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html; } }
  function attrs(el, z, i, action) { el.setAttribute('data-z', z); el.setAttribute('data-i', String(i)); el.setAttribute('data-action', action); }

  /* ---------- Saved preferences ---------- */
  function safeId(id) { return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}$/.test(id) && ['constructor', 'prototype', '__proto__'].indexOf(id) < 0; }
  function safeIcon(path) { return typeof path === 'string' && path.length < 2048 && /^(?:\/[^\/]|file:\/\/\/|wgt-package:\/\/\/)/.test(path) ? path : ''; }
  function load() {
    var keys = [KEY, 'cleanframe.shore.v1'], raw, saved, i;
    for (i = 0; i < keys.length; i++) {
      try {
        raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        saved = JSON.parse(raw);
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
      } catch (e) { storageOk = false; }
    }
    return null;
  }
  function clean(saved) {
    var s = saved && typeof saved === 'object' ? saved : {}, modern = s.look && typeof s.look === 'object' ? s.look : s;
    var legacyList = s.theme === 'list', h = [], recent = [], records = Array.isArray(s.appRecords) ? s.appRecords : [];
    records.slice(0, 256).forEach(function (a) {
      if (!a || !safeId(a.id) || !safeId(a.appId) || typeof a.name !== 'string' || !a.name.trim() || app(a.id)) return;
      APPS.push({ id: a.id, appId: a.appId, name: a.name.slice(0, 160), brand: EXTRA_MARKS.indexOf(a.brand) >= 0 ? a.brand : '', mark: EXTRA_MARKS.indexOf(a.brand) >= 0, icon: safeIcon(a.icon) });
    });
    (Array.isArray(s.home) ? s.home : Array.isArray(s.dock) ? s.dock : []).forEach(function (id) {
      if (!safeId(id) || h.indexOf(id) >= 0 || h.length >= CAP) return;
      if (!app(id) && id.indexOf('.') > 0) APPS.push({ id: id, appId: id, name: id.split('.').pop(), mark: false });
      if (app(id)) h.push(id);
    });
    if (!h.length) h = PRIMARY.slice();
    (Array.isArray(s.recent) ? s.recent : []).forEach(function (id) { if (safeId(id) && app(id) && h.indexOf(id) < 0 && recent.indexOf(id) < 0 && recent.length < 5) recent.push(id); });
    return {
      bg: pick(modern.bg, LOOK_VALUES.bg, legacyList ? 'dark' : 'photo'), layout: pick(modern.layout, LOOK_VALUES.layout, legacyList ? 'list' : 'dock'),
      apps: pick(modern.apps, LOOK_VALUES.apps, legacyList ? 'text' : 'both'), controls: pick(modern.controls, LOOK_VALUES.controls, 'both'),
      focus: pick(modern.focus, LOOK_VALUES.focus, legacyList ? 'type' : 'glass'), material: pick(modern.material, LOOK_VALUES.material, 'soft'),
      font: pick(modern.font, LOOK_VALUES.font, 'manrope'), wall: wall(modern.wall || s.wallpaper) ? modern.wall || s.wallpaper : WALLS[0].id,
      home: h, recent: recent, lastApp: h.indexOf(s.lastApp) >= 0 ? s.lastApp : h[0],
      mode: pick(s.mode, MODES.map(function (m) { return m.id; }), 'fixed'),
      hiddenInputs: (Array.isArray(s.hiddenInputs) ? s.hiddenInputs : []).filter(function (n, i, all) { return typeof n === 'number' && n >= 1 && n <= 9 && all.indexOf(n) === i; }),
      saver: SAVER_VALUES.indexOf(+s.saver) >= 0 ? +s.saver : 0
    };
  }
  function serialise(c) {
    var out = {};
    Object.keys(c).forEach(function (key) { out[key] = c[key]; });
    out.version = 2; out.look = lookOf(c); out.dock = c.home.slice(); out.wallpaper = c.wall;
    out.theme = c.layout === 'list' ? 'list' : 'shore';
    out.appRecords = [];
    c.home.concat(c.recent).forEach(function (key) {
      var a = app(key);
      if (a && PRIMARY.indexOf(key) < 0 && !out.appRecords.some(function (r) { return r.id === key; })) out.appRecords.push({ id: a.id, appId: a.appId, name: a.name, brand: a.brand || '', icon: a.icon || '' });
    });
    return out;
  }
  function initialise() {
    var saved = load(), initial; S.c = clean(saved); initial = next(S.c.home.slice(), S.c.recent.slice());
    S.stack = [{ id: 'home', f: { zone: 'apps', u: 0 } }];
    S.sel = S.c.lastApp; S.selIdx = S.c.home.indexOf(S.sel);
    if (saved && initial.mode === 'open') initial.wall = WALLS[(wallIndex(initial.wall) + 1) % WALLS.length].id;
    // Keep the old schema keys alongside the builder values for in-place updates.
    try { localStorage.setItem(KEY, JSON.stringify(serialise(initial))); S.c = initial; storageOk = true; } catch (e) { storageOk = false; }
  }
  function clearSession() { S.undo = []; S.removedAt = {}; S.note = null; S.err = null; }
  function begin() { S.note = null; }
  function next(home, recent) { var c = lookOf(S.c); c.home = home; c.recent = recent; c.lastApp = S.c.lastApp; c.mode = S.c.mode; c.hiddenInputs = (S.c.hiddenInputs || []).slice(); c.saver = S.c.saver || 0; return c; }
  function snap() { return { home: S.c.home.slice(), recent: S.c.recent.slice() }; }
  function pushRecent(list, id) { return [id].concat(without(list, id)).slice(0, 5); }
  function write(c, label) {
    try { localStorage.setItem(KEY, JSON.stringify(serialise(c))); }
    catch (e) { storageOk = false; S.failed++; S.err = label; log('Not saved: ' + label); return false; }
    if (c.wall !== S.c.wall || c.mode !== S.c.mode) resetRotation();
    storageOk = true; S.c = c; S.writes++; S.err = null; log('Saved: ' + label);
    return true;
  }
  function errText(lifted) {
    return 'Couldn’t save. Nothing changed.';
  }
  function statusHtml(def, lifted) {
    if (S.err) return '<span class="warn error-chip">' + esc(errText(lifted)) + '</span>';
    return esc(S.note || def);
  }

  function ensureSel() {
    var h = S.c.home, i;
    if (!h.length) { S.sel = null; return -1; }
    i = h.indexOf(S.sel);
    if (i < 0) { i = clamp(S.selIdx, 0, h.length - 1); S.sel = h[i]; }
    S.selIdx = i;
    return i;
  }
  function setSel(id) { S.sel = id; S.selIdx = S.c.home.indexOf(id); }

  /* Membership and order operations shared by B and C. A works on slots (below). */
  function homeRemove(id) {
    var a = app(id), i = S.c.home.indexOf(id), before = snap(), h;
    if (i < 0) return false;
    if (S.c.home.length <= 1) { S.note = LAST; return false; }
    h = S.c.home.slice(); h.splice(i, 1);
    if (!write(next(h, pushRecent(S.c.recent, id)), 'Remove ' + a.name + ' from Home')) return false;
    S.removedAt[id] = i;
    S.undo.push({ label: 'Remove ' + a.name, snap: before });
    return true;
  }
  function homeAdd(id) {
    var a = app(id), before = snap(), h = S.c.home.slice(), at;
    if (h.length >= CAP) { S.note = FULL; return false; }
    at = S.removedAt.hasOwnProperty(id) ? Math.min(S.removedAt[id], h.length) : h.length;
    h.splice(at, 0, id);
    if (!write(next(h, without(S.c.recent, id)), 'Add ' + a.name + ' to Home')) return false;
    S.undo.push({ label: 'Add ' + a.name, snap: before });
    return true;
  }
  function homeMove(order, id, before) {
    var a = app(id);
    if (!write(next(order, S.c.recent.slice()), 'Move ' + a.name)) return false;
    S.undo.push({ label: 'Move ' + a.name, snap: before });
    return true;
  }
  function undoLast(arr) {
    var u = S.undo[S.undo.length - 1];
    if (!u) { S.note = 'Nothing to undo'; return false; }
    if (!write(next(u.snap.home.slice(), u.snap.recent.slice()), 'Undo ' + u.label)) return false;
    S.undo.pop();
    S.note = 'Undone: ' + u.label + '.';
    return true;
  }
  function undoLabel() { var u = S.undo[S.undo.length - 1]; return u ? u.label : ''; }
  function undoCaption() { var label = undoLabel(); return label ? 'Undo ' + label.charAt(0).toLowerCase() + label.slice(1) : 'Nothing to undo'; }
  function editStatus(hint, move) {
    if (S.err) return statusHtml('', !!move);
    if (S.note === FULL || S.note === LAST) return '<span class="warn">' + esc(S.note) + '</span>';
    if (hint === FULL || hint === LAST) return '<span class="warn">' + esc(hint) + '</span>';
    return esc(move || hint || S.note || '');
  }

  var busy = false, busyTimer = 0;
  function release() { busy = false; clearTimeout(busyTimer); S.press = null; }
  function message(title, line, note) {
    push({ id: 'message', msg: 'error', content: { title: title, line: line, note: note || '', actions: [['back', 'Back']] }, f: { b: 0 } });
  }
  function perform(title, run) {
    if (busy) return;
    busy = true; busyTimer = setTimeout(release, 10000);
    run(function (err) {
      release();
      if (err) message(title, err.message || 'The TV could not open this screen.', err.detail || '');
      render(); syncRotation();
    });
  }
  var saverTimer = 0;
  function saverMs() { return (S.c.saver || 0) * 60000; }
  function armSaver() { clearTimeout(saverTimer); saverTimer = 0; var ms = saverMs(); if (ms > 0 && !document.hidden) saverTimer = setTimeout(fireSaver, ms); }
  function fireSaver() { saverTimer = 0; if (document.hidden || busy || (S.c.saver || 0) <= 0) return; perform('Art Mode', FrameDevice.art); }
  function launch(id) {
    var a = app(id), c;
    if (!a || busy) return;
    if (S.c.home.indexOf(id) >= 0) { c = next(S.c.home.slice(), S.c.recent.slice()); c.lastApp = id; write(c, 'Last app'); }
    S.press = id; S.lastLaunch = a.name;
    perform(a.name, function (done) { FrameDevice.launchApp(a.appId, done); });
  }
  /* On the TV, Home keeps only installed apps. A Home still on the inherited defaults is refilled from the
     installed services below, in this order; one the owner arranged keeps its order. */
  var HOME_PICKS = [{ id: 'netflix' }, { id: 'youtube' }, { id: 'primevideo' }, { id: 'disneyplus' }, { name: /^hulu$/i },
    { id: 'appletv' }, { name: /^peacock/i }, { name: /^youtube tv$/i }, { name: /^(?:max|hbo max)$/i }, { name: /^paramount/i }, { name: /^emby$/i }, { name: /^plex$/i }];
  function syncHome() {
    var home = S.c.home, kept, want = [], c;
    if (!ALPHA.length) return;
    kept = home.filter(function (id) { return ALPHA.indexOf(id) >= 0; });
    if (kept.length === home.length) return;
    if (same(home, PRIMARY)) {
      HOME_PICKS.forEach(function (p) {
        var id = p.id ? (ALPHA.indexOf(p.id) >= 0 ? p.id : null) : ALPHA.filter(function (x) { return p.name.test(app(x).name); })[0];
        if (id && want.indexOf(id) < 0 && want.length < CAP) want.push(id);
      });
    }
    if (!want.length) want = kept;
    if (!want.length) return;
    c = next(want, S.c.recent.filter(function (id) { return ALPHA.indexOf(id) >= 0 && want.indexOf(id) < 0; }));
    c.lastApp = want.indexOf(S.c.lastApp) >= 0 ? S.c.lastApp : want[0];
    if (write(c, 'Apps on Home')) { setSel(want.indexOf(S.sel) >= 0 ? S.sel : want[0]); log('Home matched to installed apps'); }
  }
  function refreshCatalog() {
    var request, oldFocus;
    if (catalog.loading) return;
    request = ++catalog.request; catalog.loading = true; catalog.error = null;
    FrameDevice.apps(function (err, entries) {
      if (request !== catalog.request) return;
      catalog.loading = false;
      if (err) { catalog.error = err.message || 'Could not read installed apps.'; if (!catalog.loaded) ALPHA = []; render(); return; }
      oldFocus = top().id === 'apps' ? ALPHA[top().f.i] : null;
      ALPHA = [];
      entries.forEach(function (entry) {
        var id = PRIMARY.indexOf(entry.brand) >= 0 ? entry.brand : entry.appId, a;
        if (!safeId(id) || !safeId(entry.appId) || ALPHA.indexOf(id) >= 0) return;
        a = app(id);
        if (!a) { a = { id: id }; APPS.push(a); }
        a.appId = entry.appId; a.brand = entry.brand || ''; a.mark = !!entry.brand;
        a.icon = safeIcon(entry.icon);
        a.name = PRIMARY.indexOf(id) >= 0 ? PRIMARY_APPS[PRIMARY.indexOf(id)].name : String(entry.name).slice(0, 160);
        ALPHA.push(id);
      });
      ALPHA.sort(function (a, b) { return app(a).name.toLowerCase().localeCompare(app(b).name.toLowerCase()); });
      catalog.loaded = true; catalog.error = null; catalog.revision++;
      syncHome();
      if (top().id === 'apps' && oldFocus && ALPHA.indexOf(oldFocus) >= 0) top().f.i = ALPHA.indexOf(oldFocus);
      norm(); render();
    });
  }

  /* ---------- Navigation targets ---------- */
  function utils() { return ['art', 'apps', 'settings']; }
  /* prev/next run along the apps; out goes to the controls, inn comes back (or to a per-app action). */
  function axes() {
    var v = S.c.layout === 'list';
    return { prev: v ? 'up' : 'left', next: v ? 'down' : 'right', out: v ? 'right' : 'up', inn: v ? 'left' : 'down' };
  }
  function utilAction(u) {
    if (u === 'art') perform('Art Mode', FrameDevice.art);
    else if (u === 'apps') openApps();
    else openSettings();
  }
  function addAppsRoute() { openEditor('home'); }
  function openSettings() { push({ id: 'settings', f: { id: S.settingsFocus } }); }
  function openAppearance(group) {
    var axis = { background: 'bg', layout: 'layout', typography: 'font', focus: 'focus' }[group];
    var action = S.detailFocus[group] || (axis ? 'choice.' + axis + '.' + S.c[axis] : group === 'rotation' ? 'rotation.' + S.c.mode : group === 'saver' ? 'saver.' + S.c.saver : 'samsung.home');
    push({ id: 'appearance', group: group, f: { action: action } });
  }
  function openMessage(key) { push({ id: 'message', msg: key, f: { b: 0 } }); }
  function openApps() {
    var e = { id: 'apps', mode: 'browse', top: 0, f: { zone: 'grid', i: Math.max(0, ALPHA.indexOf(S.appsFocus)), h: 0 } };
    push(e); refreshCatalog(); return e;
  }
  function openEditor(origin) {
    var i = ensureSel();
    clearSession();
    refreshCatalog();
    push({ id: 'editor', origin: origin, lifted: null, top: 0, otherReturn: { id: otherList()[0] || null, index: 0, top: 0 }, f: { zone: S.c.home.length ? 'home' : 'other', i: Math.max(0, i), part: 'name', h: 1, j: 0 } });
  }
  function openWallpaper() {
    var i = wallIndex(S.c.wall);
    S.err = null; S.wallError = null;
    push({ id: 'wallpaper', i: i, top: clamp(i - 2, 0, Math.max(0, WALLS.length - WALL_VISIBLE)), f: { zone: 'photo' },
      previewTimer: 0, previewDue: null, applyPending: null, failedId: null, failedApply: false, retryBundle: null });
  }
  function isSettingsDetail(t) { return t.id === 'appearance' || t.id === 'wallpaper'; }

  var V = {};

  /* ---------- Home (browse) ---------- */
  V.home = {
    norm: function (t) {
      if (layoutNow() === 'watch') { watchNorm(t); return; }
      if (W_ZONES.indexOf(t.f.zone) >= 0) t.f.zone = 'apps';
      if (t.f.zone === 'media' && !mediaOn()) t.f.zone = 'apps';
      if (mediaOn()) t.f.mr = clamp(t.f.mr || 0, 0, M.rows.length - 1);
    },
    key: function (t, k) {
      var f = t.f, h = S.c.home, U = utils(), x = axes(), i = ensureSel();
      if (layoutNow() === 'watch') { watchKey(t, k); return; }
      if (f.zone === 'media') { mediaKey(t, k); return; }
      if (S.c.layout === 'list') { listHomeKey(t, k, i, U); return; }
      if (f.zone === 'util') {
        f.u = clamp(f.u, 0, U.length - 1);
        if (k === x.prev && f.u > 0) f.u--;
        else if (k === x.next && f.u < U.length - 1) f.u++;
        else if (k === x.inn && mediaOn()) enterMedia(f, 0);
        else if (k === x.inn || k === 'back') f.zone = 'apps';
        else if (k === 'ok') { S.lastUtil = f.u; utilAction(U[f.u]); return; }
        S.lastUtil = f.u;
        return;
      }
      f.zone = 'apps';
      if (k === x.out && mediaOn()) enterMedia(f, M.row);
      else if (k === x.out) { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); }
      else if (k === 'back') openMessage('leave');
      else if (!h.length) { if (k === 'ok') addAppsRoute(); }
      else if (k === x.prev && i > 0) setSel(h[i - 1]);
      else if (k === x.next && i < h.length - 1) setSel(h[i + 1]);
      else if (k === 'ok') launch(S.sel);
    },
    point: function (t, z, i) {
      if (layoutNow() === 'watch') { watchPoint(t, z, i); return; }
      if (z === 'util') { t.f.zone = 'util'; t.f.u = i; S.lastUtil = i; }
      else if (z === 'media' && M.rows[Math.floor(i / 1000)]) { enterMedia(t.f, Math.floor(i / 1000)); mediaCol(M.rows[t.f.mr]).i = i % 1000; }
      else if (z === 'app') { t.f.zone = 'apps'; setSel(S.c.home[i]); }
      else if (z === 'empty') t.f.zone = 'apps';
      else return;
      this.key(t, 'ok');
    }
  };
  function listHomeKey(t, k, i, U) {
    var f = t.f, h = S.c.home;
    if (f.zone === 'util') {
      f.u = clamp(f.u, 0, U.length - 1);
      if (k === 'up' && f.u > 0) f.u--;
      else if (k === 'up' && mediaOn()) enterMedia(f, M.rows.length - 1);
      else if (k === 'down' && f.u < U.length - 1) f.u++;
      else if (k === 'left' || k === 'back') f.zone = 'apps';
      else if (k === 'ok') { S.lastUtil = f.u; utilAction(U[f.u]); return; }
      S.lastUtil = f.u;
      return;
    }
    f.zone = 'apps';
    if (k === 'up' && i > 0) setSel(h[i - 1]);
    else if (k === 'right' && mediaOn()) enterMedia(f, M.row);
    else if (k === 'right') { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); }
    else if (k === 'down' && i < h.length - 1) setSel(h[i + 1]);
    else if (k === 'back') openMessage('leave');
    else if (k === 'ok') { if (h.length) launch(S.sel); else addAppsRoute(); }
  }

  /* ---------- Rows on Home ----------
     Dock: controls (top) > rows > apps (bottom). List: apps (left) > rows (right column) > controls (below). */
  function enterMedia(f, row) { f.zone = 'media'; f.mr = clamp(row || 0, 0, M.rows.length - 1); M.row = f.mr; }
  function mediaKey(t, k) {
    var f = t.f, list = S.c.layout === 'list', r = clamp(f.mr || 0, 0, M.rows.length - 1), row = M.rows[r], c = mediaCol(row), U = utils();
    c.i = clamp(c.i, 0, row.items.length - 1);
    if (k === 'left') { if (c.i > 0) c.i--; else if (list) f.zone = 'apps'; }
    else if (k === 'right') { if (c.i < row.items.length - 1) c.i++; }
    else if (k === 'up') { if (r > 0) f.mr = r - 1; else if (!list) { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); } }
    else if (k === 'down') {
      if (r < M.rows.length - 1) f.mr = r + 1;
      else if (list) { f.zone = 'util'; f.u = 0; S.lastUtil = 0; }
      else f.zone = 'apps';
    }
    else if (k === 'back') f.zone = 'apps';
    else if (k === 'ok') { mediaOk(row.items[c.i]); return; }
    if (f.zone === 'media') M.row = f.mr;
  }
  /* Seerr titles already in the library carry a PlayItemId: available ones play on OK,
     partly available ones offer Play next to Request. */
  function canPlay(it) { return !!it.playId && (it.kind !== 'discover' || it.status === 'available' || it.status === 'partial'); }
  function mediaOk(it) {
    if (!it) return;
    if (it.kind === 'discover' && !(it.status === 'available' && it.playId)) { openRequest(it); return; }
    playItem(it);
  }
  function playItem(it) {
    if (!canPlay(it) || busy) return;
    S.press = null;
    perform(it.title || 'Emby', function (done) {
      Media.play(it.playId, (it.kind === 'discover' ? it.playAction : it.action) === 'resume' ? 'resume' : 'play', function (err, result) {
        if (err) { if (err.code === 'unauthorized') { M.unauthorized = true; } done(mediaError(err)); return; }
        if (result && result.Status === 'failed') { done({ message: result.Message || 'Emby couldn’t start this.', detail: '' }); return; }
        FrameDevice.emby(done);
      });
    });
  }
  function refreshMedia(force) {
    var request;
    clearTimeout(M.timer); M.timer = 0;
    M.cfg = Media.config();
    if (!M.cfg) { setHome(null); M.data = null; return; }
    if (M.loading || (!force && Date.now() - M.at < QA.staleMs)) { scheduleMedia(); return; }
    request = ++M.request; M.loading = true;
    Media.home(function (err, data) {
      if (request !== M.request) return;
      M.loading = false; M.at = Date.now();
      if (err) {
        M.error = err;
        if (err.code === 'unauthorized') { M.unauthorized = true; setHome(null); }
      } else {
        M.error = null; M.unauthorized = false; M.data = data; setHome(data);
      }
      scheduleMedia(); norm(); render();
    });
  }
  function scheduleMedia() {
    clearTimeout(M.timer); M.timer = 0;
    if (M.cfg && !document.hidden) M.timer = setTimeout(function () { refreshMedia(true); }, REFRESH_MS);
  }

  /* ---------- Wallpaper child: focus previews, activation applies ---------- */
  function cancelWallpaperTimer(t) {
    clearTimeout(t.previewTimer); t.previewTimer = 0; t.previewDue = null;
  }
  function failWallpaper(t, id, apply, bundle) {
    t.applyPending = null; t.failedId = id; t.failedApply = apply; t.retryBundle = bundle || null;
    restoreLook();
    if (!bundle) S.wallError = id;
  }
  function applyWallpaper(t, prepared) {
    var w = WALLS[t.i], c, bundle = prepared || S.previewBundle;
    if (!prepared && (S.wallPending || t.previewDue || S.wallShown !== w.id || S.wallError)) {
      t.applyPending = w.id;
      if (t.previewDue || S.wallPending !== w.id) { cancelWallpaperTimer(t); loadWallpaperPreview(t); }
      return;
    }
    t.applyPending = null;
    if (w.id === S.c.wall) { S.err = null; t.failedId = null; t.failedApply = false; t.retryBundle = null; return; }
    if (!bundle || bundle.key !== bundleKey({ wall: w.id, material: S.c.material })) { t.applyPending = w.id; loadWallpaperPreview(t); return; }
    c = next(S.c.home.slice(), S.c.recent.slice()); c.wall = w.id;
    if (!write(c, 'Wallpaper ' + w.name)) { failWallpaper(t, w.id, true, bundle); return; }
    installBundle(bundle, c); committedBundle = bundle; S.previewBundle = null;
    t.failedId = null; t.failedApply = false; t.retryBundle = null;
  }
  function loadWallpaperPreview(t) {
    var id = WALLS[t.i].id;
    cancelWallpaperTimer(t);
    showWall(id, function (ok) {
      if (top() !== t || WALLS[t.i].id !== id) return;
      if (!ok) failWallpaper(t, id, t.applyPending === id, null);
      else if (t.applyPending === id) applyWallpaper(t);
      render(); syncRotation();
    });
  }
  function previewWallpaper(t, index, apply, immediate) {
    var id, target;
    cancelWallpaperTimer(t); cancelLook();
    t.i = index; t.f.zone = 'photo'; id = WALLS[index].id;
    t.applyPending = apply ? id : null; t.failedId = null; t.failedApply = false; t.retryBundle = null;
    S.err = null; S.wallError = null;
    if (id === S.c.wall && committedBundle) {
      installBundle(committedBundle, S.c, true); S.previewBundle = null;
      if (apply) applyWallpaper(t);
      return;
    }
    if (S.wallShown === id && S.previewBundle && S.previewBundle.key === bundleKey({ wall: id, material: S.c.material })) {
      if (apply) applyWallpaper(t);
      return;
    }
    if (apply || immediate) { loadWallpaperPreview(t); return; }
    target = lookOf(S.c); target.wall = id;
    S.pending = { patch: { wall: id }, target: target, row: 'bg', preview: true, transient: false, deferred: true };
    t.previewDue = id;
    t.previewTimer = setTimeout(function () { if (top() === t && WALLS[t.i].id === id) loadWallpaperPreview(t); }, WALL_DELAY);
  }
  function retryWallpaper(t) {
    var apply = t.failedApply, bundle = t.retryBundle;
    t.f.zone = 'photo';
    if (bundle && apply) applyWallpaper(t, bundle);
    else previewWallpaper(t, t.i, apply, true);
  }
  function closeWallpaper(t) {
    cancelWallpaperTimer(t); t.applyPending = null; S.err = null; pop(); restoreLook();
    if (top().id === 'appearance' && top().group === 'background') detailFocus(top(), { action: 'background.wallpaper' }, 0);
  }
  V.wallpaper = {
    norm: function (t) {
      t.i = clamp(t.i, 0, WALLS.length - 1);
      if (t.f.zone === 'retry' && !t.failedId) t.f.zone = 'photo';
      if (t.i < t.top) t.top = t.i;
      if (t.i >= t.top + WALL_VISIBLE) t.top = t.i - WALL_VISIBLE + 1;
      t.top = clamp(t.top, 0, Math.max(0, WALLS.length - WALL_VISIBLE));
    },
    key: function (t, k) {
      if (k === 'back') { closeWallpaper(t); return; }
      if (t.f.zone === 'back') {
        if (k === 'ok') closeWallpaper(t);
        else if (k === 'down' || k === 'right') t.f.zone = 'photo';
        return;
      }
      if (t.f.zone === 'retry') {
        if (k === 'ok') retryWallpaper(t);
        else if (k === 'up' || k === 'left') t.f.zone = 'photo';
        return;
      }
      if (k === 'left' || k === 'up' && t.i === 0) { t.f.zone = 'back'; t.applyPending = null; }
      else if (k === 'up' && t.i > 0) previewWallpaper(t, t.i - 1, false);
      else if (k === 'down' && t.i < WALLS.length - 1) previewWallpaper(t, t.i + 1, false);
      else if ((k === 'right' || k === 'down') && t.failedId) t.f.zone = 'retry';
      else if (k === 'ok') { if (t.retryBundle) applyWallpaper(t, t.retryBundle); else applyWallpaper(t); }
    },
    point: function (t, z, i) {
      if (z === 'wall-back') closeWallpaper(t);
      else if (z === 'wall-retry') retryWallpaper(t);
      else if (z === 'wall-choice' && i >= 0 && i < WALLS.length) {
        if (i === t.i) { t.f.zone = 'photo'; this.key(t, 'ok'); }
        else previewWallpaper(t, i, true);
      }
    }
  };

  /* ---------- Installed apps ---------- */
  function appsItems() { return catalog.error ? [] : ALPHA; }
  function appsHead() { return catalog.error ? [['retry', 'Try again', '', '']] : [['editor', 'Apps on Home', '', 'home']]; }
  V.apps = {
    sheet: true,
    norm: function (t) {
      var n = appsItems().length;
      t.f.i = clamp(t.f.i, 0, Math.max(0, n - 1));
      if (!n) t.f.zone = 'head';
    },
    key: function (t, k) {
      var f = t.f, items = appsItems(), n = items.length, col = f.i % COLS, row = Math.floor(f.i / COLS);
      if (k === 'back') { pop(); return; }
      if (f.zone === 'head') {
        if (k === 'down' && n) f.zone = 'grid';
        else if (k === 'ok') { if (catalog.error) refreshCatalog(); else openEditor('apps'); }
        return;
      }
      if (k === 'left' && col > 0) f.i--;
      else if (k === 'right' && col < COLS - 1 && f.i < n - 1) f.i++;
      else if (k === 'down' && row < Math.ceil(n / COLS) - 1) f.i = Math.min(f.i + COLS, n - 1);
      else if (k === 'up') { if (row > 0) f.i -= COLS; else f.zone = 'head'; }
      else if (k === 'ok' && n) launch(items[f.i]);
      S.appsFocus = items[f.i] || null;
    },
    point: function (t, z, i) { if (z === 'grid') { t.f.zone = 'grid'; t.f.i = i; } else if (z === 'head') t.f.zone = 'head'; else return; this.key(t, 'ok'); }
  };

  /* ---------- B: two-zone Home editor ---------- */
  function otherGroups() {
    var rec = S.c.recent.filter(function (id) { return !onHome(id) && app(id); });
    return { recent: rec, rest: ALPHA.filter(function (id) { return !onHome(id) && rec.indexOf(id) < 0; }) };
  }
  function otherList() { var o = otherGroups(); return o.recent.concat(o.rest); }
  function editorCut() { return 5; }
  function editorHomeY(i) { return i * ED_ROW + (i >= editorCut() ? 24 : 0); }
  function editorOtherY(j) {
    var o = otherGroups();
    return j * ED_ROW + (o.recent.length ? ED_SEP : 0) + (o.recent.length && j >= o.recent.length ? ED_SEP : 0);
  }
  function rememberOther(t) {
    var list = otherList();
    t.otherReturn = { id: list[t.f.j] || null, index: t.f.j, top: t.top };
  }
  function returnOther(t) {
    var list = otherList(), memory = t.otherReturn, i = memory ? list.indexOf(memory.id) : -1;
    t.f.zone = 'other';
    t.f.j = i >= 0 ? i : clamp(memory ? memory.index : 0, 0, Math.max(0, list.length - 1));
    if (memory) t.top = memory.top;
  }
  function nearestHome(t, count) {
    var target = editorOtherY(t.f.j) - t.top + 36, best = 0, distance = Infinity, i, d;
    for (i = 0; i < count; i++) {
      d = Math.abs(editorHomeY(i) + 36 - target);
      if (d < distance) { best = i; distance = d; }
    }
    return best;
  }
  V.editor = {
    sheet: true,
    norm: function (t) {
      var f = t.f, nh = (t.lifted ? t.lifted.order : S.c.home).length, no = otherList().length;
      f.i = clamp(f.i, 0, Math.max(0, nh - 1));
      f.j = clamp(f.j, 0, Math.max(0, no - 1));
      if (f.zone === 'home' && !nh) f.zone = no ? 'other' : 'head';
      if (f.zone === 'other' && !no) f.zone = nh ? 'home' : 'head';
    },
    key: function (t, k) {
      var f = t.f, H = t.lifted ? t.lifted.order : S.c.home, O = otherList(), nh = H.length, no = O.length, d, tmp;
      if (t.lifted) {
        d = k === 'up' ? -1 : k === 'down' ? 1 : 0;
        if (d && f.i + d >= 0 && f.i + d < nh) { tmp = H[f.i + d]; H[f.i + d] = H[f.i]; H[f.i] = tmp; f.i += d; S.err = null; }
        else if (k === 'ok') editorPlace(t);
        else if (k === 'back') { f.i = t.lifted.from; t.lifted = null; S.err = null; }
        return;
      }
      if (k === 'back') { closeEditor(t); return; }
      if (f.zone === 'head') {
        if (k === 'left' && f.h > 0) f.h--;
        else if (k === 'right' && f.h < 1) f.h++;
        else if (k === 'down') { if (no) returnOther(t); else if (nh) f.zone = 'home'; }
        else if (k === 'ok') { begin(); if (f.h === 0) undoLast(null); else closeEditor(t); }
      } else if (f.zone === 'home') {
        if (k === 'up') { if (f.i > 0) f.i--; else f.zone = 'head'; }
        else if (k === 'down') { if (f.i < nh - 1) f.i++; }
        else if (k === 'right') { if (f.part === 'name') f.part = 'remove'; else if (no) returnOther(t); }
        else if (k === 'left') { if (f.part === 'remove') f.part = 'name'; }
        else if (k === 'ok') {
          begin();
          if (f.part === 'name') t.lifted = { id: H[f.i], from: f.i, order: H.slice(), snap: snap() };
          else editorRemove(t, H[f.i]);
        }
      } else {
        if (k === 'up') { if (f.j > 0) { f.j--; rememberOther(t); } else f.zone = 'head'; }
        else if (k === 'down') { if (f.j < no - 1) { f.j++; rememberOther(t); } }
        else if (k === 'left') { if (nh) { rememberOther(t); f.i = nearestHome(t, nh); f.zone = 'home'; f.part = 'name'; } }
        else if (k === 'ok') { begin(); editorAdd(t, O[f.j]); }
      }
    },
    point: function (t, z, i) {
      if (t.lifted) { if (z === 'name' && i === t.f.i) this.key(t, 'ok'); return; }
      if (z === 'name' || z === 'remove') { t.f.zone = 'home'; t.f.i = i; t.f.part = z; }
      else if (z === 'other') { t.f.zone = 'other'; t.f.j = i; rememberOther(t); }
      else if (z === 'head') { t.f.zone = 'head'; t.f.h = i; }
      else return;
      this.key(t, 'ok');
    }
  };
  /* Focus follows the app between zones, so a repeated OK toggles the same app. */
  function editorRemove(t, id) {
    if (!homeRemove(id)) return;
    t.f.zone = 'other'; t.f.j = otherList().indexOf(id);
    S.note = app(id).name + ' is in Recently removed. OK puts it back.';
  }
  function editorAdd(t, id) {
    rememberOther(t);
    if (!homeAdd(id)) return;
    var remaining = otherList(), at = clamp(t.otherReturn.index, 0, Math.max(0, remaining.length - 1));
    t.otherReturn.id = remaining[at] || null; t.otherReturn.index = at;
    t.f.zone = 'home'; t.f.i = S.c.home.indexOf(id); t.f.part = 'remove';
    S.note = app(id).name + ' is on Home, position ' + (t.f.i + 1) + '.';
  }
  function editorPlace(t) {
    var L = t.lifted;
    begin();
    if (same(L.order, S.c.home)) { t.lifted = null; return; }
    if (!homeMove(L.order.slice(), L.id, L.snap)) return;
    t.lifted = null;
    S.note = app(L.id).name + ' moved to position ' + (t.f.i + 1) + '.';
  }
  function closeEditor() { clearSession(); pop(); }

  /* ---------- Settings, Layout and messages ---------- */
  function mode() { for (var i = 0; i < MODES.length; i++) if (MODES[i].id === S.c.mode) return MODES[i]; return MODES[0]; }
  function settingsRows() {
    var n = S.c.home.length;
    return [{ id: 'background', label: 'Background', value: S.c.bg === 'photo' ? wall(S.c.wall).name : VALUE_NAMES[S.c.bg] },
      { id: 'layout', label: 'Layout', value: VALUE_NAMES[S.c.layout] },
      { id: 'typography', label: 'Typography', value: FONTS[S.c.font].name },
      { id: 'focus', label: 'Focus', value: VALUE_NAMES[S.c.focus] + (materialApplies() ? ', ' + VALUE_NAMES[S.c.material] : '') },
      { id: 'saver', label: 'Screen saver', value: saverName(S.c.saver) },
      { id: 'editor', label: 'Apps on Home', value: n + (n === 1 ? ' app' : ' apps') }].concat(INPUTS.length ? [
      { id: 'inputs', label: 'Inputs on Home', value: shownInputs().length + ' of ' + INPUTS.length }] : []).concat([
      { id: 'media', label: 'Emby & Seerr', value: !M.cfg ? 'Not connected' : M.unauthorized ? 'Not paired. Connect again' : M.cfg.tvName || Media.host(M.cfg.url) },
      { id: 'samsung', label: 'Samsung', value: 'Home and TV settings' }]);
  }
  function settingsIds() { return settingsRows().map(function (r) { return r.id; }); }
  V.settings = {
    sheet: true,
    norm: function (t) { var ids = settingsIds(); if (ids.indexOf(t.f.id) < 0) t.f.id = ids[0]; },
    key: function (t, k) {
      var ids = settingsIds(), i = Math.max(0, ids.indexOf(t.f.id));
      if (k === 'up' && i > 0) i--;
      else if (k === 'down' && i < ids.length - 1) i++;
      else if (k === 'back') { pop(); return; }
      t.f.id = ids[i]; S.settingsFocus = ids[i];
      if (k === 'ok') settingsOk(ids[i]);
    },
    point: function (t, z, i, id) { if (z === 'row' && id) { t.f.id = id; this.key(t, 'ok'); } }
  };
  function settingsOk(id) {
    if (id === 'editor') openEditor('settings');
    else if (id === 'inputs') openInputs();
    else if (id === 'media') { if (!M.cfg || M.unauthorized) openConnect(); else openMediaSettings(); }
    else openAppearance(id);
  }
  var DETAIL_NAMES = { background: 'Background', layout: 'Layout', typography: 'Typography', focus: 'Focus', rotation: 'Rotation', saver: 'Screen saver', samsung: 'Samsung' };
  function choice(axis, value, disabled) {
    return { action: axis === 'saver' ? 'saver.' + value : axis === 'mode' ? 'rotation.' + value : 'choice.' + axis + '.' + value, axis: axis, value: value, disabled: !!disabled,
      label: axis === 'saver' ? saverName(value) : axis === 'font' ? FONTS[value].name : axis === 'mode' ? MODES.filter(function (m) { return m.id === value; })[0].name : value === 'both' ? 'Both' : VALUE_NAMES[value] };
  }
  function detailSections(t) {
    var flat = S.c.bg !== 'photo', inactive = !materialApplies();
    function options(axis, values, disabled) { return values.map(function (value) { return choice(axis, value, disabled); }); }
    if (t.group === 'background') return [
      { id: 'bg', title: 'Background type', items: options('bg', ['photo', 'light', 'dark']) },
      { id: 'wall', title: 'Wallpaper', items: [{ action: 'background.wallpaper', label: wall(S.c.wall).name, thumbnail: true, disabled: flat }] },
      { id: 'rotation', title: 'Rotation', items: [{ action: 'background.rotation', label: mode().name, disabled: flat }], reason: flat ? 'Choose Photo to use wallpaper and rotation.' : '' }
    ];
    if (t.group === 'layout') return [
      { id: 'layout', title: 'Layout', horizontal: true, items: options('layout', ['list', 'dock', 'watch']),
        reason: S.c.layout === 'watch' && !watchOn() ? 'Watch shows your Emby and Seerr titles. Until this TV is connected in Settings → Emby & Seerr, Home uses Dock.' : '' },
      { id: 'apps', title: 'App display', horizontal: true, items: options('apps', ['text', 'icons', 'both']) },
      { id: 'controls', title: 'Home controls', horizontal: true, items: options('controls', ['text', 'icons', 'both']) }
    ];
    if (t.group === 'typography') return [{ id: 'font', title: '', items: options('font', LOOK_VALUES.font) }];
    if (t.group === 'focus') return [
      { id: 'focus', title: 'Focus style', horizontal: true, items: options('focus', ['type', 'glass']) },
      { id: 'material', title: 'Material', horizontal: true, items: options('material', ['soft', 'frost', 'tint'], inactive),
        reason: inactive ? flat ? 'Materials are available with a Photo background.' : 'Choose Glass focus or the Dock layout to use materials.' : '' }
    ];
    if (t.group === 'rotation') return [{ id: 'mode', title: '', items: options('mode', MODES.map(function (m) { return m.id; }), flat),
      reason: flat ? 'Choose Photo in Background to use rotation.' : 'Timed changes pause while Settings or another panel is open.' }];
    if (t.group === 'saver') return [{ id: 'saver', title: '', items: options('saver', SAVER_VALUES),
      reason: 'The screen saver opens Samsung Art Mode when Home sits idle. Any remote button wakes it.' }];
    return [{ id: 'samsung', title: '', items: [
      { action: 'samsung.home', label: 'Samsung Home', description: 'Open Samsung’s Home screen' },
      { action: 'samsung.settings', label: 'TV settings', description: 'Picture, sound and network settings' }
    ] }];
  }
  function detailRows(t) {
    var rows = [[{ action: 'settings.back', label: t.group === 'rotation' ? 'Background' : 'Settings' }]];
    detailSections(t).forEach(function (section) {
      var enabled = section.items.filter(function (item) { return !item.disabled; });
      if (section.horizontal && enabled.length) rows.push(enabled);
      else enabled.forEach(function (item) { rows.push([item]); });
    });
    if (S.lookError) rows.push([{ action: 'settings.retry', label: 'Try again' }]);
    return rows;
  }
  function detailLocation(t) {
    var rows = detailRows(t), row = 0, column = 0;
    rows.forEach(function (items, r) { items.forEach(function (item, c) { if (item.action === t.f.action) { row = r; column = c; } }); });
    return { rows: rows, row: row, column: column, item: rows[row][column] };
  }
  function detailFocus(t, item, column) {
    t.f.action = item.action;
    if (item.action !== 'settings.back') S.detailFocus[t.group] = item.action;
    if (column !== undefined) t.f.column = column;
    if (item.axis) S.appearanceFocus = item.axis;
  }
  function applyRotation(value) {
    var c;
    if (S.c.bg !== 'photo') return;
    S.err = null; S.lookError = null;
    if (value === S.c.mode) return;
    c = next(S.c.home.slice(), S.c.recent.slice()); c.mode = value;
    if (!write(c, 'Wallpaper rotation')) S.lookError = { type: 'save', patch: { mode: value }, row: 'mode', transient: false };
  }
  function saverName(v) { return v ? v + ' min' : 'Off'; }
  function applySaver(value) {
    var c;
    if (value === S.c.saver) return;
    S.err = null; S.lookError = null;
    c = next(S.c.home.slice(), S.c.recent.slice()); c.saver = value;
    if (!write(c, 'Screen saver')) S.lookError = { type: 'save', patch: { saver: value }, row: 'saver', transient: false };
    armSaver();
  }
  function detailBack() { cancelLook(); S.err = null; pop(); }
  function detailOk(t, item) {
    var patch = {}, error = S.lookError;
    if (item.action === 'settings.back') { detailBack(); return; }
    if (item.disabled || S.pending) return;
    if (item.action === 'settings.retry') {
      if (error && error.patch[error.row] !== undefined) detailFocus(t, choice(error.row, error.patch[error.row]), 0);
      if (error && error.row === 'mode') applyRotation(error.patch.mode);
      else if (error && error.row === 'saver') applySaver(error.patch.saver);
      else if (error) setLook(error.patch, { row: error.row });
    } else if (item.axis === 'mode') applyRotation(item.value);
    else if (item.axis === 'saver') applySaver(item.value);
    else if (item.axis) { patch[item.axis] = item.value; setLook(patch, { row: item.axis }); }
    else if (item.action === 'background.wallpaper') openWallpaper();
    else if (item.action === 'background.rotation') openAppearance('rotation');
    else if (item.action === 'samsung.home') perform('Samsung Home', FrameDevice.home);
    else if (item.action === 'samsung.settings') perform('TV settings', FrameDevice.settings);
  }
  V.appearance = {
    norm: function (t) {
      var rows = detailRows(t), exists = false, applied = null;
      var axis = { background: 'bg', layout: 'layout', typography: 'font', focus: 'focus', rotation: 'mode', saver: 'saver' }[t.group];
      rows.forEach(function (items) { items.forEach(function (item) {
        if (item.action === t.f.action) exists = true;
        if (item.axis === axis && item.value === S.c[axis]) applied = item;
      }); });
      if (!exists) detailFocus(t, applied || (rows[1] || rows[0])[0], 0);
      if (t.f.column === undefined) t.f.column = detailLocation(t).column;
    },
    key: function (t, k) {
      var at = detailLocation(t), row = at.row, column = at.column;
      if (k === 'back') { detailBack(); return; }
      if (k === 'ok') { detailOk(t, at.item); return; }
      if (k === 'up' || k === 'down') {
        row = clamp(row + (k === 'up' ? -1 : 1), 0, at.rows.length - 1);
        column = Math.min(t.f.column || 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column]);
      } else if (k === 'left' || k === 'right') {
        column = clamp(column + (k === 'left' ? -1 : 1), 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column], column);
      }
    },
    point: function (t, z, i, action) {
      if (z !== 'detail') return;
      detailRows(t).some(function (items) { return items.some(function (item, column) {
        if (item.action !== action) return false;
        detailFocus(t, item, column); detailOk(t, item); return true;
      }); });
    }
  };
  function messageContent(t) { return t.content || MSG[t.msg]; }
  V.message = {
    sheet: true,
    key: function (t, k) {
      var A = messageContent(t).actions, a;
      if (k === 'left') t.f.b = Math.max(0, t.f.b - 1);
      else if (k === 'right') t.f.b = Math.min(A.length - 1, t.f.b + 1);
      else if (k === 'back') pop();
      else if (k === 'ok') {
        a = A[t.f.b][0]; pop();
        if (a === 'samsung') perform('Samsung Home', FrameDevice.home);
        else if (a === 'disconnect') disconnectMedia();
      }
    },
    point: function (t, z, i) { if (z === 'act') { t.f.b = i; this.key(t, 'ok'); } }
  };

  /* ---------- Seerr request ---------- */
  /* Credits and details for the request screen, from Seerr through the plugin. Kept for the session. */
  var DETAILS = {};
  function names(v, n) { return (Array.isArray(v) ? v : []).filter(function (x) { return typeof x === 'string' && x; }).slice(0, n).map(function (x) { return x.slice(0, 80); }); }
  function cleanDetails(d) {
    if (!d || typeof d !== 'object') return null;
    return { tagline: text(d.Tagline, 200), overview: text(d.Overview, 900), genres: names(d.Genres, 3), runtime: count(d.RuntimeMinutes), seasons: count(d.Seasons), rating: count(d.Rating),
      directors: names(d.Directors, 3), writers: names(d.Writers, 3), creators: names(d.Creators, 3), networks: names(d.Networks, 2),
      cast: (Array.isArray(d.Cast) ? d.Cast : []).slice(0, 12).filter(function (c) { return c && typeof c.Name === 'string' && c.Name; })
        .map(function (c) { return { name: text(c.Name, 80), character: text(c.Character, 80), photo: text(c.PhotoUrl, 400) }; }) };
  }
  function loadDetails(t) {
    var it = t.item, key = it.mediaType + ':' + it.tmdb;
    if (it.kind !== 'discover' || !it.tmdb || !it.mediaType) { t.details = 'none'; return; }
    if (DETAILS[key]) { t.details = DETAILS[key]; return; }
    t.details = null;
    Media.details(it.mediaType, it.tmdb, function (err, data) {
      var d = err ? null : cleanDetails(data);
      if (d) DETAILS[key] = d;
      t.details = d || 'none';
      if (top() === t) render();
    });
  }
  function openRequest(it) {
    var t = push({ id: 'request', item: it, step: 'loading', requesters: [], last: null, message: '', token: 0, details: null, f: { b: 0 } });
    loadDetails(t);
    if (it.status === 'available' || it.status === 'processing' || it.status === 'requested') { requestInfo(t, it.status === 'available' ? 'This is already in your Emby library.' : it.status === 'processing' ? 'This has been requested and is on its way.' : 'This has already been requested.'); return; }
    if (M.data && M.data.RequestsEnabled === false) { requestInfo(t, 'Requests are turned off on your Emby server.'); return; }
    loadRequesters(t);
  }
  function requestInfo(t, message) { t.step = 'info'; t.message = message; t.f.b = 0; }
  function loadRequesters(t) {
    var token = ++t.token;
    t.step = 'loading'; t.message = '';
    Media.requesters(function (err, data) {
      if (top() !== t || token !== t.token) return;
      if (err) { t.step = 'error'; t.message = mediaError(err).message; t.f.b = 0; render(); return; }
      t.requesters = (data && Array.isArray(data.Requesters) ? data.Requesters : []).slice(0, 6).filter(function (r) { return r && count(r.Id) > 0; })
        .map(function (r) { return { id: r.Id, name: text(r.Name, 40) || 'Seerr user ' + r.Id }; });
      if (!data || data.RequestsEnabled === false) requestInfo(t, 'Requests are turned off on your Emby server.');
      else if (!t.requesters.length) requestInfo(t, 'This TV’s Emby account isn’t linked to a Seerr account yet. Link it in the Lobby plugin settings on your server.');
      else {
        t.step = 'choose';
        // Play stays first for partly available shows; otherwise start on the last requester.
        t.f.b = canPlay(t.item) ? 0 : Math.max(0, t.requesters.map(function (r) { return r.id; }).indexOf(data.LastRequesterId));
      }
      render();
    });
  }
  function requestActions(t) {
    var play = canPlay(t.item) && t.step !== 'sending' ? [['play', t.item.playAction === 'resume' ? 'Resume' : 'Play']] : [];
    if (t.step === 'choose') return play.concat(t.requesters.map(function (r) { return ['as.' + r.id, t.requesters.length > 1 ? 'Request as ' + r.name : 'Request']; }), [['close', 'Cancel']]);
    if (t.step === 'error') return play.concat([['retry', 'Try again'], ['close', 'Close']]);
    if (t.step === 'loading' || t.step === 'sending') return play.concat([['close', 'Cancel']]);
    return play.concat([['close', 'Done']]);
  }
  function sendRequest(t, requester) {
    var it = t.item, token = ++t.token;
    t.step = 'sending'; t.f.b = 0; t.retry = requester;
    Media.request({ TmdbId: it.tmdb, MediaType: it.mediaType, SeerrUserId: requester.id }, function (err, result) {
      if (top() !== t || token !== t.token) return;
      if (err || !result || result.Status === 'failed') { t.step = 'error'; t.message = err ? mediaError(err).message : result && result.Message || 'The request didn’t go through.'; t.f.b = 0; render(); return; }
      it.status = 'requested';
      requestInfo(t, (t.requesters.length > 1 ? 'Requested for ' + requester.name + '. ' : '') + (result.Status === 'approved' ? 'It’s approved and on its way.' : 'It’s waiting for approval.'));
      t.step = 'done';
      refreshMedia(true); render();
    });
  }
  V.request = {
    sheet: true,
    norm: function (t) { t.f.b = clamp(t.f.b, 0, requestActions(t).length - 1); },
    key: function (t, k) {
      var A = requestActions(t), a;
      if (k === 'left' && t.f.b > 0) t.f.b--;
      else if (k === 'right' && t.f.b < A.length - 1) t.f.b++;
      else if (k === 'back') { t.token++; pop(); }
      else if (k === 'ok') {
        a = A[t.f.b][0];
        if (a === 'close') { t.token++; pop(); }
        else if (a === 'play') { t.token++; pop(); playItem(t.item); }
        else if (a === 'retry') { if (t.retry) sendRequest(t, t.retry); else loadRequesters(t); }
        else if (a.indexOf('as.') === 0) t.requesters.some(function (r) { if ('as.' + r.id !== a) return false; sendRequest(t, r); return true; });
      }
    },
    point: function (t, z, i) { if (z === 'act') { t.f.b = i; this.key(t, 'ok'); } }
  };

  /* ---------- Connect: server address keypad and pairing code ---------- */
  var KEYPAD = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', ':'], ['del', 'go']];
  function openConnect() {
    var c = Media.config();
    FrameDevice.digits();
    push({ id: 'connect', step: 'address', text: c ? Media.host(c.url) : '', error: '', url: '', token: 0, poll: 0, pairing: null, server: null, tvName: '', f: { r: 0, c: 0, b: 0 } });
  }
  function connectFail(t, message) { clearTimeout(t.poll); t.step = 'error'; t.error = message; t.f.b = 0; }
  function connectStart(t) {
    var url = Media.normalise(t.text), token;
    if (!url) { t.error = 'Enter your Emby server’s address, like 192.168.1.10 or 192.168.1.10:8096.'; return; }
    t.url = url; t.step = 'checking'; t.error = ''; t.f.b = 0; token = ++t.token;
    Media.probe(url, function (err, info) {
      if (top() !== t || token !== t.token) return;
      if (err) { connectFail(t, err.code === 'notemby' ? err.message : 'Couldn’t reach ' + Media.host(url) + '. Check the address, and that the TV and server are on the same network.'); render(); return; }
      t.server = info;
      FrameDevice.identity(function (who) {
        if (top() !== t || token !== t.token) return;
        Media.startPairing(url, who.name, who.duid, function (err2, p) {
          if (top() !== t || token !== t.token) return;
          if (err2 || !p || !p.Code || !p.PairingId || !p.Secret) {
            connectFail(t, err2 && err2.code === 'missing' ? 'Emby is running, but the Lobby plugin isn’t installed on it.' : mediaError(err2).message);
            render(); return;
          }
          t.pairing = { id: String(p.PairingId), secret: String(p.Secret), code: text(p.Code, 12) };
          t.step = 'code'; t.f.b = 0; pollPairing(t, token); render();
        });
      });
    });
  }
  function pollPairing(t, token) {
    clearTimeout(t.poll);
    t.poll = setTimeout(function () {
      if (top() !== t || token !== t.token || t.step !== 'code') return;
      if (document.hidden) { pollPairing(t, token); return; }
      Media.pairingStatus(t.url, t.pairing.id, t.pairing.secret, function (err, s) {
        if (top() !== t || token !== t.token || t.step !== 'code') return;
        if (err || !s) { pollPairing(t, token); return; }
        if (s.Status === 'approved' && s.Token) {
          if (!Media.save(t.url, String(s.Token), text(s.TvName, 80))) { connectFail(t, 'This TV couldn’t save the connection. Try again.'); render(); return; }
          M.cfg = Media.config(); M.unauthorized = false; setHome(null); M.data = null; M.cols = {}; M.row = 0; M.settings = null;
          if (S.c.layout !== 'watch') setLook({ layout: 'watch' }, { row: 'layout' });
          t.tvName = text(s.TvName, 80); t.step = 'done'; t.f.b = 0;
          refreshMedia(true); render(); return;
        }
        if (s.Status === 'rejected') { connectFail(t, 'Pairing was turned down on the server.'); render(); return; }
        if (s.Status === 'expired') { connectFail(t, 'That code expired. Start again for a new one.'); render(); return; }
        pollPairing(t, token);
      });
    }, QA.pollMs);
  }
  function connectType(t, key) {
    if (key === 'del') t.text = t.text.slice(0, -1);
    else if (key === 'go') { connectStart(t); return; }
    else if (t.text.length < 64) t.text += key;
    t.error = '';
  }
  function connectActions(t) {
    if (t.step === 'error') return [['retry', 'Try again'], ['edit', 'Change address']];
    if (t.step === 'done') return [['done', 'Done']];
    return [['cancel', 'Cancel']];
  }
  function closeConnect(t) { t.token++; clearTimeout(t.poll); pop(); }
  V.connect = {
    sheet: true,
    norm: function (t) {
      t.f.r = clamp(t.f.r, 0, KEYPAD.length - 1); t.f.c = clamp(t.f.c, 0, KEYPAD[t.f.r].length - 1);
      if (t.step !== 'address') t.f.b = clamp(t.f.b, 0, connectActions(t).length - 1);
    },
    key: function (t, k) {
      var f = t.f, A, a, width;
      if (t.step === 'address') {
        if (k.indexOf('type:') === 0) { connectType(t, k.slice(5)); return; }
        if (k === 'back') { closeConnect(t); return; }
        if (k === 'up' && f.r > 0) { width = KEYPAD[f.r].length; f.r--; f.c = width === 2 ? (f.c ? 2 : 0) : f.c; }
        else if (k === 'down' && f.r < KEYPAD.length - 1) { f.r++; if (KEYPAD[f.r].length === 2) f.c = f.c === 0 ? 0 : 1; }
        else if (k === 'left' && f.c > 0) f.c--;
        else if (k === 'right' && f.c < KEYPAD[f.r].length - 1) f.c++;
        else if (k === 'ok') connectType(t, KEYPAD[f.r][f.c]);
        return;
      }
      A = connectActions(t);
      if (k === 'left' && f.b > 0) f.b--;
      else if (k === 'right' && f.b < A.length - 1) f.b++;
      else if (k === 'back') { if (t.step === 'done') closeConnect(t); else { t.token++; clearTimeout(t.poll); t.step = 'address'; t.error = ''; } }
      else if (k === 'ok') {
        a = A[f.b][0];
        if (a === 'done') { closeConnect(t); if (top().id === 'settings') openMediaSettings(); }
        else if (a === 'retry') connectStart(t);
        else { t.token++; clearTimeout(t.poll); t.step = 'address'; t.error = ''; }
      }
    },
    point: function (t, z, i) {
      if (z === 'key' && t.step === 'address') { t.f.r = Math.floor(i / 10); t.f.c = i % 10; this.key(t, 'ok'); }
      else if (z === 'act' && t.step !== 'address') { t.f.b = i; this.key(t, 'ok'); }
    }
  };

  /* ---------- Emby & Seerr settings and team picker: scrolling lists ---------- */
  var LS_VIEW = 704, LS_LINE = 104, LS_HEAD = 64;
  function openMediaSettings() {
    M.note = null;
    push({ id: 'mediaset', top: 0, f: { i: 0, p: 0 } });
    loadMediaSettings();
  }
  function loadMediaSettings() {
    M.settingsLoading = true; M.settingsError = null;
    Media.settings(function (err, data) {
      M.settingsLoading = false;
      if (err) { M.settingsError = mediaError(err).message; if (err.code === 'unauthorized') M.unauthorized = true; }
      else M.settings = data && Array.isArray(data.Rows) ? data : null;
      norm(); render();
    });
  }
  function seconds(ms) { return (ms / 1000).toFixed(ms % 1000 ? 1 : 0) + ' s'; }
  function choiceLine(key, label, desc, field, values, format) {
    var current = M.settings[field];
    if (values.indexOf(current) < 0) values = values.concat([current]).sort(function (a, b) { return a - b; });
    return { key: key, label: label, desc: desc, parts: values.map(function (v) { return { id: field + ':' + v, label: format(v), applied: v === current, value: v, field: field }; }) };
  }
  function mediaSettingsLines() {
    var s = M.settings, c = M.cfg, lines = [];
    lines.push({ key: 'conn', label: c.tvName || 'This TV', desc: 'Connected to ' + Media.host(c.url) + (M.data && M.data.UserName ? ' as ' + text(M.data.UserName, 40) : ''),
      parts: [{ id: 'refresh', label: M.loading ? 'Refreshing…' : 'Refresh rows' }] });
    if (!s) {
      lines.push({ key: 'loading', label: M.settingsError ? 'Couldn’t load this TV’s settings' : 'Loading settings…', desc: M.settingsError || '', parts: M.settingsError ? [{ id: 'retry', label: 'Try again' }] : [] });
    } else {
      lines.push({ head: 'Home rows' });
      s.Rows.forEach(function (r, i) {
        lines.push({ key: 'row.' + r.Id, row: r.Id, label: text(r.Title, 60), desc: r.Available ? SOURCE_NAMES[r.Source] || '' : text(r.Reason, 120), dim: !r.Visible,
          parts: [{ id: 'toggle', label: r.Visible ? 'Shown' : 'Hidden', applied: !!r.Visible }, { id: 'up', label: 'Move up', disabled: i === 0 }, { id: 'down', label: 'Move down', disabled: i === s.Rows.length - 1 }] });
      });
      lines.push({ head: 'Rows' });
      lines.push(choiceLine('limit', 'Items per row', 'The most items a row shows.', 'RowLimit', [8, 12, 20, 30], function (v) { return String(v); }));
      lines.push({ key: 'teams', label: 'Your teams', desc: s.SportsTeams && s.SportsTeams.length ? s.SportsTeams.slice(0, 6).join(', ') + (s.SportsTeams.length > 6 ? ' and ' + (s.SportsTeams.length - 6) + ' more' : '') : 'None chosen yet', parts: [{ id: 'teams', label: 'Choose teams' }] });
      lines.push(choiceLine('lookahead', 'Sports look-ahead', 'Games on now, plus any starting within this time.', 'SportsLookaheadHours', [6, 12, 24, 48], function (v) { return v + ' h'; }));
      lines.push({ head: 'Playback' });
      lines.push(choiceLine('delay', 'Delay before play', 'Raise this if Emby opens but doesn’t start playing.', 'PlayDelayMs', [500, 1000, 1500, 2000, 3000], seconds));
      lines.push(choiceLine('wait', 'Wait for Emby', 'How long to wait for Emby to open before giving up.', 'PlayTimeoutSeconds', [20, 45, 90], function (v) { return v + ' s'; }));
      lines.push({ head: 'This TV' });
      lines.push({ key: 'reset', label: 'Server defaults', desc: s.Customized ? 'This TV uses its own settings.' : 'This TV uses the server’s defaults.', parts: [{ id: 'reset', label: 'Use defaults', disabled: !s.Customized }] });
    }
    lines.push({ key: 'disconnect', label: 'Disconnect', desc: 'Forget the Emby server on this TV.', parts: [{ id: 'disconnect', label: 'Disconnect' }] });
    return lines;
  }
  function teamLines(t) {
    var chosen = (t.teams || []).filter(function (x) { return x.Selected; }).length, league = null;
    var lines = [{ key: 'done', label: chosen ? 'Following ' + chosen + (chosen === 1 ? ' team' : ' teams') : 'Not following any teams yet', desc: t.loading ? 'Reading the TV guide…' : t.message || '', parts: [{ id: 'done', label: 'Done' }] }];
    (t.teams || []).forEach(function (team) {
      var l = team.League || 'Other';
      if (l !== league) { league = l; lines.push({ head: l }); }
      lines.push({ key: 'team.' + team.Name, team: team.Name, label: team.Name,
        desc: team.Games ? team.Games + (team.Games === 1 ? ' game' : ' games') + (team.NextStartDate ? ' · next ' + timeText(team.NextStartDate) : '') : 'Not in the guide this week',
        parts: [{ id: 'toggle', label: team.Selected ? 'Following' : 'Follow', applied: !!team.Selected }] });
    });
    return lines;
  }
  function listLines(t) { return t.id === 'teams' ? teamLines(t) : t.id === 'inputs' ? inputLines() : mediaSettingsLines(); }
  /* Inputs on Home: each HDMI input the TV reports can be shown in the Watch dock or left out. */
  function inputLines() {
    var shown = shownInputs().length, lines = [{ key: 'done', label: INPUTS.length ? shown + ' of ' + INPUTS.length + ' inputs on Home' : 'No HDMI inputs found',
      desc: INPUTS.length ? 'Inputs follow your apps in the dock along the bottom of Home.' : 'This TV didn’t report any HDMI inputs.', parts: [{ id: 'done', label: 'Done' }] }];
    INPUTS.forEach(function (inp) {
      var on = (S.c.hiddenInputs || []).indexOf(inp.number) < 0;
      lines.push({ key: 'input.' + inp.number, input: inp.number, label: inputName(inp),
        desc: (inp.name ? 'HDMI ' + inp.number + ' · ' : '') + (inp.connected ? 'Connected' : 'Nothing connected'),
        parts: [{ id: 'toggle', label: on ? 'On Home' : 'Add to Home', applied: on }] });
    });
    return lines;
  }
  function openInputs() { M.note = null; push({ id: 'inputs', top: 0, f: { i: 0, p: 0 } }); refreshInputs(); }
  function inputsOk(t, line, part) {
    var hidden, c;
    if (part.id === 'done') { pop(); return; }
    if (!line.input) return;
    hidden = (S.c.hiddenInputs || []).slice();
    if (hidden.indexOf(line.input) >= 0) hidden = without(hidden, line.input); else hidden.push(line.input);
    c = next(S.c.home.slice(), S.c.recent.slice()); c.hiddenInputs = hidden;
    write(c, (hidden.indexOf(line.input) >= 0 ? 'Remove ' : 'Add ') + 'HDMI ' + line.input);
  }
  function focusLines(lines) { return lines.filter(function (l) { return !l.head; }); }
  function enabledPart(line, p, step) {
    var i = clamp(p, 0, line.parts.length - 1);
    while (line.parts[i] && line.parts[i].disabled) i += step || 1;
    if (!line.parts[i]) { i = clamp(p, 0, line.parts.length - 1); while (line.parts[i] && line.parts[i].disabled) i--; }
    return Math.max(0, i);
  }
  function saveTvSettings(patch, label) {
    if (M.saving) return;
    M.saving = label; M.note = null;
    Media.saveSettings(patch, function (err, data) {
      M.saving = null;
      if (err) { M.note = 'Couldn’t save. ' + mediaError(err).message; loadMediaSettings(); }
      else { if (data && Array.isArray(data.Rows)) M.settings = data; M.note = label + ' saved.'; refreshMedia(true); }
      norm(); render();
    });
  }
  function mediaSetOk(t, line, part) {
    var s = M.settings, rows, i, hidden, tmp;
    if (!part || part.disabled) return;
    if (part.id === 'refresh') { refreshMedia(true); if (!s) loadMediaSettings(); return; }
    if (part.id === 'retry') { loadMediaSettings(); return; }
    if (part.id === 'disconnect') { push({ id: 'message', content: { title: 'Disconnect this TV?', line: 'Lobby will forget ' + Media.host(M.cfg.url) + '.', note: 'Home rows go away until you connect again. Your server keeps this TV’s pairing until you remove it there.', actions: [['cancel', 'Cancel'], ['disconnect', 'Disconnect']] }, f: { b: 0 } }); return; }
    if (!s || M.saving) return;
    if (part.id === 'teams') { openTeams(); return; }
    if (part.id === 'reset') {
      M.saving = 'Defaults'; M.note = null;
      Media.resetSettings(function (err, data) {
        M.saving = null;
        if (err) M.note = 'Couldn’t reset. ' + mediaError(err).message;
        else { if (data && Array.isArray(data.Rows)) M.settings = data; M.note = 'This TV now uses the server’s defaults.'; refreshMedia(true); }
        render();
      });
      return;
    }
    if (line.row) {
      rows = s.Rows; i = rows.map(function (r) { return r.Id; }).indexOf(line.row);
      if (i < 0) return;
      if (part.id === 'toggle') {
        rows[i].Visible = !rows[i].Visible;
        hidden = rows.filter(function (r) { return !r.Visible; }).map(function (r) { return r.Id; });
        saveTvSettings({ HiddenRows: hidden }, rows[i].Title);
      } else {
        var to = part.id === 'up' ? i - 1 : i + 1;
        if (to < 0 || to >= rows.length) return;
        tmp = rows[to]; rows[to] = rows[i]; rows[i] = tmp;
        t.f.i += to - i;
        if (rows[to] && (to === 0 || to === rows.length - 1)) t.f.p = part.id === 'up' ? 2 : 1;
        saveTvSettings({ RowOrder: rows.map(function (r) { return r.Id; }) }, 'Row order');
      }
      return;
    }
    if (part.field) {
      var patch = {}; patch[part.field] = part.value; s[part.field] = part.value;
      saveTvSettings(patch, line.label);
    }
  }
  function openTeams() {
    M.note = null;
    var t = push({ id: 'teams', top: 0, f: { i: 0, p: 0 }, teams: [], loading: true, message: '' });
    Media.teams(function (err, data) {
      if (top() !== t) return;
      t.loading = false;
      if (err) t.message = mediaError(err).message;
      else {
        t.teams = (data && Array.isArray(data.Teams) ? data.Teams : []).slice(0, 400).filter(function (x) { return x && typeof x.Name === 'string' && x.Name.trim(); })
          .map(function (x) { return { Name: text(x.Name, 60), League: text(x.League, 60) || null, Games: count(x.Games) || 0, NextStartDate: text(x.NextStartDate, 40), Selected: x.Selected === true }; });
        t.message = text(data && data.Message, 160) || (t.teams.length ? '' : 'No teams found in the TV guide.');
      }
      norm(); render();
    });
  }
  function teamsOk(t, line, part) {
    if (part.id === 'done') { pop(); return; }
    if (!line.team || M.saving) return;
    t.teams.forEach(function (x) { if (x.Name === line.team) x.Selected = !x.Selected; });
    var chosen = t.teams.filter(function (x) { return x.Selected; }).map(function (x) { return x.Name; });
    if (M.settings) M.settings.SportsTeams = chosen;
    saveTvSettings({ SportsTeams: chosen }, 'Teams');
  }
  function disconnectMedia() {
    Media.forget();
    M.cfg = null; setHome(null); M.data = null; M.settings = null; M.cols = {}; M.row = 0; M.unauthorized = false; M.request++; M.loading = false;
    clearTimeout(M.timer);
    while (top().id !== 'settings' && S.stack.length > 1) pop();
    S.stack[0].f.zone = 'apps';
  }
  var LIST_VIEW = {
    sheet: true,
    norm: function (t) {
      var lines = focusLines(listLines(t));
      t.f.i = clamp(t.f.i, 0, Math.max(0, lines.length - 1));
      if (lines[t.f.i] && lines[t.f.i].parts.length) t.f.p = enabledPart(lines[t.f.i], t.f.p);
    },
    key: function (t, k) {
      var lines = focusLines(listLines(t)), line = lines[t.f.i], p;
      if (k === 'back') { pop(); return; }
      if (!line) return;
      if (k === 'up' && t.f.i > 0) { t.f.i--; t.f.p = enabledPart(lines[t.f.i], t.f.p); }
      else if (k === 'down' && t.f.i < lines.length - 1) { t.f.i++; t.f.p = enabledPart(lines[t.f.i], t.f.p); }
      else if (k === 'left' || k === 'right') {
        p = t.f.p + (k === 'left' ? -1 : 1);
        while (line.parts[p] && line.parts[p].disabled) p += k === 'left' ? -1 : 1;
        if (line.parts[p]) t.f.p = p;
      }
      else if (k === 'ok' && line.parts[t.f.p]) { if (t.id === 'teams') teamsOk(t, line, line.parts[t.f.p]); else if (t.id === 'inputs') inputsOk(t, line, line.parts[t.f.p]); else mediaSetOk(t, line, line.parts[t.f.p]); }
    },
    point: function (t, z, i) {
      if (z !== 'part') return;
      t.f.i = Math.floor(i / 100); t.f.p = i % 100; this.key(t, 'ok');
    }
  };
  V.mediaset = LIST_VIEW;
  V.teams = LIST_VIEW;
  V.inputs = LIST_VIEW;

  /* ---------- Dispatch ---------- */
  function norm() { var t = top(), v = V[t.id]; if (v.norm) v.norm(t); }
  function press(k) {
    norm();
    var t = top();
    V[t.id].key(t, k);
    norm();
    render();
    syncRotation();
    armSaver();
  }

  /* ---------- Rendering ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), homeEl = $('home'), caption = $('caption'), utilsEl = $('utils');
  var utilFocusLabel = $('utilFocusLabel'), utilFocusKey = '', appFocusName = $('appFocusName');
  var dock = $('dock'), shelf = $('shelf'), track = $('track'), plate = $('plate'), matScrim = $('matScrim'), dockEmpty = $('dockEmpty');
  var cueL = $('cueL'), cueR = $('cueR'), dockAction = $('dockAction');
  var focusStatus = $('focusStatus'), sceneEl = $('scene'), appearanceEl = $('appearance'), appearanceRows = $('appearanceRows'), appearanceDesc = $('appearanceDesc');
  var appearanceBack = $('appearanceBack'), appearanceTitle = $('appearanceTitle'), appearanceStatus = $('appearanceStatus');
  var phScene = $('phScene'), phPlate = $('phPlate'), phField = $('phField'), phList = $('phList'), phRows = $('phRows'), phAction = $('phAction'), phEmpty = $('phEmpty');
  var phPlates = [phPlate, $('phPlateAlt')], phFields = [phField, $('phFieldAlt')], photoPlateIndex = 0, photoPlateKey = null;
  var utPlates = [$('utLens'), $('utLensAlt')], utFields = [$('utField'), $('utFieldAlt')], utPlateIndex = 0, utPlateKey = null;
  var photoMode = null, photoTransitionToken = 0;
  var sheetEl = $('sheet'), sheetView = $('sheetView');
  var watchEl = $('watch'), wHeroEl = $('wHero'), wTopEl = $('wTop'), wRailEl = $('wRail'), wInfoEl = $('wInfo'), wArtEl = $('wArt'), wDotsEl = $('wDots'), wBandsEl = $('wBands');
  var wBacks = [$('wBackA'), $('wBackB')], wDockEl = $('wDock');
  var mediaEl = $('media'), mediaInfo = $('mediaInfo'), mediaView = $('mediaView'), mediaRowsEl = $('mediaRows'), mediaScrim = $('mediaScrim');
  var IMG = { photo: $('photo'), mat: $('matImg'), bg: $('sheetBg'), field: $('phFieldImg'), fieldAlt: $('phFieldImgAlt'), utility: $('utFieldImg'), utilityAlt: $('utFieldImgAlt') };
  var sheetKey = '', slotEls = {}, dockEdgeFrame = 0, dockEdgeUntil = 0, dockAnchorCenter = 960;
  var appliedPalette = null, appliedPhoto = null, appliedFont = null, appliedFontMetrics = null;

  /* Curated locked palettes keep the existing rendering path exactly. */
  function applyAdaptiveInk(palette) {
    var active = S.c.bg === 'photo' && palette && !palette.locked && palette.light && palette.tl && palette.tr && palette.br;
    if (appliedPalette === palette && appliedPhoto === (S.c.bg === 'photo')) return !!active;
    appliedPalette = palette; appliedPhoto = S.c.bg === 'photo';
    ['tl', 'tr', 'br'].forEach(function (zone) {
      var r = active ? palette[zone] : null;
      var values = r ? { ink: r.ink, 'clock-ink': r.clockInk || r.ink, 'rest-ink': r.restInk, 'peer-ink': r.peerInk, rest: r.restAlpha, peer: r.peerAlpha, under: r.halo, shadow: r.shadow } : {};
      ['ink', 'clock-ink', 'rest-ink', 'peer-ink', 'rest', 'peer', 'under', 'shadow'].forEach(function (key) {
        var name = '--' + zone + '-' + key, value = values[key];
        if (value !== undefined && value !== null) stage.style.setProperty(name, String(value));
        else stage.style.removeProperty(name);
      });
    });
    if (active && palette.light) stage.style.setProperty('--home-app-ink', palette.light);
    else stage.style.removeProperty('--home-app-ink');
    return !!active;
  }
  function inkRungClasses(palette, active) {
    if (!active) return '';
    return ['tl', 'tr', 'br'].map(function (zone) {
      var rung = palette[zone].rung;
      return ['light', 'mist', 'mist-high', 'dark', 'dark-halo'].indexOf(rung) >= 0 ? ' ink-' + zone + '-' + rung : '';
    }).join('');
  }
  function render() {
    var t = top(), sheet = !!V[t.id].sheet, shown = wall(S.shown ? S.shown.wall : S.c.wall), palette = ADAPTIVE_INK[shown.id];
    var adaptive = applyAdaptiveInk(palette), tr = adaptive && palette.tr ? palette.tr.pol : shown.ut.tr, br = adaptive && palette.br ? palette.br.pol : shown.ut.br;
    stage.className = 'stage bg-' + S.c.bg + ' l-' + layoutNow() + ' v-' + S.variant + ' m-' + (materialApplies() ? S.c.material : 'none') + ' f-' + S.c.focus + ' a-' + S.c.apps + ' u-' + S.c.controls + ' g-' + S.geom + ' tone-' + shown.tone + ' tr-' + tr + ' br-' + br + wallClasses(shown) + inkRungClasses(palette, adaptive) + ' at-' + t.id + ' font-' + homeFont() + (homeFont() !== 'manrope' ? ' font-custom' : '') + (S.fontSwitch ? ' is-font-switch' : '') + (adaptive ? ' has-adaptive-ink adaptive-tl-' + palette.tl.pol : '') + (!adaptive && shown.clockInk ? ' has-clock-ink' : '') + (!adaptive && shown.dockClockInk ? ' has-dock-clock-ink' : '') + (registeredMaterial(shown.id) ? ' registered-material' : '') + (sheet ? ' is-sheet' : '') + (S.reflow ? ' is-reflow' : '');
    if (!adaptive && shown.clockInk) stage.style.setProperty('--clock-ink', shown.clockInk);
    else stage.style.removeProperty('--clock-ink');
    if (!adaptive && shown.dockClockInk) stage.style.setProperty('--dock-clock-ink', shown.dockClockInk);
    else stage.style.removeProperty('--dock-clock-ink');
    applyHomeFont();
    if (!sheet) renderHome(t);
    renderSheet(t, sheet);
    renderAppearance(t);
    renderFocusStatus(t);
  }

  function applyHomeFont() {
    var id = homeFont(), f = FONTS[id], primary = fontRole(id, 'primary'), ui = fontRole(id, 'ui'), metrics = fontMetrics[id];
    if (appliedFont === id && appliedFontMetrics === metrics) return;
    appliedFont = id; appliedFontMetrics = metrics;
    var values = { 'display-family': '"' + f.family + '"', 'ui-family': '"' + ui.family + '"', 'primary-family': '"' + primary.family + '"', 'display-weight': f.display, 'ui-weight': ui.weight, 'primary-weight': primary.weight, 'clock-weight': f.clock,
      'clock-shift': px(fontShift('clock', 48)), 'utility-shift': px(fontShift('ui', 28)), 'action-shift': px(fontShift('ui', 30)), 'heading-shift': px(fontShift('ui', 48)), 'full-name-shift': px(fontShift('primary', 30)), 'clock-digit': px(metrics ? metrics.digitCell : 0) };
    Object.keys(values).forEach(function (key) { homeEl.style.setProperty('--font-' + key, String(values[key])); });
  }

  function homeState(t) {
    var h = S.c.home, hs = { mode: 'browse', zone: null, i: Math.max(0, ensureSel()), u: -1, lifted: false, from: -1, arr: null, items: h.map(function (id) { return { key: id, kind: 'app', id: id }; }) };
    if (isSettingsDetail(t)) hs.zone = 'preview';
    else if (t.id === 'home') { hs.zone = t.f.zone; hs.u = t.f.u; }
    return hs;
  }

  function renderHome(t) {
    var hs = homeState(t);
    watchEl.className = 'watch' + (layoutNow() === 'watch' ? ' is-on' : '');
    if (layoutNow() === 'watch') { renderWatch(t); return; }
    renderCaption(t, hs);
    renderUtils(hs);
    if (S.c.layout === 'list') renderList(hs);
    else { photoMode = null; renderDock(hs); }
    renderAppFocusName(hs);
    renderMedia(t, hs);
  }

  function clockText() {
    var d = new Date(), h = d.getHours() % 12 || 12, m = d.getMinutes();
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  function clockHtml() {
    var text = clockText(), metrics = fontMetrics[homeFont()];
    if (!metrics || !metrics.digitCell) return text;
    return text.replace(/[0-9]/g, function (digit) { return '<span class="clock-digit">' + digit + '</span>'; });
  }
  function renderCaption(t, hs) {
    var html = '<span class="clock">' + clockHtml() + '</span>';
    if (S.c.apps !== 'icons' && hs.items[hs.i] && (S.c.layout === 'list' ? photoLabel(hs.items[hs.i].id, false).size < 88 || photoLabel(hs.items[hs.i].id, false).ellipsis : hs.zone === 'apps' && reducedDockLabel(hs.items[hs.i].id))) html += '<span class="cap-line full-name">' + esc(app(hs.items[hs.i].id).name) + '</span>';
    setHTML(caption, html);
  }

  function utilBtn(z, i, action, inner, extra, name) {
    return '<button type="button" tabindex="-1" class="u' + (extra || '') + '" data-z="' + z + '" data-i="' + i + '" data-action="' + action + '" aria-label="' + esc(name) + '"><span class="u-content">' + inner + '</span></button>';
  }
  function renderUtils(hs) {
    var html = '', style = hs.mode === 'arrange' && S.c.controls !== 'text' ? 'both' : S.c.controls;
    var iconsOnly = style === 'icons', U = utils(), focused = null;
    utilsEl.className = 'utils quiet-utils is-' + style + (hs.zone === 'util' || hs.zone === 'ctl' ? ' is-awake' : '');
    U.forEach(function (u, i) { html += utilBtn('util', i, 'util.' + u, icon(UTIL[u][1], '', true) + '<span class="u-label">' + UTIL[u][0] + '</span>', '', UTIL[u][0]); });
    setHTML(utilsEl, html);
    Array.prototype.forEach.call(utilsEl.querySelectorAll('.u'), function (b) {
      var z = b.getAttribute('data-z'), focus = hs.zone === z && hs.u === Number(b.getAttribute('data-i'));
      b.className = b.className.replace(/\s+is-focus/g, '') + (focus ? ' is-focus' : '');
      if (focus) focused = b;
    });
    renderUtilFocusLabel(iconsOnly ? focused : null);
    renderUtilityLens(focused, iconsOnly);
  }
  function renderUtilFocusLabel(button) {
    var text, key, r, sr, scale, width, x;
    if (!button) { utilFocusLabel.className = 'util-focus-label'; utilFocusKey = ''; return; }
    text = S.err ? 'Not saved. OK tries again.' : button.getAttribute('aria-label');
    key = button.getAttribute('data-action') + '|' + text + '|' + homeFont();
    if (key !== utilFocusKey) {
      utilFocusLabel.className = 'util-focus-label'; utilFocusLabel.textContent = text;
      utilFocusLabel.offsetWidth;
      utilFocusKey = key;
    }
    r = button.getBoundingClientRect(); sr = sceneEl.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    width = Math.ceil(textWidth(text, 28, 500, -.2) + 8); x = (r.left + r.width / 2 - sr.left) / scale - width / 2;
    if (S.c.layout === 'list') x = 1730 - width;
    utilFocusLabel.style.width = width + 'px'; utilFocusLabel.style.left = clamp(x, 112, 1808 - width) + 'px';
    utilFocusLabel.style.top = ((S.c.layout === 'list' ? (r.top + r.height / 2 - sr.top) / scale - 19 : 140) + fontShift('ui', 28)) + 'px';
    utilFocusLabel.className = 'util-focus-label is-on';
  }
  function renderUtilityLens(button, iconsOnly) {
    var r, label, sr, scale, x, y, width, key, el;
    if (!button || S.c.focus !== 'glass') {
      utPlates.forEach(function (plateEl) { plateEl.className = 'ph-plate ut-lens is-outgoing'; });
      utPlateKey = null;
      return;
    }
    r = button.getBoundingClientRect(); sr = sceneEl.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    y = (r.top - sr.top) / scale + 2;
    if (S.c.layout === 'list') {
      label = iconsOnly ? utilFocusLabel : button.querySelector('.u-label');
      x = (label.getBoundingClientRect().left - sr.left) / scale - 24;
      width = 1800 - x;
    } else {
      // Dock icons keep a fixed lens; the separate caption cannot overlap its neighbours.
      x = (r.left - sr.left) / scale; width = r.width / scale;
    }
    key = button.getAttribute('data-action') + '|' + x + '|' + y + '|' + width;
    if (key !== utPlateKey) {
      utPlates[utPlateIndex].className = 'ph-plate ut-lens is-outgoing';
      utPlateIndex = 1 - utPlateIndex; el = utPlates[utPlateIndex];
      el.className = 'ph-plate ut-lens is-preparing';
      el.style.width = width + 'px'; el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      fieldTransform(utFields[utPlateIndex], x, y, width, 60);
      el.offsetWidth;
      utPlateKey = key;
    }
    fieldTransform(utFields[utPlateIndex], x, y, width, 60);
    utPlates[utPlateIndex].className = 'ph-plate ut-lens is-current on-focus';
  }
  function renderAppFocusName(hs) {
    var it = hs.items[hs.i], width, x, y, placement;
    if (S.c.apps !== 'icons' || hs.mode !== 'browse' || hs.zone !== 'apps' || !it) { appFocusName.className = 'app-focus-name'; return; }
    appFocusName.textContent = app(it.id).name;
    width = Math.min(S.c.layout === 'list' ? 1056 : 1640, Math.ceil(textWidth(app(it.id).name, S.c.layout === 'list' ? 40 : 36, 500, -.6, 'primary') + 8));
    appFocusName.style.width = width + 'px';
    if (S.c.layout === 'list') {
      x = 280; placement = phFields[photoPlateIndex]._placement;
      y = placement.y + placement.height / 2 - 24;
    } else {
      x = clamp(dockAnchorCenter - width / 2, 140, 1780 - width); y = 932;
    }
    appFocusName.style.left = x + 'px'; appFocusName.style.top = (y + fontShift('primary', S.c.layout === 'list' ? 40 : 36)) + 'px';
    appFocusName.className = 'app-focus-name is-on';
  }

  /* ---------- Rows on Home: rendering ---------- */
  function mediaGeom() {
    var g;
    if (S.c.layout === 'list') return { x: 1048, width: 760, top: 236, bottom: 748, land: { w: 232, h: 131 }, poster: { w: 104, h: 156 }, gap: 16, title: 44, after: 28 };
    g = dockGeom(S.c.home.length || -1);
    return { x: 112, width: 1696, top: 236, bottom: g.y - 24, land: { w: 288, h: 162 }, poster: { w: 132, h: 198 }, gap: 16, title: 44, after: 28 };
  }
  function cardSize(row, g) { return row.layout === 'poster' ? g.poster : g.land; }
  /* Keep the focused card in view with the next one peeking, without wrapping. */
  function rowWindow(row, g) {
    var c = mediaCol(row), size = cardSize(row, g), pitch = size.w + g.gap, vis = Math.max(1, Math.floor((g.width + g.gap) / pitch)), n = row.items.length;
    c.i = clamp(c.i, 0, n - 1);
    if (c.i < c.first + (c.first > 0 ? 1 : 0)) c.first = Math.max(0, c.i - 1);
    if (vis > 2 && c.i > c.first + vis - 2) c.first = c.i - vis + 2;
    else if (vis <= 2 && c.i > c.first + vis - 1) c.first = c.i - vis + 1;
    c.first = clamp(c.first, 0, Math.max(0, n - vis));
    return { first: c.first, vis: vis, pitch: pitch, size: size };
  }
  function timeText(iso) {
    var d = new Date(iso), h, m;
    if (!iso || isNaN(d.getTime())) return '';
    h = d.getHours() % 12 || 12; m = d.getMinutes();
    return h + ':' + (m < 10 ? '0' : '') + m + (d.getHours() < 12 ? ' am' : ' pm');
  }
  function leftText(it) {
    var mins;
    if (!it.runtime || !it.position || it.position >= it.runtime) return '';
    mins = Math.max(1, Math.round((it.runtime - it.position) / 600000000));
    return mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60 ? mins % 60 + ' min ' : '') + 'left' : mins + ' min left';
  }
  function mediaMeta(it) {
    var parts = [];
    if (it.kind === 'episode') parts.push(it.subtitle, leftText(it));
    else if (it.kind === 'program') parts.push(it.subtitle, it.channel, it.airing ? 'On now' : 'Starts ' + timeText(it.start));
    else if (it.kind === 'discover') parts.push(it.year ? String(it.year) : '', it.mediaType === 'tv' ? 'Series' : 'Film', STATUS_NAMES[it.status] || '');
    else parts.push(it.year ? String(it.year) : '', leftText(it));
    return parts.filter(function (p) { return !!p; }).join(' · ');
  }
  function mediaVerb(it) {
    if (it.kind === 'discover') {
      if (it.status === 'available' && it.playId) return it.playAction === 'resume' ? 'Resume' : 'Play';
      if (it.status === 'partial' && it.playId) return 'Play or request';
      return it.status === 'none' || it.status === 'partial' ? 'Request' : 'Details';
    }
    if (it.kind === 'program') return it.airing ? 'Watch live' : 'Watch channel';
    return it.action === 'resume' ? 'Resume' : 'Play';
  }
  function mediaBadge(it) {
    if (it.kind === 'program') return '<span class="mc-badge' + (it.airing ? ' is-live' : '') + '">' + esc(it.airing ? 'Live' : timeText(it.start)) + '</span>';
    if (it.kind === 'discover' && it.status !== 'none') return '<span class="mc-badge is-' + it.status + '">' + esc(STATUS_NAMES[it.status]) + '</span>';
    return '';
  }
  function mediaCardHtml(it, row) {
    var bar = it.progress !== null && it.progress > 0 && it.progress < 100 ? '<span class="mc-progress"><span style="width:' + it.progress.toFixed(1) + '%"></span></span>' : '';
    return '<span class="mc-art"><img alt=""><span class="mc-fallback">' + esc(it.title) + '</span></span>' + mediaBadge(it) + bar;
  }
  function renderMedia(t, hs) {
    var on = mediaOn() && hs.mode === 'browse', focus = on && hs.zone === 'media' && t.id === 'home', g, y = 0, ys = [], off, viewH, total, R, info = '', it;
    stage.className = stage.className.replace(/\s+has-media/g, '') + (on ? ' has-media' : '');
    mediaScrim.className = 'media-scrim' + (on ? ' is-on' : '');
    if (!on) { mediaEl.className = 'media'; setHTML(mediaInfo, ''); return; }
    g = mediaGeom(); viewH = Math.max(120, g.bottom - g.top);
    R = clamp(focus ? t.f.mr : M.row, 0, M.rows.length - 1);
    M.rows.forEach(function (row) { ys.push(y); y += g.title + cardSize(row, g).h + g.after; });
    total = y - g.after;
    // The focused row starts the view. Near the end, start at the first whole row that lets the rest fit.
    off = ys[R];
    if (total - off < viewH) ys.some(function (rowY) { if (rowY < total - viewH) return false; off = Math.min(off, rowY); return true; });
    off = Math.max(0, off);
    mediaEl.className = 'media is-on' + (focus ? ' is-focus' : '') + (S.c.layout === 'list' ? ' is-list' : ' is-dock');
    mediaEl.style.left = g.x + 'px'; mediaEl.style.width = g.width + 'px';
    mediaView.style.top = g.top + 'px'; mediaView.style.height = viewH + 'px';
    mediaView.className = 'media-view' + (off > 0 ? ' more-before' : '') + (total - off > viewH ? ' more-after' : '');
    mediaRowsEl.style.transform = 'translate3d(0,' + (-off) + 'px,0)';
    keyed(mediaRowsEl, M.rows.map(function (row, r) { return { key: row.id, row: row, r: r }; }), function (el, entry) {
      var row = entry.row, r = entry.r, win = rowWindow(row, g), size = win.size, rowVisible = ys[r] + g.title + size.h > off && ys[r] < off + viewH, track;
      if (el._frame !== row.layout) { el.innerHTML = '<h3 class="mr-title"></h3><div class="mr-track"></div>'; el._frame = row.layout; }
      el.className = 'mr mr-' + row.layout + (focus && r === R ? ' is-active' : '');
      el.style.transform = 'translate3d(0,' + ys[r] + 'px,0)';
      setHTML(el.firstChild, esc(row.title));
      track = el.lastChild;
      track.style.top = g.title + 'px'; track.style.height = size.h + 'px';
      track.style.transform = 'translate3d(' + (-win.first * win.pitch) + 'px,0,0)';
      keyed(track, row.items.map(function (item, i) { return { key: item.id, item: item, i: i }; }), function (card, ce) {
        var item = ce.item, i = ce.i, isFocus = focus && r === R && i === mediaCol(row).i, near = rowVisible && i >= win.first - 1 && i <= win.first + win.vis + 1;
        var src = near ? Media.image(row.layout === 'poster' ? item.poster || item.landscape : item.landscape || item.poster, row.layout === 'poster' ? size.w * 2 : size.w * 2) : '', img;
        setContent(card, [item.id, item.status, item.progress, item.airing, item.title, row.layout].join('|'), function () { return mediaCardHtml(item, row); });
        img = card.querySelector('img');
        if (src && img._src !== src) {
          img._src = src; img.className = '';
          img.onload = function () { this.className = 'is-loaded'; };
          img.onerror = function () { this.className = 'is-missing'; };
          img.src = src;
        }
        card.className = 'mc' + (isFocus ? ' is-focus' : '') + (img.className === 'is-loaded' ? ' has-art' : '');
        card.style.width = size.w + 'px'; card.style.height = size.h + 'px';
        card.style.transform = 'translate3d(' + (i * win.pitch) + 'px,0,0)';
        // Inherit when shown, so Home's hidden state under a sheet still applies.
        card.style.visibility = i >= win.first - 1 && i <= win.first + win.vis ? '' : 'hidden';
        card.setAttribute('role', 'button'); card.setAttribute('aria-label', item.title);
        attrs(card, 'media', r * 1000 + i, 'media.' + row.id + '.' + item.id);
      });
    });
    if (focus) {
      it = M.rows[R].items[mediaCol(M.rows[R]).i];
      info = '<p class="mi-title">' + esc(it.title) + '</p><p class="mi-meta"><span>' + esc(mediaMeta(it)) + '</span>'
        + '<span class="mi-ok"><span class="remote-key">OK</span><span>' + esc(mediaVerb(it)) + '</span></span></p>';
    }
    setHTML(mediaInfo, info);
  }

  /* ---------- Watch layout ----------
     Rail (Art Mode, All apps, Settings) and a featured title at the top, then bands of rows:
     paired rows share a band side by side, and the Home apps come last. While a row has focus,
     the top area describes the focused title instead of the featured one. */
  var W_RAIL = ['art', 'apps', 'settings'], W_ZONES = ['wrail', 'whero', 'wband', 'wapps'];
  var WG = { x: 72, width: 1776, half: 864, gap: 48, hero: 452, slot: 336, title: 42, after: 22, labels: 60, bottom: 924,
    tile: { w: 240, h: 135, pitch: 254 }, card: { w: 256, h: 144, pitch: 272 }, app: { w: 168, h: 96, pitch: 176 } };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* Seerr rows are artwork only, as tiles; library and Live TV rows carry a title and detail line. */
  function wStyle(row) { return row.id.indexOf('seerr-') === 0 ? 'tile' : 'card'; }
  /* One row per band. Continue Watching and Next Up merge into a single Continue Watching row:
     titles in progress first, then the next episodes. */
  function wBands() {
    var rows = [], merged = null;
    M.rows.forEach(function (row) {
      if (row.id !== 'continue' && row.id !== 'nextup') { rows.push(row); return; }
      if (merged) { merged.items = merged.items.concat(row.items.filter(function (it) { return !merged.items.some(function (m) { return m.id === it.id; }); })); return; }
      merged = { id: 'continue', title: 'Continue Watching', layout: row.layout, items: row.items.slice() };
      rows.push(merged);
    });
    if (merged) {
      // Whichever came first in the TV's order, titles in progress lead.
      merged.items = merged.items.filter(function (it) { return it.action === 'resume'; }).concat(merged.items.filter(function (it) { return it.action !== 'resume'; }));
    }
    return rows.map(function (row) {
      var st = wStyle(row);
      return { key: row.id, kind: 'rows', rows: [row], h: WG.title + WG.after + WG[st].h + (st === 'card' ? WG.labels : 0) };
    });
  }
  function wWindow(c, n, size, width) {
    var vis = Math.max(1, Math.floor((width - size.w) / size.pitch) + 1);
    c.i = clamp(c.i, 0, Math.max(0, n - 1));
    if (c.i < c.first + (c.first > 0 ? 1 : 0)) c.first = Math.max(0, c.i - 1);
    if (vis > 2 && c.i > c.first + vis - 2) c.first = c.i - vis + 2;
    else if (vis <= 2 && c.i > c.first + vis - 1) c.first = c.i - vis + 1;
    c.first = clamp(c.first, 0, Math.max(0, n - vis));
    return { first: c.first, vis: vis };
  }
  function greeting() { var h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  function wDateText() { var d = new Date(); return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  var weatherTimer = 0;
  function cleanWeather(data) { var w = data && data.Weather; if (!w || typeof w.Latitude !== 'number' || typeof w.Longitude !== 'number') return null; return { lat: w.Latitude, lon: w.Longitude, f: !!w.Fahrenheit }; }
  function weatherUrl(c) { return 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(c.lat) + '&longitude=' + encodeURIComponent(c.lon) + '&current=temperature_2m,weather_code,is_day&temperature_unit=' + (c.f ? 'fahrenheit' : 'celsius'); }
  function weatherIcon(code, day) {
    if (code === 0) return day ? 'wx-sun' : 'wx-moon';
    if (code === 1 || code === 2) return day ? 'wx-partly' : 'wx-cloud';
    if (code === 3) return 'wx-cloud';
    if (code === 45 || code === 48) return 'wx-fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'wx-snow';
    if (code >= 95) return 'wx-storm';
    if (code >= 51 && code <= 82) return 'wx-rain';
    return 'wx-cloud';
  }
  function applyWeather(w) { M.weather = w; if (layoutNow() === 'watch') render(); }
  function refreshWeather() {
    clearTimeout(weatherTimer); weatherTimer = 0;
    var c = M.weatherCfg;
    if (!c) { if (M.weather) applyWeather(null); return; }
    if (document.hidden) return;
    var xhr = new XMLHttpRequest();
    try { xhr.open('GET', weatherUrl(c), true); } catch (e) { return; }
    xhr.timeout = 10000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { var cur = JSON.parse(xhr.responseText).current;
          if (cur && typeof cur.temperature_2m === 'number') applyWeather({ temp: Math.round(cur.temperature_2m), code: cur.weather_code | 0, day: cur.is_day !== 0 });
        } catch (e) {}
      }
    };
    try { xhr.send(); } catch (e) {}
    weatherTimer = setTimeout(refreshWeather, 1800000);
  }
  function wTop(f) { if (M.featured.length) f.zone = 'whero'; else if (wBands().length) wEnterBand(f, wBands(), 0, 0); else wRail(f); }
  function wDock(f) { var n = dockItems().length; if (n) { f.zone = 'wapps'; f.a = clamp(f.a || 0, 0, n - 1); } }
  /* The Watch dock: Home apps, then the TV's HDMI inputs. */
  function dockItems() {
    return S.c.home.map(function (id) { return { kind: 'app', id: id }; }).concat(shownInputs().map(function (inp) { return { kind: 'input', id: 'hdmi' + inp.number, input: inp }; }));
  }
  function shownInputs() { return INPUTS.filter(function (inp) { return (S.c.hiddenInputs || []).indexOf(inp.number) < 0; }); }
  /* Known devices get their own icon, matched by the name the TV gives the input. */
  function inputIcon(inp) {
    var n = inp.name || '';
    if (/sound ?bar|q-?series|\bhw-?q|\bq\d{3,4}\b|samsung audio|\baudio\b|\barc\b/i.test(n)) return 'soundbar';
    if (/switch|nintendo|xbox|playstation|\bps[345]\b|console|steam ?deck|game/i.test(n)) return 'gamepad';
    return 'hdmi';
  }
  function inputName(inp) { return inp.name || 'HDMI ' + inp.number; }
  function refreshInputs() {
    FrameDevice.inputs(function (err, list) {
      var next = err || !Array.isArray(list) ? [] : list.slice(0, 6);
      if (JSON.stringify(next) === JSON.stringify(INPUTS)) return;
      INPUTS = next; norm(); render();
    });
  }
  function openInput(inp) {
    if (busy) return;
    S.press = null;
    perform(inputName(inp), function (done) { FrameDevice.input(inp.number, done); });
  }
  function dockOk(item) {
    if (!item) return;
    if (item.kind === 'input') openInput(item.input);
    else { setSel(item.id); launch(item.id); }
  }
  function wRail(f) { f.zone = 'wrail'; f.u = clamp(S.lastUtil, 0, W_RAIL.length - 1); }
  function wEnterBand(f, bands, b, s) {
    f.b = b; f.zone = 'wband'; f.s = clamp(s || 0, 0, bands[b].rows.length - 1);
  }
  function wShow(i) { W.i = clamp(i, 0, Math.max(0, M.featured.length - 1)); }
  function watchNorm(t) {
    var f = t.f, bands = wBands();
    if (W_ZONES.indexOf(f.zone) < 0 || (f.zone === 'whero' && !M.featured.length)) wTop(f);
    if (f.zone === 'wband') {
      if (!bands.length) { wTop(f); if (f.zone === 'wband') wDock(f); }
      else { f.b = clamp(f.b || 0, 0, bands.length - 1); f.s = clamp(f.s || 0, 0, bands[f.b].rows.length - 1); }
    }
    if (f.zone === 'wapps') { if (dockItems().length) f.a = clamp(f.a || 0, 0, dockItems().length - 1); else wTop(f); }
    if (f.zone === 'wrail') f.u = clamp(f.u || 0, 0, W_RAIL.length - 1);
    W.i = clamp(W.i, 0, Math.max(0, M.featured.length - 1));
  }
  function watchKey(t, k) {
    var f = t.f, bands = wBands(), band, row, c;
    if (f.zone === 'wrail') {
      if (k === 'up' && f.u > 0) f.u--;
      else if (k === 'down' && f.u < W_RAIL.length - 1) f.u++;
      else if (k === 'down') wDock(f);
      else if (k === 'right' || k === 'back') wTop(f);
      else if (k === 'ok') { S.lastUtil = f.u; utilAction(W_RAIL[f.u]); return; }
      S.lastUtil = f.u;
      return;
    }
    if (f.zone === 'whero') {
      // Left and Right step through the featured titles; Left from the first one reaches the rail.
      if (k === 'left') { if (W.i > 0) wShow(W.i - 1); else wRail(f); }
      else if (k === 'right') wShow((W.i + 1) % M.featured.length);
      else if (k === 'down') { if (bands.length) wEnterBand(f, bands, 0, 0); else wDock(f); }
      else if (k === 'back') openMessage('leave');
      else if (k === 'ok') mediaOk(M.featured[W.i]);
      return;
    }
    if (f.zone === 'wapps') {
      if (k === 'left') { if (f.a > 0) f.a--; else wRail(f); }
      else if (k === 'right' && f.a < dockItems().length - 1) f.a++;
      // Up returns to the band last used, or the top when there are no rows.
      else if (k === 'up') { if (bands.length) wEnterBand(f, bands, clamp(W.band, 0, bands.length - 1), W.side); else if (M.featured.length) f.zone = 'whero'; else wRail(f); }
      else if (k === 'back') wTop(f);
      else if (k === 'ok') dockOk(dockItems()[f.a]);
      return;
    }
    band = bands[f.b]; row = band.rows[f.s]; c = mediaCol(row);
    c.i = clamp(c.i, 0, row.items.length - 1);
    if (k === 'left') { if (c.i > 0) c.i--; else if (f.s > 0) f.s--; else wRail(f); }
    else if (k === 'right') { if (c.i < row.items.length - 1) c.i++; else if (f.s < band.rows.length - 1) f.s++; }
    else if (k === 'up') { if (f.b > 0) wEnterBand(f, bands, f.b - 1, f.s); else wTop(f); }
    else if (k === 'down') { if (f.b < bands.length - 1) wEnterBand(f, bands, f.b + 1, f.s); else { W.band = f.b; W.side = f.s; wDock(f); } }
    else if (k === 'back') wTop(f);
    else if (k === 'ok') mediaOk(row.items[c.i]);
  }
  function watchPoint(t, z, i) {
    var f = t.f, bands = wBands(), band;
    if (z === 'wrail') { f.zone = 'wrail'; f.u = i; S.lastUtil = i; }
    else if (z === 'whero') f.zone = 'whero';
    else if (z === 'wdot') { f.zone = 'whero'; wShow(i); return; }
    else if (z === 'wcard') {
      band = bands[Math.floor(i / 10000)];
      if (!band || !band.rows[Math.floor(i / 1000) % 10]) return;
      f.zone = 'wband'; f.b = Math.floor(i / 10000); f.s = Math.floor(i / 1000) % 10; mediaCol(band.rows[f.s]).i = i % 1000;
    } else if (z === 'wapp') { f.zone = 'wapps'; f.a = i; }
    else return;
    watchKey(t, 'ok');
  }
  /* Featured titles change every few seconds while Home is in view, wherever focus is; while a card has
     focus only the background changes, and the top keeps describing the card. */
  function syncWatch() {
    var t = top();
    clearTimeout(W.timer); W.timer = 0;
    if (document.hidden || layoutNow() !== 'watch' || t.id !== 'home' || M.featured.length < 2) return;
    W.timer = setTimeout(function () { W.timer = 0; wShow((W.i + 1) % M.featured.length); render(); syncWatch(); }, QA.featureMs);
  }
  function wBackdrop(src) {
    var next, cur;
    if (W.src === src) return;
    W.src = src; cur = wBacks[W.back]; next = wBacks[1 - W.back];
    if (!src) { cur.className = 'w-backdrop'; next.className = 'w-backdrop'; wSetAccent(''); return; }
    wProbeAccent(src);
    function show() { if (W.src !== src) return; W.back = 1 - W.back; next.className = 'w-backdrop is-on'; cur.className = 'w-backdrop'; }
    next.onload = show;
    next.onerror = function () { if (W.src === src) cur.className = 'w-backdrop'; };
    if (next._src === src && next.complete && next.naturalWidth) show();
    else { next._src = src; next.src = src; }
  }
  var wAccentCanvas = null, wAccentSrc = '';
  function wSetAccent(rgb) { if (rgb) watchEl.style.setProperty('--w-accent', rgb); else { watchEl.style.removeProperty('--w-accent'); wAccentSrc = ''; } }
  function wProbeAccent(src) {
    if (!src || src === wAccentSrc) return;
    var probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = function () {
      if (W.src !== src) return;
      try {
        if (!wAccentCanvas) wAccentCanvas = document.createElement('canvas');
        var cv = wAccentCanvas, w = 24, h = 14, ctx;
        cv.width = w; cv.height = h; ctx = cv.getContext('2d');
        ctx.drawImage(probe, 0, 0, w, h);
        var rgb = wVibrant(ctx.getImageData(0, 0, w, h).data);
        if (rgb) { wAccentSrc = src; wSetAccent(rgb); }
      } catch (e) {}
    };
    probe.src = src;
  }
  function wVibrant(d) {
    var i, r, g, b, mx, mn, l, sa, score, best = null, bestScore = -1, sr = 0, sg = 0, sb = 0, n = 0;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      r = d[i]; g = d[i + 1]; b = d[i + 2];
      mx = Math.max(r, g, b); mn = Math.min(r, g, b); l = (mx + mn) / 510;
      sa = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
      sr += r; sg += g; sb += b; n++;
      score = sa * (1 - Math.abs(l - 0.5));
      if (l > 0.12 && l < 0.92 && score > bestScore) { bestScore = score; best = [r, g, b]; }
    }
    if (!n) return '';
    if (bestScore < 0.1) best = [sr / n, sg / n, sb / n];
    mx = Math.max(best[0], best[1], best[2]);
    if (mx > 0 && mx < 120) { var k = 120 / mx; best = [best[0] * k, best[1] * k, best[2] * k]; }
    return 'rgb(' + Math.min(255, Math.round(best[0])) + ',' + Math.min(255, Math.round(best[1])) + ',' + Math.min(255, Math.round(best[2])) + ')';
  }
  function wPreload(src) { if (src && W.pre !== src) { W.pre = src; W.preImg = new Image(); W.preImg.src = src; } }
  /* A programme's landscape image may be its channel logo, so games use only real background art. */
  function wArtSrc(it) { return Media.image(it.kind === 'program' ? it.backdrop : it.backdrop || it.landscape, 1920); }
  function renderWatchRail(zone, live) {
    setHTML(wRailEl, W_RAIL.map(function (u, i) {
      var on = live && zone === 'wrail' && i === clamp(top().f.u, 0, W_RAIL.length - 1);
      return '<button type="button" tabindex="-1" class="wr-btn' + (on ? ' is-focus' : '') + '" data-z="wrail" data-i="' + i + '" data-action="util.' + u + '" aria-label="' + esc(UTIL[u][0]) + '">'
        + icon(UTIL[u][1]) + '<span class="wr-label">' + esc(UTIL[u][0]) + '</span></button>';
    }).join(''));
  }
  function renderWatchHero(zone, live, it, inRow, shift) {
    var meta, verb, head, art = '', html;
    wHeroEl.className = 'w-hero' + (inRow ? ' is-browsing' : '') + (zone === 'wrail' ? ' is-rail' : '');
    if (!it) { setHTML(wInfoEl, '<p class="wi-greet">' + esc(greeting()) + '</p>'); setHTML(wArtEl, ''); setHTML(wDotsEl, ''); wBackdrop(''); return; }
    if (inRow) {
      meta = mediaMeta(it);
      html = '<p class="wi-greet">' + esc(greeting()) + '</p><h2 class="wi-head is-title">' + esc(it.title) + '</h2>'
        + (it.overview ? '<p class="wi-body">' + esc(it.overview) + '</p>' : '')
        + '<div class="wi-act"><span class="wi-hint"><span class="remote-key">OK</span><span>' + esc(mediaVerb(it)) + '</span></span>' + (meta ? '<span class="wi-meta">' + esc(meta) + '</span>' : '') + '</div>';
    } else {
      head = it.tagline || it.title; verb = mediaVerb(it);
      meta = [REASON_NAMES[it.reason] || '', it.kind === 'program' ? [it.channel, it.airing ? 'On now' : 'Starts ' + timeText(it.start)].join(' · ') : it.meta || mediaMeta(it)].filter(function (p) { return !!p; }).join(' · ');
      html = '<p class="wi-greet">' + esc(greeting()) + '</p><h2 class="wi-head">' + esc(head) + '</h2>'
        + (it.overview ? '<p class="wi-body">' + esc(it.overview) + '</p>' : '')
        + '<div class="wi-act"><span class="wi-btn' + (live && zone === 'whero' ? ' is-focus' : '') + '" role="button" data-z="whero" data-i="0" data-action="watch.featured.' + esc(it.id) + '" aria-label="' + esc(verb + ' ' + it.title) + '">' + esc(verb) + '</span>'
        + (meta ? '<span class="wi-meta">' + esc(meta) + '</span>' : '') + '</div>';
      if (it.logo) art = '<img class="wa-logo" alt="' + esc(it.title) + '" src="' + esc(Media.image(it.logo, 640)) + '">';
      else if (it.tagline) art = '<span class="wa-title">' + esc(it.title) + '</span>';
    }
    setHTML(wInfoEl, html);
    setHTML(wArtEl, art);
    Array.prototype.forEach.call(wArtEl.querySelectorAll('img'), function (img) {
      if (img.complete && img.naturalWidth) img.className = 'wa-logo is-loaded';
      else { img.onload = function () { this.className = 'wa-logo is-loaded'; }; img.onerror = function () { this.style.display = 'none'; }; }
    });
    setHTML(wDotsEl, M.featured.length > 1 ? M.featured.map(function (f, i) { return '<span class="wd' + (i === W.i ? ' is-on' : '') + '" data-z="wdot" data-i="' + i + '" aria-hidden="true"></span>'; }).join('') : '');
  }
  function wCardHtml(it, row) {
    var style = wStyle(row), sub = mediaMeta(it);
    return mediaCardHtml(it, row) + (style === 'card' ? '<span class="wc-label"><span class="wc-title">' + esc(it.title) + '</span>' + (sub ? '<span class="wc-sub">' + esc(sub) + '</span>' : '') + '</span>' : '');
  }
  function renderWatchRow(el, row, b, s, width, focusRow, visible) {
    var style = wStyle(row), size = WG[style], c = mediaCol(row), win = wWindow(c, row.items.length, size, width), clip, trackEl;
    if (!el._frame) { el.innerHTML = '<h3 class="wr-title"></h3><div class="wr-clip"><div class="wr-track"></div></div>'; el._frame = 1; }
    el.className = 'wrow wrow-' + style + (focusRow ? ' is-active' : '');
    el.style.transform = 'translate3d(' + (s * (WG.half + WG.gap)) + 'px,0,0)';
    setHTML(el.firstChild, esc(row.title));
    clip = el.lastChild; trackEl = clip.firstChild;
    clip.style.width = (width + 32) + 'px'; clip.style.height = (size.h + (style === 'card' ? WG.labels : 0) + 32) + 'px';
    trackEl.style.transform = 'translate3d(' + (-win.first * size.pitch) + 'px,0,0)';
    keyed(trackEl, row.items.map(function (item, i) { return { key: item.id, item: item, i: i }; }), function (card, ce) {
      var item = ce.item, i = ce.i, isFocus = focusRow && i === c.i, near = visible && i >= win.first - 1 && i <= win.first + win.vis + 1, img;
      var src = near ? Media.image(style === 'tile' ? item.landscape || item.poster : item.landscape || item.poster, Math.round(size.w * 1.5)) : '';
      setContent(card, [item.id, item.status, item.progress, item.airing, item.title, item.subtitle, style].join('|'), function () { return wCardHtml(item, row); });
      img = card.querySelector('img');
      if (src && img._src !== src) {
        img._src = src; img.className = '';
        img.onload = function () { this.className = 'is-loaded'; };
        img.onerror = function () { this.className = 'is-missing'; };
        img.src = src;
      }
      card.className = 'mc wc' + (isFocus ? ' is-focus' : '');
      card.style.width = size.w + 'px'; card.style.height = size.h + 'px';
      card.style.transform = 'translate3d(' + (i * size.pitch) + 'px,0,0)';
      card.style.visibility = i >= win.first - 1 && i <= win.first + win.vis ? '' : 'hidden';
      card.setAttribute('role', 'button'); card.setAttribute('aria-label', item.title);
      attrs(card, 'wcard', b * 10000 + s * 1000 + i, 'media.' + row.id + '.' + item.id);
    });
  }
  /* The Home apps, always at the bottom: a smaller version of the Dock that follows App display. */
  function renderWatchDock(zone) {
    var items = dockItems(), n = items.length, f = top().f, inner = WG.width - 24;
    // Tiles narrow when apps and inputs together would overflow the screen.
    var pitch = Math.min(WG.app.pitch, Math.floor((inner + 8) / Math.max(1, n))), w = pitch - 8, width = n * pitch - 8 + 24;
    wDockEl.className = 'w-dock a-' + S.c.apps + (n ? ' is-on' : '') + (zone === 'wapps' ? ' is-active' : '');
    wDockEl.style.width = width + 'px'; wDockEl.style.left = Math.round((1920 - width) / 2) + 'px';
    keyed(wDockEl, items.map(function (item, i) { return { key: item.kind + ':' + item.id, item: item, i: i }; }), function (tile, te) {
      var item = te.item, a = item.kind === 'app' ? app(item.id) : null, name = a ? a.name : item.kind === 'input' ? inputName(item.input) : item.id, markW = Math.min(112, w - 16);
      setContent(tile, item.kind + '|' + item.id + '|' + name + '|' + (item.input ? inputIcon(item.input) : '') + '|' + S.c.apps + '|' + S.c.bg + '|' + markW, function () {
        // Inputs always carry their name: their icons are all alike.
        if (item.kind === 'input') return '<span class="wapp-mark wapp-input">' + icon(inputIcon(item.input)) + '</span><span class="wapp-name">' + esc(name) + '</span>';
        return (S.c.apps !== 'text' && a ? '<span class="wapp-mark">' + appMark(a, markW, S.c.apps === 'icons' ? 56 : 44, S.c.apps === 'icons' ? 52 : 40) + '</span>' : '')
          + (S.c.apps !== 'icons' ? '<span class="wapp-name">' + esc(name) + '</span>' : '');
      });
      tile.className = 'wapp' + (item.kind === 'input' ? ' is-input' + (item.input.connected ? '' : ' is-off') : '') + (zone === 'wapps' && te.i === f.a ? ' is-focus' : '');
      tile.style.width = w + 'px';
      tile.style.transform = 'translate3d(' + (12 + te.i * pitch) + 'px,0,0)';
      tile.setAttribute('role', 'button'); tile.setAttribute('aria-label', item.kind === 'input' && !item.input.connected ? name + ', no signal' : name);
      attrs(tile, 'wapp', te.i, item.kind === 'input' ? 'home.input.' + item.input.number : 'home.app.' + item.id);
    });
  }

  function renderWatch(t) {
    var live = t.id === 'home', f = t.f, zone = live ? f.zone : '', bands = wBands(), ys = [], y = 0, shift = 0, fb = -1, row, focusItem = null, it;
    bands.forEach(function (band) { ys.push(y); y += band.h; });
    renderWatchDock(zone);
    if (zone === 'wband') {
      W.band = f.b; W.side = f.s;
      fb = clamp(f.b, 0, bands.length - 1);
      // A band that doesn't fit below the featured area moves up to a slot under a compact title.
      if (WG.hero + ys[fb] + bands[fb].h - WG.after > WG.bottom) shift = WG.hero + ys[fb] - WG.slot;
      if (zone === 'wband') { row = bands[fb].rows[f.s]; focusItem = row ? row.items[mediaCol(row).i] : null; }
    }
    it = focusItem || M.featured[W.i] || null;
    setHTML(wTopEl, '<span>' + esc(wDateText()) + '</span><span class="wt-time">' + esc(clockText() + (new Date().getHours() < 12 ? ' AM' : ' PM')) + '</span>' + (M.weather ? '<span class="wt-wx">' + icon(weatherIcon(M.weather.code, M.weather.day)) + '<span class="wt-temp">' + M.weather.temp + '\u00b0</span></span>' : ''));
    watchEl.className = 'watch is-on' + (focusItem ? ' is-browsing' : '') + (shift > 0 ? ' is-scrolled' : '');
    renderWatchRail(zone, live);
    renderWatchHero(zone, live, it, !!focusItem, shift);
    if (M.featured.length) {
      wBackdrop(wArtSrc(M.featured[W.i]));
      if (M.featured.length > 1) wPreload(wArtSrc(M.featured[(W.i + 1) % M.featured.length]));
    } else wBackdrop('');
    wBandsEl.style.transform = 'translate3d(0,' + (WG.hero - shift) + 'px,0)';
    keyed(wBandsEl, bands.map(function (band, b) { return { key: band.key, band: band, b: b }; }), function (el, e) {
      var band = e.band, b = e.b, bandTop = WG.hero - shift + ys[b], visible = bandTop < 1080 && bandTop + band.h > 0;
      el.className = 'wband' + (b === fb ? ' is-active' : '') + (shift > 0 && b < fb ? ' is-past' : '');
      el.style.transform = 'translate3d(0,' + ys[b] + 'px,0)';
      keyed(el, band.rows.map(function (r, s) { return { key: r.id, row: r, s: s }; }), function (rel, re) {
        renderWatchRow(rel, re.row, b, re.s, band.rows.length > 1 ? WG.half : WG.width, zone === 'wband' && b === fb && f.s === re.s, visible);
      });
    });
  }

  function dockGeom(n) {
    var m = DOCK_MODES[S.c.apps], vis = Math.max(1, Math.min(5, n)), shelfW = vis * m.pitch - 8, w = shelfW + 32;
    var broad = S.geom === 'broad' && n > 5;
    if (n < 0) { w = 912; shelfW = 880; }
    else if (broad) { w = 1728; shelfW = 1696; }
    return { x: Math.round((1920 - w) / 2), y: 908 - m.th - 32, h: m.th + 32, w: w, shelf: shelfW, vis: vis, broad: broad, empty: n < 0, tw: m.tw, th: m.th, pitch: m.pitch };
  }
  /* Five centred: the window moves one tile when focus passes an edge. Broad: keep a
     148px glimpse of the neighbour, as the current dock does. */
  function dockOffset(n, i, g) {
    var off, left, first, glimpse = g.tw / 2;
    if (g.broad) {
      off = scroll.off * g.pitch; left = i * g.pitch;
      if (left - off < (i > 0 ? glimpse : 0)) off = left - (i > 0 ? glimpse : 0);
      if (left + g.tw - off > g.shelf - (i < n - 1 ? glimpse : 0)) off = left + g.tw - g.shelf + (i < n - 1 ? glimpse : 0);
      off = clamp(off, 0, Math.max(0, n * g.pitch - 8 - g.shelf));
      if (!S.reflow) { scroll.off = off / g.pitch; scroll.first = Math.round(scroll.off); }
      return off;
    }
    first = clamp(scroll.first, 0, Math.max(0, n - g.vis));
    if (i < first) first = i;
    if (i > first + g.vis - 1) first = i - g.vis + 1;
    if (!S.reflow) { scroll.first = first; scroll.off = first; }
    return first * g.pitch;
  }
  function dockTileHtml(it, full) {
    var a, body;
    if (it.kind === 'add') return '<span class="add">' + icon('plus') + '</span><span class="label">' + (full ? 'Home is full' : 'Add app') + '</span>';
    a = app(it.id);
    body = S.c.apps === 'text' ? '' : appMark(a, S.c.apps === 'icons' ? 136 : 120, S.c.apps === 'icons' ? 88 : 72, S.c.apps === 'icons' ? 72 : 58);
    return body + (S.c.apps === 'icons' ? '' : '<span class="label" style="font-size:' + dockLabelSize(a.id) + 'px;top:' + ((S.c.apps === 'text' ? 28 : 128) + fontShift('primary', dockLabelSize(a.id))) + 'px"><span class="label-ink">' + esc(a.name) + '</span></span>') + '<span class="nudge nudge-l">' + icon('left') + '</span><span class="nudge nudge-r">' + icon('right') + '</span>';
  }
  /* A wide label can reach the shelf before its icon. Check the rendered icon box,
     including during the track's 180ms transition, so both disappear together. */
  function syncDockEdges() {
    var broad = layoutNow() === 'dock' && S.geom === 'broad', clip = shelf.getBoundingClientRect(), changes = [];
    Array.prototype.forEach.call(track.querySelectorAll('.tile'), function (tile) {
      var content = tile.querySelector(S.c.apps === 'text' ? '.label-ink' : '.mark'), r = content ? content.getBoundingClientRect() : null;
      var outside = broad && r && (r.right <= clip.left || r.left >= clip.right);
      var cls = tile.className.replace(/\s+is-outside-icon/g, '') + (outside ? ' is-outside-icon' : '');
      if (tile.className !== cls) changes.push({ tile: tile, cls: cls });
    });
    changes.forEach(function (change) { change.tile.className = change.cls; });
  }
  function trackDockEdges() {
    dockEdgeFrame = 0;
    if (layoutNow() !== 'dock' || S.geom !== 'broad') return;
    syncDockEdges();
    if (Date.now() < dockEdgeUntil) dockEdgeFrame = window.requestAnimationFrame(trackDockEdges);
  }

  function renderDock(hs) {
    var items = hs.items, n = items.length, empty = hs.mode !== 'arrange' && !n, g = dockGeom(empty ? -1 : n);
    var anchor = clamp(hs.i, 0, Math.max(0, n - 1)), off = empty ? 0 : dockOffset(n, anchor, g);
    var full = false, ns = n;
    var tileFocus = hs.zone === 'apps' || hs.zone === 'tiles', tileSel = hs.zone === 'util' || hs.zone === 'act' || hs.zone === 'ctl' || hs.zone === 'preview' || hs.zone === 'media';
    var focusItem = items[anchor], s, ax, label, width;

    dock.className = 'dock' + (empty ? ' is-empty' : '');
    dock.style.left = g.x + 'px'; dock.style.top = g.y + 'px'; dock.style.width = g.w + 'px'; dock.style.height = g.h + 'px';
    dock.style.setProperty('--tile-w', g.tw + 'px'); dock.style.setProperty('--tile-h', g.th + 'px'); dock.style.setProperty('--dock-h', g.h + 'px');
    dock.style.setProperty('--nudge-top', ((g.th - 48) / 2) + 'px');
    dockAnchorCenter = g.x + 16 + anchor * g.pitch - off + g.tw / 2;
    IMG.mat.style.left = (-g.x) + 'px'; IMG.mat.style.top = (-g.y) + 'px';
    IMG.mat.style.transformOrigin = '960px ' + (g.y + g.h / 2) + 'px';
    matScrim.style.left = (-g.x) + 'px'; matScrim.style.top = (SCRIM_Y - g.y) + 'px';
    matScrim.style.transformOrigin = '960px ' + (g.y + g.h / 2 - SCRIM_Y) + 'px';
    shelf.style.width = g.shelf + 'px';
    shelf.className = 'shelf' + (g.broad && off > 0 ? ' fade-l' : '') + (g.broad && off + g.shelf < n * g.pitch - 8 ? ' fade-r' : '');

    keyed(track, empty ? [] : items, function (el, it, i) {
      var a = it.id ? app(it.id) : null, left = i * g.pitch, focus = tileFocus && i === anchor, sel = tileSel && i === anchor;
      var lifted = hs.lifted && i === anchor, partial = g.broad && (left - off < -1 || left + g.tw - off > g.shelf + 1);
      setContent(el, it.kind + '|' + (it.id || '') + '|' + (it.id ? dockLabelSize(it.id) : full) + '|' + S.c.bg + '|' + S.c.apps + '|' + homeFont(), function () { return '<span class="tile-content">' + dockTileHtml(it, full) + '</span>'; });
      el.className = 'tile k-' + it.kind + (focus ? ' is-focus' : '') + (sel ? ' is-sel' : '') + (lifted ? ' is-lifted' : '') + (partial ? ' is-partial' : '')
        + (a && !a.mark ? ' is-text' : '') + (it.kind === 'add' && full ? ' is-full' : '') + (it.kind === 'app' && S.press === it.id ? ' is-press' : '')
        + (lifted && i === 0 ? ' no-l' : '') + (lifted && i >= ns - 1 ? ' no-r' : '');
      el.style.transform = 'translate3d(' + left + 'px,0,0)';
      el.setAttribute('role', 'button');
      if (a) el.setAttribute('aria-label', a.name);
      if (hs.mode === 'arrange') attrs(el, 'tile', i, 'arrange.' + (it.kind === 'add' ? 'add' : (it.kind === 'ph' ? 'placeholder.' : 'tile.') + it.id));
      else attrs(el, 'app', i, 'home.app.' + it.id);
    });
    track.style.transform = 'translate3d(' + (-off) + 'px,0,0)';
    syncDockEdges();
    if (g.broad) {
      dockEdgeUntil = Date.now() + 220;
      if (!dockEdgeFrame) dockEdgeFrame = window.requestAnimationFrame(trackDockEdges);
    }
    plate.className = 'plate' + (!n || empty || hs.zone === null ? '' : hs.lifted ? ' on-lift' : tileFocus ? ' on-focus' : tileSel ? ' on-sel' : '');
    plate.style.transform = 'translate3d(' + (anchor * g.pitch) + 'px,0,0)';

    cueL.style.left = (g.x - 72) + 'px'; cueR.style.left = (g.x + g.w + 24) + 'px';
    cueL.style.top = cueR.style.top = (g.y + g.h / 2 - 24) + 'px';
    cueL.className = 'cue' + (!g.broad && !empty && scroll.first > 0 ? ' is-on' : '');
    cueR.className = 'cue' + (!g.broad && !empty && scroll.first + g.vis < n ? ' is-on' : '');

    ax = g.x + 16 + anchor * g.pitch - off;
    if (hs.mode === 'arrange' && !hs.lifted && (hs.zone === 'tiles' || hs.zone === 'act') && focusItem && focusItem.kind !== 'add') {
      s = hs.arr.slots[anchor];
      label = (s.removed ? 'Restore ' : 'Remove ') + app(s.id).name; width = actionWidth(label);
      ax = clamp(ax + (g.tw - width) / 2, 112, 1808 - width);
      setHTML(dockAction, '<span>' + esc(label) + '</span>');
      dockAction.className = 'dock-action is-on' + (hs.zone === 'act' ? ' is-focus' : '');
      dockAction.style.width = width + 'px';
      dockAction.style.transform = 'translate3d(' + ax + 'px,0,0)';
      attrs(dockAction, 'act', anchor, 'arrange.' + (s.removed ? 'restore.' : 'remove.') + s.id);
    } else {
      dockAction.className = 'dock-action';
      dockAction.removeAttribute('data-z'); dockAction.removeAttribute('data-action');
    }
    setHTML(dockEmpty, empty ? '<p>No apps on Home</p><button type="button" tabindex="-1" class="btn' + (hs.zone === 'empty' ? ' is-focus' : '') + '" data-z="empty" data-i="0" data-action="home.add-apps">' + icon('plus') + '<span>Add apps</span></button>' : '');
  }

  function photoModeTransition(compact) {
    if (photoMode !== null && photoMode !== compact) {
      var ghost = phScene.cloneNode(true), token = ++photoTransitionToken;
      ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(ghost.querySelectorAll('[id],[data-action],[data-z]'), function (el) {
        el.removeAttribute('id'); el.removeAttribute('data-action'); el.removeAttribute('data-z');
      });
      ghost.className = 'ph-scene ph-ghost';
      phScene.parentNode.appendChild(ghost);
      phScene.className = 'ph-scene ph-incoming';
      setTimeout(function () {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
        if (token === photoTransitionToken) phScene.className = 'ph-scene';
      }, 180);
    }
    photoMode = compact;
  }
  /* Each plate keeps a stationary, stage-registered field while its opacity changes.
     Reuse the hidden group for the next label; never animate plate width or position. */
  function renderPhotoPlate(id, width, height, y, state) {
    var key = id + '|' + width + '|' + height + '|' + y, plateEl, fieldEl;
    if (key !== photoPlateKey) {
      phPlates[photoPlateIndex].className = phPlates[photoPlateIndex].className.replace(' is-current', '') + ' is-outgoing';
      photoPlateIndex = 1 - photoPlateIndex;
      plateEl = phPlates[photoPlateIndex]; fieldEl = phFields[photoPlateIndex];
      plateEl.className = 'ph-plate is-preparing';
      plateEl.style.width = width + 'px'; plateEl.style.height = height + 'px';
      plateEl.style.transform = 'translate3d(0,' + y + 'px,0)';
      fieldTransform(fieldEl, 112, y, width, height);
      plateEl.offsetWidth; // Establish zero opacity before the incoming crossfade.
      photoPlateKey = key;
    }
    fieldTransform(phFields[photoPlateIndex], 112, y, width, height);
    phPlates[photoPlateIndex].className = 'ph-plate is-current' + (state ? ' ' + state : '');
  }
  function fieldTransform(el, x, y, width, height) {
    el._placement = { x: x, y: y, width: width, height: height };
    el.style.transformOrigin = (x + width / 2) + 'px ' + (y + height / 2) + 'px';
    el.style.transform = 'translate3d(' + (-x) + 'px,' + (-y) + 'px,0)' + (S.c.bg === 'photo' && S.c.material === 'tint' && !REDUCED_MOTION ? ' scale(1.04)' : '');
  }
  function renderList(hs) {
    var items = hs.items, n = items.length, compact = hs.mode === 'arrange', pitch = compact ? PH_COMPACT_PITCH : PH_PITCH;
    var anchor = clamp(hs.i, 0, Math.max(0, n - 1)), first, off, width, slot, y, s, label, aw, plateState;
    var rowFocus = hs.zone === 'apps' || hs.zone === 'tiles', remembered = hs.zone === 'util' || hs.zone === 'act' || hs.zone === 'ctl' || hs.zone === 'preview' || hs.zone === 'media';
    photoModeTransition(compact);
    if (compact) {
      first = clamp(scroll.photoArrange, anchor - 7, anchor - 1);
      first = clamp(first, 0, Math.max(0, n - PH_COMPACT_VISIBLE));
      scroll.photoArrange = first;
    } else {
      first = clamp(scroll.photo, anchor - 3, anchor - 1);
      first = clamp(first, 0, Math.max(0, n - PH_FULL));
      scroll.photo = first;
    }
    off = first * pitch; slot = anchor - first;
    width = items[anchor] ? listPlateWidth(items[anchor].id, compact) : 360;
    phList.className = 'ph-list' + (compact ? ' is-compact' : '');
    phList.style.height = PH_HEIGHT + 'px';
    phRows.style.top = (compact ? 72 : 148) + 'px';
    keyed(phRows, items, function (row, it, i) {
      var typography = photoLabel(it.id, compact), focus = rowFocus && i === anchor, lifted = hs.lifted && i === anchor, markImage, body = '';
      setContent(row, it.id + '|' + typography.size + '|' + S.c.bg + '|' + S.c.apps + '|' + homeFont() + '|' + listNarrow(), function () {
        if (S.c.apps !== 'text') body += appMark(app(it.id), S.c.apps === 'icons' ? compact ? 64 : 88 : compact ? 60 : 84, S.c.apps === 'icons' ? compact ? 64 : 88 : compact ? 44 : 64, S.c.apps === 'icons' ? compact ? 52 : 72 : compact ? 42 : 54);
        if (S.c.apps !== 'icons') body += '<span class="ph-name" style="font-size:' + typography.size + 'px;top:' + typography.top + 'px">' + esc(app(it.id).name) + '</span>';
        return '<span class="ph-group">' + body + '</span><span class="ph-move ph-move-up">' + icon('up') + '</span><span class="ph-move ph-move-down">' + icon('down') + '</span>';
      });
      markImage = row.querySelector('.mark img');
      if (markImage) {
        markImage.onerror = function () { this.style.visibility = 'hidden'; };
        if (markImage.complete && !markImage.naturalWidth) markImage.style.visibility = 'hidden';
      }
      row.className = 'ph-row k-' + it.kind + (focus ? ' is-focus' : '') + (remembered && i === anchor ? ' is-sel' : '') + (lifted ? ' is-lifted' : '')
        + (lifted && i === 0 ? ' no-up' : '') + (lifted && i === n - 1 ? ' no-down' : '')
        + (it.kind === 'app' && S.press === it.id ? ' is-press' : '');
      row.style.width = (compact ? listPlateWidth(it.id, compact) : listNarrow() ? 920 : 1200) + 'px'; row.style.height = pitch + 'px';
      row.style.transform = 'translate3d(0,' + (i * pitch) + 'px,0)';
      row.setAttribute('role', 'button'); row.setAttribute('aria-label', app(it.id).name);
      attrs(row, compact ? 'tile' : 'app', i, compact ? 'arrange.' + (it.kind === 'ph' ? 'placeholder.' : 'tile.') + it.id : 'home.app.' + it.id);
    });
    phRows.style.transform = 'translate3d(0,' + (-off) + 'px,0)';
    y = (compact ? PH_COMPACT_TOP + 2 : PH_TOP + 1) + slot * pitch;
    plateState = !n || hs.zone === null ? '' : hs.lifted ? 'on-lift' : S.c.focus === 'glass' && rowFocus ? 'on-focus' : S.c.focus === 'glass' && remembered ? 'on-sel' : '';
    renderPhotoPlate(items[anchor] ? items[anchor].id : '', width, compact ? 88 : 134, y, plateState);
    if (compact && !hs.lifted && (hs.zone === 'tiles' || hs.zone === 'act') && items[anchor]) {
      s = hs.arr.slots[anchor]; label = (s.removed ? 'Restore ' : 'Remove ') + app(s.id).name; aw = actionWidth(label);
      setHTML(phAction, '<span>' + esc(label) + '</span>');
      phAction.className = 'ph-action is-on' + (hs.zone === 'act' ? ' is-focus' : '');
      phAction.style.width = aw + 'px';
      phAction.style.transform = 'translate3d(' + (112 + width + 24) + 'px,' + (PH_COMPACT_TOP + slot * pitch + 12) + 'px,0)';
      attrs(phAction, 'act', anchor, 'arrange.' + (s.removed ? 'restore.' : 'remove.') + s.id);
    } else { phAction.className = 'ph-action'; phAction.removeAttribute('data-z'); phAction.removeAttribute('data-action'); }
    phEmpty.className = 'ph-empty' + (!compact && !n ? ' is-on' : '');
    setHTML(phEmpty, !compact && !n ? '<p>No apps on Home</p><button type="button" tabindex="-1" class="btn' + (hs.zone === 'empty' ? ' is-focus' : '') + '" data-z="empty" data-i="0" data-action="home.add-apps">' + icon('plus') + '<span>Add apps</span></button>' : '');
  }

  /* Sheets: a frame is built once per view/mode; fill() updates its slots. Persistent
     scrollers let transforms animate. */
  function renderSheet(t, sheet) {
    var key;
    sheetEl.hidden = !(sheet || isSettingsDetail(t));
    sheetView.hidden = !sheet;
    if (sheet) sheetView.setAttribute('aria-modal', 'true');
    else sheetView.removeAttribute('aria-modal');
    sceneEl.setAttribute('aria-hidden', sheet || isSettingsDetail(t) ? 'true' : 'false');
    if (!sheet) { sheetView.innerHTML = ''; sheetKey = ''; return; }
    key = t.id + '|' + (t.mode || '') + '|' + (t.msg || '') + '|' + S.variant + '|' + S.c.bg;
    if (key !== sheetKey) {
      sheetView.innerHTML = FRAMES[t.id](t);
      sheetKey = key; slotEls = {};
      Array.prototype.forEach.call(sheetView.querySelectorAll('[data-slot]'), function (el) { slotEls[el.getAttribute('data-slot')] = el; });
    }
    FILLS[t.id](t, slotEls);
  }
  function renderAppearance(t) {
    appearanceEl.hidden = !isSettingsDetail(t);
    if (appearanceEl.hidden) { appearanceEl.removeAttribute('aria-modal'); return; }
    appearanceEl.setAttribute('aria-modal', 'true');
    if (t.id === 'wallpaper') { renderWallpaper(t); return; }
    V.appearance.norm(t);
    appearanceEl.className = 'appearance detail-' + t.group;
    appearanceRows.className = 'appearance-rows';
    appearanceTitle.textContent = DETAIL_NAMES[t.group];
    var at = detailLocation(t), selected = at.item, error = S.lookError, status = '', hint;
    function command(item, inner, cls) {
      var applied = item.axis && S.c[item.axis] === item.value;
      var loading = !!(item.axis && S.pending && S.pending.target[item.axis] === item.value && S.pending.row === item.axis);
      return '<button type="button" tabindex="-1" class="setting-choice' + (cls ? ' ' + cls : '') + (t.f.action === item.action ? ' is-focus' : '') + (item.disabled ? ' is-disabled' : '') + (applied ? ' is-applied' : '') + (loading ? ' is-loading' : '') + '"'
        + (item.axis ? ' role="radio" aria-checked="' + !!applied + '"' : '') + ' aria-label="' + esc(item.axis && item.value === 'both' ? 'Icons and text' : item.label) + '" aria-disabled="' + !!item.disabled + '" aria-busy="' + loading + '"'
        + ' data-z="detail" data-i="0" data-id="' + item.action + '" data-action="' + item.action + '">' + inner
        + (item.axis ? '<span class="setting-tick" aria-hidden="true">' + (applied ? icon('check') : '') + '</span>' : '') + '</button>';
    }
    setHTML(appearanceBack, command({ action: 'settings.back', label: t.group === 'rotation' ? 'Background' : 'Settings' }, icon('left') + '<span>' + (t.group === 'rotation' ? 'Background' : 'Settings') + '</span>', 'setting-back'));
    setHTML(appearanceRows, detailSections(t).map(function (section) {
      return '<section class="setting-section' + (section.horizontal ? ' is-horizontal' : '') + ' section-' + section.id + '">'
        + (section.title ? '<h3 class="setting-label" id="setting-' + section.id + '">' + section.title + '</h3>' : '')
        + '<div class="setting-options"' + (section.items[0].axis ? ' role="radiogroup" aria-label="' + esc(section.title || LOOK_NAMES[section.id] || DETAIL_NAMES[t.group]) + '"' : '') + '>'
        + section.items.map(function (item) {
          var swatch = item.axis === 'bg', body = '';
          if (swatch || item.thumbnail) body += item.value === 'light' || item.value === 'dark'
            ? '<span class="setting-swatch swatch-' + item.value + '" aria-hidden="true"></span>'
            : '<img class="setting-swatch" src="' + WP + S.c.wall + '-thumb.jpg" alt="">';
          body += '<span class="setting-copy"><span class="setting-name">' + esc(item.label) + '</span>'
            + (item.description ? '<span class="setting-description">' + esc(item.description) + '</span>' : '') + '</span>';
          if (!item.axis) body += icon('right', 'setting-forward');
          return command(item, body, item.description ? 'has-description' : '');
        }).join('') + '</div>'
        + (section.reason ? '<p class="setting-reason">' + esc(section.reason) + '</p>' : '') + '</section>';
    }).join(''));
    if (S.pending) status = '<p>Loading ' + esc(S.pending.row === 'font' ? FONTS[S.pending.target.font].name : 'your choice') + '…</p><p>Back cancels this change.</p>';
    else if (error) {
      status = '<p class="setting-error">' + (error.type === 'save' ? 'Couldn’t save this change.' : error.type === 'font' ? 'Couldn’t load ' + esc(FONTS[error.font].name) + '.' : 'Couldn’t load this appearance.') + ' Your current choice is kept.</p>'
        + command({ action: 'settings.retry', label: 'Try again' }, '<span>Try again</span>', 'setting-retry');
    }
    setHTML(appearanceStatus, status);
    hint = selected.disabled ? '' : selected.action === 'settings.back' ? 'Return to ' + (t.group === 'rotation' ? 'Background' : 'Settings') : selected.action === 'settings.retry' ? 'Retry this change' : selected.axis ? 'Apply selected setting' : selected.action === 'background.wallpaper' ? 'Choose a wallpaper' : selected.action === 'background.rotation' ? 'Choose a rotation interval' : selected.action === 'settings.group.saver' ? 'Open the screen saver' : 'Open on the TV';
    setHTML(appearanceDesc, hint ? '<span class="remote-key">OK</span><span>' + esc(hint) + '</span>' : '');
  }
  function renderWallpaper(t) {
    V.wallpaper.norm(t);
    appearanceEl.className = 'appearance detail-wallpaper';
    appearanceTitle.textContent = 'Wallpaper';
    appearanceRows.className = 'appearance-rows wallpaper-picker';
    setHTML(appearanceBack, '<button type="button" tabindex="-1" class="setting-choice setting-back' + (t.f.zone === 'back' ? ' is-focus' : '') + '" data-z="wall-back" data-action="wallpaper.back">' + icon('left') + '<span>Background</span></button>');
    setHTML(appearanceRows, '<div class="wallpaper-edge wallpaper-before" aria-hidden="true">' + icon('up') + '</div><div class="wallpaper-list" role="radiogroup" aria-label="Wallpaper"><div class="wallpaper-rows"></div></div><div class="wallpaper-edge wallpaper-after" aria-hidden="true">' + icon('down') + '</div>');
    var rows = appearanceRows.querySelector('.wallpaper-rows'), shown = wall(S.wallShown) || wall(S.c.wall), candidate = WALLS[t.i], status, note, hint;
    keyed(rows, WALLS.map(function (w) { return { key: w.id, wall: w }; }), function (row, item, i) {
      var visible = i >= t.top && i < t.top + WALL_VISIBLE, w = item.wall, image;
      setContent(row, w.id + '|' + visible, function () { return '<span class="wallpaper-thumb">' + (visible ? '<img src="' + WP + w.id + '-thumb.jpg" alt="">' : '') + '</span><span class="setting-copy"><span class="setting-name">' + esc(w.name) + '</span></span><span class="setting-tick" aria-hidden="true"></span>'; });
      row.className = 'setting-choice wallpaper-choice' + (t.f.zone === 'photo' && t.i === i ? ' is-focus' : '') + (w.id === S.c.wall ? ' is-applied' : '');
      row.style.transform = 'translate3d(0,' + (i * WALL_ROW) + 'px,0)'; row.style.visibility = visible ? 'visible' : 'hidden';
      row.setAttribute('role', 'radio'); row.setAttribute('tabindex', '-1'); row.setAttribute('aria-label', w.name);
      row.setAttribute('aria-checked', String(w.id === S.c.wall)); row.setAttribute('aria-posinset', String(i + 1)); row.setAttribute('aria-setsize', String(WALLS.length));
      row.setAttribute('aria-busy', String(t.previewDue === w.id || S.wallPending === w.id));
      attrs(row, 'wall-choice', i, 'wallpaper.choose.' + w.id);
      setHTML(row.querySelector('.setting-tick'), w.id === S.c.wall ? icon('check') : '');
      image = row.querySelector('img');
      if (image && !image._wallBound) {
        image._wallBound = true;
        image.onerror = function () { this.parentNode.className = 'wallpaper-thumb is-missing'; };
        if (image.complete && !image.naturalWidth) image.onerror();
      }
    });
    rows.style.transform = 'translate3d(0,' + (-t.top * WALL_ROW) + 'px,0)';
    appearanceRows.querySelector('.wallpaper-before').className = 'wallpaper-edge wallpaper-before' + (t.top > 0 ? ' is-on' : '');
    appearanceRows.querySelector('.wallpaper-after').className = 'wallpaper-edge wallpaper-after' + (t.top + WALL_VISIBLE < WALLS.length ? ' is-on' : '');
    note = t.previewDue ? 'Preparing ' + candidate.name + '…' : S.wallPending ? (t.applyPending ? 'Applying ' : 'Loading ') + candidate.name + '…' : shown.id === S.c.wall ? 'Applied' : 'Preview';
    if (t.failedId) note = S.err ? 'Couldn’t save ' + wall(t.failedId).name + '.' : 'Couldn’t load ' + wall(t.failedId).name + '.';
    status = '<p class="wallpaper-preview-name"><span>' + esc(shown.name) + '</span><span class="wallpaper-count">' + (wallIndex(shown.id) + 1) + ' of ' + WALLS.length + '</span></p><p class="wallpaper-preview-state' + (t.failedId ? ' setting-error' : '') + '">' + esc(note) + '</p>';
    if (t.failedId) status += '<button type="button" tabindex="-1" class="setting-choice setting-retry' + (t.f.zone === 'retry' ? ' is-focus' : '') + '" data-z="wall-retry" data-action="wallpaper.retry">Try again</button>';
    setHTML(appearanceStatus, status);
    hint = t.f.zone === 'back' ? 'Return to Background' : t.f.zone === 'retry' ? 'Retry this photo' : 'Apply selected photo';
    if (t.f.zone === 'photo' && candidate.id === S.c.wall && !S.pending && !t.failedId) hint = '';
    setHTML(appearanceDesc, hint ? '<span class="remote-key">OK</span><span>' + hint + '</span>' : '');
  }
  /* Keep the retry or membership state on the focused control. The stage-level line
     shares its position without changing the control's identity or key behaviour. */
  function renderFocusStatus(t) {
    if (isSettingsDetail(t)) { focusStatus.className = 'focus-status'; return; }
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, active = root.querySelectorAll('.is-focus[data-action]'), target = null, text = S.err ? 'Not saved. OK tries again.' : '', i, r, sr, scale, x, y, w, action, solid, photoRow = false, photoFree = false;
    Array.prototype.forEach.call(stage.querySelectorAll('.has-local-status'), function (el) { el.className = el.className.replace(/\s+has-local-status/g, ''); });
    for (i = 0; i < active.length; i++) if (renderedAction(active[i])) { target = active[i]; break; }
    if (!text && t.id === 'arrange' && (t.f.zone === 'act' || t.f.zone === 'tiles')) {
      var slot = t.slots[t.f.i];
      if (slot && !slot.removed && t.f.zone === 'act' && S.c.home.length === 1) text = LAST;
    }
    if (!text && S.note === LAST && t.id === 'arrange') text = LAST;
    if (!target || !text) { focusStatus.className = 'focus-status'; return; }
    if (target.parentNode === utilsEl && utilsEl.className.indexOf('is-icons') >= 0) { renderUtilFocusLabel(target); focusStatus.className = 'focus-status'; return; }
    // Photo action pills stay on one line; the header already carries this status.
    if (S.c.layout === 'list' && t.id === 'arrange' && !t.lifted && (t.f.zone === 'act' || t.f.zone === 'tiles')) { focusStatus.className = 'focus-status'; return; }
    photoRow = S.c.layout === 'list' && target.className.indexOf('ph-row') >= 0;
    if (photoRow && phAction.className.indexOf('is-on') >= 0) target = phAction;
    else if (photoRow) photoFree = true;
    target.className += ' has-local-status';
    action = target.getAttribute('data-action');
    r = target.getBoundingClientRect(); sr = stage.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    x = (r.left - sr.left) / scale; y = (r.top - sr.top) / scale; w = r.width / scale;
    if (photoFree) { x = 112 + parseFloat(phPlates[photoPlateIndex].style.width) + 24; y += (r.height / scale - 28) / 2; w = 400; }
    else if (action.indexOf('home.app.') === 0 || action.indexOf('arrange.tile.') === 0 || action.indexOf('arrange.placeholder.') === 0) y += 171;
    else if (action.indexOf('apps.order.') === 0) y += 86;
    else if (action.indexOf('apps.toggle.') === 0 || action.indexOf('apps.add.') === 0) y += 164;
    else if (action.indexOf('layout.') === 0) y += 54;
    else y += action.indexOf('arrange.remove.') === 0 || action.indexOf('arrange.restore.') === 0 ? 43 : 40;
    solid = /(?:^|\s)(?:u|btn|er-rm|dock-action|set-row|ph-action)(?:\s|$)/.test(target.className) && target.parentNode !== utilsEl && target.parentNode.className.indexOf('s-head') < 0;
    if (target === phAction && target.className.indexOf('is-focus') < 0) solid = false;
    focusStatus.className = 'focus-status is-on' + (solid ? ' dark-ink' : '') + (photoFree ? ' photo-status' : '');
    focusStatus.textContent = text;
    focusStatus.style.left = clamp(x + 8, 112, 1808 - Math.min(w - 16, 800)) + 'px';
    focusStatus.style.top = clamp(y, 72, 988) + 'px';
    focusStatus.style.width = Math.min(w - 16, 800) + 'px';
  }
  function headButtons(list, fi, prefix) {
    return list.map(function (b, i) {
      return '<button type="button" tabindex="-1" class="btn' + (i === fi ? ' is-focus' : '') + (b[2] ? ' ' + b[2] : '') + '" data-z="head" data-i="' + i + '" data-action="' + prefix + '.' + b[0] + '" aria-label="' + esc(b[0] === 'undo' ? undoCaption() : b[1]) + '">' + (b[3] ? icon(b[3]) : '') + '<span>' + b[1] + '</span></button>';
    }).join('');
  }
  var FRAMES = {
    apps: function () {
      return '<h2 class="s-title" data-slot="title"></h2><p class="s-sub" data-slot="sub"></p><div class="s-head" data-slot="head"></div>'
        + '<div class="grid-view" data-slot="view"><div class="grid-in" data-slot="grid"></div></div>'
        + '<div class="row-cue grid-before" data-slot="before" aria-hidden="true">' + icon('up') + '</div><div class="row-cue grid-after" data-slot="after" aria-hidden="true">' + icon('down') + '</div>';
    },
    editor: function () {
      return '<h2 class="s-title">Apps on Home</h2><p class="s-sub" data-slot="sub"></p><div class="s-head" data-slot="head"></div>'
        + '<p class="s-label z-home" data-slot="lh"></p><p class="s-label z-other">Not on Home</p>'
        + '<div class="ed-home" data-slot="home"></div><div class="ed-order-break" data-slot="break">Then scroll</div><div class="ed-other-view" data-slot="ov"><div class="ed-other" data-slot="other"></div></div><div class="ed-origin" data-slot="origin"></div>'
        + '<div class="row-cue editor-before" data-slot="otherBefore" aria-hidden="true">' + icon('up') + '</div><div class="row-cue editor-after" data-slot="otherAfter" aria-hidden="true">' + icon('down') + '</div>';
    },
    settings: function () { return '<h2 class="s-title">Settings</h2><div class="settings-overview" data-slot="list"></div><p class="settings-overview-hint"><span class="remote-key">OK</span><span>Open selected group</span></p>'; },
    message: function (t) {
      var m = messageContent(t);
      return '<h2 class="msg-title">' + esc(m.title) + '</h2><p class="msg-line">' + esc(m.line) + '</p><p class="msg-note">' + esc(m.note) + '</p><div class="msg-acts" data-slot="acts"></div>';
    },
    request: function () {
      return '<div class="rq-art" data-slot="art"></div><div class="rq-copy"><h2 class="rq-title" data-slot="title"></h2><p class="rq-meta" data-slot="meta"></p>'
        + '<p class="rq-tagline" data-slot="tagline"></p><p class="rq-overview" data-slot="overview"></p><div class="rq-facts" data-slot="facts"></div><div class="rq-cast" data-slot="cast"></div>'
        + '<p class="rq-status" data-slot="status" aria-live="polite"></p><div class="msg-acts rq-acts" data-slot="acts"></div></div>';
    },
    connect: function () {
      return '<h2 class="s-title">Connect to Emby</h2><p class="s-sub" data-slot="sub" aria-live="polite"></p><div class="cn-body" data-slot="body"></div><div class="msg-acts cn-acts" data-slot="acts"></div>';
    },
    mediaset: listFrame,
    teams: listFrame,
    inputs: listFrame
  };
  function hours(min) { return min >= 60 ? Math.floor(min / 60) + 'h' + (min % 60 ? ' ' + min % 60 + 'm' : '') : min + 'm'; }
  /* While details load their space is kept, so the buttons below don't move when they arrive. */
  function fillDetails(t, el) {
    var it = t.item, d = t.details && t.details !== 'none' ? t.details : null, waiting = t.details === null, facts = [], meta;
    meta = [it.year ? String(it.year) : '', it.mediaType === 'tv' ? 'Series' : 'Film'];
    if (d && it.mediaType === 'tv' && d.seasons) meta.push(d.seasons === 1 ? '1 season' : d.seasons + ' seasons');
    else if (d && d.runtime) meta.push(hours(d.runtime));
    if (d && d.genres.length) meta.push(d.genres.join(', '));
    if (d && d.rating) meta.push('TMDB ' + d.rating.toFixed(1));
    if (STATUS_NAMES[it.status]) meta.push(STATUS_NAMES[it.status]);
    setHTML(el.meta, esc(meta.filter(function (p) { return !!p; }).join(' · ')));
    setHTML(el.tagline, d && d.tagline ? esc(d.tagline) : '');
    setHTML(el.overview, esc(it.overview || (d ? d.overview : '')));
    if (d) {
      if (d.directors.length) facts.push(['Directed by', d.directors]);
      if (d.creators.length) facts.push(['Created by', d.creators]);
      if (d.writers.length && it.mediaType !== 'tv') facts.push(['Written by', d.writers]);
      if (d.networks.length) facts.push(['On', d.networks]);
    }
    el.facts.className = 'rq-facts' + (waiting ? ' is-waiting' : '');
    setHTML(el.facts, facts.slice(0, 2).map(function (f) { return '<p class="rq-fact"><span class="rq-fact-k">' + esc(f[0]) + '</span> ' + esc(f[1].join(', ')) + '</p>'; }).join(''));
    el.cast.className = 'rq-cast' + (waiting ? ' is-waiting' : '') + (d && d.cast.length ? ' has-cast' : '');
    setHTML(el.cast, d && d.cast.length ? '<p class="rq-fact-k rq-cast-k">Cast</p><div class="rq-people">' + d.cast.slice(0, 7).map(function (c) {
      return '<div class="rq-person"><span class="rq-face">' + (c.photo ? '<img alt="" src="' + esc(Media.image(c.photo, 185)) + '">' : '<span class="rq-initials">' + esc(c.name.split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('')) + '</span>') + '</span>'
        + '<span class="rq-name">' + esc(c.name) + '</span>' + (c.character ? '<span class="rq-role">' + esc(c.character) + '</span>' : '') + '</div>';
    }).join('') + '</div>' : '');
    Array.prototype.forEach.call(el.cast.querySelectorAll('img'), function (img) {
      if (img._wired) return; img._wired = true;
      img.onerror = function () { this.style.display = 'none'; };
    });
  }
  function listFrame() {
    return '<h2 class="s-title" data-slot="title"></h2><p class="s-sub" data-slot="sub" aria-live="polite"></p><div class="ls-view" data-slot="view"><div class="ls-in" data-slot="list"></div></div>'
      + '<div class="row-cue ls-before" data-slot="before" aria-hidden="true">' + icon('up') + '</div><div class="row-cue ls-after" data-slot="after" aria-hidden="true">' + icon('down') + '</div>';
  }
  function actButtons(actions, focus) {
    return actions.map(function (a, i) {
      return '<button type="button" tabindex="-1" class="btn' + (i === focus ? ' is-focus' : '') + '" data-z="act" data-i="' + i + '" data-action="act.' + esc(a[0]) + '"><span>' + esc(a[1]) + '</span></button>';
    }).join('');
  }
  function fillList(t, el) {
    var all = listLines(t), lines = focusLines(all), focus = lines[t.f.i], y = 0, fy = 0, entries = [], more = false;
    setHTML(el.title, t.id === 'teams' ? 'Your teams' : t.id === 'inputs' ? 'Inputs on Home' : 'Emby &amp; Seerr');
    setHTML(el.sub, esc(M.saving ? 'Saving ' + M.saving.toLowerCase() + '…' : M.note || (t.id === 'teams' ? 'Follow teams to see their games in Your Teams on Home.' : t.id === 'inputs' ? 'Choose which HDMI inputs appear on Home.' : 'These settings belong to this TV. Your Emby server keeps them.')));
    all.forEach(function (line) {
      entries.push({ key: line.head ? 'head.' + line.head + '.' + y : line.key, line: line, y: y });
      if (line === focus) fy = y;
      y += line.head ? LS_HEAD : LS_LINE;
    });
    if (fy < t.top) t.top = Math.max(0, fy - (all[0] && !all[0].head ? 0 : LS_HEAD));
    if (fy + LS_LINE > t.top + LS_VIEW) t.top = fy + LS_LINE - LS_VIEW;
    t.top = clamp(t.top, 0, Math.max(0, y - LS_VIEW));
    keyed(el.list, entries, function (row, entry) {
      var line = entry.line, li = lines.indexOf(line), html;
      row.style.transform = 'translate3d(0,' + entry.y + 'px,0)';
      row.style.visibility = entry.y + (line.head ? LS_HEAD : LS_LINE) > t.top && entry.y < t.top + LS_VIEW ? '' : 'hidden';
      more = more || entry.y + (line.head ? LS_HEAD : LS_LINE) > t.top + LS_VIEW;
      if (line.head) { row.className = 'ls-head'; setHTML(row, esc(line.head)); return; }
      html = '<div class="ls-copy"><span class="ls-label">' + esc(line.label) + '</span>' + (line.desc ? '<span class="ls-desc">' + esc(line.desc) + '</span>' : '') + '</div><div class="ls-parts">'
        + line.parts.map(function (part, p) {
          return '<button type="button" tabindex="-1" class="ls-part' + (line === focus && p === t.f.p ? ' is-focus' : '') + (part.applied ? ' is-applied' : '') + (part.disabled ? ' is-disabled' : '') + '"'
            + ' data-z="part" data-i="' + (li * 100 + p) + '" data-action="list.' + esc(line.key) + '.' + esc(part.id) + '" aria-label="' + esc(line.label + ': ' + part.label) + '"'
            + (part.applied !== undefined ? ' aria-pressed="' + !!part.applied + '"' : '') + ' aria-disabled="' + !!part.disabled + '">'
            + (part.applied ? icon('check') : '') + '<span>' + esc(part.label) + '</span></button>';
        }).join('') + '</div>';
      setHTML(row, html);
      row.className = 'ls-line' + (line === focus ? ' is-active' : '') + (line.dim ? ' is-dim' : '');
    });
    el.list.style.transform = 'translate3d(0,' + (-t.top) + 'px,0)';
    el.before.className = 'row-cue ls-before' + (t.top > 0 ? ' is-on' : '');
    el.after.className = 'row-cue ls-after' + (more ? ' is-on' : '');
  }
  function gridTileHtml(id) {
    var a = app(id), state = onHome(id) ? badge(true) + '<span>On Home</span>' : '';
    return '<span class="panel-content">' + appMark(a, 120, 72, 58) + '<span class="label">' + esc(a.name) + '</span></span><span class="state">' + state + '</span>';
  }
  var FILLS = {
    apps: function (t, el) {
      var f = t.f, items = appsItems(), n = items.length, rows = Math.ceil(n / COLS), vis = 3, row = Math.floor(f.i / COLS);
      setHTML(el.title, 'All apps');
      setHTML(el.sub, esc(catalog.loading ? 'Loading installed apps…' : catalog.error || (!n ? 'No installed apps found.' : '')));
      setHTML(el.head, headButtons(appsHead(), f.zone === 'head' ? 0 : -1, 'apps'));
      el.head.className = 's-head' + (f.zone === 'head' ? ' is-awake' : '');
      if (f.zone === 'grid') { if (row < t.top) t.top = row; if (row > t.top + vis - 1) t.top = row - vis + 1; }
      t.top = clamp(t.top, 0, Math.max(0, rows - vis));
      keyed(el.grid, items.map(function (id) { return { key: id, id: id }; }), function (tile, it, i) {
        var focus = f.zone === 'grid' && i === f.i;
        setContent(tile, [it.id, app(it.id).name, onHome(it.id)].join('|'), function () { return gridTileHtml(it.id); });
        tile.className = 'gt' + (focus ? ' is-focus' : '');
        tile.style.transform = 'translate3d(' + ((i % COLS) * GRID_COL) + 'px,' + (Math.floor(i / COLS) * GRID_ROW) + 'px,0)';
        tile.setAttribute('role', 'button'); tile.setAttribute('aria-label', app(it.id).name);
        attrs(tile, 'grid', i, 'apps.open.' + it.id);
      });
      el.grid.style.transform = 'translate3d(0,' + (-t.top * GRID_ROW) + 'px,0)';
      el.view.className = 'grid-view' + (t.top > 0 ? ' more-before' : '') + (rows - t.top > vis ? ' more-after' : '');
      el.before.className = 'row-cue grid-before' + (t.top > 0 ? ' is-on' : '');
      el.after.className = 'row-cue grid-after' + (rows - t.top > vis ? ' is-on' : '');
    },
    editor: function (t, el) {
      var f = t.f, H = t.lifted ? t.lifted.order : S.c.home, O = otherGroups(), list = O.recent.concat(O.rest), full = S.c.home.length >= CAP;
      var entries = [], ys = [], y = 0, yf, minTop, maxTop = 0, rowEnd, before = false, afterRows = false;
      var hint = catalog.error ? catalog.error : catalog.loading ? 'Loading installed apps…' : f.zone === 'head' && f.h === 0 ? undoCaption() : f.zone === 'home' && f.part === 'remove' ? (H.length <= 1 ? LAST : app(H[f.i]).name + ' stays installed.') : '';
      setHTML(el.sub, editStatus(hint, t.lifted ? 'Moving ' + app(t.lifted.id).name + '. OK places it, Back puts it back.' : ''));
      setHTML(el.head, headButtons([['undo', 'Undo', S.undo.length ? '' : 'is-idle', 'undo'], ['done', 'Done', '', 'check']], f.zone === 'head' ? f.h : -1, 'editor'));
      el.head.className = 's-head' + (f.zone === 'head' ? ' is-awake' : '');
      setHTML(el.lh, 'On Home <span class="s-count">' + S.c.home.length + ' of ' + CAP + '</span>');
      el['break'].className = 'ed-order-break' + (H.length > editorCut() ? ' is-on' : '');
      el['break'].style.top = (264 + editorCut() * ED_ROW) + 'px';

      keyed(el.home, H.map(function (id) { return { key: id, id: id }; }), function (row, it, i) {
        var a = app(it.id), here = f.zone === 'home' && i === f.i, lifted = !!t.lifted && i === f.i;
        setContent(row, it.id, function () { return '<div class="er-name" role="button"><span class="panel-content"><span class="er-num"></span>' + smallMark(a) + '<span class="er-text">' + esc(a.name) + '</span><span class="er-move">' + icon('updown') + '</span></span></div><div class="er-rm" role="button"><span></span></div>'; });
        row.className = 'er' + (here ? ' is-active' : '') + (lifted ? ' is-lifted' : '');
        row.style.transform = 'translate3d(' + (lifted ? 16 : 0) + 'px,' + editorHomeY(i) + 'px,0)';
        row.querySelector('.er-num').textContent = String(i + 1);
        row.firstChild.className = 'er-name' + (here && (f.part === 'name' || lifted) ? ' is-focus' : '');
        row.lastChild.className = 'er-rm' + (here && f.part === 'remove' && !lifted ? ' is-focus' : '') + (H.length <= 1 ? ' is-limit' : '');
        row.lastChild.firstChild.textContent = H.length <= 1 ? LAST : 'Remove from Home';
        attrs(row.firstChild, 'name', i, 'editor.move.' + it.id);
        attrs(row.lastChild, 'remove', i, 'editor.remove.' + it.id);
      });
      el.origin.className = 'ed-origin' + (t.lifted && t.lifted.from !== f.i ? ' is-on' : '');
      if (t.lifted) el.origin.style.transform = 'translate3d(0,' + (264 + editorHomeY(t.lifted.from) + 16) + 'px,0)';

      if (O.recent.length) { entries.push({ key: 'sep-recent', sep: 'Recently removed', y: y }); y += ED_SEP; }
      O.recent.forEach(function (id) { entries.push({ key: id, id: id, y: y }); ys.push(y); y += ED_ROW; });
      if (O.recent.length && O.rest.length) { entries.push({ key: 'sep-rest', sep: 'Other installed apps', y: y }); y += ED_SEP; }
      O.rest.forEach(function (id) { entries.push({ key: id, id: id, y: y }); ys.push(y); y += ED_ROW; });
      if (f.zone === 'other' && ys.length) {
        yf = ys[f.j] - (O.recent.length && (f.j === 0 || f.j === O.recent.length) ? ED_SEP : 0);
        if (yf < t.top) t.top = yf;
        if (ys[f.j] + 72 > t.top + ED_VIEW) {
          minTop = ys[f.j] + 72 - ED_VIEW;
          entries.some(function (it) { if (it.y < minTop) return false; t.top = it.y; return true; });
        }
      }
      entries.some(function (it) { if (it.y < Math.max(0, y - ED_VIEW)) return false; maxTop = it.y; return true; });
      t.top = clamp(t.top, 0, maxTop);
      keyed(el.other, entries, function (row, it) {
        var j, focus, a;
        row.style.transform = 'translate3d(0,' + it.y + 'px,0)';
        rowEnd = it.y + (it.sep ? ED_SEP : 72);
        row.style.visibility = it.y >= t.top && rowEnd <= t.top + ED_VIEW ? 'visible' : 'hidden';
        before = before || it.y < t.top; afterRows = afterRows || rowEnd > t.top + ED_VIEW;
        if (it.sep) { setContent(row, 'sep|' + it.sep, function () { return esc(it.sep); }); row.className = 'eo-sep'; return; }
        j = list.indexOf(it.id); focus = f.zone === 'other' && j === f.j; a = app(it.id);
        setContent(row, it.id, function () { return '<span class="panel-content">' + smallMark(a) + '<span class="eo-text">' + esc(a.name) + '</span><span class="eo-verb"></span></span>'; });
        setHTML(row.querySelector('.eo-verb'), focus ? '<span class="verb' + (full ? ' is-off' : '') + '">' + (full ? 'Home is full' : 'Add to Home') + '</span>' : '');
        row.className = 'eo' + (focus ? ' is-focus' : '');
        row.setAttribute('role', 'button');
        attrs(row, 'other', j, 'editor.add.' + it.id);
      });
      el.other.style.transform = 'translate3d(0,' + (-t.top) + 'px,0)';
      el.ov.className = 'ed-other-view';
      el.otherBefore.className = 'row-cue editor-before' + (before ? ' is-on' : '');
      el.otherAfter.className = 'row-cue editor-after' + (afterRows ? ' is-on' : '');
    },
    settings: function (t, el) {
      var html = '', rows = settingsRows();
      el.list.className = 'settings-overview' + (rows.length > 7 ? ' is-compact' : '') + (rows.length > 8 ? ' is-dense' : '');
      rows.forEach(function (r) {
        html += '<button type="button" tabindex="-1" class="settings-group' + (r.id === t.f.id ? ' is-focus' : '') + '" data-z="row" data-i="0" data-id="' + r.id + '" data-action="settings.' + (r.id === 'editor' ? 'editor' : 'group.' + r.id) + '"><span class="settings-group-copy"><span class="settings-group-name">' + esc(r.label) + '</span><span class="settings-group-value">' + esc(r.value) + '</span></span>' + icon('right') + '</button>';
      });
      setHTML(el.list, html);
    },
    message: function (t, el) {
      setHTML(el.acts, messageContent(t).actions.map(function (a, i) {
        return '<button type="button" tabindex="-1" class="btn' + (i === t.f.b ? ' is-focus' : '') + '" data-z="act" data-i="' + i + '" data-action="message.' + a[0] + '"><span>' + a[1] + '</span></button>';
      }).join(''));
    },
    request: function (t, el) {
      var it = t.item, src = Media.image(it.poster || it.landscape, 640), img;
      if (!el.art._done) {
        el.art._done = true;
        el.art.innerHTML = (src ? '<img alt="">' : '') + '<span class="mc-fallback">' + esc(it.title) + '</span>';
        img = el.art.querySelector('img');
        if (img) { img.onload = function () { this.className = 'is-loaded'; }; img.onerror = function () { this.className = 'is-missing'; }; img.src = src; }
      }
      setHTML(el.title, esc(it.title));
      fillDetails(t, el);
      setHTML(el.status, t.step === 'loading' ? 'Checking who can request…' : t.step === 'sending' ? 'Sending your request…'
        : t.step === 'choose' ? (canPlay(it) ? 'Some of this is in your Emby library. Play it, or request the rest' + (t.requesters.length > 1 ? '. Who’s requesting?' : '.') : t.requesters.length > 1 ? 'Who’s requesting?' : '')
        : '<span class="' + (t.step === 'error' ? 'setting-error' : '') + '">' + esc(t.message) + '</span>');
      setHTML(el.acts, actButtons(requestActions(t), t.f.b));
    },
    connect: function (t, el) {
      var html = '', sub;
      if (t.step === 'address') {
        sub = t.error ? '<span class="setting-error">' + esc(t.error) + '</span>' : 'Enter your Emby server’s address. The port is 8096 unless you changed it.';
        html = '<div class="cn-field' + (t.text ? '' : ' is-empty') + '"><span>' + esc(t.text || '192.168.1.10') + '</span><span class="cn-caret"></span></div><div class="cn-pad">'
          + KEYPAD.map(function (row, r) {
            return '<div class="cn-row">' + row.map(function (key, c) {
              var label = key === 'del' ? 'Delete' : key === 'go' ? 'Connect' : key;
              return '<button type="button" tabindex="-1" class="cn-key' + (key.length > 1 ? ' is-wide' : '') + (key === 'go' ? ' is-go' : '') + (t.f.r === r && t.f.c === c ? ' is-focus' : '') + '" data-z="key" data-i="' + (r * 10 + c) + '" data-action="connect.key.' + key + '" aria-label="' + label + '">' + esc(label) + '</button>';
            }).join('') + '</div>';
          }).join('') + '</div><p class="cn-help">Number keys on the remote work too.</p>';
      } else if (t.step === 'checking') {
        sub = 'Looking for Emby at ' + esc(Media.host(t.url)) + '…';
      } else if (t.step === 'code') {
        sub = 'Found ' + esc(t.server ? t.server.name : 'Emby') + '. Approve this TV on your server.';
        html = '<div class="cn-code" aria-label="Pairing code ' + esc(t.pairing.code.split('').join(' ')) + '">' + esc(t.pairing.code) + '</div>'
          + '<p class="cn-steps">In Emby on another device, open Dashboard → Plugins → Lobby. Check the code matches, choose who this TV watches as, then Approve.</p><p class="cn-wait">Waiting for approval…</p>';
      } else if (t.step === 'done') {
        sub = 'Connected' + (t.tvName ? ' as ' + esc(t.tvName) : '') + '.';
        html = '<p class="cn-steps">Your rows appear on Home in a moment. Change which rows show in Settings → Emby &amp; Seerr.</p>';
      } else {
        sub = '<span class="setting-error">' + esc(t.error) + '</span>';
      }
      setHTML(el.sub, sub);
      setHTML(el.body, html);
      setHTML(el.acts, t.step === 'address' ? '' : actButtons(connectActions(t), t.f.b));
    },
    mediaset: fillList,
    teams: fillList,
    inputs: fillList
  };

  /* ---------- Atomic appearance bundles ---------- */
  var wallToken = 0, committedBundle = null, reflowToken = 0, fontSwitchToken = 0;
  function registeredMaterial(id) { return S.c.bg === 'photo' && S.c.material === 'soft' && !!wall(id); }
  function matSrc(id, material) { return 'assets/materials/' + id + (material === 'soft' ? '-study-soft.jpg' : material === 'tint' ? '-field-clear.jpg' : '-field-frost.jpg'); }
  function fieldSrc(id, material) { return 'assets/materials/' + id + (material === 'soft' ? '-field-blur.jpg' : material === 'tint' ? '-field-clear.jpg' : '-field-frost.jpg'); }
  function makeImg(cls, src) { var im = document.createElement('img'); im.className = cls; im.alt = ''; im._src = src; im.src = src; return im; }
  function whenReady(im, done) {
    var fin = false, timer = setTimeout(function () { finish(!!(im.complete && im.naturalWidth)); }, document.hidden ? 20000 : 8000);
    function finish(ok) { if (fin) return; fin = true; clearTimeout(timer); done(ok); }
    function ready() {
      // Hidden TV prelaunch may suspend decode even after a valid image loads.
      if (document.hidden || !im.decode) { finish(true); return; }
      im.decode().then(function () { finish(true); }, function () { finish(!!(im.complete && im.naturalWidth)); });
    }
    if (im.complete) { if (im.naturalWidth) ready(); else finish(false); }
    else { im.onload = ready; im.onerror = function () { finish(false); }; }
  }
  function swapImg(k, im) { var old = IMG[k]; if (old === im) return; im.style.cssText = old.style.cssText; if (old.id) im.id = old.id; old.parentNode.replaceChild(im, old); IMG[k] = im; }
  function bundleKey(look) { return look.wall + '|' + look.material; }
  function loadBundle(look, token, done) {
    var imgs = { photo: makeImg('photo', WP + look.wall + '.jpg'), bg: makeImg('sheet-bg', WP + look.wall + '-panel.jpg') }, keys, left, allOk = true;
    imgs.mat = makeImg('mat-img', matSrc(look.wall, look.material));
    imgs.field = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    imgs.fieldAlt = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    imgs.utility = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    imgs.utilityAlt = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    keys = Object.keys(imgs); left = keys.length;
    keys.forEach(function (k) { whenReady(imgs[k], function (ok) {
      allOk = allOk && ok;
      if (--left || token !== wallToken) return;
      done(allOk ? { key: bundleKey(look), imgs: imgs } : null);
    }); });
  }
  function installBundle(bundle, look, previewOnly) {
    if (bundle) {
      Object.keys(bundle.imgs).forEach(function (k) { if (!previewOnly || k !== 'bg') swapImg(k, bundle.imgs[k]); });
      S.bundleKey = bundle.key;
    }
    S.shown = { bg: look.bg, wall: look.wall, material: look.material, font: look.font };
    phFields.concat(utFields).forEach(function (el) { var p = el._placement; if (p) fieldTransform(el, p.x, p.y, p.width, p.height); });
    S.wallShown = look.wall; S.wallPending = null; S.wallError = null;
  }
  function cleanPatch(patch) {
    var out = {}, k;
    if (!patch || typeof patch !== 'object') throw new Error('look needs an appearance patch');
    for (k in patch) if (patch.hasOwnProperty(k)) {
      if (k === 'wall') { if (!wall(patch[k])) throw new Error('Unknown wallpaper: ' + patch[k]); }
      else if (k === 'font') { if (!FONTS[patch[k]] || patch[k] !== 'manrope' && PRIVATE_FONTS.indexOf(patch[k]) < 0) throw new Error('Unavailable font: ' + patch[k]); }
      else if (!LOOK_VALUES[k] || LOOK_VALUES[k].indexOf(patch[k]) < 0) throw new Error('Invalid appearance value: ' + k);
      out[k] = patch[k];
    }
    return out;
  }
  function cancelLook() { wallToken++; S.pending = null; S.wallPending = null; S.lookError = null; }
  function setLook(patch, options) {
    var opts = options || {}, changes = cleanPatch(patch), target = lookOf(S.c), k, token, needs, needsFont, changed, loadedBundle = null, imageDone, fontDone, failed = false;
    for (k in changes) if (changes.hasOwnProperty(k)) target[k] = changes[k];
    changed = Object.keys(target).some(function (key) { return target[key] !== S.c[key]; });
    cancelLook(); S.err = null; token = wallToken;
    function finish(bundle) {
      var c = next(S.c.home.slice(), S.c.recent.slice()), fontChanged = target.font !== S.c.font, reflow = target.apps !== S.c.apps || target.controls !== S.c.controls || fontChanged, frame, fontFrame;
      Object.keys(target).forEach(function (key) { c[key] = target[key]; });
      S.pending = null; S.wallPending = null;
      if (!opts.transient && changed && !write(c, 'Appearance')) { S.lookError = { type: 'save', patch: changes, row: opts.row || S.appearanceFocus, transient: false }; render(); syncRotation(); return; }
      if (opts.transient) S.c = c;
      if (reflow) { S.reflow = true; frame = ++reflowToken; }
      if (fontChanged) { S.fontSwitch = true; fontFrame = ++fontSwitchToken; }
      installBundle(bundle, target);
      if (bundle) committedBundle = bundle;
      S.lookError = null; S.previewBundle = null;
      render(); syncRotation();
      if (reflow) window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
        if (frame !== reflowToken) return;
        S.reflow = false; stage.className = stage.className.replace(/\s+is-reflow/g, '');
      }); });
      if (fontChanged) setTimeout(function () {
        if (fontFrame !== fontSwitchToken) return;
        S.fontSwitch = false; stage.className = stage.className.replace(/\s+is-font-switch/g, '');
      }, REDUCED_MOTION ? 130 : 170);
    }
    function fail(type, reason) {
      if (token !== wallToken || failed) return;
      failed = true; S.pending = null; S.wallPending = null;
      if (type === 'load') S.wallError = target.wall;
      S.lookError = { type: type, reason: reason || null, patch: changes, row: opts.row || (type === 'font' ? 'font' : S.appearanceFocus), transient: !!opts.transient, wall: target.wall, font: target.font };
      if (type === 'font') log((opts.startup ? 'font fallback: ' : 'Font kept: ') + (opts.startup ? target.font : FONTS[S.c.font].name) + (opts.startup ? '' : ' (' + reason + ')'));
      if (type === 'font' && opts.startup && target.font !== 'manrope') { setLook({ font: 'manrope' }, { transient: true }); return; }
      render(); syncRotation();
    }
    function complete() {
      if (!imageDone || !fontDone || failed || token !== wallToken) return;
      if (document.hidden) { finish(loadedBundle); return; }
      window.requestAnimationFrame(function () { if (!failed && token === wallToken) finish(loadedBundle); });
    }
    needs = target.bg === 'photo' && S.bundleKey !== bundleKey(target) && (!S.shown || S.shown.bg !== 'photo' || target.wall !== S.c.wall || materialApplies(target));
    needsFont = !fontMetrics[target.font]; imageDone = !needs; fontDone = !needsFont;
    if (!needs && !needsFont) { finish(null); return; }
    S.pending = { patch: changes, target: target, row: opts.row || (needsFont ? 'font' : S.appearanceFocus), transient: !!opts.transient, preview: false };
    if (needs) {
      S.wallPending = target.wall;
      loadBundle(target, token, function (bundle) {
        if (!bundle) { fail('load'); return; }
        loadedBundle = bundle; imageDone = true; complete();
      });
    }
    if (needsFont) ensureFont(target.font, function (ok, reason) {
      if (!ok) { fail('font', reason); return; }
      fontDone = true; complete();
    });
    render();
  }
  function showWall(id, done) {
    var target = lookOf(S.c), token;
    target.bg = 'photo'; target.wall = id;
    cancelLook(); token = wallToken; S.wallError = null;
    S.pending = { patch: { wall: id }, target: target, row: 'bg', preview: true, transient: false }; S.wallPending = id;
    loadBundle(target, token, function (bundle) {
      S.pending = null; S.wallPending = null;
      if (!bundle) { S.wallError = id; done(false); return; }
      S.previewBundle = bundle; installBundle(bundle, target, true); done(true);
    });
    render();
  }
  function restoreLook() {
    cancelLook(); S.previewBundle = null;
    if (S.c.bg === 'photo' && committedBundle && committedBundle.key === bundleKey(S.c)) installBundle(committedBundle, S.c);
    else if (S.c.bg !== 'photo' || S.bundleKey === bundleKey(S.c)) installBundle(null, S.c);
    else setLook({}, { transient: true });
  }

  /* ---------- Lifecycle and remote input ---------- */
  var clockTimer = 0, rotationTimer = 0, activeSince = 0, activeMs = 0, rotationKey = '';
  function rotationActive() { return !document.hidden && top().id === 'home' && S.c.bg === 'photo' && !S.pending && mode().min > 0; }
  function pauseRotation() {
    if (activeSince) { activeMs += Date.now() - activeSince; activeSince = 0; }
    clearTimeout(rotationTimer); rotationTimer = 0;
  }
  function resetRotation() { pauseRotation(); activeMs = 0; rotationKey = ''; }
  function syncRotation() {
    syncWatch();
    var key = S.c.wall + '|' + S.c.mode;
    pauseRotation();
    if (key !== rotationKey) { activeMs = 0; rotationKey = key; }
    if (!rotationActive()) return;
    activeSince = Date.now();
    rotationTimer = setTimeout(function () {
      pauseRotation(); activeMs = 0;
      if (rotationActive()) setLook({ wall: WALLS[(wallIndex(S.c.wall) + 1) % WALLS.length].id }, { row: 'bg' });
    }, Math.max(10, mode().min * QA.minuteMs - activeMs));
  }
  function updateClock() {
    clearTimeout(clockTimer);
    if (document.hidden) return;
    if (top().id === 'home' || isSettingsDetail(top())) { if (layoutNow() === 'watch') renderWatch(top()); else renderCaption(top(), homeState(top())); }
    clockTimer = setTimeout(updateClock, 60000 - (Date.now() % 60000) + 30);
  }
  function focusStage() { try { stage.focus({ preventScroll: true }); } catch (e) { stage.focus(); } }
  function after() { norm(); render(); syncRotation(); }
  function goScene(name) {
    if (top().id === 'wallpaper') cancelWallpaperTimer(top());
    S.stack = [S.stack[0]]; S.stack[0].f.zone = 'apps'; clearSession(); restoreLook();
    if (name === 'apps') openApps();
    else if (name === 'settings') openSettings();
    else if (name === 'appearance') { openSettings(); top().f.id = 'background'; S.settingsFocus = 'background'; openAppearance('background'); }
    else if (name === 'editor') { openSettings(); openEditor('settings'); }
    after();
  }
  function fit() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = ((window.innerWidth - 1920 * scale) / 2) + 'px';
    stage.style.top = ((window.innerHeight - 1080 * scale) / 2) + 'px';
  }
  function renderedAction(el) {
    return el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== 'hidden';
  }
  function focusedAction() {
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, els = root.querySelectorAll('.is-focus[data-action]'), i;
    for (i = 0; i < els.length; i++) if (renderedAction(els[i])) return els[i].getAttribute('data-action');
    return null;
  }
  function activate(action) {
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, els = root.querySelectorAll('[data-action]'), i;
    if (action === 'appearance.bg' && top().id === 'appearance' && top().group === 'background') action = 'background.wallpaper';
    if (action === 'settings.appearance' && top().id === 'settings') action = 'settings.group.background';
    for (i = 0; i < els.length; i++) if (renderedAction(els[i]) && els[i].getAttribute('data-action') === action) { pointAt(els[i]); return true; }
    return false;
  }
  function pointAt(el) {
    var t = top(), v = V[t.id];
    norm();
    if (v.point) v.point(t, el.getAttribute('data-z'), +el.getAttribute('data-i'), el.getAttribute('data-id'));
    norm();
    render();
    syncRotation();
  }

  utilsEl.addEventListener('mouseover', function (ev) {
    var b = ev.target, t = top(), z, i;
    if (utilsEl.className.indexOf('quiet-utils') < 0 || t.lifted) return;
    while (b && b !== utilsEl && !(b.getAttribute && b.getAttribute('data-z'))) b = b.parentNode;
    if (!b || b === utilsEl || (ev.relatedTarget && b.contains(ev.relatedTarget))) return;
    z = b.getAttribute('data-z'); i = Number(b.getAttribute('data-i'));
    if ((t.id !== 'home' || z !== 'util') && (t.id !== 'arrange' || z !== 'ctl')) return;
    if (t.f.zone === z && t.f.u === i) return;
    t.f.zone = z; t.f.u = i;
    if (z === 'util') S.lastUtil = i;
    render();
  });
  stage.addEventListener('click', function (ev) {
    var el = ev.target;
    while (el && el !== stage && !(el.getAttribute && el.getAttribute('data-z'))) el = el.parentNode;
    focusStage();
    if (!el || el === stage) return;
    pointAt(el);
  });
  var heldKeys = {};
  /* Typing a server address: number keys, '.' and ':' from remotes and keyboards. */
  function typedKey(ev) {
    var code = ev.keyCode;
    if (ev.key && /^[0-9.:]$/.test(ev.key)) return ev.key;
    if (code >= 48 && code <= 57) return String(code - 48);
    if (code >= 96 && code <= 105) return String(code - 96);
    if (code === 190 || code === 110) return '.';
    if (code === 8 || code === 46) return 'del';
    return '';
  }
  document.addEventListener('keydown', function (ev) {
    var code = ev.keyCode, k = KEYS[code], typed;
    if (code === 9) { ev.preventDefault(); return; }
    if (top().id === 'connect' && top().step === 'address' && !ev.metaKey && !ev.ctrlKey && !ev.altKey && (typed = typedKey(ev))) { ev.preventDefault(); press('type:' + typed); return; }
    if (!k || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    ev.preventDefault();
    if (k === 'ok' || k === 'back') { if (ev.repeat || heldKeys[code]) return; heldKeys[code] = true; }
    press(k);
  });
  document.addEventListener('keyup', function (ev) { delete heldKeys[ev.keyCode]; });
  window.addEventListener('blur', function () { heldKeys = {}; });
  window.addEventListener('focus', function () { release(); focusStage(); after(); updateClock(); });
  document.addEventListener('visibilitychange', function () {
    heldKeys = {};
    if (document.hidden) { pauseRotation(); clearTimeout(clockTimer); clearTimeout(M.timer); clearTimeout(W.timer); W.timer = 0; clearTimeout(saverTimer); saverTimer = 0; clearTimeout(weatherTimer); weatherTimer = 0; }
    else {
      release();
      refreshMedia(false);
      refreshInputs();
      if (S.c.bg === 'photo' && !S.pending && !S.previewBundle && (!committedBundle || S.bundleKey !== bundleKey(S.c))) setLook({}, { transient: true, startup: true });
      after(); updateClock(); focusStage(); armSaver(); refreshWeather();
    }
  });
  window.addEventListener('resize', fit);
  QA.fireSaver = fireSaver; QA.vibrant = wVibrant; QA.saverMs = saverMs; QA.weatherIcon = weatherIcon; QA.applyWeather = applyWeather;

  /* Readable browser checks use the real state and actions, without fake outcomes. */
  var NAV = { left: 'left', right: 'right', up: 'up', down: 'down', ok: 'ok', enter: 'ok', back: 'back', escape: 'back' };
  QA.state = function () {
    var out = serialise(S.c), t = top(), item = t.id === 'appearance' ? detailLocation(t).item : null;
    out.committed = S.c; out.shown = S.shown; out.pending = S.pending; out.view = t.id; out.selected = S.sel;
    out.focusAction = focusedAction(); out.writes = S.writes; out.failedWrites = S.failed; out.error = S.err;
    out.catalog = { loading: catalog.loading, loaded: catalog.loaded, error: catalog.error, ids: ALPHA.slice() };
    out.fonts = { available: LOOK_VALUES.font.slice(), loaded: Object.keys(fontMetrics).filter(function (id) { return !fontMetrics[id].fallback; }), baselineFallback: !!(fontMetrics.manrope && fontMetrics.manrope.fallback), error: S.lookError && S.lookError.type === 'font' ? S.lookError : null };
    out.rotation = { activeMs: activeMs + (activeSince ? Date.now() - activeSince : 0), active: !!activeSince };
    out.draft = t.lifted ? { id: t.lifted.id, order: t.lifted.order.slice() } : null;
    out.settingsGroup = t.id === 'wallpaper' ? 'wallpaper' : t.id === 'appearance' ? t.group : null;
    out.focusedChoice = item && item.axis ? { axis: item.axis, value: item.value, action: item.action, disabled: item.disabled } : null;
    out.candidate = out.focusedChoice ? { axis: item.axis, value: item.value, action: item.action, pending: !!S.pending, pendingTarget: S.pending ? S.pending.target : null } : null;
    out.wallpaperPicker = t.id === 'wallpaper' ? { candidate: WALLS[t.i].id, applied: S.c.wall, shown: S.wallShown, pending: t.previewDue || S.wallPending,
      queuedApplying: !!t.applyPending, applyPending: t.applyPending, failed: t.failedId, zone: t.f.zone, top: t.top, visible: WALL_VISIBLE, backdrop: IMG.bg.src } : null;
    out.undo = S.undo.map(function (u) { return u.label; }); out.storageOk = storageOk;
    out.media = { paired: !!M.cfg, unauthorized: M.unauthorized, loading: M.loading, rows: M.rows.map(function (r) { return { id: r.id, items: r.items.map(function (it) { return it.id; }), focus: mediaCol(r).i }; }),
      row: t.id === 'home' && t.f.zone === 'media' ? M.rows[t.f.mr] && M.rows[t.f.mr].id : null,
      layout: layoutNow(), featured: M.featured.map(function (it) { return it.id; }), featuredIndex: W.i, zone: t.id === 'home' ? t.f.zone : null,
      bands: layoutNow() === 'watch' ? wBands().map(function (b) { return b.key; }) : [], settings: M.settings, saving: M.saving, note: M.note, step: t.step || null };
    return JSON.parse(JSON.stringify(out));
  };
  QA.where = function () {
    var action = focusedAction(), active = stage.querySelectorAll('.is-focus[data-action]'), count = 0, name = '';
    Array.prototype.forEach.call(active, function (el) { if (renderedAction(el)) { count++; if (el.getAttribute('data-action') === action) name = el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim(); } });
    return { view: top().id, settingsGroup: top().id === 'wallpaper' ? 'wallpaper' : top().id === 'appearance' ? top().group : null, focus: name, focusAction: action, focusCount: count, wallpaper: S.wallShown, zone: top().f.zone || null };
  };
  QA.ready = function () { return fontsReady && !S.pending && !!S.shown && S.shown.bg === S.c.bg && S.shown.wall === S.c.wall && S.shown.font === S.c.font; };
  QA.nav = function () { var keys = arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments); keys.forEach(function (key) { if (!NAV[key]) throw new Error('Unknown key'); press(NAV[key]); }); return QA.state(); };
  QA.look = function (patch) { setLook(patch, {}); return QA.state(); };
  QA.scene = function (name) { if (['home', 'apps', 'settings', 'appearance', 'editor'].indexOf(name) < 0) throw new Error('Unknown view'); goScene(name); return QA.state(); };
  QA.activate = function (action) { return activate(action) ? QA.state() : null; };
  QA.typeAddress = function (value) { var t = top(); if (t.id !== 'connect' || t.step !== 'address') throw new Error('Connect is not open'); t.text = String(value).slice(0, 64); t.error = ''; render(); return QA.state(); };
  QA.actions = function () { var view = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl; return Array.prototype.filter.call(view.querySelectorAll('[data-action]'), renderedAction).map(function (el) { return el.getAttribute('data-action'); }); };

  /* ---------- Start ---------- */
  cueL.innerHTML = icon('left'); cueR.innerHTML = icon('right');
  initialise();
  M.cfg = Media.config();
  if (M.cfg) { setHome(Media.cachedHome()); refreshMedia(true); }
  refreshInputs();
  if (!catalog.loaded) refreshCatalog();
  setLook({}, { transient: true, startup: true });
  norm(); render(); fit(); focusStage(); updateClock(); syncRotation(); armSaver();
})();
