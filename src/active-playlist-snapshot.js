function normalizeScopePart(value) {
  return String(value || "").trim();
}

export function createPlaylistListenerScope({ clientId, screenId, playlistId, generation }) {
  return Object.freeze({
    clientId:normalizeScopePart(clientId),
    screenId:normalizeScopePart(screenId),
    playlistId:normalizeScopePart(playlistId),
    generation:Number(generation || 0),
  });
}

export function isSamePlaylistListenerScope(left, right) {
  return Boolean(
    left && right
    && left.clientId === right.clientId
    && left.screenId === right.screenId
    && left.playlistId === right.playlistId
    && left.generation === right.generation
  );
}

function retainedForScope(retained, scope) {
  return isSamePlaylistListenerScope(retained?.scope, scope) && retained?.playlist
    ? retained
    : null;
}

function ignoredResult() {
  return {
    status:"ignored",
    resolved:false,
    replacePlaylist:false,
    playlist:null,
    retained:null,
    serverConfirmed:false,
  };
}

export function resolvePlaylistSnapshot({
  snapshot,
  listenerScope,
  activeScope,
  retained = null,
  networkAvailable = true,
}) {
  if (!isSamePlaylistListenerScope(listenerScope, activeScope)) return ignoredResult();

  const metadata = {
    exists:Boolean(snapshot?.exists?.()),
    fromCache:Boolean(snapshot?.metadata?.fromCache),
    hasPendingWrites:Boolean(snapshot?.metadata?.hasPendingWrites),
  };
  const authorizedRetained = retainedForScope(retained, listenerScope);

  if (metadata.exists) {
    const playlist = { id:snapshot.id, ...snapshot.data() };
    return {
      status:"available",
      resolved:true,
      replacePlaylist:true,
      playlist,
      retained:{ scope:listenerScope, playlist },
      metadata,
      serverConfirmed:!metadata.fromCache && !metadata.hasPendingWrites,
    };
  }

  if (metadata.fromCache || metadata.hasPendingWrites) {
    const status = authorizedRetained
      ? "available"
      : networkAvailable ? "waiting" : "unavailable";
    return {
      status,
      resolved:Boolean(authorizedRetained) || status === "unavailable",
      replacePlaylist:false,
      playlist:authorizedRetained?.playlist || null,
      retained:authorizedRetained,
      metadata,
      serverConfirmed:false,
    };
  }

  return {
    status:"absent",
    resolved:true,
    replacePlaylist:true,
    playlist:null,
    retained:null,
    metadata,
    serverConfirmed:true,
  };
}

export function resolvePlaylistListenerError({ listenerScope, activeScope, retained = null }) {
  if (!isSamePlaylistListenerScope(listenerScope, activeScope)) return ignoredResult();

  const authorizedRetained = retainedForScope(retained, listenerScope);
  return {
    status:authorizedRetained ? "available" : "unavailable",
    resolved:true,
    replacePlaylist:false,
    playlist:authorizedRetained?.playlist || null,
    retained:authorizedRetained,
    serverConfirmed:false,
  };
}
