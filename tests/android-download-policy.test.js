import assert from "node:assert/strict";
import test from "node:test";
import {
  ANDROID_DOWNLOAD_POLICY,
  createProgressReporter,
  isNativeTimeout,
  resetDownloadPolicyForTests,
  runSingleFlightDownload,
  shouldRetryDownload,
  validateDownloadedFile,
} from "../src/android-download-policy.js";

test("aceita arquivo completo e rejeita vazio ou tamanho divergente", () => {
  assert.equal(validateDownloadedFile(100, 100).valid, true);
  assert.equal(validateDownloadedFile(100, 0).valid, true);
  assert.deepEqual(validateDownloadedFile(0, 100).reason, "empty");
  assert.deepEqual(validateDownloadedFile(99, 100).reason, "size-mismatch");
});

test("timeout é de inatividade nativa e não existe limite de duração total", () => {
  assert.equal(ANDROID_DOWNLOAD_POLICY.inactivityTimeoutMs, 60000);
  assert.equal("totalTimeoutMs" in ANDROID_DOWNLOAD_POLICY, false);
  assert.equal(isNativeTimeout({ message: "Read timed out" }), true);
});

test("progresso lento continua emitindo telemetria sem cancelar a operação", () => {
  const events = [];
  let clock = 0;
  const report = createProgressReporter({
    onEvent: (type, data) => events.push({ type, ...data }),
    now: () => clock,
    policy: { ...ANDROID_DOWNLOAD_POLICY, progressMinBytes: 10, progressMaxIntervalMs: 1000 },
  });
  report({ bytes: 5, contentLength: 100 });
  clock = 1100;
  report({ bytes: 6, contentLength: 100 });
  clock = 1200;
  report({ bytes: 20, contentLength: 100 });
  assert.deepEqual(events.map((event) => event.bytes), [6, 20]);
});

test("retry ocorre uma vez só quando nenhuma parte do arquivo foi recebida", () => {
  const error = { code: "OS-PLUG-FLTR-0008", message: "Failed to connect" };
  assert.equal(shouldRetryDownload({ error, partialSize: 0, attempt: 1 }), true);
  assert.equal(shouldRetryDownload({ error, partialSize: 1, attempt: 1 }), false);
  assert.equal(shouldRetryDownload({ error, partialSize: 0, attempt: 2 }), false);
  assert.equal(shouldRetryDownload({ error: { message: "HTTP 404" }, partialSize: 0, attempt: 1 }), false);
});

test("single-flight compartilha uma transferência concorrente da mesma mídia", async () => {
  resetDownloadPolicyForTests();
  let starts = 0;
  let release;
  const operation = () => {
    starts += 1;
    return new Promise((resolve) => { release = resolve; });
  };
  const first = runSingleFlightDownload("same-media", operation);
  const second = runSingleFlightDownload("same-media", operation);
  await Promise.resolve();
  assert.equal(starts, 1);
  release("ok");
  assert.equal(await first, "ok");
  assert.equal(await second, "ok");
});
