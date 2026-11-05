using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lobby.Configuration;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Session;
using Microsoft.Extensions.Logging;

namespace Lobby.Services
{
    public static class PlayAction
    {
        public const string Play = "play";
        public const string Resume = "resume";
        public const string Details = "details";
    }

    public class PlaybackOrder
    {
        public string TvId { get; set; }
        public string TvName { get; set; }
        public string JellyfinUserId { get; set; }
        public string JellyfinDeviceId { get; set; }
        public string Duid { get; set; }
        public Guid ItemId { get; set; }
        public string ItemType { get; set; }
        public string ItemName { get; set; }
        public string Action { get; set; }
        public long? StartPositionTicks { get; set; }

        /// <summary>Wait after the Jellyfin app becoming controllable before sending (this TV's setting).</summary>
        public int DelayMs { get; set; }

        /// <summary>How long to keep the order queued (this TV's setting).</summary>
        public int TimeoutSeconds { get; set; }
        public DateTime ExpiresUtc { get; set; }
        public int Attempts;
    }

    public class DispatchResult
    {
        /// <summary>sent, queued or failed.</summary>
        public string Status { get; set; }
        public string Message { get; set; }
        public string SessionId { get; set; }
    }

    /// <summary>
    /// Delivers play/resume/details commands to the Jellyfin app on a TV.
    /// Lobby calls the server, then launches Jellyfin; this class waits for the Jellyfin app's session to
    /// become controllable (or uses it straight away if it is already running) and sends the command.
    /// </summary>
    public class PlaybackDispatcher : IDisposable
    {
        private const int MaxAttempts = 4;

        private readonly ISessionManager _sessions;
        private readonly IUserManager _users;
        private readonly ILogger _logger;

        // One pending order per TV: a newer press replaces an older one.
        private readonly ConcurrentDictionary<string, PlaybackOrder> _pending = new ConcurrentDictionary<string, PlaybackOrder>();
        private readonly Timer _sweeper;

        public PlaybackDispatcher(ISessionManager sessions, IUserManager users, ILogger logger)
        {
            _sessions = sessions;
            _users = users;
            _logger = logger;

            _sessions.SessionStarted += OnSessionEvent;
            _sessions.CapabilitiesChanged += OnSessionEvent;
            _sessions.SessionActivity += OnSessionEvent;

            // Catches sessions that become controllable without raising an event we listen to,
            // and expires stale orders.
            _sweeper = new Timer(_ => Sweep(), null, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(2));
        }

        public int PendingCount => _pending.Count;

        public async Task<DispatchResult> Dispatch(PlaybackOrder order)
        {
            var timeout = Math.Max(5, order.TimeoutSeconds);
            order.ExpiresUtc = DateTime.UtcNow.AddSeconds(timeout);

            var session = FindControllableSession(order);
            if (session != null)
            {
                // Jellyfin is already running (often the case: the app supports prelaunch),
                // so there is nothing to wait for.
                try
                {
                    await Send(order, session).ConfigureAwait(false);
                    return new DispatchResult { Status = "sent", SessionId = session.Id };
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("immediate send to '{TvName}' failed, queueing instead: {Message}", order.TvName, ex.Message);
                }
            }

            _pending[order.TvId] = order;
            _logger.LogInformation("queued {Action} of item {ItemId} for '{TvName}' until its Jellyfin app connects", order.Action, order.ItemId, order.TvName);
            return new DispatchResult
            {
                Status = "queued",
                Message = "Waiting up to " + timeout + "s for the Jellyfin app on this TV to connect.",
            };
        }

        /// <summary>Sessions that could belong to this TV's Jellyfin app, newest first.</summary>
        public IEnumerable<SessionInfo> FindSessions(string jellyfinDeviceId, string duid)
        {
            return _sessions.Sessions
                .Where(s => s.DeviceId != null &&
                            ((jellyfinDeviceId != null && string.Equals(s.DeviceId, jellyfinDeviceId, StringComparison.OrdinalIgnoreCase)) ||
                             (duid != null && string.Equals(s.DeviceId, duid, StringComparison.OrdinalIgnoreCase))))
                .OrderByDescending(s => s.LastActivityDate);
        }

        public void Dispose()
        {
            _sessions.SessionStarted -= OnSessionEvent;
            _sessions.CapabilitiesChanged -= OnSessionEvent;
            _sessions.SessionActivity -= OnSessionEvent;
            _sweeper.Dispose();
        }

