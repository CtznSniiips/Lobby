using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lobby.Configuration;
using MediaBrowser.Controller.Dto;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.LiveTv;
using MediaBrowser.Controller.TV;
using MediaBrowser.Model.Dto;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Logging;
using MediaBrowser.Model.Querying;

namespace Lobby.Services
{
    public class HomeItem
    {
        public string Id { get; set; }

        /// <summary>movie, episode, program or discover.</summary>
        public string Kind { get; set; }
        public string Title { get; set; }
        public string Subtitle { get; set; }
        public int? Year { get; set; }
        public string Overview { get; set; }

        /// <summary>Emby images are server-relative ("/emby/Items/..."); Seerr images are absolute TMDB URLs.</summary>
        public string PosterUrl { get; set; }
        public string LandscapeUrl { get; set; }

        public double? ProgressPercent { get; set; }
        public long? PositionTicks { get; set; }
        public long? RuntimeTicks { get; set; }

        /// <summary>Item id to send to /Lobby/Play (the channel id for Live TV programs).</summary>
        public string PlayItemId { get; set; }

        /// <summary>resume, play or request.</summary>
        public string DefaultAction { get; set; }

        public string ChannelName { get; set; }
        public string ChannelNumber { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
        public bool? IsAiring { get; set; }

        public int? TmdbId { get; set; }

        /// <summary>movie or tv (Seerr items).</summary>
        public string MediaType { get; set; }

        /// <summary>none, requested, processing, partial or available (Seerr items).</summary>
        public string RequestStatus { get; set; }

        /// <summary>
        /// For Seerr items found in the Emby library: play or resume. PlayItemId then names the movie, or the
        /// show's next episode (or the show itself). Partly available shows keep DefaultAction "request".
        /// </summary>
        public string PlayAction { get; set; }

        /// <summary>Featured items: a short line for the big headline (falls back to the title on the TV).</summary>
        public string Tagline { get; set; }

        /// <summary>Featured items: full-width background art.</summary>
        public string BackdropUrl { get; set; }

        /// <summary>Featured items: the title's logo art, when the library has one.</summary>
        public string LogoUrl { get; set; }

        /// <summary>Featured items: e.g. "2024 · PG-13 · 2h 10m" or "S1 E5 · 32 min left".</summary>
        public string Meta { get; set; }

        /// <summary>Featured items: game, resume, new or trending.</summary>
        public string FeatureReason { get; set; }

        /// <summary>Identities used to show each title only once across rows. Not sent to TVs.</summary>
        internal List<string> Keys { get; } = new List<string>();
    }

    public class HomeRow
    {
        public string Id { get; set; }
        public string Title { get; set; }

        /// <summary>landscape or poster.</summary>
        public string Layout { get; set; }
        public List<HomeItem> Items { get; set; } = new List<HomeItem>();
    }

    public class HomeResponse
    {
        public string TvName { get; set; }
        public string UserName { get; set; }
        public string EmbyUserId { get; set; }
        public bool RequestsEnabled { get; set; }
        public string GeneratedUtc { get; set; }
        public List<HomeRow> Rows { get; set; } = new List<HomeRow>();

        /// <summary>Up to five titles for the large area at the top of Home. Not repeated in Rows.</summary>
        public List<HomeItem> Featured { get; set; } = new List<HomeItem>();

        /// <summary>Non-fatal problems, e.g. Seerr unreachable. The rest of the home screen still works.</summary>
        public List<string> Warnings { get; set; } = new List<string>();

        /// <summary>Weather location for the TV to fetch and show, or null when off/unset.</summary>
        public WeatherConfig Weather { get; set; }
    }

    public class WeatherConfig
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public bool Fahrenheit { get; set; }
    }

    /// <summary>Builds the rows for a TV's home screen.</summary>
    public class HomeBuilder
    {
        private const string TmdbImageBase = "https://image.tmdb.org/t/p/";
        private const int FeaturedCount = 5;

        private readonly ILibraryManager _library;
        private readonly IUserManager _users;
        private readonly IDtoService _dto;
        private readonly ITVSeriesManager _tv;
        private readonly ILiveTvManager _liveTv;
        private readonly SeerrClient _seerr;
        private readonly ILogger _logger;
        private readonly IUserDataManager _userData;

        public HomeBuilder(ILibraryManager library, IUserManager users, IDtoService dto, ITVSeriesManager tv, ILiveTvManager liveTv, IUserDataManager userData, SeerrClient seerr, ILogger logger)
        {
            _userData = userData;
            _library = library;
            _users = users;
            _dto = dto;
            _tv = tv;
            _liveTv = liveTv;
            _seerr = seerr;
            _logger = logger;
        }

