import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getDynamicRotationFrame } from "../src/templates-v2/dynamic-layout/rotation.js";

const marketRenderer = fs.readFileSync(new URL("../src/templates-v2/market-premium/MarketPremiumRenderer.jsx", import.meta.url), "utf8");
const marketCss = fs.readFileSync(new URL("../src/templates-v2/market-premium/market-premium.css", import.meta.url), "utf8");
const newsRenderer = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicRenderer.jsx", import.meta.url), "utf8");
const newsCss = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/news-editorial-dynamic.css", import.meta.url), "utf8");

test("quadro estático compacto seleciona destaque e conteúdo secundário", () => {
  const frame = getDynamicRotationFrame({ itemIds:["principal", "secundario"], elapsedMs:0, secondarySlots:3 });
  assert.equal(frame.featuredId, "principal");
  assert.deepEqual(frame.secondaryIds, ["secundario"]);
});

test("Mercado Premium identifica o modo thumbnail e preserva as linhas secundárias", () => {
  assert.match(marketRenderer, /mode\s*===\s*"thumbnail"\s*\?\s*"is-thumbnail"/);
  assert.match(marketCss, /\.tpv2-market-premium\.is-thumbnail \.market-list\{[^}]*grid-auto-rows:minmax\(0,1fr\)/);
  assert.match(marketCss, /\.tpv2-market-premium\.is-thumbnail \.market-list article\{[^}]*min-height:0/);
});

test("Notícias Editorial identifica o modo thumbnail e preserva os cards secundários", () => {
  assert.match(newsRenderer, /mode\s*===\s*"thumbnail"\s*\?\s*"is-thumbnail"/);
  assert.match(newsRenderer, /item\.image\s*&&\s*<img/);
  assert.match(newsCss, /\.tpv2-news-dynamic\.is-thumbnail \.secondary\{[^}]*grid-auto-rows:minmax\(0,1fr\)/);
  assert.match(newsCss, /\.tpv2-news-dynamic\.is-thumbnail \.secondary article\{[^}]*min-height:0/);
});
