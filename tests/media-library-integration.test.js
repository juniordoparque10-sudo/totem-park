import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
const mediaField = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2MediaField.jsx", import.meta.url), "utf8");

test("template editor persists resource classification", () => {
  assert.match(editor, /classifyTemplateUpload/);
  assert.match(editor, /\.\.\.classifyTemplateUpload\(\{\s*targetPath,\s*contentType:\s*file\.type\s*\}\)/s);
});

test("template editor selectors use only resource-specific lists and keep explicit legacy reclassification", () => {
  assert.match(editor, /getTemplateEditorResources\(mediaList, "logo"\)/);
  assert.match(editor, /getTemplateEditorResources\(mediaList, "primary"\)/);
  assert.match(editor, /classifyExistingMedia/);
  assert.match(editor, /onClassifyLegacy/);
  assert.match(mediaField, /Recursos das Templates/);
});

test("media page exposes the two approved logical tabs and resource filters", () => {
  assert.match(app, />Reprodução</);
  assert.match(app, />Recursos das Templates</);
  assert.match(app, /filterTemplateResources\(mediaList, resourceTypeFilter\)/);
});

test("playlist picker only offers playback media without deleting persisted references", () => {
  assert.match(app, /const playbackMedia = mediaList\.filter\(isPlaybackMedia\)/);
  assert.match(app, /const landscapeMedia = playbackMedia\.filter/);
  assert.match(app, /form\.selectedMediaIds\.map/);
});

test("manual deletion checks both playlist and template usage", () => {
  assert.match(app, /getTemplateResourceUsage\(templates, media\)/);
  assert.match(app, /resourceUsage\?\.length/);
});
