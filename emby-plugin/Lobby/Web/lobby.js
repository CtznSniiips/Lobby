define([], function () {
    'use strict';

    // ---- helpers ------------------------------------------------------------------------------

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function api(method, path, body) {
        var url = ApiClient.getUrl(path);
        var request = method === 'GET'
            ? ApiClient.getJSON(url)
            : ApiClient.ajax({
                type: method,
                url: url,
                data: JSON.stringify(body || {}),
                contentType: 'application/json',
                dataType: 'json'
            });

        return request.catch(function (response) {
            // ApiClient rejects with the fetch Response; surface the server's message.
            if (response && typeof response.text === 'function') {
                return response.text().then(function (text) {
                    var message = text;
                    try {
                        var parsed = JSON.parse(text);
                        message = parsed.Message || parsed.message || text;
                    } catch (e) { /* plain text */ }
                    throw new Error(message || ('HTTP ' + response.status));
                });
            }
            throw response instanceof Error ? response : new Error(String(response));
        });
    }

    function ago(iso) {
        if (!iso) { return 'never'; }
        var seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
        if (seconds < 90) { return 'just now'; }
        if (seconds < 5400) { return Math.round(seconds / 60) + ' min ago'; }
        if (seconds < 129600) { return Math.round(seconds / 3600) + ' h ago'; }
        return Math.round(seconds / 86400) + ' days ago';
    }

    function show(el, text, ok) {
        if (!el) { return; }
        el.textContent = text || '';
        el.className = 'cf-message' + (text ? (ok ? ' ok' : ' err') : '');
    }

    function loading(on) {
        if (on) { Dashboard.showLoadingMsg(); } else { Dashboard.hideLoadingMsg(); }
    }

    function userOptions(users, selectedId) {
        var html = '<option value="">Choose a user…</option>';
        users.forEach(function (u) {
            html += '<option value="' + esc(u.Id) + '"' + (u.Id === selectedId ? ' selected' : '') + '>' +
                esc(u.Name) + (u.IsDisabled ? ' (disabled)' : '') + '</option>';
        });
        return html;
    }

    function deviceOptions(sessions, selectedId, duid) {
        var html = '<option value="">' + (duid ? 'Match automatically by TV hardware ID' : 'Not set yet') + '</option>';
        var found = false;
        sessions.forEach(function (s) {
            var selected = s.DeviceId === selectedId;
            found = found || selected;
            var label = (s.DeviceName || 'Unknown device') + ' · ' + (s.Client || '?') +
                (s.UserName ? ' · ' + s.UserName : '') + ' · ' + ago(s.LastActivityUtc);
            html += '<option value="' + esc(s.DeviceId) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>';
        });
        if (selectedId && !found) {
            html += '<option value="' + esc(selectedId) + '" selected>' + esc(selectedId) + ' (not seen recently)</option>';
        }
        return html;
    }

    function tvFields(prefix, values, state) {
        return '' +
            '<div class="cf-grid">' +
            '  <div class="cf-field"><label>Name</label><input data-f="Name" value="' + esc(values.Name) + '" /></div>' +
            '  <div class="cf-field"><label>Emby user this TV acts as</label><select data-f="EmbyUserId">' + userOptions(state.EmbyUsers, values.EmbyUserId) + '</select></div>' +
            '  <div class="cf-field"><label>Emby app on this TV</label><select data-f="EmbyDeviceId">' + deviceOptions(state.Sessions, values.EmbyDeviceId, values.Duid) + '</select></div>' +
            '  <div class="cf-field"><label>Sports teams (comma separated)</label><textarea data-f="SportsTeams" placeholder="e.g. Maple Leafs, Blue Jays">' + esc((values.SportsTeams || []).join(', ')) + '</textarea></div>' +
            '</div>' +
            '<div class="cf-field" style="margin-top:.8em;"><label class="cf-toggle"><input type="checkbox" data-f="WeatherEnabled"' + (values.WeatherEnabled ? ' checked' : '') + ' /> Show weather on this TV\u2019s Watch screen</label></div>' +
            '<div class="cf-field"><label>Weather location (ZIP / postal code)</label>' +
            '  <div style="display:flex;gap:.5em;align-items:center;flex-wrap:wrap;">' +
            '    <input class="wx-zip" type="text" placeholder="e.g. 10001" style="max-width:9em;" />' +
            '    <input class="wx-country" type="text" placeholder="US" maxlength="2" style="max-width:4em;" />' +
            '    <button type="button" class="cf-btn" data-act="weather-zip">Find</button>' +
            '    <button type="button" class="cf-btn" data-act="weather-geo">Use my location</button>' +
            '  </div>' +
            '  <div class="cf-hint wx-msg">Fills in the coordinates below. Weather is from Open-Meteo (free, no account).</div>' +
            '</div>' +
            '<div class="cf-grid">' +
            '  <div class="cf-field"><label>Latitude</label><input data-f="WeatherLatitude" type="text" value="' + esc(values.WeatherLatitude ? String(values.WeatherLatitude) : '') + '" /></div>' +
            '  <div class="cf-field"><label>Longitude</label><input data-f="WeatherLongitude" type="text" value="' + esc(values.WeatherLongitude ? String(values.WeatherLongitude) : '') + '" /></div>' +
            '</div>' +
            '<div class="cf-field" style="margin-top:.8em;"><label class="cf-toggle"><input type="checkbox" data-f="WeatherFahrenheit"' + (values.WeatherFahrenheit ? ' checked' : '') + ' /> Show \u00b0F</label></div>';
    }

    function readFields(card) {
        var out = {};
        Array.prototype.forEach.call(card.querySelectorAll('[data-f]'), function (el) {
            out[el.getAttribute('data-f')] = el.type === 'checkbox' ? el.checked : el.value;
        });
        return out;
    }

    // ---- controller ---------------------------------------------------------------------------

    return function (view) {
        var state = null;
        var seerrUsers = [];
        var links = [];

        function $(sel) { return view.querySelector(sel); }
        function cf(name) { return view.querySelector('[data-cf="' + name + '"]'); }

        function seerrName(id) {
            for (var i = 0; i < seerrUsers.length; i++) {
                if (seerrUsers[i].Id === id) { return seerrUsers[i].Name; }
            }
            for (var j = 0; j < links.length; j++) {
                if (links[j].SeerrUserId === id && links[j].SeerrDisplayName) { return links[j].SeerrDisplayName; }
            }
            return 'Seerr user ' + id;
        }

        // ---- TVs ----

        function renderPending() {
            var el = cf('pending');
            if (!state.PendingPairings.length) {
                el.innerHTML = '';
                return;
            }
            el.innerHTML = state.PendingPairings.map(function (p) {
                var values = { Name: p.DeviceName, EmbyDeviceId: p.SuggestedEmbyDeviceId, Duid: p.Duid, SportsTeams: [] };
                return '<div class="cf-card" data-code="' + esc(p.Code) + '">' +
                    '<div class="cf-card-head"><span class="cf-code">' + esc(p.Code) + '</span>' +
                    '<span class="cf-card-title">Waiting to pair: ' + esc(p.DeviceName) + '</span>' +
                    '<span class="cf-status">started ' + esc(ago(p.CreatedUtc)) + '. Check the code matches the TV.</span></div>' +
                    tvFields('p', values, state) +
                    '<div class="cf-actions">' +
                    '  <button type="button" class="cf-btn cf-btn-primary" data-act="approve">Approve</button>' +
                    '  <button type="button" class="cf-btn cf-btn-danger" data-act="reject">Reject</button>' +
                    '</div><div class="cf-message"></div></div>';
            }).join('');
        }

        function renderTvs() {
            var el = cf('tvs');
            if (!state.Tvs.length) {
                el.innerHTML = state.PendingPairings.length ? '' :
                    '<div class="cf-empty">No TVs paired yet. Start pairing from Lobby on the TV.</div>';
                return;
            }
            el.innerHTML = state.Tvs.map(function (t) {
                var appStatus = t.EmbyAppControllable
                    ? '<span class="cf-dot ok"></span>Emby app connected'
                    : (t.EmbyAppLastSeenUtc
                        ? '<span class="cf-dot warn"></span>Emby app last seen ' + esc(ago(t.EmbyAppLastSeenUtc))
                        : '<span class="cf-dot"></span>Emby app not found yet');
                return '<div class="cf-card" data-tv="' + esc(t.Id) + '">' +
                    '<div class="cf-card-head"><span class="cf-card-title">' + esc(t.Name) + '</span>' +
                    '<span class="cf-status">' + appStatus + ' · Lobby last seen ' + esc(ago(t.LastSeenUtc)) +
                    (t.EmbyUserName ? ' · as ' + esc(t.EmbyUserName) : ' · <b>no Emby user</b>') + '</span></div>' +
                    '<div class="cf-summary">' + (t.SettingsCustomized ? '<b>Settings changed on the TV</b>' : 'Using the TV defaults below') +
                    ': ' + esc((t.VisibleRows || []).join(', ') || 'no rows') + ' · ' + t.RowLimit + ' per row · play delay ' +
                    t.PlayDelayMs + ' ms · wait ' + t.PlayTimeoutSeconds + ' s</div>' +
                    tvFields('t', t, state) +
                    '<div class="cf-actions">' +
                    '  <button type="button" class="cf-btn cf-btn-primary" data-act="save-tv">Save</button>' +
                    (t.SettingsCustomized ? '  <button type="button" class="cf-btn" data-act="reset-tv">Reset TV settings to defaults</button>' : '') +
                    '  <button type="button" class="cf-btn cf-btn-danger" data-act="delete-tv">Unpair</button>' +
                    '</div><div class="cf-message"></div></div>';
            }).join('');
        }

        // ---- Seerr / settings ----

        function renderFallback() {
            var select = $('#cfFallback');
            var current = state.Settings.FallbackSeerrUserId || 0;
            var html = '<option value="0">Nobody – block requests</option>';
            var found = current === 0;
            seerrUsers.forEach(function (u) {
                found = found || u.Id === current;
                html += '<option value="' + u.Id + '"' + (u.Id === current ? ' selected' : '') + '>' + esc(u.Name) + '</option>';
            });
            if (!found) {
                html += '<option value="' + current + '" selected>' + esc(seerrName(current)) + '</option>';
            }
            select.innerHTML = html;
        }

        function renderSettings() {
            var s = state.Settings;
            $('#cfSeerrUrl').value = s.SeerrUrl || '';
            $('#cfSeerrKey').value = '';
            $('#cfSeerrKey').placeholder = s.HasSeerrApiKey ? 'Saved. Leave blank to keep it' : 'Paste your Seerr API key';
            $('#cfRequestsEnabled').checked = !!s.RequestsEnabled;
            $('#cfGameThumbsUrl').value = s.GameThumbsUrl || '';
            ['ShowContinueWatching', 'ShowNextUp', 'ShowRecentlyAdded', 'ShowLiveNow', 'ShowSports', 'ShowSeerrTrending',
                'ShowSeerrPopularMovies', 'ShowSeerrPopularShows', 'SportsLiveOnly', 'GameThumbsEnabled'].forEach(function (k) {
                $('#cf' + k).checked = !!s[k];
            });
            ['RowLimit', 'SportsLookaheadHours', 'PlayDelayMs', 'PlayTimeoutSeconds', 'RememberRequesterMinutes', 'GameThumbsStyle'].forEach(function (k) {
                $('#cf' + k).value = s[k];
            });
            renderFallback();
        }

        function collectSettings() {
            var s = {
                SeerrUrl: $('#cfSeerrUrl').value.trim(),
                SeerrApiKey: $('#cfSeerrKey').value.trim(),
                RequestsEnabled: $('#cfRequestsEnabled').checked,
                FallbackSeerrUserId: parseInt($('#cfFallback').value, 10) || 0,
                GameThumbsUrl: $('#cfGameThumbsUrl').value.trim()
            };
            ['ShowContinueWatching', 'ShowNextUp', 'ShowRecentlyAdded', 'ShowLiveNow', 'ShowSports', 'ShowSeerrTrending',
                'ShowSeerrPopularMovies', 'ShowSeerrPopularShows', 'SportsLiveOnly', 'GameThumbsEnabled'].forEach(function (k) {
                s[k] = $('#cf' + k).checked;
            });
            ['RowLimit', 'SportsLookaheadHours', 'PlayDelayMs', 'PlayTimeoutSeconds', 'RememberRequesterMinutes', 'GameThumbsStyle'].forEach(function (k) {
                s[k] = parseInt($('#cf' + k).value, 10) || 0;
            });
            return s;
        }

        // ---- links ----

        function renderLinks() {
            var body = cf('links');
            body.innerHTML = state.EmbyUsers.map(function (u) {
                var mine = links.filter(function (l) { return l.EmbyUserId === u.Id; });
                var chips = mine.map(function (l) {
                    var suggested = l.Source === 'suggested';
                    return '<span class="cf-chip' + (suggested ? ' suggested' : '') + '">' +
                        esc(seerrName(l.SeerrUserId)) + ' <span class="cf-badge">' + esc(l.Source) + '</span>' +
                        (suggested ? '<button type="button" title="Confirm" data-confirm="' + esc(u.Id) + ':' + l.SeerrUserId + '">✓</button>' : '') +
                        '<button type="button" title="Remove" data-remove="' + esc(u.Id) + ':' + l.SeerrUserId + '">×</button></span>';
                }).join('');
                var taken = mine.map(function (l) { return l.SeerrUserId; });
                var options = seerrUsers.filter(function (s) { return taken.indexOf(s.Id) < 0; }).map(function (s) {
                    return '<option value="' + s.Id + '">' + esc(s.Name) + (s.Email ? ' · ' + esc(s.Email) : '') + '</option>';
                }).join('');
                var add = seerrUsers.length
                    ? '<select class="cf-inline-select" data-add="' + esc(u.Id) + '"><option value="">+ Link Seerr account…</option>' + options + '</select>'
                    : '';
                return '<tr><td>' + esc(u.Name) + (u.IsDisabled ? ' <span class="cf-badge">disabled</span>' : '') + '</td>' +
                    '<td>' + (chips || '<span class="cf-status">Not linked </span>') + ' ' + add + '</td></tr>';
            }).join('');
        }

        // ---- updates ----

        function renderUpdateStatus(u) {
            var status = cf('update-status');
            var installBtn = cf('install-update');
            var help = cf('update-help');
            if (!u) {
                show(status, 'Checking for updates…', true);
                installBtn.hidden = true;
                help.hidden = true;
                return;
            }
            if (u.Error) {
                status.textContent = u.Error;
                installBtn.hidden = true;
                help.hidden = true;
                return;
            }
            if (u.UpdateAvailable) {
                status.innerHTML = 'Update available: <b>v' + esc(u.LatestVersion) + '</b> (running v' + esc(u.CurrentVersion) + ')' +
                    (u.ReleaseUrl ? ' — <a href="' + esc(u.ReleaseUrl) + '" target="_blank" rel="noopener">release notes</a>' : '');
                installBtn.hidden = false;
                help.hidden = false;
            } else {
                status.textContent = 'Up to date (v' + esc(u.CurrentVersion) + ').';
                installBtn.hidden = true;
                help.hidden = true;
            }
        }

        function checkUpdates(refresh) {
            return api('GET', 'Lobby/Admin/Updates/Check' + (refresh ? '?Refresh=true' : '')).then(function (u) {
                renderUpdateStatus(u);
            }, function (err) {
                renderUpdateStatus({ Error: err.message });
            });
        }

        // ---- loading ----

        function loadSeerrUsers(refresh) {
            if (!state.Settings.SeerrUrl || !state.Settings.HasSeerrApiKey) {
                seerrUsers = [];
                return Promise.resolve();
            }
            return api('GET', 'Lobby/Admin/Seerr/Users' + (refresh ? '?Refresh=true' : '')).then(function (result) {
                seerrUsers = result.Users || [];
                if (result.Error) {
                    show(cf('seerr-message'), result.Error, false);
                }
            }, function (err) {
                seerrUsers = [];
                show(cf('seerr-message'), err.message, false);
            });
        }

        function load(refreshSeerr) {
            loading(true);
            return api('GET', 'Lobby/Admin/State').then(function (result) {
                state = result;
                links = (state.Links || []).slice();
                return loadSeerrUsers(refreshSeerr);
            }).then(function () {
                renderPending();
                renderTvs();
                renderSettings();
                renderLinks();
            }).catch(function (err) {
                Dashboard.alert('Lobby: ' + err.message);
            }).then(function () {
                loading(false);
            });
        }

        // ---- events ----

        view.addEventListener('click', function (e) {
            var target = e.target;
            var name = target.getAttribute('data-cf');
            var act = target.getAttribute('data-act');

            if (name === 'refresh') {
                load(true);
            } else if (name === 'check-updates') {
                show(cf('update-message'), '', true);
                renderUpdateStatus(null);
                checkUpdates(true);
            } else if (name === 'install-update') {
                if (!window.confirm('Download the latest release and replace this plugin’s own file on disk? ' +
                    'Emby Server will keep running the old version until you restart it afterward.')) {
                    return;
                }
                var umsg = cf('update-message');
                show(umsg, 'Downloading…', true);
                target.disabled = true;
                api('POST', 'Lobby/Admin/Updates/Install', {}).then(function (r) {
                    target.disabled = false;
                    show(umsg, r.Message, r.Success);
                    if (r.Success) { checkUpdates(true); }
                }, function (err) {
                    target.disabled = false;
                    show(umsg, err.message, false);
                });
            } else if (name === 'test-seerr') {
                var msg = cf('seerr-message');
                show(msg, 'Testing…', true);
                api('POST', 'Lobby/Admin/Seerr/Test', {
                    SeerrUrl: $('#cfSeerrUrl').value.trim(),
                    SeerrApiKey: $('#cfSeerrKey').value.trim()
                }).then(function (r) { show(msg, r.Message, r.Ok); }, function (err) { show(msg, err.message, false); });
            } else if (name === 'save-settings') {
                // Report next to whichever Save was pressed (Seerr card or the defaults section).
                var smsg = target.closest('.cf-card') && target.closest('.cf-card').querySelector('[data-cf="seerr-message"]')
                    ? cf('seerr-message')
                    : cf('settings-message');
                loading(true);
                api('POST', 'Lobby/Admin/Settings', collectSettings()).then(function (settings) {
                    state.Settings = settings;
                    show(smsg, 'Settings saved.', true);
                    return loadSeerrUsers(true).then(function () { renderSettings(); renderLinks(); });
                }, function (err) { show(smsg, err.message, false); }).then(function () { loading(false); });
            } else if (name === 'sync-links') {
                var lmsg = cf('links-message');
                loading(true);
                api('POST', 'Lobby/Admin/Links/Sync', {}).then(function (report) {
                    links = (report.Links || []).slice();
                    show(lmsg, 'Synced: ' + report.SeerrUsers + ' Seerr users, ' + report.AutoLinked + ' auto-linked, ' +
                        report.Suggested + ' suggested, ' + report.ManualKept + ' manual kept.', true);
                    return loadSeerrUsers(true).then(renderLinks);
                }, function (err) { show(lmsg, err.message, false); }).then(function () { loading(false); });
            } else if (name === 'save-links') {
                var lmsg2 = cf('links-message');
                api('POST', 'Lobby/Admin/Links', { Links: links }).then(function (saved) {
                    links = (saved || []).slice();
                    renderLinks();
                    show(lmsg2, 'Links saved.', true);
                }, function (err) { show(lmsg2, err.message, false); });
            } else if (target.hasAttribute('data-confirm') || target.hasAttribute('data-remove')) {
                var confirm = target.hasAttribute('data-confirm');
                var parts = target.getAttribute(confirm ? 'data-confirm' : 'data-remove').split(':');
                var seerrId = parseInt(parts[1], 10);
                links = links.filter(function (l) {
                    if (l.EmbyUserId === parts[0] && l.SeerrUserId === seerrId) {
                        if (confirm) { l.Source = 'manual'; return true; }
                        return false;
                    }
                    return true;
                });
                renderLinks();
                show(cf('links-message'), 'Unsaved changes. Press Save links.', false);
            } else if (act) {
                var card = target.closest('.cf-card');
                var cardMsg = card.querySelector('.cf-message');
                var values = readFields(card);
                var call;
                if (act === 'approve') {
                    values.Code = card.getAttribute('data-code');
                    call = api('POST', 'Lobby/Admin/Pairings/Approve', values);
                } else if (act === 'reject') {
                    call = api('POST', 'Lobby/Admin/Pairings/Reject', { Code: card.getAttribute('data-code') });
                } else if (act === 'save-tv') {
                    values.Id = card.getAttribute('data-tv');
                    call = api('POST', 'Lobby/Admin/Tvs/Update', values);
                } else if (act === 'reset-tv') {
                    if (!window.confirm('Put this TV back on the default rows and timing? Its sports teams are kept.')) { return; }
                    call = api('POST', 'Lobby/Admin/Tvs/ResetSettings', { Id: card.getAttribute('data-tv') });
                } else if (act === 'delete-tv') {
                    if (!window.confirm('Unpair this TV? Lobby on it will need to pair again.')) { return; }
                    call = api('POST', 'Lobby/Admin/Tvs/Delete', { Id: card.getAttribute('data-tv') });
                } else if (act === 'weather-geo') {
                    var gmsg = card.querySelector('.wx-msg');
                    if (!navigator.geolocation) { show(gmsg, 'This browser has no location support.', false); return; }
                    show(gmsg, 'Asking this browser for its location\u2026', true);
                    navigator.geolocation.getCurrentPosition(function (pos) {
                        card.querySelector('[data-f="WeatherLatitude"]').value = pos.coords.latitude.toFixed(4);
                        card.querySelector('[data-f="WeatherLongitude"]').value = pos.coords.longitude.toFixed(4);
                        show(gmsg, 'Filled in. Save this TV to keep it.', true);
                    }, function () { show(gmsg, 'Could not get this browser\'s location.', false); });
                    return;
                } else if (act === 'weather-zip') {
                    var zmsg = card.querySelector('.wx-msg');
                    var zip = card.querySelector('.wx-zip').value.trim();
                    var country = (card.querySelector('.wx-country').value.trim() || 'us').toLowerCase();
                    if (!zip) { show(zmsg, 'Enter a ZIP / postal code first.', false); return; }
                    show(zmsg, 'Looking up ' + zip + '\u2026', true);
                    var zx = new XMLHttpRequest();
                    zx.open('GET', 'https://api.zippopotam.us/' + encodeURIComponent(country) + '/' + encodeURIComponent(zip), true);
                    zx.onload = function () {
                        if (zx.status >= 200 && zx.status < 300) {
                            try { var place = JSON.parse(zx.responseText).places[0];
                                card.querySelector('[data-f="WeatherLatitude"]').value = (+place.latitude).toFixed(4);
                                card.querySelector('[data-f="WeatherLongitude"]').value = (+place.longitude).toFixed(4);
                                show(zmsg, 'Found ' + place['place name'] + (place['state abbreviation'] ? ', ' + place['state abbreviation'] : '') + '. Save this TV to keep it.', true);
                            } catch (e) { show(zmsg, 'Unexpected response from the lookup service.', false); }
                        } else { show(zmsg, 'No match for that ZIP / postal code.', false); }
                    };
                    zx.onerror = function () { show(zmsg, 'Could not reach the lookup service.', false); };
                    zx.send();
                    return;
                }
                if (call) {
                    call.then(function () {
                        if (act === 'save-tv') {
                            show(cardMsg, 'Saved.', true);
                        } else {
                            load(false);
                        }
                    }, function (err) { show(cardMsg, err.message, false); });
                }
            }
        });

        view.addEventListener('change', function (e) {
            var embyId = e.target.getAttribute('data-add');
            if (!embyId || !e.target.value) { return; }
            var seerrId = parseInt(e.target.value, 10);
            links.push({ EmbyUserId: embyId, SeerrUserId: seerrId, Source: 'manual', SeerrDisplayName: seerrName(seerrId) });
            renderLinks();
            show(cf('links-message'), 'Unsaved changes. Press Save links.', false);
        });

        view.addEventListener('viewshow', function () {
            load(false);
            checkUpdates(false);
        });
    };
});
