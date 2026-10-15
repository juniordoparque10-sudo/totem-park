import test from "node:test";
import assert from "node:assert/strict";
import { createTemplateV2Draft, NEWS_EDITORIAL_DYNAMIC_TYPE, NEWS_EDITORIAL_TYPE, MARKET_PREMIUM_TYPE, getTemplateV2Assets } from "../src/templates-v2/schema.js";

test("preserva news-editorial e cria tipos dinâmicos separados", () => {
  const legacy = createTemplateV2Draft(NEWS_EDITORIAL_TYPE);
  const dynamic = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE);
  assert.equal(legacy.dynamicTemplate, undefined);
  assert.equal(dynamic.dynamicTemplate, true);
  assert.equal(createTemplateV2Draft(MARKET_PREMIUM_TYPE).market.catalog.length, 0);
});

test("inclui imagens do catálogo do mercado nos assets sem duplicação", () => {
  const image = { mediaId: "m1", url: "https://example.test/product.png" };
  const assets = getTemplateV2Assets({ market: { catalog: [{ id: "p1", image }, { id: "p2", image }] } });
  assert.equal(assets.length, 1);
  assert.equal(assets[0].role, "market.product.p1");
});
