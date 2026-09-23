export function isVideoToVideoTransition(items = [], currentIndex = 0) {
  if (items.length < 2) return false;
  const safeIndex = currentIndex >= 0 && currentIndex < items.length ? currentIndex : 0;
  const nextIndex = (safeIndex + 1) % items.length;
  return items[safeIndex]?.type === "Vídeo" && items[nextIndex]?.type === "Vídeo";
}

export function releaseVideoElement(video) {
  if (!video) return { found: false, paused: false, sourceCleared: false, loadCalled: false };

  video.pause();
  video.removeAttribute("src");
  video.load();

  return { found: true, paused: true, sourceCleared: !video.hasAttribute("src"), loadCalled: true };
}
