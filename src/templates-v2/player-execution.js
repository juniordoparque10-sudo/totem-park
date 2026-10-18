export function getTemplatePlaybackLayerKey(baseKey, executionId, templateV2) {
  return templateV2 ? `${baseKey}-execution-${executionId}` : baseKey;
}

export function getTemplatePlaybackReadyKey(baseKey, executionId, templateV2) {
  return getTemplatePlaybackLayerKey(baseKey, executionId, templateV2);
}

export function getTemplateBackgroundSuppressionKey(baseKey, executionId) {
  return getTemplatePlaybackReadyKey(baseKey, executionId, true);
}

export function isCurrentPlaybackExecution(callbackExecutionId, currentExecutionId) {
  return callbackExecutionId === currentExecutionId;
}

export function nextPlaybackExecutionId(currentExecutionId) {
  return Number(currentExecutionId || 0) + 1;
}

export function shouldReleaseTemplateAfterPreload({ status, templateV2 }) {
  if (status === "ready" && templateV2) return false;
  return status === "ready" || status === "no-background" || status === "failed" || status === "asset-unresolved";
}

export async function confirmTemplateImageForPaint(image, onEvent, requestFrame = globalThis.requestAnimationFrame) {
  onEvent?.("load");
  if (typeof image?.decode === "function") await image.decode();
  onEvent?.("decoded");
  await new Promise((resolve) => typeof requestFrame === "function" ? requestFrame(resolve) : resolve());
  await new Promise((resolve) => typeof requestFrame === "function" ? requestFrame(resolve) : resolve());
  onEvent?.("ready");
}
