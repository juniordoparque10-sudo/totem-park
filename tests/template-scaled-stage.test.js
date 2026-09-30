import test from "node:test";
import assert from "node:assert/strict";
import { getTemplateStageGeometry } from "../src/template-stage-geometry.js";

test("landscape stage fits the complete 1920x1080 composition", () => {
  assert.deepEqual(
    getTemplateStageGeometry({ frameWidth: 420, frameHeight: 236.25, logicalWidth: 1920, logicalHeight: 1080 }),
    { scale: 0.21875, width: 420, height: 236.25 },
  );
});

test("portrait stage fits the complete 1080x1920 composition", () => {
  assert.deepEqual(
    getTemplateStageGeometry({ frameWidth: 180, frameHeight: 320, logicalWidth: 1080, logicalHeight: 1920 }),
    { scale: 1 / 6, width: 180, height: 320 },
  );
});

test("stage uses the limiting dimension without cropping", () => {
  const geometry = getTemplateStageGeometry({ frameWidth: 420, frameHeight: 300, logicalWidth: 1920, logicalHeight: 1080 });
  assert.equal(geometry.width, 420);
  assert.equal(geometry.height, 236.25);
});
