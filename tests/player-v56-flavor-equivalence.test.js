import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const buildGradle = fs.readFileSync(new URL("../android/app/build.gradle", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../android/app/src/playerRcSecureLinkExperiment/AndroidManifest.xml", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../android/app/src/playerRcSecureLinkExperiment/res/values/styles.xml", import.meta.url), "utf8");

test("V57 preserves the recovered V55 experimental identity", () => {
  const flavor = buildGradle.match(/playerRcSecureLinkExperiment\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
  assert.match(flavor, /applicationIdSuffix\s+"\.player\.rcsecurelink"/);
  assert.match(flavor, /versionCode\s+57/);
  assert.match(flavor, /versionName\s+"1\.0\.0-v57-experimental"/);
  assert.match(manifest, /android:name="\.MainActivity"/);
  assert.match(manifest, /android:name="\.BootReceiver"[\s\S]*?android:enabled="false"/);
  assert.doesNotMatch(manifest, /android\.intent\.category\.HOME/);
  assert.match(styles, /android:windowBackground">#050816/);
});

test("operational experiment uses the bounded initial Secure Link claim", () => {
  assert.match(appSource, /attemptInitialSecureBinding\(\{/);
  assert.match(appSource, /appBuildMode:\s*APP_BUILD_MODE/);
  assert.match(appSource, /if \(binding\) \{[\s\S]*?finishConnection\(binding\.clientId/);
});
