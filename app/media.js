/* Lobby server client: the Lobby Emby plugin's TV API. Network calls live here,
   as Tizen calls live in device.js. Nothing is sent until the owner pairs this TV. */
(function () {
  'use strict';
  var SERVER_KEY = 'lobby.server.v1', CACHE_KEY = 'lobby.home.cache.v1', DEFAULT_PORT = 8096;

  function read(key) {
    try { var raw = localStorage.getItem(key), v = raw ? JSON.parse(raw) : null; return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }
    catch (e) { return null; }
  }
  function store(key, value) {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function validUrl(url) { return typeof url === 'string' && /^https?:\/\/[A-Za-z0-9.\-\[\]:]{1,255}$/.test(url); }

  /* Saved pairing: { url, token, tvName }. */
  function config() {
    var c = read(SERVER_KEY);
    return c && validUrl(c.url) && typeof c.token === 'string' && c.token.length >= 16 ? { url: c.url, token: c.token, tvName: typeof c.tvName === 'string' ? c.tvName.slice(0, 80) : '' } : null;
  }
  function save(url, token, tvName) { return store(SERVER_KEY, { url: url, token: token, tvName: tvName || '' }); }
  function forget() { store(SERVER_KEY, null); store(CACHE_KEY, null); }

  /* "192.168.1.10" -> "http://192.168.1.10:8096". Returns null for anything else. */
  function normalise(text) {
    var s = String(text || '').trim().replace(/\/+$/, ''), scheme = 'http', m;
    m = /^(https?):\/\//i.exec(s);
    if (m) { scheme = m[1].toLowerCase(); s = s.slice(m[0].length); }
    m = /^([A-Za-z0-9](?:[A-Za-z0-9.\-]{0,251}[A-Za-z0-9])?)(?::(\d{1,5}))?$/.exec(s);
    if (!m) return null;
    if (/^[\d.]+$/.test(m[1]) && !/^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(m[1])) return null;
    var port = m[2] ? Number(m[2]) : DEFAULT_PORT;
    if (port < 1 || port > 65535) return null;
    return scheme + '://' + m[1] + ':' + port;
  }
  function host(url) { return String(url || '').replace(/^https?:\/\//, ''); }

  function parse(text) { try { return text ? JSON.parse(text) : null; } catch (e) { return null; } }
  /* Bounded JSON request. Errors: { code: network|timeout|unauthorized|missing|http, status, message }. */
  function request(method, url, body, token, timeout, done) {
    var xhr = new XMLHttpRequest(), finished = false, timer;
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    timer = setTimeout(function () { try { xhr.abort(); } catch (e) { /* already closed */ } finish({ code: 'timeout', message: 'The server took too long to answer.' }); }, timeout || 10000);
    try {
      xhr.open(method, url, true);
      xhr.setRequestHeader('Accept', 'application/json');
      if (body !== undefined) xhr.setRequestHeader('Content-Type', 'application/json');
      // A standard header Emby's CORS policy already allows; the plugin also accepts X-Lobby-Token.
      if (token) xhr.setRequestHeader('Authorization', 'Lobby ' + token);
      xhr.onload = function () {
        var data = parse(xhr.responseText), text = data && (data.Message || data.message) || String(xhr.responseText || '').slice(0, 200);
        if (xhr.status >= 200 && xhr.status < 300) finish(null, data);
        else if (xhr.status === 401) finish({ code: 'unauthorized', status: 401, message: text || 'This TV is not paired.' });
        else if (xhr.status === 404) finish({ code: 'missing', status: 404, message: text || 'Not found.' });
        else finish({ code: 'http', status: xhr.status, message: text || 'The server returned an error (' + xhr.status + ').' });
      };
      xhr.onerror = function () { finish({ code: 'network', message: 'The server could not be reached.' }); };
      xhr.send(body !== undefined ? JSON.stringify(body) : null);
    } catch (err) { finish({ code: 'network', message: err && err.message || 'The server could not be reached.' }); }
  }
  function api(method, path, body, done, timeout) {
    var c = config();
    if (!c) { done({ code: 'unpaired', message: 'This TV is not connected to an Emby server.' }); return; }
    request(method, c.url + '/emby/Lobby' + path, body, c.token, timeout, done);
  }

  /* Before pairing: is there an Emby server at this address? */
  function probe(url, done) {
    request('GET', url + '/emby/System/Info/Public', undefined, null, 8000, function (err, info) {
      if (err) { done(err); return; }
      if (!info || typeof info.Version !== 'string') { done({ code: 'notemby', message: 'That address answered, but it isn’t an Emby server.' }); return; }
      done(null, { name: String(info.ServerName || 'Emby').slice(0, 80), version: info.Version.slice(0, 20) });
    });
  }
  function startPairing(url, deviceName, duid, done) {
    request('POST', url + '/emby/Lobby/Pair', { DeviceName: deviceName || 'Samsung TV', Duid: duid || null }, null, 10000, done);
  }
  function pairingStatus(url, id, secret, done) {
    request('GET', url + '/emby/Lobby/Pair/Status?PairingId=' + encodeURIComponent(id) + '&Secret=' + encodeURIComponent(secret), undefined, null, 10000, done);
  }

  function cachedHome() { var c = read(CACHE_KEY); if (c && c.data && Array.isArray(c.data.Rows)) { allowThumbs(c.data); return c.data; } return null; }
  function home(done) {
    api('GET', '/Home', undefined, function (err, data) {
      if (!err && data && Array.isArray(data.Rows)) { store(CACHE_KEY, { at: Date.now(), data: data }); allowThumbs(data); }
      done(err, data);
    }, 15000);
  }

  /* The game-thumbs base URL the paired server reports (when enabled), so the TV may load matchup
     images from that one host. Captured from each home response; empty disables the allowance. */
  var thumbsBase = '';
  function allowThumbs(data) {
    var b = data && typeof data.GameThumbsBase === 'string' ? data.GameThumbsBase : '';
    thumbsBase = /^https?:\/\/[^/]+$/.test(b) ? b : '';
  }

  /* Emby paths are server-relative; TMDB posters and game-thumbs matchups are already absolute. */
  function image(path, width) {
    var c = config();
    if (typeof path !== 'string' || !path) return '';
    if (/^https:\/\/image\.tmdb\.org\//.test(path)) return path;
    if (thumbsBase && path.indexOf(thumbsBase + '/') === 0) return path;
    if (!c || path.charAt(0) !== '/' || path.charAt(1) === '/') return '';
    return c.url + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'maxWidth=' + Math.round(width || 400) + '&quality=85';
  }

  window.LobbyMedia = {
    config: config, save: save, forget: forget, normalise: normalise, host: host,
    probe: probe, startPairing: startPairing, pairingStatus: pairingStatus,
    home: home, cachedHome: cachedHome, image: image,
    settings: function (done) { api('GET', '/Settings', undefined, done); },
    saveSettings: function (patch, done) { api('POST', '/Settings', patch, done); },
    resetSettings: function (done) { api('POST', '/Settings/Reset', {}, done); },
    teams: function (done) { api('GET', '/Sports/Teams?Days=7', undefined, done, 20000); },
    requesters: function (done) { api('GET', '/Requesters', undefined, done); },
    details: function (mediaType, tmdbId, done) { api('GET', '/Details?MediaType=' + encodeURIComponent(mediaType) + '&TmdbId=' + encodeURIComponent(tmdbId), undefined, done, 15000); },
    request: function (body, done) { api('POST', '/Request', body, done, 20000); },
    play: function (itemId, action, done) { api('POST', '/Play', { ItemId: itemId, Action: action }, done); },
    dismissResume: function (itemId, done) { api('POST', '/Resume/Dismiss', { ItemId: itemId }, done); },
    search: function (query, done) { api('GET', '/Search?query=' + encodeURIComponent(query), undefined, done, 15000); }
  };
}());
