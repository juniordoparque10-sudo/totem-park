const ENABLED = ["playerJumpDiag", "playerDecoderExperiment"].includes(import.meta.env.VITE_APP_MODE);
const KEY = "totempark-jump-diagnostics-v1";
const MAX = 180;
const MIN_SAMPLE_MS = 1000;
let events = [];
let lastTimeSample = new Map();
let lastTimeline = new Map();
let instanceIds = new WeakMap();
let nextInstanceId = 1;
let persistTimer = null;
let persistUrgent = false;

function safeSource(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return String(value).split("?")[0];
  }
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
if (ENABLED) events = load().slice(-MAX);

export function jumpDiagnosticEnabled() { return ENABLED; }
export function getJumpEvents() { return ENABLED ? [...events] : []; }
export function recordJumpEvent(type, data = {}) {
  if (!ENABLED) return;
  const entry = { at: new Date().toISOString(), clockMs: Date.now(), type, ...data };
  events.push(entry);
  if (events.length > MAX) events.splice(0, events.length - MAX);
  const urgent = type.startsWith("UNEXPECTED_") || type === "VIDEO_ERROR";
  if (urgent && persistTimer && !persistUrgent) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!persistTimer) {
    persistUrgent = urgent;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistUrgent = false;
      try { localStorage.setItem(KEY, JSON.stringify(events)); } catch { /* diagnostics must never interrupt playback */ }
    }, urgent ? 0 : 1500);
  }
  window.dispatchEvent(new Event("totempark-jump-diagnostic"));
}

export function mediaElementSnapshot(video, mediaId, index, extra = {}) {
  return {
    mediaId, index, instanceId: video ? instanceIds.get(video) || null : null,
    src: safeSource(video?.src), currentSrc: safeSource(video?.currentSrc),
    currentTime: Number(video?.currentTime || 0), duration: Number(video?.duration || 0),
    readyState: video?.readyState, networkState: video?.networkState,
    paused: video?.paused, ended: video?.ended, seeking: video?.seeking,
    playbackRate: video?.playbackRate, errorCode: video?.error?.code || null,
    ...extra,
  };
}

export function registerVideoElement(video, context) {
  if (!ENABLED) return;
  if (video) {
    if (instanceIds.has(video)) return;
    instanceIds.set(video, nextInstanceId++);
    recordJumpEvent("VIDEO_MOUNT", mediaElementSnapshot(video, context.mediaId, context.index, { reactKey: context.reactKey }));
  } else if (context.previousNode) {
    recordJumpEvent("VIDEO_UNMOUNT", mediaElementSnapshot(context.previousNode, context.mediaId, context.index, { reactKey: context.reactKey }));
    lastTimeline.delete(context.previousNode);
  }
}

export function recordVideoEvent(type, video, context) {
  if (!ENABLED || !video) return;
  const now = performance.now();
  const snapshot = mediaElementSnapshot(video, context.mediaId, context.index, { reactKey: context.reactKey });
  if (type === "timeupdate") {
    const previousSampleAt = lastTimeSample.get(video) || 0;
    if (now - previousSampleAt < MIN_SAMPLE_MS) return;
    lastTimeSample.set(video, now);
    const previous = lastTimeline.get(video);
    const elapsed = previous ? (now - previous.at) / 1000 : 0;
    const delta = previous ? snapshot.currentTime - previous.currentTime : 0;
    if (previous && !video.seeking && !context.expectedTransition) {
      if (delta < -0.35) recordJumpEvent("UNEXPECTED_TIME_BACKWARD", { ...snapshot, previousCurrentTime: previous.currentTime, delta, elapsedSeconds: elapsed });
      if (delta > elapsed * Math.max(1, video.playbackRate) + 0.75) recordJumpEvent("UNEXPECTED_TIME_FORWARD", { ...snapshot, previousCurrentTime: previous.currentTime, delta, elapsedSeconds: elapsed });
    }
    lastTimeline.set(video, { at: now, currentTime: snapshot.currentTime });
  }
  recordJumpEvent(`VIDEO_${type.toUpperCase()}`, snapshot);
}

export function recordCurrentTimeAssignment(video, nextTime, reason, context = {}) {
  if (!ENABLED) return;
  recordJumpEvent("CURRENTTIME_ASSIGNMENT", {
    ...mediaElementSnapshot(video, context.mediaId || "", context.index ?? -1),
    previousCurrentTime: video?.currentTime, nextCurrentTime: nextTime, reason,
    stack: new Error().stack?.split("\n").slice(1, 4).join(" | "),
  });
}

export function recordSrcChange(video, previousSrc, nextSrc, context = {}) {
  if (!ENABLED || previousSrc === nextSrc) return;
  recordJumpEvent("VIDEO_SRC_CHANGE", {
    ...mediaElementSnapshot(video, context.mediaId || "", context.index ?? -1),
    previousSrc: safeSource(previousSrc), nextSrc: safeSource(nextSrc), reason: context.reason || "render",
  });
}
