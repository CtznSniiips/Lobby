using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Lobby.Services
{
    public class SeerrUser
    {
        public int Id { get; set; }
        public string DisplayName { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string PlexUsername { get; set; }

        /// <summary>Seerr keeps Jellyseerr's field names; both Emby- and Jellyfin-linked accounts store the server user id here.</summary>
        public string JellyfinUserId { get; set; }
        public string JellyfinUsername { get; set; }
        public string Avatar { get; set; }
        public int UserType { get; set; }

        public string BestName =>
            FirstNonEmpty(DisplayName, JellyfinUsername, Username, PlexUsername, Email) ?? ("User " + Id);

        private static string FirstNonEmpty(params string[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
    }

    public class SeerrPageInfo
    {
        public int Pages { get; set; }
        public int Page { get; set; }
        public int Results { get; set; }
    }

    public class SeerrUserPage
    {
        public SeerrPageInfo PageInfo { get; set; }
        public List<SeerrUser> Results { get; set; }
    }

    public class SeerrMediaInfo
    {
        public int Status { get; set; }
    }

    public class SeerrMedia
    {
        public int Id { get; set; }
        public string MediaType { get; set; }
        public string Title { get; set; }
        public string Name { get; set; }
        public string ReleaseDate { get; set; }
        public string FirstAirDate { get; set; }
        public string PosterPath { get; set; }
        public string BackdropPath { get; set; }
        public string Overview { get; set; }
        public double VoteAverage { get; set; }
        public SeerrMediaInfo MediaInfo { get; set; }
    }

    public class SeerrGenre
    {
        public string Name { get; set; }
    }

    public class SeerrPerson
    {
        public string Name { get; set; }
        public string Character { get; set; }
        public string Job { get; set; }
        public string ProfilePath { get; set; }
        public int? Order { get; set; }
    }

    public class SeerrCredits
    {
        public List<SeerrPerson> Cast { get; set; }
        public List<SeerrPerson> Crew { get; set; }
    }

    public class SeerrCompany
    {
        public string Name { get; set; }
    }

    /// <summary>The parts of Seerr's /movie/{id} and /tv/{id} details that Lobby uses.</summary>
    public class SeerrDetails
    {
        public string Tagline { get; set; }
        public string Overview { get; set; }
        public int? Runtime { get; set; }
        public List<int> EpisodeRunTime { get; set; }
        public int? NumberOfSeasons { get; set; }
        public string ReleaseDate { get; set; }
        public string FirstAirDate { get; set; }
        public double? VoteAverage { get; set; }
        public List<SeerrGenre> Genres { get; set; }
        public SeerrCredits Credits { get; set; }
        public List<SeerrPerson> CreatedBy { get; set; }
        public List<SeerrCompany> Networks { get; set; }
    }

    public class SeerrDiscoverPage
    {
        public int Page { get; set; }
        public int TotalPages { get; set; }
        public List<SeerrMedia> Results { get; set; }
    }

    public class SeerrRequestResult
    {
        public int Id { get; set; }

        /// <summary>1 pending approval, 2 approved, 3 declined.</summary>
        public int Status { get; set; }
    }

    public class SeerrError
    {
        public string Message { get; set; }
    }

    public class SeerrException : Exception
    {
        public SeerrException(string message, int statusCode = 0)
            : base(message)
        {
            StatusCode = statusCode;
        }

        public int StatusCode { get; }
    }

    /// <summary>Thin client for the parts of the Seerr API that Lobby uses.</summary>
    public class SeerrClient
    {
        private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        private static readonly TimeSpan DiscoverCacheLifetime = TimeSpan.FromMinutes(10);

        // Seerr's JSON is camelCase; our model classes are PascalCase, matched case-insensitively.
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString,
        };

        private readonly ILogger _logger;
        private static readonly TimeSpan DetailsCacheLifetime = TimeSpan.FromHours(12);
        private readonly ConcurrentDictionary<string, Tuple<DateTime, SeerrDetails>> _detailsCache =
            new ConcurrentDictionary<string, Tuple<DateTime, SeerrDetails>>();
        private readonly ConcurrentDictionary<string, Tuple<DateTime, List<SeerrMedia>>> _discoverCache =
            new ConcurrentDictionary<string, Tuple<DateTime, List<SeerrMedia>>>();

        public SeerrClient(ILogger logger)
        {
            _logger = logger;
        }

        public bool IsConfigured
        {
            get
            {
                var c = Plugin.Instance.Configuration;
                return !string.IsNullOrWhiteSpace(c.SeerrUrl) && !string.IsNullOrWhiteSpace(c.SeerrApiKey);
            }
        }

        public string BaseUrl => (Plugin.Instance.Configuration.SeerrUrl ?? string.Empty).Trim().TrimEnd('/');

        public async Task<List<SeerrUser>> GetUsers(CancellationToken ct, string baseUrl = null, string apiKey = null)
        {
            var users = new List<SeerrUser>();
            const int take = 100;
            for (var skip = 0; skip < 5000; skip += take)
            {
                var page = await Send<SeerrUserPage>(HttpMethod.Get, "/api/v1/user?take=" + take + "&skip=" + skip + "&sort=created", null, ct, baseUrl, apiKey).ConfigureAwait(false);
                var results = page?.Results ?? new List<SeerrUser>();
                users.AddRange(results);
                var total = page?.PageInfo?.Results ?? 0;
                if (results.Count < take || users.Count >= total)
                {
                    break;
                }
            }

            return users;
        }

        /// <summary>kind: trending, movies or tv.</summary>
        public async Task<List<SeerrMedia>> Discover(string kind, CancellationToken ct)
        {
            if (_discoverCache.TryGetValue(kind, out var cached) && DateTime.UtcNow - cached.Item1 < DiscoverCacheLifetime)
            {
                return cached.Item2;
            }

            var page = await Send<SeerrDiscoverPage>(HttpMethod.Get, "/api/v1/discover/" + kind + "?page=1", null, ct).ConfigureAwait(false);
            var results = (page?.Results ?? new List<SeerrMedia>())
                .Where(m => m.MediaType == "movie" || m.MediaType == "tv" || (m.MediaType == null && kind != "trending"))
                .ToList();

            foreach (var m in results.Where(m => m.MediaType == null))
            {
                m.MediaType = kind == "movies" ? "movie" : "tv";
            }

            _discoverCache[kind] = Tuple.Create(DateTime.UtcNow, results);
            return results;
        }

        public async Task<List<SeerrMedia>> Search(string query, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new List<SeerrMedia>();
            }

            var page = await Send<SeerrDiscoverPage>(HttpMethod.Get, "/api/v1/search?query=" + Uri.EscapeDataString(query) + "&page=1", null, ct).ConfigureAwait(false);
            return (page?.Results ?? new List<SeerrMedia>())
                .Where(m => m.MediaType == "movie" || m.MediaType == "tv")
                .ToList();
        }

        /// <summary>Tagline, runtime and genres for one title. Cached, since they rarely change.</summary>
        public async Task<SeerrDetails> Details(string mediaType, int tmdbId, CancellationToken ct)
        {
            var key = mediaType + ":" + tmdbId.ToString(System.Globalization.CultureInfo.InvariantCulture);
            if (_detailsCache.TryGetValue(key, out var cached) && DateTime.UtcNow - cached.Item1 < DetailsCacheLifetime)
            {
                return cached.Item2;
            }

            var details = await Send<SeerrDetails>(HttpMethod.Get, "/api/v1/" + (mediaType == "tv" ? "tv/" : "movie/") + key.Substring(key.IndexOf(':') + 1), null, ct).ConfigureAwait(false);
            _detailsCache[key] = Tuple.Create(DateTime.UtcNow, details);
            return details;
        }

        /// <summary>Forget cached discover rows, e.g. after a request changes an item's status.</summary>
        public void InvalidateDiscover()
        {
            _discoverCache.Clear();
        }

        public async Task<SeerrRequestResult> Request(string mediaType, int tmdbId, int seerrUserId, CancellationToken ct)
        {
            var body = new Dictionary<string, object>
            {
                { "mediaType", mediaType },
                { "mediaId", tmdbId },
                { "userId", seerrUserId },
            };

            if (mediaType == "tv")
            {
                body["seasons"] = "all";
            }

            var result = await Send<SeerrRequestResult>(HttpMethod.Post, "/api/v1/request", JsonSerializer.Serialize(body), ct).ConfigureAwait(false);
            InvalidateDiscover();
            return result;
        }

        /// <summary>Makes a Seerr-relative path (avatars) absolute.</summary>
        public string Absolute(string pathOrUrl)
        {
            if (string.IsNullOrWhiteSpace(pathOrUrl))
            {
                return null;
            }

            if (pathOrUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || pathOrUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return pathOrUrl;
            }

            if (pathOrUrl.StartsWith("//", StringComparison.Ordinal))
            {
                return "https:" + pathOrUrl;
            }

            return BaseUrl + (pathOrUrl.StartsWith("/", StringComparison.Ordinal) ? pathOrUrl : "/" + pathOrUrl);
        }

        private async Task<T> Send<T>(HttpMethod method, string path, string jsonBody, CancellationToken ct, string baseUrl = null, string apiKey = null)
        {
            var c = Plugin.Instance.Configuration;
            baseUrl = (baseUrl ?? c.SeerrUrl ?? string.Empty).Trim().TrimEnd('/');
            apiKey = (apiKey ?? c.SeerrApiKey ?? string.Empty).Trim();
            if (baseUrl.Length == 0 || apiKey.Length == 0)
            {
                throw new SeerrException("Seerr is not configured in the Lobby plugin settings.");
            }

            using (var req = new HttpRequestMessage(method, baseUrl + path))
            {
                req.Headers.TryAddWithoutValidation("X-Api-Key", apiKey);
                req.Headers.TryAddWithoutValidation("Accept", "application/json");
                if (jsonBody != null)
                {
                    req.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                }

                HttpResponseMessage resp;
                try
                {
                    resp = await Http.SendAsync(req, ct).ConfigureAwait(false);
                }
                catch (Exception ex) when (!(ex is OperationCanceledException) || !ct.IsCancellationRequested)
                {
                    _logger.LogWarning("Seerr request {Method} {Path} failed: {Message}", method, path, ex.Message);
                    throw new SeerrException("Could not reach Seerr at " + baseUrl + ": " + ex.Message);
                }

                using (resp)
                {
                    var text = resp.Content == null ? string.Empty : await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (!resp.IsSuccessStatusCode)
                    {
                        string message = null;
                        try
                        {
                            message = JsonSerializer.Deserialize<SeerrError>(text, JsonOptions)?.Message;
                        }
                        catch
                        {
                            // Not JSON; fall through to the status line.
                        }

                        var status = (int)resp.StatusCode;
                        if (status == 401 || status == 403)
                        {
                            message = message ?? "Seerr rejected the API key.";
                        }

                        _logger.LogWarning("Seerr {Method} {Path} returned {Status}: {Message}", method, path, status, message ?? text);
                        throw new SeerrException(message ?? ("Seerr returned HTTP " + status), status);
                    }

                    return string.IsNullOrWhiteSpace(text) ? default(T) : JsonSerializer.Deserialize<T>(text, JsonOptions);
                }
            }
        }
    }
}
