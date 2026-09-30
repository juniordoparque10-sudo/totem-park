export function getTemplateStageGeometry({ frameWidth, frameHeight, logicalWidth, logicalHeight, zoom = 1 }) {
  if (!frameWidth || !frameHeight || !logicalWidth || !logicalHeight) return { scale: 0, width: 0, height: 0 };
  const scale = Math.min(frameWidth / logicalWidth, frameHeight / logicalHeight) * zoom;
  return { scale, width: logicalWidth * scale, height: logicalHeight * scale };
}
