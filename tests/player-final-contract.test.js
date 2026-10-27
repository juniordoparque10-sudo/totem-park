import test from "node:test";
import assert from "node:assert/strict";
import {
  createTemplateV2Document,
  getTemplateV2DraftConfig,
  isTemplateV2,
  TEMPLATE_V2_RENDERER,
  TEMPLATE_V2_SCHEMA_VERSION,
} from "../src/templates-v2/schema.js";
import { listCreatableTemplateV2Definitions } from "../src/templates-v2/registry.js";
import { getAndroidPlayerV2Capabilities, supportsTemplatesV2 } from "../src/templates-v2/player-capability.js";

test("all existing creatable V2 templates retain the published schema contract", () => {
  for (const definition of listCreatableTemplateV2Definitions()) {
    const document = createTemplateV2Document({ type: definition.type, name: definition.label });
    assert.equal(document.schemaVersion, TEMPLATE_V2_SCHEMA_VERSION);
    assert.equal(document.renderer, TEMPLATE_V2_RENDERER);
    assert.equal(document.templateType, definition.type);
    assert.equal(isTemplateV2(document), true);
  }
});

test("existing documents tolerate unknown fields without losing their known content", () => {
  const document = createTemplateV2Document({ type: "smart-lobby", name: "Lobby" });
  document.draft.content.headline = "Bem-vindo";
  document.draft.futurePortalField = { ignoredByThisPlayer: true };
  const draft = getTemplateV2DraftConfig(document);
  assert.equal(draft.content.headline, "Bem-vindo");
  assert.deepEqual(draft.futurePortalField, { ignoredByThisPlayer: true });
});

test("the consolidated Android candidate is accepted by the capability contract", () => {
  const capability = getAndroidPlayerV2Capabilities("chromecast", {
    packageName: "br.com.parksolutions.totempark.player.rcsecurelink",
    versionCode: 67,
  });
  assert.equal(capability?.templatesV2, true);
  assert.equal(capability?.versionCode, 67);
  assert.equal(supportsTemplatesV2(capability), true);
});
