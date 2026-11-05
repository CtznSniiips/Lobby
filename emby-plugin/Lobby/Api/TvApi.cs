using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lobby.Configuration;
using Lobby.Services;
using MediaBrowser.Common.Extensions;
using MediaBrowser.Controller.Net;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Services;

namespace Lobby.Api
{
    // ---- Requests -------------------------------------------------------------------------------
    // TV endpoints skip Emby authentication ([Unauthenticated]; Emby 4.10 requires auth by default).
    // A TV proves itself with the X-Lobby-Token header it received when it was paired;
    // pairing itself needs no token.

    [Route("/Lobby/Pair", "POST", Summary = "Starts pairing a TV. Show the returned code on screen and poll /Lobby/Pair/Status.")]
    [Unauthenticated]
    public class StartPairing : IReturn<StartPairingResponse>
    {
        public string DeviceName { get; set; }

        /// <summary>Samsung DUID (webapis.productinfo.getDuid()).</summary>
        public string Duid { get; set; }
    }

    [Route("/Lobby/Pair/Status", "GET", Summary = "Polls a pairing. Returns the TV token once an admin has approved it.")]
    [Unauthenticated]
    public class GetPairingStatus : IReturn<PairingStatusResponse>
    {
        public string PairingId { get; set; }
        public string Secret { get; set; }
    }

    [Route("/Lobby/Ping", "GET", Summary = "Checks the TV token.")]
    [Unauthenticated]
    public class Ping : IReturn<PingResponse>
    {
    }

    [Route("/Lobby/Home", "GET", Summary = "Home screen rows for this TV.")]
    [Unauthenticated]
    public class GetHome : IReturn<HomeResponse>
    {
    }

    [Route("/Lobby/Requesters", "GET", Summary = "Seerr users this TV can request as.")]
    [Unauthenticated]
    public class GetRequesters : IReturn<RequestersResponse>
    {
    }

    [Route("/Lobby/Request", "POST", Summary = "Requests a movie or show in Seerr.")]
    [Unauthenticated]
    public class SubmitRequest : IReturn<SubmitRequestResponse>
    {
        public int TmdbId { get; set; }

        /// <summary>movie or tv.</summary>
        public string MediaType { get; set; }

        /// <summary>Seerr user to request as. Optional when only one requester is available.</summary>
        public int SeerrUserId { get; set; }
    }

    [Route("/Lobby/Play", "POST", Summary = "Plays, resumes or shows an item in the Emby app on this TV. Call this, then launch Emby.")]
    [Unauthenticated]
    public class Play : IReturn<DispatchResult>
    {
        public string ItemId { get; set; }

        /// <summary>play, resume or details. Defaults to play.</summary>
        public string Action { get; set; }

        /// <summary>Optional explicit start position. For "resume" the saved position is used when omitted.</summary>
        public long? StartPositionTicks { get; set; }
    }

    [Route("/Lobby/Resume/Dismiss", "POST", Summary = "Clears an item's saved resume position so it leaves Continue Watching. Watched/unwatched status is kept.")]
    [Unauthenticated]
    public class DismissResume : IReturn<DismissResumeResponse>
    {
        public string ItemId { get; set; }
    }

    public class DismissResumeResponse
    {
        /// <summary>ok when a resume point was cleared, unchanged when there was none.</summary>
        public string Status { get; set; }
        public string ItemId { get; set; }
    }

    [Route("/Lobby/Settings", "GET", Summary = "This TV's settings: rows (in order, with visibility) and playback timing.")]
    [Unauthenticated]
    public class GetTvSettings : IReturn<TvSettingsResponse>
    {
    }

    [Route("/Lobby/Settings", "POST", Summary = "Changes this TV's settings. Omitted (null) fields stay as they are.")]
    [Unauthenticated]
    public class SaveTvSettings : IReturn<TvSettingsResponse>
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

    [Route("/Lobby/Settings/Reset", "POST", Summary = "Returns this TV to the server's default rows and timing. Sports teams are kept.")]
    [Unauthenticated]
    public class ResetTvSettings : IReturn<TvSettingsResponse>
    {
    }

    [Route("/Lobby/Sports/Teams", "GET", Summary = "Teams found in the guide's upcoming sports listings, for picking with the remote.")]
    [Unauthenticated]
    public class GetGuideTeams : IReturn<GuideTeamsResponse>
    {
        /// <summary>How many days of guide data to scan. Default 7, maximum 14.</summary>
        public int? Days { get; set; }
    }

    [Route("/Lobby/Details", "GET", Summary = "Credits and details for a Seerr title, for the request screen.")]
    [Unauthenticated]
    public class GetTitleDetails : IReturn<TitleDetailsResponse>
    {
        /// <summary>movie or tv.</summary>
        public string MediaType { get; set; }
        public int TmdbId { get; set; }
    }