        public User GetUser(TvDevice tv)
        {
            var user = string.IsNullOrWhiteSpace(tv.EmbyUserId) ? null : _users.GetUserById(tv.EmbyUserId);
            if (user == null)
            {
                throw new ArgumentException("The Emby user assigned to '" + tv.Name + "' no longer exists. Pick another one in the Lobby settings.");
            }

            return user;
        }

        public async Task<HomeResponse> Build(TvDevice tv, CancellationToken ct)
        {
            var config = Plugin.Instance.Configuration;
            var settings = TvSettings.Resolve(tv, config);
            var user = GetUser(tv);
            var limit = settings.RowLimit;
            // Fetch extra so rows stay full after titles shown in an earlier row are removed.
            var fetch = Math.Min(100, limit * 2);
            var response = new HomeResponse
            {
                TvName = tv.Name,
                UserName = user.Name,
                EmbyUserId = user.Id.ToString("N"),
                RequestsEnabled = config.RequestsEnabled && _seerr.IsConfigured,
                GeneratedUtc = DateTime.UtcNow.ToString("o"),
            };

            if (config.WeatherEnabled && (config.WeatherLatitude != 0 || config.WeatherLongitude != 0))
            {
                response.Weather = new WeatherConfig
                {
                    Latitude = config.WeatherLatitude,
                    Longitude = config.WeatherLongitude,
                    Fahrenheit = config.WeatherFahrenheit,
                };
            }

            var dtoOptions = new DtoOptions(true)
            {
                EnableImages = true,
                ImageTypeLimit = 1,
                EnableUserData = true,
            };

            // Rows are built into this map, then emitted in the TV's chosen order.
            var built = new Dictionary<string, HomeRow>();

            // Seerr calls run in parallel with the local queries.
            var seerrTasks = new List<Tuple<string, string, Task<List<SeerrMedia>>>>();
            if (_seerr.IsConfigured)
            {
                if (settings.IsVisible(TvSettings.SeerrTrending)) seerrTasks.Add(Tuple.Create(TvSettings.SeerrTrending, "trending", SafeDiscover("trending", ct)));
                if (settings.IsVisible(TvSettings.SeerrMovies)) seerrTasks.Add(Tuple.Create(TvSettings.SeerrMovies, "movies", SafeDiscover("movies", ct)));
                if (settings.IsVisible(TvSettings.SeerrShows)) seerrTasks.Add(Tuple.Create(TvSettings.SeerrShows, "tv", SafeDiscover("tv", ct)));
            }

            // The featured area always draws on Trending, even when the Trending row is hidden.
            var featuredTrending = !_seerr.IsConfigured ? null
                : seerrTasks.Where(t => t.Item1 == TvSettings.SeerrTrending).Select(t => t.Item3).FirstOrDefault() ?? SafeDiscover("trending", ct);

            var resumeIds = new HashSet<string>();
            if (settings.IsVisible(TvSettings.Continue))
            {
                AddRow(response, built, TvSettings.Continue, "landscape", () =>
                {
                    var items = _library.GetItemList(new InternalItemsQuery(user)
                    {
                        IsResumable = true,
                        Recursive = true,
                        IncludeItemTypes = new[] { "Movie", "Episode" },
                        OrderBy = new[] { ValueTuple.Create(ItemSortBy.DatePlayed, SortOrder.Descending) },
                        Limit = fetch,
                        DtoOptions = dtoOptions,
                    });

                    var mapped = _dto.GetBaseItemDtos(items, dtoOptions, user).Select(d => MapLibraryItem(d, PlayAction.Resume)).ToList();
                    foreach (var m in mapped)
                    {
                        resumeIds.Add(m.Id);
                    }

                    return mapped;
                });
            }

            if (settings.IsVisible(TvSettings.NextUp))
            {
                AddRow(response, built, TvSettings.NextUp, "landscape", () =>
                {
                    var result = _tv.GetNextUp(new NextUpQuery { UserId = user.InternalId, Limit = fetch + resumeIds.Count }, user, dtoOptions);
                    var items = result?.Items ?? new BaseItem[0];
                    return _dto.GetBaseItemDtos(items, dtoOptions, user)
                        .Select(d => MapLibraryItem(d, PlayAction.Play))
                        .Where(i => !resumeIds.Contains(i.Id))
                        .Take(fetch)
                        .ToList();
                });
            }

            if (settings.IsVisible(TvSettings.RecentlyAdded))
            {
                AddRow(response, built, TvSettings.RecentlyAdded, "landscape", () =>
                {
                    var items = _library.GetItemList(new InternalItemsQuery(user)
                    {
                        Recursive = true,
                        IncludeItemTypes = new[] { "Movie", "Series" },
                        OrderBy = new[] { ValueTuple.Create("DateLastContentAdded", SortOrder.Descending) },
                        Limit = fetch + resumeIds.Count,
                        DtoOptions = dtoOptions,
                    });
                    return _dto.GetBaseItemDtos(items, dtoOptions, user)
                        .Select(d => MapLibraryItem(d, PlayAction.Play))
                        .Where(i => !resumeIds.Contains(i.Id))
                        .Take(fetch)
                        .ToList();
                });
            }

            if (settings.IsVisible(TvSettings.LiveNow))
            {
                AddRow(response, built, TvSettings.LiveNow, "landscape", () =>
                {
                    var result = _liveTv.GetRecommendedPrograms(new InternalItemsQuery(user)
                    {
                        IsAiring = true,
                        Limit = fetch,
                        DtoOptions = dtoOptions,
                    }, ct);

                    return (result?.Items ?? new BaseItemDto[0]).Select(MapProgram).Where(p => p.PlayItemId != null).ToList();
                });
            }

            var teams = tv.SportsTeams ?? new string[0];
            if (settings.IsVisible(TvSettings.Sports) && teams.Length > 0)
            {
                AddRow(response, built, TvSettings.Sports, "landscape", () =>
                {
                    var now = DateTimeOffset.UtcNow;
                    var programs = GetSportsPrograms(user, now, now.AddHours(settings.SportsLookaheadHours), dtoOptions, ct);

                    return programs
                        .Where(p => MatchesTeam(p, teams))
                        .Select(MapProgram)
                        .Where(p => p.PlayItemId != null)
                        // Same game is often on several channels; keep the first listing of each.
                        .GroupBy(p => (p.Title ?? string.Empty) + "|" + (p.Subtitle ?? string.Empty) + "|" + p.StartDate)
                        .Select(g => g.First())
                        .OrderByDescending(p => p.IsAiring == true)
                        .ThenBy(p => p.StartDate, StringComparer.Ordinal)
                        .Take(fetch)
                        .ToList();
                });
            }

            foreach (var t in seerrTasks)
            {
                var results = await t.Item3.ConfigureAwait(false);
                if (results == null)
                {
                    if (!response.Warnings.Contains("Seerr is unreachable"))
                    {
                        response.Warnings.Add("Seerr is unreachable");
                    }

                    continue;
                }

                var row = new HomeRow { Id = t.Item1, Title = TvSettings.FindRow(t.Item1).Title, Layout = "poster" };
                row.Items.AddRange(results.Take(fetch).Select(MapSeerr));
                if (row.Items.Count > 0)
                {
                    built[row.Id] = row;
                }
            }

            var featured = new List<HomeItem>();
            try
            {
                featured = await BuildFeatured(user, tv.SportsTeams ?? new string[0], featuredTrending, ct).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.ErrorException("could not build the featured titles", ex);
            }

            try
            {
                MatchLibrary(user, featured.Where(f => f.Kind == "discover").Concat(built.Values.Where(r => r.Id.StartsWith("seerr-", StringComparison.Ordinal)).SelectMany(r => r.Items)).ToList(), dtoOptions);
            }
            catch (Exception ex)
            {
                // Matching is a convenience; Seerr rows still work without it.
                _logger.ErrorException("could not match Seerr titles to the Emby library", ex);
            }

            // Each title appears once, in the first row (in this TV's order) that has it.
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var f in featured)
            {
                // A featured title the library matched is only kept if it isn't the same title as an earlier one.
                if (f.Keys.Any(seen.Contains))
                {
                    continue;
                }

                foreach (var key in f.Keys)
                {
                    seen.Add(key);
                }

                response.Featured.Add(f);
            }

