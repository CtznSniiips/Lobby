using System;
using System.Collections.Generic;
using System.IO;
using Lobby.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Drawing;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Lobby
{
    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages, IHasThumbImage
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

        public ImageFormat ThumbImageFormat => ImageFormat.Png;

        public Stream GetThumbImage()
        {
            var type = GetType();
            return type.Assembly.GetManifestResourceStream(type.Namespace + ".thumb.png");
        }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            return new[]
            {
                new PluginPageInfo
                {
                    Name = "lobby",
                    EmbeddedResourcePath = GetType().Namespace + ".Web.lobby.html",
                },
                new PluginPageInfo
                {
                    Name = "lobbyjs",
                    EmbeddedResourcePath = GetType().Namespace + ".Web.lobby.js",
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
