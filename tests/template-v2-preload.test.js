import test from "node:test";
import assert from "node:assert/strict";
import { getTemplateV2CriticalImageState, getTemplateV2CriticalImageUrl, getTemplateV2ImageAssetUrl, getTemplateV2ReadinessFingerprint, localizeTemplateV2Assets, prepareTemplateV2CriticalImage, preloadImageForPaint, suppressTemplateV2CriticalImage } from "../src/templates-v2/player-preload.js";

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

test("caso A: imagem normal confirma T4 e T5 antes de permitir T6", async () => {
  const events = [];
  class ReadyImage {
    set src(_value) { queueMicrotask(() => this.onload()); }
    async decode() {}
  }
  const item = { published:{ media:{ primary:{ type:"image", url:"https://cdn/caso-a.jpg" } } } };
  const result = await prepareTemplateV2CriticalImage(item, ReadyImage, { onEvent:(event) => events.push(event) });
  if (result.status === "ready") events.push("T6");
  assert.deepEqual(events, ["T4", "T5", "T6"]);
});

test("caso B: preload rejeitado tenta uma vez novamente e não libera T6", async () => {
  const events = [];
  let attempts = 0;
  class FailingImage {
    set src(_value) { attempts += 1; queueMicrotask(() => this.onerror()); }
  }
  const item = { published:{ media:{ primary:{ type:"image", url:"https://cdn/caso-b.jpg" } } } };
  const result = await prepareTemplateV2CriticalImage(item, FailingImage, { onEvent:(event) => events.push(event) });
  if (result.status === "ready") events.push("T6");
  assert.equal(result.status, "failed");
  assert.equal(attempts, 2);
  assert.deepEqual(events, []);
});

test("caso C: background configurado sem URL é falha de asset, não ausência de background", async () => {
  const item = { published:{ media:{ primary:{ type:"image", name:"fundo.jpg" } } } };
  assert.deepEqual(getTemplateV2CriticalImageState(item), { status:"configured", configured:true, url:"" });
  assert.equal((await prepareTemplateV2CriticalImage(item)).status, "asset-unresolved");
});

test("caso D: template realmente sem background pode revelar imediatamente", async () => {
  const item = { published:{ media:{ primary:null } } };
  assert.deepEqual(getTemplateV2CriticalImageState(item), { status:"no-background", configured:false, url:"" });
  assert.equal((await prepareTemplateV2CriticalImage(item)).status, "no-background");
});

test("caso E: imagem já decodificada comprova T4 e T5 no caminho cacheado", async () => {
  const url = "https://cdn/caso-e.jpg";
  let instances = 0;
  class CachedImage {
    constructor() { instances += 1; }
    set src(_value) { queueMicrotask(() => this.onload()); }
    async decode() {}
  }
  const item = { published:{ media:{ primary:{ type:"image", url } } } };
  await prepareTemplateV2CriticalImage(item, CachedImage);
  const events = [];
  const result = await prepareTemplateV2CriticalImage(item, CachedImage, { onEvent:(event,details) => events.push([event,details.cached]) });
  assert.equal(result.status, "ready");
  assert.equal(instances, 1);
  assert.deepEqual(events, [["T4",true],["T5",true]]);
});

test("caso F: fallback definitivo remove a imagem do render sem permitir late paint", () => {
  const item = { published:{ media:{ primary:{ type:"image", url:"https://cdn/caso-f.jpg" } } } };
  const fallback = suppressTemplateV2CriticalImage(item);
  assert.equal(fallback.published.media.primary, null);
  assert.equal(item.published.media.primary.url, "https://cdn/caso-f.jpg");
  assert.equal(getTemplateV2CriticalImageUrl(fallback), "");
});

test("hidratação tardia permanece pending até a publicação autoritativa chegar", async () => {
  const rawItem = { id:"template-1", templateId:"template-1", templateRevision:7, templatePublishedResolved:false };
  const pending = await prepareTemplateV2CriticalImage(rawItem);
  assert.equal(pending.status, "pending-hydration");

  const events = [];
  class ReadyImage {
    set src(_value) { queueMicrotask(() => this.onload()); }
    async decode() {}
  }
  const hydratedItem = { ...rawItem, templatePublishedResolved:true, published:{ media:{ primary:{ type:"image", url:"https://cdn/hidratado.jpg" } } } };
  const ready = await prepareTemplateV2CriticalImage(hydratedItem, ReadyImage, { onEvent:(event) => events.push(event) });
  if (ready.status === "ready") events.push("T6");
  assert.deepEqual(events, ["T4", "T5", "T6"]);
});

test("publicação resolvida sem background continua sendo no-background", async () => {
  const item = { templatePublishedResolved:true, published:{ media:{ primary:null } } };
  assert.equal((await prepareTemplateV2CriticalImage(item)).status, "no-background");
});

test("fingerprint muda quando hidratação ou URL crítica muda", () => {
  const pending = { id:"template-2", templateId:"template-2", templateRevision:3, templatePublishedResolved:false };
  const first = { ...pending, templatePublishedResolved:true, published:{ media:{ primary:{ type:"image", url:"https://cdn/a.jpg" } } } };
  const second = { ...first, published:{ media:{ primary:{ type:"image", url:"https://cdn/b.jpg" } } } };
  assert.notEqual(getTemplateV2ReadinessFingerprint(pending), getTemplateV2ReadinessFingerprint(first));
  assert.notEqual(getTemplateV2ReadinessFingerprint(first), getTemplateV2ReadinessFingerprint(second));
});

test("fallback suprimido permanece sem background após hidratação tardia", () => {
  const hydrated = { id:"template-3", templatePublishedResolved:true, published:{ media:{ primary:{ type:"image", url:"https://cdn/fundo.jpg" } } } };
  const suppressed = suppressTemplateV2CriticalImage(hydrated);
  assert.equal(getTemplateV2CriticalImageState(suppressed).status, "no-background");
  assert.equal(getTemplateV2ImageAssetUrl(suppressed.published.media.primary), "");
});

test("preloader e renderer resolvem exatamente a mesma URL autoritativa", () => {
  const asset = { type:"image", preview:"https://cdn/preview.jpg", publicUrl:"https://cdn/public.jpg" };
  const item = { templatePublishedResolved:true, published:{ media:{ primary:asset } } };
  assert.equal(getTemplateV2CriticalImageUrl(item), getTemplateV2ImageAssetUrl(asset));
  assert.equal(getTemplateV2CriticalImageUrl(item), "https://cdn/preview.jpg");
});
