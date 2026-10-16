export function buildPlayerVisibleLayers({
  playerItems = [],
  mediaIndex = 0,
  previousMediaIndex = null,
  previousMediaIndexFallback = null,
  previousPlaybackExecutionId = null,
  previousPlaybackExecutionIdFallback = null,
  currentPlaybackExecutionId = null,
  currentMediaReady = false,
  currentTransitionReady = currentMediaReady,
  decoderReleasePending = false,
} = {}) {
  const safeMediaIndex = mediaIndex >= playerItems.length ? 0 : mediaIndex;
  const currentMedia = playerItems[safeMediaIndex] || playerItems[0];
  const layers = [];
  const retainedPreviousIndex = previousMediaIndex ?? (!currentMediaReady ? previousMediaIndexFallback : null);

  if (!decoderReleasePending && retainedPreviousIndex !== null && retainedPreviousIndex !== safeMediaIndex && playerItems[retainedPreviousIndex]) {
    layers.push({
      item:playerItems[retainedPreviousIndex],
      index:retainedPreviousIndex,
      executionId:previousPlaybackExecutionId ?? previousPlaybackExecutionIdFallback,
      state:"is-previous",
    });
  }

  if (!decoderReleasePending && currentMedia) {
    layers.push({
      item:currentMedia,
      index:safeMediaIndex,
      executionId:currentPlaybackExecutionId,
      state:currentMediaReady
        ? `is-current is-ready ${currentTransitionReady ? "transition-active" : ""}`
        : "is-current is-pending",
    });
  }

  return layers;
}
