import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import { createPlayerScreenSnapshotStore } from "../src/player-screen-snapshot.js";

test("snapshot da tela permanece isolado por cliente e tela", () => {
  const store = createPlayerScreenSnapshotStore();

  store.activate("client-a/screen-a");
  assert.equal(store.observe("client-a/screen-a", { status: "online" }, { authoritative: true }), true);
  assert.equal(store.observe("client-b/screen-b", { status: "revoked" }, { authoritative: true }), false);
  assert.deepEqual(store.read("client-a/screen-a"), {
    authoritative: true,
    data: { status: "online" },
  });
});
test("troca de tela invalida o snapshot anterior e callbacks atrasados", () => {
  const store = createPlayerScreenSnapshotStore();

  store.activate("client-a/screen-a");
  store.observe("client-a/screen-a", { generation: 1 }, { authoritative: true });
  store.activate("client-a/screen-b");

  assert.equal(store.read("client-a/screen-a"), null);
  assert.equal(store.read("client-a/screen-b"), null);
  assert.equal(store.observe("client-a/screen-a", { generation: 2 }, { authoritative: true }), false);
});

test("snapshot de cache pode iniciar recuperação sem autorizar decisões remotas", () => {
  const store = createPlayerScreenSnapshotStore();

  store.activate("client-a/screen-a");
  store.observe("client-a/screen-a", { remoteCommand: { type: "exitTv" } }, { authoritative: false });

  assert.deepEqual(store.read("client-a/screen-a"), {
    authoritative: false,
    data: { remoteCommand: { type: "exitTv" } },
  });
  assert.equal(store.readAuthoritative("client-a/screen-a"), null);
});

test("snapshot confirmado substitui o cache e pode ser lido pelo heartbeat", () => {
  const store = createPlayerScreenSnapshotStore();

  store.activate("client-a/screen-a");
  store.observe("client-a/screen-a", { status: "cached" }, { authoritative: false });
  store.observe("client-a/screen-a", { status: "server" }, { authoritative: true });

  assert.deepEqual(store.readAuthoritative("client-a/screen-a"), { status: "server" });
});

test("heartbeat reutiliza o snapshot do listener sem leitura equivalente", () => {
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf("async function sendHeartbeat()");
  const end = source.indexOf("sendHeartbeat();", start);
  const heartbeat = source.slice(start, end);

  assert.ok(start >= 0 && end > start, "função de heartbeat deve existir");
  assert.doesNotMatch(heartbeat, /getDoc\s*\(/);
  assert.doesNotMatch(heartbeat, /getDocs\s*\(/);
  assert.match(heartbeat, /playerScreenSnapshotRef\.current\.read\(screenScope\)/);
  assert.match(source, /setInterval\([^]*OPERATIONAL_HEARTBEAT_INTERVAL_MS\)/);
});
