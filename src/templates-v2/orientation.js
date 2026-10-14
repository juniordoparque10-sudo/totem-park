export function normalizeTemplateV2Orientation(value, fallback = "Paisagem") {
  if (value === "Retrato" || value === "9:16" || value === "portrait") return "Retrato";
  if (value === "Paisagem" || value === "16:9" || value === "landscape") return "Paisagem";
  return fallback === "Retrato" ? "Retrato" : "Paisagem";
}

export function getTemplateV2Orientation(template = {}, fallback = "Paisagem") {
  return normalizeTemplateV2Orientation(
    template.published?.display?.defaultOrientation
      || template.draft?.display?.defaultOrientation
      || template.orientation
      || template.aspectRatio,
    fallback
  );
}

export function groupTemplatesByOrientation(templates = []) {
  return templates.reduce((groups, template) => {
    const key = getTemplateV2Orientation(template) === "Retrato" ? "portrait" : "landscape";
    groups[key].push(template);
    return groups;
  }, { landscape: [], portrait: [] });
}
