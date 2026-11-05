using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Data.Entities;
using Lobby.Services;
using MediaBrowser.Controller.Dto;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.LiveTv;
using MediaBrowser.Controller.Session;
using MediaBrowser.Controller.TV;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Lobby
{
    /// <summary>
    /// Replaces Emby's <c>IServerEntryPoint</c> (removed from Jellyfin's plugin API): registered as a
    /// singleton <see cref="IHostedService"/> by <see cref="PluginServiceRegistrator"/>, so the host
    /// constructs it once at startup and calls <see cref="StartAsync"/>. Creates the long-lived Lobby
    /// services and exposes them to the REST endpoints via <see cref="Current"/>.
    /// </summary>
    public class LobbyRuntime : IHostedService
    {
        public LobbyRuntime(
            ISessionManager sessionManager,
            IUserManager userManager,
            ILibraryManager libraryManager,
            IDtoService dtoService,
            ITVSeriesManager tvSeriesManager,
            ILiveTvManager liveTvManager,
            IUserDataManager userDataManager,
            ILoggerFactory loggerFactory)
        {
            Logger = loggerFactory.CreateLogger("Lobby");
            UserManager = userManager;
            LibraryManager = libraryManager;
            UserDataManager = userDataManager;
            SessionManager = sessionManager;
            Tvs = new TvRegistry(Logger);
            Seerr = new SeerrClient(Logger);
            Links = new LinkService(Seerr, userManager, Logger);
            Playback = new PlaybackDispatcher(sessionManager, userManager, Logger);
            Home = new HomeBuilder(libraryManager, userManager, dtoService, tvSeriesManager, liveTvManager, userDataManager, Seerr, Logger);
            Current = this;
        }

        public static LobbyRuntime Current { get; private set; }

        public ILogger Logger { get; }
        public IUserManager UserManager { get; }
        public ILibraryManager LibraryManager { get; }
        public IUserDataManager UserDataManager { get; }
        public ISessionManager SessionManager { get; }
        public TvRegistry Tvs { get; }
        public SeerrClient Seerr { get; }
        public LinkService Links { get; }
        public PlaybackDispatcher Playback { get; }
        public HomeBuilder Home { get; }

        public User[] AllUsers()
        {
            return UserManager.Users.ToArray();
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            Logger.LogInformation("Lobby started: {TvCount} paired TV(s), {LinkCount} account link(s)",
                Plugin.Instance.Configuration.Tvs.Length, Plugin.Instance.Configuration.UserLinks.Length);
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            Playback.Dispose();
            if (Current == this)
            {
                Current = null;
            }

            return Task.CompletedTask;
        }
    }
}
