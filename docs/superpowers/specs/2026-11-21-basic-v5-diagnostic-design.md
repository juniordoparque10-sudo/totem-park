# BASIC V5 Diagnostic Build Design

## Intent

Identify why the Android experimental BASIC V5 player updates presence but omits `telemetry` and `telemetryUpdatedAt`, without changing approved V73/BASIC builds, operational validation, heartbeat frequency, Firestore writes, or production services.

## Goals

- Add Vite mode `playerBasicDiag` with `VITE_APP_MODE=playerRc` and `VITE_BASIC_V5_DIAG=true`.
- Add Android flavor `playerBasicDiag` with package `br.com.parksolutions.totempark.player.basicv5diag`.
- Connect only to Firebase Emulator project `demo-totem-basic-hom` through Android emulator host `10.0.2.2`.
- Emit bounded `[BASIC_V5_DIAG]` Logcat evidence for build/profile, native detection, APK metadata, validation details, binding predicates, heartbeat keys, and write outcome.
- Install side-by-side only on AVD `BASIC_V5_Medicao` and capture the responsible condition.

## Non-goals and anti-goals

- No definitive functional correction in this task.
- No relaxation or bypass of `canSyncBasicTelemetry`.
- No additional Firestore diagnostic writes or heartbeat interval changes.
- No Portal, V73, approved BASIC V5, existing measurement APK, production, deployment, or real-data changes.
- No tokens, credentials, binding codes, Firebase documents, or full payloads in logs.

## Approaches considered

1. **Isolated web and Android diagnostic flavor — selected.** A compile-time flag gates a small diagnostic module and call sites in the existing heartbeat path. This observes the exact JavaScript predicates and native plugin result while producing a separate package.
2. Native-only plugin logging. Safer at the Java boundary but cannot explain JavaScript metadata validity, binding comparisons, or payload construction.
3. Logging in the shared `playerRc` build. Broadest visibility but risks contaminating approved variants and was rejected.

## Design

`src/basic-v5-diagnostic.js` owns redaction-safe, deduplicated logging and pure diagnostic summaries. It exposes build/profile logging, native app-info validation, binding-condition evaluation, heartbeat-key summary, and error normalization. It never imports Firebase and cannot write network data.

`src/App.jsx` calls the module only when `VITE_BASIC_V5_DIAG === "true"`. Startup is logged once. Native app-info success/error is logged once. Each heartbeat logs the individual predicate state only when its fingerprint changes, logs whether the payload contains `telemetry`/`telemetryUpdatedAt`, and logs write success/error with sanitized code/message. The production predicate and single `updateDoc` call remain authoritative.

`.env.playerBasicDiag` pins the emulator host/project and existing BASIC behavior. `vite.config.js` rejects the mode unless all diagnostic invariants match. The Android flavor uses a new application ID suffix and a source-set manifest that removes boot takeover, allowing side-by-side manual launch without affecting the existing packages.

## Safety and evidence

Unit tests must first fail for the missing diagnostic contract, then cover absent/invalid metadata, each binding condition, deduplication, payload-key reporting, and error sanitization. Structural tests ensure the flavor/package/mode are isolated and no diagnostic Firestore write exists. Build artifacts are copied to a new destination filename only after confirming the target does not exist. SHA-256 and Logcat evidence are included in the final report.

