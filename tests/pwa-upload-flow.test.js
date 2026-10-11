import assert from "node:assert/strict";
import test from "node:test";

import {
  createUploadPreviewLifecycle,
  observeResumableUploadTask,
  shouldClearUploadInputImmediately,
  shouldRetryUploadWithStableFile,
  isStandalonePwa,
} from "../src/pwa-upload-flow.js";

function createTaskDouble() {
  let next;
  let error;
  let complete;
  return {
    snapshot: { ref: { fullPath: "clients/test/media/file.mp4" } },
    cancelCount: 0,
    unsubscribeCount: 0,
    on(eventName, nextHandler, errorHandler, completeHandler) {
      assert.equal(eventName, "state_changed");
      next = nextHandler;
      error = errorHandler;
      complete = completeHandler;
      return () => {
        this.unsubscribeCount += 1;
        next = undefined;
        error = undefined;
        complete = undefined;
      };
    },
    cancel() {
      this.cancelCount += 1;
      return true;
    },
    emitProgress(bytesTransferred, totalBytes = 1_000) {
      next?.({ bytesTransferred, totalBytes });
    },
    emitError(reason) {
      error?.(reason);
    },
    emitComplete() {
      complete?.();
    },
  };
}

function createPreviewHarness() {
  const revoked = [];
  let sequence = 0;
  const lifecycle = createUploadPreviewLifecycle({
    createObjectURL: () => `blob:preview-${++sequence}`,
    revokeObjectURL: (url) => revoked.push(url),
  });
  return { lifecycle, revoked };
}

test("normal file selection creates one owned preview", () => {
  const { lifecycle, revoked } = createPreviewHarness();

  assert.equal(lifecycle.replace({ name: "first.mp4" }), "blob:preview-1");
  assert.deepEqual(revoked, []);
});

test("a new selection revokes the previous owned preview", () => {
  const { lifecycle, revoked } = createPreviewHarness();

  lifecycle.replace({ name: "first.mp4" });
  assert.equal(lifecycle.replace({ name: "second.mp4" }), "blob:preview-2");
  assert.deepEqual(revoked, ["blob:preview-1"]);
});

for (const terminalPath of ["success", "error", "timeout", "cancel", "unmount"]) {
  test(`${terminalPath} releases the selected preview exactly once`, () => {
    const { lifecycle, revoked } = createPreviewHarness();
    lifecycle.replace({ name: "large-video.mp4" });

    lifecycle.release();
    lifecycle.release();

    assert.deepEqual(revoked, ["blob:preview-1"]);
    assert.equal(lifecycle.current(), "");
  });
}

function createTimerHarness() {
  let callback;
  return {
    setTimer(nextCallback) {
      callback = nextCallback;
      return 7;
    },
    clearTimer() {
      callback = undefined;
    },
    fire() {
      callback?.();
    },
    pending() {
      return Boolean(callback);
    },
  };
}

test("normal browser clears the file input immediately", () => {
  assert.equal(isStandalonePwa({ matchMedia: () => ({ matches: false }), navigator: {} }), false);
  assert.equal(shouldClearUploadInputImmediately({ standalone: false, native: false }), true);
});

test("installed PWA is detected on Android and iOS and preserves the input", () => {
  assert.equal(isStandalonePwa({ matchMedia: () => ({ matches: true }), navigator: {} }), true);
  assert.equal(isStandalonePwa({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }), true);
  assert.equal(shouldClearUploadInputImmediately({ standalone: true, native: false }), false);
});

test("installed PWA retries a stalled upload with a stable Blob without changing normal browsers", () => {
  const stalled = { code: "storage/no-initial-progress" };
  assert.equal(shouldRetryUploadWithStableFile({ error: stalled, standalone: true, native: false }), true);
  assert.equal(shouldRetryUploadWithStableFile({ error: stalled, standalone: false, native: false }), false);
  assert.equal(shouldRetryUploadWithStableFile({ error: { code: "storage/unauthorized" }, standalone: true, native: false }), false);
});

test("first byte clears the watchdog and reports progress", async () => {
  const task = createTaskDouble();
  const timer = createTimerHarness();
  const stages = [];
  const progress = [];
  const result = observeResumableUploadTask({
    task,
    timeoutMs: 30_000,
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    onStage: (stage) => stages.push(stage),
    onProgress: (value) => progress.push(value),
  });

  task.emitProgress(0);
  assert.equal(timer.pending(), true);
  task.emitProgress(250, 1_000);
  assert.equal(timer.pending(), false);
  task.emitComplete();

  assert.deepEqual(progress, [0, 25]);
  assert.deepEqual(stages, ["UPLOAD_TASK_CREATED", "FIRST_STATE_CHANGED", "FIRST_UPLOAD_BYTE", "UPLOAD_COMPLETED"]);
  assert.deepEqual(await result, task.snapshot);
  assert.equal(task.unsubscribeCount, 1);
});

test("watchdog cancels a task that never transfers its first byte", async () => {
  const task = createTaskDouble();
  const timer = createTimerHarness();
  const stages = [];
  const result = observeResumableUploadTask({
    task,
    timeoutMs: 30_000,
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    onStage: (stage) => stages.push(stage),
  });

  task.emitProgress(0);
  timer.fire();

  await assert.rejects(result, (reason) => reason?.code === "storage/no-initial-progress");
  assert.equal(task.cancelCount, 1);
  assert.equal(task.unsubscribeCount, 1);
  assert.equal(timer.pending(), false);
  assert.deepEqual(stages, ["UPLOAD_TASK_CREATED", "FIRST_STATE_CHANGED", "UPLOAD_START_TIMEOUT"]);
});

test("normal upload errors reject once and cancel the watchdog", async () => {
  const task = createTaskDouble();
  const timer = createTimerHarness();
  const stages = [];
  const expected = Object.assign(new Error("network failed"), { code: "storage/retry-limit-exceeded" });
  const result = observeResumableUploadTask({
    task,
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    onStage: (stage) => stages.push(stage),
  });

  task.emitError(expected);

  await assert.rejects(result, expected);
  assert.equal(timer.pending(), false);
  assert.equal(task.unsubscribeCount, 1);
  assert.deepEqual(stages, ["UPLOAD_TASK_CREATED", "UPLOAD_ERROR"]);
});

test("Firebase cancellation removes the observer and watchdog", async () => {
  const task = createTaskDouble();
  const timer = createTimerHarness();
  const canceled = Object.assign(new Error("canceled"), { code: "storage/canceled" });
  const result = observeResumableUploadTask({
    task,
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    onStage: () => {},
  });

  task.emitError(canceled);

  await assert.rejects(result, canceled);
  assert.equal(task.unsubscribeCount, 1);
  assert.equal(timer.pending(), false);
});

test("completion without an intermediate snapshot still resolves cleanly", async () => {
  const task = createTaskDouble();
  const timer = createTimerHarness();
  const stages = [];
  const result = observeResumableUploadTask({
    task,
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    onStage: (stage) => stages.push(stage),
  });

  task.emitComplete();

  assert.deepEqual(await result, task.snapshot);
  assert.equal(timer.pending(), false);
  assert.equal(task.unsubscribeCount, 1);
  assert.deepEqual(stages, ["UPLOAD_TASK_CREATED", "UPLOAD_COMPLETED"]);
});
