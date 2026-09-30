import test from "node:test";
import assert from "node:assert/strict";
import { createTemplateV2Draft, HERO_BUSINESS_TYPE, SPORTS_PREMIUM_TYPE } from "../src/templates-v2/schema.js";

test("visibilidade nasce habilitada em templates V2", () => {
  for (const type of [HERO_BUSINESS_TYPE, SPORTS_PREMIUM_TYPE]) {
    const draft = createTemplateV2Draft(type);
    assert.equal(draft.visibility.showLogo, true);
    assert.equal(draft.visibility.showContent, true);
  }
});

test("ocultar elementos preserva textos, logo e mídia", () => {
  const draft = createTemplateV2Draft(HERO_BUSINESS_TYPE, {
    content: { headline: "Não apagar", logo: { url: "logo.png" } },
    media: { primary: { type: "image", url: "fundo.jpg" } },
    visibility: { showLogo: false, showContent: false, showHeadline: false },
  });
  assert.equal(draft.visibility.showLogo, false);
  assert.equal(draft.visibility.showContent, false);
  assert.equal(draft.content.headline, "Não apagar");
  assert.equal(draft.content.logo.url, "logo.png");
  assert.equal(draft.media.primary.url, "fundo.jpg");
});
