using System;
using System.Globalization;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lobby.Configuration;
using Lobby.Services;
using MediaBrowser.Controller.Net;
using MediaBrowser.Model.Services;

namespace Lobby.Api
{
    // ---- Requests (all admin-only) --------------------------------------------------------------

    [Route("/Lobby/Admin/State", "GET", Summary = "Everything the settings page shows.")]
    [Authenticated(Roles = "Admin")]
    public class GetAdminState : IReturn<AdminState>
    {
    }

    [Route("/Lobby/Admin/Settings", "POST", Summary = "Saves general and Seerr settings.")]
    [Authenticated(Roles = "Admin")]
    public class SaveSettings : SettingsView, IReturn<SettingsView>
    {
    }

    [Route("/Lobby/Admin/Seerr/Test", "POST", Summary = "Tests a Seerr URL and key without saving them.")]
    [Authenticated(Roles = "Admin")]
    public class TestSeerr : IReturn<SeerrTestResult>
    {
        public string SeerrUrl { get; set; }

        /// <summary>Leave empty to test with the saved key.</summary>
        public string SeerrApiKey { get; set; }
    }

    [Route("/Lobby/Admin/Seerr/Users", "GET", Summary = "Seerr users, for linking.")]
    [Authenticated(Roles = "Admin")]
    public class GetSeerrUsers : IReturn<SeerrUsersResult>
    {
        public bool Refresh { get; set; }
    }

    [Route("/Lobby/Admin/Links/Sync", "POST", Summary = "Rebuilds automatic links from Seerr and suggests matches. Manual links are kept.")]
    [Authenticated(Roles = "Admin")]
    public class SyncLinks : IReturn<SyncReport>
    {
    }

    [Route("/Lobby/Admin/Links", "POST", Summary = "Replaces all Emby↔Seerr links.")]
    [Authenticated(Roles = "Admin")]
    public class SaveLinks : IReturn<UserLink[]>
    {
        public UserLink[] Links { get; set; }
    }

    [Route("/Lobby/Admin/Pairings/Approve", "POST", Summary = "Approves a TV's pairing code.")]
    [Authenticated(Roles = "Admin")]
    public class ApprovePairing : TvEdit, IReturn<TvView>
    {
        public string Code { get; set; }
    }

    [Route("/Lobby/Admin/Pairings/Reject", "POST", Summary = "Rejects a TV's pairing code.")]
    [Authenticated(Roles = "Admin")]
    public class RejectPairing : IReturn<OkResult>
    {
        public string Code { get; set; }
    }

    [Route("/Lobby/Admin/Tvs/Update", "POST", Summary = "Updates a paired TV.")]
    [Authenticated(Roles = "Admin")]
    public class UpdateTv : TvEdit, IReturn<TvView>
    {
        public string Id { get; set; }
    }

    [Route("/Lobby/Admin/Tvs/ResetSettings", "POST", Summary = "Puts a TV back on the server's default rows and timing.")]
    [Authenticated(Roles = "Admin")]
    public class ResetTvSettingsAdmin : IReturn<OkResult>
    {
        public string Id { get; set; }
    }

    [Route("/Lobby/Admin/Tvs/Delete", "POST", Summary = "Unpairs a TV. Its token stops working immediately.")]
    [Authenticated(Roles = "Admin")]
    public class DeleteTv : IReturn<OkResult>
    {
        public string Id { get; set; }
    }

    // ---- Views ----------------------------------------------------------------------------------

    public class TvEdit
    {
        public string Name { get; set; }
        public string EmbyUserId { get; set; }
        public string EmbyDeviceId { get; set; }

        /// <summary>Comma or newline separated.</summary>
        public string SportsTeams { get; set; }

        public bool WeatherEnabled { get; set; }
        public string WeatherLatitude { get; set; }
        public string WeatherLongitude { get; set; }
        public bool WeatherFahrenheit { get; set; }
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
    }

    public class TvView
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string EmbyUserId { get; set; }
        public string EmbyUserName { get; set; }
        public string EmbyDeviceId { get; set; }
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

