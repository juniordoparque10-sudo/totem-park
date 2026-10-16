import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("V56 release metadata derives from the installed V55 and keeps remote activity sync disabled", () => {
  const gradle = read("android/app/build.gradle");
  const flavor = gradle.match(/playerRcSecureLinkExperiment\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
  assert.match(flavor, /versionCode 56/);
  assert.match(flavor, /versionName "1\.0\.0-v56-experimental"/);
  assert.match(read("src/player-activity-telemetry.js"), /PLAYER_ACTIVITY_SYNC_ENABLED = false/);
  const provenance = read("docs/verification/player-v56-v55-provenance.md");
  assert.match(provenance, /Decisão do gate físico:\*\* `PASS`/);
  assert.match(provenance, /V55_OPERATIONAL_EQUIVALENCE:\*\* `PASS`/);
});

test("verified release manifest describes one update-in-place APK with the installed certificate", () => {
  const manifestPath = new URL("docs/verification/player-v56-release.json", root);
  const artifactPath = new URL("artifacts/Totem Park Player V56.apk", root);
  assert.equal(existsSync(manifestPath), true);
  assert.equal(existsSync(artifactPath), true);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.status, "PASS");
  assert.equal(manifest.packageName, "br.com.parksolutions.totempark.player.rcsecurelink");
  assert.equal(manifest.activity, "br.com.parksolutions.totempark.MainActivity");
  assert.equal(manifest.versionCode, 56);
  assert.equal(manifest.versionName, "1.0.0-v56-experimental");
  assert.equal(manifest.certificateSha256, "72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7");
  assert.match(manifest.apkSha256, /^[a-f0-9]{64}$/);
});
