# V70 Scheduled Playlists Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a scheduled playlist reliably become the playlist whose items are rendered at the local schedule boundary, and suppress schedule notices fabricated during Player bootstrap.

**Architecture:** Keep the approved schedule contract and playback engine unchanged. Add a small, injectable schedule runtime that combines the exact boundary timeout with a periodic local fallback tick, and expose a pure playback selection result whose `items` prove what reaches rendering. Treat the first Firestore playlist snapshot as bootstrap state, never as a remote creation/update event.

**Tech Stack:** React 19, JavaScript ES modules, Node.js test runner, Firebase Firestore listeners.

**Spec:** `C:/Users/centr/.codex/attachments/74b752fc-69ef-4439-8bda-cb2aef3e4b24/Texto colado.txt`

## Global Constraints

- Base Player commit: `ea5933bb2ef87ad7ff9e884695ad664fbc77ddd7` on `codex/v70-firebase-efficiency-hotfix`.
- Do not use Package 1 initialization commits or mix the incremental telemetry hotfix.
- Do not change playback engine, decoder, normal transitions, Splash, Local First/cache, binding, 15-second heartbeat, telemetry, remote commands, approved UI/CSS, Templates V2 engines, Firebase Rules, or indexes.
- Do not build/install an APK, publish Portal, or mutate production Firebase.
- The scheduled playlist must win during the active window and the default playlist must return after it.
- Tests must assert the identity/items selected for rendering, not only `currentPlaylistMode` or a notice.

## Review Focus

- Exact start/end boundaries select scheduled/default rendered items respectively.
- A missed exact boundary callback is recovered by the local fallback tick without a server message.
- Starting inside an active window selects scheduled rendered items immediately.
- Same-day, cross-midnight, cancellation/update, offline cached data and incomplete preparation do not change selection priority.
- Initial listener bootstrap does not show a creation/update notice from stale persisted state.

---

### Task 1: Resilient schedule activation and renderable selection

**Files:**
- Modify: `src/player-schedule-v62.js`
- Modify: `src/App.jsx`
- Modify: `tests/player-schedule-v62.test.js`

**Interfaces:**
- Produces: `resolveScheduledPlayback({ playlists, defaultPlaylist, now, screenId }) -> { playlist, mode, items }`.
- Produces: `startScheduleRuntime({ playlists, screenId, onTick, now, setTimeoutFn, clearTimeoutFn, setIntervalFn, clearIntervalFn, fallbackIntervalMs }) -> cleanup`.
- Consumes: existing `selectActiveScheduledPlaylist` and `getNextScheduleBoundaryDelay` contract.

- [x] **Step 1: Write failing tests for rendered-item selection and dropped-boundary recovery**

Use the exact 02/11/2026 13:02–13:04 fixture with a Template V2 item and a video item. Assert scheduled item IDs at start/inside the window, default item ID at end, immediate scheduled selection on startup inside the window, and a fallback tick that calls `onTick` after the exact timeout is intentionally not invoked.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/player-schedule-v62.test.js`
Expected: FAIL because `resolveScheduledPlayback` and `startScheduleRuntime` do not exist.

- [x] **Step 3: Implement the minimal runtime and wire PlayerPage to it**

Keep the exact boundary timer, add a one-second local fallback tick, and make `PlayerPage` use `resolveScheduledPlayback` for the playlist that feeds `activePlaylist?.items`. Do not touch playback/readiness/cache logic.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/player-schedule-v62.test.js`
Expected: PASS.

### Task 2: Bootstrap-safe schedule notice state

**Files:**
- Modify: `src/player-schedule-v62.js`
- Modify: `src/App.jsx`
- Modify: `tests/player-schedule-v62.test.js`

**Interfaces:**
- Produces: `buildScheduleSnapshot(playlists, screenId, previousSnapshot, { bootstrapping })` with `notice:null` during bootstrap.
- Consumes: Task 1 schedule runtime; no contract changes to Firestore documents.

- [x] **Step 1: Write a failing bootstrap test**

Assert that a first snapshot with a stale persisted `{}` produces no notice, while a subsequent real creation/update produces the existing notice.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/player-schedule-v62.test.js`
Expected: FAIL because stale `{}` currently creates a false `created` notice.

- [x] **Step 3: Suppress only initial listener notices**

Track listener bootstrap in `PlayerPage`; preserve persisted seen keys, initialize the current snapshot, and allow subsequent listener callbacks to emit creation/update notices.

- [x] **Step 4: Run schedule, integration and full suites**

Run: `node --test tests/player-schedule-v62.test.js tests/active-playlist-listener-integration.test.js tests/playlist-editor-state.test.js tests/portal-schedule-presentation.test.js`
Expected: PASS.

Run: `node --test tests/*.test.js tests/*.test.mjs tests/*.test.cjs`
Expected: PASS, or every pre-existing unrelated failure reported by name.

- [x] **Step 5: Commit the independent Player hotfix**

Commit message: `fix(player): reliably activate scheduled playlists`
