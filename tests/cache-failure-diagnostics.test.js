import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createCacheFailureDiagnostic,
  getCacheFailureCode,
} from "../src/cache-failure-diagnostics.js";

test("falhas individuais são resumidas sem URLs ou tokens", () => {
  const errors = [
    Object.assign(new Error("HTTP 403 https://cdn.example/video.mp4?token=secret"), { code:"E_HTTP" }),
    new Error("Empty downloaded file"),
    new Error("Empty downloaded file"),
  ];

  const diagnostic = createCacheFailureDiagnostic("item", 3, errors);

  assert.deepEqual(diagnostic, {
    cacheFailureMode:"item",
    cacheFailureCount:3,
    cacheFailureCodes:["E_HTTP", "EMPTY_DOWNLOADED_FILE"],
  });
  assert.doesNotMatch(JSON.stringify(diagnostic), /cdn\.example|token|secret/i);
});

test("exceção geral é identificada como pipeline", () => {
  const diagnostic = createCacheFailureDiagnostic(
    "pipeline",
    8,
    [new Error("Filesystem unavailable at file:///private/cache")],
  );

  assert.deepEqual(diagnostic, {
    cacheFailureMode:"pipeline",
    cacheFailureCount:8,
    cacheFailureCodes:["FILESYSTEM_UNAVAILABLE_AT_RESOURCE"],
  });
});

test("preparação bem-sucedida não registra falha", () => {
  const diagnostic = createCacheFailureDiagnostic("none", 0, []);

  assert.deepEqual(diagnostic, {
    cacheFailureMode:"none",
    cacheFailureCount:0,
    cacheFailureCodes:[],
  });
});

test("normalização é determinística, limitada e não altera o erro original", () => {
  const error = new Error("Download failed https://cdn.example/media.mp4?signature=abc");
  const originalMessage = error.message;

  assert.equal(getCacheFailureCode(error), "DOWNLOAD_FAILED_RESOURCE");
  assert.equal(error.message, originalMessage);
});

test("instrumentação permanece passiva e reutiliza o update de status existente", () => {
  const helperSource = readFileSync(new URL("../src/cache-failure-diagnostics.js", import.meta.url), "utf8");
  const cacheSource = readFileSync(new URL("../src/offline-player-cache.js", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(helperSource, /\b(fetch|XMLHttpRequest|CapacitorHttp|FileTransfer|Filesystem)\b/);
  assert.match(cacheSource, /mediaFailureCodes\.push\(getCacheFailureCode\(error\)\)/);
  assert.match(appSource, /cacheFailureMode:[\s\S]*cacheFailureCount:[\s\S]*cacheFailureCodes:/);
  assert.doesNotMatch(appSource, /cacheFailureDiagnostic[^\n]*(fetch|download)/i);
});