            foreach (var id in settings.RowOrder)
            {
                if (!built.TryGetValue(id, out var row))
                {
                    continue;
                }

                row.Items = row.Items.Where(item =>
                {
                    if (item.Keys.Any(seen.Contains))
                    {
                        return false;
                    }

                    foreach (var key in item.Keys)
                    {
                        seen.Add(key);
                    }

                    return true;
                }).Take(limit).ToList();

                if (row.Items.Count > 0)
                {
                    response.Rows.Add(row);
                }
            }

            return response;
        }

        /// <summary>
        /// The featured mix: games for the TV's first two teams that are on now or start within the hour (first),
        /// then the title being watched most recently, the newest library additions not yet watched, and the top of
        /// Seerr's Trending list, interleaved so the area alternates between them.
        /// </summary>
        private async Task<List<HomeItem>> BuildFeatured(User user, string[] teams, Task<List<SeerrMedia>> trendingTask, CancellationToken ct)
        {
            var options = new DtoOptions(true) { EnableImages = true, ImageTypeLimit = 1, EnableUserData = true };
            var games = new List<HomeItem>();
            try
            {
                games = FeaturedGames(user, teams, options, ct);
            }
            catch (Exception ex)
            {
                // Live TV may not be set up; the rest of the featured area still works.
                _logger.Debug("featured games skipped: {0}", ex.Message);
            }

            var resume = _library.GetItemList(new InternalItemsQuery(user)
            {
                IsResumable = true,
                Recursive = true,
                IncludeItemTypes = new[] { "Movie", "Episode" },
                OrderBy = new[] { ValueTuple.Create(ItemSortBy.DatePlayed, SortOrder.Descending) },
                Limit = 1,
                DtoOptions = options,
            });

            var latest = _library.GetItemList(new InternalItemsQuery(user)
            {
                Recursive = true,
                IncludeItemTypes = new[] { "Movie", "Series" },
                IsPlayed = false,
                ImageTypes = new[] { ImageType.Backdrop },
                // A series counts from its newest episode. (Literal, since the constant isn't in every server version.)
                OrderBy = new[] { ValueTuple.Create("DateLastContentAdded", SortOrder.Descending) },
                Limit = 6,
                DtoOptions = options,
            });

            // The featured area needs background art; a title without it stays in its row instead.
            var fromResume = _dto.GetBaseItemDtos(resume, options, user).Select(d => MapFeaturedLibrary(user, d, "resume")).Where(i => i.BackdropUrl != null).ToList();
            var fromLatest = _dto.GetBaseItemDtos(latest, options, user).Select(d => MapFeaturedLibrary(user, d, "new")).Where(i => i.BackdropUrl != null).ToList();

            var fromTrending = new List<HomeItem>();
            var trending = trendingTask == null ? null : await trendingTask.ConfigureAwait(false);
            foreach (var m in (trending ?? new List<SeerrMedia>()).Where(m => !string.IsNullOrWhiteSpace(m.BackdropPath)).Take(4))
            {
                fromTrending.Add(await MapFeaturedSeerr(m, ct).ConfigureAwait(false));
            }

            var picks = new List<HomeItem>();
            var keys = new HashSet<string>(StringComparer.Ordinal);
            foreach (var game in games)
            {
                if (game.Keys.Any(keys.Contains)) continue;
                foreach (var key in game.Keys) keys.Add(key);
                picks.Add(game);
            }

            void Take(List<HomeItem> source)
            {
                foreach (var item in source)
                {
                    if (item.Keys.Any(keys.Contains))
                    {
                        continue;
                    }

                    foreach (var key in item.Keys)
                    {
                        keys.Add(key);
                    }

                    picks.Add(item);
                    source.Remove(item);
                    return;
                }
            }

            if (picks.Count < FeaturedCount) Take(fromResume);
            for (var round = 0; round < FeaturedCount && picks.Count < FeaturedCount; round++)
            {
                Take(fromTrending);
                if (picks.Count < FeaturedCount)
                {
                    Take(fromLatest);
                }
            }

            return picks;
        }

