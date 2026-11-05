// Test the Lobby server client's address handling and pairing storage. No network access.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../app/media.js', import.meta.url), 'utf8');
function client(seed = {}) {
  const store = new Map(Object.entries(seed));
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const window = {};
  vm.runInNewContext(source, { window, localStorage, setTimeout, clearTimeout, XMLHttpRequest: function () { throw Error('no network in tests'); }, encodeURIComponent });
  return { media: window.LobbyMedia, store };
}

test('IP addresses default to http and port 8096', () => {
  const { media } = client();
  assert.equal(media.normalise('192.168.1.10'), 'http://192.168.1.10:8096');
  assert.equal(media.normalise(' 192.168.1.10:8920 '), 'http://192.168.1.10:8920');
});

test('hostnames always use https, defaulting to port 443', () => {
  const { media } = client();
  assert.equal(media.normalise('emby.home.lan'), 'https://emby.home.lan:443');
  // An explicit http:// is overridden: a hostname is never reached over plain http.
  assert.equal(media.normalise('https://emby.home.lan/'), 'https://emby.home.lan:443');
  assert.equal(media.normalise('http://emby.home.lan'), 'https://emby.home.lan:443');
  // An explicit port is kept.
  assert.equal(media.normalise('emby:8920'), 'https://emby:8920');
  // Hostnames are stored lower-cased, however they were typed (e.g. from the TV's keyboard).
  assert.equal(media.normalise('EMBY.Home.LAN:8920'), 'https://emby.home.lan:8920');
});

test('invalid addresses are refused', () => {
  const { media } = client();
  for (const bad of ['', '192.168.1', '300.1.1.1', '192.168.1.10:0', '192.168.1.10:70000', '1.2.3.4/path', 'ftp://x', 'a b', '..']) assert.equal(media.normalise(bad), null, bad);
});

test('pairing is saved, read back and forgotten with its cache', () => {
  const { media, store } = client();
  assert.equal(media.config(), null);
  assert.equal(media.save('http://10.0.0.5:8096', 'tok_0123456789abcdef', 'Living Room'), true);
  assert.deepEqual({ ...media.config() }, { url: 'http://10.0.0.5:8096', token: 'tok_0123456789abcdef', tvName: 'Living Room' });
  store.set('lobby.home.cache.v1', JSON.stringify({ data: { Rows: [] } }));
  media.forget();
  assert.equal(media.config(), null);
  assert.equal(store.has('lobby.home.cache.v1'), false);
});

test('tampered or partial storage is ignored', () => {
  for (const raw of ['nope', '[]', JSON.stringify({ url: 'javascript:alert(1)', token: 'tok_0123456789abcdef' }), JSON.stringify({ url: 'http://x:1', token: 'short' })]) {
    const { media } = client({ 'lobby.server.v1': raw });
    assert.equal(media.config(), null, raw);
  }
});

test('images: Emby paths are sized on the paired server, TMDB passes through, others are dropped', () => {
  const { media } = client({ 'lobby.server.v1': JSON.stringify({ url: 'http://10.0.0.5:8096', token: 'tok_0123456789abcdef' }) });
  assert.equal(media.image('/emby/Items/1/Images/Primary?tag=a', 400), 'http://10.0.0.5:8096/emby/Items/1/Images/Primary?tag=a&maxWidth=400&quality=85');
  assert.equal(media.image('https://image.tmdb.org/t/p/w342/x.jpg'), 'https://image.tmdb.org/t/p/w342/x.jpg');
  assert.equal(media.image('//evil.example/x.jpg'), '');
  assert.equal(media.image('https://evil.example/x.jpg'), '');
  assert.equal(media.image(''), '');
});

test('API calls without a pairing fail locally', () => {
  const { media } = client();
  let error;
  media.home(err => { error = err; });
  assert.equal(error.code, 'unpaired');
});
