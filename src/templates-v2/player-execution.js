export function getTemplatePlaybackLayerKey(baseKey, executionId, templateV2) {
  return templateV2 ? `${baseKey}-execution-${executionId}` : baseKey;
}

export function getTemplatePlaybackReadyKey(baseKey, executionId, templateV2) {
  return getTemplatePlaybackLayerKey(baseKey, executionId, templateV2);
}

export function isCurrentPlaybackExecution(callbackExecutionId, currentExecutionId) {
  return callbackExecutionId === currentExecutionId;
}

export function nextPlaybackExecutionId(currentExecutionId) {
  return Number(currentExecutionId || 0) + 1;
}

export async function confirmTemplateImageForPaint(image, onEvent, requestFrame = globalThis.requestAnimationFrame) {
  onEvent?.("load");
  if (typeof image?.decode === "function") await image.decode();
  onEvent?.("decoded");
  await new Promise((resolve) => typeof requestFrame === "function" ? requestFrame(resolve) : resolve());
  onEvent?.("ready");
}
