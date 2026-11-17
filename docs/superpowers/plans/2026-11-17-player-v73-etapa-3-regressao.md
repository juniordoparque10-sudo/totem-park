# Player V73 BASIC Stage 3 Regression Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the operational regression and compatibility status of the V73 BASIC flavor without modifying operational engines, Portal behavior, production, or installed applications.

**Architecture:** Treat the repository and local Firebase emulators as the system under test. Add only focused regression/measurement tests and documentary evidence; Portal work is read-only. Keep all executable network simulations local and distinguish measured bytes from modeled estimates.

**Tech Stack:** Node test runner, Vite, Firebase local emulators, Android Gradle BuildConfig generation, source audits.

**Spec:** User request “TOTEM PARK — ETAPA 3 — REGRESSÃO FUNCIONAL E COMPATIBILIDADE”, 2026-11-17.

## Global Constraints

- Work only on `codex/player-v73-telemetria-simples-prep` from `fea33f2a`.
- Do not generate APKs, deploy, publish, merge, push, modify Firebase real, Portal code/visuals, production, or client devices.
- Do not alter operational engines to satisfy historical tests.
- Do not claim traffic reduction without a real comparative measurement.

## Review Focus

- Tests that inspect source rather than exercise behavior must be labeled as structural evidence.
- Firebase emulator traffic must not be presented as equivalent to a physical Android device measurement.
- Legacy Portal fallbacks outside `telemetry` must not present stale advanced data as current BASIC data.
- Heartbeat/presence frequency must remain independent of command listener latency.
- Historical version-specific fixtures must be classified against their original commits, not rewritten to fit V73.

---

### Task 1: Operational regression inventory and execution

**Files:**
- Create: `docs/audits/player-v73-etapa-3-test-evidence.md`
- Test: existing `tests/**/*.test.*`, `src/**/*.test.*`

**Interfaces:**
- Consumes: current V73 implementation at `fea33f2a`.
- Produces: traceable matrix of feature, test command, result, and evidence strength.

- [ ] Run targeted playback, playlist/schedule, template, cache/offline, command/binding, maintenance, and orientation suites.
- [ ] Run emulator-backed identity/rules tests locally.
- [ ] Record failures without changing operational engines.
- [ ] Commit the evidence matrix.

### Task 2: BASIC contract and Firestore communication measurement

**Files:**
- Create: `tests/player-basic-traffic-budget.test.js`
- Create: `docs/audits/player-v73-basic-traffic-measurement.md`

**Interfaces:**
- Consumes: schema 5 snapshot and 15-second heartbeat contract.
- Produces: deterministic serialized payload size/frequency measurement and a physical V73-versus-BASIC protocol.

- [ ] Add a failing test that measures the serialized BASIC envelope and asserts forbidden advanced fields are absent.
- [ ] Add the minimal measurement fixture without changing production behavior.
- [ ] Run BASIC, legacy compatibility, build metadata, session/upgrade/downgrade and atomic publication tests.
- [ ] Document measured local payload bytes separately from unmeasured device/network overhead.
- [ ] Commit tests and measurement protocol.

### Task 3: Portal read-only audit and historical-test classification

**Files:**
- Create: `docs/audits/player-v73-etapa-3-portal-legacy-audit.md`
- Create: `docs/audits/player-v73-etapa-3-historical-tests.md`

**Interfaces:**
- Consumes: Portal readers and historical Git evidence.
- Produces: no-code logical correction proposal and classification for every known V56/V59/V70 divergence.

- [ ] Map every reader/fallback of telemetry, traffic, cache, source, version, session, and online state.
- [ ] Define the session/installation/schema validity predicate without editing Portal files.
- [ ] Use Git history and focused test runs to classify each divergence with evidence.
- [ ] Commit both audits.

### Task 4: Consolidated report and physical homologation proposal

**Files:**
- Create: `docs/audits/player-v73-etapa-3-regressao-final.md`

**Interfaces:**
- Consumes: Tasks 1–3 evidence.
- Produces: final pass/fail/risk report and physical 16:9/9:16 homologation protocol.

- [ ] Run final focused regression, Vite build, Gradle BuildConfig generation, diff check, and repository status.
- [ ] State every unexecuted or inconclusive criterion explicitly.
- [ ] Specify physical-device traffic capture and acceptance thresholds without claiming savings.
- [ ] Request independent whole-branch review and address only Critical/Important findings.
- [ ] Commit the final report and preserve the branch/worktree.
