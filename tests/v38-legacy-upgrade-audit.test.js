import test from "node:test";
import assert from "node:assert/strict";
import { migrateLegacyIdentityRecord } from "../src/native-cache-identity.js";

const validateExactSize = (actual, expected) => ({
  valid: Number(actual) > 0 && Number(actual) === Number(expected),
  actual: Number(actual || 0),
  expected: Number(expected || 0),
});

test("AUDIT V37 -> V38: URL histórica válida não migra quando deixou de ser alias atual", async () => {
  let statCalls = 0;
  const migrated = await migrateLegacyIdentityRecord({
    rawMap: { OLD_URL: "file:///legacy/media-a.mp4" },
    aliases: ["NEW_URL1", "NEW_URL2"],
    cacheIdentity: "media:A",
    canonicalUrl: "NEW_URL1",
    expectedSizeBytes: 1_024,
    getLegacyPath: (alias) => `totem-park/offline/scope/${alias}`,
    statFile: async () => {
      statCalls += 1;
      return { size: 1_024, uri: "file:///legacy/media-a.mp4" };
    },
    validateFile: validateExactSize,
  });

  assert.equal(migrated, null);
  assert.equal(statCalls, 0, "o arquivo existente nem chega a ser verificado sem igualdade literal de URL");
});

test("AUDIT V37 -> V38: cache legado 7/7 vira exatamente 1/7 quando só o alias mais recente permanece igual", async () => {
  const rawMap = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `V37_URL_${index + 1}`,
      `file:///legacy/media-${index + 1}.mp4`,
    ])
  );

  const results = await Promise.all(
    Array.from({ length: 7 }, (_, index) => {
      const ordinal = index + 1;
      const currentAlias = ordinal === 7 ? "V37_URL_7" : `V38_URL_${ordinal}`;
      return migrateLegacyIdentityRecord({
        rawMap,
        aliases: [currentAlias],
        cacheIdentity: `media:${ordinal}`,
        canonicalUrl: currentAlias,
        expectedSizeBytes: ordinal * 1_000,
        getLegacyPath: (alias) => `totem-park/offline/scope/${alias}`,
        statFile: async () => ({
          size: ordinal * 1_000,
          uri: `file:///legacy/media-${ordinal}.mp4`,
        }),
        validateFile: validateExactSize,
      });
    })
  );

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results[6]?.cacheIdentity, "media:7");
  assert.deepEqual(results.slice(0, 6), Array(6).fill(null));
});
