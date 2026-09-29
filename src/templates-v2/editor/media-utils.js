export function getTemplateV2MediaType(media = {}) {
  const value = String(media.type || media.contentType || media.fileType || "").toLowerCase();
  return value.includes("video") ? "video" : "image";
}

export function mediaDocumentToTemplateAsset(media = {}) {
  return {
    mediaId: media.id || "",
    type: getTemplateV2MediaType(media),
    url: media.publicUrl || media.url || media.preview || media.remotePreview || media.imageUrl || "",
    storagePath: media.storagePath || "",
    storageProvider: media.storageProvider || media.provider || "",
    fileHash: media.fileHash || media.hash || "",
    etag: media.etag || "",
    sizeBytes: Number(media.sizeBytes || 0),
    title: media.title || media.fileName || "Mídia",
  };
}
