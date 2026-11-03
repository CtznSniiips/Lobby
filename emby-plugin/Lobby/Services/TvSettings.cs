using System;
using System.Collections.Generic;
using System.Linq;
using Lobby.Configuration;

namespace Lobby.Services
{
    /// <summary>A home row the TV can show, hide and reorder.</summary>
    public class RowDefinition
    {
        public RowDefinition(string id, string title, string source)
        {
            Id = id;
            Title = title;
            Source = source;
        }

        public string Id { get; }
        public string Title { get; }

        /// <summary>library, livetv or seerr.</summary>
        public string Source { get; }
    }

    /// <summary>The settings in force for one TV: its own choices where it has made them, server defaults otherwise.</summary>
    public class EffectiveSettings
    {
        /// <summary>Every row id, in the TV's display order.</summary>
        public List<string> RowOrder { get; set; }
        public HashSet<string> HiddenRows { get; set; }
        public int RowLimit { get; set; }
        public int SportsLookaheadHours { get; set; }
        public int PlayDelayMs { get; set; }
        public int PlayTimeoutSeconds { get; set; }

        /// <summary>True when the TV has saved settings of its own.</summary>
        public bool Customized { get; set; }

        public bool IsVisible(string rowId) => !HiddenRows.Contains(rowId);
    }

    public static class TvSettings
    {
        public const string Continue = "continue";
        public const string NextUp = "nextup";
        public const string RecentlyAdded = "recentlyadded";
        public const string LiveNow = "livenow";
        public const string Sports = "sports";
        public const string SeerrTrending = "seerr-trending";
        public const string SeerrMovies = "seerr-movies";
        public const string SeerrShows = "seerr-tv";

        /// <summary>All rows, in default order.</summary>
        public static readonly RowDefinition[] Rows =
        {
            new RowDefinition(Continue, "Continue Watching", "library"),
            new RowDefinition(NextUp, "Next Up", "library"),
            new RowDefinition(RecentlyAdded, "Recently Added", "library"),
            new RowDefinition(LiveNow, "On Now", "livetv"),
            new RowDefinition(Sports, "Your Teams", "livetv"),
            new RowDefinition(SeerrTrending, "Trending", "seerr"),
            new RowDefinition(SeerrMovies, "Popular Movies", "seerr"),
            new RowDefinition(SeerrShows, "Popular Shows", "seerr"),
        };

        public static readonly int[] RowLimitRange = { 1, 100 };
        public static readonly int[] SportsLookaheadRange = { 1, 168 };
        public static readonly int[] PlayDelayRange = { 0, 15000 };
        public static readonly int[] PlayTimeoutRange = { 5, 300 };

        public static RowDefinition FindRow(string id) => Rows.FirstOrDefault(r => r.Id == id);

        /// <summary>Rows hidden by the server defaults (the "Show …" switches on the plugin page).</summary>
        public static HashSet<string> DefaultHiddenRows(PluginConfiguration c)
        {
            var hidden = new HashSet<string>();
            if (!c.ShowContinueWatching) hidden.Add(Continue);
            if (!c.ShowNextUp) hidden.Add(NextUp);
            if (!c.ShowRecentlyAdded) hidden.Add(RecentlyAdded);
            if (!c.ShowLiveNow) hidden.Add(LiveNow);
            if (!c.ShowSports) hidden.Add(Sports);
            if (!c.ShowSeerrTrending) hidden.Add(SeerrTrending);
            if (!c.ShowSeerrPopularMovies) hidden.Add(SeerrMovies);
            if (!c.ShowSeerrPopularShows) hidden.Add(SeerrShows);
            return hidden;
        }

        public static EffectiveSettings Resolve(TvDevice tv, PluginConfiguration c)
        {
            var p = tv?.Preferences;
            var result = new EffectiveSettings
            {
                Customized = p != null,
                RowOrder = Order(p?.RowOrder),
                HiddenRows = p != null ? new HashSet<string>(KnownRows(p.HiddenRows)) : DefaultHiddenRows(c),
                RowLimit = Pick(p?.RowLimit ?? 0, c.RowLimit, 20, RowLimitRange),
                SportsLookaheadHours = Pick(p?.SportsLookaheadHours ?? 0, c.SportsLookaheadHours, 12, SportsLookaheadRange),
                PlayTimeoutSeconds = Pick(p?.PlayTimeoutSeconds ?? 0, c.PlayTimeoutSeconds, 45, PlayTimeoutRange),
            };

            var delay = p != null && p.PlayDelayMs >= 0 ? p.PlayDelayMs : c.PlayDelayMs;
            result.PlayDelayMs = Clamp(delay, PlayDelayRange);
            return result;
        }

        /// <summary>The TV's order first (unknown ids dropped), then any remaining rows in default order.</summary>
        public static List<string> Order(IEnumerable<string> preferred)
        {
            var order = KnownRows(preferred).Distinct().ToList();
            order.AddRange(Rows.Select(r => r.Id).Where(id => !order.Contains(id)));
            return order;
        }

        public static IEnumerable<string> KnownRows(IEnumerable<string> ids)
        {
            return (ids ?? Enumerable.Empty<string>())
                .Where(id => id != null)
                .Select(id => id.Trim().ToLowerInvariant())
                .Where(id => FindRow(id) != null);
        }

        public static int Clamp(int value, int[] range) => Math.Max(range[0], Math.Min(range[1], value));

        private static int Pick(int tvValue, int serverValue, int fallback, int[] range)
        {
            var value = tvValue > 0 ? tvValue : (serverValue > 0 ? serverValue : fallback);
            return Clamp(value, range);
        }
    }
}
