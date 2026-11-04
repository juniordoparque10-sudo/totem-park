# V70 Offline V2 Minimal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore only News Editorial V2 and Clock Pro RSS after delayed configuration and offline cold boot while preserving the approved V70 runtime.

**Architecture:** Keep the existing data cache and initial hydration. Add a small news-only restoration API and React hook; port only loader safeguards for empty RSS and forced reconnect. Test the hook with a real React mount harness under simulated Capacitor Android.

**Tech Stack:** React 19, Node test runner, react-test-renderer, Vite playerRc build.

**Spec:** `docs/superpowers/specs/2026-11-04-v70-offline-v2-minimal-design.md`

## Global Constraints

- Base is exactly `28e4d610b9e7a5a733a66c3766045a562b43ac4c`.
- Do not add native image preparation, URL rewriting, downloads, or state updates from asset caching.
- Do not change weather, sports, V1, playback, Splash, decoder, media cache, CSS, Firebase, Portal behavior, or Android native sources.
- Do not generate an APK, install, publish, or deploy.

## Review Focus

- Empty RSS responses must retain the last non-empty segment.
- Reconnect must bypass only the retry window needed for news refresh.
- Delayed configuration must merge only approved news keys.
- Unmount before the microtask resolves must prevent state updates.
- Offline remount must restore persisted text without starting image downloads.

### Task 1: RSS preservation and reconnect

**Files:** Modify loader/cache tests and their production modules.

- [ ] Add failing tests for empty segment preservation and forced reconnect.
- [ ] Port the minimal loader and cache `force` behavior.
- [ ] Run focused tests green.

### Task 2: Restricted React rehydration

**Files:** Create the news rehydration hook and mount test; minimally wire `App.jsx`.

- [ ] Add failing mount/remount tests under simulated Android.
- [ ] Implement restoration of only `editorialNews`, `feedNews`, and Clock Pro `news`.
- [ ] Assert no weather/sports merge, no asset preparation, no post-unmount update, and bounded renders.

### Task 3: Regression and build

- [ ] Run V1, V2, startup, playback, scheduling, remote-control, and cache regression tests.
- [ ] Build `playerRc` without generating or copying an APK.
- [ ] Verify the complete diff against `28e4d610` and commit only scoped files.
