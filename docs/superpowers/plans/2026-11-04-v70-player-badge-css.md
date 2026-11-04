# V70 Player Badge CSS Standardization Plan

**Goal:** Standardize the cache and remote-pause badges against the approved schedule badge without changing runtime behavior.

**Architecture:** Keep the schedule badge declarations unchanged. Add CSS-only shared dimensions to the two operational badges, preserve their semantic colors, place both at the lower-right edge, and use the existing DOM order to stack remote pause above cache when both are present.

**Scope:** `src/App.css` only in production code. No JSX, state, timer, playback, cache, scheduling, telemetry, Portal, Android, install, or publish changes.

## Verification

1. Add a source-contract test covering the 42 px height, lower-right placement, and collision rule; run it red.
2. Apply the minimal CSS change and run the contract test green.
3. Run the relevant existing tests, lint, and the Player RC production build.
4. Render real CSS previews at 1920x1080 and 1080x1920, plus enlarged comparison crops.
5. Review the complete diff against `ea5933b`, then create one isolated commit.
