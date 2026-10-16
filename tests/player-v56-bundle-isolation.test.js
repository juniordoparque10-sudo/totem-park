import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { prepareExperimentalAssets } from "../scripts/prepare-player-rc-secure-link-assets.mjs";

test("preparation atomically copies only assets referenced by the current experimental build", () => {
  const root = fs.mkdtempSync(path.join(process.cwd(), ".tmp-tp-v56-bundle-"));
  const dist = path.join(root, "dist-player-rc-secure-link");
  const target = path.join(root, "android", "app", "src", "playerRcSecureLinkExperiment", "assets", "public");
  fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dist, "index.html"), '<script type="module" src="/assets/index-current.js"></script><link rel="stylesheet" href="/assets/index-current.css">');
  fs.writeFileSync(path.join(dist, "assets", "index-current.js"), "current");
  fs.writeFileSync(path.join(dist, "assets", "index-current.css"), "current-css");
  fs.writeFileSync(path.join(dist, "manifest-tv.webmanifest"), "{}");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "stale-playerRc.js"), "stale");

  const result = prepareExperimentalAssets({ distDir: dist, targetDir: target });
  assert.equal(fs.existsSync(path.join(target, "stale-playerRc.js")), false);
  assert.equal(fs.existsSync(path.join(target, "assets", "index-current.js")), true);
  const manifest = JSON.parse(fs.readFileSync(path.join(target, "bundle-manifest.json"), "utf8"));
  assert.deepEqual(manifest.files.map((entry) => entry.path).sort(), [
    "assets/index-current.css",
    "assets/index-current.js",
    "index.html",
    "manifest-tv.webmanifest",
  ]);
  assert.equal(manifest.files.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256)), true);
  assert.equal(result.targetDir, target);
  fs.rmSync(root, { recursive: true, force: true });
});

test("preparation rejects missing referenced assets and any non-experimental target", () => {
  const root = fs.mkdtempSync(path.join(process.cwd(), ".tmp-tp-v56-bundle-invalid-"));
  const dist = path.join(root, "dist");
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, "index.html"), '<script type="module" src="/assets/index-missing.js"></script>');
  assert.throws(() => prepareExperimentalAssets({ distDir: dist, targetDir: path.join(root, "web", "public") }), /Destino experimental inesperado/);
  assert.throws(() => prepareExperimentalAssets({ distDir: dist, targetDir: path.join(root, "android", "app", "src", "playerRcSecureLinkExperiment", "assets", "public") }), /Asset referenciado não existe/);
  fs.rmSync(root, { recursive: true, force: true });
});
