import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveClientDirectConfirmation,
  resolveClientSnapshot,
} from "../src/player-bootstrap-client.js";
import {
  createPlaylistListenerScope,
  resolvePlaylistDirectConfirmation,
  resolvePlaylistSnapshot,
} from "../src/active-playlist-snapshot.js";
import { shouldShowPlayerEmptyState } from "../src/player-startup-state.js";

function firestoreSnapshot({ id, exists, fromCache, hasPendingWrites = false, data = {} }) {
  return {
    id,
    exists:() => exists,
    data:() => data,
    metadata:{ fromCache, hasPendingWrites },
  };
}

test("cliente ausente apenas no cache não libera o gate nem apaga cliente válido", () => {
  const cachedClient = { id:"client-1", name:"Cliente" };
  const withoutLocalClient = resolveClientSnapshot({
    snapshot:firestoreSnapshot({ id:"client-1", exists:false, fromCache:true }),
    currentClient:null,
  });
  const withLocalClient = resolveClientSnapshot({
    snapshot:firestoreSnapshot({ id:"client-1", exists:false, fromCache:true }),
    currentClient:cachedClient,
  });

  assert.equal(withoutLocalClient.status, "waiting");
  assert.equal(withoutLocalClient.resolved, false);
  assert.equal(withoutLocalClient.replaceClient, false);
  assert.equal(withLocalClient.resolved, true);
  assert.deepEqual(withLocalClient.client, cachedClient);
});

test("callback positivo posterior recupera integralmente o cliente", () => {
  const result = resolveClientSnapshot({
    snapshot:firestoreSnapshot({
      id:"client-1",
      exists:true,
      fromCache:false,
      data:{ name:"Cliente", plan:"Profissional" },
    }),
    currentClient:null,
  });

  assert.equal(result.status, "available");
  assert.equal(result.resolved, true);
  assert.equal(result.replaceClient, true);
  assert.deepEqual(result.client, { id:"client-1", name:"Cliente", plan:"Profissional" });
});

test("cliente sem cache solicita confirmação remota antes de liberar o gate", () => {
  const cacheMiss = resolveClientSnapshot({
    snapshot:firestoreSnapshot({ id:"client-1", exists:false, fromCache:true }),
    currentClient:null,
  });

  assert.equal(cacheMiss.status, "waiting");
  assert.equal(cacheMiss.resolved, false);
  assert.equal(cacheMiss.needsServerConfirmation, true);

  const confirmed = resolveClientDirectConfirmation({
    snapshot:firestoreSnapshot({
      id:"client-1",
      exists:true,
      fromCache:false,
      data:{ name:"Cliente", plan:"Profissional" },
    }),
    currentClient:cacheMiss.client,
  });

  assert.equal(confirmed.serverConfirmed, true);
  assert.equal(confirmed.resolved, true);
  assert.equal(confirmed.client.id, "client-1");
});

test("negativo remoto do cliente exige confirmação direta antes de limpar estado", () => {
  const currentClient = { id:"client-1", name:"Cliente" };
  const result = resolveClientSnapshot({
    snapshot:firestoreSnapshot({ id:"client-1", exists:false, fromCache:false }),
    currentClient,
  });

  assert.equal(result.status, "confirming");
  assert.equal(result.resolved, true);
  assert.equal(result.replaceClient, false);
  assert.deepEqual(result.client, currentClient);
});

test("confirmação direta existente recupera o cliente após negativo contraditório", () => {
  const result = resolveClientDirectConfirmation({
    snapshot:firestoreSnapshot({
      id:"client-1",
      exists:true,
      fromCache:false,
      data:{ name:"Cliente", plan:"Profissional" },
    }),
    currentClient:null,
  });

  assert.equal(result.status, "available");
  assert.equal(result.replaceClient, true);
  assert.equal(result.client.id, "client-1");
});

test("erro remoto sem cliente confirmado mantém o gate fechado", () => {
  const result = resolveClientDirectConfirmation({
    error:Object.assign(new Error("offline"), { code:"unavailable" }),
    currentClient:null,
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.resolved, false);
  assert.equal(result.replaceClient, false);
  assert.equal(result.client, null);
});

test("erro remoto preserva cliente local válido para reprodução offline", () => {
  const cachedClient = { id:"client-1", name:"Cliente" };
  const result = resolveClientDirectConfirmation({
    error:Object.assign(new Error("offline"), { code:"unavailable" }),
    currentClient:cachedClient,
  });

  assert.equal(result.status, "available");
  assert.equal(result.resolved, true);
  assert.deepEqual(result.client, cachedClient);
});

test("bootstrap sem cliente nem playlist no cache recupera servidor e chega à reprodução elegível", () => {
  const clientCache = resolveClientSnapshot({
    snapshot:firestoreSnapshot({ id:"client-1", exists:false, fromCache:true }),
    currentClient:null,
  });
  assert.equal(clientCache.resolved, false);

  const clientServer = resolveClientSnapshot({
    snapshot:firestoreSnapshot({
      id:"client-1",
      exists:true,
      fromCache:false,
      data:{ name:"Cliente", plan:"Profissional" },
    }),
    currentClient:clientCache.client,
  });

  const scope = createPlaylistListenerScope({
    clientId:"client-1",
    screenId:"screen-1",
    playlistId:"yrU4FOldXjb8alBO3X5i",
    generation:1,
  });
  const playlistCache = resolvePlaylistSnapshot({
    snapshot:firestoreSnapshot({ id:"yrU4FOldXjb8alBO3X5i", exists:false, fromCache:true }),
    listenerScope:scope,
    activeScope:scope,
  });
  assert.equal(playlistCache.resolved, false);

  const playlistItems = Array.from({ length:11 }, (_, index) => ({ id:`media-${index + 1}` }));
  const playlistServer = resolvePlaylistDirectConfirmation({
    snapshot:firestoreSnapshot({
      id:"yrU4FOldXjb8alBO3X5i",
      exists:true,
      fromCache:false,
      data:{ items:playlistItems },
    }),
    listenerScope:scope,
    activeScope:scope,
  });
  const templatesResolved = true;
  const emptyState = shouldShowPlayerEmptyState({
    loading:false,
    clientLoading:!clientServer.resolved,
    playlistResolved:playlistServer.resolved,
    templatesResolved,
    activePlaylist:playlistServer.playlist,
    screenTemplates:[],
  });
  const playbackEligible = Boolean(
    clientServer.client
    && clientServer.resolved
    && playlistServer.resolved
    && playlistServer.playlist?.items?.length === 11
    && templatesResolved
    && !emptyState
  );

  assert.equal(clientServer.client.id, "client-1");
  assert.equal(playlistServer.playlist.items.length, 11);
  assert.equal(playbackEligible, true);
});
