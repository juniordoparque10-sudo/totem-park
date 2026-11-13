# V71 Activity Delta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce V71 upload traffic by sending only new legacy activity events while retaining the latest 200 events used by the Portal.

**Architecture:** Keep the existing screen document and Rules contract. Use Firestore `arrayUnion` while the retained list has capacity; when it would exceed 200, compact once to a lower watermark so subsequent heartbeats return to delta-only writes.

**Tech Stack:** React, Firebase Firestore 12.14.0, Node test runner.

**Spec:** User-approved V71 point fix in this chat (2026-11-13).

## Global Constraints

- Keep the 15-second heartbeat and ONLINE status unchanged.
- Do not change Portal, Firebase Rules, UI, cache, playback, APK, or deployment.
- Preserve the latest 200 activity events without duplicates or loss of recent events.

## Review Focus

- A retry must not duplicate events already accepted by `arrayUnion`.
- Concurrent additions must not be overwritten during ordinary delta writes.
- Near the 200-event limit, compaction must retain the newest events and restore headroom.
- Compaction must not repeat on every following heartbeat.
- Permission and network failures must leave the local outbox unacknowledged.

---

### Task 1: Delta activity synchronization

**Files:**
- Modify: `src/player-activity-telemetry.js`
- Modify: `src/App.jsx`
- Test: `tests/player-activity-telemetry-sync.test.js`

**Interfaces:**
- Consumes: current server events, local outbox events, Firestore `arrayUnion`, and `updateDoc`.
- Produces: `syncPlayerActivityBatch` result with acknowledged IDs and a delta or compacted update.

- [ ] **Step 1: Write failing tests** for delta-only payloads, retry idempotence, newest-event retention, compacted headroom, and failure acknowledgement behavior.
- [ ] **Step 2: Run** `node --test tests/player-activity-telemetry-sync.test.js` and confirm the new assertions fail.
- [ ] **Step 3: Implement** delta writes below the compaction threshold and bounded compaction when the update would exceed 200 events.
- [ ] **Step 4: Run the focused tests** and confirm they pass.

### Task 2: Contract and regression verification

**Files:**
- Test: existing player activity, heartbeat, telemetry, and Firestore Rules tests.

**Interfaces:**
- Consumes: Task 1 synchronization behavior.
- Produces: verified compatibility with the current heartbeat and Portal history document.

- [ ] **Step 1: Run relevant Node test suites** for activity, heartbeat, telemetry, history, and source contracts.
- [ ] **Step 2: Run the Firestore activity Rules emulator test** if the local emulator is available, verifying that the transform is accepted without a Rules change.
- [ ] **Step 3: Run build/lint checks relevant to the changed files.**
- [ ] **Step 4: Measure representative 13-minute payload totals** before and after using the tested event shapes.
- [ ] **Step 5: Inspect the full diff, run `git diff --check`, and commit only the approved files.**
