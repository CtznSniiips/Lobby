/* Public Tizen application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  var IDS = {
    stremio: 'IkWsFHtOY9.Stremio', netflix: 'org.tizen.netflix-app',
    disneyplus: 'MCmYXNxgcu.DisneyPlus', youtube: '9Ur5IzDKqV.TizenYouTube',
    appletv: 'com.samsung.tv.aria-video', primevideo: 'org.tizen.primevideo',
    abciview: 'mWK87Xghap.ABCiview', sbs: 'OyE7OuxlUi.SBSOnDemand',
    applemusic: 'org.tizen.apple.apple-music'
  };
  var STREAMING = ['as6cYRgkPy.Binge', '73iTZRTc34.Stan', '5b8c3eb16b.BeamCTVDev',
    'cj37Ni3qXM.HBONow', 'LBUAQX1exg.Hulu', 'gzcc4LRFBF.Peacock', 'rJyOSqC6Up.CBSAllAccess',
    'Rk72oKFsRS.OtterKidsProd', '70fRFUwYlD.OtterGAProd', 'PvWgqxV3Xa.YouTubeTV',
    'XtU8fQk2gN.ESPN', 'ZmmGjO6VKO.slingtv', 'VtuWAiZdHN.STARZPlay', 'ckfgqqzvt0.dplus',
    'kk8MbItQ0H.VUDU', 'Jz7aUrV2Q4.Twitch', 'OK2Rdkjmsi.IMDbTV', 'Ob3XhAVMu6.amcplus',
    'KaLitts8bq.tenplaySamsungTizen', 'eYuOiOLYQX.KayoSports', 'Ne2ZsPWdKl.9NOW',
    '3KA0pm7a7V.TubiTV', 'rJeHak5zRg.Spotify', 'icp4AvUPiA.7plus'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var EXTRA_BRANDS = {'vYmY3ACVaa.emby': 'emby', 'rJeHak5zRg.Spotify': 'spotify', '5b8c3eb16b.BeamCTVDev': 'hbomax', 'cj37Ni3qXM.HBONow': 'hbomax', '3KA0pm7a7V.TubiTV': 'tubi'};
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'd0m1lV1nt2.emanual', '2022ePop01.SmartTV',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = 'lobbyTV001.Lobby';
  function api() { return window.tizen && window.tizen.application; }
  function selfId() {
    try { return api().getCurrentApplication().appInfo.id || SELF; }
    catch (err) { return SELF; }
  }
  function unavailable(done) {
    done({ message: 'Open Lobby on the TV to use this control.', detail: 'The web preview cannot control the TV.' });
  }
  function failure(err) {
    return { message: 'The TV could not open this screen.', detail: err && (err.message || err.name) || 'Try again, or press the remote’s Home button to return to CleanFrame.' };
  }
  function bounded(done, timeout) {
    var finished = false, timer = setTimeout(function () { finish({ message: 'The TV did not respond. Please try again.' }); }, timeout || 8000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    return finish;
  }
  function launchApp(id, done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try { api().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }
  function launch(brand, done) {
    if (!IDS[brand]) { done({message: 'This app has no launch target.'}); return; }
    launchApp(IDS[brand], done);
  }
  function art(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      var data = [new tizen.ApplicationControlData('mode', ['fullscreen']), new tizen.ApplicationControlData('requester', ['mobile'])];
      var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, data);
      api().launchAppControl(control, 'org.tizen.art-app', function () { finish(null); }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  function home(done) { launchApp('com.samsung.tv.csfs', done); }
  /* Emby for Samsung. Lobby asks the Emby server to queue playback first, then opens the app. */
  var EMBY = 'vYmY3ACVaa.emby';
  function emby(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      api().launch(EMBY, function () { finish(null); }, function (err) {
        finish(err && err.name === 'NotFoundError'
          ? { message: 'Emby isn’t installed on this TV.', detail: 'Install Emby from the Samsung app store, then try again.' }
          : failure(err));
      });
    } catch (err) { finish(failure(err)); }
  }
  /* HDMI inputs, through Samsung's public SystemInfo and TVWindow APIs: point the main picture at the
     source, then open Samsung's TV viewer to show it full screen. */
  var VIEWER = 'org.tizen.tv-viewer';
  function sources(info) {
    function tag(list, on) { return (Array.isArray(list) ? list : []).map(function (s) { return { s: s, on: on }; }); }
    return info ? tag(info.connected, true).concat(tag(info.disconnected, false)) : [];
  }
  function hdmi(s) { return !!s && s.type === 'HDMI' && typeof s.number === 'number' && s.number >= 1 && s.number <= 9; }
  function inputs(done) {
    var t = window.tizen;
    if (!t || !t.systeminfo || !t.tvwindow) { done(null, []); return; }
    var finish = bounded(done, 8000);
    try {
      t.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        var seen = {}, out = [];
        sources(info).forEach(function (e) {
          if (!hdmi(e.s) || seen[e.s.number]) return;
          seen[e.s.number] = true;
          // Some firmware reports the name given in the TV's source list.
          var name = typeof e.s.editName === 'string' ? e.s.editName.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
          out.push({ number: e.s.number, connected: e.on, name: /^hdmi\s*\d$/i.test(name) ? '' : name });
        });
        out.sort(function (a, b) { return a.number - b.number; });
        finish(null, out);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  function input(number, done) {
    var t = window.tizen;
    if (!t || !t.systeminfo || !t.tvwindow || !api()) { unavailable(done); return; }
    var finish = bounded(done, 10000);
    try {
      t.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        var match = sources(info).filter(function (e) { return hdmi(e.s) && e.s.number === number; })[0];
        if (!match) { finish({ message: 'HDMI ' + number + ' isn’t available on this TV.', detail: '' }); return; }
        try {
          // Pass the TV's own source object: firmware rejects a rebuilt one.
          t.tvwindow.setSource(match.s, function () {
            try { api().launch(VIEWER, function () { finish(null); }, function (err) { finish(failure(err)); }); }
            catch (err) { finish(failure(err)); }
          }, function (err) { finish(failure(err)); }, 'MAIN');
        } catch (err) { finish(failure(err)); }
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  /* Samsung's product API is only loaded on the TV, and only when pairing needs it. */
  function identity(done) {
    var result = { name: 'Samsung TV', duid: null }, finished = false, script;
    function read() {
      try {
        var p = window.webapis && window.webapis.productinfo;
        if (p) {
          result.duid = p.getDuid ? String(p.getDuid() || '') || null : null;
          var model = p.getRealModel ? p.getRealModel() : p.getModel ? p.getModel() : '';
          if (model) result.name = 'Samsung ' + String(model).slice(0, 40);
        }
      } catch (err) { /* keep the generic name */ }
    }
    function finish() { if (finished) return; finished = true; read(); done(result); }
    if (window.webapis || !window.tizen || !window.tizen.systeminfo) { finish(); return; }
    try {
      script = document.createElement('script');
      script.src = '$WEBAPIS/webapis/webapis.js';
      script.onload = finish; script.onerror = finish;
      document.head.appendChild(script);
      setTimeout(finish, 3000);
    } catch (err) { finish(); }
  }
  /* Number keys on remotes that have them, for typing a server address. */
  function digits() {
    try {
      var input = window.tizen && window.tizen.tvinputdevice;
      if (!input || digits.done) return;
      var names = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Minus'];
      if (input.registerKeyBatch) input.registerKeyBatch(names);
      else names.forEach(function (name) { input.registerKey(name); });
      digits.done = true;
    } catch (err) { /* arrows and OK still work */ }
  }
  function settings(done) { launchApp('com.samsung.tv.coba.setting', done); }
  function apps(done) {
    if (!api()) { unavailable(done); return; }
    // Large installed catalogues can take longer than a launch response.
    var finish = bounded(done, 20000);
    try {
      api().getAppsInfo(function (list) {
        var known = {}, seen = {}, result = [], self = selfId();
        Object.keys(IDS).forEach(function (brand) { known[IDS[brand]] = brand; });
        list.forEach(function (a) {
          var primary = !!known[a.id], stream = STREAMING.indexOf(a.id) >= 0;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === self || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!primary && !stream && (!a.show || !consumer))) return;
          if (!primary && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, brand: known[a.id] || EXTRA_BRANDS[a.id] || '', icon: a.iconPath || '', rank: primary ? Object.keys(IDS).indexOf(known[a.id]) : (stream ? 20 : 30) });
        });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        finish(null, result);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  window.FrameDevice = { launch: launch, launchApp: launchApp, art: art, home: home, settings: settings, apps: apps, emby: emby, identity: identity, digits: digits, inputs: inputs, input: input };
}());
