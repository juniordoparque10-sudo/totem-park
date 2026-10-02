import test from "node:test";
import assert from "node:assert/strict";
import { deriveMediaCacheState, finalizeCompletedMediaCache } from "../src/player-cache-state.js";

test("cache 2/2 sem download ativo finaliza como pronto", () => {
  const state = deriveMediaCacheState({ completed:2, total:2, downloadActive:false, downloadStarted:true });
  assert.equal(state.cacheStatus, "pronto");
  assert.equal(state.showDownloading, false);
  assert.equal(state.showReady, true);
});

test("download real em andamento mantém preparing e aviso", () => {
  const state = deriveMediaCacheState({ completed:1, total:2, downloadActive:true, downloadStarted:true });
  assert.equal(state.cacheStatus, "preparando");
  assert.equal(state.showDownloading, true);
  assert.equal(state.showReady, false);
});

test("último arquivo concluído remove aviso e libera check", () => {
  const state = deriveMediaCacheState({ completed:2, total:2, downloadActive:false, downloadStarted:true });
  assert.deepEqual([state.cacheStatus,state.showDownloading,state.showReady],["pronto",false,true]);
});

test("readiness de template, Sports e background não cria trabalho falso", () => {
  const state = deriveMediaCacheState({ completed:2, total:2, downloadActive:false, downloadStarted:false, sportsPending:true, backgroundRetry:true });
  assert.equal(state.cacheStatus, "pronto");
  assert.equal(state.showDownloading, false);
  assert.equal(state.showReady, true);
});

test("cache pronto não volta para preparing em novo ciclo sem download", () => {
  assert.equal(finalizeCompletedMediaCache({ cacheStatus:"preparando", cachedItems:2, totalCacheableItems:2, failedCacheItems:0 }).cacheStatus, "pronto");
});

test("falha tratada finaliza como parcial sem aviso ou check", () => {
  const state = deriveMediaCacheState({ completed:2, total:2, failed:1, downloadActive:false, downloadStarted:true });
  assert.equal(state.cacheStatus, "parcial");
  assert.equal(state.showDownloading, false);
  assert.equal(state.showReady, false);
});
