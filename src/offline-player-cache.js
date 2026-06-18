import { Capacitor } from "@capacitor/core";
import { FileTransfer } from "@capacitor/file-transfer";
import { Directory, Filesystem } from "@capacitor/filesystem";

function hashUrl(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function getFileExtension(url) {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : "bin";
  } catch {
    return "bin";
  }
}

function getAssetPath(scope, url) {
  return `totem-park/offline/${scope}/${hashUrl(url)}.${getFileExtension(url)}`;
}

export function restoreOfflineAssetMap(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");

    return Object.fromEntries(
      Object.entries(stored).map(([remoteUrl, fileUri]) => [
        remoteUrl,
        Capacitor.convertFileSrc(fileUri),
      ])
    );
  } catch {
    return {};
  }
}

export async function cacheOfflineAssets(urls, scope, storageKey) {
  const uniqueUrls = [...new Set(urls.filter((url) => /^https?:\/\//i.test(url || "")))];
  let rawMap = {};
  let failed = 0;

  try {
    rawMap = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    rawMap = {};
  }

  await Filesystem.mkdir({
    path: `totem-park/offline/${scope}`,
    directory: Directory.Data,
    recursive: true,
  }).catch(() => {});

  for (const url of uniqueUrls) {
    const path = getAssetPath(scope, url);

    try {
      let fileInfo;

      try {
        fileInfo = await Filesystem.stat({ path, directory: Directory.Data });
      } catch {
        const destination = await Filesystem.getUri({
          path,
          directory: Directory.Data,
        });

        await FileTransfer.downloadFile({
          url,
          path: destination.uri,
          progress: false,
        });

        fileInfo = await Filesystem.stat({ path, directory: Directory.Data });
      }

      rawMap[url] = fileInfo.uri;
    } catch (error) {
      await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
      delete rawMap[url];
      failed += 1;
      console.log("Falha ao baixar midia para uso offline:", url, error);
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(rawMap));

  return {
    failed,
    total: uniqueUrls.length,
    urlMap: Object.fromEntries(
      Object.entries(rawMap).map(([remoteUrl, fileUri]) => [
        remoteUrl,
        Capacitor.convertFileSrc(fileUri),
      ])
    ),
  };
}
