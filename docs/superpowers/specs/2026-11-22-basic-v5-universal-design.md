# BASIC V5 Universal — Design

## Intent

Deliver one field-test APK, independent from V73, that uses the existing Totem Park production services and normal screen-code workflow while retaining the approved BASIC V5 telemetry and operational player engines.

## Goals

- One package, `br.com.parksolutions.totempark.player.basicv5`, for Android TV, TV boxes, AVDs, and compatible Android devices.
- No Emulator, localhost, `10.0.2.2`, or LAN dependency in the normal build.
- Normal Portal pairing, durable identity/link, local-first playback/cache, templates, schedules, remote commands, and BASIC schema 5 telemetry.
- Opt-in/opt-out autostart preference stored natively and honored on supported Android boot broadcasts.
- Real APK metadata from `TotemDevicePlugin` and a reproducible build/hash report.

## Non-goals and anti-goals

- No V73 behavioral, package, autostart, telemetry, or APK changes.
- No Portal redesign, production deployment, Firebase deployment, push, or administrative credential in the APK.
- No claim that Android hardware or OEM autostart behavior is homologated without physical evidence.
- No duplicate player engine, cache, scheduler, or remote-command implementation.

## Approaches considered

1. **Promote the integrated LAB APK.** Rejected: it is deliberately Emulator-bound and claims/flags are LAB-only.
2. **Fork/rebuild the V73 application.** Rejected: it risks the protected package and duplicates mature engines.
3. **Add a production-connected BASIC flavor over the existing stable player code.** Selected: it reuses the mature operational engines, keeps a unique package/source set, and limits new native code to package-gated autostart/settings.

## Architecture

- Vite mode `playerBasicUniversal`, `VITE_APP_MODE=playerRc`, BASIC schema 5, 25-second heartbeat, and production Firebase configuration. It contains no Emulator flags or hosts.
- Android flavor `playerBasicUniversal`, package suffix `.player.basicv5`, version `5.0.0-basic-v5-universal-test`, debug-signed experimental APK, and flavor-local bundled Web assets.
- `BasicUniversalBootReceiver` listens only to allowed boot/package events, verifies the exact universal package, reads `SharedPreferences`, and starts `MainActivity` once with single-task flags when enabled. Android may still block background activity launch.
- `BasicUniversalSettingsActivity` exposes one native switch for autostart. `MainActivity` exposes this settings screen only for the universal package via its existing exit dialog.
- Existing `claimPlayerBinding`, persisted link, Firestore cache, player scheduler, templates, media cache, commands, and BASIC heartbeat remain the implementation authority.

## Security and compatibility

- Production Firebase uses the existing client configuration and rules; no admin secrets are added.
- LAB custom-claim provisioning remains guarded to `demo-totem-basic-hom` and is not activated by the universal mode.
- Autostart defaults enabled for field testing, can be disabled persistently, and never changes V73’s receiver or preference namespace.
- Package/version/build metadata comes from the installed APK.

## Acceptance evidence

- Source-contract and Java unit tests for flavor isolation, no Emulator dependency, boot preference, package guard, and single launch.
- Existing BASIC telemetry, binding, cache/playback, command, scheduler, and V73 protection suites.
- Web and Gradle builds, `aapt2` package inspection, SHA-256, AVD install/launch/boot tests where the requested AVD is available.
- Physical/OEM autostart and prolonged playback remain explicit field-test items.
