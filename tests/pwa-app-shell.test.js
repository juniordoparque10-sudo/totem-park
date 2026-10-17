import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

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

function createWorkerHarness() {
  const listeners = {};
  const context = {
    URL,
    Promise,
    caches: {
      open: async () => ({ addAll: async () => {} }),
      keys: async () => [],
      match: async () => null,
    },
    fetch: async () => ({ ok: true }),
    self: {
      location: { href: "https://preview.example/sw.js?v=test", origin: "https://preview.example" },
      addEventListener(type, handler) { listeners[type] = handler; },
      skipWaiting() {},
      clients: { claim() {} },
    },
  };
  vm.runInNewContext(workerSource, context);
  return listeners;
}

test("the worker leaves cross-origin media requests to the browser", () => {
  const listeners = createWorkerHarness();
  let intercepted = false;

  listeners.fetch({
    request: { method: "GET", mode: "cors", url: "https://firebasestorage.googleapis.com/v0/b/totem-park/o/image.png" },
    respondWith() { intercepted = true; },
  });

  assert.equal(intercepted, false);
});

test("the worker still handles same-origin application resources", () => {
  const listeners = createWorkerHarness();
  let intercepted = false;

  listeners.fetch({
    request: { method: "GET", mode: "cors", url: "https://preview.example/assets/index.js" },
    respondWith() { intercepted = true; },
  });

  assert.equal(intercepted, true);
});
