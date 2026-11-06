# Lobby for Emby

The server half of Lobby. This Emby plugin gives each paired Samsung TV a home screen backend:

- **Rows:** Continue Watching, Next Up, On Now (Live TV), and Your Teams (Live TV sports matched against team names you choose per TV).
- **Seerr discovery:** Trending, Popular Movies and Popular Shows, each with its request status.
- **Requests from the TV**, made as the right Seerr user. Emby accounts are linked to Seerr accounts automatically where possible. One Emby login can link to several Seerr accounts for shared logins, in which case the TV asks who is requesting.
- **One-press playback:** Lobby tells the server what to play, then launches the Emby app. The plugin waits for the Emby app's session and sends Play, Resume (at the saved position) or Show Details.

Seerr's URL and API key stay on the Emby server. TVs only ever hold their own Lobby token.

Tested on Emby Server **4.10.2.0**. CI also builds against 4.9.1.90.

<p>
  <img src="../docs/screenshots/lobby-request.png" alt="TV request screen with cast, crew and who's requesting" width="49%">
  <img src="../docs/screenshots/lobby-teams.png" alt="Team picker for Your Teams" width="49%">
</p>

*(Invented title, cast and teams — see [`docs/screenshots/README.md`](../docs/screenshots/README.md#lobby-screenshots-lobby-png).)*

## Install

1. Download `Lobby.dll` from the latest [release](https://github.com/CtznSniiips/Lobby/releases) tagged `emby-plugin-v…`. For an unreleased build, use the artifact `Lobby-emby-4.10.2.0` from the latest **Emby plugin** workflow run.
2. Copy it into your Emby `plugins` folder, e.g. `/config/plugins` in the Docker container or `programdata/plugins`.
3. If you used it under its old name, delete `ClearFrame.dll` from the plugins folder and `ClearFrame.xml` from `plugins/configuration`. Lobby keeps its own settings, so set up Seerr and pair each TV again.
4. Restart Emby.

## Set up

Open Dashboard → Plugins → Lobby.

1. **Seerr:** enter the URL and an API key (Seerr → Settings → General), then press **Test connection** and **Save settings**.
2. **Account links:** press **Sync from Seerr**.
   - **auto:** the Seerr account already signs in with that Emby account.
   - **suggested:** a username or email match. Press ✓ to confirm it; suggestions aren't used until confirmed.
   - Add or remove accounts with the dropdown, then press **Save links**. Sync never touches links you added or confirmed.
   - Optionally choose a **Request as** account for Emby users with no link.
3. **TVs:** start pairing in Lobby on the TV. Its four-character code appears here. Choose the Emby user the TV acts as and, if needed, the Emby app session on that TV, then press **Approve**.
   - If the Emby app reports the TV's hardware ID (DUID) as its device ID, it's matched automatically and you can leave the Emby app field on *Match automatically*.
   - Otherwise, open Emby on the TV once, press **Refresh**, and pick it from the list.
4. **TV defaults:** choose which rows a new TV shows, items per row, the sports look-ahead and the playback timing. Each TV can then change its own rows, order, timing and teams from Lobby's settings on the TV. A TV's card shows whether it has done so, with **Reset TV settings to defaults** to undo it.

## TV API

Every TV call except pairing sends `Authorization: Lobby <token>`. `X-Lobby-Token: <token>` is also accepted, but isn't on Emby's CORS allow list. Responses use Emby's PascalCase JSON. Emby image paths are server-relative, so prefix them with the server address and add `&maxWidth=` as needed.

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| POST | `/emby/Lobby/Pair` | `{ DeviceName, Duid }` | `{ PairingId, Code, Secret, ExpiresInSeconds }`. Show `Code` on screen. |
| GET | `/emby/Lobby/Pair/Status` | `?PairingId=&Secret=` | `{ Status: pending, approved, rejected or expired, Token, TvName }`. `Token` is returned once; store it. |
| GET | `/emby/Lobby/Ping` | | `{ TvName, UserName }`. A 401 means the TV was unpaired. |
| GET | `/emby/Lobby/Home` | | `{ TvName, UserName, RequestsEnabled, Rows: [{ Id, Title, Layout, Items }], Warnings }` |
| GET | `/emby/Lobby/Details` | `?MediaType=movie or tv&TmdbId=` | `{ Tagline, Overview, Genres, RuntimeMinutes, Seasons, Rating, Directors, Writers, Creators, Networks, Cast: [{ Name, Character, PhotoUrl }] }` from Seerr, for the request screen. Cast is top-billed, at most twelve. |
| GET | `/emby/Lobby/Requesters` | | `{ RequestsEnabled, Requesters: [{ Id, Name, AvatarUrl }], LastRequesterId, UsingFallback }` |
| POST | `/emby/Lobby/Request` | `{ TmdbId, MediaType: movie or tv, SeerrUserId }` | `{ Status: requested, approved or failed, Message, RequestId }` |
| POST | `/emby/Lobby/Play` | `{ ItemId, Action: play, resume or details, StartPositionTicks? }` | `{ Status: sent, queued or failed, Message }` |
| GET | `/emby/Lobby/Settings` | | `{ Rows: [{ Id, Title, Source, Visible, Available, Reason }], RowLimit, SportsLookaheadHours, PlayDelayMs, PlayTimeoutSeconds, SportsTeams, Customized, Ranges }` |
| POST | `/emby/Lobby/Settings` | any of `{ RowOrder, HiddenRows, RowLimit, SportsLookaheadHours, PlayDelayMs, PlayTimeoutSeconds, SportsTeams }` | The updated settings. Fields you leave out stay as they are. |
| POST | `/emby/Lobby/Settings/Reset` | | Settings back on the server defaults. Sports teams are kept. |
| GET | `/emby/Lobby/Sports/Teams` | `?Days=7` (max 14) | `{ Days, Teams: [{ Name, League, Games, NextStartDate, Selected }], Message }`: teams found in the guide's sports listings, for picking with the remote. |

**Row ids:** `continue`, `nextup`, `livenow`, `sports`, `seerr-trending`, `seerr-movies` and `seerr-tv`. `Settings.Rows` lists every row in the TV's order, so the TV can render its settings list straight from it. `Available: false` means the row can't show anything yet: Seerr isn't set up, or no teams are chosen. `Ranges` gives the min, max and server default for each number, for building sliders or steppers.

**Team picker:** `/Sports/Teams` reads team names out of guide listings such as *NHL Hockey: Toronto Maple Leafs at Boston Bruins* or *Premier League: Arsenal v Chelsea*. Saved teams are listed first. To save the chosen names, send them as `SportsTeams` to `/Settings`.

**Your Teams** lists sports programmes in the look-ahead window whose title or episode title is a matchup naming a chosen team. Descriptions aren't searched, and replays (listings marked as repeats that aren't live) are left out. A chosen name matches a team in the listing when it's the same name, or the same name with words in front: "Maple Leafs" matches "Toronto Maple Leafs", but "Michigan" doesn't match "Michigan State". The same game on several channels is listed once.

Home items carry what the TV needs to act on them:

- `PlayItemId` and `DefaultAction` (`resume`, `play` or `request`).
- `ProgressPercent` for progress bars.
- `PosterUrl` and `LandscapeUrl`.
- For Live TV: `ChannelName`, `StartDate`, `EndDate` and `IsAiring`.
- For Seerr items: `TmdbId`, `MediaType` and `RequestStatus` (`none`, `requested`, `processing`, `partial` or `available`). When an available or partly available title is in the Emby library, `PlayItemId` and `PlayAction` (`play` or `resume`) play it: a movie directly, a show at its next episode.

`Home.Featured` lists up to five titles for the large area at the top of Home: games for the first two teams in the TV's Your Teams list that are on now or start within the hour (first; `FeatureReason` `game`, the matchup as `Tagline`, the channel logo as `LogoUrl`), then the title watched most recently, the newest library additions not yet watched, and the top of Seerr's Trending list, alternating. Each is a Home item with `Tagline`, `BackdropUrl`, `LogoUrl` (when the library has a logo), `Meta` (e.g. `2024 · PG-13 · 2h 10m` or `S2 E4 · TV-MA · Drama`) and `FeatureReason` (`game`, `resume`, `new` or `trending`). Seerr taglines come from Seerr's title details and are cached for 12 hours. Library titles without a backdrop aren't featured.

A title appears only once across the featured titles and rows, in the first row (in the TV's order) that has it. Episodes count as their show, and Seerr titles count as the library item they match.

**Playing from the TV:** call `/Lobby/Play` first, then launch the Emby app (`vYmY3ACVaa.emby`). If Emby is already running the command is sent immediately. Otherwise it's queued until the app connects, for up to the TV's `PlayTimeoutSeconds`. It's sent `PlayDelayMs` after the app connects, so the app has time to finish loading.

## Build

The workflow `.github/workflows/emby-plugin.yml` compiles the plugin against the assemblies shipped in the Emby Server release itself (downloaded from Emby's GitHub releases). It treats deprecated-API warnings as errors, and uploads `Lobby.dll` as an artifact. Run it manually with a different `emby_version` to check another server version.

Locally, with the .NET 8 SDK:

```sh
cd emby-plugin/Lobby
# against an Emby install (or the three MediaBrowser.*.dll files copied from one)
dotnet build -c Release -p:EmbyRefDir=/opt/emby-server/system
# or against the MediaBrowser.Server.Core NuGet package
dotnet build -c Release
```

The DLL is written to `bin/Release/netstandard2.0/Lobby.dll`.

## Release

Releases are published by hand from Actions → **Emby plugin release** → Run workflow.

1. Bump `<Version>` (and `AssemblyVersion`/`FileVersion`) in `Lobby/Lobby.csproj`.
2. Add a `## <version>` section to `CHANGELOG.md`. It becomes the release notes.
3. Merge to `main`, then run the workflow. Choose the Emby version to build against (default 4.10.2.0) and optionally mark it as a pre-release.

The workflow refuses to run if the tag `emby-plugin-v<version>` already exists, or if the changelog has no section for that version. It builds through the regular **Emby plugin** workflow, so the release uses the same checks, then creates the tag and a GitHub Release with `Lobby.dll` attached.
