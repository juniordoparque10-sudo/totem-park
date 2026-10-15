import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDynamicNewsItems } from "../src/templates-v2/news-editorial-dynamic/data.js";

test("deduplica notícias por link e descarta itens sem título", () => {
  const items = normalizeDynamicNewsItems([{ title: "A", link: "https://site/a" }, { title: "A duplicada", link: "https://site/a" }, { summary: "sem título" }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "A");
});

test("limita notícias normalizadas a 24", () => {
  const items = normalizeDynamicNewsItems(Array.from({ length: 30 }, (_, index) => ({ title: `N${index}`, link: `https://site/${index}` })));
  assert.equal(items.length, 24);
});
