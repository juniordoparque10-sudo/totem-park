import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildBasicPlaybackState,
  getPlayerTelemetryProfile,
  shouldCollectAdvancedTelemetry,
} from "../src/player-basic-heartbeat.js";

test("playerRc seleciona BASIC e congela coleta avançada sem afetar flavor histórico", () => {
  assert.equal(getPlayerTelemetryProfile("playerRc"), "BASIC");
  assert.equal(shouldCollectAdvancedTelemetry("playerRc"), false);
  assert.equal(getPlayerTelemetryProfile("playerTelemetry"), "ADVANCED");
  assert.equal(shouldCollectAdvancedTelemetry("playerTelemetry"), true);
});

test("estado básico identifica playlist ou template ativo sem métricas de cache", () => {
  assert.deepEqual(buildBasicPlaybackState({
    operational:{ playerState:"playing", currentItemId:"media-1" },
    activePlaylist:{ id:"playlist-1", name:"Principal" },
    activeMode:"scheduled",
  }), {
    state:"PLAYING",
    activeType:"PLAYLIST",
    activeId:"playlist-1",
    activeName:"Principal",
    itemId:"media-1",
  });

  assert.deepEqual(buildBasicPlaybackState({
    operational:{ playerState:"loading", currentItemId:"template-item" },
    activeTemplate:{ id:"template-1", name:"Hora Certa" },
  }), {
    state:"LOADING",
    activeType:"TEMPLATE",
    activeId:"template-1",
    activeName:"Hora Certa",
    itemId:"template-item",
  });
});

test("Player RC publica envelope BASIC inteiro e não consulta TrafficStats", () => {
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /IS_BASIC_TELEMETRY_BUILD/);
  assert.match(source, /Object\.assign\(heartbeatPayload, buildBasicTelemetryUpdate\(basicTelemetrySnapshot\)\)/);
  assert.match(source, /if \(isNativeApp\(\) && SHOULD_COLLECT_ADVANCED_TELEMETRY\)/);
  assert.match(source, /onSnapshot\(screenDocRef, async \(snapshot\)/);
  assert.match(source, /startScheduleRuntime\(/);
});

test("publicação BASIC não inclui tráfego atividade cache ou histórico", () => {
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /if \(IS_BASIC_TELEMETRY_BUILD\) \{/);
  assert.match(source, /basicTelemetryRef\.current\.heartbeat\(\)/);
  assert.match(source, /if \(PLAYER_ACTIVITY_SYNC_ENABLED && SHOULD_COLLECT_ADVANCED_TELEMETRY/);
  assert.match(source, /hasPending:historyHasPendingRecords,\s*\}\) && SHOULD_COLLECT_ADVANCED_TELEMETRY\)/);
});
