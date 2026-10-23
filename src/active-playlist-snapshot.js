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

function scopeKey(scope) {
  return scope
    ? `${scope.clientId}|${scope.screenId}|${scope.playlistId}|${scope.generation}`
    : "";
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
    status:"confirming",
    resolved:Boolean(authorizedRetained),
    replacePlaylist:false,
    playlist:authorizedRetained?.playlist || null,
    retained:authorizedRetained,
    metadata,
    serverConfirmed:false,
  };
}

export function resolvePlaylistDirectConfirmation({
  snapshot = null,
  error = null,
  listenerScope,
  activeScope,
  retained = null,
}) {
  if (!isSamePlaylistListenerScope(listenerScope, activeScope)) return ignoredResult();

  const authorizedRetained = retainedForScope(retained, listenerScope);
  if (error) {
    return {
      status:authorizedRetained ? "available" : "unavailable",
      resolved:true,
      replacePlaylist:false,
      playlist:authorizedRetained?.playlist || null,
      retained:authorizedRetained,
      serverConfirmed:false,
    };
  }

  if (snapshot?.exists?.()) {
    const playlist = { id:snapshot.id, ...snapshot.data() };
    return {
      status:"available",
      resolved:true,
      replacePlaylist:true,
      playlist,
      retained:{ scope:listenerScope, playlist },
      serverConfirmed:true,
    };
  }

  return {
    status:"absent",
    resolved:true,
    replacePlaylist:true,
    playlist:null,
    retained:null,
    serverConfirmed:true,
  };
}

export function createPlaylistAbsenceConfirmationCoordinator() {
  let activeScope = null;
  const revisions = new Map();
  const inFlight = new Map();
  const confirmedAbsent = new Map();

  function activate(scope) {
    activeScope = scope;
  }

  function observeAvailable(scope) {
    const key = scopeKey(scope);
    revisions.set(key, (revisions.get(key) || 0) + 1);
    confirmedAbsent.delete(key);
  }

  function confirm({ scope, loadFromServer }) {
    if (!activeScope) activate(scope);
    if (!isSamePlaylistListenerScope(scope, activeScope)) {
      return Promise.resolve({ status:"stale", snapshot:null, error:null });
    }

    const key = scopeKey(scope);
    const revision = revisions.get(key) || 0;
    const requestKey = `${key}|${revision}`;
    const pending = inFlight.get(requestKey);
    if (pending) return pending;
    if (confirmedAbsent.get(key) === revision) {
      return Promise.resolve({ status:"confirmed", snapshot:null, error:null });
    }

    let loadPromise;
    try {
      loadPromise = Promise.resolve(loadFromServer());
    } catch (error) {
      loadPromise = Promise.reject(error);
    }

    const confirmation = loadPromise
      .then((snapshot) => {
        if (!isSamePlaylistListenerScope(scope, activeScope) || (revisions.get(key) || 0) !== revision) {
          return { status:"stale", snapshot:null, error:null };
        }
        if (!snapshot?.exists?.()) confirmedAbsent.set(key, revision);
        return { status:"confirmed", snapshot, error:null };
      })
      .catch((error) => {
        if (!isSamePlaylistListenerScope(scope, activeScope) || (revisions.get(key) || 0) !== revision) {
          return { status:"stale", snapshot:null, error:null };
        }
        return { status:"error", snapshot:null, error };
      })
      .finally(() => {
        if (inFlight.get(requestKey) === confirmation) inFlight.delete(requestKey);
      });
    inFlight.set(requestKey, confirmation);
    return confirmation;
  }

  return { activate, confirm, observeAvailable };
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
