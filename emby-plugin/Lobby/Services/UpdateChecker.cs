using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Runtime.Serialization;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Model.Logging;
using MediaBrowser.Model.Serialization;

namespace Lobby.Services
{
    // GitHub's Releases API is snake_case; DataMember names are given explicitly rather than relying on
    // Emby's IJsonSerializer to strip underscores (its case-insensitive matching for Seerr's camelCase
    // JSON is already relied on elsewhere, but underscore-folding is a different kind of leniency and
    // isn't something this plugin has needed before).
    [DataContract]
    public class GithubAsset
    {
        [DataMember(Name = "name")]
        public string Name { get; set; }

        [DataMember(Name = "browser_download_url")]
        public string BrowserDownloadUrl { get; set; }
    }

    [DataContract]
    public class GithubRelease
    {
        [DataMember(Name = "tag_name")]
        public string TagName { get; set; }

        [DataMember(Name = "html_url")]
        public string HtmlUrl { get; set; }

        [DataMember(Name = "published_at")]
        public string PublishedAt { get; set; }

        [DataMember(Name = "prerelease")]
        public bool Prerelease { get; set; }

        [DataMember(Name = "draft")]
        public bool Draft { get; set; }

        [DataMember(Name = "assets")]
        public List<GithubAsset> Assets { get; set; }
    }

    public class UpdateCheckResult
    {
        public string CurrentVersion { get; set; }
        public string LatestVersion { get; set; }
        public bool UpdateAvailable { get; set; }
        public string ReleaseUrl { get; set; }
        public string PublishedAt { get; set; }
        public string Error { get; set; }
    }

