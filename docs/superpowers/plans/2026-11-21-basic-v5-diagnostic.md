# BASIC V5 Diagnostic Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and run an isolated BASIC V5 Android diagnostic build that identifies the exact gate preventing telemetry publication.

**Architecture:** A pure diagnostic helper emits sanitized, deduplicated local logs. Compile-time Vite and Android flavor isolation ensures approved builds contain no active diagnostic behavior. Existing heartbeat construction and its single Firestore write remain unchanged except for observations around them.

**Tech Stack:** React/Vite, Node test runner, Capacitor Android/Gradle, Firebase Emulator, adb/Logcat.

**Spec:** `docs/superpowers/specs/2026-11-21-basic-v5-diagnostic-design.md`

## Global Constraints

- Preserve every preexisting tracked and untracked worktree change; never use restore/reset/discard.
- Do not alter V73, approved BASIC V5/measurement APKs, Portal, production, real Firebase, or heartbeat interval.
- Use only project `demo-totem-basic-hom`, AVD `BASIC_V5_Medicao`, and package `br.com.parksolutions.totempark.player.basicv5diag`.
- Do not add diagnostic Firestore writes or log secrets/full documents.

## Review Focus

- Missing metadata must name exact invalid fields without logging unrelated app state.
- Binding mismatch logs must remain useful when IDs are sensitive; log booleans, never values.
- Repeated heartbeat logs must be deduplicated while still logging a changed failure state.
- Write success/error must describe the existing heartbeat write, not create another write.
- Build/install commands must target only the diagnostic flavor/package/AVD.

---

### Task 1: Pure diagnostic contract

**Files:**
- Create: `src/basic-v5-diagnostic.js`
- Create: `tests/basic-v5-diagnostic.test.js`

**Interfaces:**
- Produces: `createBasicV5Diagnostic({ enabled, log })`, `getBasicAppInfoValidation(snapshot)`, and sanitized heartbeat/binding summaries.

- [ ] Write tests for metadata reasons, binding booleans, deduplication, payload keys, and sanitized errors.
- [ ] Run tests and verify RED due to missing module.
- [ ] Implement the minimal pure helper.
- [ ] Run tests and verify GREEN.

### Task 2: Diagnostic-only integration and build isolation

**Files:**
- Create: `.env.playerBasicDiag`
- Create: `android/app/src/playerBasicDiag/AndroidManifest.xml`
- Modify: `vite.config.js`
- Modify: `android/app/build.gradle`
- Modify: `src/App.jsx`
- Modify: `package.json`
- Create: `tests/basic-v5-diagnostic-build.test.js`

**Interfaces:**
- Consumes: Task 1 diagnostic API.
- Produces: Vite mode/flavor/package plus bounded observations around the existing heartbeat write.

- [ ] Write structural tests for exact mode, package, emulator project/host, gated call sites, and absence of extra `updateDoc`.
- [ ] Run tests and verify RED.
- [ ] Add the diagnostic environment/flavor and integrate logs without changing predicates or writes.
- [ ] Run focused and regression tests, then build web assets and diagnostic APK only.

### Task 3: Experimental execution and diagnosis

**Files:**
- Create: `docs/audits/basic-v5-diagnostic-2026-11-21.md`
- Output only: `D:\TotemPark-Homologacao\BASIC-V5-ONLINE\Diagnostico\TotemPark-BASIC-V5-DIAGNOSTICO.apk`

**Interfaces:**
- Consumes: diagnostic APK and local Firebase Emulator.
- Produces: Logcat evidence, root cause, minimal recommended correction, APK hash, and preservation statement.

- [ ] Verify destination filename is absent and AVD identity is `BASIC_V5_Medicao`.
- [ ] Start/use only local emulators for `demo-totem-basic-hom` and install only the new package.
- [ ] Capture filtered `[BASIC_V5_DIAG]` Logcat through at least one heartbeat.
- [ ] Diagnose metadata, binding, or payload gate; do not implement the correction.
- [ ] Copy without overwrite, compute SHA-256, run final verification, and write the report.
