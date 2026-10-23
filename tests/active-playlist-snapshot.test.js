import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlaylistAbsenceConfirmationCoordinator,
  createPlaylistListenerScope,
  resolvePlaylistDirectConfirmation,
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

test("snapshot negativo remoto exige confirmação direta antes de declarar ausência", () => {
  const result = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ exists:false, fromCache:false }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(result.status, "confirming");
  assert.equal(result.resolved, false);
  assert.equal(result.replacePlaylist, false);
  assert.equal(result.playlist, null);
  assert.equal(result.serverConfirmed, false);
});

test("confirmação direta existente restaura a playlist com seus 11 itens", () => {
  const items = Array.from({ length:11 }, (_, index) => ({ id:`media-${index + 1}` }));
  const result = resolvePlaylistDirectConfirmation({
    snapshot:firestoreSnapshot({
      id:"yrU4FOldXjb8alBO3X5i",
      exists:true,
      fromCache:false,
      data:{ name:"Experimental", items },
    }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(result.status, "available");
  assert.equal(result.replacePlaylist, true);
  assert.equal(result.playlist.items.length, 11);
  assert.equal(result.serverConfirmed, true);
});

test("confirmação direta negativa declara ausência definitiva", () => {
  const result = resolvePlaylistDirectConfirmation({
    snapshot:firestoreSnapshot({ exists:false, fromCache:false }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(result.status, "absent");
  assert.equal(result.resolved, true);
  assert.equal(result.replacePlaylist, true);
  assert.equal(result.playlist, null);
  assert.equal(result.serverConfirmed, true);
});

test("erro transitório na confirmação preserva conteúdo autorizado e não declara ausência", () => {
  const playlist = { id:"playlist-1", items:[{ id:"media-1" }] };
  const result = resolvePlaylistDirectConfirmation({
    error:new Error("offline"),
    listenerScope:scope,
    activeScope:scope,
    retained:{ scope, playlist },
  });
  assert.equal(result.status, "available");
  assert.equal(result.replacePlaylist, false);
  assert.deepEqual(result.playlist, playlist);
  assert.equal(result.serverConfirmed, false);
});

test("erro transitório sem conteúdo mantém indisponibilidade explícita até reconexão", () => {
  const failed = resolvePlaylistDirectConfirmation({
    error:new Error("offline"),
    listenerScope:scope,
    activeScope:scope,
  });
  const recovered = resolvePlaylistDirectConfirmation({
    snapshot:firestoreSnapshot({ exists:true, fromCache:false, data:{ name:"Recovered" } }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(failed.status, "unavailable");
  assert.equal(failed.replacePlaylist, false);
  assert.equal(recovered.status, "available");
  assert.equal(recovered.playlist.name, "Recovered");
});

test("confirmações simultâneas do mesmo escopo compartilham uma única consulta", async () => {
  const coordinator = createPlaylistAbsenceConfirmationCoordinator();
  let calls = 0;
  let release;
  const confirmation = new Promise((resolve) => { release = resolve; });
  const loadFromServer = () => {
    calls += 1;
    return confirmation;
  };
  const first = coordinator.confirm({ scope, loadFromServer });
  const second = coordinator.confirm({ scope, loadFromServer });
  assert.equal(calls, 1);
  assert.equal(first, second);
  release(firestoreSnapshot({ exists:false, fromCache:false }));
  const result = await first;
  assert.equal(result.status, "confirmed");
});

test("ausência já confirmada não dispara nova consulta sem mudança do escopo", async () => {
  const coordinator = createPlaylistAbsenceConfirmationCoordinator();
  let calls = 0;
  const loadFromServer = async () => {
    calls += 1;
    return firestoreSnapshot({ exists:false, fromCache:false });
  };
  await coordinator.confirm({ scope, loadFromServer });
  const repeated = await coordinator.confirm({ scope, loadFromServer });
  assert.equal(calls, 1);
  assert.equal(repeated.status, "confirmed");
});

test("callback positivo mais recente torna obsoleta uma confirmação negativa anterior", async () => {
  const coordinator = createPlaylistAbsenceConfirmationCoordinator();
  let release;
  const pending = coordinator.confirm({
    scope,
    loadFromServer:() => new Promise((resolve) => { release = resolve; }),
  });
  coordinator.observeAvailable(scope);
  release(firestoreSnapshot({ exists:false, fromCache:false }));
  assert.equal((await pending).status, "stale");
});

test("troca de playlist torna obsoleta a confirmação do escopo anterior", async () => {
  const coordinator = createPlaylistAbsenceConfirmationCoordinator();
  let release;
  const pending = coordinator.confirm({
    scope,
    loadFromServer:() => new Promise((resolve) => { release = resolve; }),
  });
  const nextScope = createPlaylistListenerScope({
    clientId:"client-1", screenId:"screen-1", playlistId:"playlist-2", generation:2,
  });
  coordinator.activate(nextScope);
  release(firestoreSnapshot({ exists:false, fromCache:false }));
  assert.equal((await pending).status, "stale");
});

test("conteúdo retido de outro escopo não é preservado após falha da confirmação", () => {
  const otherScope = createPlaylistListenerScope({
    clientId:"client-1", screenId:"screen-1", playlistId:"playlist-2", generation:2,
  });
  const result = resolvePlaylistDirectConfirmation({
    error:new Error("offline"),
    listenerScope:otherScope,
    activeScope:otherScope,
    retained:{ scope, playlist:{ id:"playlist-1", items:[{ id:"media-1" }] } },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.playlist, null);
  assert.equal(result.replacePlaylist, false);
});

test("contexto revogado rejeita confirmação positiva sem disponibilizar conteúdo", () => {
  const revokedScope = createPlaylistListenerScope({
    clientId:"client-1", screenId:"screen-1", playlistId:"playlist-1", generation:2,
  });
  const result = resolvePlaylistDirectConfirmation({
    snapshot:firestoreSnapshot({ exists:true, fromCache:false, data:{ items:[{ id:"media-1" }] } }),
    listenerScope:scope,
    activeScope:revokedScope,
  });
  assert.equal(result.status, "ignored");
  assert.equal(result.replacePlaylist, false);
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
