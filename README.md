# Lobby

A home screen for Samsung The Frame that starts with what you watch: your Emby or Jellyfin server's Continue Watching, Live TV and sports teams, Seerr's trending titles, and your apps, with an interface made for the TV remote.

Lobby is a fork of [CleanFrame](https://github.com/nthnclrk/CleanFrame) by nthnclrk, which provides the quiet home screen, wallpapers, settings and TV tooling. Lobby adds the Watch layout and a server plugin — for Emby or Jellyfin.

## Lobby: Emby/Jellyfin and Seerr on Home

Lobby adds rows from your own Emby or Jellyfin server and Seerr to Home: Continue Watching, On Now, games for teams you follow, and Seerr's Trending and Popular lists. OK resumes or plays in the Emby/Jellyfin app, or requests a title in Seerr as the right person. The Watch layout puts a rotating featured title at the top (including your teams' games when they're about to start), with one row per band below and your apps in a dock along the bottom.

Lobby ships a plugin for each server, built from the same design and talking the same TV-facing API:

1. Install whichever plugin matches your server — [`emby-plugin/`](emby-plugin/README.md) for Emby, [`jellyfin-plugin/`](jellyfin-plugin/README.md) for Jellyfin — and set up Seerr and account links on its page.
2. On the TV: Settings → Emby & Seerr → Connect, enter the server address and approve the code on the plugin page.
3. Choose rows, order, teams and playback timing in Settings → Emby & Seerr. Those settings belong to the TV and are kept on the server.

Unpaired, the app behaves exactly as CleanFrame. See [interaction behaviour](docs/interaction-behaviour.md#emby-and-seerr-rows-lobby).

## Put it on a TV

### Install via apps2samsung

[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) is a third-party, open-source tool that side-loads apps onto Tizen devices — TVs, projectors and smart monitors — without you working through the Samsung Studio/SDK signing flow above by hand. It still needs Developer Mode enabled on the TV (Stage 2 of the [setup guide](docs/agent-tv-setup-guide.md)), but it folds the certificate and transfer steps into a desktop tool you run once per install instead of separate SDK commands.


<details>
  <summary>1. Enable developer mode on your Samsung TV</summary>

#### Open the Apps Section:
- Press the Home button on your Samsung remote.
- Navigate to and open the Apps store/section.
#### Access App Settings (if using a Smart Remote):
- Scroll all the way down to App Settings and select it.
#### Enter the Secret Passcode:
- Smart Remote: Press the 123 (or 1 then 123) button on your remote to bring up the on-screen numeric keypad, then type in 12345.
- Standard Remote (with a physical number pad): While in the Apps screen, press 1 - 2 - 3 - 4 - 5 in direct sequence without pausing.
#### Toggle Developer Mode On:
- A hidden pop-up window labeled Developer Mode will appear on the screen.
- Switch the toggle to On.
#### Restart the TV:
- Press and hold the power button on your remote for about two seconds (or unplug/restart the TV) to turn it off and back on to finalize activation.

</details>

2. Download and install [Apps2Samsung](https://apps2samsung.com/#download) on your platform of choice  

3. Search for Lobby  

4. Install on your TV  

### Reach Lobby with one press

Whichever way you installed Lobby — the full SDK flow or Apps2Samsung above — installing it and making it the thing your physical Home button opens are different steps, with very different risk.

**Full replacement:** the native-Home-routing stage of the [setup guide](docs/agent-tv-setup-guide.md) reassigns what the physical Home button opens, using this project's guarded native-Home helper. It's the closest thing to a stock Home screen, but Samsung doesn't document the mechanism, it's model/firmware-specific, and it needs a recovery baseline before you touch it. Treat it as something you do deliberately for your own TV, not a set of instructions to hand someone else.

**Quicker and lower-risk:** in TV Settings → General → Start Screen Options, turn on **Autorun Last App**, open Lobby once so it becomes the last app you used, then move its tile to the first position in the Home bar (press and hold the tile, or use the remote's move option). The TV then tends to come back up in Lobby the next time it's turned on, and even on a run where it doesn't, Lobby's tile is the first thing the physical Home button shows you — one extra press away rather than buried in the row. This doesn't touch native Home routing at all, so there's nothing to recover if you change your mind.

## Develop and check

```sh
npm run check
npm run check:tools
npx playwright install chromium
CLEANFRAME_PUBLIC_FONTS=1 npm run check:browser
npm run check:media
npm run check:public
npm run export:public
```

The browser checks use isolated Chromium profiles and a loopback preview. They never contact a TV. The public export creates `dist/CleanFrame-public-unsigned.wgt`, with public fonts and notices. It needs your own identity and signing before installation. It does not certify asset redistribution rights or device compatibility.

| Location | Purpose |
| --- | --- |
| `app/` | Current packaged UI and runtime assets |
| `scripts/` | Preview, validation, asset generation and reference TV tools |
| [Development](docs/development.md) / [testing](docs/testing.md) | Runtime map, preferences, checks and device boundaries |
| [Assets](docs/assets.md) / [third-party notices](THIRD_PARTY_NOTICES.md) | Rendering recipes, font separation and asset provenance |
| [Asset sources](docs/asset-sources.md) | Photo credits and verification of the bundled third-party assets |
| `.local/`, `dist/` | Ignored private setup, recovery data, generated files and packages |
| [`emby-plugin/`](emby-plugin/README.md) | Lobby Emby plugin: home rows, Seerr requests and remote playback for paired TVs |
| [`jellyfin-plugin/`](jellyfin-plugin/README.md) | Lobby Jellyfin plugin: the same features and TV API, for a Jellyfin server |

## Contribute

Fork it, experiment and build something that suits your TV. If you find a useful fix or improve the setup instructions, contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before a larger change. Reports should include model, firmware and the observed result, with private identifiers removed.

## Licence and credits

CleanFrame's original code and documentation use the [MIT licence](LICENSE). Fonts, photographs and logos retain their own terms; read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Paid Pangram binaries are excluded from Git and public exports. A local package may include them, so keep personal builds separate from public downloads.

The [release review](docs/public-release.md) records the publication checks. Third-party assets retain the terms listed in their notices. CleanFrame is an independent project with no Samsung or streaming-service affiliation.

[TV Detox](https://github.com/Ansub/tv-detox) is a useful example of making an agent-assisted TV project approachable. Its Android setup is a different implementation; the prompts and instructions here are written for CleanFrame and Tizen.
