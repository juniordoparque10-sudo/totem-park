import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const modules = fs.readFileSync(new URL("../src/templates-v2/TemplateV2Modules.jsx", import.meta.url), "utf8");
const renderer = fs.readFileSync(new URL("../src/templates-v2/TemplateV2Renderer.jsx", import.meta.url), "utf8");
const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/templates-v2/editor/template-v2-editor.css", import.meta.url), "utf8");

test("Player Web resolves logo assets through the same resolver as backgrounds", () => {
  assert.match(modules, /const assetUrl = getTemplateV2ImageAssetUrl\(asset\)/);
  assert.match(modules, /assetUrl \? <img src=\{assetUrl\}/);
});

test("asset resolver accepts persisted remote preview and image URL fields", async () => {
  const { getTemplateV2ImageAssetUrl } = await import("../src/templates-v2/player-preload.js");
  assert.equal(getTemplateV2ImageAssetUrl({ remotePreview:"https://cdn/logo.png" }), "https://cdn/logo.png");
  assert.equal(getTemplateV2ImageAssetUrl({ imageUrl:"https://cdn/background.png" }), "https://cdn/background.png");
});

test("V2 overlay uses a valid numeric alpha and irrelevant control is disabled", () => {
  assert.match(renderer, /--tpv2-overlay["']?:\s*Math\.max[\s\S]*?\/\s*100/);
  assert.match(editor, /disabled=\{!draftState\.editorDraft\.media\.primary\}/);
});

test("V2 workspace and library tracks are width constrained without hiding overflow", () => {
  assert.match(css, /\.tpv2-workspace[\s\S]*?min-width:0;max-width:100%;box-sizing:border-box/);
  assert.match(css, /repeat\(auto-fit,minmax\(min\(100%,260px\),1fr\)\)/);
  assert.doesNotMatch(css, /\.tpv2-workspace[^}]*overflow-x:\s*hidden/);
});