    [Route("/Lobby/Search", "GET", Summary = "Searches the Emby library and Seerr. Returns rows: in your library (play) and from Seerr (request).")]
    [Unauthenticated]
    public class SearchTitles : IReturn<HomeResponse>
    {
        public string Query { get; set; }
    }

    // ---- Responses ------------------------------------------------------------------------------

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

    // ---- Service --------------------------------------------------------------------------------

    public class TvApi : IService, IRequiresRequest
    {
        public const string TokenHeader = "X-Lobby-Token";
        public const string AuthScheme = "Lobby";

        // TV id -> (Seerr user id, when)
        private static readonly ConcurrentDictionary<string, Tuple<int, DateTime>> LastRequester =
            new ConcurrentDictionary<string, Tuple<int, DateTime>>();

        public IRequest Request { get; set; }

        private static LobbyRuntime Runtime =>
            LobbyRuntime.Current ?? throw new InvalidOperationException("Lobby is still starting up.");

        public object Post(StartPairing request)
        {
            var p = Runtime.Tvs.StartPairing(request.DeviceName, request.Duid);
            return new StartPairingResponse
            {
                PairingId = p.Id,
                Code = p.Code,
                Secret = p.Secret,
                ExpiresInSeconds = 15 * 60,
            };
        }

        public object Get(GetPairingStatus request)
        {
            var p = Runtime.Tvs.GetPairingForTv(request.PairingId, request.Secret);
            if (p == null)
            {
                return new PairingStatusResponse { Status = "expired" };
            }

            var response = new PairingStatusResponse { Status = p.Status, TvName = p.TvName };
            if (p.Status == "approved")
            {
                response.Token = p.IssuedToken;
                Runtime.Tvs.CompletePairing(p);
            }

            return response;
        }

        public object Get(Ping request)
        {
            var tv = Authenticate();
            var user = Runtime.Home.GetUser(tv);
            return new PingResponse { TvName = tv.Name, UserName = user.Name };
        }

        public async Task<object> Get(GetHome request)
        {
            var tv = Authenticate();
            return await Runtime.Home.Build(tv, CancellationToken.None).ConfigureAwait(false);
        }

        public async Task<object> Get(GetTitleDetails request)
        {
            Authenticate();
            if ((request.MediaType != "movie" && request.MediaType != "tv") || request.TmdbId <= 0)
            {
                throw new ArgumentException("MediaType must be 'movie' or 'tv' and TmdbId must be set.");
            }

            if (!Runtime.Seerr.IsConfigured)
            {
                throw new ResourceNotFoundException("Seerr isn't set up on the server.");
            }

            SeerrDetails d;
            try
            {
                d = await Runtime.Seerr.Details(request.MediaType, request.TmdbId, CancellationToken.None).ConfigureAwait(false);
            }
            catch (SeerrException ex)
            {
                throw new ResourceNotFoundException(ex.Message);
            }

            const string photoBase = "https://image.tmdb.org/t/p/w185";
            var crew = d?.Credits?.Crew ?? new List<SeerrPerson>();
            List<string> Names(IEnumerable<SeerrPerson> people, int max) =>
                people.Where(p => !string.IsNullOrWhiteSpace(p?.Name)).Select(p => p.Name.Trim()).Distinct().Take(max).ToList();

            return new TitleDetailsResponse
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
            };
        }

        public async Task<object> Get(SearchTitles request)
        {
            var tv = Authenticate();
            return await Runtime.Home.Search(tv, request.Query, CancellationToken.None).ConfigureAwait(false);
        }

