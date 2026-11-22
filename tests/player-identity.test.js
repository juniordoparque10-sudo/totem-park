import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyPlayerBindingClaimFailure,
  classifyPlayerIdentityFailure,
  getPlayerBindingClaimMessage,
  PLAYER_BINDING_CLAIM_FAILURES,
  PLAYER_IDENTITY_STATES,
  ensurePlayerAuth,
  resolveExistingOrClaimPlayerBinding,
} from "../src/player-identity.js";

test("auth restoration finishes before an anonymous identity can be created", async () => {
  const events = [];
  const restored = { uid:"persisted-player" };
  const auth = {
    currentUser:null,
    async authStateReady() {
      events.push("ready");
      this.currentUser = restored;
    },
  };

  const result = await ensurePlayerAuth(auth, {
    signIn:async () => {
      events.push("sign-in");
      return { user:{ uid:"replacement-player" } };
    },
  });

  assert.equal(result, restored);
  assert.deepEqual(events, ["ready"]);
});

test("active matching binding is validated without another claim", async () => {
  let claims = 0;
  const binding = await resolveExistingOrClaimPlayerBinding({
    clientId:"client-a",
    screenId:"screen-a",
    deviceId:"device-a",
    validateBinding:async () => ({ status:"ACTIVE", clientId:"client-a", screenId:"screen-a", deviceId:"device-a" }),
    claimBinding:async () => { claims += 1; return {}; },
  });

  assert.equal(binding.source, "VALIDATED");
  assert.equal(claims, 0);
});

test("different active binding remains a conflict and is never reclaimed", async () => {
  let claims = 0;
  await assert.rejects(() => resolveExistingOrClaimPlayerBinding({
    clientId:"client-a",
    screenId:"screen-a",
    deviceId:"device-new",
    validateBinding:async () => ({ status:"ACTIVE", clientId:"client-a", screenId:"screen-a", deviceId:"device-old" }),
    claimBinding:async () => { claims += 1; return {}; },
  }), (error) => error?.code === "player/binding-conflict");
  assert.equal(claims, 0);
});

test("missing authenticated binding performs one normal claim", async () => {
  let claims = 0;
  const binding = await resolveExistingOrClaimPlayerBinding({
    clientId:"client-a",
    screenId:"screen-a",
    deviceId:"device-a",
    validateBinding:async () => { throw { code:"functions/permission-denied" }; },
    claimBinding:async () => { claims += 1; return { status:"ACTIVE", clientId:"client-a", screenId:"screen-a", deviceId:"device-a" }; },
  });
  assert.equal(binding.source, "CLAIMED");
  assert.equal(claims, 1);
});

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
