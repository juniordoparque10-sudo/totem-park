import test from "node:test";
import assert from "node:assert/strict";
import { canRevealSportsV2, isSportsV2FinalState, withSportsV2ReadinessTimeout } from "../src/templates-v2/sports-v2/readiness.js";

test("Sports loading mantém a execução pendente", () => {
  assert.equal(isSportsV2FinalState(null), false);
  assert.equal(canRevealSportsV2({ dynamicData:null, backgroundConfigured:false, backgroundReady:false }), false);
});

test("Sports fica ready somente após dados e background quando configurado", () => {
  const data = { sports:{ football:{ cache:{ isStale:false }, data:{} } } };
  assert.equal(canRevealSportsV2({ dynamicData:data, backgroundConfigured:true, backgroundReady:false }), false);
  assert.equal(canRevealSportsV2({ dynamicData:data, backgroundConfigured:true, backgroundReady:true }), true);
});

test("snapshot stale é estado final renderizável", () => {
  const stale = { sports:{ football:{ cache:{ isStale:true }, data:{} } } };
  assert.equal(canRevealSportsV2({ dynamicData:stale, backgroundConfigured:false, backgroundReady:false }), true);
});

test("indisponibilidade final sem stale fica ready sem loader intermediário", () => {
  assert.equal(canRevealSportsV2({ dynamicData:{ sports:{}, sportsErrors:["football"] }, backgroundConfigured:false, backgroundReady:false }), true);
});

test("timeout encerra readiness pendente", async () => {
  await assert.rejects(withSportsV2ReadinessTimeout(new Promise(() => {}), 5), (error) => error.code === "sports-v2/readiness-timeout");
});
