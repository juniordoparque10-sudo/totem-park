# TOTEM PARK V69 Experimental Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one V69 experimental APK plus review-only Portal/Firebase changes that correct the V68 homologation findings without regressing playback, binding, cache, or offline-first behavior.

**Architecture:** Keep the shared V2 renderer as the single Portal/Player visual contract. Extend only the existing telemetry/capability contracts, transition-frame handoff, remote-command gate, and telemetry detail drawer; prepare Firebase/Portal changes locally but never deploy them. Package the existing `playerConsolidatedExperimental` flavor as versionCode 69 with the installed rcsecurelink identity and certificate.

**Tech Stack:** React 19, Vite, Firebase/Firestore Rules, Capacitor 8, Android Gradle, Node test runner.

**Spec:** `C:/Users/centr/.codex/attachments/f1ad8bc8-c25d-43a1-9efb-964d13c9d800/Texto colado.txt`

## Global Constraints

- Preserve the V68-approved startup, persistent binding, continuous playback, playlist mutation, schedules, seals, cache, reconnection, offline-first behavior, and traffic economy.
- Preserve package `br.com.parksolutions.totempark.player.rcsecurelink` and the installed signing certificate; use versionCode `69`.
- Do not alter or publish V51, Production Portal, Firebase, Functions, or deployed Rules; review-only source changes are allowed.
- Do not install the APK or restart the Chromecast.
- Do not reintroduce V2.1, TV ao Vivo, or the experimental personalization engine.
- Do not add global CSS, redesign approved templates, invent telemetry, infer playback from presence, add arbitrary transition delays, or enable unsupported controls.

## Review Focus

- A stale schema-4 snapshot must never be presented as current uptime, traffic, heartbeat, version, or zero failures.
- V2-A intervals must be derived only from ordered real events; an open final event or a gap must not create duration.
- One through four sports must preserve football priority and never overlap long names, schedules, scores, or standings.
- Video-to-video handoff must retain a drawable frame without mounting duplicate decoders or delaying playback.
- Portal-only changes must not alter global modal/drawer behavior or production state.

---

### Task 1: Sports V2 and shared visual fidelity

**Files:** Modify `src/templates-v2/sports-v2/**`, targeted shared renderer/preview files only if evidence requires it; test `tests/sports-v2.test.js` and focused visual-contract tests.

**Interfaces:** Consumes the existing published template schema. Produces one density/layout contract used unchanged by preview and Player.

- [ ] Write failing tests for exact `Amanhã às 19h30` casing and explicit 1/2/3/4-sport layout policies.
- [ ] Run the focused tests and confirm failures represent the current uppercase/static layout behavior.
- [ ] Implement the minimum shared layout/density changes, preserving one-sport composition and persisted configs.
- [ ] Add renderer-contract assertions for 16:9 preview/Player parity and Smart Lobby saved transparency/typography.
- [ ] Run focused Sports/Smart Lobby/template tests and commit.

### Task 2: Telemetry, version/capability contract, and drawer dismissal

**Files:** Modify `src/player-activity-telemetry.js`, `src/player-telemetry.js`, `src/App.jsx`, `src/telemetry-card-data.js`, `src/TelemetryDashboard.jsx`, `src/player-remote-capability.js`, `src/templates-v2/player-capability.js`, `firestore.rules`, and focused tests.

**Interfaces:** Produces authenticated Android capabilities, safe V2-A batching, fresh-source precedence, factual durations, and a drawer-local backdrop.

- [ ] Write failing Rules and player integration tests for Android V69 capabilities and bound V2-A writes; reject wrong/revoked/unbound identities and extra fields.
- [ ] Write failing Portal tests proving fresh telemetry precedence, capability fallback, stale-data suppression, factual duration labels, and absence represented as uninstrumented rather than zero.
- [ ] Write a failing drawer interaction test: backdrop closes, content click stops propagation, Close still closes.
- [ ] Implement minimal producer, Rules, precedence, and drawer changes; retain existing heartbeat interval and bounded outboxes.
- [ ] Add V69 to remote navigation/capability allowlists only after listener/ack behavior is covered.
- [ ] Run focused telemetry, Rules contract, remote-control, and drawer tests; commit review-only Portal/Firebase source changes without deploying.

### Task 3: Video-to-video retained-frame transition

**Files:** Modify `src/video-transition-frame.js`, the narrow transition region in `src/App.jsx`, and targeted tests.

**Interfaces:** Produces an event-driven retained frame released only after the incoming video proves a drawable frame; no timers or second playback loop.

- [ ] Write a failing regression test for VIDEO→VIDEO and non-regression tests for VIDEO→TEMPLATE and TEMPLATE→VIDEO.
- [ ] Confirm the VIDEO→VIDEO test exposes the premature retained-frame release.
- [ ] Implement the smallest state/event fix at the decoder/frame handoff.
- [ ] Run transition, visible-layer, decoder lifecycle, playback identity, and offline/cache tests; commit.

### Task 4: V69 packaging and controlled verification

**Files:** Modify Android flavor metadata, packaging tests/manifests, and `docs/consolidacao-player-final/**`; produce exactly one APK in `artifacts/player-consolidado-final/`.

**Interfaces:** Consumes verified Web assets and code from Tasks 1–3. Produces the signed V69 rcsecurelink update candidate.

- [ ] Write/update the release-contract test for versionCode 69, versionName, package, capability, and prohibited-experiment exclusions; verify RED before metadata changes.
- [ ] Set V69 metadata and run focused regression suites including splash, cache, binding, playlist, templates, telemetry, remote control, and transitions.
- [ ] Build Web twice and compare hashes; prepare Android assets and compare `dist`, source-set, and APK contents.
- [ ] Build the experimental APK without installing or publishing; verify package, version, update-compatible certificate, and SHA-256.
- [ ] Update the final traceability/build report with causes, tests, visual limitations, review-only deployment dependency, and the single APK path; commit.
