# Changelog

## 0.9.8

- Fixed: the Continue Watching hero's blurry-backdrop problem (nominally fixed in 0.9.6) was actually a
  different bug, found from 0.9.7's diagnostic logging plus a real server's exception log. A completely
  unrelated title in the "New in your library" list could throw `SQLitePCL.pretty.SQLiteException: no
  such column: AiredEpisodeOrder` while looking up its next unwatched episode (the 0.9.5 fix) — that sort
  key isn't backed by a real column on every Emby server's SQLite schema. Because the whole featured area
  is built behind one try/catch, that single exception discarded every title already computed for it,
  including ones (like the hero's Continue Watching entry) that had built a perfectly good `BackdropUrl`
  moments earlier — and the client then fell back to the episode's own low-res thumbnail, which looked
  identical to the 0.9.6 bug but had nothing to do with it. Sorts by `ParentIndexNumber`/`IndexNumber`
  instead (real columns, confirmed from the failing query's own SQL text) and wraps the lookup in its own
  try/catch, so a future quirk on some other server degrades that one show's "next episode" instead of
  silently emptying the featured area for everything else.

## 0.9.7

- Diagnostics: the 0.9.6 fix for the blurry Continue Watching hero (above) isn't resolving it for at
  least one real library — the series itself has a proper `Backdrop` image, but the episode's
  `BackdropUrl` still comes back empty, and the hero falls back to the episode's own low-res thumbnail.
  Added temporary `Debug`-level logging in the Episode branch of `MapFeaturedLibrary` (episode id, raw
  `SeriesId`, whether it parsed, whether the series lookup and re-fetched series DTO succeeded, and the
  resulting `BackdropImageTags`) to find the actual failure point from a real server's logs. No behaviour
  change; remove once the real cause is identified and fixed.

## 0.9.6

- Fixed: a continuing episode in the Watch hero could show a blurry backdrop — the Episode branch of
  `MapFeaturedLibrary` used `ParentBackdropItemId`/`ParentBackdropImageTags`, which inherits from the
  nearest ancestor with an image and can land on a lower-resolution season (or even the episode's own)
  image instead of the series' real fanart. The hero now looks up the series' own backdrop and logo
  directly.

## 0.9.5

- Fixed: a show featured in the hero as "New in your library" could show the wrong episode (e.g. S1 E1 on a show you'd already started) — the hero now looks up the next unwatched episode directly from per-episode watched state instead of trusting Emby's NextUp API, which could keep pointing at an already-played episode.

## 0.9.4

- game-thumbs style now offers styles **5 (grid background)** and **6 (grid with team colours)** in addition to 1-4.

## 0.9.3

- New **game-thumbs** option for sports art (plugin page): point Lobby at a [game-thumbs](https://github.com/sethwv/game-thumbs) service by IP:port or hostname and pick a matchup style (1-4), and sports cards and the hero backdrop use clean 16:9 matchup graphics instead of the guide's (often portrait, cropped) image. Teams are matched flexibly from the guide listing; leagues covered include NHL, NBA, WNBA, NFL, MLB, MLS, NCAA football/basketball and the major soccer leagues. Off by default; when off, the guide image is used as before. (The TV-side sports cards revert to landscape to match.)

## 0.9.2

- The plugin's catalog icon now uses the new Lobby logo (the lit archway with app tiles), matching the TV app's launcher icon.

## 0.9.1

- Fixed: the **Live sports only** checkbox on the plugin page floated away from its label (Emby's global form styles). It now sits inline beside its label like the other toggles.

## 0.9.0

- **Manage Continue Watching:** hold **OK** on an in-progress card in Continue Watching to remove it. `POST /Lobby/Resume/Dismiss` clears only that item's saved resume position, so it leaves Continue Watching while its watched/unwatched status is kept exactly as it was.

## 0.8.0

- New **Live sports only** server setting (plugin page, on by default): the featured area and the "Your teams" row show only programmes the guide flags as "Live", leaving out replays, encores and preview/highlight shows. Turn it off to show all matching sports. (With it on, if your guide provider doesn't mark live broadcasts, the sports surfaces will be empty.)

## 0.7.0

- Version bump so the per-TV weather build is distinguishable from the earlier 0.6.0 build that still had the old global weather settings. No code changes from 0.6.0's final state.

## 0.6.0

- `GET /Lobby/Search?query=`: searches the Emby library and (when configured) Seerr for a title, and returns two rows — **In your library** (play/resume) and **Request from Seerr** (titles not already in the library, de-duplicated by TMDB id). Backend for the TV's upcoming search screen.

## 0.5.0

- Optional **per-TV weather** on the Watch home screen: give each paired TV a location on the plugin page — by ZIP/postal code, the browser's location, or latitude/longitude, with °C/°F — and that TV shows a small conditions icon and temperature next to the clock. Fetched by the TV from Open-Meteo (free, no account); nothing is sent when it's off or unset.
- Fixed: the Recently Added row's default toggle now persists across plugin settings saves.

## 0.4.0

- New **Recently Added** home row: the newest movies and series added to the library (excluding what's already in Continue Watching). Hidden by nothing by default; toggle it under the plugin's row switches or per-TV in Settings → Emby & Seerr, where it also reorders like any other row.

## 0.3.0

- `GET /Lobby/Details`: a Seerr title's tagline, overview, genres, runtime or seasons, rating, directors, writers, creators, networks and top-billed cast (with role and photo), for the TV's request screen. Uses the same 12-hour cache as featured taglines.
- Renamed from ClearFrame to **Lobby**: `Lobby.dll`, a new plugin ID, the TV API under `/emby/Lobby/…` and the `Authorization: Lobby <token>` scheme (or `X-Lobby-Token`). This is a clean break: remove `ClearFrame.dll` (and `ClearFrame.xml` under `plugins/configuration`) when installing, then set up Seerr and pair each TV again.
- Featured games: for the first two teams in a TV's Your Teams list, a game that's on now or starts within the hour leads the featured titles, with the matchup as its tagline, the channel logo and any programme artwork. It leaves the Your Teams row while featured.
- `Featured`: up to five titles for the top of Home, mixing the title watched most recently, the newest unwatched library additions and the top of Seerr's Trending list. Each carries a tagline, backdrop, logo (when the library has one), a details line and the reason it was picked. Featured titles aren't repeated in the rows.
- Your Teams only lists games: a guide listing must be a matchup ("A at B", "A vs B", "League: A v B") naming a chosen team in its title or episode title. Descriptions are no longer searched, so preview shows, highlights and talk shows that mention a team are left out, and so are replays of old games. A chosen name matches the same name or the same name with a place in front ("Maple Leafs" matches "Toronto Maple Leafs"; "Michigan" doesn't match "Michigan State").

## 0.2.0

- Each TV now keeps its own settings, changed from Lobby on the TV: which home rows show, their order, items per row, sports look-ahead, play delay and how long to wait for the Emby app. New endpoints: `GET`/`POST /Lobby/Settings` and `POST /Lobby/Settings/Reset`.
- Team picker: `GET /Lobby/Sports/Teams` lists teams found in the guide's sports listings, so teams can be chosen with the remote instead of typed.
- Playback uses each TV's own delay and wait time.
- Seerr titles that Seerr reports as available or partly available are matched to the Emby library by TMDB id. Movies play or resume and shows play their next episode (`PlayItemId`, `PlayAction`). Available titles default to playing; partly available ones still default to requesting.
- Each title appears only once across a TV's rows, in the first row that has it (episodes count as their show).
- TVs can send their token as `Authorization: Lobby <token>`. Emby's CORS policy already allows that header, so browser-based clients pass the preflight. `X-Lobby-Token` still works.
- The plugin page's home and playback settings are now the defaults for TVs. Each TV card shows whether the TV has changed its settings and can reset it. Every setting has a short explanation, and the Seerr section has its own Save button.

## 0.1.0

First version of the Lobby Emby plugin.

- TV pairing with on-screen codes approved from the plugin page; per-TV tokens stored only as hashes.
- One Emby user per TV, with Emby app session matching by device ID or the TV's DUID.
- Home rows: Continue Watching, Next Up, On Now, Your Teams (per-TV sports keywords), and Seerr Trending, Popular Movies and Popular Shows.
- Seerr requests from the TV, made as the linked Seerr user. Links are synced from Seerr's stored Emby ids, with username/email suggestions and manual links; one Emby user can link to several Seerr users, with the last requester remembered per TV and an optional fallback account.
- Play, resume (from the saved position) and details commands sent to the Emby app on the TV, queued until the app connects when it isn't running yet.
- Settings page under Dashboard → Plugins → Lobby.
- Requires Emby Server 4.9 or later; tested on 4.10.2.0.
