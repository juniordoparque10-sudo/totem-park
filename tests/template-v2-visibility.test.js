import test from "node:test";
import assert from "node:assert/strict";
import { createTemplateV2Draft, HERO_BUSINESS_TYPE, SPORTS_PREMIUM_TYPE } from "../src/templates-v2/schema.js";
import { listTemplateV2Definitions } from "../src/templates-v2/registry.js";

test("visibilidade nasce habilitada em templates V2", () => {
  for (const type of [HERO_BUSINESS_TYPE, SPORTS_PREMIUM_TYPE]) {
    const draft = createTemplateV2Draft(type);
    assert.equal(draft.visibility.showLogo, true);
    assert.equal(draft.visibility.showName, true);
    assert.equal(draft.visibility.showContent, true);
  }
});

test("todas as V2 expõem nome e logo como controles independentes", () => {
  for (const definition of listTemplateV2Definitions()) {
    assert.deepEqual(definition.visibilityControls.slice(0, 3), ["showLogo", "showName", "showContent"]);
  }
});

test("ocultar nome não altera o nome cadastrado nem o estado do logo", () => {
  const draft = createTemplateV2Draft(HERO_BUSINESS_TYPE, {
    content: { logo: { url: "logo.png" } },
    visibility: { showLogo: true, showName: false },
  });
  assert.equal(draft.visibility.showLogo, true);
  assert.equal(draft.visibility.showName, false);
  assert.equal(draft.content.logo.url, "logo.png");
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
