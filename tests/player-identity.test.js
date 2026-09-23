import test from "node:test";
import assert from "node:assert/strict";
import { classifyPlayerIdentityFailure, PLAYER_IDENTITY_STATES } from "../src/player-identity.js";

test("offline identity failure remains temporary and does not imply revocation", () => {
  assert.equal(
    classifyPlayerIdentityFailure({ code: "functions/unavailable" }, false),
    PLAYER_IDENTITY_STATES.TEMPORARILY_UNVERIFIED
  );
});

test("server permission denial is an explicit revocation signal", () => {
  assert.equal(
    classifyPlayerIdentityFailure({ code: "functions/permission-denied" }, true),
    PLAYER_IDENTITY_STATES.REVOKED
  );
});
