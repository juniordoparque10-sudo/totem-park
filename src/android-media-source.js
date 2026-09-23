const CAPACITOR_FILE_PATH_PREFIX = "/_capacitor_file_/";

export function isAndroidLocalMediaSource(value = "") {
  const source = String(value || "").trim();

  if (!source) return false;
  if (/^(file|content|capacitor):\/\//i.test(source)) return true;

  try {
    return new URL(source).pathname.startsWith(CAPACITOR_FILE_PATH_PREFIX);
  } catch {
    return source.startsWith(CAPACITOR_FILE_PATH_PREFIX);
  }
}

export function isRemoteMediaSource(value = "") {
  return /^https?:\/\//i.test(String(value || "").trim())
    && !isAndroidLocalMediaSource(value);
}

export function resolveAndroidMediaSource(media = {}, options = {}) {
  const preview = String(media.preview || media.imageUrl || "").trim();
  const explicitRemote = String(media.remotePreview || "").trim();
  const remoteUrl = explicitRemote || (isRemoteMediaSource(preview) ? preview : "");
  const mappedLocal = remoteUrl ? String(options.offlineAssetMap?.[remoteUrl] || "").trim() : "";
  const localSource = isAndroidLocalMediaSource(mappedLocal)
    ? mappedLocal
    : isAndroidLocalMediaSource(preview)
      ? preview
      : "";

  if (localSource) {
    return { kind: "LOCAL", src: localSource, remoteUrl };
  }

  if (preview && isRemoteMediaSource(preview)) {
    return { kind: "REMOTE_FALLBACK", src: preview, remoteUrl: preview };
  }

  if (remoteUrl) {
    return { kind: "REMOTE_FALLBACK", src: remoteUrl, remoteUrl };
  }

  if (options.localPending) {
    return { kind: "PENDING_LOCAL", src: "", remoteUrl: "" };
  }

  return { kind: "ERROR", src: preview, remoteUrl: "" };
}
