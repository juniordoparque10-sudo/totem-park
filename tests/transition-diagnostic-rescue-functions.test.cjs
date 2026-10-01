const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRescueRequest } = require("../functions/transition-diagnostic-rescue");

const validData = {
  deviceId: "device-1",
  sourceAppVersion: "1.0.0-v20-transition-diagnostic",
  diagnosticSessionId: "session-1",
  sequence: 4,
  events: [{ timestamp: "2026-09-30T12:00:00.000Z", eventName: "PLAYER_T7", appVersion: "1.0.0-v20-transition-diagnostic" }],
};
const screen = { templatesV2TestMode: true, connectedDeviceId: "device-1" };

test("aceita resgate autenticado da tela canário e dispositivo registrado", () => {
  const result = validateRescueRequest({ authUid: "anonymous-uid", data: validData, screen });
  assert.equal(result.value.diagnosticSessionId, "session-1");
});

test("aceita sessão nova V21 pelo mesmo canal diagnóstico", () => {
  const data = {
    ...validData,
    sourceAppVersion: "1.0.0-v21-transition-diagnostic-rescue",
    events: [{ ...validData.events[0], appVersion: "1.0.0-v21-transition-diagnostic-rescue" }],
  };
  assert.equal(validateRescueRequest({ authUid:"uid", data, screen }).value.events.length, 1);
});


test("rejeita sem autenticação", () => assert.equal(validateRescueRequest({ data: validData, screen }).error[0], "unauthenticated"));
test("rejeita tela sem modo canário", () => assert.equal(validateRescueRequest({ authUid: "uid", data: validData, screen: { ...screen, templatesV2TestMode:false } }).error[0], "permission-denied"));
test("rejeita deviceId divergente", () => assert.equal(validateRescueRequest({ authUid: "uid", data: { ...validData, deviceId:"other" }, screen }).error[0], "permission-denied"));
test("rejeita payload ausente ou versão incompatível", () => {
  assert.equal(validateRescueRequest({ authUid: "uid", data: { ...validData, events:[] }, screen }).error[0], "invalid-argument");
  assert.equal(validateRescueRequest({ authUid: "uid", data: { ...validData, sourceAppVersion:"v19" }, screen }).error[0], "invalid-argument");
});
