import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const modules = readFileSync(new URL("../src/templates-v2/TemplateV2Modules.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
const layer = readFileSync(new URL("../src/QRCodeLayer.jsx", import.meta.url), "utf8");

test("shared QR layer defines visibly distinct logical sizes", () => {
  assert.match(layer, /small:\s*8,\s*medium:\s*10,\s*large:\s*13/);
});

test("Marketing and Templates V2 render the same shared QR layer", () => {
  assert.match(app, /<QRCodeLayer config=\{art\.qrCode \|\| art\.qrText \|\| art\.whatsapp \|\| ""\}/);
  assert.match(modules, /<QRCodeLayer config=\{config\} logicalWidth=\{logicalWidth\}/);
});

test("shared QR layer maps all positions and configurable logical margin", () => {
  for (const position of ["top-left", "top-right", "bottom-left", "bottom-right", "center"]) {
    assert.match(css, new RegExp(`qr-code-layer\\.is-${position}`));
  }
  assert.match(css, /var\(--qr-margin\)/);
  assert.match(css, /width:\s*var\(--qr-size/);
});
