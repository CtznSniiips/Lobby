using Lobby.Services;
using MediaBrowser.Controller.Dto;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.LiveTv;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Controller.Session;
using MediaBrowser.Controller.TV;
using MediaBrowser.Model.Logging;
using MediaBrowser.Model.Serialization;

namespace Lobby
{
    /// <summary>
    /// Server entry point. Creates the long-lived Lobby services and exposes them to the REST endpoints.
    /// </summary>
    public class LobbyRuntime : IServerEntryPoint
    {
        public LobbyRuntime(
            ISessionManager sessionManager,
            IUserManager userManager,
            ILibraryManager libraryManager,
            IDtoService dtoService,
            ITVSeriesManager tvSeriesManager,
            ILiveTvManager liveTvManager,
            IUserDataManager userDataManager,
            IJsonSerializer json,
            ILogManager logManager)
        {
            Logger = logManager.GetLogger("Lobby");
            UserManager = userManager;
            LibraryManager = libraryManager;
            UserDataManager = userDataManager;
            SessionManager = sessionManager;
            Tvs = new TvRegistry(Logger);
            Seerr = new SeerrClient(json, Logger);
            Links = new LinkService(Seerr, userManager, Logger);
            Playback = new PlaybackDispatcher(sessionManager, userManager, Logger);
            Updates = new UpdateChecker(json, Logger);
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
        public UpdateChecker Updates { get; }

        public MediaBrowser.Controller.Entities.User[] AllUsers()
        {
            return UserManager.GetUserList(new MediaBrowser.Model.Querying.UserQuery());
        }

        public void Run()
        {
            Logger.Info("Lobby started: {0} paired TV(s), {1} account link(s)",
                Plugin.Instance.Configuration.Tvs.Length, Plugin.Instance.Configuration.UserLinks.Length);
        }

        public void Dispose()
        {
            Playback.Dispose();
            if (Current == this)
            {
                Current = null;
            }
        }
    }
}
