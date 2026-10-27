import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("Fade Suave overlaps the retained frame without a black transition layer", () => {
  assert.match(css, /\.player-transition-layer\s*\{[^}]*background:\s*transparent\s*!important;/s);
  assert.doesNotMatch(css, /\.player-transition-layer\s*\{[^}]*background:\s*#000(?:000)?\s*!important;/s);
  assert.match(css, /\.player-video-transition-frame\s*\{[^}]*z-index:\s*1/s);
  assert.match(app, /captureVideoTransitionFrame\(oldVideo,\s*videoTransitionFrameRef\.current\)/);
  assert.match(app, /shouldPrimeVideoTransitionFrame\(video,\s*videoTransitionFrameExecutionRef\.current === executionId\)/);
  assert.match(app, /<canvas[^>]*className="player-video-transition-frame"/s);
});
