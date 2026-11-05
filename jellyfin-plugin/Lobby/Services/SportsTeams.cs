using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace Lobby.Services
{
    /// <summary>A team found in the guide, for the TV's team picker.</summary>
    public class GuideTeam
    {
        public string Name { get; set; }

        /// <summary>Best guess at the league/competition, e.g. "NHL Hockey". May be null.</summary>
        public string League { get; set; }

        /// <summary>Number of distinct games listed in the look-ahead window.</summary>
        public int Games { get; set; }

        public string NextStartDate { get; set; }

        public bool Selected { get; set; }
    }

    /// <summary>
    /// Pulls team names out of guide listings such as
    /// "NHL Hockey" / "Toronto Maple Leafs at Boston Bruins",
    /// "Premier League: Arsenal v Chelsea" or "College Football: #5 Michigan vs. Ohio State".
    /// </summary>
    public static class SportsTeams
    {
        private static readonly Regex Separator = new Regex(
            @"\s+(?:at|vs\.?|v\.?|versus|@)\s+",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        private static readonly Regex LivePrefix = new Regex(
            @"^live\s*[:\-–]\s*",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        private static readonly Regex LeadingNoise = new Regex(
            @"^(?:live\s*[:\-–]?\s*|#\s*\d+\s+|no\.\s*\d+\s+|\(\d+\)\s*)+",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        private static readonly Regex TrailingNoise = new Regex(
            @"\s*(?:\((?:live|new|n|r|\d+)\)|\[[^\]]*\]|\s[-–—|]\s.*|,\s.*|\s+\(\d+-\d+(?:-\d+)?\))\s*$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        /// <summary>
        /// Returns (league, home/away teams) for one listing, or an empty list when it isn't a matchup.
        /// </summary>
        public static List<string> ExtractTeams(string name, string episodeTitle, out string league)
        {
            league = null;

            // Prefer whichever field actually contains the matchup.
            foreach (var candidate in new[] { episodeTitle, name })
            {
                if (string.IsNullOrWhiteSpace(candidate))
                {
                    continue;
                }

                // "LIVE: Leafs at Habs" – "Live" is a flag, not a league.
                var text = LivePrefix.Replace(candidate.Trim(), string.Empty);
                string prefix = null;

                // "Premier League: Arsenal v Chelsea" → league prefix + matchup
                var colon = text.IndexOf(':');
                if (colon > 0 && Separator.IsMatch(text.Substring(colon + 1)))
                {
                    prefix = text.Substring(0, colon).Trim();
                    text = text.Substring(colon + 1).Trim();
                }

                var parts = Separator.Split(text);
                if (parts.Length != 2)
                {
                    continue;
                }

                var teams = parts.Select(Clean).Where(IsPlausibleTeam).ToList();
                if (teams.Count != 2 || string.Equals(teams[0], teams[1], StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                league = prefix ?? (ReferenceEquals(candidate, episodeTitle) && !string.IsNullOrWhiteSpace(name) ? name.Trim() : null);
                return teams;
            }

            return new List<string>();
        }

        /// <summary>
        /// True when a team named in a listing is one the TV chose: the same name, or the same name with a place in
        /// front ("Leafs" and "Maple Leafs" match "Toronto Maple Leafs"). Other partial matches are refused, so
        /// "Michigan" doesn't match "Michigan State" and "Kings" doesn't match "Kingston Frontenacs".
        /// </summary>
        public static bool SameTeam(string listed, string chosen)
        {
            if (string.IsNullOrWhiteSpace(listed) || string.IsNullOrWhiteSpace(chosen))
            {
                return false;
            }

            listed = Regex.Replace(listed.Trim(), @"\s+", " ");
            chosen = Regex.Replace(chosen.Trim(), @"\s+", " ");
            return string.Equals(listed, chosen, StringComparison.OrdinalIgnoreCase)
                || EndsWithWords(listed, chosen)
                || EndsWithWords(chosen, listed);
        }

        private static bool EndsWithWords(string text, string words)
        {
            return text.Length > words.Length
                && text.EndsWith(words, StringComparison.OrdinalIgnoreCase)
                && text[text.Length - words.Length - 1] == ' ';
        }

        /// <summary>Teams across many listings, merged case-insensitively and grouped by league.</summary>
        public static List<GuideTeam> Collect(IEnumerable<Tuple<string, string, DateTimeOffset?>> listings, IEnumerable<string> selected)
        {
            var chosen = new HashSet<string>(selected ?? Enumerable.Empty<string>(), StringComparer.OrdinalIgnoreCase);
            var byName = new Dictionary<string, GuideTeam>(StringComparer.OrdinalIgnoreCase);
            var seenGames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var listing in listings)
            {
                var teams = ExtractTeams(listing.Item1, listing.Item2, out var league);
                if (teams.Count == 0)
                {
                    continue;
                }

                // Count a game once even when several channels carry it.
                var gameKey = string.Join("|", teams.OrderBy(t => t, StringComparer.OrdinalIgnoreCase)) + "|" + listing.Item3?.UtcDateTime.ToString("o");
                var newGame = seenGames.Add(gameKey);

                foreach (var team in teams)
                {
                    if (!byName.TryGetValue(team, out var entry))
                    {
                        entry = new GuideTeam { Name = team, League = league };
                        byName[team] = entry;
                    }

                    if (entry.League == null && league != null)
                    {
                        entry.League = league;
                    }

                    if (newGame)
                    {
                        entry.Games++;
                    }

                    var start = listing.Item3?.UtcDateTime.ToString("o");
                    if (start != null && (entry.NextStartDate == null || string.CompareOrdinal(start, entry.NextStartDate) < 0))
                    {
                        entry.NextStartDate = start;
                    }
                }
            }

            foreach (var team in byName.Values)
            {
                team.Selected = chosen.Contains(team.Name);
            }

            // Saved teams that aren't in the guide right now still appear, so they can be removed.
            foreach (var name in chosen.Where(n => !byName.ContainsKey(n)))
            {
                byName[name] = new GuideTeam { Name = name, Selected = true };
            }

            return byName.Values
                .OrderByDescending(t => t.Selected)
                .ThenBy(t => t.League ?? "￿", StringComparer.OrdinalIgnoreCase)
                .ThenBy(t => t.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static string Clean(string team)
        {
            var t = (team ?? string.Empty).Trim();
            string previous;
            do
            {
                previous = t;
                t = LeadingNoise.Replace(t, string.Empty).Trim();
                t = TrailingNoise.Replace(t, string.Empty).Trim();
                t = t.Trim('.', '"', '\'', ' ');
            }
            while (t != previous);

            return t;
        }

        private static bool IsPlausibleTeam(string team)
        {
            return team.Length >= 2 && team.Length <= 60 && team.Any(char.IsLetter);
        }
    }
}
