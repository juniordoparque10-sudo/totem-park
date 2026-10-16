import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const modules = fs.readFileSync(new URL("../src/templates-v2/TemplateV2Modules.jsx", import.meta.url), "utf8");
const renderer = fs.readFileSync(new URL("../src/templates-v2/TemplateV2Renderer.jsx", import.meta.url), "utf8");
const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/templates-v2/editor/template-v2-editor.css", import.meta.url), "utf8");
const rendererCss = fs.readFileSync(new URL("../src/templates-v2/template-v2.css", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const appCss = fs.readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
const sportsRenderer = fs.readFileSync(new URL("../src/templates-v2/sports-v2/SportsPremiumRenderer.jsx", import.meta.url), "utf8");
const telemetryDashboard = fs.readFileSync(new URL("../src/TelemetryDashboard.jsx", import.meta.url), "utf8");

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

test("initial V2 catalog constrains its own tracks and cards", () => {
  assert.match(css, /\.tpv2-catalog\s*\{[^}]*width:100%;[^}]*min-width:0;[^}]*grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,180px\),1fr\)\)/);
  assert.match(css, /\.tpv2-catalog button\s*\{[^}]*width:100%;[^}]*min-width:0;[^}]*max-width:100%/);
});

test("published V2 template selector wraps as a responsive grid without horizontal scrolling", () => {
  const tabsRule = css.match(/\.tpv2-template-tabs\s*\{[^}]*\}/g)?.at(-1) || "";
  const buttonRule = css.match(/\.tpv2-template-tabs button\s*\{[^}]*\}/g)?.at(-1) || "";
  assert.match(tabsRule, /display:grid/);
  assert.match(tabsRule, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,190px\),1fr\)\)/);
  assert.match(tabsRule, /overflow:visible/);
  assert.match(buttonRule, /width:100%;min-width:0;max-width:100%/);
});

test("telemetry table uses stable screen ordering instead of heartbeat timestamps", () => {
  assert.match(telemetryDashboard, /createPortalScreenOrderTracker/);
  assert.match(telemetryDashboard, /sortOfflineByLastSignal:\s*true/);
  assert.match(telemetryDashboard, /screenOrder\.sort\(enriched, now\)/);
  assert.doesNotMatch(telemetryDashboard, /return enriched\.filter\([\s\S]*?\.sort\(\(left, right\) => compareTelemetryScreens\(left, right, now\)\)/);
});

test("overlay affects the full image in landscape and portrait", () => {
  assert.match(rendererCss, /\.tpv2-media-shade[^}]*linear-gradient\(rgba\(7,17,31,var\(--tpv2-overlay\)\)/);
  assert.match(rendererCss, /\.tpv2-root\.is-portrait \.tpv2-media-shade[^}]*var\(--tpv2-overlay\)/);
});

test("client snapshot refresh preserves screen rows instead of rebuilding the list", () => {
  assert.doesNotMatch(app, /setScreensData\(\[\]\);\s*setPlaylistsData\(\[\]\)/);
  assert.match(app, /setScreensData\(\(previous\) => previous\.filter\(\(screen\) => activeClientIds\.has\(screen\.clientId\)\)\)/);
});

test("V2 content can shrink without changing the portal sidebar width", () => {
  assert.match(appCss, /\.content:has\(\.templates-library-tabs\)\s*\{[^}]*min-width:\s*0/);
  assert.match(appCss, /\.layout:has\(\.templates-library-tabs\)\s*>\s*\.sidebar\s*\{[^}]*flex-shrink:\s*0/);
  assert.doesNotMatch(appCss, /\.content:has\(\.templates-library-tabs\)\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/);
});

test("sports renderer maps overlay and panel transparency to valid alpha values", () => {
  assert.match(sportsRenderer, /getSportsV2Appearance\(config/);
  assert.match(sportsRenderer, /style=\{\{ opacity: appearance\.overlayAlpha \}\}/);
  assert.match(sportsRenderer, /appearance=\{appearance\}/);
  assert.doesNotMatch(sportsRenderer, /sports-v2-controls\.css/);
});
