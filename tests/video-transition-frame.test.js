import assert from "node:assert/strict";
import test from "node:test";

import { captureVideoTransitionFrame } from "../src/video-transition-frame.js";

test("captures the visible video frame into the retained transition canvas", () => {
  const operations = [];
  const context = {
    clearRect(...args) { operations.push(["clearRect", ...args]); },
    drawImage(...args) { operations.push(["drawImage", ...args]); },
  };
  const canvas = {
    width: 0,
    height: 0,
    clientWidth: 1920,
    clientHeight: 1080,
    getContext(type) {
      assert.equal(type, "2d");
      return context;
    },
  };
  const video = { videoWidth: 1280, videoHeight: 720, readyState: 4 };

  assert.equal(captureVideoTransitionFrame(video, canvas), true);
  assert.equal(canvas.width, 1920);
  assert.equal(canvas.height, 1080);
  assert.deepEqual(operations, [
    ["clearRect", 0, 0, 1920, 1080],
    ["drawImage", video, 0, 0, 1280, 720, 0, 0, 1920, 1080],
  ]);
});

test("does not expose a blank frame when the decoder has no drawable image", () => {
  const canvas = { clientWidth: 1920, clientHeight: 1080, getContext() { throw new Error("must not draw"); } };
  assert.equal(captureVideoTransitionFrame({ videoWidth: 0, videoHeight: 0, readyState: 0 }, canvas), false);
  assert.equal(captureVideoTransitionFrame(null, canvas), false);
});
