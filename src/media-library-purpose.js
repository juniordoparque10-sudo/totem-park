const TEMPLATE_RESOURCE_TYPES = new Set([
  "background",
  "logo",
  "product-image",
  "image",
  "video",
  "other",
]);

export function getMediaLibraryPurpose(media = {}) {
  return media.libraryPurpose === "template-resource" ? "template-resource" : "playback";
}

export function isPlaybackMedia(media = {}) {
  return getMediaLibraryPurpose(media) === "playback";
}

export function isTemplateResource(media = {}) {
  return getMediaLibraryPurpose(media) === "template-resource";
}

export function getTemplateResourceType(media = {}) {
  const explicit = String(media.resourceType || "").trim().toLowerCase();
  if (TEMPLATE_RESOURCE_TYPES.has(explicit)) return explicit;

  const contentType = String(media.contentType || "").toLowerCase();
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("image/")) return "image";
  return "other";
}

export function classifyTemplateUpload({ targetPath = "", contentType = "" } = {}) {
  const normalizedTarget = String(targetPath).toLowerCase();
  let resourceType = "other";

  if (normalizedTarget === "content.logo") resourceType = "logo";
  else if (String(contentType).toLowerCase().startsWith("video/")) resourceType = "video";
  else if (normalizedTarget.startsWith("market.catalog.")) resourceType = "product-image";
  else if (normalizedTarget === "media.primary") resourceType = "background";
  else if (String(contentType).toLowerCase().startsWith("image/")) resourceType = "image";

  return {
    libraryPurpose: "template-resource",
    resourceType,
    sourceContext: "template-v2-editor",
  };
}

export function filterTemplateResources(items = [], resourceType = "all") {
  return items.filter((item) => (
    isTemplateResource(item)
    && (resourceType === "all" || getTemplateResourceType(item) === resourceType)
  ));
}

export function getTemplateEditorResources(items = [], field = "image") {
  const allowedTypes = field === "primary"
    ? new Set(["background", "image", "product-image"])
    : new Set(["logo", "background", "image", "product-image"]);
  const priorities = field === "logo"
    ? { logo: 0, background: 1, image: 2, "product-image": 3 }
    : field === "primary"
      ? { background: 0, image: 1, "product-image": 2 }
      : { logo: 0, background: 1, image: 2, "product-image": 3 };

  return items
    .filter(isTemplateResource)
    .filter((item) => allowedTypes.has(getTemplateResourceType(item)))
    .sort((left, right) => priorities[getTemplateResourceType(left)] - priorities[getTemplateResourceType(right)]);
}
