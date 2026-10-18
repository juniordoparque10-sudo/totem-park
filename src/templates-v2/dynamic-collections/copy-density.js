export function getCollectionCopyDensity(value) {
  const length = String(value || "").trim().length;
  if (length > 240) return "copy-long";
  if (length > 140) return "copy-medium";
  return "copy-normal";
}
