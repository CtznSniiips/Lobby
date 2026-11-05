using MediaBrowser.Model.Plugins;

namespace Lobby.Configuration
{
    /// <summary>
    /// Persisted plugin settings. Saved by Emby as XML, so collections are plain arrays.
    /// </summary>
    public class PluginConfiguration : BasePluginConfiguration
    {
        /// <summary>Base URL of the Seerr instance, e.g. http://192.168.1.10:5055.</summary>
        public string SeerrUrl { get; set; } = string.Empty;

        /// <summary>Seerr admin API key (Settings → General → API Key).</summary>
        public string SeerrApiKey { get; set; } = string.Empty;

        /// <summary>Whether TVs may submit Seerr requests.</summary>
        public bool RequestsEnabled { get; set; } = true;

        /// <summary>
        /// Seerr user to request as when the TV's Emby user has no linked Seerr account.
        /// 0 means requests are blocked for unlinked users.
        /// </summary>
        public int FallbackSeerrUserId { get; set; }

        /// <summary>Maximum items per home row.</summary>
        public int RowLimit { get; set; } = 20;

        /// <summary>How far ahead (hours) the Sports row looks for games.</summary>
        public int SportsLookaheadHours { get; set; } = 12;

        /// <summary>Delay (ms) between the Emby app becoming controllable and sending the play command.</summary>
        public int PlayDelayMs { get; set; } = 1500;

        /// <summary>How long (seconds) a queued play request waits for the Emby app to connect.</summary>
        public int PlayTimeoutSeconds { get; set; } = 45;

        /// <summary>How long (minutes) the last requester stays pre-selected on a TV.</summary>
        public int RememberRequesterMinutes { get; set; } = 30;

        public bool ShowContinueWatching { get; set; } = true;
        public bool ShowNextUp { get; set; } = true;
        public bool ShowRecentlyAdded { get; set; } = true;
        public bool ShowLiveNow { get; set; } = true;
        public bool ShowSports { get; set; } = true;
        public bool ShowSeerrTrending { get; set; } = true;
        public bool ShowSeerrPopularMovies { get; set; } = true;
        public bool ShowSeerrPopularShows { get; set; } = true;

        /// <summary>When true (default), the featured area and "Your teams" row show only sports the guide flags as Live.</summary>
        public bool SportsLiveOnly { get; set; } = true;

        /// <summary>Paired TVs.</summary>
        public TvDevice[] Tvs { get; set; } = new TvDevice[0];

        /// <summary>Emby user → Seerr user links. One Emby user may link to several Seerr users.</summary>
        public UserLink[] UserLinks { get; set; } = new UserLink[0];
    }

    /// <summary>A TV running Lobby that has been paired with this server.</summary>
    public class TvDevice
    {
        public string Id { get; set; }

        public string Name { get; set; }

        /// <summary>SHA-256 hex of the TV's Lobby token. The token itself is never stored.</summary>
        public string TokenHash { get; set; }

        /// <summary>Emby user (GUID, "N" format) the TV acts as.</summary>
        public string EmbyUserId { get; set; }

        /// <summary>DeviceId reported by the Emby app on this TV, used to find its session for remote control.</summary>
        public string EmbyDeviceId { get; set; }

        /// <summary>Samsung DUID reported by Lobby. Matched against session DeviceIds as a fallback.</summary>
        public string Duid { get; set; }

        /// <summary>Team names / keywords for the Sports row.</summary>
        public string[] SportsTeams { get; set; } = new string[0];

        /// <summary>Weather chip for this TV. Off when WeatherEnabled is false or both coordinates are 0.</summary>
        public bool WeatherEnabled { get; set; }
        public double WeatherLatitude { get; set; }
        public double WeatherLongitude { get; set; }
        public bool WeatherFahrenheit { get; set; }

        /// <summary>Settings changed from the TV. Null until the TV saves its own; until then the server defaults apply.</summary>
        public TvPreferences Preferences { get; set; }

        public string PairedUtc { get; set; }

        public string LastSeenUtc { get; set; }
    }

    /// <summary>
    /// Viewing and playback settings a TV manages itself. Any value left null/0 falls back to the
    /// server default in <see cref="PluginConfiguration"/>.
    /// </summary>
    public class TvPreferences
    {
        /// <summary>Row ids in display order. Rows not listed keep their default order after these.</summary>
        public string[] RowOrder { get; set; } = new string[0];

        /// <summary>Row ids the TV has turned off.</summary>
        public string[] HiddenRows { get; set; } = new string[0];

        public int RowLimit { get; set; }
        public int SportsLookaheadHours { get; set; }

        /// <summary>-1 means "use the default"; 0 is a valid choice (no delay).</summary>
        public int PlayDelayMs { get; set; } = -1;
        public int PlayTimeoutSeconds { get; set; }

        public string UpdatedUtc { get; set; }
    }

    public static class LinkSource
    {
        /// <summary>Seerr already stores this Emby user id on the Seerr account.</summary>
        public const string Auto = "auto";

        /// <summary>Username/email match that an admin still needs to confirm. Not used for requests.</summary>
        public const string Suggested = "suggested";

        /// <summary>Added or confirmed by an admin.</summary>
        public const string Manual = "manual";
    }

    public class UserLink
    {
        /// <summary>Emby user id (GUID, "N" format).</summary>
        public string EmbyUserId { get; set; }

        public int SeerrUserId { get; set; }

        /// <summary>One of <see cref="LinkSource"/>.</summary>
        public string Source { get; set; }

        /// <summary>Cached Seerr display name, for the admin page.</summary>
        public string SeerrDisplayName { get; set; }
    }
}
