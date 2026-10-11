export const FIRST_UPLOAD_PROGRESS_TIMEOUT_MS = 30_000;

export function isStandalonePwa({
  matchMedia = globalThis.matchMedia,
  navigator = globalThis.navigator,
} = {}) {
  const displayModeStandalone = typeof matchMedia === "function"
    && Boolean(matchMedia("(display-mode: standalone)")?.matches);
  return displayModeStandalone || navigator?.standalone === true;
}

export function shouldClearUploadInputImmediately({ standalone, native }) {
  return !standalone && !native;
}

export function shouldRetryUploadWithStableFile({ error, standalone, native }) {
  if (native) return true;
  return standalone && error?.code === "storage/no-initial-progress";
}

export function recordUploadStage(stage, context = {}) {
  console.info("[TotemParkUpload]", stage, context);
}

export function createUploadPreviewLifecycle({
  createObjectURL = globalThis.URL?.createObjectURL?.bind(globalThis.URL),
  revokeObjectURL = globalThis.URL?.revokeObjectURL?.bind(globalThis.URL),
} = {}) {
  let currentUrl = "";

  const release = () => {
    if (!currentUrl) return false;
    const url = currentUrl;
    currentUrl = "";
    revokeObjectURL?.(url);
    return true;
  };

  return {
    replace(file) {
      release();
      currentUrl = file && createObjectURL ? createObjectURL(file) : "";
      return currentUrl;
    },
    release,
    current() {
      return currentUrl;
    },
  };
}

export function observeResumableUploadTask({
  task,
  onProgress,
  onStage = recordUploadStage,
  timeoutMs = FIRST_UPLOAD_PROGRESS_TIMEOUT_MS,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let sawStateChange = false;
    let sawFirstByte = false;
    let unsubscribe = null;
    let unsubscribePending = false;

    const cleanup = () => {
      clearTimer(timeoutId);
      if (unsubscribe) {
        const stopObserving = unsubscribe;
        unsubscribe = null;
        stopObserving();
      } else {
        unsubscribePending = true;
      }
    };

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };

    const timeoutId = setTimer(() => {
      if (settled || sawFirstByte) return;
      const error = new Error("O envio não começou dentro do tempo esperado. Verifique a conexão e tente novamente.");
      error.code = "storage/no-initial-progress";
      settled = true;
      onStage("UPLOAD_START_TIMEOUT", { timeoutMs });
      cleanup();
      try {
        task.cancel?.();
      } catch {
        // O erro original de ausência de progresso continua sendo o resultado útil.
      }
      reject(error);
    }, timeoutMs);

    onStage("UPLOAD_TASK_CREATED", { timeoutMs });
    unsubscribe = task.on(
      "state_changed",
      (snapshot) => {
        if (settled) return;
        const totalBytes = Number(snapshot.totalBytes || 0);
        const bytesTransferred = Number(snapshot.bytesTransferred || 0);
        if (!sawStateChange) {
          sawStateChange = true;
          onStage("FIRST_STATE_CHANGED", { totalBytes });
        }
        if (!sawFirstByte && bytesTransferred > 0) {
          sawFirstByte = true;
          clearTimer(timeoutId);
          onStage("FIRST_UPLOAD_BYTE", { bytesTransferred, totalBytes });
        }
        const percent = totalBytes > 0
          ? Math.round((bytesTransferred / totalBytes) * 100)
          : 0;
        onProgress?.(percent);
      },
      (error) => {
        if (settled) return;
        onStage("UPLOAD_ERROR", { code: error?.code || "unknown" });
        finish(reject, error);
      },
      () => {
        if (settled) return;
        onStage("UPLOAD_COMPLETED");
        finish(resolve, task.snapshot);
      }
    );
    if (unsubscribePending && unsubscribe) {
      const stopObserving = unsubscribe;
      unsubscribe = null;
      stopObserving();
    }
  });
}
