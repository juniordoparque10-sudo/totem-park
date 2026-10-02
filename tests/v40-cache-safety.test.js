import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isRemoteDownloadSource } from "../src/android-media-source.js";
import { localizeOfflineAssetFields } from "../src/offline-asset-localization.js";
import { getCanonicalPlaylistMediaEntries, getNativeOfflineQueueUrls, getPlaylistMediaPreparation } from "../src/media-download-readiness.js";
import { getNativeCacheJournalEntry, updateNativeCacheJournal } from "../src/native-cache-journal.js";
import { promoteNativeCachePartial } from "../src/native-cache-transaction.js";

const REMOTE = "https://firebasestorage.googleapis.com/v0/b/totem/o/video.mp4?alt=media";
const LOCAL = "https://localhost/_capacitor_file_/data/user/0/app/files/video.mp4";
const validate = (actual,expected) => ({ valid:Number(actual) > 0 && (!Number(expected) || Number(actual) === Number(expected)), actual:Number(actual || 0), expected:Number(expected || 0), reason:Number(actual) > 0 ? "size-mismatch" : "empty" });

function memoryStorage() {
  const values = new Map();
  return {
    getItem:(key) => values.has(key) ? values.get(key) : null,
    setItem:(key,value) => values.set(key,String(value)),
  };
}

function memoryFiles(entries = {}) {
  const files = new Map(Object.entries(entries).map(([name,size]) => [name,{ size, uri:`file:///${name}` }]));
  const calls = [];
  return {
    files,
    calls,
    stat:async (name) => files.get(name) || null,
    remove:async (name) => { calls.push(["delete",name]); files.delete(name); },
    rename:async (from,to) => { calls.push(["rename",from,to]); const value=files.get(from); if (!value) throw new Error("missing"); files.delete(from); files.set(to,{ ...value, uri:`file:///${to}` }); },
  };
}

test("A: remotePreview Firebase permanece imutável quando preview vira localhost", () => {
  const localized = localizeOfflineAssetFields({ mediaId:"A", preview:REMOTE, remotePreview:REMOTE },{ [REMOTE]:LOCAL });
  assert.equal(localized.preview,LOCAL);
  assert.equal(localized.remotePreview,REMOTE);
});

test("B/M: guarda central rejeita todas as fontes locais e fila não aceita localhost", () => {
  ["file:///x.mp4","content://media/1","capacitor://localhost/x","blob:https://localhost/x","data:video/mp4;base64,AA==",LOCAL,"http://localhost/_capacitor_file_/x","https://127.0.0.1/x"].forEach((source) => assert.equal(isRemoteDownloadSource(source),false,source));
  assert.equal(isRemoteDownloadSource(REMOTE),true);
  assert.deepEqual(getCanonicalPlaylistMediaEntries([{ mediaId:"A", preview:LOCAL, remotePreview:LOCAL }]),[]);
  assert.deepEqual(getNativeOfflineQueueUrls([LOCAL], [{ mediaId:"A", preview:LOCAL }]),[]);
});

test("C/G: produção verifica path determinístico e journal antes do FileTransfer", () => {
  const source = fs.readFileSync(new URL("../src/offline-player-cache.js",import.meta.url),"utf8");
  const deterministicStat = source.indexOf("const deterministicStat = await statOfflineFile(path)");
  const journalRecovery = source.indexOf("const journalEntry = getNativeCacheJournalEntry",deterministicStat);
  const transfer = source.indexOf("fileInfo = await downloadOfflineFile",journalRecovery);
  assert.ok(deterministicStat >= 0 && journalRecovery > deterministicStat && transfer > journalRecovery);
  assert.match(source,/if \(!isRemoteDownloadSource\(url\)\) throw new Error\("LOCAL_SOURCE_NOT_DOWNLOADABLE"\)/);
});

test("D/E: partial inválido não toca no arquivo final válido", async () => {
  const io = memoryFiles({ "final.mp4":8_783_778, "op.partial":1_825_221 });
  await assert.rejects(promoteNativeCachePartial({ tempPath:"op.partial", finalPath:"final.mp4", expectedSizeBytes:8_783_778, statFile:io.stat, deleteFile:io.remove, renameFile:io.rename, validateFile:validate }),/parcial inválido/);
  assert.equal(io.files.get("final.mp4").size,8_783_778);
  assert.deepEqual(io.calls,[]);
});

test("F: partial válido é promovido somente depois da validação", async () => {
  const io = memoryFiles({ "op.partial":8_783_778 });
  const result = await promoteNativeCachePartial({ tempPath:"op.partial", finalPath:"final.mp4", expectedSizeBytes:8_783_778, statFile:io.stat, deleteFile:io.remove, renameFile:io.rename, validateFile:validate });
  assert.equal(result.fileInfo.size,8_783_778);
  assert.deepEqual(io.calls,[["rename","op.partial","final.mp4"]]);
});

test("D: final já válido nunca é substituído por outro download", async () => {
  const io = memoryFiles({ "final.mp4":8_783_778, "op.partial":8_783_778 });
  const result = await promoteNativeCachePartial({ tempPath:"op.partial", finalPath:"final.mp4", expectedSizeBytes:8_783_778, statFile:io.stat, deleteFile:io.remove, renameFile:io.rename, validateFile:validate });
  assert.equal(result.reusedFinal,true);
  assert.equal(io.files.get("final.mp4").size,8_783_778);
  assert.deepEqual(io.calls,[["delete","op.partial"]]);
});

test("F/G: journal preserva os cinco estados e permite localizar operação após restart", () => {
  const storage = memoryStorage();
  const base = { cacheIdentity:"A", contentVersion:"v1", remoteUrl:REMOTE, tempPath:"A.op.partial", finalPath:"A.mp4", operationId:"op" };
  ["pending","downloading","downloaded","validated","committed"].forEach((state) => updateNativeCacheJournal("cache-key",{ ...base,state },storage));
  assert.equal(getNativeCacheJournalEntry("cache-key","A","v1",storage).state,"committed");
});

test("H/I: bootstrap por identidade resiste a três aliases e restart sem pending", () => {
  const map = { "identity:A":LOCAL };
  ["one","two","one"].forEach((alias) => assert.deepEqual(getPlaylistMediaPreparation([{ mediaId:"A", preview:`https://cdn/${alias}.mp4` }],map),{ total:1,cached:1,pendingUrls:[] }));
  assert.deepEqual(getPlaylistMediaPreparation([{ mediaId:"A",preview:"https://cdn/restart.mp4" }],JSON.parse(JSON.stringify(map))),{ total:1,cached:1,pendingUrls:[] });
});

test("J/K/L: 7/7, oitavo gera exatamente um pending e remoção não afeta restantes", () => {
  const items = Array.from({ length:8 },(_,index) => ({ mediaId:`M${index + 1}`,preview:`https://cdn/M${index + 1}.mp4` }));
  const map = Object.fromEntries(items.slice(0,7).map((item) => [`identity:${item.mediaId}`,`file:///${item.mediaId}.mp4`]));
  assert.deepEqual(getPlaylistMediaPreparation(items.slice(0,7),map),{ total:7,cached:7,pendingUrls:[] });
  assert.deepEqual(getPlaylistMediaPreparation(items,map),{ total:8,cached:7,pendingUrls:[items[7].preview] });
  assert.deepEqual(getPlaylistMediaPreparation(items.slice(1,7),map),{ total:6,cached:6,pendingUrls:[] });
});
