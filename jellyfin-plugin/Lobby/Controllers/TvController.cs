using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lobby.Configuration;
using Lobby.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Lobby.Controllers
{
    // ---- Responses --------------------------------------------------------------------------------
    // TV endpoints skip Jellyfin's normal authentication: a TV proves itself with the token it
    // received when it was paired ("Authorization: Lobby <token>"); pairing itself needs no token.

    public class TitlePerson
    {
        public string Name { get; set; }
        public string Character { get; set; }

        /// <summary>Absolute TMDB image URL, when the person has a photo.</summary>
        public string PhotoUrl { get; set; }
    }

    public class TitleDetailsResponse
    {
        public string Tagline { get; set; }
        public string Overview { get; set; }
        public List<string> Genres { get; set; } = new List<string>();

        /// <summary>Minutes: a movie's runtime, or a show's usual episode length.</summary>
        public int? RuntimeMinutes { get; set; }
        public int? Seasons { get; set; }
        public double? Rating { get; set; }
        public List<string> Directors { get; set; } = new List<string>();
        public List<string> Writers { get; set; } = new List<string>();
        public List<string> Creators { get; set; } = new List<string>();
        public List<string> Networks { get; set; } = new List<string>();

        /// <summary>Top-billed cast, at most twelve.</summary>
        public List<TitlePerson> Cast { get; set; } = new List<TitlePerson>();
    }

    public class TvRowSetting
    {
        public string Id { get; set; }
        public string Title { get; set; }

        /// <summary>library, livetv or seerr.</summary>
        public string Source { get; set; }
        public bool Visible { get; set; }

        /// <summary>False when the row can't show anything yet (Seerr not set up, or no teams chosen). Reason says why.</summary>
        public bool Available { get; set; }
        public string Reason { get; set; }
    }

    public class SettingRange
    {
        public int Min { get; set; }
        public int Max { get; set; }
        public int Default { get; set; }
    }

    public class TvSettingsResponse
    {
        /// <summary>Every row, in this TV's display order.</summary>
        public List<TvRowSetting> Rows { get; set; }
        public int RowLimit { get; set; }
        public int SportsLookaheadHours { get; set; }
        public int PlayDelayMs { get; set; }
        public int PlayTimeoutSeconds { get; set; }
        public string[] SportsTeams { get; set; }

        /// <summary>False while the TV is still on the server defaults.</summary>
        public bool Customized { get; set; }

        /// <summary>Allowed ranges and server defaults, for building the settings controls.</summary>
        public Dictionary<string, SettingRange> Ranges { get; set; }
    }

    public class GuideTeamsResponse
    {
        public int Days { get; set; }
        public List<GuideTeam> Teams { get; set; }

        /// <summary>Set when the guide couldn't be read (e.g. Live TV isn't set up).</summary>
        public string Message { get; set; }
    }

    public class StartPairingResponse
    {
        public string PairingId { get; set; }
        public string Code { get; set; }
        public string Secret { get; set; }
        public int ExpiresInSeconds { get; set; }
    }

    public class PairingStatusResponse
    {
        /// <summary>pending, approved, rejected or expired.</summary>
        public string Status { get; set; }

        /// <summary>Only present once, on the first poll after approval. Store it on the TV.</summary>
        public string Token { get; set; }
        public string TvName { get; set; }
    }

    public class PingResponse
    {
        public string TvName { get; set; }
        public string UserName { get; set; }
    }

    public class Requester
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string AvatarUrl { get; set; }
    }

    public class RequestersResponse
    {
        public bool RequestsEnabled { get; set; }
        public List<Requester> Requesters { get; set; } = new List<Requester>();

        /// <summary>Who last requested from this TV recently; pre-select them in the picker.</summary>
        public int? LastRequesterId { get; set; }

        /// <summary>True when the TV's user has no linked Seerr account and the fallback account is used.</summary>
        public bool UsingFallback { get; set; }
    }

    public class SubmitRequestResponse
    {
        /// <summary>requested, approved or failed.</summary>
        public string Status { get; set; }
        public string Message { get; set; }
        public int? RequestId { get; set; }
    }

    public class DismissResumeResponse
    {
        /// <summary>ok when a resume point was cleared, unchanged when there was none.</summary>
        public string Status { get; set; }
        public string ItemId { get; set; }
    }

    // ---- Request bodies ---------------------------------------------------------------------------

    public class StartPairingBody
    {
        public string DeviceName { get; set; }

        /// <summary>Samsung DUID (webapis.productinfo.getDuid()).</summary>
        public string Duid { get; set; }
    }

    public class SubmitRequestBody
    {
        public int TmdbId { get; set; }

        /// <summary>movie or tv.</summary>
        public string MediaType { get; set; }

        /// <summary>Seerr user to request as. Optional when only one requester is available.</summary>
        public int SeerrUserId { get; set; }
    }

    public class PlayBody
    {
        public string ItemId { get; set; }

        /// <summary>play, resume or details. Defaults to play.</summary>
        public string Action { get; set; }

        /// <summary>Optional explicit start position. For "resume" the saved position is used when omitted.</summary>
        public long? StartPositionTicks { get; set; }
    }

    public class DismissResumeBody
    {
        public string ItemId { get; set; }
    }

    public class SaveTvSettingsBody
    {
        /// <summary>Row ids in the order to show them. Rows left out follow in default order.</summary>
        public string[] RowOrder { get; set; }

        /// <summary>Row ids to hide. Replaces the current list.</summary>
        public string[] HiddenRows { get; set; }

        public int? RowLimit { get; set; }
        public int? SportsLookaheadHours { get; set; }
        public int? PlayDelayMs { get; set; }
        public int? PlayTimeoutSeconds { get; set; }

        /// <summary>Team names for the Your Teams row. Replaces the current list.</summary>
        public string[] SportsTeams { get; set; }
    }

    // ---- Controller ---------------------------------------------------------------------------------

    [ApiController]
    [AllowAnonymous]
    [Route("Lobby")]
    public class TvController : ControllerBase
    {
        public const string TokenHeader = "X-Lobby-Token";
        public const string AuthScheme = "Lobby";

        // TV id -> (Seerr user id, when)
        private static readonly ConcurrentDictionary<string, Tuple<int, DateTime>> LastRequester =
            new ConcurrentDictionary<string, Tuple<int, DateTime>>();

        private static LobbyRuntime Runtime =>
            LobbyRuntime.Current ?? throw new InvalidOperationException("Lobby is still starting up.");

        [HttpPost("Pair")]
        public IActionResult StartPairing([FromBody] StartPairingBody body)
        {
            var p = Runtime.Tvs.StartPairing(body?.DeviceName, body?.Duid);
            return LobbyJson.Of(new StartPairingResponse
            {
                PairingId = p.Id,
                Code = p.Code,
                Secret = p.Secret,
                ExpiresInSeconds = 15 * 60,
            });
        }

        [HttpGet("Pair/Status")]
        public IActionResult GetPairingStatus([FromQuery] string pairingId, [FromQuery] string secret)
        {
            var p = Runtime.Tvs.GetPairingForTv(pairingId, secret);
            if (p == null)
            {
                return LobbyJson.Of(new PairingStatusResponse { Status = "expired" });
            }

            var response = new PairingStatusResponse { Status = p.Status, TvName = p.TvName };
            if (p.Status == "approved")
            {
                response.Token = p.IssuedToken;
                Runtime.Tvs.CompletePairing(p);
            }

            return LobbyJson.Of(response);
        }

        [HttpGet("Ping")]
        public IActionResult Ping()
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var user = Runtime.Home.GetUser(tv);
            return LobbyJson.Of(new PingResponse { TvName = tv.Name, UserName = user.Username });
        }

        [HttpGet("Home")]
        public async Task<IActionResult> GetHome()
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            return LobbyJson.Of(await Runtime.Home.Build(tv, CancellationToken.None).ConfigureAwait(false));
        }

        [HttpGet("Search")]
        public async Task<IActionResult> SearchTitles([FromQuery] string query)
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            return LobbyJson.Of(await Runtime.Home.Search(tv, query, CancellationToken.None).ConfigureAwait(false));
        }

        [HttpGet("Details")]
        public async Task<IActionResult> GetTitleDetails([FromQuery] string mediaType, [FromQuery] int tmdbId)
        {
            if (!TryAuthenticate(out _, out var unauthorized))
            {
                return unauthorized;
            }

            if ((mediaType != "movie" && mediaType != "tv") || tmdbId <= 0)
            {
                return BadRequest("mediaType must be 'movie' or 'tv' and tmdbId must be set.");
            }

            if (!Runtime.Seerr.IsConfigured)
            {
                return NotFound("Seerr isn't set up on the server.");
            }

            SeerrDetails d;
            try
            {
                d = await Runtime.Seerr.Details(mediaType, tmdbId, CancellationToken.None).ConfigureAwait(false);
            }
            catch (SeerrException ex)
            {
                return NotFound(ex.Message);
            }

            const string photoBase = "https://image.tmdb.org/t/p/w185";
            var crew = d?.Credits?.Crew ?? new List<SeerrPerson>();
            List<string> Names(IEnumerable<SeerrPerson> people, int max) =>
                people.Where(p => !string.IsNullOrWhiteSpace(p?.Name)).Select(p => p.Name.Trim()).Distinct().Take(max).ToList();

            return LobbyJson.Of(new TitleDetailsResponse
            {
                Tagline = d?.Tagline,
                Overview = d?.Overview,
                Genres = (d?.Genres ?? new List<SeerrGenre>()).Where(g => !string.IsNullOrWhiteSpace(g?.Name)).Select(g => g.Name).Take(3).ToList(),
                RuntimeMinutes = d?.Runtime > 0 ? d.Runtime : d?.EpisodeRunTime?.FirstOrDefault(m => m > 0) is int ep && ep > 0 ? ep : (int?)null,
                Seasons = d?.NumberOfSeasons > 0 ? d.NumberOfSeasons : null,
                Rating = d?.VoteAverage > 0 ? Math.Round(d.VoteAverage.Value, 1) : (double?)null,
                Directors = Names(crew.Where(p => p.Job == "Director"), 3),
                Writers = Names(crew.Where(p => p.Job == "Screenplay" || p.Job == "Writer"), 3),
                Creators = Names(d?.CreatedBy ?? new List<SeerrPerson>(), 3),
                Networks = (d?.Networks ?? new List<SeerrCompany>()).Where(n => !string.IsNullOrWhiteSpace(n?.Name)).Select(n => n.Name).Take(2).ToList(),
                Cast = (d?.Credits?.Cast ?? new List<SeerrPerson>())
                    .Where(p => !string.IsNullOrWhiteSpace(p?.Name))
                    .OrderBy(p => p.Order ?? int.MaxValue)
                    .Take(12)
                    .Select(p => new TitlePerson
                    {
                        Name = p.Name.Trim(),
                        Character = string.IsNullOrWhiteSpace(p.Character) ? null : p.Character.Trim(),
                        PhotoUrl = string.IsNullOrWhiteSpace(p.ProfilePath) ? null : photoBase + p.ProfilePath,
                    })
                    .ToList(),
            });
        }

        [HttpGet("Requesters")]
        public async Task<IActionResult> GetRequesters()
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var config = Plugin.Instance.Configuration;
            var response = new RequestersResponse { RequestsEnabled = config.RequestsEnabled && Runtime.Seerr.IsConfigured };
            if (!response.RequestsEnabled)
            {
                return LobbyJson.Of(response);
            }

            var ids = AllowedRequesterIds(tv, out var usingFallback);
            response.UsingFallback = usingFallback;
            if (ids.Length == 0)
            {
                return LobbyJson.Of(response);
            }

            List<SeerrUser> seerrUsers;
            try
            {
                seerrUsers = await Runtime.Links.GetSeerrUsers(CancellationToken.None).ConfigureAwait(false);
            }
            catch (SeerrException)
            {
                seerrUsers = new List<SeerrUser>();
            }

            foreach (var id in ids)
            {
                var su = seerrUsers.FirstOrDefault(s => s.Id == id);
                var cachedName = config.UserLinks.FirstOrDefault(l => l.SeerrUserId == id)?.SeerrDisplayName;
                response.Requesters.Add(new Requester
                {
                    Id = id,
                    Name = su?.BestName ?? cachedName ?? ("Seerr user " + id),
                    AvatarUrl = Runtime.Seerr.Absolute(su?.Avatar),
                });
            }

            if (LastRequester.TryGetValue(tv.Id, out var last) &&
                DateTime.UtcNow - last.Item2 < TimeSpan.FromMinutes(Math.Max(0, config.RememberRequesterMinutes)) &&
                ids.Contains(last.Item1))
            {
                response.LastRequesterId = last.Item1;
            }

            return LobbyJson.Of(response);
        }

        [HttpPost("Request")]
        public async Task<IActionResult> SubmitRequest([FromBody] SubmitRequestBody body)
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var config = Plugin.Instance.Configuration;
            if (!config.RequestsEnabled || !Runtime.Seerr.IsConfigured)
            {
                return LobbyJson.Of(new SubmitRequestResponse { Status = "failed", Message = "Requests are turned off on this server." });
            }

            var mediaType = (body?.MediaType ?? string.Empty).Trim().ToLowerInvariant();
            if ((mediaType != "movie" && mediaType != "tv") || body.TmdbId <= 0)
            {
                return BadRequest("mediaType must be 'movie' or 'tv' and tmdbId must be set.");
            }

            var allowed = AllowedRequesterIds(tv, out _);
            var seerrUserId = body.SeerrUserId;
            if (seerrUserId <= 0 && allowed.Length == 1)
            {
                seerrUserId = allowed[0];
            }

            if (!allowed.Contains(seerrUserId))
            {
                return LobbyJson.Of(new SubmitRequestResponse
                {
                    Status = "failed",
                    Message = allowed.Length == 0
                        ? "This TV's Jellyfin user isn't linked to a Seerr account."
                        : seerrUserId <= 0
                            ? "Choose who is requesting."
                            : "That person can't request from this TV.",
                });
            }

            try
            {
                var result = await Runtime.Seerr.Request(mediaType, body.TmdbId, seerrUserId, CancellationToken.None).ConfigureAwait(false);
                LastRequester[tv.Id] = Tuple.Create(seerrUserId, DateTime.UtcNow);
                Runtime.Logger.LogInformation("'{TvName}' requested {MediaType} {TmdbId} as Seerr user {SeerrUserId}", tv.Name, mediaType, body.TmdbId, seerrUserId);
                return LobbyJson.Of(new SubmitRequestResponse
                {
                    Status = result?.Status == 2 ? "approved" : "requested",
                    RequestId = result?.Id,
                    Message = result?.Status == 2 ? "Requested and approved." : "Requested. Waiting for approval.",
                });
            }
            catch (SeerrException ex)
            {
                return LobbyJson.Of(new SubmitRequestResponse { Status = "failed", Message = ex.Message });
            }
        }

        [HttpPost("Play")]
        public async Task<IActionResult> Play([FromBody] PlayBody body)
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var user = Runtime.Home.GetUser(tv);

            if (string.IsNullOrWhiteSpace(body?.ItemId) || !Guid.TryParse(body.ItemId.Trim(), out var itemId))
            {
                return BadRequest("itemId must be a Jellyfin item id.");
            }

            var item = Runtime.LibraryManager.GetItemById(itemId);
            if (item == null || !item.IsVisibleStandalone(user))
            {
                return NotFound("Item " + body.ItemId + " was not found.");
            }

            var action = (body.Action ?? PlayAction.Play).Trim().ToLowerInvariant();
            if (action != PlayAction.Play && action != PlayAction.Resume && action != PlayAction.Details)
            {
                return BadRequest("action must be play, resume or details.");
            }

            long? start = body.StartPositionTicks;
            if (action == PlayAction.Resume && !start.HasValue)
            {
                var data = Runtime.UserDataManager.GetUserData(user, item);
                start = data?.PlaybackPositionTicks > 0 ? data.PlaybackPositionTicks : (long?)null;
            }

            if (string.IsNullOrWhiteSpace(tv.JellyfinDeviceId) && string.IsNullOrWhiteSpace(tv.Duid))
            {
                return LobbyJson.Of(new DispatchResult { Status = "failed", Message = "This TV has no Jellyfin app device assigned in the Lobby settings." });
            }

            var timing = TvSettings.Resolve(tv, Plugin.Instance.Configuration);
            var result = await Runtime.Playback.Dispatch(new PlaybackOrder
            {
                TvId = tv.Id,
                TvName = tv.Name,
                JellyfinUserId = user.Id.ToString("N"),
                JellyfinDeviceId = tv.JellyfinDeviceId,
                Duid = tv.Duid,
                ItemId = item.Id,
                ItemType = item.GetBaseItemKind().ToString(),
                ItemName = item.Name,
                Action = action == PlayAction.Details ? PlayAction.Details : PlayAction.Play,
                StartPositionTicks = action == PlayAction.Details ? null : start,
                DelayMs = timing.PlayDelayMs,
                TimeoutSeconds = timing.PlayTimeoutSeconds,
            }).ConfigureAwait(false);

            return LobbyJson.Of(result);
        }

        [HttpPost("Resume/Dismiss")]
        public IActionResult DismissResume([FromBody] DismissResumeBody body)
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var user = Runtime.Home.GetUser(tv);

            if (string.IsNullOrWhiteSpace(body?.ItemId) || !Guid.TryParse(body.ItemId.Trim(), out var itemId))
            {
                return BadRequest("itemId must be a Jellyfin item id.");
            }

            var item = Runtime.LibraryManager.GetItemById(itemId);
            if (item == null || !item.IsVisibleStandalone(user))
            {
                return NotFound("Item " + body.ItemId + " was not found.");
            }

            var data = Runtime.UserDataManager.GetUserData(user, item);
            var cleared = false;
            if (data != null && data.PlaybackPositionTicks > 0)
            {
                // Clear only the resume point so the title leaves Continue Watching;
                // Played/unwatched status is left exactly as it was.
                data.PlaybackPositionTicks = 0;
                Runtime.UserDataManager.SaveUserData(user, item, data, MediaBrowser.Model.Entities.UserDataSaveReason.Import, CancellationToken.None);
                cleared = true;
            }

            return LobbyJson.Of(new DismissResumeResponse { Status = cleared ? "ok" : "unchanged", ItemId = body.ItemId });
        }

        [HttpGet("Settings")]
        public IActionResult GetTvSettings()
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            return LobbyJson.Of(BuildSettingsResponse(tv));
        }

        [HttpPost("Settings")]
        public IActionResult SaveTvSettings([FromBody] SaveTvSettingsBody body)
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var tvId = tv.Id;
            TvDevice updated = null;
            Plugin.Instance.Mutate(c =>
            {
                var t = c.Tvs.FirstOrDefault(x => x.Id == tvId) ?? throw new ArgumentException("This TV is no longer paired.");

                // First change from the TV: start from the server's defaults so nothing jumps unexpectedly.
                var p = t.Preferences ?? new TvPreferences { HiddenRows = TvSettings.DefaultHiddenRows(c).ToArray() };

                if (body.RowOrder != null)
                {
                    p.RowOrder = TvSettings.KnownRows(body.RowOrder).Distinct().ToArray();
                }

                if (body.HiddenRows != null)
                {
                    p.HiddenRows = TvSettings.KnownRows(body.HiddenRows).Distinct().ToArray();
                }

                if (body.RowLimit.HasValue)
                {
                    p.RowLimit = TvSettings.Clamp(body.RowLimit.Value, TvSettings.RowLimitRange);
                }

                if (body.SportsLookaheadHours.HasValue)
                {
                    p.SportsLookaheadHours = TvSettings.Clamp(body.SportsLookaheadHours.Value, TvSettings.SportsLookaheadRange);
                }

                if (body.PlayDelayMs.HasValue)
                {
                    p.PlayDelayMs = TvSettings.Clamp(body.PlayDelayMs.Value, TvSettings.PlayDelayRange);
                }

                if (body.PlayTimeoutSeconds.HasValue)
                {
                    p.PlayTimeoutSeconds = TvSettings.Clamp(body.PlayTimeoutSeconds.Value, TvSettings.PlayTimeoutRange);
                }

                if (body.SportsTeams != null)
                {
                    t.SportsTeams = TvRegistry.CleanTeams(body.SportsTeams);
                }

                p.UpdatedUtc = DateTime.UtcNow.ToString("o");
                t.Preferences = p;
                updated = t;
            });

            return LobbyJson.Of(BuildSettingsResponse(updated));
        }

        [HttpPost("Settings/Reset")]
        public IActionResult ResetTvSettings()
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var tvId = tv.Id;
            TvDevice updated = null;
            Plugin.Instance.Mutate(c =>
            {
                var t = c.Tvs.FirstOrDefault(x => x.Id == tvId) ?? throw new ArgumentException("This TV is no longer paired.");
                t.Preferences = null;
                updated = t;
            });

            return LobbyJson.Of(BuildSettingsResponse(updated));
        }

        [HttpGet("Sports/Teams")]
        public IActionResult GetGuideTeams([FromQuery] int? days)
        {
            if (!TryAuthenticate(out var tv, out var unauthorized))
            {
                return unauthorized;
            }

            var user = Runtime.Home.GetUser(tv);
            var d = Math.Max(1, Math.Min(14, days ?? 7));
            var response = new GuideTeamsResponse { Days = d };

            try
            {
                var now = DateTimeOffset.UtcNow;
                var programs = Runtime.Home.GetSportsPrograms(user, now, now.AddDays(d), null, CancellationToken.None).GetAwaiter().GetResult();
                response.Teams = SportsTeams.Collect(
                    programs.Select(p => Tuple.Create(p.Name, p.EpisodeTitle, p.StartDate)),
                    tv.SportsTeams);

                if (programs.Length == 0)
                {
                    response.Message = "No sports found in the guide for the next " + d + " days.";
                }
            }
            catch (Exception ex)
            {
                Runtime.Logger.LogError(ex, "could not read sports listings for the team picker");
                response.Teams = SportsTeams.Collect(Enumerable.Empty<Tuple<string, string, DateTimeOffset?>>(), tv.SportsTeams);
                response.Message = "Couldn't read the TV guide. Is Live TV set up in Jellyfin?";
            }

            return LobbyJson.Of(response);
        }

        private TvSettingsResponse BuildSettingsResponse(TvDevice tv)
        {
            var c = Plugin.Instance.Configuration;
            var s = TvSettings.Resolve(tv, c);
            var seerrReady = Runtime.Seerr.IsConfigured;
            var hasTeams = tv.SportsTeams != null && tv.SportsTeams.Length > 0;

            return new TvSettingsResponse
            {
                Rows = s.RowOrder.Select(id =>
                {
                    var def = TvSettings.FindRow(id);
                    var row = new TvRowSetting { Id = id, Title = def.Title, Source = def.Source, Visible = s.IsVisible(id), Available = true };
                    if (def.Source == "seerr" && !seerrReady)
                    {
                        row.Available = false;
                        row.Reason = "Seerr isn't set up on the server.";
                    }
                    else if (id == TvSettings.Sports && !hasTeams)
                    {
                        row.Available = false;
                        row.Reason = "Choose your teams first.";
                    }

                    return row;
                }).ToList(),
                RowLimit = s.RowLimit,
                SportsLookaheadHours = s.SportsLookaheadHours,
                PlayDelayMs = s.PlayDelayMs,
                PlayTimeoutSeconds = s.PlayTimeoutSeconds,
                SportsTeams = tv.SportsTeams ?? new string[0],
                Customized = s.Customized,
                Ranges = new Dictionary<string, SettingRange>
                {
                    { "RowLimit", Range(TvSettings.RowLimitRange, c.RowLimit) },
                    { "SportsLookaheadHours", Range(TvSettings.SportsLookaheadRange, c.SportsLookaheadHours) },
                    { "PlayDelayMs", Range(TvSettings.PlayDelayRange, c.PlayDelayMs) },
                    { "PlayTimeoutSeconds", Range(TvSettings.PlayTimeoutRange, c.PlayTimeoutSeconds) },
                },
            };
        }

        private static SettingRange Range(int[] range, int serverDefault)
        {
            return new SettingRange { Min = range[0], Max = range[1], Default = TvSettings.Clamp(serverDefault, range) };
        }

        private int[] AllowedRequesterIds(TvDevice tv, out bool usingFallback)
        {
            var ids = Runtime.Links.GetLinkedSeerrUserIds(tv.JellyfinUserId);
            usingFallback = false;
            var fallback = Plugin.Instance.Configuration.FallbackSeerrUserId;
            if (ids.Length == 0 && fallback > 0)
            {
                usingFallback = true;
                return new[] { fallback };
            }

            return ids;
        }

        /// <summary>
        /// The TV token comes as "Authorization: Lobby &lt;token&gt;" or, for older clients, as X-Lobby-Token.
        /// </summary>
        private bool TryAuthenticate(out TvDevice tv, out IActionResult unauthorized)
        {
            string token = null;
            if (Request.Headers.TryGetValue("Authorization", out var authValues))
            {
                var authorization = authValues.ToString();
                if (!string.IsNullOrWhiteSpace(authorization) && authorization.TrimStart().StartsWith(AuthScheme + " ", StringComparison.OrdinalIgnoreCase))
                {
                    token = authorization.TrimStart().Substring(AuthScheme.Length).Trim();
                }
            }

            if (string.IsNullOrWhiteSpace(token) && Request.Headers.TryGetValue(TokenHeader, out var tokenValues))
            {
                token = tokenValues.ToString();
            }

            try
            {
                tv = Runtime.Tvs.Authenticate(token);
                unauthorized = null;
                return true;
            }
            catch (LobbyAuthException ex)
            {
                tv = null;
                unauthorized = Unauthorized(ex.Message);
                return false;
            }
        }
    }
}
