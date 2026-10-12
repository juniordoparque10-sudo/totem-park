import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const isotipoAsset = new URL("../src/assets/isotipo.png", import.meta.url);

test("authenticated portal imports the isotipo used by the admin shell", () => {
  assert.match(
    appSource,
    /import\s+isotipo\s+from\s+["']\.\/assets\/isotipo\.png["'];/,
  );
  assert.ok(existsSync(isotipoAsset), "src/assets/isotipo.png must exist");
  assert.match(appSource, /<img\s+src=\{isotipo\}/);
});
