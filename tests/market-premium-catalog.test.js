import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMarketPremiumConfig, selectMarketFrame } from "../src/templates-v2/market-premium/config.js";

test("normaliza catálogo e limita produtos ativos", () => {
  const catalog = Array.from({ length: 45 }, (_, index) => ({ id: `p${index}`, name: `Produto ${index}`, promotionalPrice: index + 1, active: true }));
  const config = normalizeMarketPremiumConfig({ catalog });
  assert.equal(config.catalog.length, 40);
  assert.equal(config.catalog.filter((item) => item.active).length, 24);
});

test("destaque não se repete nas ofertas secundárias", () => {
  const catalog = ["a", "b", "c"].map((id, index) => ({ id, name: id, promotionalPrice: index + 1, active: true }));
  const frame = selectMarketFrame({ catalog }, { elapsedMs: 0, effectiveDurationMs: 10_000, secondarySlots: 2 });
  assert.equal(frame.secondary.some((item) => item.id === frame.featured.id), false);
});
