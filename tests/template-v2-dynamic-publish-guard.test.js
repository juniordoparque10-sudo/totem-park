import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("publicação dinâmica valida telas das playlists já atribuídas", () => {
  assert.match(editor, /getDynamicPublicationCapability/);
  assert.match(editor, /Nenhuma publicação foi alterada/);
  assert.match(app, /screens=\{attachActivePlayerBindings\(screens, playerBindings, client\.id\)\}/);
});