        /// <summary>One game for each of the first two teams, if it's on now or starts within the hour.</summary>
        private List<HomeItem> FeaturedGames(User user, string[] teams, DtoOptions options, CancellationToken ct)
        {
            var games = new List<HomeItem>();
            var chosen = teams.Where(t => !string.IsNullOrWhiteSpace(t)).Take(2).ToArray();
            if (chosen.Length == 0)
            {
                return games;
            }

            var now = DateTimeOffset.UtcNow;
            var programs = GetSportsPrograms(user, now, now.AddHours(1), options, ct);
            foreach (var team in chosen)
            {
                var game = programs
                    .Where(p => MatchesTeam(p, new[] { team }))
                    .OrderByDescending(p => p.StartDate <= now)
                    .ThenBy(p => p.StartDate)
                    .FirstOrDefault();
                if (game == null)
                {
                    continue;
                }

                var item = MapProgram(game);
                if (games.Any(g => g.Keys.SequenceEqual(item.Keys)))
                {
                    continue;
                }

                item.FeatureReason = "game";
                // The matchup heads the featured area; the league sits beside it, or the channel logo when there is one.
                item.Tagline = string.IsNullOrWhiteSpace(game.EpisodeTitle) ? null : game.EpisodeTitle;
                item.BackdropUrl = Image(game.Id, ImageType.Thumb, Tag(game, ImageType.Thumb))
                                   ?? Image(game.Id, ImageType.Backdrop, game.BackdropImageTags?.FirstOrDefault());
                item.LogoUrl = Image(game.ChannelId, ImageType.Primary, game.ChannelPrimaryImageTag);
                games.Add(item);
            }

            return games;
        }

