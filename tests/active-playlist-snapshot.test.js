import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlaylistListenerScope,
  resolvePlaylistListenerError,
  resolvePlaylistSnapshot,
} from "../src/active-playlist-snapshot.js";

function firestoreSnapshot({ id = "playlist-1", exists, fromCache, hasPendingWrites = false, data = {} }) {
  return {
    id,
    exists: () => exists,
    data: () => data,
    metadata: { fromCache, hasPendingWrites },
  };
}

const scope = createPlaylistListenerScope({
  clientId:"client-1",
  screenId:"screen-1",
  playlistId:"playlist-1",
  generation:1,
});

test("cache negativo permanece aguardando o servidor sem declarar ausência", () => {
  const result = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:false, fromCache:true }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(result.status, "waiting");
  assert.equal(result.resolved, false);
  assert.equal(result.replacePlaylist, false);
  assert.deepEqual(result.metadata, { exists:false, fromCache:true, hasPendingWrites:false });
});

test("cache negativo sem conexão produz indisponibilidade explícita", () => {
  const result = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:false, fromCache:true }),
    listenerScope:scope,
    activeScope:scope,
    networkAvailable:false,
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.resolved, true);
  assert.equal(result.replacePlaylist, false);
});

test("snapshot remoto existente após cache negativo disponibiliza a playlist", () => {
  const result = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:true, fromCache:false, data:{ items:[{ id:"media-1" }] } }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(result.status, "available");
  assert.equal(result.resolved, true);
  assert.equal(result.replacePlaylist, true);
  assert.deepEqual(result.playlist, { id:"playlist-1", items:[{ id:"media-1" }] });
});

test("ausência remota sem escrita pendente é definitiva", () => {
  const result = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:false, fromCache:false }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(result.status, "absent");
  assert.equal(result.resolved, true);
  assert.equal(result.replacePlaylist, true);
  assert.equal(result.playlist, null);
});

test("mudança apenas de metadados confirma o documento no servidor", () => {
  const cached = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:true, fromCache:true, data:{ name:"Local" } }),
    listenerScope:scope,
    activeScope:scope,
  });
  const confirmed = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:true, fromCache:false, data:{ name:"Local" } }),
    listenerScope:scope,
    activeScope:scope,
    retained:cached.retained,
  });
  assert.equal(confirmed.status, "available");
  assert.equal(confirmed.metadata.fromCache, false);
  assert.equal(confirmed.serverConfirmed, true);
});

test("snapshot negativo com escrita pendente não confirma exclusão", () => {
  const result = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:false, fromCache:false, hasPendingWrites:true }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(result.status, "waiting");
  assert.equal(result.resolved, false);
  assert.equal(result.replacePlaylist, false);
});

test("erro offline sem conteúdo válido produz indisponibilidade explícita", () => {
  const result = resolvePlaylistListenerError({ listenerScope:scope, activeScope:scope });
  assert.equal(result.status, "unavailable");
  assert.equal(result.resolved, true);
  assert.equal(result.replacePlaylist, false);
});

test("erro preserva conteúdo autorizado somente no mesmo escopo", () => {
  const playlist = { id:"playlist-1", items:[{ id:"media-1" }] };
  const retained = { scope, playlist };
  const sameScope = resolvePlaylistListenerError({ listenerScope:scope, activeScope:scope, retained });
  assert.equal(sameScope.status, "available");
  assert.deepEqual(sameScope.playlist, playlist);

  const switchedScope = createPlaylistListenerScope({
    clientId:"client-1", screenId:"screen-1", playlistId:"playlist-2", generation:2,
  });
  const switched = resolvePlaylistListenerError({ listenerScope:switchedScope, activeScope:switchedScope, retained });
  assert.equal(switched.status, "unavailable");
  assert.equal(switched.playlist, null);
});

test("callback obsoleto após troca de playlist é rejeitado", () => {
  const nextScope = createPlaylistListenerScope({
    clientId:"client-1", screenId:"screen-1", playlistId:"playlist-2", generation:2,
  });
  const result = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:true, fromCache:false }),
    listenerScope:scope,
    activeScope:nextScope,
  });
  assert.equal(result.status, "ignored");
  assert.equal(result.replacePlaylist, false);
});

test("reconexão posterior substitui indisponibilidade por conteúdo remoto", () => {
  const offline = resolvePlaylistListenerError({ listenerScope:scope, activeScope:scope });
  const recovered = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:true, fromCache:false, data:{ name:"Recovered" } }),
    listenerScope:scope,
    activeScope:scope,
    retained:offline.retained,
  });
  assert.equal(recovered.status, "available");
  assert.equal(recovered.playlist.name, "Recovered");
});
