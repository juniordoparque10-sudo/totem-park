import test from "node:test";
import assert from "node:assert/strict";
import {
  createBasicV5Diagnostic,
  getBasicAppInfoValidation,
  getBasicBindingConditions,
  getHeartbeatKeySummary,
  sanitizeDiagnosticError,
} from "../src/basic-v5-diagnostic.js";

test("validação diagnóstica nomeia cada metadado ausente ou inválido", () => {
  const result = getBasicAppInfoValidation({
    installation:{ packageName:"", versionCode:0, versionName:"v1", buildId:"", buildTimestamp:"invalid" },
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.invalidFields, ["packageName", "versionCode", "buildId", "buildTimestamp"]);
  assert.deepEqual(result.fields, {
    packageName:false,
    versionCode:false,
    versionName:true,
    buildId:false,
    buildTimestamp:false,
  });
});

test("condições do vínculo expõem apenas booleanos e preservam o gate real", () => {
  const snapshot = {
    installation:{ packageName:"pkg", versionCode:1, versionName:"v1", buildId:"build", buildTimestamp:"2026-11-21T12:00:00.000Z" },
  };
  const result = getBasicBindingConditions({
    snapshot,
    binding:{ status:"ACTIVE", clientId:"client-a", screenId:"screen-b", deviceId:"device-a" },
    clientId:"client-a",
    screenId:"screen-a",
    deviceId:"device-a",
  });

  assert.deepEqual(result, {
    appInfoValid:true,
    bindingActive:true,
    clientMatches:true,
    screenMatches:false,
    deviceMatches:true,
    canSyncBasicTelemetry:false,
  });
  assert.equal(JSON.stringify(result).includes("client-a"), false);
});

test("resumo do heartbeat informa somente presença das chaves", () => {
  assert.deepEqual(getHeartbeatKeySummary({ telemetry:{ schemaVersion:5 }, telemetryUpdatedAt:{} }), {
    hasTelemetry:true,
    hasTelemetryUpdatedAt:true,
  });
  assert.deepEqual(getHeartbeatKeySummary({ status:"online" }), {
    hasTelemetry:false,
    hasTelemetryUpdatedAt:false,
  });
});

test("logger deduplica eventos recorrentes e permanece inerte quando desabilitado", () => {
  const records = [];
  const disabled = createBasicV5Diagnostic({ enabled:false, log:(...args) => records.push(args) });
  disabled.once("startup", { profile:"BASIC" });
  assert.equal(records.length, 0);

  const diagnostic = createBasicV5Diagnostic({ enabled:true, log:(...args) => records.push(args) });
  diagnostic.once("startup", { profile:"BASIC" });
  diagnostic.once("startup", { profile:"BASIC" });
  diagnostic.changed("binding", { bindingActive:false });
  diagnostic.changed("binding", { bindingActive:false });
  diagnostic.changed("binding", { bindingActive:true });

  assert.equal(records.length, 3);
  assert.equal(records.every(([message]) => message.startsWith("[BASIC_V5_DIAG]")), true);
  assert.match(records[0][0], /"profile":"BASIC"/);
});

test("erro de heartbeat remove URLs e segredos antes do Logcat", () => {
  const error = sanitizeDiagnosticError({
    code:"permission-denied",
    message:"write failed https://example.test/path?token=secret apiKey=abc123 bindingCode=999999",
  });

  assert.equal(error.code, "permission-denied");
  assert.equal(error.message.includes("example.test"), false);
  assert.equal(error.message.includes("secret"), false);
  assert.equal(error.message.includes("abc123"), false);
  assert.equal(error.message.includes("999999"), false);
});
