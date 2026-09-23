import test from "node:test";
import assert from "node:assert/strict";
import { isVideoToVideoTransition, releaseVideoElement } from "../src/decoder-lifecycle.js";

test("isolates the experiment to transitions between distinct video items", () => {
  const video = { type: "Vídeo" };
  const image = { type: "Imagem" };
  assert.equal(isVideoToVideoTransition([video], 0), false);
  assert.equal(isVideoToVideoTransition([video, video], 0), true);
  assert.equal(isVideoToVideoTransition([video, video], 1), true);
  assert.equal(isVideoToVideoTransition([image, video], 0), false);
  assert.equal(isVideoToVideoTransition([video, image], 0), false);
});

test("releases the prior video source before the next video can mount", () => {
  const operations = [];
  const attributes = new Set(["src"]);
  const video = {
    pause() { operations.push("pause"); },
    removeAttribute(name) { operations.push(`remove:${name}`); attributes.delete(name); },
    load() { operations.push("load"); },
    hasAttribute(name) { return attributes.has(name); },
  };

  assert.deepEqual(releaseVideoElement(video), {
    found: true,
    paused: true,
    sourceCleared: true,
    loadCalled: true,
  });
  assert.deepEqual(operations, ["pause", "remove:src", "load"]);
});

test("does not access a missing video element", () => {
  assert.deepEqual(releaseVideoElement(null), {
    found: false,
    paused: false,
    sourceCleared: false,
    loadCalled: false,
  });
});
