import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareConsolidatedAssets } from "../scripts/prepare-player-consolidated-assets.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname.slice(process.platform === "win32" ? 1 : 0));

test("V70 updates the installed rcsecurelink package without touching the official player", () => {
  const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle"), "utf8");
  const block = gradle.match(/playerConsolidatedExperimental\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
  assert.match(block, /versionCode\s+70/);
  assert.match(block, /versionName\s+"1\.0\.0-v70-experimental"/);
  assert.match(block, /applicationIdSuffix\s+"\.player\.rcsecurelink"/);
  assert.match(block, /Totem Park Player CONSOLIDADO EXP/);
  const official = gradle.match(/playerRc\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
  assert.match(official, /versionCode\s+70/);
  assert.match(official, /versionName\s+"1\.0\.0-v70-official-candidate"/);
  assert.doesNotMatch(official, /applicationIdSuffix/);
  const officialEnv = fs.readFileSync(path.join(root, ".env.playerRc"), "utf8");
  assert.match(officialEnv, /VITE_APP_VERSION=1\.0\.0-v70-official-candidate/);
  assert.match(officialEnv, /VITE_PLAYER_OPERATIONAL_TELEMETRY=1/);
  const plugins = JSON.parse(fs.readFileSync(path.join(root, "android/app/src/playerRc/assets/capacitor.plugins.json"), "utf8"));
  assert.deepEqual(plugins.map((item) => item.pkg).sort(), ["@capacitor/file-transfer", "@capacitor/filesystem"]);
});

test("asset preparation replaces the isolated app shell and emits ordered hashes", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "totem-consolidated-"));
  const dist = path.join(temporary, "dist");
  const target = path.join(temporary, "android/app/src/playerConsolidatedExperimental/assets/public");
  fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dist, "index.html"), '<script src="/assets/app.js"></script>');
  fs.writeFileSync(path.join(dist, "assets/app.js"), "approved");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "stale.js"), "old");
  const result = prepareConsolidatedAssets({ distDir: dist, targetDir: target, allowedRoot: temporary });
  assert.equal(fs.existsSync(path.join(target, "stale.js")), false);
  assert.deepEqual(result.files.map((entry) => entry.path), ["assets/app.js", "index.html"]);
  assert.equal(fs.existsSync(path.join(target, "bundle-manifest.json")), true);
  fs.rmSync(temporary, { recursive: true, force: true });
});
