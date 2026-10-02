import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNativeIdentityRecord,
  getNativeIdentityDownloadKey,
  migrateLegacyIdentityRecord,
  resolveNativeIdentityRecord,
} from "../src/native-cache-identity.js";

test("registro persistente agrega aliases sem mudar a identidade", () => {
  const record = buildNativeIdentityRecord({ cacheIdentity:"A", contentVersion:"v1", canonicalUrl:"URL2", aliases:["URL1","URL2"], localUri:"file:///a.mp4", localPath:"cache/a.mp4", sizeBytes:100 });
  assert.equal(record.cacheIdentity,"A");
  assert.deepEqual(record.aliases,["URL2","URL1"]);
  assert.equal(resolveNativeIdentityRecord({ A:record },"A","v1"),record);
});

test("single-flight é estável por identidade e versão, não por alias", () => {
  assert.equal(getNativeIdentityDownloadKey("A","v1"),getNativeIdentityDownloadKey("A","v1"));
  assert.notEqual(getNativeIdentityDownloadKey("A","v1"),getNativeIdentityDownloadKey("A","v2"));
});

test("versão confiável diferente invalida o registro uma única vez", () => {
  const record = buildNativeIdentityRecord({ cacheIdentity:"A", contentVersion:"v1", localUri:"file:///a.mp4", localPath:"cache/a.mp4" });
  assert.equal(resolveNativeIdentityRecord({ A:record },"A","v1"),record);
  assert.equal(resolveNativeIdentityRecord({ A:record },"A","v2"),null);
});

test("cache legado válido migra para identidade sem download", async () => {
  const migrated = await migrateLegacyIdentityRecord({
    rawMap:{ URL2:"file:///legacy.mp4" }, aliases:["URL1","URL2"], cacheIdentity:"A", canonicalUrl:"URL2", expectedSizeBytes:100,
    getLegacyPath:(alias) => `legacy/${alias}`,
    statFile:async () => ({ size:100, uri:"file:///legacy.mp4" }),
    validateFile:(actual,expected) => ({ valid:actual === expected, actual, expected }),
  });
  assert.equal(migrated.cacheIdentity,"A");
  assert.equal(migrated.localUri,"file:///legacy.mp4");
  assert.equal(migrated.sizeBytes,100);
});

test("cache legado inválido não migra e permanece elegível para um download", async () => {
  const migrated = await migrateLegacyIdentityRecord({
    rawMap:{ URL2:"file:///missing.mp4" }, aliases:["URL1","URL2"], cacheIdentity:"A", canonicalUrl:"URL2", expectedSizeBytes:100,
    getLegacyPath:(alias) => `legacy/${alias}`,
    statFile:async () => null,
    validateFile:(actual,expected) => ({ valid:Boolean(actual) && actual === expected, actual, expected }),
  });
  assert.equal(migrated,null);
});
