import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyPlayerBindingClaimFailure,
  classifyPlayerIdentityFailure,
  getPlayerBindingClaimMessage,
  PLAYER_BINDING_CLAIM_FAILURES,
  PLAYER_IDENTITY_STATES,
} from "../src/player-identity.js";

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

test("binding claim failures keep conflict, invalid code, permission and availability distinct", () => {
  const cases = [
    [{ code: "functions/already-exists" }, PLAYER_BINDING_CLAIM_FAILURES.SCREEN_ALREADY_CONNECTED, /vínculo ativo/],
    [{ code: "functions/not-found" }, PLAYER_BINDING_CLAIM_FAILURES.INVALID_CODE, /Código inválido/],
    [{ code: "functions/permission-denied" }, PLAYER_BINDING_CLAIM_FAILURES.PERMISSION, /não tem permissão/],
    [{ code: "functions/unavailable" }, PLAYER_BINDING_CLAIM_FAILURES.CONNECTION, /temporariamente indisponível/],
  ];

  for (const [error, expectedFailure, expectedMessage] of cases) {
    const failure = classifyPlayerBindingClaimFailure(error);
    assert.equal(failure, expectedFailure);
    assert.match(getPlayerBindingClaimMessage(failure), expectedMessage);
  }
});
