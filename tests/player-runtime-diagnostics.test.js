import test from "node:test";
import assert from "node:assert/strict";

import {
  createDecoderTransitionDiagnostics,
  createPlayerDiagnosticLogger,
  describePlayerDiagnosticItem,
  installPlayerGlobalErrorDiagnostics,
} from "../src/player-runtime-diagnostics.js";

test("decoder transition diagnostics report lifecycle state changes once without controlling playback", () => {
  const output = [];
  const diagnostics = createPlayerDiagnosticLogger({
    sink: (line) => output.push(JSON.parse(line.slice("TOTEMPARK-DIAG ".length))),
    now: () => 100,
  });
  const transition = createDecoderTransitionDiagnostics({ diagnostics });
  const context = {
    previous: { mediaId: "media-a", index: 0 },
    next: { mediaId: "media-b", index: 1 },
    playbackExecutionId: 9,
    readyMediaKey: "",
  };

  assert.equal(transition.releaseStarted(context), true);
  assert.equal(transition.releaseStarted(context), false);
  assert.equal(transition.releaseConfirmed({ ...context, remainingVideoCount: 0 }), true);
  assert.equal(transition.mountStarted(context), true);
  assert.equal(transition.readyConfirmed({ ...context, readyMediaKey: "ready-b" }), true);
  assert.equal(transition.pendingExited({ ...context, reason: "ready" }), true);

  assert.deepEqual(output.map(({ event }) => event), [
    "DECODER_RELEASE_STARTED",
    "DECODER_RELEASE_CONFIRMED",
    "NEXT_MEDIA_MOUNT_STARTED",
    "NEXT_MEDIA_READY_CONFIRMED",
    "DECODER_PENDING_EXITED",
  ]);
  assert.deepEqual(context.previous, { mediaId: "media-a", index: 0 });
  assert.deepEqual(context.next, { mediaId: "media-b", index: 1 });
});

test("decoder transition diagnostics distinguish failure cancellation and stale callbacks", () => {
  const output = [];
  const diagnostics = createPlayerDiagnosticLogger({
    sink: (line) => output.push(JSON.parse(line.slice("TOTEMPARK-DIAG ".length))),
    now: () => 200,
  });
  const transition = createDecoderTransitionDiagnostics({ diagnostics });

  transition.failed({ stage: "mount", playbackExecutionId: 10, message: "https://private.example/video" });
  transition.cancelled({ stage: "release", playbackExecutionId: 10, reason: "context-changed" });
  transition.staleCallback({ callback: "ready", playbackExecutionId: 9, activePlaybackExecutionId: 10 });

  assert.deepEqual(output.map(({ event }) => event), [
    "DECODER_TRANSITION_FAILED",
    "DECODER_TRANSITION_CANCELLED",
    "DECODER_STALE_CALLBACK",
  ]);
  assert.doesNotMatch(JSON.stringify(output), /private\.example/);
});

test("media diagnostics expose stable identifiers and type without source URLs", () => {
  const descriptor = describePlayerDiagnosticItem({
    id: "item-7",
    mediaId: "media-9",
    templateId: "template-2",
    playerItemType: "template",
    type: "Imagem",
    preview: "https://private.example/image.png?token=secret",
    title: "Customer private title",
  }, 4);

  assert.deepEqual(descriptor, {
    index: 4,
    itemId: "item-7",
    mediaId: "media-9",
    templateId: "template-2",
    itemType: "template",
  });
});

test("diagnostic events redact URLs, credentials, e-mails and sensitive fields", () => {
  const output = [];
  const diagnostics = createPlayerDiagnosticLogger({
    sink: (line) => output.push(line),
    now: () => 1234,
  });

  diagnostics.emit("MEDIA_ERROR", {
    mediaId: "media-42",
    index: 3,
    url: "https://secret.example/video.mp4?token=abc",
    token: "secret-token",
    detail: "Falha para user@example.com em https://secret.example/file",
  });

  assert.equal(output.length, 1);
  assert.match(output[0], /^TOTEMPARK-DIAG /);
  assert.match(output[0], /"mediaId":"media-42"/);
  assert.match(output[0], /"index":3/);
  assert.doesNotMatch(output[0], /secret\.example|secret-token|user@example\.com|video\.mp4/);
  assert.match(output[0], /"url":"\[REDACTED\]"/);
  assert.match(output[0], /"token":"\[REDACTED\]"/);
});

test("diagnostic events suppress an unchanged state but retain state changes", () => {
  const output = [];
  let timestamp = 100;
  const diagnostics = createPlayerDiagnosticLogger({
    sink: (line) => output.push(line),
    now: () => timestamp,
  });

  diagnostics.emit("MEDIA_PENDING", { mediaId: "a", index: 0 }, { dedupeKey: "current-media" });
  timestamp = 200;
  diagnostics.emit("MEDIA_PENDING", { mediaId: "a", index: 0 }, { dedupeKey: "current-media" });
  timestamp = 300;
  diagnostics.emit("MEDIA_PENDING", { mediaId: "b", index: 1 }, { dedupeKey: "current-media" });

  assert.equal(output.length, 2);
  assert.match(output[0], /"mediaId":"a"/);
  assert.match(output[1], /"mediaId":"b"/);
});

test("bootstrap spans report start, success, failure and elapsed time", () => {
  const output = [];
  let timestamp = 1000;
  const diagnostics = createPlayerDiagnosticLogger({
    sink: (line) => output.push(JSON.parse(line.slice("TOTEMPARK-DIAG ".length))),
    now: () => timestamp,
  });

  const clientStage = diagnostics.startStage("CLIENT_LOAD", { clientId: "client-1" });
  timestamp = 1125;
  clientStage.success({ source: "remote" });
  const playlistStage = diagnostics.startStage("PLAYLIST_LOAD", { playlistId: "playlist-1" });
  timestamp = 1200;
  playlistStage.failure(new Error("permission denied at https://secret.example"));

  assert.deepEqual(output.map(({ event, status, elapsedMs }) => ({ event, status, elapsedMs })), [
    { event: "BOOTSTRAP_STAGE", status: "start", elapsedMs: 0 },
    { event: "BOOTSTRAP_STAGE", status: "success", elapsedMs: 125 },
    { event: "BOOTSTRAP_STAGE", status: "start", elapsedMs: 0 },
    { event: "BOOTSTRAP_STAGE", status: "failure", elapsedMs: 75 },
  ]);
  assert.doesNotMatch(JSON.stringify(output), /secret\.example/);
});

test("global JavaScript failures are captured and listeners are removable", () => {
  const listeners = new Map();
  const target = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const output = [];
  const diagnostics = createPlayerDiagnosticLogger({ sink: (line) => output.push(line), now: () => 50 });
  const remove = installPlayerGlobalErrorDiagnostics({ target, diagnostics });

  listeners.get("error")({ message: "Falha em https://private.example", filename: "https://private.example/app.js", lineno: 9, colno: 2, error: new TypeError("boom") });
  listeners.get("unhandledrejection")({ reason: new Error("token=secret") });

  assert.equal(output.length, 2);
  assert.match(output[0], /"event":"WINDOW_ERROR"/);
  assert.match(output[0], /"errorType":"TypeError"/);
  assert.doesNotMatch(output.join("\n"), /private\.example|token=secret|app\.js/);
  assert.match(output[1], /"event":"UNHANDLED_REJECTION"/);

  remove();
  assert.equal(listeners.size, 0);
});