    public class UpdateInstallResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
    }

    /// <summary>
    /// Checks github.com/CtznSniiips/Lobby for a newer emby-plugin-v* release than the one currently
    /// running and, on request, downloads it and overwrites this plugin's own Lobby.dll on disk. Emby only
    /// loads the new file the next time it starts - this never tries to reload the running assembly, and
    /// every caller is told plainly that a restart is still needed.
    /// </summary>
    public class UpdateChecker
    {
        private const string Repo = "CtznSniiips/Lobby";
        private const string TagPrefix = "emby-plugin-v";
        private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(6);
        private static readonly HttpClient Http = BuildClient();
        private static readonly Version CurrentVersionValue = typeof(Plugin).Assembly.GetName().Version;

        private readonly IJsonSerializer _json;
        private readonly ILogger _logger;
        private readonly object _lock = new object();
        private UpdateCheckResult _cachedResult;
        private GithubRelease _cachedRelease;
        private DateTime _cachedAt;

        public UpdateChecker(IJsonSerializer json, ILogger logger)
        {
            _json = json;
            _logger = logger;
        }

        public static string CurrentVersion => CurrentVersionValue.ToString(3);

        private static HttpClient BuildClient()
        {
            var client = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
            // GitHub's API requires a User-Agent on every request and refuses requests without one.
            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Lobby-Emby-Plugin");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/vnd.github+json");
            return client;
        }

        /// <summary>Cached for <see cref="CacheLifetime"/> unless <paramref name="force"/> is set (an admin pressing "Check now").</summary>
        public async Task<UpdateCheckResult> Check(CancellationToken ct, bool force = false)
        {
            lock (_lock)
            {
                if (!force && _cachedResult != null && DateTime.UtcNow - _cachedAt < CacheLifetime)
                {
                    return _cachedResult;
                }
            }

            UpdateCheckResult result;
            GithubRelease matched = null;
            try
            {
                var releases = await FetchReleases(ct).ConfigureAwait(false);

                // Releases in this repo are tagged for either plugin (emby-plugin-v0.9.9,
                // jellyfin-plugin-v0.1.0, ...), so /releases/latest can't be used - filter by prefix and
                // pick the highest version among non-draft, non-prerelease emby-plugin-v* tags.
                var latest = releases
                    .Where(r => !r.Draft && !r.Prerelease && (r.TagName ?? string.Empty).StartsWith(TagPrefix, StringComparison.OrdinalIgnoreCase))
                    .Select(r => new { Release = r, Version = ParseVersion(r.TagName.Substring(TagPrefix.Length)) })
                    .Where(x => x.Version != null)
                    .OrderByDescending(x => x.Version)
                    .FirstOrDefault();

                matched = latest?.Release;
                result = new UpdateCheckResult
                {
                    CurrentVersion = CurrentVersion,
                    LatestVersion = latest?.Version.ToString(3),
                    ReleaseUrl = latest?.Release.HtmlUrl,
                    PublishedAt = latest?.Release.PublishedAt,
                    UpdateAvailable = latest != null && latest.Version > CurrentVersionValue,
                };
            }
            catch (Exception ex)
            {
                _logger.Warn("Lobby update check failed: {0}", ex.Message);
                result = new UpdateCheckResult { CurrentVersion = CurrentVersion, Error = "Could not reach GitHub: " + ex.Message };
            }

            lock (_lock)
            {
                _cachedResult = result;
                _cachedRelease = matched;
                _cachedAt = DateTime.UtcNow;
            }

            return result;
        }

        /// <summary>
        /// Downloads the latest release's zip asset and overwrites this plugin's running Lobby.dll on disk.
        /// Always re-checks first (an admin could click "Update now" well after the page loaded). Never
        /// restarts Emby Server itself - the response says a restart is still needed either way.
        /// </summary>
        public async Task<UpdateInstallResult> Install(CancellationToken ct)
        {
            var check = await Check(ct, force: true).ConfigureAwait(false);
            if (!string.IsNullOrEmpty(check.Error))
            {
                return new UpdateInstallResult { Success = false, Message = check.Error };
            }

            if (!check.UpdateAvailable)
            {
                return new UpdateInstallResult { Success = false, Message = "Already on the latest version (" + check.CurrentVersion + ")." };
            }

            GithubRelease release;
            lock (_lock)
            {
                release = _cachedRelease;
            }

            if (release == null)
            {
                return new UpdateInstallResult { Success = false, Message = "Could not find the matching GitHub release. Try checking for updates again." };
            }

            var zipAsset = (release.Assets ?? new List<GithubAsset>())
                .FirstOrDefault(a => (a.Name ?? string.Empty).EndsWith(".zip", StringComparison.OrdinalIgnoreCase));
            if (zipAsset == null || string.IsNullOrEmpty(zipAsset.BrowserDownloadUrl))
            {
                return new UpdateInstallResult { Success = false, Message = "Release " + check.LatestVersion + " has no downloadable zip asset." };
            }

            var dllPath = typeof(Plugin).Assembly.Location;
            if (string.IsNullOrEmpty(dllPath))
            {
                return new UpdateInstallResult { Success = false, Message = "Could not locate the running plugin file on disk." };
            }

            var tempZip = dllPath + ".update.zip";
            var tempDll = dllPath + ".update";
            try
            {
                using (var resp = await Http.GetAsync(zipAsset.BrowserDownloadUrl, ct).ConfigureAwait(false))
                {
                    resp.EnsureSuccessStatusCode();
                    using (var fs = File.Create(tempZip))
                    {
                        await resp.Content.CopyToAsync(fs).ConfigureAwait(false);
                    }
                }

                using (var archive = ZipFile.OpenRead(tempZip))
                {
                    var entry = archive.Entries.FirstOrDefault(e => e.Name.Equals("Lobby.dll", StringComparison.OrdinalIgnoreCase));
                    if (entry == null)
                    {
                        return new UpdateInstallResult { Success = false, Message = "The downloaded release zip has no Lobby.dll inside." };
                    }

                    entry.ExtractToFile(tempDll, overwrite: true);
                }

                // Replace the live DLL in place. This works on Linux/macOS even while the old file is
                // mapped into the running Emby process; on Windows the file is normally locked while Emby
                // has it loaded, which throws below - caught with a clear message instead of leaving a
                // half-written DLL.
                File.Copy(tempDll, dllPath, overwrite: true);

                _logger.Info("Lobby plugin file updated on disk to v{0}; restart Emby Server to finish.", check.LatestVersion);
                return new UpdateInstallResult
                {
                    Success = true,
                    Message = "Downloaded v" + check.LatestVersion + " and replaced the plugin file. Restart Emby Server to finish updating.",
                };
            }
            catch (Exception ex)
            {
                _logger.Warn("Lobby update install failed: {0}", ex.Message);
                return new UpdateInstallResult
                {
                    Success = false,
                    Message = "Could not replace the plugin file - it may be locked while Emby Server is running (common on Windows). " +
                        "Stop Emby Server, replace Lobby.dll by hand with the file from " + check.ReleaseUrl + ", then start it again. Details: " + ex.Message,
                };
            }
            finally
            {
                TryDelete(tempZip);
                TryDelete(tempDll);
            }
        }

        private async Task<List<GithubRelease>> FetchReleases(CancellationToken ct)
        {
            var url = "https://api.github.com/repos/" + Repo + "/releases?per_page=30";
            using (var resp = await Http.GetAsync(url, ct).ConfigureAwait(false))
            {
                var text = resp.Content == null ? string.Empty : await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException("GitHub returned HTTP " + (int)resp.StatusCode + ": " + text);
                }

                return _json.DeserializeFromString<List<GithubRelease>>(text) ?? new List<GithubRelease>();
            }
        }

        private static Version ParseVersion(string s)
        {
            return Version.TryParse((s ?? string.Empty).Trim(), out var v) ? v : null;
        }

        private static void TryDelete(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
                // Best-effort cleanup of our own temp files; leaving one behind isn't worth failing over.
            }
        }
    }
}
