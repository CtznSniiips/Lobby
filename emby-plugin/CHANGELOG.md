# Changelog

## 0.6.0

- `GET /Lobby/Search?query=`: searches the Emby library and (when configured) Seerr for a title, and returns two rows — **In your library** (play/resume) and **Request from Seerr** (titles not already in the library, de-duplicated by TMDB id). Backend for the TV's upcoming search screen.

## 0.5.0

- Optional **weather** on the Watch home screen: set a latitude/longitude (and °C/°F) on the plugin page and the TV shows a small conditions icon and temperature next to the clock. Data is fetched by the TV from Open-Meteo (free, no account); nothing is sent when it's off or unset.

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
