# V62 Portal Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable safe V62 canary publication and make the integrated and expanded News Editorial previews share one complete dynamic playback session.

**Architecture:** Preserve the existing renderer and capability gate. Add a preview-only playback controller above the two mutually exclusive preview surfaces, reuse the existing dynamic-data result, and refine only News Editorial text containment CSS.

**Tech Stack:** React, Firebase/Firestore client, Node test runner, Vite, CSS.

**Spec:** `docs/superpowers/specs/2026-10-21-v62-portal-preview-design.md`

## Global Constraints

- No Android, Firebase, production, deployment, or APK changes.
- Do not change other templates or the V62 card geometry.
- Keep every existing canary identity and capability check.
- Do not change individual-highlight duration logic.

## Review Focus

- Modal open/close must never run two playback timers or duplicate RSS requests.
- Pausing must freeze the current frame; resuming must not restart it.
- Draft source/interval/orientation/ticker changes must reach whichever preview is active.
- Long titles and summaries must remain inside all card variants.
- V62 authorization must remain restricted to the exact existing canary identity.

---

### Task 1: V62 publication contract

**Files:**
- Modify: `tests/template-v2-dynamic-capability.test.js`
- Verify: `src/templates-v2/playlist-capability.js`

**Interfaces:**
- Consumes: screen plus attached `playerBinding`.
- Produces: unchanged `supportsDynamicTemplatesV2(player): boolean` contract accepting V62 only in the canary branch.

- [ ] Add the real V62 success fixture and invalid binding/package/device/client/screen cases.
- [ ] Run the focused test against `fe863b4` behavior to prove the V62 case fails.
- [ ] Restore the V62 implementation and run the focused test green.
- [ ] Commit the publication regression test.

### Task 2: Shared preview playback controller

**Files:**
- Create: `src/templates-v2/editor/useTemplateV2PreviewPlayback.js`
- Modify: `src/templates-v2/dynamic-layout/useDynamicRotation.js`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Modify: `src/templates-v2/editor/TemplateV2PreviewPanel.jsx`
- Modify: `src/templates-v2/editor/TemplateV2ScaledStage.jsx`
- Test: focused preview playback tests under `tests/`.

**Interfaces:**
- Produces: preview session state with `executionId`, `elapsedMs`, `paused`, `pause()`, `resume()`, and `restart()`.
- Consumes: the same session and `dynamicData` in one active renderer surface.

- [ ] Write failing behavior tests for one active renderer, shared data, pause/resume/restart, and timer cleanup.
- [ ] Run tests and confirm expected failures.
- [ ] Implement the minimal controller and mutually exclusive preview mounting.
- [ ] Run focused tests green and commit.

### Task 3: News Editorial data readiness and text containment

**Files:**
- Modify: `src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicRenderer.jsx`
- Modify: `src/templates-v2/news-editorial-dynamic/news-editorial-dynamic.css`
- Modify: focused News Editorial tests under `tests/`.

**Interfaces:**
- Consumes: shared dynamic data and preview session.
- Produces: stable loading frame, V62 geometry with bounded text, unchanged ticker-only sizing.

- [ ] Write failing tests for stable readiness, long text, three ticker sizes, landscape/portrait, and highlight timing measurement.
- [ ] Run tests and confirm expected failures.
- [ ] Implement atomic data presentation and scoped text CSS without altering rotation duration.
- [ ] Run focused tests green and commit.

### Task 4: Local integration evidence

**Files:**
- Modify only test/evidence artifacts required by the existing harness.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: build, test report, screenshots, and clean worktree state for review.

- [ ] Run focused and full regression suites plus production build.
- [ ] Start the local Portal and validate real RSS rotation, ticker motion, interval/source changes, orientations, sizes, pause/resume/restart, and cleanup.
- [ ] Capture before/after and integrated/expanded evidence.
- [ ] Perform final branch review and commit any evidence/tests.
