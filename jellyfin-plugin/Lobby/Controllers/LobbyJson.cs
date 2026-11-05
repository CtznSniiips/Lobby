using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Lobby.Controllers
{
    /// <summary>
    /// Serializes Lobby's response objects in PascalCase (matching their C# property names and the
    /// Emby plugin's wire format), instead of Jellyfin's server-wide camelCase API convention. The TV
    /// app's JSON parsing is shared between the Emby and Jellyfin plugins, so the casing must match.
    /// </summary>
    public static class LobbyJson
    {
        private static readonly JsonSerializerOptions Options = new JsonSerializerOptions
        {
            // No naming policy: properties serialize under their declared (PascalCase) names.
            WriteIndented = false,
        };

        public static ContentResult Of(object value)
        {
            return new ContentResult
            {
                Content = JsonSerializer.Serialize(value, Options),
                ContentType = "application/json; charset=utf-8",
                StatusCode = 200,
            };
        }
    }
}
