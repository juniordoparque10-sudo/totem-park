import test from "node:test";
import assert from "node:assert/strict";
import { getCollectionCopyDensity } from "../src/templates-v2/dynamic-collections/copy-density.js";

test("texto curto preserva a tipografia e textos maiores recebem redução moderada", () => {
  assert.equal(getCollectionCopyDensity("Aviso breve"), "copy-normal");
  assert.equal(getCollectionCopyDensity("a".repeat(141)), "copy-medium");
  assert.equal(getCollectionCopyDensity("a".repeat(241)), "copy-long");
});

test("espaços externos não elevam artificialmente a densidade", () => {
  assert.equal(getCollectionCopyDensity(`  ${"a".repeat(140)}  `), "copy-normal");
});
