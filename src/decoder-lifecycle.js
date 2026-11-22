export function isVideoToVideoTransition(items = [], currentIndex = 0, targetIndex) {
  if (items.length < 2) return false;
  const safeIndex = currentIndex >= 0 && currentIndex < items.length ? currentIndex : 0;
  const nextIndex = targetIndex >= 0 && targetIndex < items.length ? targetIndex : (safeIndex + 1) % items.length;
  return items[safeIndex]?.type === "Vídeo" && items[nextIndex]?.type === "Vídeo";
}

export function shouldUseSingleDecoderTransition({ playerRc = false, decoderExperiment = false, basicUniversal = false } = {}) {
  return (playerRc || decoderExperiment) && !basicUniversal;
}

export function releaseVideoElement(video) {
  if (!video) return { found: false, paused: false, sourceCleared: false, loadCalled: false };

  video.pause();
  video.removeAttribute("src");
  video.load();

  return { found: true, paused: true, sourceCleared: !video.hasAttribute("src"), loadCalled: true };
}
