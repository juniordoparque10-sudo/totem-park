import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyTemplateUpload,
  getMediaLibraryPurpose,
  getTemplateResourceType,
  filterTemplateResources,
  isPlaybackMedia,
  isTemplateResource,
} from "./media-library-purpose.js";

test("legacy media remains playable while explicit resources stay out of playback", () => {
  assert.equal(getMediaLibraryPurpose({}), "playback");
  assert.equal(isPlaybackMedia({}), true);
  assert.equal(isPlaybackMedia({ libraryPurpose: "playback" }), true);
  assert.equal(isTemplateResource({ libraryPurpose: "template-resource" }), true);
  assert.equal(isPlaybackMedia({ libraryPurpose: "template-resource" }), false);
});

test("resource filters keep only template assets of the requested kind", () => {
  const items = [
    { id: "legacy", contentType: "image/png" },
    { id: "logo", libraryPurpose: "template-resource", resourceType: "logo" },
    { id: "video", libraryPurpose: "template-resource", contentType: "video/mp4" },
  ];
  assert.deepEqual(filterTemplateResources(items, "all").map(({ id }) => id), ["logo", "video"]);
  assert.deepEqual(filterTemplateResources(items, "logo").map(({ id }) => id), ["logo"]);
  assert.deepEqual(filterTemplateResources(items, "video").map(({ id }) => id), ["video"]);
});

test("template resources normalize known and unknown file types", () => {
  assert.equal(getTemplateResourceType({ resourceType: "logo" }), "logo");
  assert.equal(getTemplateResourceType({ contentType: "video/mp4" }), "video");
  assert.equal(getTemplateResourceType({ contentType: "image/png" }), "image");
  assert.equal(getTemplateResourceType({ contentType: "application/pdf" }), "other");
});

test("template uploads are classified from their editor target", () => {
  assert.deepEqual(classifyTemplateUpload({ targetPath: "content.logo", contentType: "image/png" }), {
    libraryPurpose: "template-resource",
    resourceType: "logo",
    sourceContext: "template-v2-editor",
  });
  assert.equal(classifyTemplateUpload({ targetPath: "media.primary", contentType: "video/mp4" }).resourceType, "video");
  assert.equal(classifyTemplateUpload({ targetPath: "media.primary", contentType: "image/jpeg" }).resourceType, "background");
});
