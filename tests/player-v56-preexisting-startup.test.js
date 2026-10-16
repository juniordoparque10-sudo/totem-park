import assert from "node:assert/strict";
import test from "node:test";

import { buildPlayerVisibleLayers } from "../src/player-visible-layers.js";

test("preexisting linked playlist may reconcile to zero playable items without creating an undefined layer", () => {
  const persistedPlaylist = { id:"playlist-v55", items:[{ id:"cached-template", playerItemType:"template" }] };
  const layers = buildPlayerVisibleLayers({
    playerItems:[],
    mediaIndex:0,
    currentPlaybackExecutionId:1,
    currentMediaReady:false,
    decoderReleasePending:false,
  });
  assert.deepEqual(layers, []);
  assert.equal(persistedPlaylist.items.length, 1);
});

test("the same startup renders the preserved item as soon as reconciliation completes", () => {
  const cachedVideo = { id:"video-v55", playerItemType:"media", type:"Vídeo", localPath:"file:///cached/video.mp4" };
  const layers = buildPlayerVisibleLayers({
    playerItems:[cachedVideo],
    mediaIndex:0,
    currentPlaybackExecutionId:2,
    currentMediaReady:false,
    decoderReleasePending:false,
  });
  assert.equal(layers.length, 1);
  assert.equal(layers[0].item, cachedVideo);
  assert.equal(layers[0].state, "is-current is-pending");
});