        private HomeItem MapFeaturedLibrary(User user, BaseItemDto d, string reason)
        {
            HomeItem item;
            var parts = new List<string>();
            if (d.Type == "Series")
            {
                item = MapLibraryFields(d, PlayAction.Play);
                item.Kind = "series";
                item.Subtitle = d.ProductionYear?.ToString(CultureInfo.InvariantCulture);
                item.Keys.Add("series:" + d.Id);
                var tmdb = TmdbId(d.ProviderIds);
                if (tmdb != null)
                {
                    item.Keys.Add("tmdb:tv:" + tmdb);
                }

                // Play the next episode to watch; a show not started yet plays from the beginning.
                if (long.TryParse(d.Id, NumberStyles.Integer, CultureInfo.InvariantCulture, out var seriesId))
                {
                    var next = _tv.GetNextUp(new NextUpQuery { UserId = user.InternalId, SeriesId = seriesId, Limit = 1 }, user, new DtoOptions(false))?.Items?.FirstOrDefault();
                    if (next != null)
                    {
                        item.PlayItemId = next.InternalId.ToString(CultureInfo.InvariantCulture);
                        var data = _userData.GetUserData(user, next);
                        item.DefaultAction = data != null && data.PlaybackPositionTicks > 0 ? PlayAction.Resume : PlayAction.Play;
                        if (next.ParentIndexNumber.HasValue && next.IndexNumber.HasValue)
                        {
                            parts.Add(string.Format(CultureInfo.InvariantCulture, "S{0} E{1}", next.ParentIndexNumber, next.IndexNumber));
                        }
                    }
                }

                if (parts.Count == 0 && d.ProductionYear.HasValue) parts.Add(d.ProductionYear.Value.ToString(CultureInfo.InvariantCulture));
                if (!string.IsNullOrWhiteSpace(d.OfficialRating)) parts.Add(d.OfficialRating);
                if (d.Genres != null && d.Genres.Length > 0) parts.Add(d.Genres[0]);
                item.Tagline = First(d.Taglines);
                item.BackdropUrl = Image(d.Id, ImageType.Backdrop, d.BackdropImageTags?.FirstOrDefault());
                item.LogoUrl = Image(d.Id, ImageType.Logo, Tag(d, ImageType.Logo));
            }
            else
            {
                item = MapLibraryItem(d, reason == "resume" ? PlayAction.Resume : (d.UserData?.PlaybackPositionTicks > 0 ? PlayAction.Resume : PlayAction.Play));
                if (d.Type == "Episode")
                {
                    if (d.ParentIndexNumber.HasValue && d.IndexNumber.HasValue)
                    {
                        parts.Add(string.Format(CultureInfo.InvariantCulture, "S{0} E{1}", d.ParentIndexNumber, d.IndexNumber));
                    }

                    BaseItem series = null;
                    if (long.TryParse(d.SeriesId, NumberStyles.Integer, CultureInfo.InvariantCulture, out var seriesId))
                    {
                        series = _library.GetItemById(seriesId);
                    }

                    item.Tagline = series?.Tagline;
                    item.Overview = string.IsNullOrWhiteSpace(d.Overview) ? series?.Overview : d.Overview;
                    item.BackdropUrl = Image(d.ParentBackdropItemId, ImageType.Backdrop, d.ParentBackdropImageTags?.FirstOrDefault());
                    item.LogoUrl = Image(d.ParentLogoItemId, ImageType.Logo, d.ParentLogoImageTag);
                }
                else
                {
                    if (d.ProductionYear.HasValue) parts.Add(d.ProductionYear.Value.ToString(CultureInfo.InvariantCulture));
                    if (!string.IsNullOrWhiteSpace(d.OfficialRating)) parts.Add(d.OfficialRating);
                    item.Tagline = First(d.Taglines);
                    item.BackdropUrl = Image(d.Id, ImageType.Backdrop, d.BackdropImageTags?.FirstOrDefault());
                    item.LogoUrl = Image(d.Id, ImageType.Logo, Tag(d, ImageType.Logo));
                }

                var left = item.PositionTicks > 0 && item.RuntimeTicks > item.PositionTicks ? item.RuntimeTicks - item.PositionTicks : null;
                parts.Add(left.HasValue ? Duration(left.Value) + " left" : (d.RunTimeTicks > 0 ? Duration(d.RunTimeTicks.Value) : null));
            }

            item.Meta = string.Join(" · ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
            item.FeatureReason = reason;
            return item;
        }

        private async Task<HomeItem> MapFeaturedSeerr(SeerrMedia m, CancellationToken ct)
        {
            var item = MapSeerr(m);
            item.BackdropUrl = TmdbImageBase + "w1280" + m.BackdropPath;
            item.FeatureReason = "trending";
            var parts = new List<string> { item.Year?.ToString(CultureInfo.InvariantCulture), m.MediaType == "tv" ? "Series" : "Movie" };
            try
            {
                var details = await _seerr.Details(m.MediaType, m.Id, ct).ConfigureAwait(false);
                item.Tagline = details?.Tagline;
                parts.Add(details?.Genres?.Select(g => g.Name).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)));
                if (m.MediaType == "tv" && details?.NumberOfSeasons > 0)
                {
                    parts.Add(details.NumberOfSeasons == 1 ? "1 season" : details.NumberOfSeasons + " seasons");
                }
                else if (details?.Runtime > 0)
                {
                    parts.Add(Duration(TimeSpan.FromMinutes(details.Runtime.Value).Ticks));
                }
            }
            catch (Exception ex)
            {
                // Without details the title still shows, headed by its name.
                _logger.Debug("Seerr details for {0} {1} failed: {2}", m.MediaType, m.Id, ex.Message);
            }

