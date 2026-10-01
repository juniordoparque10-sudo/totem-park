const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  REBIND_AUTHORIZATION_TTL_MS,
  evaluateRebindAuthorization,
  canRebindKnownDevice,
} = require("../functions/player-rebind");

const active = (overrides = {}) => ({
  status: "ACTIVE",
  clientId: "client-a",
  screenId: "screen-a",
  expiresAtMs: Date.now() + REBIND_AUTHORIZATION_TTL_MS,
  consumedAt: null,
  consumedBy: null,
  ...overrides,
});

test("valid authorization is screen-bound, expiring and single-use", () => {
  const nowMs = Date.now();
  assert.equal(evaluateRebindAuthorization({ authorization: active(), clientId: "client-a", screenId: "screen-a", nowMs }).allowed, true);
  assert.equal(evaluateRebindAuthorization({ authorization: active(), clientId: "client-a", screenId: "screen-b", nowMs }).reason, "wrong-screen");
  assert.equal(evaluateRebindAuthorization({ authorization: active({ expiresAtMs: nowMs - 1 }), clientId: "client-a", screenId: "screen-a", nowMs }).reason, "expired");
  assert.equal(evaluateRebindAuthorization({ authorization: active({ status: "CONSUMED", consumedBy: "new-uid" }), clientId: "client-a", screenId: "screen-a", nowMs }).allowed, false);
});

test("device id is only an additional consistency check", () => {
  assert.equal(canRebindKnownDevice({ connectedDeviceId: "device-a", requestedDeviceId: "device-a" }), true);
  assert.equal(canRebindKnownDevice({ connectedDeviceId: "device-a", requestedDeviceId: "device-b" }), false);
  assert.equal(canRebindKnownDevice({ connectedDeviceId: "", requestedDeviceId: "device-b" }), true);
});

test("backend keeps the conflict gate and consumes authorization transactionally", () => {
  const source = fs.readFileSync(path.join(__dirname, "../functions/index.js"), "utf8");
  assert.match(source, /if \(!\(await isMaster\(request\)\)\)/);
  assert.match(source, /throw new HttpsError\("already-exists", "Screen is bound to another authenticated player\."\)/);
  assert.match(source, /status: "CONSUMED"/);
  assert.match(source, /revokeReason: "ADMIN_REBIND"/);
});

test("official RC UI has no legacy diagnostic button or route and keeps operational telemetry", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/App.jsx"), "utf8");
  assert.doesNotMatch(source, /navigate\("\/diagnostico-rc"\)/);
  assert.doesNotMatch(source, /path="\/diagnostico-rc"/);
  assert.doesNotMatch(source, /RC · Diagnóstico/);
  assert.match(source, /IS_OPERATIONAL_TELEMETRY_BUILD/);
  assert.match(source, /OPERATIONAL_HEARTBEAT_INTERVAL_MS/);
});
