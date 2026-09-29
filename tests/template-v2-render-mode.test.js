import test from "node:test";
import assert from "node:assert/strict";
import { shouldRenderTemplateV2InternalVideo, shouldShowTemplateMediaPlaceholder } from "../src/templates-v2/render-mode.js";

test("media placeholder is exclusive to editor mode", () => {
  assert.equal(shouldShowTemplateMediaPlaceholder("editor"), true);
  assert.equal(shouldShowTemplateMediaPlaceholder("thumbnail"), false);
  assert.equal(shouldShowTemplateMediaPlaceholder("player"), false);
});

test("internal video remains previewable only while replacing an old editor draft", () => {
  assert.equal(shouldRenderTemplateV2InternalVideo("editor"), true);
  assert.equal(shouldRenderTemplateV2InternalVideo("thumbnail"), false);
  assert.equal(shouldRenderTemplateV2InternalVideo("player"), false);
});
