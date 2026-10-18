import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const newsCss = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/news-editorial-dynamic.css", import.meta.url), "utf8");
const collectionRenderer = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/CollectionRenderer.jsx", import.meta.url), "utf8");
const smartLobbyRenderer = fs.readFileSync(new URL("../src/templates-v2/smart-lobby/SmartLobbyRenderer.jsx", import.meta.url), "utf8");
const collectionCss = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/collection-renderer.css", import.meta.url), "utf8");

test("Notícias mantém o background publicado em uma camada isolada e visível", () => {
  assert.match(newsCss, /\.tpv2-news-dynamic\{[^}]*isolation:isolate/);
  assert.doesNotMatch(newsCss, /\.tpv2-news-background\{[^}]*opacity:\.18/);
  assert.match(newsCss, /\.tpv2-news-background>img[^}]*position:absolute[^}]*inset:0/);
  assert.match(newsCss, /\.tpv2-news-background>i\{[^}]*z-index:1/);
});

test("Smart Lobby identifica seu renderer sem alterar as demais coleções", () => {
  assert.match(collectionRenderer, /variantClass/);
  assert.match(smartLobbyRenderer, /variantClass="smart-lobby"/);
  assert.match(collectionCss, /\.tpv2-collection-smart-lobby/);
});

test("Smart Lobby usa o espaço real dos cards e justifica somente o corpo", () => {
  assert.match(collectionCss, /\.tpv2-collection-smart-lobby[^}]*p[^}]*text-align:justify/);
  assert.match(collectionCss, /text-align-last:left/);
  assert.match(collectionCss, /overflow-wrap:anywhere/);
  assert.match(collectionCss, /-webkit-line-clamp:unset/);
  assert.match(collectionCss, /white-space:pre-wrap/);
  assert.match(collectionCss, /flex:1 1 auto/);
  assert.doesNotMatch(collectionCss, /\.tpv2-collection-smart-lobby[^}]*h[23][^}]*text-align:justify/);
});

test("Smart Lobby remove a coluna de imagem quando o card não possui imagem", () => {
  assert.match(collectionCss, /\.tpv2-collection-smart-lobby \.featured:not\(:has\(>img\)\)[^{]*\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(collectionCss, /\.tpv2-collection-smart-lobby \.secondary article:not\(:has\(>img\)\)[^{]*\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
});
