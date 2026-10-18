import test from "node:test";
import assert from "node:assert/strict";
import { getTickerDurationSeconds, getTickerPixelsPerSecond } from "../src/templates-v2/ticker-speed.js";

test("Lenta, Normal e Rápida usam velocidades reais e crescentes", () => {
  assert.deepEqual(
    ["slow", "normal", "fast"].map(getTickerPixelsPerSecond),
    [45, 75, 110],
  );
});

test("duração acompanha a distância para manter pixels por segundo constantes", () => {
  assert.equal(getTickerDurationSeconds(900, "slow"), 20);
  assert.equal(getTickerDurationSeconds(900, "normal"), 12);
  assert.equal(getTickerDurationSeconds(900, "fast"), 900 / 110);
  assert.equal(getTickerDurationSeconds(1800, "normal"), 24);
});

test("distância ainda não medida mantém um fallback seguro e ordenado", () => {
  const slow = getTickerDurationSeconds(0, "slow");
  const normal = getTickerDurationSeconds(0, "normal");
  const fast = getTickerDurationSeconds(0, "fast");
  assert.ok(slow > normal);
  assert.ok(normal > fast);
});
