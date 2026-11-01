# TV compatibility evidence

Updated 1 November 2026. App rendering and native Home reassignment need separate evidence. Tizen version alone does not establish support. The source manifest requires Tizen 6.5; older adapted builds do not change that requirement.

## Recorded results

| TV / platform | Web launcher | Native Home | Evidence |
| --- | --- | --- | --- |
| Maintainer LS03D, Tizen 9, firmware 2130.0 | Installation and selected remote flows confirmed; other checks remain pending | Exact-value restore/reapply and Home from Netflix confirmed | [Maintainer record](tv-status.md) |
| QN43Q60BAFXZA, Tizen 6.5, Chromium 85 | Contributor reports rendering, navigation and hidden-boot work in their adapted fork; this branch reworks the boot path | Contributor reports query/apply/restore/reapply, cold boot and Home from Netflix | [PR #2](https://github.com/nthnclrk/CleanFrame/pull/2), [PR #5](https://github.com/nthnclrk/CleanFrame/pull/5) |
| QA75LS03BASXNZ, Tizen 6.5, Chromium 85 | Contributor reports Dock labels and rounded utility focus fixed in their adapted build | No native Home result supplied | [PR #10](https://github.com/nthnclrk/CleanFrame/pull/10) |
| Another 2025 Frame, Tizen 9 | Contributor reports saved apps, scrolling, Home from Netflix and appearance changes on their 0.6.4 build | Existing assignment retained during that update | [PR #7](https://github.com/nthnclrk/CleanFrame/pull/7) |
| QE55LS03R (2019 Frame), Tizen 5.0, firmware T-MSMDEUC-1500.9, Chrome 63.0.3239.0 | Contributor reports Dock, List, Settings and editor remote checks in their adapted build; upstream takes corrected spacing only, retaining its existing compositor path and Tizen 6.5 minimum | Not tested | [PR #11](https://github.com/nthnclrk/CleanFrame/pull/11) |
| UE43NU7099, Tizen 4.0 | Contributor reports their signed launcher ran; current upstream Tizen 6.5 package remains outside this target | Tested developer transport could not stage/run the helper; no native settings read or written | [PR #8](https://github.com/nthnclrk/CleanFrame/pull/8) |
| QN43LS03BAFXZA, Tizen 6.5, firmware 1720.7 | Contributor reports a derived launcher and Samsung Home escape work | Getter/setter/runtime activation and exact empty-value restoration unverified | [Issue #1](https://github.com/nthnclrk/CleanFrame/issues/1) |
| QA55Q8FAAULXL, Tizen 9, firmware 1300.9 | Contributor reports navigation, launching and saved preferences work | No native experiment; independent recovery unresolved | [Issue #3](https://github.com/nthnclrk/CleanFrame/issues/3) |
| UN65U7900FFXZA, Tizen 9, firmware 1300.8 | Contributor reports installation and navigation work | Helper correctly refuses this untested target | [Issue #9](https://github.com/nthnclrk/CleanFrame/issues/9) |
| UN43M70HAFXZX, Tizen 10, firmware 1203.9 | No launcher result supplied | No verified native Home or restore result | [Issue #1 comment](https://github.com/nthnclrk/CleanFrame/issues/1#issuecomment-6351927784) |
| QN65LS03DAFXZA, Tizen 9, firmware 2130.0 (T-PTMDAKUC build) | Lobby 0.9.4 installed; Smart Hub home, app launching and HDMI input switching confirmed on-set | Query/apply/restore built for this set and run; physical Home button reaches the launcher from apps, Smart Hub home and the Art Mode exit (see note below). Exact-value baseline captured and restore available | Owner record (this fork) |

Contributor reports have not been reproduced by the maintainer. Browser regression checks cannot verify a TV compositor, native Samsung destination, remote feel or cold boot. The exact Q60B production firmware revision remains to be established: its reported `Version` field was a placeholder, alongside a dated build ID. It is not an exact-firmware allowlist entry.

## Home button from Art Mode (QN65 LS03D, firmware 2130)

On this set, assigning native Home made the physical Home button open the launcher from apps and the Smart Hub home screen immediately, but the **Art Mode exit** still returned to Samsung Home. Three further changes resolved it:

- `db/first_screen/type` set to the launcher app id (in addition to `db/appfw/home_appid` and the Home operation).
- Samsung setting **Start with Smart Hub Home** turned **off**.
- Samsung setting **Auto run last app** turned **on**.

A full mains power cycle was required before the Art Mode path changed; a standby/Art Mode toggle alone did not apply it. After the cold boot the Home button reached the launcher from apps, the Smart Hub home screen and the Art Mode exit.

Setting the Home app id also caused the TV to propagate the launcher into `db/appfw/startup_appid` and `db/appfw/booting_appid_backup` on its own, consistent with "Auto run last app"; this was left in place. The helper's exact-value restore reverts `first_screen/type` and the propagated values along with the rest, provided the SDB transport is available.

## Native Home limits

The maintained helper stays on its reference .NET 6 target and firmware guard. A .NET 3.1 build reported by a contributor has not been checked on the reference TV. Keep generated `bin/`, `obj/`, DLLs and debug symbols private; they can contain local paths and are not reviewed source.

The current helper requires non-empty original Home and string values. It does not restore absent keys or an initially empty Home operation. Do not substitute Samsung Home for an empty or missing original value. That case needs a reviewed getter/reset contract and a separate reversible experiment.

Apply and restore use the same SDB execution transport. There is no independently verified recovery path if that transport stops working. Query/inspect also upload temporary files. Follow the [staged setup guide](agent-tv-setup-guide.md) under a separate device task, preserve the exact original values, and stop when transport, firmware, runtime, app identity or recovery differs. Keep DUIDs and recovery records private.
