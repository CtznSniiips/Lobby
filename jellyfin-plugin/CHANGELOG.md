## 0.1.0

- First Jellyfin build of Lobby, ported from the Emby plugin: Continue Watching, Next Up, Recently Added,
  Live TV ("On Now" and "Your Teams"), Seerr discovery and requests, and one-press playback for paired
  Samsung TVs, all served over the same Lobby TV API the Emby plugin exposes.
- Fixed several API-shape mistakes CI's first real build caught (no `IServerEntryPoint`/`IHasThumbImage` in
  Jellyfin's plugin API, `IDtoService.GetBaseItemDtos` is synchronous, `ILiveTvManager.GetPrograms` instead of
  a guessed `GetProgramsAsync`), cross-checked against the `jellyfin/jellyfin` v10.9.11 source.
- Not yet verified against a running Jellyfin server — see the Build section of the README.
