import test from "node:test";
import assert from "node:assert/strict";
import { mediaDocumentToTemplateAsset } from "./media-utils.js";

test("reused legacy template resource resolves its download URL for preview and persistence", () => {
  const asset = mediaDocumentToTemplateAsset({
    id: "legacy-resource",
    title: "Fundo reconhecível",
    contentType: "image/png",
    downloadURL: "https://cdn.example.com/fundo-reconhecivel.png",
  });

  assert.equal(asset.mediaId, "legacy-resource");
  assert.equal(asset.url, "https://cdn.example.com/fundo-reconhecivel.png");
  assert.equal(asset.type, "image");
});

test("current template resource URL keeps precedence over legacy aliases", () => {
  const asset = mediaDocumentToTemplateAsset({
    id: "current-resource",
    publicUrl: "https://cdn.example.com/current.png",
    downloadURL: "https://cdn.example.com/legacy.png",
  });

  assert.equal(asset.url, "https://cdn.example.com/current.png");
});
