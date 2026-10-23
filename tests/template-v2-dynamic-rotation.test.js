import test from "node:test";
import assert from "node:assert/strict";
import { getDynamicRotationFrame, normalizeDynamicRotation } from "../src/templates-v2/dynamic-layout/rotation.js";
import { isControlledRotationElapsed } from "../src/templates-v2/dynamic-layout/useDynamicRotation.js";

test("normaliza a rotação dinâmica em limites seguros", () => {
  assert.deepEqual(normalizeDynamicRotation({ featuredSeconds: 1, secondarySeconds: 999, transition: "bad" }), {
    featuredSeconds: 3, secondarySeconds: 60, transition: "fade",
  });
});

test("alterna destaque e secundárias sem duplicar o destaque", () => {
  const frame = getDynamicRotationFrame({ itemIds: ["a", "b", "c", "d"], elapsedMs: 11_000, effectiveDurationMs: 30_000, featuredSeconds: 10, secondarySeconds: 5, secondarySlots: 2 });
  assert.equal(frame.featuredId, "b");
  assert.equal(frame.secondaryIds.includes("b"), false);
  assert.equal(frame.secondaryIds.length, 2);
});

test("expira exatamente na duração efetiva do item", () => {
  assert.equal(getDynamicRotationFrame({ itemIds: ["a"], elapsedMs: 14_999, effectiveDurationMs: 15_000 }).expired, false);
  assert.equal(getDynamicRotationFrame({ itemIds: ["a"], elapsedMs: 15_000, effectiveDurationMs: 15_000 }).expired, true);
});

test("null não congela o relógio interno da rotação", () => {
  assert.equal(isControlledRotationElapsed(null), false);
  assert.equal(isControlledRotationElapsed(undefined), false);
  assert.equal(isControlledRotationElapsed(0), true);
  assert.equal(isControlledRotationElapsed(5_000), true);
});