            item.Meta = string.Join(" · ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
            return item;
        }

        private static string First(string[] values) => values?.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();

        /// <summary>"2h 10m", "45m".</summary>
        private static string Duration(long ticks)
        {
            var minutes = (int)Math.Round(TimeSpan.FromTicks(ticks).TotalMinutes);
            if (minutes < 1) return null;
            return minutes >= 60 ? (minutes / 60) + "h " + (minutes % 60) + "m" : minutes + "m";
        }

        /// <summary>
        /// Links Seerr titles that Seerr reports as available (or partly available) to the Emby library by TMDB id,
        /// so the TV can play them: a movie directly, a show at its next episode.
        /// </summary>
        private void MatchLibrary(User user, List<HomeItem> items, DtoOptions dtoOptions)
        {
            var candidates = items.Where(i => i.TmdbId > 0 && (i.RequestStatus == "available" || i.RequestStatus == "partial")).ToList();
            if (candidates.Count == 0)
            {
                return;
            }

            var ids = candidates.Select(i => i.TmdbId.Value.ToString(CultureInfo.InvariantCulture)).Distinct().ToList();
            var found = _library.GetItemList(new InternalItemsQuery(user)
            {
                Recursive = true,
                IncludeItemTypes = new[] { "Movie", "Series" },
                AnyProviderIdEquals = ids.Select(id => new KeyValuePair<string, string>("Tmdb", id)).ToList(),
                // Emby only loads the fields asked for; load whole items (ids, provider ids) for the few matches.
                DtoOptions = new DtoOptions(true),
            });

            var byKey = new Dictionary<string, BaseItem>(StringComparer.Ordinal);
            foreach (var item in found)
            {
                var tmdb = TmdbId(item.ProviderIds);
                if (tmdb == null)
                {
                    continue;
                }

                var key = (item.GetClientTypeName() == "Series" ? "tv:" : "movie:") + tmdb;
                if (!byKey.ContainsKey(key))
                {
                    byKey[key] = item;
                }
            }

            foreach (var c in candidates)
            {
                if (!byKey.TryGetValue(c.MediaType + ":" + c.TmdbId.Value.ToString(CultureInfo.InvariantCulture), out var match))
                {
                    continue;
                }

                BaseItem play = match;
                if (c.MediaType == "tv")
                {
                    c.Keys.Add("series:" + match.InternalId.ToString(CultureInfo.InvariantCulture));
                    var next = _tv.GetNextUp(new NextUpQuery { UserId = user.InternalId, SeriesId = match.InternalId, Limit = 1 }, user, dtoOptions);
                    play = next?.Items?.FirstOrDefault() ?? match;
                }
                else
                {
                    c.Keys.Add("item:" + match.InternalId.ToString(CultureInfo.InvariantCulture));
                }

                var data = _userData.GetUserData(user, play);
                c.PlayItemId = play.InternalId.ToString(CultureInfo.InvariantCulture);
                c.PlayAction = data != null && data.PlaybackPositionTicks > 0 ? PlayAction.Resume : PlayAction.Play;
                if (c.RequestStatus == "available")
                {
                    c.DefaultAction = c.PlayAction;
                }
            }
        }

