export function isSingleVideoPlaylist(items = []) {
  return items.length === 1 && items[0]?.type === "Vídeo";
}

export function isSingleImagePlaylist(items = []) {
  return items.length === 1
    && items[0]?.playerItemType !== "template"
    && items[0]?.type !== "Vídeo";
}

export function restartSingleVideo(videoElement) {
  if (!videoElement) return false;
  videoElement.currentTime = 0;
  const playResult = videoElement.play?.();
  playResult?.catch?.((error) => {
    console.log("Não foi possível reiniciar o vídeo único:", error);
  });
  return true;
}

export function getNextPlaylistIndex(currentIndex, itemCount) {
  if (itemCount <= 1) return 0;
  const safeCurrent = currentIndex >= itemCount ? 0 : currentIndex;
  return safeCurrent + 1 >= itemCount ? 0 : safeCurrent + 1;
}
