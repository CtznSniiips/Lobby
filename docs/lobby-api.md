# Lobby API

The Lobby plugin (Emby and Jellyfin) exposes an HTTP API that the TV app talks to. It has two
groups of endpoints:

- **TV endpoints** (`/Lobby/…`) — used by a paired TV. They skip the media server's own
  authentication and instead carry a per-TV **Lobby token**.
- **Admin endpoints** (`/Lobby/Admin/…`) — used by the plugin's settings page. They require an
  **Emby/Jellyfin admin** user (`Authenticated(Roles = "Admin")`).

This document describes the Emby plugin's routes. The Jellyfin plugin exposes the same routes and
shapes; only the base path differs (see below).

## Base path

The media server hosts these routes under its own API root.

- **Jellyfin**, and **Emby** too, answer at the bare path: `https://<server>/Lobby/…`
- **Emby** also answers under its `/emby` alias: `https://<server>/emby/Lobby/…`

The TV client probes the bare path first and falls back to `/emby` only if that fails, then
remembers whichever answered. Examples below use the bare `/Lobby/…` form.

## Authentication

### TV endpoints — the Lobby token

Pairing issues a long-lived token to each TV (stored server-side only as a hash). Send it on every
TV request in **either** form:

- `Authorization: Lobby <token>` — preferred. This header is on the server's CORS allow-list, so
  browser-based clients pass the preflight.
- `X-Lobby-Token: <token>` — legacy fallback.

A missing or unrecognized token returns **401**. `/Lobby/Pair`, `/Lobby/Pair/Status` and
`/Lobby/Ping` do not require a token to call (though `Ping` validates one if the endpoint is reached
through auth — see below). Pairing itself needs no token.

### Admin endpoints

Standard Emby/Jellyfin admin authentication (an `api_key`/access token belonging to an admin user).
All `/Lobby/Admin/…` routes are `Admin`-only.

## Conventions

- **Content type** — requests and responses are JSON. `POST` bodies are JSON objects whose fields
  match the request class. Omitted nullable fields (e.g. the `int?`/`string[]` fields on
  `SaveTvSettings`) are left unchanged.
- **Errors** — `ArgumentException` → **400**, `ResourceNotFoundException` → **404**,
  a security failure → **401**. The body carries the message.
- **Image URLs** — Emby images are **server-relative** (`/emby/Items/<id>/Images/...`); the TV
  prefixes them with the server origin. Seerr/TMDB images are **absolute** (`https://image.tmdb.org/...`).
- **Timestamps** — UTC, ISO-8601 round-trip format (`"o"`), e.g. `2026-11-13T15:06:00.0000000Z`.
- **Ticks** — positions and runtimes are in .NET ticks (1 tick = 100 ns; 10,000,000 ticks = 1 s).

---

## Pairing & token flow

1. **`POST /Lobby/Pair`** — the TV starts pairing and shows the returned `Code` on screen.
2. An admin approves it: **`POST /Lobby/Admin/Pairings/Approve`** with that `Code` (binds the TV to
   an Emby user and app device).
3. **`GET /Lobby/Pair/Status`** — the TV polls with its `PairingId` + `Secret`. Once approved, the
   response carries the `Token` **once**; the TV stores it and uses it from then on.

A pairing expires after 15 minutes if not approved.

---

## TV endpoints

### `POST /Lobby/Pair` — start pairing

No token. Request:

| Field | Type | Notes |
|---|---|---|
| `DeviceName` | string | Shown to the admin when approving. |
| `Duid` | string | Samsung DUID (`webapis.productinfo.getDuid()`); helps suggest the Emby app device. |

Response `StartPairingResponse`: `PairingId`, `Code`, `Secret`, `ExpiresInSeconds` (900).

### `GET /Lobby/Pair/Status` — poll a pairing

No token. Query: `PairingId`, `Secret`.

Response `PairingStatusResponse`:

| Field | Type | Notes |
|---|---|---|
| `Status` | string | `pending`, `approved`, `rejected` or `expired`. |
| `Token` | string | Present **only once**, on the first poll after approval. Store it on the TV. |
| `TvName` | string | The name the admin gave the TV. |

### `GET /Lobby/Ping` — check the token

Response `PingResponse`: `TvName`, `UserName` (the linked Emby user).

### `GET /Lobby/Home` — home screen

