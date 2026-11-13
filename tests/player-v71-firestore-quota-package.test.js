import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("hotfix de quota usa identificação posterior e coerente no flavor oficial", () => {
  const gradle = fs.readFileSync(new URL("../android/app/build.gradle", import.meta.url), "utf8");
  const env = fs.readFileSync(new URL("../.env.playerRc", import.meta.url), "utf8");
  const playerRc = gradle.slice(gradle.indexOf("playerRc {"), gradle.indexOf("playerRcSecureLinkExperiment {"));

  assert.match(playerRc, /versionCode\s+72/);
  assert.match(playerRc, /versionName\s+"1\.0\.0-v71-firestore-quota-hotfix"/);
  assert.match(env, /VITE_APP_MODE=playerRc/);
  assert.match(env, /VITE_APP_VERSION=1\.0\.0-v71-firestore-quota-hotfix/);
});
