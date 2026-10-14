import test from "node:test";
import assert from "node:assert/strict";

import { getTemplateResourceUsage } from "./template-resource-usage.js";

test("finds shared template resources by media id and legacy URL", () => {
  const media = { id: "asset-1", preview: "https://cdn.example/resource.png" };
  const templates = [
    { id: "one", identity: { name: "Template Um" }, draft: { media: { primary: { mediaId: "asset-1" } } } },
    { id: "two", name: "Template Dois", published: { content: { logo: { url: media.preview } } } },
    { id: "three", name: "Sem uso", draft: { media: { primary: { mediaId: "other" } } } },
  ];
  assert.deepEqual(getTemplateResourceUsage(templates, media), [
    { id: "one", name: "Template Um" },
    { id: "two", name: "Template Dois" },
  ]);
});

test("does not report unrelated templates", () => {
  assert.deepEqual(getTemplateResourceUsage([{ id: "one", draft: { value: "other" } }], { id: "asset" }), []);
});
