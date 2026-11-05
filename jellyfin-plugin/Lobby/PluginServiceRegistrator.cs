using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Lobby
{
    /// <summary>
    /// Jellyfin's replacement for Emby's <c>IServerEntryPoint</c> wiring: plugins register their
    /// services here instead of getting a constructor-injected entry point. <see cref="LobbyRuntime"/>
    /// is registered once as a singleton and again as the <see cref="IHostedService"/> the host starts,
    /// so both resolve to the same instance (and the same instance <see cref="LobbyRuntime.Current"/>
    /// holds for the REST controllers).
    /// </summary>
    public class PluginServiceRegistrator : IPluginServiceRegistrator
    {
        public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
        {
            serviceCollection.AddSingleton<LobbyRuntime>();
            serviceCollection.AddHostedService<LobbyRuntime>(provider => provider.GetRequiredService<LobbyRuntime>());
        }
    }
}
