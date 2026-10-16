import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Secure Link experiment is configured as the V57 corrective build", async () => {
  const gradle = await readFile(new URL("../android/app/build.gradle", import.meta.url), "utf8");
  const flavor = gradle.match(/playerRcSecureLinkExperiment\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";

  assert.match(flavor, /applicationIdSuffix\s+"\.player\.rcsecurelink"/);
  assert.match(flavor, /versionCode\s+57/);
  assert.match(flavor, /versionName\s+"1\.0\.0-v57-experimental"/);
});
