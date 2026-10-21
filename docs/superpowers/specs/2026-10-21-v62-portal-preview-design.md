# V62 Portal Preview Design

## Goal

Prepare the Homologation Portal so the V62 canary can publish the dynamic News Editorial template and both editor previews reproduce the same live renderer, without changing Android, Firebase, production, or any other template.

## Constraints

- Keep the V62 card geometry from commit `c07652c`; only refine text containment and Portal consistency.
- Preserve the complete ACTIVE binding, client, screen, device, package, capability, and canary checks from `fe863b4`.
- Reuse one loaded dynamic-data result and one playback clock while the expanded preview is open; the integrated preview becomes hidden/inactive instead of running a second session.
- Preview mode produces no heartbeat, binding, playlist publication, or telemetry.
- Compact, Normal, and Grande change only the lower ticker.
- Measure the individual-highlight remainder but do not change its duration logic.
- No deployment, Firebase change, Android change, or APK.

## Design

The publication gate keeps its existing identity checks and accepts version 62 in the same exact canary branch as versions 58–61. A regression test reproduces the real V62 screen/binding/capability payload and continues to reject invalid package, device, binding, client, and screen values.

The editor owns a single preview-playback controller and a single `useTemplateV2DynamicData` result. Only one renderer instance is mounted at a time: integrated when the modal is closed, expanded when open. The renderer receives preview playback state (`running`, `paused`, execution id, elapsed origin); restart changes the execution id, pause freezes elapsed time, resume continues from the same elapsed point, and unmount clears the boundary timer.

News Editorial uses the existing V62 renderer and geometry. CSS adds bounded inner text areas, line clamps, safe padding, and overflow rules for featured and secondary cards. The initial composition stays stable while data is loading and switches atomically to the loaded frame. Existing ticker sizing remains isolated from upper-card dimensions.

## Verification

Automated tests cover the publication gate, rotation pause/resume/restart/cleanup, one active preview renderer, shared dynamic-data loading, orientation, ticker sizes, and unchanged upper-card geometry. Local browser validation uses real RSS data, observes multiple rotations and ticker movement, captures integrated/expanded landscape and portrait states, and verifies no timers or requests remain after closing the modal.
