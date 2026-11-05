## 0.1.0

- First Jellyfin build of Lobby, ported from the Emby plugin: Continue Watching, Next Up, Recently Added,
  Live TV ("On Now" and "Your Teams"), Seerr discovery and requests, and one-press playback for paired
  Samsung TVs, all served over the same Lobby TV API the Emby plugin exposes.
- Fixed several API-shape mistakes CI's first real build caught (no `IServerEntryPoint`/`IHasThumbImage` in
  Jellyfin's plugin API, `IDtoService.GetBaseItemDtos` is synchronous, `ILiveTvManager.GetPrograms` instead of
  a guessed `GetProgramsAsync`), cross-checked against the `jellyfin/jellyfin` v10.9.11 source.
- Fixed a second round of build errors: missing `Jellyfin.Data.Enums` usings (`BaseItemKind`/`ItemSortBy`/
  `SortOrder`), `InternalItemsQuery`'s date filters being `DateTime` rather than `DateTimeOffset`, a missing
  `using Microsoft.Extensions.Logging;`, `SessionInfo.LastActivityDate` already being `DateTime` (no
  `.UtcDateTime`), an array's LINQ `Count()` extension used where `Length` was needed, and
  `InternalItemsQuery` having no way to filter by several TMDB ids at once (now matched after the query
  instead of in it).
- Fixed: a continuing episode in the Watch hero could show a blurry backdrop — the Episode branch of
  `MapFeaturedLibrary` used `ParentBackdropItemId`/`ParentBackdropImageTags`, which inherits from the
  nearest ancestor with an image and can land on a lower-resolution season (or even the episode's own)
  image instead of the series' real fanart. The hero now looks up the series' own backdrop and logo
  directly.
- Not yet verified against a running Jellyfin server — see the Build section of the README.
