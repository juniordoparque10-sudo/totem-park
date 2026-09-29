import test from "node:test";
import assert from "node:assert/strict";
import { createHeroBusinessDraft, createTemplateV2Document, getPublishedTemplateV2View } from "../src/templates-v2/schema.js";

test("playlist hydration can only expose the published V2 configuration", () => {
  const template = createTemplateV2Document({ name: "Hero da recepção" });
  template.published = createHeroBusinessDraft({ content: { headline: "Versão na TV" } });
  template.draft = createHeroBusinessDraft({ content: { headline: "Ainda editando" } });
  const playlistSnapshot = { templateId: "template-1", playerItemType: "template", content: { headline: "Snapshot antigo" } };
  const hydrated = { ...playlistSnapshot, ...template, id: "template-1" };
  const playerView = getPublishedTemplateV2View(hydrated);
  assert.equal(playerView.published.content.headline, "Versão na TV");
  assert.notEqual(playerView.published.content.headline, hydrated.draft.content.headline);
});

test("unpublished V2 template has no player view", () => {
  const template = createTemplateV2Document();
  assert.equal(getPublishedTemplateV2View(template), null);
});
