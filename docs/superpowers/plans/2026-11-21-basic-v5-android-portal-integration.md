# BASIC V5 Android + Portal LAB Integration Plan

> **Spec:** User mission “TOTEM PARK BASIC V5 → TESTE INTEGRADO ANDROID + PORTAL”, 2026-11-21.

## Goal

Deliver a side-by-side Android LAB application and a locally runnable Portal LAB that exercise the approved BASIC V5 telemetry and on-demand now-playing protocol against `demo-totem-basic-hom`, without changing V73, approved BASIC APKs, production, or the approved visual layout.

## Global constraints

- Work only on `codex/player-v73-telemetria-simples-prep` in the existing isolated worktree.
- Preserve all pre-existing untracked and modified files; never reset, restore, clean, push, deploy, or overwrite approved APKs.
- Keep V73 application identity, boot/autostart, playback engines, and ECO heartbeat at 25 seconds unchanged.
- New behavior is LAB-only and guarded by explicit Vite mode, Android flavor, package identity, Firebase project validation, and feature flags.
- Use tests first for every behavioral change. No visual Portal changes.

## Task 1 — Lock isolation contracts with failing tests

**Files:**
- Add `tests/basic-v5-integrated-lab-isolation.test.mjs`
- Modify `package.json`
- Modify `android/app/build.gradle`
- Add `.env.playerBasicIntegratedLab`
- Add `.env.basicV5PortalLab`

**Steps:**
1. Add tests asserting a distinct Vite mode, Android flavor, package `br.com.parksolutions.totempark.player.basicv5integrated`, disabled boot receiver, BASIC/on-demand flags, Emulator-only project, and 25-second heartbeat.
2. Run the test and observe failure because the variant does not exist.
3. Add the minimum configuration and scripts; keep every existing flavor unchanged.
4. Run the isolation test and protected V73 regression tests to green.

## Task 2 — Provision LAB Player claims safely

**Files:**
- Add `functions/basic-v5-lab-claims.js`
- Modify `functions/index.js`
- Add `tests/basic-v5-lab-player-claims.test.mjs`

**Steps:**
1. Add failing tests for exact project guard, claim merge, rejection outside `demo-totem-basic-hom`, binding success, and claim removal on release/revoke.
2. Implement a small pure claims helper.
3. After the existing binding transaction succeeds, set `{clientId, screenId, role: 'player'}` only in the Auth Emulator project; do not weaken binding validation.
4. Clear only these LAB Player claims when the same binding is released or revoked.
5. Run focused functions/rules tests.

## Task 3 — Refresh authorization and activate the approved protocol

**Files:**
- Add `src/basic-v5-integrated-lab.js`
- Modify `src/App.jsx`
- Modify `src/player-now-playing-watchers-lab.js`
- Modify the final experiment switch/adapter only where flag recognition is required
- Add `tests/basic-v5-integrated-player-auth.test.mjs`

**Steps:**
1. Add failing tests proving that successful binding refreshes the ID token before the watcher bridge starts and that ordinary/approved modes do not run this path.
2. Implement one-shot, deduplicated token refresh behind `VITE_BASIC_V5_INTEGRATED_LAB=true`.
3. Permit the final approved watcher implementation under the new integrated flag, retaining all existing diagnostic flags.
4. Verify telemetry BASIC publication, observer creation/closure, reconnect recovery, and heartbeat behavior with focused tests.

## Task 4 — Build-safe WebView and assets

**Files:**
- Add `scripts/prepare-player-basic-integrated-lab.mjs`
- Add Android flavor manifest/resources under `android/app/src/playerBasicIntegratedLab/`
- Modify `vite.config.js` only for mode validation if required
- Add/update build contract tests

**Steps:**
1. Add failing tests for cleartext Emulator access, flavor-local assets, disabled autostart, and absence of writes to approved flavor asset trees.
2. Implement the isolated prepare script and Android resources.
3. Build Web assets for the integrated Android mode and assemble only the new flavor.
4. Confirm the package ID and calculate APK SHA-256.

## Task 5 — Portal LAB seed, commands, and integration proof

**Files:**
- Add `scripts/setup-basic-v5-integrated-lab.mjs`
- Add `tests/basic-v5-integrated-lab-setup.test.mjs`
- Add `docs/reports/2026-11-21-basic-v5-android-portal-integrated-lab.md`

**Steps:**
1. Add failing tests for a hard Emulator/project guard and deterministic synthetic identities without production secrets.
2. Implement an idempotent LAB setup script using Emulator endpoints/Admin SDK already present in the repository.
3. Exercise claims, rules matrix, observer creation/closure, reconnect, and Portal/App protocol locally; record real evidence and any unexecuted hardware checks.
4. Document Portal URL/commands, synthetic credentials, APK path/hash, install/vinculation steps, protected-file audit, and objective pending items.

## Task 6 — Full verification and checkpoint

1. Run the BASIC V5 focused suite, Firestore rules matrix, Player claims tests, full relevant suite, Web build, Android flavor build, `git diff --check`, and protected-component diff audit.
2. Inspect the working tree and stage only mission-owned source/tests/docs; leave all pre-existing artifacts untouched.
3. Commit the isolated integration checkpoint without push or deploy.
4. Perform a fresh whole-branch review, fix Important/Critical findings with RED→GREEN evidence, and report deferred Minor findings.

## Review focus

- Any route that can target a non-Emulator project or grant Player claims outside the exact LAB project.
- Any mutation to V73 or approved BASIC flavor identity/assets/heartbeat/autostart.
- Stale custom claims after release, revoke, screen change, upgrade, or reconnect.
- Watcher leaks, redundant listeners/writes, and failure to close observers.
- Android cleartext/network configuration escaping the isolated flavor.
- Claims/tests that pass structurally but are not exercised against the Emulator.