        public async Task<object> Get(GetRequesters request)
        {
            var tv = Authenticate();
            var config = Plugin.Instance.Configuration;
            var response = new RequestersResponse { RequestsEnabled = config.RequestsEnabled && Runtime.Seerr.IsConfigured };
            if (!response.RequestsEnabled)
            {
                return response;
            }

            var ids = AllowedRequesterIds(tv, out var usingFallback);
            response.UsingFallback = usingFallback;
            if (ids.Length == 0)
            {
                return response;
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

            return response;
        }

        public async Task<object> Post(SubmitRequest request)
        {
            var tv = Authenticate();
            var config = Plugin.Instance.Configuration;
            if (!config.RequestsEnabled || !Runtime.Seerr.IsConfigured)
            {
                return new SubmitRequestResponse { Status = "failed", Message = "Requests are turned off on this server." };
            }

            var mediaType = (request.MediaType ?? string.Empty).Trim().ToLowerInvariant();
            if ((mediaType != "movie" && mediaType != "tv") || request.TmdbId <= 0)
            {
                throw new ArgumentException("MediaType must be 'movie' or 'tv' and TmdbId must be set.");
            }

            var allowed = AllowedRequesterIds(tv, out _);
            var seerrUserId = request.SeerrUserId;
            if (seerrUserId <= 0 && allowed.Length == 1)
            {
                seerrUserId = allowed[0];
            }

            if (!allowed.Contains(seerrUserId))
            {
                return new SubmitRequestResponse
                {
                    Status = "failed",
                    Message = allowed.Length == 0
                        ? "This TV's Emby user isn't linked to a Seerr account."
                        : seerrUserId <= 0
                            ? "Choose who is requesting."
                            : "That person can't request from this TV.",
                };
            }

            try
            {
                var result = await Runtime.Seerr.Request(mediaType, request.TmdbId, seerrUserId, CancellationToken.None).ConfigureAwait(false);
                LastRequester[tv.Id] = Tuple.Create(seerrUserId, DateTime.UtcNow);
                Runtime.Logger.Info("'{0}' requested {1} {2} as Seerr user {3}", tv.Name, mediaType, request.TmdbId, seerrUserId);
                return new SubmitRequestResponse
                {
                    Status = result?.Status == 2 ? "approved" : "requested",
                    RequestId = result?.Id,
                    Message = result?.Status == 2 ? "Requested and approved." : "Requested. Waiting for approval.",
                };
            }
            catch (SeerrException ex)
            {
                return new SubmitRequestResponse { Status = "failed", Message = ex.Message };
            }
        }

        public async Task<object> Post(Play request)
        {
            var tv = Authenticate();
            var user = Runtime.Home.GetUser(tv);

            if (string.IsNullOrWhiteSpace(request.ItemId) || !long.TryParse(request.ItemId.Trim(), out var itemId))
            {
                throw new ArgumentException("ItemId must be an Emby item id.");
            }

            var item = Runtime.LibraryManager.GetItemById(itemId);
            if (item == null || !item.IsVisibleStandalone(user))
            {
                throw new ResourceNotFoundException("Item " + request.ItemId + " was not found.");
            }

            var action = (request.Action ?? PlayAction.Play).Trim().ToLowerInvariant();
            if (action != PlayAction.Play && action != PlayAction.Resume && action != PlayAction.Details)
            {
                throw new ArgumentException("Action must be play, resume or details.");
            }

            long? start = request.StartPositionTicks;
            if (action == PlayAction.Resume && !start.HasValue)
            {
                var data = Runtime.UserDataManager.GetUserData(user, item);
                start = data?.PlaybackPositionTicks > 0 ? data.PlaybackPositionTicks : (long?)null;
            }

            if (string.IsNullOrWhiteSpace(tv.EmbyDeviceId) && string.IsNullOrWhiteSpace(tv.Duid))
            {
                return new DispatchResult { Status = "failed", Message = "This TV has no Emby app device assigned in the Lobby settings." };
            }

            var timing = TvSettings.Resolve(tv, Plugin.Instance.Configuration);
            return await Runtime.Playback.Dispatch(new PlaybackOrder
            {
                TvId = tv.Id,
                TvName = tv.Name,
                EmbyUserId = user.Id.ToString("N"),
                EmbyDeviceId = tv.EmbyDeviceId,
                Duid = tv.Duid,
                ItemId = item.InternalId,
                ItemType = item.GetClientTypeName(),
                ItemName = item.Name,
                Action = action == PlayAction.Details ? PlayAction.Details : PlayAction.Play,
                StartPositionTicks = action == PlayAction.Details ? null : start,
                DelayMs = timing.PlayDelayMs,
                TimeoutSeconds = timing.PlayTimeoutSeconds,
            }).ConfigureAwait(false);
        }

        public object Post(DismissResume request)
        {
            var tv = Authenticate();
            var user = Runtime.Home.GetUser(tv);

            if (string.IsNullOrWhiteSpace(request.ItemId) || !long.TryParse(request.ItemId.Trim(), out var itemId))
            {
                throw new ArgumentException("ItemId must be an Emby item id.");
            }

            var item = Runtime.LibraryManager.GetItemById(itemId);
            if (item == null || !item.IsVisibleStandalone(user))
            {
                throw new ResourceNotFoundException("Item " + request.ItemId + " was not found.");
            }

            var data = Runtime.UserDataManager.GetUserData(user, item);
            var cleared = false;
            if (data != null && data.PlaybackPositionTicks > 0)
            {
                // Clear only the resume point so the title leaves Continue Watching;
                // Played/unwatched status is left exactly as it was.
                data.PlaybackPositionTicks = 0;
                Runtime.UserDataManager.SaveUserData(user, item, data, UserDataSaveReason.Import, CancellationToken.None);
                cleared = true;
            }

            return new DismissResumeResponse { Status = cleared ? "ok" : "unchanged", ItemId = request.ItemId };
        }

        public object Get(GetTvSettings request)
        {
            return BuildSettingsResponse(Authenticate());
        }

        public object Post(SaveTvSettings request)
        {
            var tvId = Authenticate().Id;
            TvDevice updated = null;
            Plugin.Instance.Mutate(c =>
            {
                var tv = c.Tvs.FirstOrDefault(t => t.Id == tvId) ?? throw new ResourceNotFoundException("This TV is no longer paired.");

                // First change from the TV: start from the server's defaults so nothing jumps unexpectedly.
                var p = tv.Preferences ?? new TvPreferences { HiddenRows = TvSettings.DefaultHiddenRows(c).ToArray() };

                if (request.RowOrder != null)
                {
                    p.RowOrder = TvSettings.KnownRows(request.RowOrder).Distinct().ToArray();
                }

                if (request.HiddenRows != null)
                {
                    p.HiddenRows = TvSettings.KnownRows(request.HiddenRows).Distinct().ToArray();
                }

                if (request.RowLimit.HasValue)
                {
                    p.RowLimit = TvSettings.Clamp(request.RowLimit.Value, TvSettings.RowLimitRange);
                }

                if (request.SportsLookaheadHours.HasValue)
                {
                    p.SportsLookaheadHours = TvSettings.Clamp(request.SportsLookaheadHours.Value, TvSettings.SportsLookaheadRange);
                }

                if (request.PlayDelayMs.HasValue)
                {
                    p.PlayDelayMs = TvSettings.Clamp(request.PlayDelayMs.Value, TvSettings.PlayDelayRange);
                }

                if (request.PlayTimeoutSeconds.HasValue)
                {
                    p.PlayTimeoutSeconds = TvSettings.Clamp(request.PlayTimeoutSeconds.Value, TvSettings.PlayTimeoutRange);
                }

                if (request.SportsTeams != null)
                {
                    tv.SportsTeams = TvRegistry.CleanTeams(request.SportsTeams);
                }

                p.UpdatedUtc = DateTime.UtcNow.ToString("o");
                tv.Preferences = p;
                updated = tv;
            });

            return BuildSettingsResponse(updated);
        }

        public object Post(ResetTvSettings request)
        {
            var tvId = Authenticate().Id;
            TvDevice updated = null;
            Plugin.Instance.Mutate(c =>
            {
                var tv = c.Tvs.FirstOrDefault(t => t.Id == tvId) ?? throw new ResourceNotFoundException("This TV is no longer paired.");
                tv.Preferences = null;
                updated = tv;
            });

            return BuildSettingsResponse(updated);
        }

        public object Get(GetGuideTeams request)
        {
            var tv = Authenticate();
            var user = Runtime.Home.GetUser(tv);
            var days = Math.Max(1, Math.Min(14, request.Days ?? 7));
            var response = new GuideTeamsResponse { Days = days };

            try
            {
                var now = DateTimeOffset.UtcNow;
                var programs = Runtime.Home.GetSportsPrograms(user, now, now.AddDays(days), null, CancellationToken.None);
                response.Teams = SportsTeams.Collect(
                    programs.Select(p => Tuple.Create(p.Name, p.EpisodeTitle, p.StartDate)),
                    tv.SportsTeams);

                if (programs.Length == 0)
                {
                    response.Message = "No sports found in the guide for the next " + days + " days.";
                }
            }
            catch (Exception ex)
            {
                Runtime.Logger.ErrorException("could not read sports listings for the team picker", ex);
                response.Teams = SportsTeams.Collect(Enumerable.Empty<Tuple<string, string, DateTimeOffset?>>(), tv.SportsTeams);
                response.Message = "Couldn't read the TV guide. Is Live TV set up in Emby?";
            }

            return response;
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
            var ids = Runtime.Links.GetLinkedSeerrUserIds(tv.EmbyUserId);
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
        /// The TV token comes as "Authorization: Lobby &lt;token&gt;" (on Emby's CORS allow list, so browser-based
        /// clients pass the preflight) or, for older clients, as X-Lobby-Token.
        /// </summary>
        private TvDevice Authenticate()
        {
            var headers = Request?.Headers;
            var authorization = headers?.Get("Authorization");
            string token = null;
            if (!string.IsNullOrWhiteSpace(authorization) && authorization.TrimStart().StartsWith(AuthScheme + " ", StringComparison.OrdinalIgnoreCase))
            {
                token = authorization.TrimStart().Substring(AuthScheme.Length).Trim();
            }

            return Runtime.Tvs.Authenticate(string.IsNullOrWhiteSpace(token) ? headers?.Get(TokenHeader) : token);
        }
    }
}
