import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const registerSource = fs.readFileSync(new URL("../src/pwa-register.js", import.meta.url), "utf8");
const workerSource = fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("the installed PWA versions its worker from the executable bundle", () => {
  assert.match(registerSource, /getCurrentBundleFingerprint/);
  assert.match(registerSource, /register\(`\/sw\.js\?v=\$\{encodeURIComponent\(fingerprint\)\}`, \{ updateViaCache: "none" \}\)/);
  assert.match(workerSource, /new URL\(self\.location\.href\)\.searchParams\.get\("v"\)/);
  assert.doesNotMatch(workerSource, /const CACHE_NAME = "totem-park-pwa-v3"/);
});

test("the worker only retires app-shell caches and never handles upload writes", () => {
  assert.match(workerSource, /key\.startsWith\("totem-park-pwa-shell-"\)/);
  assert.doesNotMatch(workerSource, /totempark-player-media-v1/);
  assert.match(workerSource, /if \(request\.method !== "GET"\) return;/);
});

test("service worker registration has one authoritative owner", () => {
  assert.doesNotMatch(indexSource, /serviceWorker[\s\S]*?register\("\/sw\.js"\)/);
});
