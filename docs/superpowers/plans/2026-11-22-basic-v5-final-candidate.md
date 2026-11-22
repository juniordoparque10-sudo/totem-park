# BASIC V5 Final Candidate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the update-compatible BASIC V5 final candidate with the six requested corrections and verified APK evidence.

**Architecture:** Root-cause fixes remain in small existing domain modules; App.jsx only wires them into the universal runtime. Native UI and metadata remain package-gated.

**Tech Stack:** React 19, Firebase 12, Capacitor 8, Android Java/Gradle, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-22-basic-v5-final-candidate-design.md`

## Global Constraints

- Preserve V73, advanced telemetry, 25-second BASIC heartbeat, production infrastructure, data and approved Portal visuals.
- Keep package `br.com.parksolutions.totempark.player.basicv5`; set VersionCode 6; retain debug signing compatibility.
- TDD for every behavior change; no push or deploy.

## Review Focus

- Auth restoration returning no user initially must not create a replacement UID.
- A genuinely different active binding must still require explicit authorization.
- VersionCode 6 must remain approved for capabilities and install over VersionCode 5.
- Invalid/missing IANA zones must fall back deterministically without Android local time.
- Universal video transitions must never activate the last-frame canvas while V73 behavior stays byte-for-byte gated.

### Task 1: Authentication, binding and BASIC telemetry gate

**Files:** `src/player-identity.js`, `src/App.jsx`, tests under `tests/`.

- [ ] Write failing tests for `authStateReady()` ordering and validate-before-claim binding reuse/conflict.
- [ ] Implement the minimal binding resolver and wire it to PlayerPage.
- [ ] Run focused identity/telemetry tests and commit.

### Task 2: Time zone, navigation and universal video transition

**Files:** `src/template-timezone.js`, `src/App.jsx`, `src/player-remote-capability.js`, `src/templates-v2/player-capability.js`, tests.

- [ ] Write failing tests for screen/location timezone, navigation capability and universal transition gating.
- [ ] Implement minimal helpers and universal-only wiring; keep V73 path unchanged.
- [ ] Run focused playback/template/command tests and commit.

### Task 3: Native exit UI, identity and update metadata

**Files:** Android universal Java/manifest/Gradle and tests.

- [ ] Write failing tests for copy, focus/back behavior, app label, build information and VersionCode 6.
- [ ] Implement the package-gated custom dialog/settings information and metadata update.
- [ ] Run native contract tests and commit.

### Task 4: Build, update validation and report

**Files:** generated isolated assets, one new APK artifact, final report.

- [ ] Run the focused and complete available suites; record any historical failures separately.
- [ ] Build Web, atomically refresh only universal assets, build Android, verify manifest/hash/signature.
- [ ] Install with `adb install -r`, verify package data/autostart persistence without opening the linked screen automatically.
- [ ] Review the protected diff, commit the report, and deliver one APK.
