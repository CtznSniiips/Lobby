# Browser evidence

`compat-dock-720.png` and `compat-list-720.png` were captured by the public-font browser regression suite on 27 October 2026, at 1280 × 720. They use bundled public fonts, wallpaper and icons with a synthetic installed-app catalogue. The suite also checks 1920 × 1080 geometry.

These are desktop Chromium screenshots, not TV captures or proof of Chromium 85 compositing. They show readable labels and the rounded utility focus in the candidate UI. The wallpaper and icon sources/licences remain in the existing asset records and [third-party notices](../../THIRD_PARTY_NOTICES.md).

## Lobby screenshots (`lobby-*.png`)

Captured by [`scripts/generate-readme-screenshots.mjs`](../../scripts/generate-readme-screenshots.mjs), embedded in the root README and the plugin READMEs. The script drives the same preview-plus-mock-API harness as `scripts/check-media.mjs`, but with its own, entirely invented media catalogue, so nothing shown is a real movie, show, sports team or person:

- Titles: "Paper Moonlight", "Glass Orchard", "The Tin Garden", "Harbor Signal", "Low Tide Harbor", "Program 1"–"Program 14".
- Sports: the invented "River City Hockey League" (Rockets, Comets) and "Coastal Baseball League", on the invented channel "Metro Sports Network".
- People (request screen): invented cast and crew names, not real actors or directors.
- Posters and backdrops are either generated placeholder art or the project's own bundled wallpaper photos (already covered by the [asset records](../asset-sources.md)) — never a real poster or still.

The app-launcher dock in these screenshots still shows real installed-app icons (Netflix, Disney+, etc.), consistent with `docs/images/cleanframe-dock.jpg` above: that's Lobby's own home-screen feature working as intended, not media content.

Regenerate with `npm run screenshots:readme` after a UI change that would make these stale.
