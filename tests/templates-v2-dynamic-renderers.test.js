import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const renderer = fs.readFileSync(new URL("../src/templates-v2/TemplateV2Renderer.jsx", import.meta.url), "utf8");
const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
const market = fs.readFileSync(new URL("../src/templates-v2/market-premium/MarketPremiumRenderer.jsx", import.meta.url), "utf8");

test("roteia apenas os novos tipos aos renderers dinâmicos", () => {
  assert.match(renderer, /NEWS_EDITORIAL_DYNAMIC_TYPE/);
  assert.match(renderer, /NewsEditorialDynamicRenderer/);
  assert.match(renderer, /MARKET_PREMIUM_TYPE/);
  assert.match(renderer, /MarketPremiumRenderer/);
  assert.doesNotMatch(renderer, /type === NEWS_EDITORIAL_TYPE.*NewsEditorialDynamicRenderer/);
});

test("editor oferece campos específicos para notícias e mercado", () => {
  assert.match(editor, /NewsEditorialDynamicEditorFields/);
  assert.match(editor, /MarketPremiumEditorFields/);
});

test("Mercado Premium preserva background e overlay configurados", () => {
  assert.match(market, /TemplateMedia/);
  assert.match(market, /config\.media\?\.primary/);
  assert.match(market, /getMarketPremiumAppearance/);
});