Response **`HomeResponse`** (see [Home shapes](#home-shapes)). Builds all the rows, featured titles,
weather config and game-thumbs base for this TV.

### `GET /Lobby/Search` — search

Query: `Query`. Response **`HomeResponse`** whose `Rows` hold library matches (playable) and Seerr
matches (requestable).

### `GET /Lobby/Details` — Seerr title details

For the request screen. Query:

| Field | Type | Notes |
|---|---|---|
| `MediaType` | string | `movie` or `tv`. |
| `TmdbId` | int | TMDB id. |

Response `TitleDetailsResponse`: `Tagline`, `Overview`, `Genres[]` (≤3), `RuntimeMinutes`,
`Seasons`, `Rating`, `Directors[]`, `Writers[]`, `Creators[]`, `Networks[]` (≤2), and `Cast[]` (≤12)
of `TitlePerson { Name, Character, PhotoUrl }`. **404** if Seerr isn't configured or the title isn't
found.

### `GET /Lobby/Requesters` — who this TV can request as

Response `RequestersResponse`:

| Field | Type | Notes |
|---|---|---|
| `RequestsEnabled` | bool | False when requests are off or Seerr isn't configured. |
| `Requesters[]` | `Requester { Id, Name, AvatarUrl }` | Seerr users allowed from this TV. |
| `LastRequesterId` | int? | Who last requested recently; pre-select them. |
| `UsingFallback` | bool | True when the TV's user has no linked Seerr account and the server fallback is used. |

### `POST /Lobby/Request` — request a title in Seerr

Request:

| Field | Type | Notes |
|---|---|---|
| `TmdbId` | int | |
| `MediaType` | string | `movie` or `tv`. |
| `SeerrUserId` | int | Who to request as. Optional when only one requester is allowed. |

Response `SubmitRequestResponse`: `Status` (`requested`, `approved` or `failed`), `Message`,
`RequestId`.

### `POST /Lobby/Play` — play/resume/show on the TV

Sends a command to the Emby app on this TV (the app is launched by the TV afterwards). Request:

| Field | Type | Notes |
|---|---|---|
| `ItemId` | string | Emby item id. |
| `Action` | string | `play`, `resume` or `details`. Defaults to `play`. |
| `StartPositionTicks` | long? | Explicit start. For `resume`, the saved position is used when omitted. |

Response `DispatchResult`: `Status` (`sent`, `queued` or `failed`), `Message`, `SessionId`.
`queued` means the command waits for the Emby app to connect. **400** for a bad id/action, **404**
if the item isn't visible to the TV's user.

### `POST /Lobby/Resume/Dismiss` — clear a resume point

Removes an item's saved position so it leaves Continue Watching; played/unwatched status is kept.
Request: `ItemId`. Response `DismissResumeResponse`: `Status` (`ok` when cleared, `unchanged` when
there was no resume point), `ItemId`.

### `GET /Lobby/Settings` — this TV's settings

Response **`TvSettingsResponse`** (see [Settings shapes](#settings-shapes)).

### `POST /Lobby/Settings` — change this TV's settings

Null fields are left unchanged. The first change from a TV starts from the server defaults. Request:

| Field | Type | Notes |
|---|---|---|
| `RowOrder` | string[] | Row ids in display order. Rows left out follow in default order. |
| `HiddenRows` | string[] | Row ids to hide. Replaces the current list. |
| `RowLimit` | int? | Max items per row. |
| `SportsLookaheadHours` | int? | |
| `PlayDelayMs` | int? | |
| `PlayTimeoutSeconds` | int? | |
| `SportsTeams` | string[] | Teams for the Your Teams row. Replaces the current list. |

Response **`TvSettingsResponse`**. Values are clamped to the allowed ranges.

### `POST /Lobby/Settings/Reset` — back to server defaults

Returns this TV to the server's default rows and timing (sports teams are kept). Response
**`TvSettingsResponse`**.

### `GET /Lobby/Sports/Teams` — teams in the guide

For picking teams with the remote. Query: `Days` (default 7, max 14). Response
`GuideTeamsResponse`: `Days`, `Teams[]` of `GuideTeam { Name, League, Games, NextStartDate,
Selected }`, and `Message` (set when the guide can't be read, e.g. Live TV isn't set up).

---

## Admin endpoints

All require an admin user.

### `GET /Lobby/Admin/State`

Everything the settings page shows. Response `AdminState`:

| Field | Type | Notes |
|---|---|---|
| `Settings` | `SettingsView` | Current general/Seerr settings (see below). |
| `Tvs[]` | `TvView` | Paired TVs with resolved settings and live app status. |
| `PendingPairings[]` | `PairingView` | `{ Code, DeviceName, Duid, CreatedUtc, SuggestedEmbyDeviceId }`. |
| `Sessions[]` | `SessionView` | Recent server sessions (≤50), for assigning an app device. |
| `EmbyUsers[]` | `EmbyUserView` | `{ Id, Name, IsDisabled }`. |
| `Links` | `UserLink[]` | Emby↔Seerr links. |
| `QueuedPlayCount` | int | Play commands waiting for an app to connect. |

### `POST /Lobby/Admin/Settings`

Saves general and Seerr settings. Request/response share **`SettingsView`** (see
[Settings shapes](#settings-shapes)). `SeerrApiKey` is write-only — leave it empty to keep the saved
key; `HasSeerrApiKey` reports whether one is stored. Numeric fields are clamped.

### `POST /Lobby/Admin/Seerr/Test`

Tests a Seerr URL + key without saving. Request: `SeerrUrl`, `SeerrApiKey` (empty tests with the
saved key). Response `SeerrTestResult`: `Ok`, `Message`, `UserCount`.

### `GET /Lobby/Admin/Seerr/Users`

Seerr users for linking. Query: `Refresh` (bool, bypass cache). Response `SeerrUsersResult`:
`Users[]` of `SeerrUserView { Id, Name, Email, EmbyUserId, AvatarUrl }`, plus `Error`.

### `POST /Lobby/Admin/Links/Sync`

Rebuilds automatic links from Seerr and suggests matches; manual links are kept. Response
`SyncReport`: `SeerrUsers`, `AutoLinked`, `Suggested`, `ManualKept`, `Links` (`UserLink[]`).

### `POST /Lobby/Admin/Links`

Replaces all Emby↔Seerr links. Request: `Links` (`UserLink[]`). Response: the stored `UserLink[]`.
`UserLink { EmbyUserId, SeerrUserId, Source, SeerrDisplayName }` where `Source` is `auto`,
`suggested` or `manual`.

### `POST /Lobby/Admin/Pairings/Approve`

Approves a pairing code and binds the TV. Request is a **`TvEdit`** (see below) plus `Code`.
Response `TvView` (the new TV).

### `POST /Lobby/Admin/Pairings/Reject`

Request: `Code`. Response `OkResult { Ok }`.

### `POST /Lobby/Admin/Tvs/Update`

Updates a paired TV. Request is a **`TvEdit`** plus `Id`. Response `TvView`.

### `POST /Lobby/Admin/Tvs/ResetSettings`

Puts a TV back on the server's default rows and timing. Request: `Id`. Response `OkResult`.

### `POST /Lobby/Admin/Tvs/Delete`

Unpairs a TV; its token stops working immediately. Request: `Id`. Response `OkResult`.

### `GET /Lobby/Admin/Updates/Check`

Checks GitHub for a newer Emby plugin release. Query: `Refresh` (bool, bypass the 6-hour cache).
Response `UpdateCheckView`: `CurrentVersion`, `LatestVersion`, `UpdateAvailable`, `ReleaseUrl`,
`PublishedAt`, `Error`.

### `POST /Lobby/Admin/Updates/Install`

Downloads the latest release and overwrites the plugin's own DLL on disk. **The server still needs
restarting afterward** to load it. Response `UpdateInstallView`: `Success`, `Message`.

### `TvEdit` (request body for Approve/Update)

| Field | Type | Notes |
|---|---|---|
| `Name` | string | TV name. |
| `EmbyUserId` | string | Emby user GUID (`"N"` format). Must be an existing user. |
| `EmbyDeviceId` | string | The Emby app session/device to remote-control. |
| `SportsTeams` | string | Comma- or newline-separated team names. |
| `WeatherEnabled` | bool | |
| `WeatherLatitude` / `WeatherLongitude` | string | Parsed as numbers. |
| `WeatherFahrenheit` | bool | |

---

## Home shapes

### `HomeResponse`

| Field | Type | Notes |
|---|---|---|
| `TvName` | string | |
| `UserName` | string | Linked Emby user. |
| `EmbyUserId` | string | |
| `RequestsEnabled` | bool | |
| `GeneratedUtc` | string | |
| `Rows[]` | `HomeRow` | The home rows, in this TV's order. |
| `Featured[]` | `HomeItem` | Up to 5 titles for the large area at the top. Not repeated in `Rows`. |
| `Warnings[]` | string | Non-fatal problems (e.g. Seerr unreachable); the rest still works. |
| `Weather` | `WeatherConfig` | `{ Latitude, Longitude, Fahrenheit }`, or null when off/unset. The TV fetches the actual weather. |
| `GameThumbsBase` | string | Base URL for matchup art when enabled; null when off. |

### `HomeRow`

`{ Id, Title, Layout, Items[] }` where `Layout` is `landscape` or `poster`.

### `HomeItem`

| Field | Type | Notes |
|---|---|---|
| `Id` | string | |
| `Kind` | string | `movie`, `episode`, `program` or `discover`. |
| `Title`, `Subtitle`, `Overview` | string | |
| `Year` | int? | |
| `PosterUrl`, `LandscapeUrl`, `LogoUrl`, `BackdropUrl` | string | Emby-relative or absolute TMDB URLs. `LogoUrl`/`BackdropUrl` mainly for library and featured items. |
| `ProgressPercent` | double? | |
| `PositionTicks`, `RuntimeTicks` | long? | |
| `PlayItemId` | string | Item id to send to `/Lobby/Play` (channel id for Live TV programs). |
| `DefaultAction` | string | `resume`, `play` or `request`. |
| `ChannelName`, `ChannelNumber`, `StartDate`, `EndDate` | string | Live TV programs. |
| `IsAiring` | bool? | |
| `TmdbId` | int? | Seerr items. |
| `MediaType` | string | `movie` or `tv` (Seerr items). |
| `RequestStatus` | string | `none`, `requested`, `processing`, `partial` or `available` (Seerr items). |
| `PlayAction` | string | For Seerr items already in the library: `play` or `resume`; `PlayItemId` then names the movie or the show's next episode. |
| `Tagline`, `Meta`, `FeatureReason` | string | Featured items. `FeatureReason` is `game`, `resume`, `new` or `trending`. |

---

## Settings shapes

### `TvSettingsResponse` (TV settings)

| Field | Type | Notes |
|---|---|---|
| `Rows[]` | `TvRowSetting` | Every row, in this TV's order. |
| `RowLimit` | int | |
| `SportsLookaheadHours` | int | |
| `PlayDelayMs` | int | |
| `PlayTimeoutSeconds` | int | |
| `SportsTeams` | string[] | |
| `Customized` | bool | False while the TV still follows the server defaults. |
| `Ranges` | map | `name → { Min, Max, Default }` for `RowLimit`, `SportsLookaheadHours`, `PlayDelayMs`, `PlayTimeoutSeconds`, for building the settings controls. |

`TvRowSetting { Id, Title, Source, Visible, Available, Reason }` where `Source` is `library`,
`livetv` or `seerr`. `Available` is false (with a `Reason`) when a row can't show anything yet —
e.g. Seerr isn't set up, or no teams are chosen.

### `SettingsView` (server settings — admin)

Connection and defaults for the whole server:

- **Seerr:** `SeerrUrl`, `SeerrApiKey` (write-only), `HasSeerrApiKey`, `RequestsEnabled`,
  `FallbackSeerrUserId`, `RememberRequesterMinutes`.
- **Defaults/timing:** `RowLimit`, `SportsLookaheadHours`, `PlayDelayMs`, `PlayTimeoutSeconds`.
- **Default rows:** `ShowContinueWatching`, `ShowNextUp`, `ShowRecentlyAdded`, `ShowLiveNow`,
  `ShowSports`, `ShowSeerrTrending`, `ShowSeerrPopularMovies`, `ShowSeerrPopularShows`.
- **Sports:** `SportsLiveOnly`.
- **Game thumbs:** `GameThumbsEnabled`, `GameThumbsUrl`, `GameThumbsStyle`.

### `TvView` (a paired TV — admin)

`Id`, `Name`, `EmbyUserId`, `EmbyUserName`, `EmbyDeviceId`, `Duid`, `SportsTeams[]`, weather
(`WeatherEnabled`, `WeatherLatitude`, `WeatherLongitude`, `WeatherFahrenheit`), `PairedUtc`,
`LastSeenUtc`, `SettingsCustomized`, `VisibleRows[]` (row titles in order), `RowLimit`,
`PlayDelayMs`, `PlayTimeoutSeconds`, `SportsLookaheadHours`, and live app status
(`EmbyAppControllable`, `EmbyAppLastSeenUtc`).
