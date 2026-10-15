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
  assert.match(marketRenderer, /enabled:mode\s*===\s*"player"/);
  assert.match(marketRenderer, /--secondary-count/);
  assert.match(marketRenderer, /has-no-secondary/);
  assert.match(marketCss, /\.tpv2-market-premium\{[^}]*box-sizing:border-box/);
  assert.match(marketCss, /\.market-list\{[^}]*grid-template-rows:repeat\(var\(--secondary-count\),minmax\(0,1fr\)\)/);
  assert.match(marketCss, /\.market-list article\{[^}]*grid-template-columns:minmax\(7cqw,32%\)/);
  assert.match(marketCss, /\.market-list img,\.market-image-empty\{[^}]*width:100%[^}]*height:100%/);
  assert.match(marketCss, /\.tpv2-market-premium\.has-no-secondary main\{[^}]*grid-template-columns:1fr/);
});

test("Notícias Editorial identifica o modo thumbnail e preserva os cards secundários", () => {
  assert.match(newsRenderer, /mode\s*===\s*"thumbnail"\s*\?\s*"is-thumbnail"/);
  assert.match(newsRenderer, /enabled:\s*mode\s*===\s*"player"/);
  assert.match(newsRenderer, /--secondary-count/);
  assert.match(newsRenderer, /has-no-secondary/);
  assert.match(newsRenderer, /item\.image\s*&&\s*<img/);
  assert.match(newsCss, /\.tpv2-news-dynamic\{[^}]*box-sizing:border-box/);
  assert.match(newsCss, /\.tpv2-news-dynamic \.secondary article\{[^}]*box-sizing:border-box/);
  assert.match(newsCss, /\.tpv2-news-dynamic \.secondary\{[^}]*grid-template-rows:repeat\(var\(--secondary-count\),minmax\(0,1fr\)\)/);
  assert.match(newsCss, /\.tpv2-news-dynamic\.layout-C \.secondary\{[^}]*grid-template-columns:repeat\(var\(--secondary-count\),minmax\(0,1fr\)\)/);
  assert.match(newsCss, /\.tpv2-news-dynamic \.secondary article:has\(>img\)\{[^}]*grid-template-columns:minmax\(8cqw,34%\)/);
  assert.match(newsCss, /\.tpv2-news-dynamic\.has-no-secondary main\{[^}]*grid-template-columns:1fr/);
});
