using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lobby.Configuration;
using Lobby.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lobby.Controllers
{
    // ---- Views (all admin-only) ----------------------------------------------------------------

    public class TvEdit
    {
        public string Name { get; set; }
        public string JellyfinUserId { get; set; }
        public string JellyfinDeviceId { get; set; }

        /// <summary>Comma or newline separated.</summary>
        public string SportsTeams { get; set; }

        public bool WeatherEnabled { get; set; }
        public string WeatherLatitude { get; set; }
        public string WeatherLongitude { get; set; }
        public bool WeatherFahrenheit { get; set; }
    }

    public class ApprovePairingBody : TvEdit
    {
        public string Code { get; set; }
    }

    public class UpdateTvBody : TvEdit
    {
        public string Id { get; set; }
    }

    public class CodeBody
    {
        public string Code { get; set; }
    }

    public class IdBody
    {
        public string Id { get; set; }
    }

    public class SaveLinksBody
    {
        public UserLink[] Links { get; set; }
    }

    public class TestSeerrBody
    {
        public string SeerrUrl { get; set; }

        /// <summary>Leave empty to test with the saved key.</summary>
        public string SeerrApiKey { get; set; }
    }

    public class SettingsView
    {
        public string SeerrUrl { get; set; }

        /// <summary>Write-only. Empty keeps the saved key.</summary>
        public string SeerrApiKey { get; set; }
        public bool HasSeerrApiKey { get; set; }
        public bool RequestsEnabled { get; set; }
        public int FallbackSeerrUserId { get; set; }
        public int RowLimit { get; set; }
        public int SportsLookaheadHours { get; set; }
        public int PlayDelayMs { get; set; }
        public int PlayTimeoutSeconds { get; set; }
        public int RememberRequesterMinutes { get; set; }
        public bool ShowContinueWatching { get; set; }
        public bool ShowNextUp { get; set; }
        public bool ShowRecentlyAdded { get; set; }
        public bool ShowLiveNow { get; set; }
        public bool ShowSports { get; set; }
        public bool ShowSeerrTrending { get; set; }
        public bool ShowSeerrPopularMovies { get; set; }
        public bool ShowSeerrPopularShows { get; set; }
        public bool SportsLiveOnly { get; set; }
        public bool GameThumbsEnabled { get; set; }
        public string GameThumbsUrl { get; set; }
        public int GameThumbsStyle { get; set; }
    }

    public class TvView
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string JellyfinUserId { get; set; }
        public string JellyfinUserName { get; set; }
        public string JellyfinDeviceId { get; set; }
        public string Duid { get; set; }
        public string[] SportsTeams { get; set; }
        public bool WeatherEnabled { get; set; }
        public double WeatherLatitude { get; set; }
        public double WeatherLongitude { get; set; }
        public bool WeatherFahrenheit { get; set; }
        public string PairedUtc { get; set; }
        public string LastSeenUtc { get; set; }

        /// <summary>True when the TV has changed its own settings; false while it follows the defaults.</summary>
        public bool SettingsCustomized { get; set; }

        /// <summary>Titles of the rows this TV shows, in order.</summary>
        public string[] VisibleRows { get; set; }
        public int RowLimit { get; set; }
        public int PlayDelayMs { get; set; }
        public int PlayTimeoutSeconds { get; set; }
        public int SportsLookaheadHours { get; set; }

        /// <summary>The TV's Jellyfin app currently has a session that can be remote-controlled.</summary>
        public bool JellyfinAppControllable { get; set; }
        public string JellyfinAppLastSeenUtc { get; set; }
    }

    public class PairingView
    {
        public string Code { get; set; }
        public string DeviceName { get; set; }
        public string Duid { get; set; }
        public string CreatedUtc { get; set; }

        /// <summary>A Jellyfin session whose DeviceId equals the TV's DUID, if one exists.</summary>
        public string SuggestedJellyfinDeviceId { get; set; }
    }

    public class SessionView
    {
        public string DeviceId { get; set; }
        public string DeviceName { get; set; }
        public string Client { get; set; }
        public string ApplicationVersion { get; set; }
        public string UserName { get; set; }
        public string LastActivityUtc { get; set; }
        public bool SupportsRemoteControl { get; set; }
        public bool IsActive { get; set; }
    }

    public class JellyfinUserView
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public bool IsDisabled { get; set; }
    }

    public class AdminState
    {
        public SettingsView Settings { get; set; }
        public List<TvView> Tvs { get; set; }
        public List<PairingView> PendingPairings { get; set; }
        public List<SessionView> Sessions { get; set; }
        public List<JellyfinUserView> JellyfinUsers { get; set; }
        public UserLink[] Links { get; set; }
        public int QueuedPlayCount { get; set; }
    }

    public class SeerrTestResult
    {
        public bool Ok { get; set; }
        public string Message { get; set; }
        public int UserCount { get; set; }
    }

    public class SeerrUserView
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string JellyfinUserId { get; set; }
        public string AvatarUrl { get; set; }
    }

    public class SeerrUsersResult
    {
        public List<SeerrUserView> Users { get; set; } = new List<SeerrUserView>();
        public string Error { get; set; }
    }

    public class OkResult
    {
        public bool Ok { get; set; } = true;
    }

    // ---- Controller ---------------------------------------------------------------------------------

    [ApiController]
    [Authorize(Policy = "RequiresElevation")]
    [Route("Lobby/Admin")]
    public class AdminController : ControllerBase
    {
        private static LobbyRuntime Runtime =>
            LobbyRuntime.Current ?? throw new InvalidOperationException("Lobby is still starting up.");

        [HttpGet("State")]
        public IActionResult GetAdminState()
        {
            var c = Plugin.Instance.Configuration;
            var users = Runtime.AllUsers();
            var sessions = Runtime.SessionManager.Sessions.Where(s => !string.IsNullOrEmpty(s.DeviceId)).ToList();

            var state = new AdminState
            {
                Settings = ToView(c),
                Tvs = c.Tvs.Select(t =>
                {
                    var user = users.FirstOrDefault(u => u.Id.ToString("N") == t.JellyfinUserId);
                    var tvSession = Runtime.Playback.FindSessions(t.JellyfinDeviceId, t.Duid).FirstOrDefault();
                    var settings = TvSettings.Resolve(t, c);
                    return new TvView
                    {
                        SettingsCustomized = settings.Customized,
                        VisibleRows = settings.RowOrder.Where(settings.IsVisible).Select(id => TvSettings.FindRow(id).Title).ToArray(),
                        RowLimit = settings.RowLimit,
                        PlayDelayMs = settings.PlayDelayMs,
                        PlayTimeoutSeconds = settings.PlayTimeoutSeconds,
                        SportsLookaheadHours = settings.SportsLookaheadHours,
                        Id = t.Id,
                        Name = t.Name,
                        JellyfinUserId = t.JellyfinUserId,
                        JellyfinUserName = user?.Username,
                        JellyfinDeviceId = t.JellyfinDeviceId,
                        Duid = t.Duid,
                        SportsTeams = t.SportsTeams ?? new string[0],
                        WeatherEnabled = t.WeatherEnabled,
                        WeatherLatitude = t.WeatherLatitude,
                        WeatherLongitude = t.WeatherLongitude,
                        WeatherFahrenheit = t.WeatherFahrenheit,
                        PairedUtc = t.PairedUtc,
                        LastSeenUtc = t.LastSeenUtc,
                        JellyfinAppControllable = tvSession != null && tvSession.IsActive && tvSession.SupportsRemoteControl,
                        JellyfinAppLastSeenUtc = tvSession?.LastActivityDate.UtcDateTime.ToString("o"),
                    };
                }).ToList(),
                PendingPairings = Runtime.Tvs.GetPendingPairings().Select(p => new PairingView
                {
                    Code = p.Code,
                    DeviceName = p.DeviceName,
                    Duid = p.Duid,
                    CreatedUtc = p.CreatedUtc.ToString("o"),
                    SuggestedJellyfinDeviceId = p.Duid == null
                        ? null
                        : sessions.FirstOrDefault(s => string.Equals(s.DeviceId, p.Duid, StringComparison.OrdinalIgnoreCase))?.DeviceId,
                }).ToList(),
                Sessions = sessions
                    .GroupBy(s => s.DeviceId, StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.OrderByDescending(s => s.LastActivityDate).First())
                    .OrderByDescending(s => s.LastActivityDate)
                    .Take(50)
                    .Select(s => new SessionView
                    {
                        DeviceId = s.DeviceId,
                        DeviceName = s.DeviceName,
                        Client = s.Client,
                        ApplicationVersion = s.ApplicationVersion,
                        UserName = s.UserName,
                        LastActivityUtc = s.LastActivityDate.UtcDateTime.ToString("o"),
                        SupportsRemoteControl = s.SupportsRemoteControl,
                        IsActive = s.IsActive,
                    }).ToList(),
                JellyfinUsers = users
                    .OrderBy(u => u.Username, StringComparer.OrdinalIgnoreCase)
                    .Select(u => new JellyfinUserView { Id = u.Id.ToString("N"), Name = u.Username, IsDisabled = u.HasPermission(MediaBrowser.Model.Entities.PermissionKind.IsDisabled) })
                    .ToList(),
                Links = c.UserLinks,
                QueuedPlayCount = Runtime.Playback.PendingCount,
            };

            return LobbyJson.Of(state);
        }

        [HttpPost("Settings")]
        public IActionResult SaveSettings([FromBody] SettingsView body)
        {
            Plugin.Instance.Mutate(c =>
            {
                var newUrl = (body.SeerrUrl ?? string.Empty).Trim().TrimEnd('/');
                if (!string.Equals(newUrl, c.SeerrUrl, StringComparison.OrdinalIgnoreCase))
                {
                    Runtime.Links.ClearCache();
                    Runtime.Seerr.InvalidateDiscover();
                }

                c.SeerrUrl = newUrl;
                if (!string.IsNullOrWhiteSpace(body.SeerrApiKey))
                {
                    c.SeerrApiKey = body.SeerrApiKey.Trim();
                    Runtime.Links.ClearCache();
                    Runtime.Seerr.InvalidateDiscover();
                }

                c.RequestsEnabled = body.RequestsEnabled;
                c.FallbackSeerrUserId = Math.Max(0, body.FallbackSeerrUserId);
                c.RowLimit = Clamp(body.RowLimit, 1, 100, 20);
                c.SportsLookaheadHours = Clamp(body.SportsLookaheadHours, 1, 168, 12);
                c.PlayDelayMs = Clamp(body.PlayDelayMs, 0, 15000, 1500);
                c.PlayTimeoutSeconds = Clamp(body.PlayTimeoutSeconds, 5, 300, 45);
                c.RememberRequesterMinutes = Clamp(body.RememberRequesterMinutes, 0, 1440, 30);
                c.ShowContinueWatching = body.ShowContinueWatching;
                c.ShowNextUp = body.ShowNextUp;
                c.ShowRecentlyAdded = body.ShowRecentlyAdded;
                c.ShowLiveNow = body.ShowLiveNow;
                c.ShowSports = body.ShowSports;
                c.ShowSeerrTrending = body.ShowSeerrTrending;
                c.ShowSeerrPopularMovies = body.ShowSeerrPopularMovies;
                c.ShowSeerrPopularShows = body.ShowSeerrPopularShows;
                c.SportsLiveOnly = body.SportsLiveOnly;
                c.GameThumbsEnabled = body.GameThumbsEnabled;
                c.GameThumbsUrl = (body.GameThumbsUrl ?? string.Empty).Trim();
                c.GameThumbsStyle = Clamp(body.GameThumbsStyle, 1, 6, 1);
            });

            return LobbyJson.Of(ToView(Plugin.Instance.Configuration));
        }

        [HttpPost("Seerr/Test")]
        public async Task<IActionResult> TestSeerr([FromBody] TestSeerrBody body)
        {
            var c = Plugin.Instance.Configuration;
            var url = string.IsNullOrWhiteSpace(body?.SeerrUrl) ? c.SeerrUrl : body.SeerrUrl;
            var key = string.IsNullOrWhiteSpace(body?.SeerrApiKey) ? c.SeerrApiKey : body.SeerrApiKey;
            try
            {
                var users = await Runtime.Seerr.GetUsers(CancellationToken.None, url, key).ConfigureAwait(false);
                return LobbyJson.Of(new SeerrTestResult { Ok = true, UserCount = users.Count, Message = "Connected. Found " + users.Count + " Seerr user(s)." });
            }
            catch (SeerrException ex)
            {
                return LobbyJson.Of(new SeerrTestResult { Ok = false, Message = ex.Message });
            }
        }

        [HttpGet("Seerr/Users")]
        public async Task<IActionResult> GetSeerrUsers([FromQuery] bool refresh)
        {
            var result = new SeerrUsersResult();
            try
            {
                var users = await Runtime.Links.GetSeerrUsers(CancellationToken.None, refresh).ConfigureAwait(false);
                result.Users = users
                    .OrderBy(u => u.BestName, StringComparer.OrdinalIgnoreCase)
                    .Select(u => new SeerrUserView
                    {
                        Id = u.Id,
                        Name = u.BestName,
                        Email = u.Email,
                        JellyfinUserId = TvRegistry.NormalizeId(u.JellyfinUserId),
                        AvatarUrl = Runtime.Seerr.Absolute(u.Avatar),
                    }).ToList();
            }
            catch (SeerrException ex)
            {
                result.Error = ex.Message;
            }

            return LobbyJson.Of(result);
        }

        [HttpPost("Links/Sync")]
        public async Task<IActionResult> SyncLinks()
        {
            try
            {
                return LobbyJson.Of(await Runtime.Links.Sync(CancellationToken.None).ConfigureAwait(false));
            }
            catch (SeerrException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("Links")]
        public IActionResult SaveLinks([FromBody] SaveLinksBody body)
        {
            return LobbyJson.Of(Runtime.Links.Save(body?.Links));
        }

        [HttpPost("Pairings/Approve")]
        public IActionResult ApprovePairing([FromBody] ApprovePairingBody body)
        {
            if (!TryValidateUser(body.JellyfinUserId, out var error))
            {
                return BadRequest(error);
            }

            var tv = Runtime.Tvs.ApprovePairing(body.Code, body.Name, body.JellyfinUserId, body.JellyfinDeviceId, new[] { body.SportsTeams });
            return LobbyJson.Of(new TvView { Id = tv.Id, Name = tv.Name, JellyfinUserId = tv.JellyfinUserId, JellyfinDeviceId = tv.JellyfinDeviceId, Duid = tv.Duid, SportsTeams = tv.SportsTeams });
        }

        [HttpPost("Pairings/Reject")]
        public IActionResult RejectPairing([FromBody] CodeBody body)
        {
            Runtime.Tvs.RejectPairing(body?.Code);
            return LobbyJson.Of(new OkResult());
        }

        [HttpPost("Tvs/Update")]
        public IActionResult UpdateTv([FromBody] UpdateTvBody body)
        {
            if (!TryValidateUser(body.JellyfinUserId, out var error))
            {
                return BadRequest(error);
            }

            TvDevice updated = null;
            Plugin.Instance.Mutate(c =>
            {
                var tv = c.Tvs.FirstOrDefault(t => t.Id == body.Id) ?? throw new ArgumentException("Unknown TV.");
                if (!string.IsNullOrWhiteSpace(body.Name))
                {
                    tv.Name = body.Name.Trim();
                }

                tv.JellyfinUserId = TvRegistry.NormalizeId(body.JellyfinUserId);
                tv.JellyfinDeviceId = string.IsNullOrWhiteSpace(body.JellyfinDeviceId) ? null : body.JellyfinDeviceId.Trim();
                tv.SportsTeams = TvRegistry.CleanTeams(new[] { body.SportsTeams });
                tv.WeatherEnabled = body.WeatherEnabled;
                tv.WeatherFahrenheit = body.WeatherFahrenheit;
                tv.WeatherLatitude = double.TryParse(body.WeatherLatitude, NumberStyles.Float, CultureInfo.InvariantCulture, out var wlat) ? wlat : 0;
                tv.WeatherLongitude = double.TryParse(body.WeatherLongitude, NumberStyles.Float, CultureInfo.InvariantCulture, out var wlon) ? wlon : 0;
                updated = tv;
            });

            return LobbyJson.Of(new TvView
            {
                Id = updated.Id,
                Name = updated.Name,
                JellyfinUserId = updated.JellyfinUserId,
                JellyfinDeviceId = updated.JellyfinDeviceId,
                Duid = updated.Duid,
                SportsTeams = updated.SportsTeams,
                WeatherEnabled = updated.WeatherEnabled,
                WeatherLatitude = updated.WeatherLatitude,
                WeatherLongitude = updated.WeatherLongitude,
                WeatherFahrenheit = updated.WeatherFahrenheit,
            });
        }

        [HttpPost("Tvs/ResetSettings")]
        public IActionResult ResetTvSettingsAdmin([FromBody] IdBody body)
        {
            Plugin.Instance.Mutate(c =>
            {
                var tv = c.Tvs.FirstOrDefault(t => t.Id == body.Id) ?? throw new ArgumentException("Unknown TV.");
                tv.Preferences = null;
            });

            return LobbyJson.Of(new OkResult());
        }

        [HttpPost("Tvs/Delete")]
        public IActionResult DeleteTv([FromBody] IdBody body)
        {
            Plugin.Instance.Mutate(c => c.Tvs = c.Tvs.Where(t => t.Id != body.Id).ToArray());
            return LobbyJson.Of(new OkResult());
        }

        private static bool TryValidateUser(string jellyfinUserId, out string error)
        {
            var id = TvRegistry.NormalizeId(jellyfinUserId);
            if (id == null || !Runtime.AllUsers().Any(u => u.Id.ToString("N") == id))
            {
                error = "Choose an existing Jellyfin user.";
                return false;
            }

            error = null;
            return true;
        }

        private static SettingsView ToView(PluginConfiguration c)
        {
            return new SettingsView
            {
                SeerrUrl = c.SeerrUrl,
                HasSeerrApiKey = !string.IsNullOrWhiteSpace(c.SeerrApiKey),
                RequestsEnabled = c.RequestsEnabled,
                FallbackSeerrUserId = c.FallbackSeerrUserId,
                RowLimit = c.RowLimit,
                SportsLookaheadHours = c.SportsLookaheadHours,
                PlayDelayMs = c.PlayDelayMs,
                PlayTimeoutSeconds = c.PlayTimeoutSeconds,
                RememberRequesterMinutes = c.RememberRequesterMinutes,
                ShowContinueWatching = c.ShowContinueWatching,
                ShowNextUp = c.ShowNextUp,
                ShowRecentlyAdded = c.ShowRecentlyAdded,
                ShowLiveNow = c.ShowLiveNow,
                ShowSports = c.ShowSports,
                ShowSeerrTrending = c.ShowSeerrTrending,
                ShowSeerrPopularMovies = c.ShowSeerrPopularMovies,
                ShowSeerrPopularShows = c.ShowSeerrPopularShows,
                SportsLiveOnly = c.SportsLiveOnly,
                GameThumbsEnabled = c.GameThumbsEnabled,
                GameThumbsUrl = c.GameThumbsUrl,
                GameThumbsStyle = c.GameThumbsStyle < 1 ? 1 : c.GameThumbsStyle,
            };
        }

        private static int Clamp(int value, int min, int max, int fallback)
        {
            if (value == 0 && min > 0)
            {
                return fallback;
            }

            return Math.Max(min, Math.Min(max, value));
        }
    }
}
