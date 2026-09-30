import test from "node:test";
import assert from "node:assert/strict";
import { getTemplateV2CriticalImageUrl, localizeTemplateV2Assets, preloadImageForPaint } from "../src/templates-v2/player-preload.js";

test("localiza o fundo publicado sem alterar o documento original", () => {
  const item = { published: { media: { primary: { type: "image", url: "https://cdn/fundo.jpg" } } } };
  const localized = localizeTemplateV2Assets(item, { "https://cdn/fundo.jpg": "file:///cache/fundo.jpg" });
  assert.equal(getTemplateV2CriticalImageUrl(localized), "file:///cache/fundo.jpg");
  assert.equal(item.published.media.primary.url, "https://cdn/fundo.jpg");
  assert.equal(localized.published.media.primary.remoteUrl, "https://cdn/fundo.jpg");
});

test("aguarda load e decode da imagem crítica", async () => {
  const events = [];
  class FakeImage {
    set src(value) { this.value = value; queueMicrotask(() => { events.push("load"); this.onload(); }); }
    async decode() { events.push("decode"); }
  }
  await preloadImageForPaint("https://cdn/fundo-unico.jpg", FakeImage);
  assert.deepEqual(events, ["load", "decode"]);
});

test("ignora vídeo como imagem crítica", () => {
  assert.equal(getTemplateV2CriticalImageUrl({ published: { media: { primary: { type: "video", url: "video.mp4" } } } }), "");
});
