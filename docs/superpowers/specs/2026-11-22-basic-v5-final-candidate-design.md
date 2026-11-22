# BASIC V5 Final Candidate Design

## Intent

Produce one update-compatible BASIC V5 candidate that publishes schema 5 telemetry, reuses a valid authenticated binding, removes the universal video end-frame hold, uses screen/location time zones, restores playlist navigation, and presents the approved native exit surface and app identity.

## Constraints

- Only `playerBasicUniversal` changes behavior; V73 and advanced telemetry remain unchanged.
- Package stays `br.com.parksolutions.totempark.player.basicv5`, debug signing stays compatible, VersionCode increases from 5 to 6, heartbeat stays 25 seconds.
- No production deploy, Portal visual change, data clearing, or automated mutation of the linked real screen.
- Existing local/untracked files are preserved.

## Approach

Fix each root cause at its boundary: wait for Firebase auth restoration and validate the existing UID binding before claiming; keep BASIC telemetry atomic with presence; decouple media navigation from template capability; format template time through an explicit IANA time zone resolved from screen/location/template; keep V73's single-decoder path but let the universal candidate use the existing buffered two-layer transition; replace only the universal native exit dialog with a compact focusable custom dialog over the live WebView.

Portal schema-5 parsing already exists in source, so no Portal code or layout change is required for this candidate. A future V73 replacement remains a separate signing/package/data-migration exercise.

## Acceptance

Regression tests prove auth restoration, valid-binding reuse and conflict preservation; BASIC heartbeat fields; VersionCode 6 and capability recognition; timezone formatting; universal-only buffered video transitions; remote previous/next availability; exact exit copy and internal build information. Web and Android builds must pass, then `adb install -r` must preserve the package data and autostart preference.
