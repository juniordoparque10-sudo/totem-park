function collectReferenceValues(value, result = new Set()) {
  if (!value || typeof value !== "object") return result;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectReferenceValues(entry, result));
    return result;
  }

  Object.entries(value).forEach(([key, entry]) => {
    if (["mediaId", "url", "preview", "publicUrl", "imageUrl", "remotePreview"].includes(key) && entry) {
      result.add(String(entry));
    }
    collectReferenceValues(entry, result);
  });
  return result;
}

export function getTemplateResourceUsage(templates = [], media = {}) {
  const identities = new Set([
    media.id,
    media.preview,
    media.publicUrl,
    media.url,
    media.imageUrl,
    media.remotePreview,
  ].map((value) => String(value || "")).filter(Boolean));

  if (!identities.size) return [];

  return templates.flatMap((template) => {
    const references = collectReferenceValues({ draft: template.draft, published: template.published });
    const used = [...identities].some((identity) => references.has(identity));
    return used ? [{
      id: template.id,
      name: template.identity?.name || template.name || template.title || "Template sem nome",
    }] : [];
  });
}
