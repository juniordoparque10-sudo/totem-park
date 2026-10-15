export function getTemplateV2MediaType(media = {}) {
  const value = String(media.type || media.contentType || media.fileType || "").toLowerCase();
  return value.includes("video") ? "video" : "image";
}

export function resolveTemplateV2MediaDocumentUrl(media = {}) {
  return [
    media.publicUrl,
    media.url,
    media.preview,
    media.previewUrl,
    media.thumbnailUrl,
    media.remotePreview,
    media.imageUrl,
    media.downloadURL,
    media.fileUrl,
    media.logoUrl,
    media.marketingArt?.imageUrl,
    media.marketingArt?.imagePreview,
    media.templateData?.imageUrl,
  ].map((value) => String(value || "").trim()).find(Boolean) || "";
}

export function mediaDocumentToTemplateAsset(media = {}) {
  return {
    mediaId: media.id || "",
    type: getTemplateV2MediaType(media),
    url: resolveTemplateV2MediaDocumentUrl(media),
    storagePath: media.storagePath || "",
    storageProvider: media.storageProvider || media.provider || "",
    fileHash: media.fileHash || media.hash || "",
    etag: media.etag || "",
    sizeBytes: Number(media.sizeBytes || 0),
    title: media.title || media.fileName || "Mídia",
  };
}
