# Interaction behaviour — 0.9.6

## Home

- Dock: Left/Right scrolls the apps without wrapping. Up enters the top-right controls, starting with Art Mode or the last selected control. Left/Right moves between Art Mode, All apps and Settings. Down or Back returns to the selected app. The clock is at the top left.
- List: Up/Down scrolls the apps without wrapping. Right enters the bottom-right controls, aligned with the clock above. Up/Down moves between Art Mode, All apps and Settings. Left or Back returns to the selected app. The list fades at both ends as it scrolls.
- OK opens the selected item. Focus alone never launches an app.
- Icons-only apps and controls reveal their names when focused. App presentation and control presentation are independent.
- Back from the app list or Dock opens a choice to stay or open Samsung Home.
- A panel keeps focus within its own controls. Back closes one panel at a time.
- Returning to the running launcher keeps the selected app or panel item. There is no auto-return timer. Held OK and Back keys act once until the key is released.

## Settings and appearance

Settings opens a grouped overview: Background, Layout, Typography, Focus, Apps on Home and Samsung. OK opens a group. Appearance groups use a two-pane screen with visible choices on the left and the committed Home preview on the right.

| Group | Choices |
| --- | --- |
| Background | Photo, Light, Dark; Wallpaper and Rotation when Photo is active |
| Layout | List or Dock; independent Text, Icons or Both choices for apps and Home controls |
| Typography | Manrope, Neue Montreal, Mori, Pangram Sans, Geist and Newsreader, when available |
| Focus | Type or Glass; Soft, Frost or Clear tint material |
| Apps on Home | Membership and arrangement editor |
| Samsung | Samsung Home and TV settings |

Up/Down moves between rows. Left/Right moves between choices in a horizontal row. Focus alone changes neither the preview nor saved preferences in these appearance groups. Wallpaper has its own temporary photo preview, described below. OK applies the focused value. A checkmark identifies the applied value; the filled plate identifies remote focus. Applying the current value does not write again.

Material applies to a photographic Dock, or Glass focus on a photographic List. Inactive material choices remain visible with an explanation and are skipped during navigation. Their stored value is retained. Wallpaper and rotation are also inactive on flat backgrounds.

A font or photo change applies only after its resources are ready and storage succeeds. A load or storage failure keeps the previous appearance and checkmark, with a Try again action. Back cancels a pending change, leaves the group and keeps completed changes. Late load callbacks cannot apply a cancelled choice. There is no Save button. Returning to a group restores its last choice focus; returning to Settings restores its category focus. Rotation is nested within Background, and Back returns to its Rotation row.

The selected font applies to Home app names, the clock and Home controls, including Newsreader. Settings, All apps, the Home editor and status text retain Manrope. The preview shows the committed Home appearance and its clock continues to update. Pangram faces are available in Nathan's private build when the local files are present; their binaries are not included in the public source. An unavailable optional face is omitted. If the baseline font is slow or missing, Home remains usable with a local fallback and can recover when the font loads.

## Streaming apps

The nine default apps keep their known native IDs. Other installed consumer apps can also be added to Home. Launching uses the public `tizen.application.launch` API with the app's native ID. Missing apps and denied launches produce a real error. No web player, placeholder success page or account credential is embedded.

## All apps

The panel reads `tizen.application.getAppsInfo` on entry and shows the filtered consumer apps alphabetically. Samsung's visibility flag alone also exposes system utilities, so EP packages, background services, ad players, account utilities, placeholders and duplicates are omitted. Known brands use bundled marks. Other apps use their local installed icon, with initials as a fallback.

The five-column grid scrolls with remote focus. OK launches an app; its On Home badge shows membership. Up from the first row reaches Apps on Home, which opens the editor. An API failure shows a retry and keeps saved Home choices. Browser previews report that installed-app discovery and launching require the TV.

## Apps on Home

Open the editor from Settings or All apps. On Home shows the current order on the left. Not on Home shows Recently removed first, followed by other installed apps on the right. Home holds one to nine apps.

