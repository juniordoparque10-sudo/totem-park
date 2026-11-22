# BASIC V5 Universal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one production-connected, side-by-side BASIC V5 Android APK with persistent configurable autostart and the existing complete player engines.

**Architecture:** Add a dedicated Vite mode and Android flavor over `playerRc`; keep new native behavior package-gated in a universal boot receiver/settings activity. Reuse existing pairing, playback, cache, commands, scheduling, and BASIC telemetry unchanged.

**Tech Stack:** Vite/React, Capacitor 8, Android Java/Gradle, Firebase client SDK, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-22-basic-v5-universal-design.md`

## Global Constraints

- Package: `br.com.parksolutions.totempark.player.basicv5`.
- No Emulator/localhost/`10.0.2.2`/LAN dependency in the universal mode.
- Preserve V73 package, autostart, heartbeat, advanced telemetry, operational engines, and Portal UI.
- No deploy, push, production mutation, or administrative credentials.
- Heartbeat remains 25 seconds for BASIC V5.

## Review Focus

- Disabled autostart must survive reboot and never launch the universal activity.
- Repeated boot/package broadcasts must not create duplicate activity/player instances.
- Missing network at boot must preserve local link/cache and reconnect without showing pairing prematurely.
- APK update must preserve SharedPreferences and stored link while refreshing real version metadata.
- Production build must contain no Emulator endpoints or experimental LAB watcher activation.

---

### Task 1: Universal flavor isolation

**Files:** Create `.env.playerBasicUniversal`; modify `android/app/build.gradle`, `vite.config.js`, `package.json`; test `tests/basic-v5-universal-build.test.mjs`.

**Interfaces:** Produces Vite mode `playerBasicUniversal` and Gradle variant `playerBasicUniversalDebug`.

- [ ] Write and run failing tests for package/version, production Firebase mode, 25-second heartbeat, absence of Emulator flags, and unchanged V73 block.
- [ ] Add the minimal mode/flavor/scripts and make tests pass.
- [ ] Commit the isolated build configuration.

### Task 2: Native autostart preference and receiver

**Files:** Create `BasicUniversalPreferences.java`, `BasicUniversalBootReceiver.java`, `BasicUniversalSettingsActivity.java`, flavor manifest/resources; test `tests/basic-v5-universal-autostart.test.mjs` and Android JVM tests where feasible.

**Interfaces:** `BasicUniversalPreferences.isAutoStartEnabled(Context): boolean`; `setAutoStartEnabled(Context, boolean): void`.

- [ ] Write failing tests for exact package guard, default enabled, persistent disable, supported broadcasts, single activity flags, and manifest isolation.
- [ ] Implement the preference, receiver, settings activity, and flavor-only manifest.
- [ ] Run autostart and protected V73 receiver tests.
- [ ] Commit native autostart.

### Task 3: Universal app settings access

**Files:** Modify `MainActivity.java`; test `tests/basic-v5-universal-settings.test.mjs`.

**Interfaces:** Universal package opens `BasicUniversalSettingsActivity` from the existing native back dialog; other packages retain existing behavior.

- [ ] Write failing package-gating tests.
- [ ] Add the settings action without changing V73 paths and make tests pass.
- [ ] Commit settings access.

### Task 4: Production pairing and BASIC protocol contracts

**Files:** Tests `tests/basic-v5-universal-production-contract.test.mjs`; modify only proven compatibility gates if required.

**Interfaces:** Existing `claimPlayerBinding`, link persistence, production `firebase.js`, BASIC heartbeat, and remote listeners.

- [ ] Add failing/characterization tests proving production Firebase, arbitrary valid pairing codes, no fixed fixture, real APK metadata, BASIC-only telemetry, 25-second cadence, and no LAB watcher when idle.
- [ ] Make only indispensable isolated compatibility changes.
- [ ] Run binding, telemetry, command, cache, playback, scheduling, and template suites.
- [ ] Commit protocol contracts.

### Task 5: Flavor-local assets and APK

**Files:** Create `scripts/prepare-player-basic-universal-assets.mjs`; test `tests/basic-v5-universal-assets.test.mjs`.

**Interfaces:** Copies verified `dist-player-basic-universal` only to `android/app/src/playerBasicUniversal/assets/public` without overwriting approved flavors.

- [ ] Write and observe failing confinement tests.
- [ ] Implement the atomic asset preparation script.
- [ ] Build Web, prepare assets, assemble the universal APK with JDK 21, inspect with `aapt2`, rename/copy to `TotemPark-BASIC-V5-Teste-Universal.apk`, and calculate SHA-256.

### Task 6: AVD verification and report

**Files:** Create `docs/reports/2026-11-22-basic-v5-universal.md`.

**Interfaces:** Uses AVD `Television_1080p` if installed; records facts only.

- [ ] Start/connect the requested AVD without clearing data, install only the new package, launch it, and test first-run, relaunch, package metadata, preference toggling, and simulated boot where automation permits.
- [ ] Run the final focused suite, Web build, Android build, `git diff --check`, protected-file audit, and self-review.
- [ ] Commit only mission-owned files; preserve all pre-existing untracked files.
- [ ] Report APK path/hash, results, normal Portal pairing status, autostart evidence, minimum Android, and physical-device pendencies.

## Self-review

All eleven mission sections map to Tasks 1–6. Production pairing is characterized rather than rebuilt; autostart is isolated natively; hardware/OEM claims remain evidence-gated. Interfaces and names are consistent, and each behavioral task starts with a failing test.
