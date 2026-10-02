import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findNextReadyMediaIndex, getCanonicalPlaylistMediaEntries, getNativeOfflineQueueUrls, getPlaylistMediaPreparation, getUntrackedPendingMediaUrls, shouldDeferMediaAdvance } from "../src/media-download-readiness.js";

const first = { id:"a", type:"Vídeo", preview:"https://cdn/a.mp4" };
const second = { id:"b", type:"Vídeo", preview:"https://cdn/b.mp4" };
const third = { id:"c", type:"Vídeo", preview:"https://cdn/c.mp4" };

test("playlist pronta 2/2 passa imediatamente para 2/3 ao receber mídia nova", () => {
  const preparation = getPlaylistMediaPreparation([first,second,third], {
    [first.preview]:"file:///a.mp4",
    [second.preview]:"file:///b.mp4",
  });
  assert.deepEqual(preparation, { total:3, cached:2, pendingUrls:[third.preview] });
});

test("mídia pendente não pode assumir a tela", () => {
  assert.equal(shouldDeferMediaAdvance({ native:true, item:third, pendingUrls:new Set([third.preview]) }), true);
});

test("mídia validada pode seguir para o gate real do elemento", () => {
  assert.equal(shouldDeferMediaAdvance({ native:true, item:third, pendingUrls:new Set() }), false);
});

test("cache quente não cria download, aviso ou gate falso", () => {
  const preparation = getPlaylistMediaPreparation([first,second], {
    [first.preview]:"file:///a.mp4",
    [second.preview]:"file:///b.mp4",
  });
  assert.deepEqual(preparation, { total:2, cached:2, pendingUrls:[] });
});

test("template não participa do gate de mídia", () => {
  const template = { playerItemType:"template", preview:"https://cdn/background.jpg" };
  assert.equal(shouldDeferMediaAdvance({ native:true, item:template, pendingUrls:new Set([template.preview]) }), false);
});

test("mídia pendente é pulada sem bloquear o próximo item pronto", () => {
  assert.equal(findNextReadyMediaIndex({ items:[first,second,third], currentIndex:0, native:true, pendingUrls:new Set([second.preview]) }), 2);
});

test("último item pronto continua o ciclo sem congelar no pendente", () => {
  assert.equal(findNextReadyMediaIndex({ items:[first,second], currentIndex:0, native:true, pendingUrls:new Set([second.preview]) }), 0);
});

test("item deferido entra naturalmente quando deixa de estar pendente", () => {
  assert.equal(findNextReadyMediaIndex({ items:[first,second], currentIndex:0, native:true, pendingUrls:new Set() }), 1);
});

test("feedback público usa textos históricos sem contador técnico", () => {
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /Baixando conteúdo…/);
  assert.match(source, /Conteúdo atualizado ✓/);
  assert.doesNotMatch(source, />\s*\{playerCacheSyncLabel\}\s*</);
});

test("feedback preserva o canto inferior direito histórico", () => {
  const css = fs.readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
  assert.match(css, /\.offline-cache-status\s*\{[^}]*position:\s*fixed;[^}]*right:\s*18px;[^}]*bottom:\s*18px;/s);
});

test("remotePreview pendente entra obrigatoriamente na fila nativa", () => {
  const item = { type:"Vídeo", remotePreview:"https://cdn/new.mp4" };
  assert.deepEqual(getNativeOfflineQueueUrls([first.preview], [item]), [first.preview,item.remotePreview]);
});

test("reconcile encontra pending sem fila nem FileTransfer", () => {
  assert.deepEqual(getUntrackedPendingMediaUrls({ pendingUrls:[third.preview] }), [third.preview]);
});

test("reconcile não duplica mídia queued ou downloading", () => {
  assert.deepEqual(getUntrackedPendingMediaUrls({ pendingUrls:[second.preview,third.preview], queuedUrls:new Set([second.preview]), activeUrls:new Set([third.preview]) }), []);
});

test("seis vídeos e três templates contam exatamente seis mídias cacheáveis", () => {
  const videos = Array.from({ length:6 }, (_, index) => ({ id:`video-${index}`, type:"Vídeo", preview:`https://cdn/video-${index}.mp4` }));
  const templates = Array.from({ length:3 }, (_, index) => ({ id:`template-${index}`, playerItemType:"template", templateType:"marketing", imageUrl:`https://cdn/template-${index}.jpg` }));
  assert.equal(getPlaylistMediaPreparation([...videos,...templates], {}).total, 6);
});

test("preview e remotePreview de representações do mesmo item contam uma unidade", () => {
  const representations = [
    { mediaId:"media-1", type:"Vídeo", preview:"https://cdn/alias.mp4" },
    { mediaId:"media-1", type:"Vídeo", preview:"file:///cached.mp4", remotePreview:"https://cdn/original.mp4" },
  ];
  const entries = getCanonicalPlaylistMediaEntries(representations);
  assert.equal(entries.length, 1);
  assert.deepEqual(new Set(entries[0].aliases), new Set(["https://cdn/alias.mp4","https://cdn/original.mp4"]));
});

test("general assets e aliases de playlist geram uma única URL canônica na fila", () => {
  const item = { mediaId:"media-1", type:"Vídeo", preview:"https://cdn/alias.mp4", remotePreview:"https://cdn/original.mp4" };
  assert.deepEqual(getNativeOfflineQueueUrls([item.preview,item.remotePreview,"https://cdn/logo.png"], [item]), ["https://cdn/logo.png",item.remotePreview]);
});

test("seis vídeos locais resultam em 6/6 e sétimo ausente resulta em 6/7", () => {
  const videos = Array.from({ length:7 }, (_, index) => ({ mediaId:`media-${index}`, type:"Vídeo", preview:`https://cdn/video-${index}.mp4` }));
  const localMap = Object.fromEntries(videos.slice(0,6).map((item) => [item.preview,`file:///video-${item.mediaId}.mp4`]));
  assert.deepEqual(getPlaylistMediaPreparation(videos.slice(0,6),localMap), { total:6, cached:6, pendingUrls:[] });
  assert.deepEqual(getPlaylistMediaPreparation(videos,localMap), { total:7, cached:6, pendingUrls:[videos[6].preview] });
  assert.deepEqual(getPlaylistMediaPreparation(videos,{ ...localMap, [videos[6].preview]:"file:///video-6.mp4" }), { total:7, cached:7, pendingUrls:[] });
});