        /// <summary>The TV's Emby app currently has a session that can be remote-controlled.</summary>
        public bool EmbyAppControllable { get; set; }
        public string EmbyAppLastSeenUtc { get; set; }
    }

    public class PairingView
    {
        public string Code { get; set; }
        public string DeviceName { get; set; }
        public string Duid { get; set; }
        public string CreatedUtc { get; set; }

        /// <summary>An Emby session whose DeviceId equals the TV's DUID, if one exists.</summary>
        public string SuggestedEmbyDeviceId { get; set; }
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

    public class EmbyUserView
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
        public List<EmbyUserView> EmbyUsers { get; set; }
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
        public string EmbyUserId { get; set; }
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

    // ---- Service --------------------------------------------------------------------------------

    public class AdminApi : IService
    {
        private static LobbyRuntime Runtime =>
            LobbyRuntime.Current ?? throw new InvalidOperationException("Lobby is still starting up.");

        public object Get(GetAdminState request)
        {
            var c = Plugin.Instance.Configuration;
            var users = Runtime.AllUsers();
            var sessions = Runtime.SessionManager.Sessions.Where(s => !string.IsNullOrEmpty(s.DeviceId)).ToList();

            return new AdminState
            {
                Settings = ToView(c),
                Tvs = c.Tvs.Select(t =>
                {
                    var user = users.FirstOrDefault(u => u.Id.ToString("N") == t.EmbyUserId);
                    var tvSession = Runtime.Playback.FindSessions(t.EmbyDeviceId, t.Duid).FirstOrDefault();
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
                        EmbyUserId = t.EmbyUserId,
                        EmbyUserName = user?.Name,
                        EmbyDeviceId = t.EmbyDeviceId,
                        Duid = t.Duid,
                        SportsTeams = t.SportsTeams ?? new string[0],
                        WeatherEnabled = t.WeatherEnabled,
                        WeatherLatitude = t.WeatherLatitude,
                        WeatherLongitude = t.WeatherLongitude,
                        WeatherFahrenheit = t.WeatherFahrenheit,
                        PairedUtc = t.PairedUtc,
                        LastSeenUtc = t.LastSeenUtc,
                        EmbyAppControllable = tvSession != null && tvSession.IsActive && tvSession.SupportsRemoteControl,
                        EmbyAppLastSeenUtc = tvSession?.LastActivityDate.UtcDateTime.ToString("o"),
                    };
                }).ToList(),
                PendingPairings = Runtime.Tvs.GetPendingPairings().Select(p => new PairingView
                {
                    Code = p.Code,
                    DeviceName = p.DeviceName,
                    Duid = p.Duid,
                    CreatedUtc = p.CreatedUtc.ToString("o"),
                    SuggestedEmbyDeviceId = p.Duid == null
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
                EmbyUsers = users
                    .OrderBy(u => u.Name, StringComparer.OrdinalIgnoreCase)
                    .Select(u => new EmbyUserView { Id = u.Id.ToString("N"), Name = u.Name, IsDisabled = u.Policy?.IsDisabled == true })
                    .ToList(),
                Links = c.UserLinks,
                QueuedPlayCount = Runtime.Playback.PendingCount,
            };
        }

        public object Post(SaveSettings request)
        {
            Plugin.Instance.Mutate(c =>
            {
                var newUrl = (request.SeerrUrl ?? string.Empty).Trim().TrimEnd('/');
                if (!string.Equals(newUrl, c.SeerrUrl, StringComparison.OrdinalIgnoreCase))
                {
                    Runtime.Links.ClearCache();
                    Runtime.Seerr.InvalidateDiscover();
                }

                c.SeerrUrl = newUrl;
                if (!string.IsNullOrWhiteSpace(request.SeerrApiKey))
                {
                    c.SeerrApiKey = request.SeerrApiKey.Trim();
                    Runtime.Links.ClearCache();
                    Runtime.Seerr.InvalidateDiscover();
                }

                c.RequestsEnabled = request.RequestsEnabled;
                c.FallbackSeerrUserId = Math.Max(0, request.FallbackSeerrUserId);
                c.RowLimit = Clamp(request.RowLimit, 1, 100, 20);
                c.SportsLookaheadHours = Clamp(request.SportsLookaheadHours, 1, 168, 12);
                c.PlayDelayMs = Clamp(request.PlayDelayMs, 0, 15000, 1500);
                c.PlayTimeoutSeconds = Clamp(request.PlayTimeoutSeconds, 5, 300, 45);
                c.RememberRequesterMinutes = Clamp(request.RememberRequesterMinutes, 0, 1440, 30);
                c.ShowContinueWatching = request.ShowContinueWatching;
                c.ShowNextUp = request.ShowNextUp;
                c.ShowRecentlyAdded = request.ShowRecentlyAdded;
                c.ShowLiveNow = request.ShowLiveNow;
                c.ShowSports = request.ShowSports;
                c.ShowSeerrTrending = request.ShowSeerrTrending;
                c.ShowSeerrPopularMovies = request.ShowSeerrPopularMovies;
                c.ShowSeerrPopularShows = request.ShowSeerrPopularShows;
                c.SportsLiveOnly = request.SportsLiveOnly;
            });

            return ToView(Plugin.Instance.Configuration);
        }

        public async Task<object> Post(TestSeerr request)
        {
            var c = Plugin.Instance.Configuration;
            var url = string.IsNullOrWhiteSpace(request.SeerrUrl) ? c.SeerrUrl : request.SeerrUrl;
            var key = string.IsNullOrWhiteSpace(request.SeerrApiKey) ? c.SeerrApiKey : request.SeerrApiKey;
            try
            {
                var users = await Runtime.Seerr.GetUsers(CancellationToken.None, url, key).ConfigureAwait(false);
                return new SeerrTestResult { Ok = true, UserCount = users.Count, Message = "Connected. Found " + users.Count + " Seerr user(s)." };
            }
            catch (SeerrException ex)
            {
                return new SeerrTestResult { Ok = false, Message = ex.Message };
            }
        }

        public async Task<object> Get(GetSeerrUsers request)
        {
            var result = new SeerrUsersResult();
            try
            {
                var users = await Runtime.Links.GetSeerrUsers(CancellationToken.None, request.Refresh).ConfigureAwait(false);
                result.Users = users
                    .OrderBy(u => u.BestName, StringComparer.OrdinalIgnoreCase)
                    .Select(u => new SeerrUserView
                    {
                        Id = u.Id,
                        Name = u.BestName,
                        Email = u.Email,
                        EmbyUserId = TvRegistry.NormalizeId(u.JellyfinUserId),
                        AvatarUrl = Runtime.Seerr.Absolute(u.Avatar),
                    }).ToList();
            }
            catch (SeerrException ex)
            {
                result.Error = ex.Message;
            }

            return result;
        }

        public async Task<object> Post(SyncLinks request)
        {
            try
            {
                return await Runtime.Links.Sync(CancellationToken.None).ConfigureAwait(false);
            }
            catch (SeerrException ex)
            {
                throw new ArgumentException(ex.Message);
            }
        }

        public object Post(SaveLinks request)
        {
            return Runtime.Links.Save(request.Links);
        }

        public object Post(ApprovePairing request)
        {
            ValidateUser(request.EmbyUserId);
            var tv = Runtime.Tvs.ApprovePairing(request.Code, request.Name, request.EmbyUserId, request.EmbyDeviceId, new[] { request.SportsTeams });
            return new TvView { Id = tv.Id, Name = tv.Name, EmbyUserId = tv.EmbyUserId, EmbyDeviceId = tv.EmbyDeviceId, Duid = tv.Duid, SportsTeams = tv.SportsTeams };
        }

        public object Post(RejectPairing request)
        {
            Runtime.Tvs.RejectPairing(request.Code);
            return new OkResult();
        }

        public object Post(UpdateTv request)
        {
            ValidateUser(request.EmbyUserId);
            TvDevice updated = null;
            Plugin.Instance.Mutate(c =>
            {
                var tv = c.Tvs.FirstOrDefault(t => t.Id == request.Id) ?? throw new ArgumentException("Unknown TV.");
                if (!string.IsNullOrWhiteSpace(request.Name))
                {
                    tv.Name = request.Name.Trim();
                }

                tv.EmbyUserId = TvRegistry.NormalizeId(request.EmbyUserId);
                tv.EmbyDeviceId = string.IsNullOrWhiteSpace(request.EmbyDeviceId) ? null : request.EmbyDeviceId.Trim();
                tv.SportsTeams = TvRegistry.CleanTeams(new[] { request.SportsTeams });
                tv.WeatherEnabled = request.WeatherEnabled;
                tv.WeatherFahrenheit = request.WeatherFahrenheit;
                tv.WeatherLatitude = double.TryParse(request.WeatherLatitude, NumberStyles.Float, CultureInfo.InvariantCulture, out var wlat) ? wlat : 0;
                tv.WeatherLongitude = double.TryParse(request.WeatherLongitude, NumberStyles.Float, CultureInfo.InvariantCulture, out var wlon) ? wlon : 0;
                updated = tv;
            });

            return new TvView { Id = updated.Id, Name = updated.Name, EmbyUserId = updated.EmbyUserId, EmbyDeviceId = updated.EmbyDeviceId, Duid = updated.Duid, SportsTeams = updated.SportsTeams, WeatherEnabled = updated.WeatherEnabled, WeatherLatitude = updated.WeatherLatitude, WeatherLongitude = updated.WeatherLongitude, WeatherFahrenheit = updated.WeatherFahrenheit };
        }

        public object Post(ResetTvSettingsAdmin request)
        {
            Plugin.Instance.Mutate(c =>
            {
                var tv = c.Tvs.FirstOrDefault(t => t.Id == request.Id) ?? throw new ArgumentException("Unknown TV.");
                tv.Preferences = null;
            });

            return new OkResult();
        }

        public object Post(DeleteTv request)
        {
            Plugin.Instance.Mutate(c => c.Tvs = c.Tvs.Where(t => t.Id != request.Id).ToArray());
            return new OkResult();
        }

        private static void ValidateUser(string embyUserId)
        {
            var id = TvRegistry.NormalizeId(embyUserId);
            if (id == null || !Runtime.AllUsers().Any(u => u.Id.ToString("N") == id))
            {
                throw new ArgumentException("Choose an existing Emby user.");
            }
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
