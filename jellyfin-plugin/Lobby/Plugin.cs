using System;
using System.Collections.Generic;
using Lobby.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Lobby
{
    // Jellyfin's plugin API has no IHasThumbImage (Emby's plugin-icon interface): a plugin's
    // icon comes from its repository manifest, not the DLL. thumb.png stays embedded only for
    // parity with the Emby plugin's project layout; nothing in Jellyfin reads it at runtime.
    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
    {
        public static readonly Guid PluginId = new Guid("5af002f7-cede-48af-8901-0bae7eec0e4e");

        /// <summary>Guards read-modify-write of <see cref="PluginConfiguration"/>.</summary>
        public static readonly object ConfigLock = new object();

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
            : base(applicationPaths, xmlSerializer)
        {
            Instance = this;
        }

        public static Plugin Instance { get; private set; }

        public override string Name => "Lobby";

        public override string Description =>
            "Home screen backend for the Lobby Samsung TV app: Continue Watching, Next Up, Live TV and sports, " +
            "Seerr discovery and requests, and one-press playback on paired TVs.";

        public override Guid Id => PluginId;

        public IEnumerable<PluginPageInfo> GetPages()
        {
            // Just the one page: the controller script is inlined in lobby.html as a plain <script>
            // tag, not a separate "__plugin/..." AMD module. Current jellyfin-web has no RequireJS/AMD
            // loader (that's an Emby-web-only mechanism), so a second embedded-resource page loaded via
            // data-controller and wrapped in define([], function () {...}) throws
            // "ReferenceError: define is not defined" and the whole controller silently never runs -
            // the page renders (static HTML needs no JS) but every field stays blank and every button
            // is dead, because nothing ever attached a listener.
            return new[]
            {
                new PluginPageInfo
                {
                    Name = "lobby",
                    EmbeddedResourcePath = GetType().Namespace + ".Web.lobby.html",
                },
            };
        }

        /// <summary>Applies a change to the configuration under a lock and saves it.</summary>
        public void Mutate(Action<PluginConfiguration> change)
        {
            lock (ConfigLock)
            {
                change(Configuration);
                SaveConfiguration();
            }
        }
    }
}
