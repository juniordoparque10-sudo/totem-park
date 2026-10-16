import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  getTimestampMs,
  isFreshExitCommand,
  shouldClearTvConnectionAfterRelease,
} from "../src/android-link-lifecycle.js";
import {
  PLAYER_BINDING_CLAIM_FAILURES,
  classifyPlayerBindingClaimFailure,
  shouldRevokeSecureBindingOnRelease,
} from "../src/player-identity.js";
import {
  attemptInitialSecureBinding,
  shouldClaimInitialPlayerBinding,
} from "../src/player-initial-binding.js";

test("exitTv accepts valid ISO time but rejects old, missing and invalid commands", () => {
  const sessionStartedAtMs = Date.parse("2026-10-13T14:44:37.000Z");
  assert.equal(getTimestampMs("2026-10-13T14:44:39.000Z"), Date.parse("2026-10-13T14:44:39.000Z"));
  assert.equal(isFreshExitCommand({
    remoteCommand: { type: "exitTv", sentAt: "2026-10-13T14:44:39.000Z" },
    commandStatus: "sent",
    sessionStartedAtMs,
  }), true);
  for (const sentAt of [undefined, "invalid", "2026-10-13T14:04:40.875Z"]) {
    assert.equal(isFreshExitCommand({
      remoteCommand: { type: "exitTv", sentAt },
      commandStatus: "sent",
      sessionStartedAtMs,
    }), false);
  }
});

test("local link clears only after a confirmed remote release", () => {
  assert.equal(shouldClearTvConnectionAfterRelease(true), true);
  assert.equal(shouldClearTvConnectionAfterRelease(false), false);
  assert.equal(shouldClearTvConnectionAfterRelease(undefined), false);
  assert.equal(shouldClearTvConnectionAfterRelease({ code: "failed-precondition" }), false);
});

test("secure claim distinguishes occupied, invalid, permission and connection failures", () => {
  assert.equal(classifyPlayerBindingClaimFailure({ code: "functions/already-exists" }), PLAYER_BINDING_CLAIM_FAILURES.SCREEN_ALREADY_CONNECTED);
  assert.equal(classifyPlayerBindingClaimFailure({ code: "functions/not-found" }), PLAYER_BINDING_CLAIM_FAILURES.INVALID_CODE);
  assert.equal(classifyPlayerBindingClaimFailure({ code: "functions/permission-denied" }), PLAYER_BINDING_CLAIM_FAILURES.PERMISSION);
  assert.equal(classifyPlayerBindingClaimFailure({ code: "functions/unavailable" }), PLAYER_BINDING_CLAIM_FAILURES.CONNECTION);
});

test("secure experiment revokes only an ACTIVE binding through the authorized release flow", () => {
  assert.equal(shouldRevokeSecureBindingOnRelease({ isSecureLinkExperiment: true, bindingStatus: "ACTIVE" }), true);
  assert.equal(shouldRevokeSecureBindingOnRelease({ isSecureLinkExperiment: true, bindingStatus: "REVOKED" }), false);
  assert.equal(shouldRevokeSecureBindingOnRelease({ isSecureLinkExperiment: false, bindingStatus: "ACTIVE" }), false);
});

test("initial secure claim preserves temporary offline recovery but never bypasses a conflict", async () => {
  assert.equal(shouldClaimInitialPlayerBinding("playerRc"), true);
  assert.equal(await attemptInitialSecureBinding({
    appBuildMode: "playerRc",
    claimBinding: async () => {
      const error = new Error("offline");
      error.code = "functions/unavailable";
      throw error;
    },
  }), null);
  await assert.rejects(attemptInitialSecureBinding({
    appBuildMode: "playerRc",
    claimBinding: async () => {
      const error = new Error("occupied");
      error.code = "functions/already-exists";
      throw error;
    },
  }), /occupied/);
});

test("Player listener clears local link only after releaseCurrentScreen confirms success", () => {
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /const released = await releaseCurrentScreen\(\);[\s\S]*?shouldClearTvConnectionAfterRelease\(released\)/);
  assert.match(source, /isCurrentSessionExitCommand\(remoteCommand, data\.commandStatus\)/);
  assert.doesNotMatch(source, /isFreshExitCommand\(screenData\.remoteCommand, screenData\.commandStatus\)/);
  assert.doesNotMatch(source, /await releaseCurrentScreen\(\);\s*clearTvConnectionAndShowCode\("remote-exit-command"\)/);
});

test("occupied Secure Link screen keeps the approved logo and responsive identity", () => {
  const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
  assert.match(appSource, /className="tv-screen-in-use-logo"[\s\S]*?<img src=\{logo\} alt="Totem Park"/);
  assert.match(appSource, /<h1>Tela já conectada<\/h1>/);
  assert.match(cssSource, /\.tv-screen-in-use-logo img\s*\{[\s\S]*?width:\s*100%/);
  assert.match(cssSource, /@media \(orientation:\s*portrait\)[\s\S]*?\.tv-screen-in-use-details/);
});
