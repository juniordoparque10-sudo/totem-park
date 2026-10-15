import test from "node:test";
import assert from "node:assert/strict";
import { mediaDocumentToTemplateAsset } from "./media-utils.js";
import { createTemplateV2Draft, getTemplateV2DraftConfig, HERO_BUSINESS_TYPE, WEATHER_PREMIUM_TYPE } from "../schema.js";
import { getTemplateV2ImageAssetUrl } from "../player-preload.js";

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

test("same library resource remains visible as background in two V2 template types after reopen", () => {
  const shared = mediaDocumentToTemplateAsset({
    id: "shared-background",
    title: "Background compartilhado",
    type: "Imagem",
    fileUrl: "https://cdn.example.com/shared-background.png",
  });
  const heroDraft = createTemplateV2Draft(HERO_BUSINESS_TYPE, { media: { primary: shared } });
  const weatherDraft = createTemplateV2Draft(WEATHER_PREMIUM_TYPE, { media: { primary: shared } });
  const reopenedWeather = getTemplateV2DraftConfig({
    schemaVersion: 2,
    renderer: "template-v2",
    templateType: WEATHER_PREMIUM_TYPE,
    draft: structuredClone(weatherDraft),
  });

  assert.equal(getTemplateV2ImageAssetUrl(heroDraft.media.primary), "https://cdn.example.com/shared-background.png");
  assert.equal(getTemplateV2ImageAssetUrl(weatherDraft.media.primary), "https://cdn.example.com/shared-background.png");
  assert.deepEqual(reopenedWeather.media.primary, weatherDraft.media.primary);
});
