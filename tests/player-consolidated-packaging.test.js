import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareConsolidatedAssets } from "../scripts/prepare-player-consolidated-assets.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname.slice(process.platform === "win32" ? 1 : 0));

test("the isolated flavor updates the installed rcsecurelink package at version 67", () => {
  const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle"), "utf8");
  const block = gradle.match(/playerConsolidatedExperimental\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
  assert.match(block, /versionCode\s+67/);
  assert.match(block, /versionName\s+"1\.0\.0-v67-consolidated-experimental"/);
  assert.match(block, /applicationIdSuffix\s+"\.player\.rcsecurelink"/);
  assert.match(block, /Totem Park Player CONSOLIDADO EXP/);
  assert.match(gradle, /playerRc\s*\{[\s\S]*?versionCode\s+40/);
  assert.doesNotMatch(gradle.match(/playerRc\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "", /applicationIdSuffix/);
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
