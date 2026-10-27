export function captureVideoTransitionFrame(video, canvas) {
  const sourceWidth = Number(video?.videoWidth || 0);
  const sourceHeight = Number(video?.videoHeight || 0);
  if (!video || !canvas || Number(video.readyState || 0) < 2 || sourceWidth <= 0 || sourceHeight <= 0) return false;

  const targetWidth = Math.max(1, Math.round(Number(canvas.clientWidth || video.clientWidth || sourceWidth)));
  const targetHeight = Math.max(1, Math.round(Number(canvas.clientHeight || video.clientHeight || sourceHeight)));
  const context = canvas.getContext?.("2d");
  if (!context) return false;

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let cropX = 0;
  let cropY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else if (sourceRatio < targetRatio) {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  try {
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
    return true;
  } catch {
    return false;
  }
}

export function shouldPrimeVideoTransitionFrame(video, alreadyCaptured = false) {
  if (alreadyCaptured) return false;
  const duration = Number(video?.duration || 0);
  const currentTime = Number(video?.currentTime || 0);
  const remaining = duration - currentTime;
  return Number.isFinite(duration) && Number.isFinite(currentTime) && duration > 0 && remaining > 0.1 && remaining <= 1.5;
}
