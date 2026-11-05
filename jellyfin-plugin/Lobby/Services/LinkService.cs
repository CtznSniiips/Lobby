using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lobby.Configuration;
using MediaBrowser.Controller.Library;
using Microsoft.Extensions.Logging;

namespace Lobby.Services
{
    public class SyncReport
    {
        public int SeerrUsers { get; set; }
        public int AutoLinked { get; set; }
        public int Suggested { get; set; }
        public int ManualKept { get; set; }
        public UserLink[] Links { get; set; }
    }

    /// <summary>Links Jellyfin users to Seerr users so requests from a TV are made as the right person.</summary>
    public class LinkService
    {
        private static readonly TimeSpan UserCacheLifetime = TimeSpan.FromMinutes(5);

        private readonly SeerrClient _seerr;
        private readonly IUserManager _userManager;
        private readonly ILogger _logger;
        private readonly SemaphoreSlim _cacheLock = new SemaphoreSlim(1, 1);
        private List<SeerrUser> _cachedUsers;
        private DateTime _cachedAt;

        public LinkService(SeerrClient seerr, IUserManager userManager, ILogger logger)
        {
            _seerr = seerr;
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<List<SeerrUser>> GetSeerrUsers(CancellationToken ct, bool forceRefresh = false)
        {
            await _cacheLock.WaitAsync(ct).ConfigureAwait(false);
            try
            {
                if (forceRefresh || _cachedUsers == null || DateTime.UtcNow - _cachedAt > UserCacheLifetime)
                {
                    _cachedUsers = await _seerr.GetUsers(ct).ConfigureAwait(false);
                    _cachedAt = DateTime.UtcNow;
                }

                return _cachedUsers;
            }
            finally
            {
                _cacheLock.Release();
            }
        }

        public void ClearCache()
        {
            _cachedUsers = null;
        }

        /// <summary>Seerr user ids a Jellyfin user may request as (auto and manual links only).</summary>
        public int[] GetLinkedSeerrUserIds(string jellyfinUserId)
        {
            var id = TvRegistry.NormalizeId(jellyfinUserId);
            return Plugin.Instance.Configuration.UserLinks
                .Where(l => l.JellyfinUserId == id && l.Source != LinkSource.Suggested)
                .Select(l => l.SeerrUserId)
                .Distinct()
                .ToArray();
        }

        /// <summary>
        /// Rebuilds automatic links from Seerr's stored Jellyfin ids and suggests username/email matches.
        /// Manual links are never touched.
        /// </summary>
        public async Task<SyncReport> Sync(CancellationToken ct)
        {
            var seerrUsers = await GetSeerrUsers(ct, forceRefresh: true).ConfigureAwait(false);
            var jellyfinUsers = _userManager.Users.ToList();
            var report = new SyncReport { SeerrUsers = seerrUsers.Count };

            UserLink[] result = null;
            Plugin.Instance.Mutate(c =>
            {
                var manual = c.UserLinks.Where(l => l.Source == LinkSource.Manual).ToList();
                var links = new List<UserLink>(manual);
                report.ManualKept = manual.Count;

                // 1. Exact: Seerr already knows this account's Jellyfin user id.
                foreach (var su in seerrUsers.Where(s => !string.IsNullOrWhiteSpace(s.JellyfinUserId)))
                {
                    var sid = TvRegistry.NormalizeId(su.JellyfinUserId);
                    var ju = jellyfinUsers.FirstOrDefault(u => TvRegistry.NormalizeId(u.Id.ToString("N")) == sid);
                    if (ju == null)
                    {
                        continue;
                    }

                    var jid = ju.Id.ToString("N");
                    if (!links.Any(l => l.JellyfinUserId == jid && l.SeerrUserId == su.Id))
                    {
                        links.Add(new UserLink { JellyfinUserId = jid, SeerrUserId = su.Id, Source = LinkSource.Auto, SeerrDisplayName = su.BestName });
                        report.AutoLinked++;
                    }
                }

                // 2. Suggestions: Jellyfin users still without any link, matched on name or email.
                // A Seerr account may already be linked to another (shared) Jellyfin login; it can still be
                // suggested for its owner's own Jellyfin account. Seerr accounts tied to a different Jellyfin
                // user via jellyfinUserId are skipped.
                foreach (var ju in jellyfinUsers)
                {
                    var jid = ju.Id.ToString("N");
                    if (links.Any(l => l.JellyfinUserId == jid))
                    {
                        continue;
                    }

                    var name = (ju.Username ?? string.Empty).Trim();
                    if (name.Length == 0)
                    {
                        continue;
                    }

                    foreach (var su in seerrUsers.Where(s => string.IsNullOrWhiteSpace(s.JellyfinUserId)))
                    {
                        if (NameMatches(name, su))
                        {
                            links.Add(new UserLink { JellyfinUserId = jid, SeerrUserId = su.Id, Source = LinkSource.Suggested, SeerrDisplayName = su.BestName });
                            report.Suggested++;
                        }
                    }
                }

                // Refresh cached display names.
                foreach (var l in links)
                {
                    var su = seerrUsers.FirstOrDefault(s => s.Id == l.SeerrUserId);
                    if (su != null)
                    {
                        l.SeerrDisplayName = su.BestName;
                    }
                }

                c.UserLinks = links.ToArray();
                result = c.UserLinks;
            });

            report.Links = result;
            _logger.LogInformation("Seerr link sync found {SeerrUsers} Seerr users, {AutoLinked} auto links, {Suggested} suggestions, kept {ManualKept} manual links",
                report.SeerrUsers, report.AutoLinked, report.Suggested, report.ManualKept);
            return report;
        }

        /// <summary>Replaces the whole link list with what the admin page submitted.</summary>
        public UserLink[] Save(IEnumerable<UserLink> submitted)
        {
            var jellyfinIds = new HashSet<string>(_userManager.Users.Select(u => u.Id.ToString("N")));
            var clean = (submitted ?? Enumerable.Empty<UserLink>())
                .Where(l => l != null && l.SeerrUserId > 0)
                .Select(l => new UserLink
                {
                    JellyfinUserId = TvRegistry.NormalizeId(l.JellyfinUserId),
                    SeerrUserId = l.SeerrUserId,
                    Source = l.Source == LinkSource.Auto || l.Source == LinkSource.Suggested ? l.Source : LinkSource.Manual,
                    SeerrDisplayName = l.SeerrDisplayName,
                })
                .Where(l => l.JellyfinUserId != null && jellyfinIds.Contains(l.JellyfinUserId))
                .GroupBy(l => l.JellyfinUserId + ":" + l.SeerrUserId)
                .Select(g => g.First())
                .ToArray();

            Plugin.Instance.Mutate(c => c.UserLinks = clean);
            return clean;
        }

        private static bool NameMatches(string jellyfinName, SeerrUser su)
        {
            bool Eq(string s) => !string.IsNullOrWhiteSpace(s) && string.Equals(s.Trim(), jellyfinName, StringComparison.OrdinalIgnoreCase);

            if (Eq(su.Username) || Eq(su.DisplayName) || Eq(su.JellyfinUsername) || Eq(su.PlexUsername))
            {
                return true;
            }

            if (!string.IsNullOrWhiteSpace(su.Email))
            {
                var at = su.Email.IndexOf('@');
                if (Eq(su.Email) || (at > 0 && Eq(su.Email.Substring(0, at))))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
