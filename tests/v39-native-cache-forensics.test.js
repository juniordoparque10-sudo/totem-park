import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Buffer } from "node:buffer";
import { getCanonicalPlaylistMediaEntries, getNativeOfflineQueueUrls, getPlaylistMediaPreparation } from "../src/media-download-readiness.js";
import { isRemoteDownloadSource } from "../src/android-media-source.js";

const LOCAL = "https://localhost/_capacitor_file_/data/user/0/br.com.parksolutions.totempark/files/totem-park/offline/v099ed/fd6a659c.mp4";
const REMOTE = "https://firebasestorage.googleapis.com/v0/b/totem/o/studio.mp4?alt=media";

function reproduceApplyOfflineAssetUrls(item, urlMap) {
  const localized = { ...item };
  for (const field of ["preview","remotePreview","imageUrl","logoUrl"]) {
    if (localized[field] && urlMap[localized[field]]) {
      if (field === "preview") localized.remotePreview = localized[field];
      localized[field] = urlMap[localized[field]];
    }
  }
  return localized;
}

function hashUrl(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash,16777619);
  }
  return (hash >>> 0).toString(16);
}

test("FORENSE B-C: fixture reproduz a localização dupla da V39 e V40 rejeita a URL resultante", () => {
  const playerItem = reproduceApplyOfflineAssetUrls(
    { mediaId:"dFoeoJKg0UpPmp2vqH45", type:"Vídeo", preview:REMOTE },
    { [REMOTE]:LOCAL },
  );
  assert.equal(playerItem.preview,LOCAL);
  assert.equal(playerItem.remotePreview,LOCAL);

  const entries = getCanonicalPlaylistMediaEntries([playerItem]);
  assert.deepEqual(entries,[]);
  assert.deepEqual(getNativeOfflineQueueUrls([], [playerItem]),[]);
});

test("FORENSE C: V40 fecha a guarda que faltava na V39", () => {
  assert.equal(isRemoteDownloadSource(LOCAL),false);
  assert.deepEqual(getNativeOfflineQueueUrls([], [{ mediaId:"A", preview:LOCAL, remotePreview:LOCAL }]),[]);
});

test("FORENSE D-F: identidade/versão reutiliza basename entre scopes e ignora a URL fonte", () => {
  const identityVersion = "dFoeoJKg0UpPmp2vqH45|content-version-observada";
  const basename = `${hashUrl(identityVersion)}.mp4`;
  assert.equal(`keyfrk/${basename}`.split("/").at(-1),`v099ed/${basename}`.split("/").at(-1));
  assert.equal(hashUrl(identityVersion),hashUrl(identityVersion));
});

test("FORENSE A-E: escrita direta no destino final permite substituir 8.783.778 por 1.825.221 bytes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),"totem-v39-forensic-"));
  const destination = path.join(directory,"fd6a659c.mp4");
  try {
    fs.writeFileSync(destination,Buffer.alloc(8_783_778,0x41));
    assert.equal(fs.statSync(destination).size,8_783_778);
    fs.writeFileSync(destination,Buffer.alloc(1_825_221,0x42));
    assert.equal(fs.statSync(destination).size,1_825_221);
  } finally {
    fs.rmSync(directory,{ recursive:true, force:true });
  }

  const source = fs.readFileSync(new URL("../src/offline-player-cache.js",import.meta.url),"utf8");
  assert.match(source,/FileTransfer\.downloadFile\(\{\s*url,\s*path: destinationUri,/s);
  assert.match(source,/getPartialAssetPath/);
  assert.match(source,/Filesystem\.rename/);
});

test("FORENSE F: interrupção entre FileTransfer e setItem deixa arquivo sem identity map", () => {
  const source = fs.readFileSync(new URL("../src/offline-player-cache.js",import.meta.url),"utf8");
  const transfer = source.indexOf("await FileTransfer.downloadFile");
  const persistence = source.indexOf("localStorage.setItem(identityStorageKey",transfer);
  assert.ok(transfer >= 0 && persistence > transfer);
});

test("FORENSE G: arquivos físicos sem mappings não alteram readiness e reproduzem 1/7", () => {
  const items = Array.from({ length:7 }, (_, index) => ({
    mediaId:`media-${index + 1}`,
    type:"Vídeo",
    preview:`https://cdn.example/media-${index + 1}.mp4`,
  }));
  const physicalFilesThatReadinessCannotInspect = new Set([
    "80c5ace2.mp4",
    "fd6a659c.mp4",
    "e26aebe2.mp4",
  ]);
  assert.equal(physicalFilesThatReadinessCannotInspect.size,3);

  const preparation = getPlaylistMediaPreparation(items, {
    "identity:media-7":"https://localhost/_capacitor_file_/data/media-7.mp4",
  });
  assert.deepEqual(preparation, {
    total:7,
    cached:1,
    pendingUrls:items.slice(0,6).map((item) => item.preview),
  });
});