- Reorder: OK on an app name picks it up. Up/Down moves it. OK places it and saves the order. Back puts an unplaced app back without saving that move.
- Remove: Right from an app name reaches Remove from Home. OK saves the removal and moves focus to the same app in Recently removed. The app stays installed.
- Add: OK on an app in Not on Home adds it and saves. A recently removed app returns to its previous position within the editing session; another app is added at the end. Focus follows the app to its Remove from Home control, so another OK can reverse the addition.
- Undo reverses a completed addition, removal or reorder from the current editing session. Done or Back closes the editor and keeps completed changes. Undo history ends when the editor closes.

Removing the last Home app or adding a tenth app is prevented. A failed storage write keeps the committed choices and order, with a retry message. Saved native app IDs and names survive a restart or a failed catalogue refresh.

## Art Mode and Samsung screens

Art Mode sends an application control to the installed `org.tizen.art-app`, with `mode=fullscreen` and `requester=mobile`. This aims to enter native Art Mode with its current artwork, without toggling power or changing the selected artwork.

This mode comes from [research on Samsung's Art app](https://github.com/TheFab21/ha-samsungtv-smart/blob/master/notes/QN55LS03FAFXZA/ART_MODE_DECOMPILED.md), on another Tizen 9 Frame model. It is an internal Samsung contract, not a documented public Art API. Its visible behaviour on this exact firmware must be confirmed on the TV.

Samsung Home explicitly launches the original `com.samsung.tv.csfs` app, independently of the new Home assignment. The earlier `com.samsung.tv.coba.newhome` component did not open Smart Hub visibly and is no longer the escape target. TV settings still uses `com.samsung.tv.coba.setting`. Exact on-device destinations are recorded in docs/tv-status.md; launch callbacks alone are not visual proof. There is no blind power-key fallback.

All calls have bounded response handling. A failure leaves CleanFrame usable. No simulated device success views remain. Browser validation cannot confirm the visible Samsung destination.

Installed-app discovery allows up to 20 seconds for large TV catalogues; launch controls retain an 8-second limit. Opening All apps or the editor refreshes the catalogue while retaining saved Home choices. No discovery polling runs during hidden startup.

## Preferences and wallpaper

The launcher stores appearance, Home order, recently removed apps, the last launched Home app, wallpaper and rotation locally. List and Dock share these preferences. The existing `cleanframe.home.v1` key is retained, with a fallback read from `cleanframe.shore.v1`. Legacy List maps to Dark + List + Type; Glass Dock and Glass Grid map to Photo + Dock + Glass. App order, wallpaper, rotation and the last Home app are preserved.

The gallery contains 15 bundled wallpapers. Settings → Background → Wallpaper keeps the two-pane Settings frame. Up/Down browses a vertical thumbnail list without wrapping; the right-hand Home preview shows the candidate while the surrounding Settings backdrop stays on the applied photo. OK applies the focused photo and stays in Wallpaper. The tick marks the applied photo and preview status distinguishes unsaved browsing. Back restores the latest applied photo, cancels pending loading and returns to Background’s Wallpaper row. Photo and material assets change as one complete bundle; a failed load restores the applied preview and offers retry. Preview loading waits briefly for remote focus to settle. OK during loading queues application for that photo; another browse move or Back cancels it. Browsing never saves, and repeated OK on the applied photo does not write again.

Settings → Background → Rotation offers Fixed, Each time Home opens, Every 5 minutes, Every 15 minutes and Every hour. Each time Home opens advances once when the launcher loads; a return to the already-running launcher does not advance it. Timed rotation counts only visible Photo Home time in either List or Dock. Panels, flat backgrounds and time spent in other apps pause the cycle. Changing the photo or rotation mode starts a new interval.

Settings → Background → Screen saver offers Off (the default), 2, 5, 10, 15 and 30 minutes. When set, the launcher opens Samsung Art Mode (the same path as the rail's Art Mode button) after Home sits that long with no remote activity. Any remote button resets the countdown; the timer is cleared while the app is hidden and re-armed on return. The setting lives under Background to avoid crowding the Settings overview.

Launcher wallpaper is separate from native Art Mode. Runtime photos, materials and available fonts are local assets; they do not require the Mac or a network download.

## Emby and Seerr rows (Lobby)

Nothing changes until the TV is paired with the Lobby Emby plugin. An unpaired Home makes no network requests and looks exactly as above.

**Pairing.** Settings → Emby & Seerr → Connect opens a keypad for the server address. The arrows and OK use the on-screen keys; number keys on the remote (or a keyboard in the preview), `.` and `:` type directly, and Backspace deletes. The port defaults to 8096. Connect checks that an Emby server answers, then shows a four-character code. Approving the code on the plugin's page saves the address and the TV's token in `lobby.server.v1`, separate from the Home preferences. Failures name the cause (unreachable, not Emby, plugin missing, rejected or expired) and offer Try again or Change address. Back on the code returns to the keypad; Back on the keypad closes Connect.

**Rows on Home.** The server's rows (Continue Watching, Next Up, On Now, Your Teams, Trending, Popular Movies, Popular Shows) appear in the order and with the items each TV has chosen. Empty rows are left out.

- Dock: the rows sit between the clock and the Dock. Up from the Dock enters the last row used; Up from the first row reaches the Home controls; Down from the controls enters the first row; Down from the last row returns to the Dock.
- List: the rows form a column on the right and app names give way to it (longer names truncate, with the full name in the caption). Right from the List enters the rows; Left from a row's first card returns to the List; Down from the last row reaches the controls; Up from the first control returns to the last row.
- Left/Right move along a row without wrapping. Each row remembers its card, and long rows scroll to keep focus in view with the next card peeking. Back returns to the apps. Focus on a card shows its title, details and the OK action above the rows.
- OK on a library item or Live TV programme asks the server to play, resume (from the saved position) or tune that channel, then opens the Emby app. The server delivers the command when Emby connects. A server refusal or a missing Emby app shows a message, and Emby is not opened after a refusal.
- OK on a Seerr title that is already in the Emby library plays it like a library item: a movie resumes or plays, a show plays its next episode. A partly available title opens its request screen with Play first (focused), then Request. Other Seerr titles open the request screen: with one linked Seerr account, a single Request button; with several, one button per person, with the last requester focused. Requested and processing titles, and available titles the server couldn't find in the library, only explain their status. A Seerr refusal is shown with Try again.
- The request screen describes the title from Seerr: year, type, runtime or seasons, genres and TMDB rating; the tagline; the overview (three lines at most); who directed and wrote a film, or created a show and where it airs; and up to seven cast members with their roles, using initials when there's no photo. Details arrive after the screen opens; the status line and buttons keep a fixed place, so focus never moves under the viewer.
- Each title appears once on Home, in the first row (in this TV's order) that has it. A show counts as one title, so its episode in Next Up keeps it out of Trending.

**Installed apps.** On the TV, Lobby reads the installed-app list when it starts. Home apps that aren't installed are removed. A Home still on the inherited defaults is refilled from the TV's own services, in this order where installed: Netflix, YouTube, Prime Video, Disney+, Hulu, Apple TV, Peacock, YouTube TV, Max, Paramount+, Emby, Plex (nine at most). A Home the owner arranged keeps its order. All apps and the app editor list what's installed.

**Watch layout.** Settings → Layout → Watch. A newly paired TV switches to it. Until the TV is paired and the server has something to show, Watch looks and behaves like Dock, and the Layout page says why.

- Top: a rail on the left (Art Mode, All apps, Settings), the date and time on the right (with a small weather icon and temperature beside them when a location is set on the plugin page), and a featured title over its backdrop: a greeting, the title's tagline as the headline (its name when it has none), two lines of overview, a button named for the action (Resume, Play, Request, Watch live) with the reason and details beside it, and the title's logo, or its name, on the right. Dots show which of up to five featured titles is in view.
- The featured mix comes from the server. Games for the first two teams in this TV's Your Teams list come first when they're on now or start within the hour, headed by the matchup with the channel logo (or league) beside it and Watch live or Watch channel on the button; a game without artwork shows over the plain background. Then the title being watched most recently, the newest library additions not yet watched, and the top of Seerr's Trending list, alternating. Titles without background art are left out. Featured titles don't appear again in the rows. If the server sends no featured titles (an older plugin, or nothing with background art), the TV features the first title of Continue Watching and of Next Up and the top three of Trending that have artwork, and takes them out of their rows.
- Home starts on the featured button. Left and Right step through the featured titles (Right wraps); Left from the first one reaches the rail. Featured titles change every nine seconds while Home is in view, wherever focus is; while a card has focus only the background changes. Up and Down move along the rail, and Down from Settings enters the app dock; Right or Back leaves it.
- Below are the rows, one per band. Continue Watching and Next Up merge into one Continue Watching row: titles in progress first, then next episodes. Your Teams has its own row. Library and Live TV cards show their title and detail line only while focused; Seerr rows are artwork tiles. The focused card has a thin outline.
- Watch follows Settings → Background: Dark and Light use a plain dark or light page; Photo keeps the wallpaper (and its rotation) behind everything, shaded so the featured image and text stay clear. The featured backdrop drifts with a slow, subtle Ken-Burns pan, and a faint accent glow behind the title picks up a dominant colour sampled from the current image (skipped quietly when the image can't be read for colour, e.g. a server without CORS); both respect reduced-motion and the accent clears when there's no backdrop.
- The Home apps stay in a dock along the bottom of the screen, a smaller version of the Dock that follows Settings → Layout → App display. The TV's HDMI inputs follow the apps, named as the TV's source list names them (or HDMI 1, 2…), dimmed when nothing is connected. An input named for a soundbar (Q-series, HW-Q…) shows a soundbar icon, and one named for a games console (Switch, Xbox, PlayStation…) shows a controller; others show an HDMI plug. Settings → Inputs on Home (shown when the TV reports inputs) lists each input with On Home / Add to Home, so unused inputs can be left off the dock. OK on an input switches the TV's picture to it through Samsung's public TVWindow API and opens Samsung's TV viewer. Tiles narrow so apps and inputs fit on one line. Down from the last band (or from the featured title when there are no rows) enters it; Up returns to the band last used; Left from its first app reaches the rail; OK opens the app.
- Left/Right move along a row; Left from its first card reaches the rail. Up and Down move between rows; Up from the first row returns to the featured title. Back from any band returns to the featured title; Back there asks to leave Home.
- While a card has focus, the top describes it: name, overview, OK action and details. A band that doesn't fit below the featured area moves up under a compact title; the bands above it and the rail fade out.

Rows are cached so Home shows the last rows at once, then refreshed on start, when Home becomes visible again after 30 seconds away, and every five minutes while Home is visible. If the server no longer knows this TV, the rows disappear and Settings says to connect again, pre-filling the old address.

**Emby & Seerr settings.** A scrolling list of this TV's own settings, stored on the Emby server: each row's Shown/Hidden, Move up and Move down; items per row; Your teams; sports look-ahead; delay before play; wait for Emby; Use defaults; and Disconnect, which asks first. Changes save as they are made. Disabled controls are skipped. Your teams lists teams found in the next week's guide, grouped by league, with Follow/Following toggles.

## Sources

- [Samsung Application API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/application-api.html): installed-app discovery and application control.
- [Samsung application termination guide](https://developer.samsung.com/smarttv/develop/guides/fundamentals/terminating-applications.html): exiting is not treated as a deterministic Samsung Home route.

The native Home operation and startup configuration from 19 October remain separate from this app update. Home from Netflix was confirmed for that configuration; power-on after Netflix remains provisional. Streaming apps retain their own Back navigation. Netflix did not exit on repeated Back in the observed test, so there was no app-exit destination to verify. No global Back interception or key-filter hook was installed. See [TV status](tv-status.md) for device evidence; this behaviour specification is not an installation or visual-verification record for 0.6.0.

## Clock and rendering

Both layouts show the TV's local time in 12-hour format, without AM/PM or seconds. It updates at the minute boundary and on return to the launcher. No date or clock panel is shown.

Photographic materials and blurred panel backgrounds are generated before packaging and stay aligned with the full-screen image. Photo colour and contrast metadata are also prepared offline. Navigation does not sample image pixels, run an optics engine or apply live backdrop blur. Flat backgrounds use matching light or dark panel colours. Focus feedback uses transforms and opacity; reduced motion removes animated scaling and movement while retaining opacity feedback.

Hidden prelaunch can install a fully loaded wallpaper bundle without waiting for an animation frame. A valid loaded image remains usable if detached-image decoding rejects. A failed startup bundle retries when the launcher becomes visible; an active wallpaper preview keeps its candidate. Font recovery clears fallback measurements and cached markup. This readiness fallback uses a completed load and nonzero image dimensions; it does not prove a TV has painted the image, and an accepted bundle is not automatically decoded again on return. These paths have browser regression coverage; physical cold-boot behaviour still needs owner observation.