        private static string TmdbId(IDictionary<string, string> providerIds)
        {
            if (providerIds == null)
            {
                return null;
            }

            foreach (var pair in providerIds)
            {
                if (string.Equals(pair.Key, "Tmdb", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(pair.Value))
                {
                    return pair.Value.Trim();
                }
            }

            return null;
        }

        /// <summary>Sports programmes in the guide between two times, soonest first.</summary>
        public BaseItemDto[] GetSportsPrograms(User user, DateTimeOffset from, DateTimeOffset to, DtoOptions dtoOptions, CancellationToken ct)
        {
            var result = _liveTv.GetPrograms(new InternalItemsQuery(user)
            {
                IsSports = true,
                MinEndDate = from,
                MaxStartDate = to,
                OrderBy = new[] { ValueTuple.Create(ItemSortBy.StartDate, SortOrder.Ascending) },
                Limit = 5000,
                DtoOptions = dtoOptions ?? new DtoOptions(false),
            }, ct);

            return result?.Items ?? new BaseItemDto[0];
        }

        private void AddRow(HomeResponse response, Dictionary<string, HomeRow> built, string id, string layout, Func<List<HomeItem>> build)
        {
            var title = TvSettings.FindRow(id).Title;
            try
            {
                var items = build();
                if (items.Count > 0)
                {
                    built[id] = new HomeRow { Id = id, Title = title, Layout = layout, Items = items };
                }
            }
            catch (Exception ex)
            {
                // One broken row (e.g. Live TV not set up) must not take down the home screen.
                _logger.ErrorException("failed to build row '{0}'", ex, id);
                response.Warnings.Add("Could not load " + title);
            }
        }

        private async Task<List<SeerrMedia>> SafeDiscover(string kind, CancellationToken ct)
        {
            try
            {
                return await _seerr.Discover(kind, ct).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.Warn("Seerr discover '{0}' failed: {1}", kind, ex.Message);
                return null;
            }
        }

        /// <summary>
        /// A game involving a chosen team: the listing's title or episode title must be a matchup ("A at B",
        /// "A vs B", "League: A v B") naming the team. Descriptions aren't searched, so preview shows, highlights and
        /// talk shows that mention a team are left out, and so are replays of old games.
        /// </summary>
        private static bool MatchesTeam(BaseItemDto p, string[] teams)
        {
            if (p.IsRepeat == true && p.IsLive != true)
            {
                return false;
            }

            var playing = SportsTeams.ExtractTeams(p.Name, p.EpisodeTitle, out _);
            return playing.Any(listed => teams.Any(chosen => SportsTeams.SameTeam(listed, chosen)));
        }

        private static HomeItem MapLibraryItem(BaseItemDto d, string defaultAction)
        {
            var item = MapLibraryFields(d, defaultAction);
            item.Keys.Add("item:" + d.Id);
            if (d.Type == "Episode" && !string.IsNullOrEmpty(d.SeriesId))
            {
                item.Keys.Add("series:" + d.SeriesId);
            }

            var tmdb = TmdbId(d.ProviderIds);
            if (d.Type == "Movie" && tmdb != null)
            {
                item.Keys.Add("tmdb:movie:" + tmdb);
            }

            return item;
        }

        private static HomeItem MapLibraryFields(BaseItemDto d, string defaultAction)
        {
            var item = new HomeItem
            {
                Id = d.Id,
                Kind = d.Type == "Episode" ? "episode" : "movie",
                Title = d.Type == "Episode" ? (d.SeriesName ?? d.Name) : d.Name,
                Year = d.ProductionYear,
                Overview = d.Overview,
                RuntimeTicks = d.RunTimeTicks,
                PlayItemId = d.Id,
                DefaultAction = defaultAction,
            };

            if (d.Type == "Episode")
            {
                var number = d.ParentIndexNumber.HasValue && d.IndexNumber.HasValue
                    ? string.Format(CultureInfo.InvariantCulture, "S{0}:E{1} · ", d.ParentIndexNumber, d.IndexNumber)
                    : string.Empty;
                item.Subtitle = number + d.Name;
                item.LandscapeUrl = Image(d.Id, ImageType.Primary, Tag(d, ImageType.Primary))
                                    ?? Image(d.ParentThumbItemId, ImageType.Thumb, d.ParentThumbImageTag)
                                    ?? Image(d.ParentBackdropItemId, ImageType.Backdrop, d.ParentBackdropImageTags?.FirstOrDefault());
                item.PosterUrl = Image(d.SeriesId, ImageType.Primary, d.SeriesPrimaryImageTag) ?? item.LandscapeUrl;
            }
            else
            {
                item.Subtitle = d.ProductionYear?.ToString(CultureInfo.InvariantCulture);
                item.PosterUrl = Image(d.Id, ImageType.Primary, Tag(d, ImageType.Primary));
                item.LandscapeUrl = Image(d.Id, ImageType.Thumb, Tag(d, ImageType.Thumb))
                                    ?? Image(d.Id, ImageType.Backdrop, d.BackdropImageTags?.FirstOrDefault())
                                    ?? item.PosterUrl;
            }

            var ud = d.UserData;
            if (ud != null && ud.PlaybackPositionTicks > 0)
            {
                item.PositionTicks = ud.PlaybackPositionTicks;
                item.ProgressPercent = ud.PlayedPercentage.HasValue
                    ? Math.Round(ud.PlayedPercentage.Value, 1)
                    : (d.RunTimeTicks > 0 ? Math.Round(100.0 * ud.PlaybackPositionTicks / d.RunTimeTicks.Value, 1) : (double?)null);
            }

            return item;
        }

        private static HomeItem MapProgram(BaseItemDto p)
        {
            var now = DateTimeOffset.UtcNow;
            var airing = p.StartDate <= now && p.EndDate > now;
            var item = new HomeItem
            {
                Id = p.Id,
                Kind = "program",
                Title = p.Name,
                Subtitle = p.EpisodeTitle,
                Overview = p.Overview,
                ChannelName = p.ChannelName,
                ChannelNumber = p.ChannelNumber,
                StartDate = p.StartDate?.UtcDateTime.ToString("o"),
                EndDate = p.EndDate?.UtcDateTime.ToString("o"),
                IsAiring = airing,
                PlayItemId = p.ChannelId,
                DefaultAction = PlayAction.Play,
            };
            item.Keys.Add("program:" + p.Id);
            item.Keys.Add("game:" + (p.Name ?? string.Empty) + "|" + (p.EpisodeTitle ?? string.Empty) + "|" + item.StartDate);

            if (airing && p.StartDate.HasValue && p.EndDate.HasValue)
            {
                var total = (p.EndDate.Value - p.StartDate.Value).TotalSeconds;
                if (total > 0)
                {
                    item.ProgressPercent = Math.Round(100.0 * (now - p.StartDate.Value).TotalSeconds / total, 1);
                }
            }

            var channelLogo = Image(p.ChannelId, ImageType.Primary, p.ChannelPrimaryImageTag);
            item.LandscapeUrl = Image(p.Id, ImageType.Thumb, Tag(p, ImageType.Thumb))
                                ?? Image(p.Id, ImageType.Primary, Tag(p, ImageType.Primary))
                                ?? channelLogo;
            item.PosterUrl = Image(p.Id, ImageType.Primary, Tag(p, ImageType.Primary)) ?? channelLogo;
            return item;
        }

        private static HomeItem MapSeerr(SeerrMedia m)
        {
            var date = m.MediaType == "tv" ? m.FirstAirDate : m.ReleaseDate;
            int? year = null;
            if (!string.IsNullOrWhiteSpace(date) && date.Length >= 4 && int.TryParse(date.Substring(0, 4), out var y))
            {
                year = y;
            }

            var item = new HomeItem
            {
                Id = m.MediaType + ":" + m.Id,
                Kind = "discover",
                Title = m.MediaType == "tv" ? (m.Name ?? m.Title) : (m.Title ?? m.Name),
                Subtitle = year?.ToString(CultureInfo.InvariantCulture),
                Year = year,
                Overview = m.Overview,
                PosterUrl = string.IsNullOrWhiteSpace(m.PosterPath) ? null : TmdbImageBase + "w342" + m.PosterPath,
                LandscapeUrl = string.IsNullOrWhiteSpace(m.BackdropPath) ? null : TmdbImageBase + "w780" + m.BackdropPath,
                TmdbId = m.Id,
                MediaType = m.MediaType,
                RequestStatus = MapStatus(m.MediaInfo?.Status ?? 0),
                DefaultAction = "request",
            };
            item.Keys.Add("tmdb:" + m.MediaType + ":" + m.Id.ToString(CultureInfo.InvariantCulture));
            return item;
        }

        /// <summary>Seerr MediaStatus: 1 unknown, 2 pending, 3 processing, 4 partially available, 5 available.</summary>
        private static string MapStatus(int status)
        {
            switch (status)
            {
                case 2: return "requested";
                case 3: return "processing";
                case 4: return "partial";
                case 5: return "available";
                default: return "none";
            }
        }

        private static string Tag(BaseItemDto d, ImageType type)
        {
            return d.ImageTags != null && d.ImageTags.TryGetValue(type, out var tag) ? tag : null;
        }

        private static string Image(string itemId, ImageType type, string tag)
        {
            if (string.IsNullOrWhiteSpace(itemId) || string.IsNullOrWhiteSpace(tag))
            {
                return null;
            }

            return "/emby/Items/" + itemId + "/Images/" + type + "?tag=" + Uri.EscapeDataString(tag);
        }
    }
}
