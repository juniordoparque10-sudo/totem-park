import test from "node:test";
import assert from "node:assert/strict";

import {
  createHeroBusinessDraft,
  createTemplateV2Document,
  getPublishedTemplateV2View,
  getTemplateV2Assets,
  isTemplateV2Dirty,
} from "../src/templates-v2/schema.js";
import { listTemplateV2Definitions } from "../src/templates-v2/registry.js";

test("a new V2 template starts as draft-only", () => {
  const template = createTemplateV2Document({ name: "Recepção" });
  assert.equal(template.schemaVersion, 2);
  assert.equal(template.identity.name, "Recepção");
  assert.equal(template.published, null);
  assert.equal(getPublishedTemplateV2View(template), null);
});

test("editing draft does not mutate a published snapshot", () => {
  const published = createHeroBusinessDraft({ content: { headline: "Publicado" } });
  const template = createTemplateV2Document({ draft: published });
  template.published = structuredClone(published);
  template.draft.content.headline = "Novo rascunho";

  const playerView = getPublishedTemplateV2View(template);
  assert.equal(playerView.published.content.headline, "Publicado");
  assert.equal(template.draft.content.headline, "Novo rascunho");
});

test("dirty state uses structural comparison", () => {
  const saved = createHeroBusinessDraft();
  const editor = structuredClone(saved);
  assert.equal(isTemplateV2Dirty(editor, saved), false);
  editor.style.primaryColor = "#ff0000";
  assert.equal(isTemplateV2Dirty(editor, saved), true);
});

test("typography defaults and partial overrides remain bounded by the schema", () => {
  const draft = createHeroBusinessDraft({
    style: { typography: { headline: { fontSize: 96, lineHeight: 1.1 } } },
  });
  assert.equal(draft.style.typography.headline.fontSize, 96);
  assert.equal(draft.style.typography.headline.lineHeight, 1.1);
  assert.equal(draft.style.typography.subtitle.fontSize, 26);
  assert.equal(draft.style.typography.cta.lineHeight, 1.2);
});

test("full-background transparency remains independent from image overlay", () => {
  const draft = createHeroBusinessDraft({ style: { mediaLayout: "full", panelTransparency: 75 } });
  assert.equal(draft.style.mediaLayout, "full");
  assert.equal(draft.style.panelTransparency, 75);
  assert.equal(draft.style.overlayOpacity, 52);
});

test("asset resolver enumerates stable official media references", () => {
  const config = createHeroBusinessDraft();
  config.media.primary = { mediaId: "media-1", type: "image", url: "https://cdn/image.jpg", storagePath: "clients/c/media/a.jpg", storageProvider: "r2", fileHash: "abc" };
  config.content.logo = { mediaId: "logo-1", type: "image", url: "https://cdn/logo.png" };
  const assets = getTemplateV2Assets(config);
  assert.deepEqual(assets.map((asset) => asset.role), ["logo", "primary"]);
  assert.equal(assets[1].mediaId, "media-1");
  assert.equal(assets[1].storageProvider, "r2");
});

test("registry exposes the complete commercial V2 library", () => {
  const definitions = listTemplateV2Definitions();
  assert.equal(definitions.length, 10);
  assert.equal(new Set(definitions.map((item) => item.type)).size, 10);
  definitions.forEach((definition) => assert.deepEqual(definition.orientations, ["Paisagem", "Retrato"]));
});

test("content position changes structure without mutating content", () => {
  const left = createHeroBusinessDraft({ layout: { contentPosition: "left" } });
  const right = createHeroBusinessDraft({ ...left, layout: { contentPosition: "right" } });
  assert.equal(right.layout.contentPosition, "right");
  assert.deepEqual(right.content, left.content);
  assert.deepEqual(right.media, left.media);
});

test("QR configuration persists safe positioning controls", () => {
  const draft = createHeroBusinessDraft({ modules: { qrCode: { enabled:true, value:"https://example.com", position:"top-left", size:"large", margin:48 } } });
  assert.deepEqual(draft.modules.qrCode, { enabled:true, value:"https://example.com", position:"top-left", size:"large", margin:48 });
});

test("news ticker configuration remains inside the draft contract", () => {
  const draft = createHeroBusinessDraft({ modules: { news: { enabled:true, selectedNewsSources:["G1 RN","CNN Brasil"], tickerSpeed:"fast", tickerSize:"large", tickerBackground:"#112233", tickerTextColor:"#ffeeaa", tickerTransparency:25, tickerLabel:"Agora" } } });
  assert.equal(draft.modules.news.tickerSpeed, "fast");
  assert.equal(draft.modules.news.tickerSize, "large");
  assert.deepEqual(draft.modules.news.selectedNewsSources, ["G1 RN","CNN Brasil"]);
  assert.equal(draft.modules.news.tickerTransparency, 25);
});

test("registry explicitly declares ticker support", () => {
  const definitions = listTemplateV2Definitions();
  definitions.forEach((definition) => assert.equal(definition.newsTicker, definition.modules.includes("news")));
});
