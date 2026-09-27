export const STORAGE_KEY = "totempark-sealed-telemetry-2a2c";
export const CHECKPOINT_MS = 5 * 60 * 1000;
export const HISTORY_MS = 15 * 60 * 1000;
export const MAX_LOCAL_BYTES = 512 * 1024;
const MAX_EVENTS = 40;
const MAX_TRANSITIONS = 20;
const MAX_OUTBOX = 12;

export function sourceKind(value) {
  const source = String(value || "").trim();
  if (!source) return "UNKNOWN";
  if (/^(file|content|capacitor):\/\//i.test(source)) return "CACHE_LOCAL";
  if (source.startsWith("/_capacitor_file_/")) return "CACHE_LOCAL";
  try {
    const url = new URL(source);
    if (url.pathname.startsWith("/_capacitor_file_/")) return "CACHE_LOCAL";
    if (/^https?:$/i.test(url.protocol)) return "INTERNET_FALLBACK";
  } catch { /* Unknown source remains unknown. */ }
  return "UNKNOWN";
}

export function isAllowed(config, identity) {
  return Boolean(config?.enabled === true && (
    config.screenIds?.includes(identity.screenId)
    || config.clientIds?.includes(identity.clientId)
    || config.deviceIds?.includes(identity.deviceId)
  ));
}

function freshState(identity, now) {
  return {
    schemaVersion: 1,
    session: {
      ...identity,
      sessionId: globalThis.crypto?.randomUUID?.() || `${now}-${Math.random().toString(16).slice(2)}`,
      startedAt: new Date(now).toISOString(),
      lastActivityAt: new Date(now).toISOString(),
      lastHeartbeatAt: null,
      sequence: 0,
      appVersion: "1.0-player-2a2-c-sidecar-perf-diag",
      platform: "ANDROID",
    },
    current: {
      mediaSource: "UNKNOWN",
      mediaType: "UNKNOWN",
      currentSrc: "",
      connectionStatus: navigator.onLine ? "ONLINE" : "OFFLINE",
      playbackActive: false,
      lastPlayerEvent: "SESSION_START",
      lastError: null,
      lastErrorAt: null,
    },
    counters: {
      localPlaybackCount: 0,
      remotePlaybackCount: 0,
      waitingCount: 0,
      stalledCount: 0,
      playbackErrors: 0,
      displayTimeMs: 0,
    },
    lastPlayerEvents: [],
    transitions: [],
    outbox: [],
    lastQueuedAtMs: 0,
    lastSyncedSequence: 0,
  };
}

export function createObserver({ documentRef = document, storage = localStorage, now = Date.now, onCheckpoint = () => {}, onTrace = () => {} } = {}) {
  const nodes = new WeakSet();
  const nodeIds = new WeakMap();
  let nextNodeId = 0;
  let enabled = false;
  let state = null;
  let mutationObserver = null;
  let checkpointTimer = null;
  let lastPersistAt = 0;
  let persistQueued = false;
  let previousNodeId = null;
  let previousMedia = null;
  let flagSeen = false;

  function writeLocalState() {
    if (!state) return;
    const serializeStarted = performance.now();
    onTrace("SERIALIZE_START");
    let json = JSON.stringify(state);
    while (json.length > MAX_LOCAL_BYTES && state.lastPlayerEvents.length > 5) {
      state.lastPlayerEvents.shift();
      json = JSON.stringify(state);
    }
    while (json.length > MAX_LOCAL_BYTES && state.outbox.length > 1) {
      state.outbox.shift();
      json = JSON.stringify(state);
    }
    onTrace("SERIALIZE_END", {
      durationMs: performance.now() - serializeStarted,
      chars: json.length,
      approximateBytes: json.length * 2,
    });
    const writeStarted = performance.now();
    onTrace("LOCALSTORAGE_WRITE_START", { approximateBytes: json.length * 2 });
    let success = true;
    try { storage.setItem(STORAGE_KEY, json); } catch { success = false; }
    onTrace("LOCALSTORAGE_WRITE_END", {
      durationMs: performance.now() - writeStarted,
      approximateBytes: json.length * 2,
      success,
    });
    lastPersistAt = now();
  }

  function persist(force = false) {
    if (!state || (!force && now() - lastPersistAt < 1000)) return;
    if (force) { writeLocalState(); return; }
    if (persistQueued) return;
    persistQueued = true;
    onTrace("EVENT_PERSIST_SCHEDULED");
    const saveLater = () => { persistQueued = false; writeLocalState(); };
    if (typeof globalThis.requestIdleCallback === "function") {
      globalThis.requestIdleCallback(saveLater, { timeout: 2000 });
    } else {
      setTimeout(saveLater, 50);
    }
  }

  function eventOf(node, name) {
    const src = node.currentSrc || node.src || "";
    return {
      timestamp: new Date(now()).toISOString(),
      event: name,
      mediaSource: sourceKind(src),
      mediaType: node.tagName?.toLowerCase() === "video" ? "VIDEO" : "IMAGE",
      currentTime: Number.isFinite(node.currentTime) ? node.currentTime : null,
      readyState: Number.isFinite(node.readyState) ? node.readyState : null,
      networkState: Number.isFinite(node.networkState) ? node.networkState : null,
      errorCode: node.error?.code || null,
      nodeId: nodeIds.get(node),
    };
  }

  function record(node, name) {
    if (!enabled || !state) return;
    const event = eventOf(node, name);
    const current = state.current;
    const nodeId = event.nodeId;
    if ((name === "playing" || name === "load") && previousNodeId !== null && previousNodeId !== nodeId) {
      state.transitions.push({
        fromNodeId: previousNodeId,
        toNodeId: nodeId,
        fromMediaSource: previousMedia?.mediaSource || "UNKNOWN",
        toMediaSource: event.mediaSource,
        observedAt: event.timestamp,
        result: "OBSERVED",
      });
      state.transitions = state.transitions.slice(-MAX_TRANSITIONS);
    }
    if (name === "playing" || name === "load") {
      if (!current.playbackActive || current.nodeId !== nodeId || current.currentSrc !== (node.currentSrc || node.src || "")) {
        if (event.mediaSource === "CACHE_LOCAL") state.counters.localPlaybackCount += 1;
        if (event.mediaSource === "INTERNET_FALLBACK") state.counters.remotePlaybackCount += 1;
      }
      current.playbackActive = true;
      previousNodeId = nodeId;
      previousMedia = event;
    }
    if (["ended", "error", "abort", "emptied"].includes(name)) current.playbackActive = false;
    if (name === "waiting") state.counters.waitingCount += 1;
    if (name === "stalled") state.counters.stalledCount += 1;
    if (name === "error") {
      state.counters.playbackErrors += 1;
      current.lastError = event.errorCode === 3 ? "MEDIA_ERR_DECODE" : "MEDIA_ERROR";
      current.lastErrorAt = event.timestamp;
    }
    Object.assign(current, {
      mediaSource: event.mediaSource,
      mediaType: event.mediaType,
      currentSrc: node.currentSrc || node.src || "",
      nodeId,
      lastPlayerEvent: name,
    });
    state.session.lastActivityAt = event.timestamp;
    state.lastPlayerEvents.push(event);
    state.lastPlayerEvents = state.lastPlayerEvents.slice(-MAX_EVENTS);
    persist();
  }

  function attach(node) {
    if (nodes.has(node)) return;
    nodes.add(node);
    nodeIds.set(node, ++nextNodeId);
    const names = node.tagName?.toLowerCase() === "video"
      ? ["play", "playing", "pause", "waiting", "stalled", "canplay", "ended", "error", "emptied", "abort"]
      : ["load", "error", "abort"];
    for (const name of names) node.addEventListener(name, () => {
      if (["error", "waiting", "playing", "stalled"].includes(name)) {
        onTrace(`MEDIA_${name.toUpperCase()}`, {
          errorCode: node.error?.code || null,
          currentSrc: String(node.currentSrc || node.src || "").split(/[?#]/, 1)[0],
          currentTime: Number.isFinite(node.currentTime) ? node.currentTime : null,
          readyState: Number.isFinite(node.readyState) ? node.readyState : null,
          networkState: Number.isFinite(node.networkState) ? node.networkState : null,
          mediaId: node.dataset?.mediaId || null,
          nodeId: nodeIds.get(node),
        });
      }
      record(node, name);
    }, { passive: true });
    if (node.tagName?.toLowerCase() === "video") {
      node.addEventListener("loadstart", () => onTrace("MEDIA_LOADSTART", {
        currentSrc: String(node.currentSrc || node.src || "").split(/[?#]/, 1)[0],
        nodeId: nodeIds.get(node),
      }), { passive: true });
    }
  }

  function scan(root) {
    if (root?.matches?.("video,img")) attach(root);
    root?.querySelectorAll?.("video,img").forEach(attach);
  }

  function checkpoint() {
    if (!enabled || !state) return;
    const tick = now();
    state.current.connectionStatus = navigator.onLine ? "ONLINE" : "OFFLINE";
    state.session.lastHeartbeatAt = new Date(tick).toISOString();
    state.counters.displayTimeMs = Math.max(0, tick - Date.parse(state.session.startedAt));
    if (tick - state.lastQueuedAtMs < CHECKPOINT_MS) return;
    const buildStarted = performance.now();
    onTrace("CHECKPOINT_BUILD_START");
    state.session.sequence += 1;
    state.lastQueuedAtMs = tick;
    const payload = {
      schemaVersion: 1,
      session: { ...state.session },
      current: { ...state.current },
      counters: { ...state.counters },
      lastPlayerEvents: state.lastPlayerEvents.slice(-4),
      transitions: state.transitions.slice(-2),
    };
    const approximateBytes = JSON.stringify(payload).length * 2;
    onTrace("CHECKPOINT_BUILD_END", {
      durationMs: performance.now() - buildStarted,
      approximateBytes,
      sequence: state.session.sequence,
    });
    state.outbox.push({ sessionId: state.session.sessionId, sequence: state.session.sequence, payload });
    state.outbox = state.outbox.slice(-MAX_OUTBOX);
    persist(true);
    onCheckpoint(state.outbox.at(-1));
  }

  return {
    start(identity) {
      if (mutationObserver) return;
      let previous = null;
      try { previous = JSON.parse(storage.getItem(STORAGE_KEY) || "null"); } catch { /* Corrupt local buffer is ignored. */ }
      state = freshState(identity, now());
      if (Array.isArray(previous?.outbox)) state.outbox = previous.outbox.slice(-MAX_OUTBOX);
      scan(documentRef);
      mutationObserver = new MutationObserver((records) => {
        for (const record of records) for (const node of record.addedNodes) scan(node);
      });
      mutationObserver.observe(documentRef.documentElement, { childList: true, subtree: true });
      checkpointTimer = setInterval(checkpoint, 15000);
      persist(true);
    },
    setEnabled(value) {
      const next = Boolean(value);
      if (!flagSeen || enabled !== next) onTrace(next ? "TELEMETRY_ENABLED" : "TELEMETRY_DISABLED");
      flagSeen = true;
      enabled = next;
    },
    checkpoint,
    pending: () => state?.outbox.slice() || [],
    acknowledge(sessionId, sequence) {
      if (!state) return;
      if (sessionId === state.session.sessionId) {
        state.lastSyncedSequence = Math.max(state.lastSyncedSequence, Number(sequence));
      }
      state.outbox = state.outbox.filter((item) =>
        item.payload?.session?.sessionId !== sessionId || item.sequence > Number(sequence));
      persist(true);
    },
    report: () => state && JSON.parse(JSON.stringify(state)),
    stop() { enabled = false; mutationObserver?.disconnect(); clearInterval(checkpointTimer); mutationObserver = null; checkpointTimer = null; },
  };
}
