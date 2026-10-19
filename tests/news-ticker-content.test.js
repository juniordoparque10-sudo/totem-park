import test from "node:test";
import assert from "node:assert/strict";
import { buildTickerContentModel, getTickerPixelsPerSecond } from "../src/templates-v2/ticker-speed.js";

test("ticker mantém as velocidades homologadas", () => {
  assert.deepEqual(["slow","normal","fast"].map(getTickerPixelsPerSecond), [45,75,110]);
});

test("ticker válido usa dois grupos equivalentes para loop contínuo", () => {
  const model = buildTickerContentModel([{ title:"Uma" }, { headline:"Duas" }]);
  assert.equal(model.unavailable, false);
  assert.deepEqual(model.items, ["Uma","Duas"]);
  assert.equal(model.copies, 2);
});

test("ticker vazio exibe um único estado legível sem repetir fontes", () => {
  const model = buildTickerContentModel([], { unavailableLabel:"Notícias temporariamente indisponíveis" });
  assert.equal(model.unavailable, true);
  assert.deepEqual(model.items, ["Notícias temporariamente indisponíveis"]);
  assert.equal(model.copies, 1);
});
