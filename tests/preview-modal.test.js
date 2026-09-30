import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modal = readFileSync(new URL("../src/PreviewModal.jsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const v2 = readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");

test("shared preview modal supports backdrop, buttons and Escape", () => {
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /onMouseDown=\{onClose\}/);
  assert.match(modal, />Fechar<\/button>/);
  assert.match(modal, /aria-label="Fechar prévia"/);
});

test("legacy, marketing and V2 reuse the shared modal with live editor state", () => {
  assert.equal((app.match(/<PreviewModal/g) || []).length, 2);
  assert.match(app, /<MarketingArtPreview art=\{form\}/);
  assert.match(app, /LegacyTemplateVisualPreview template=\{\{ \.\.\.form, orientation: previewOrientation \}\}/);
  assert.match(v2, /<PreviewModal/);
  assert.match(v2, /config=\{config\}/);
});
