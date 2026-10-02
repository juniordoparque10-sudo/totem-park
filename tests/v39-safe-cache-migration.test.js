import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classifyLegacyIdentityRecord } from "../src/native-cache-identity.js";
import { getPlaylistMediaPreparation } from "../src/media-download-readiness.js";

const validateExactSize = (actual, expected) => ({
  valid:Number(actual) > 0 && Number(actual) === Number(expected),
  actual:Number(actual || 0),
  expected:Number(expected || 0),
});

function classify({ rawMap, aliases, ordinal }) {
  return classifyLegacyIdentityRecord({
    rawMap,
    aliases,
    cacheIdentity:`media:${ordinal}`,
    canonicalUrl:aliases[0],
    expectedSizeBytes:ordinal * 1_000,
    getLegacyPath:(alias) => `totem-park/offline/scope/${alias}`,
    statFile:async () => ({ size:ordinal * 1_000, uri:`file:///legacy/media-${ordinal}.mp4` }),
    validateFile:validateExactSize,
  });
}

test("upgrade V37 7/7: um alias migra e seis permanecem unresolved sem alterar o legado", async () => {
  const rawMap = Object.fromEntries(Array.from({ length:7 }, (_, index) => [
    `V37_URL_${index + 1}`,
    `file:///legacy/media-${index + 1}.mp4`,
  ]));
  const original = structuredClone(rawMap);

  const results = await Promise.all(Array.from({ length:7 }, (_, index) => {
    const ordinal = index + 1;
    return classify({
      rawMap,
      aliases:[ordinal === 7 ? "V37_URL_7" : `V39_URL_${ordinal}`],
      ordinal,
    });
  }));

  assert.equal(results.filter((result) => result.status === "migrated").length, 1);
  assert.equal(results.filter((result) => result.status === "unresolved").length, 6);
  assert.deepEqual(rawMap, original);
});

test("alias legado coincidente migra por stat sem FileTransfer", async () => {
  const result = await classify({
    rawMap:{ CURRENT_URL:"file:///legacy/media-1.mp4" },
    aliases:["CURRENT_URL"],
    ordinal:1,
  });
  assert.equal(result.status, "migrated");
  assert.equal(result.record.cacheIdentity, "media:1");
  assert.equal(result.record.localUri, "file:///legacy/media-1.mp4");
});

test("URL histórica sem associação segura fica unresolved e não é inferida", async () => {
  let statCalls = 0;
  const result = await classifyLegacyIdentityRecord({
    rawMap:{ OLD_URL:"file:///legacy/media-a.mp4" },
    aliases:["NEW_URL1","NEW_URL2"],
    cacheIdentity:"media:A",
    canonicalUrl:"NEW_URL1",
    expectedSizeBytes:10,
    getLegacyPath:(alias) => alias,
    statFile:async () => { statCalls += 1; return { size:10 }; },
    validateFile:validateExactSize,
  });
  assert.equal(result.status, "unresolved");
  assert.equal(result.record, null);
  assert.equal(statCalls, 0);
});

test("alias conhecido com arquivo inválido recebe classificação invalid", async () => {
  const result = await classifyLegacyIdentityRecord({
    rawMap:{ CURRENT_URL:"file:///legacy/missing.mp4" },
    aliases:["CURRENT_URL"],
    cacheIdentity:"media:A",
    canonicalUrl:"CURRENT_URL",
    expectedSizeBytes:10,
    getLegacyPath:(alias) => alias,
    statFile:async () => null,
    validateFile:validateExactSize,
  });
  assert.equal(result.status, "invalid");
  assert.equal(result.record, null);
});

test("identity persistida permanece ready após três aliases e restart", () => {
  const offlineAssetMap = { "identity:media:A":"file:///identity/media-a.mp4" };
  ["https://cdn/URL_1.mp4","https://cdn/URL_2.mp4","https://cdn/URL_3.mp4","https://cdn/URL_1.mp4"].forEach((preview) => {
    assert.deepEqual(
      getPlaylistMediaPreparation([{ mediaId:"media:A", type:"Vídeo", preview }],offlineAssetMap),
      { total:1, cached:1, pendingUrls:[] },
    );
  });
  const restoredMap = JSON.parse(JSON.stringify(offlineAssetMap));
  assert.deepEqual(
    getPlaylistMediaPreparation([{ mediaId:"media:A", type:"Vídeo", preview:"https://cdn/URL_AFTER_RESTART.mp4" }],restoredMap),
    { total:1, cached:1, pendingUrls:[] },
  );
});

test("evento visual nasce junto ao FileTransfer e conclusão ocorre após persistência", () => {
  const source = fs.readFileSync(new URL("../src/offline-player-cache.js",import.meta.url),"utf8");
  const transferCallback = source.indexOf("onTransferStart?.({ downloadId, attempt })");
  const nativeTransfer = source.indexOf("await FileTransfer.downloadFile",transferCallback);
  const persistence = source.indexOf("localStorage.setItem(identityStorageKey");
  const completion = source.indexOf("options.onDownloadComplete?.",persistence);

  assert.ok(transferCallback >= 0 && nativeTransfer > transferCallback);
  assert.ok(persistence >= 0 && completion > persistence);
  assert.doesNotMatch(source,/recordCacheResult\(false, diagnostic\);\s*options\.onDownloadStart/s);
});

test("V39 não contém purge destrutivo de rawMap legado", () => {
  const source = fs.readFileSync(new URL("../src/offline-player-cache.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/for \(const cachedUrl of Object\.keys\(rawMap\)\)/);
  assert.doesNotMatch(source,/delete rawMap\[cachedUrl\]/);
});