        private SessionInfo FindControllableSession(PlaybackOrder order)
        {
            return FindSessions(order.JellyfinDeviceId, order.Duid).FirstOrDefault(IsControllable);
        }

        private static bool IsControllable(SessionInfo s)
        {
            return s.IsActive && s.SupportsRemoteControl;
        }

        private void OnSessionEvent(object sender, SessionEventArgs e)
        {
            var session = e?.SessionInfo;
            if (session?.DeviceId == null || _pending.IsEmpty || !IsControllable(session))
            {
                return;
            }

            foreach (var order in _pending.Values)
            {
                var matches = string.Equals(session.DeviceId, order.JellyfinDeviceId, StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(session.DeviceId, order.Duid, StringComparison.OrdinalIgnoreCase);
                if (matches)
                {
                    TryDeliver(order, session);
                }
            }
        }

        private void Sweep()
        {
            if (_pending.IsEmpty)
            {
                return;
            }

            foreach (var order in _pending.Values)
            {
                if (DateTime.UtcNow > order.ExpiresUtc)
                {
                    if (_pending.TryRemove(order.TvId, out _))
                    {
                        _logger.LogWarning("gave up on {Action} of item {ItemId} for '{TvName}': the Jellyfin app never became controllable", order.Action, order.ItemId, order.TvName);
                    }

                    continue;
                }

                var session = FindControllableSession(order);
                if (session != null)
                {
                    TryDeliver(order, session);
                }
            }
        }

        private void TryDeliver(PlaybackOrder order, SessionInfo session)
        {
            // Claim the order so concurrent events don't send it twice.
            if (!_pending.TryGetValue(order.TvId, out var current) || !ReferenceEquals(current, order) ||
                !((ICollection<KeyValuePair<string, PlaybackOrder>>)_pending).Remove(new KeyValuePair<string, PlaybackOrder>(order.TvId, order)))
            {
                return;
            }

            Task.Run(async () =>
            {
                try
                {
                    // Give the freshly started app a moment to finish loading its home screen,
                    // otherwise it can swallow the command.
                    var delay = Math.Max(0, order.DelayMs);
                    if (delay > 0)
                    {
                        await Task.Delay(delay).ConfigureAwait(false);
                    }

                    await Send(order, session).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    order.Attempts++;
                    if (order.Attempts < MaxAttempts && DateTime.UtcNow < order.ExpiresUtc)
                    {
                        _logger.LogWarning("send to '{TvName}' failed (attempt {Attempts}), will retry: {Message}", order.TvName, order.Attempts, ex.Message);
                        _pending.TryAdd(order.TvId, order);
                    }
                    else
                    {
                        _logger.LogError(ex, "could not send {Action} to '{TvName}'", order.Action, order.TvName);
                    }
                }
            });
        }

        private async Task Send(PlaybackOrder order, SessionInfo session)
        {
            var controllingUserId = order.JellyfinUserId;

            if (order.Action == PlayAction.Details)
            {
                // GeneralCommand.Arguments has no setter in Jellyfin (only Name/ControllingUserId do) -
                // the dictionary has to go through the constructor instead of an object initializer.
                var command = new GeneralCommand(new Dictionary<string, string>
                    {
                        { "ItemId", order.ItemId.ToString("N") },
                        { "ItemType", order.ItemType ?? string.Empty },
                        { "ItemName", order.ItemName ?? string.Empty },
                    })
                {
                    Name = GeneralCommandType.DisplayContent,
                    ControllingUserId = Guid.TryParse(controllingUserId, out var cu) ? cu : Guid.Empty,
                };

                await _sessions.SendGeneralCommand(null, session.Id, command, CancellationToken.None).ConfigureAwait(false);
            }
            else
            {
                var request = new PlayRequest
                {
                    ItemIds = new[] { order.ItemId },
                    PlayCommand = PlayCommand.PlayNow,
                    ControllingUserId = Guid.TryParse(controllingUserId, out var pu) ? pu : Guid.Empty,
                    StartPositionTicks = order.StartPositionTicks > 0 ? order.StartPositionTicks : null,
                };

                await _sessions.SendPlayCommand(null, session.Id, request, CancellationToken.None).ConfigureAwait(false);
            }

            _logger.LogInformation("sent {Action} of item {ItemId} to '{TvName}' (session {SessionId})", order.Action, order.ItemId, order.TvName, session.Id);
        }
    }
}
