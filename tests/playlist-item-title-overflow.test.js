import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const portalCss = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");

test("playlist picker media titles truncate without changing library media cards", () => {
  assert.match(appSource, /<strong className="playlist-picker-item-title" title=\{media\.title\}>\{media\.title\}<\/strong>/);
  assert.match(portalCss, /\.playlist-picker-item-title\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s);
  assert.doesNotMatch(portalCss, /\.media-card[^{]*\.playlist-picker-item-title/);
});
