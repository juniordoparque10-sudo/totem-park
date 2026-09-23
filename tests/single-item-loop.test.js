import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextPlaylistIndex,
  isSingleImagePlaylist,
  isSingleVideoPlaylist,
  restartSingleVideo,
} from "../src/single-item-loop.js";

test("playlist com um vídeo reinicia continuamente", () => {
  let plays = 0;
  const video = { currentTime: 41, src: "file:///cache/video-a.mp4", play: () => { plays += 1; return Promise.resolve(); } };
  const items = [{ type: "Vídeo", src: video.src }];
  assert.equal(isSingleVideoPlaylist(items), true);
  for (let cycle = 0; cycle < 3; cycle += 1) {
    video.currentTime = 41;
    assert.equal(restartSingleVideo(video), true);
    assert.equal(video.currentTime, 0);
  }
  assert.equal(plays, 3);
});

test("vídeo local repete três vezes sem trocar src, transferir ou usar fallback remoto", () => {
  let fileTransfers = 0;
  let remoteFallbacks = 0;
  const localSrc = "file:///cache/video-a.mp4";
  const video = { currentTime: 0, src: localSrc, play: () => Promise.resolve() };
  for (let cycle = 0; cycle < 3; cycle += 1) restartSingleVideo(video);
  assert.equal(video.src, localSrc);
  assert.equal(fileTransfers, 0);
  assert.equal(remoteFallbacks, 0);
});

test("playlist com dois vídeos mantém A, B, A, B", () => {
  const sequence = [];
  let index = 0;
  for (let step = 0; step < 4; step += 1) {
    sequence.push(index === 0 ? "A" : "B");
    index = getNextPlaylistIndex(index, 2);
  }
  assert.deepEqual(sequence, ["A", "B", "A", "B"]);
});

test("playlist com uma imagem continua elegível para novo ciclo", () => {
  assert.equal(isSingleImagePlaylist([{ type: "Imagem" }]), true);
  assert.equal(isSingleImagePlaylist([{ type: "Vídeo" }]), false);
  assert.equal(isSingleImagePlaylist([{ playerItemType: "template" }]), false);
});
