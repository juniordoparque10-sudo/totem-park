import test from "node:test";
import assert from "node:assert/strict";
import { resolveTelemetryActivityEvents, buildTelemetryActivityPeriods } from "./telemetry-activity-history.js";

const range={startMs:1000,endMs:4000};
const events=[
  {id:"a",screenId:"screen",state:"ACTIVE",atMs:1200},
  {id:"b",screenId:"screen",state:"OFFLINE",atMs:2400},
];
const screen=(schemaVersion,profile)=>({id:"screen",telemetry:{schemaVersion,profile,activity:{events}}});

test("BASIC nao herda eventos de atividade embutidos de versao anterior",()=>{
  assert.deepEqual(resolveTelemetryActivityEvents(screen(5,"BASIC"),[],range),[]);
});

test("BASIC preserva historico remoto persistido",()=>{
  const rows=resolveTelemetryActivityEvents(screen(5,"BASIC"),events,range);
  assert.equal(rows.length,2);
  assert.equal(buildTelemetryActivityPeriods(rows,range).length,1);
});

test("schema anterior preserva eventos historicos embutidos",()=>{
  assert.equal(resolveTelemetryActivityEvents(screen(4,"ADVANCED"),[],range).length,2);
});

test("evento remoto nunca mistura fallback local na mesma consulta",()=>{
  const rows=resolveTelemetryActivityEvents(screen(4,"ADVANCED"),[events[0]],range);
  assert.equal(rows.length,1);
});
