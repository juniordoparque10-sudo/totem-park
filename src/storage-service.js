import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { auth, storage } from "./firebase";
import { getMediaVersionFields } from "./media-content-version";
import {
  isStandalonePwa,
  observeResumableUploadTask,
  shouldRetryUploadWithStableFile,
} from "./pwa-upload-flow";

const DEFAULT_STORAGE_PROVIDER = "firebase";
const STORAGE_PROVIDER = (import.meta.env.VITE_STORAGE_PROVIDER || DEFAULT_STORAGE_PROVIDER).toLowerCase();
const STORAGE_API_URL = (import.meta.env.VITE_STORAGE_API_URL || "").replace(/\/$/, "");

function isNativeRuntime() {
  const capacitor = typeof window !== "undefined" ? window.Capacitor : null;

  return (
    typeof window !== "undefined" &&
    (
      capacitor?.isNativePlatform?.() ||
      (typeof capacitor?.getPlatform === "function" && capacitor.getPlatform() !== "web") ||
      window.location.protocol === "capacitor:"
    )
  );
}

async function buildStableUploadFile(file, contentType) {
  if (typeof file?.arrayBuffer !== "function") return file;

  const buffer = await file.arrayBuffer();
  return new Blob([buffer], { type: contentType || file.type || "application/octet-stream" });
}

function normalizeCustomMetadata(metadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata || {}).map(([key, value]) => [key, String(value ?? "")])
  );
}

function uploadFirebaseFile(storageRef, file, metadata, onProgress) {
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  return observeResumableUploadTask({ task: uploadTask, onProgress });
}

async function finalizeFirebaseUpload(snapshot, path) {
  const uploadedRef = snapshot.ref;
  const publicUrl = await getDownloadURL(uploadedRef);
  const objectMetadata = await getMetadata(uploadedRef).catch(() => snapshot.metadata || {});
  const versionFields = getMediaVersionFields(objectMetadata);
  if (!versionFields.contentVersion) {
    throw new Error("Firebase Storage não retornou versão confiável do objeto.");
  }

  return {
    storageProvider: "firebase",
    storagePath: path,
    publicUrl,
    url: publicUrl,
    ...versionFields,
  };
}

async function uploadFirebaseAsset({ path, file, contentType, customMetadata, onProgress }) {
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: contentType || file?.type || "application/octet-stream",
    customMetadata: normalizeCustomMetadata(customMetadata),
  };

  let snapshot;
  try {
    snapshot = await uploadFirebaseFile(storageRef, file, metadata, onProgress);
  } catch (uploadError) {
    const native = isNativeRuntime();
    const standalone = isStandalonePwa();
    if (!shouldRetryUploadWithStableFile({ error: uploadError, standalone, native })) {
      throw uploadError;
    }

    console.log("Upload resumível não iniciou; tentando arquivo estabilizado:", uploadError);
    onProgress?.(0);
    const stableFile = await buildStableUploadFile(file, metadata.contentType);
    snapshot = await uploadFirebaseFile(storageRef, stableFile, metadata, onProgress);
  }

  return finalizeFirebaseUpload(snapshot, path);
}

async function getAuthHeader() {
  const token = await auth.currentUser?.getIdToken?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function uploadR2Asset({ path, file, contentType, customMetadata, onProgress }) {
  if (!STORAGE_API_URL) {
    throw new Error("Storage R2 configurado sem VITE_STORAGE_API_URL. Mantenha VITE_STORAGE_PROVIDER=firebase até configurar o Worker.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);
  formData.append("contentType", contentType || file?.type || "application/octet-stream");
  formData.append("metadata", JSON.stringify(normalizeCustomMetadata(customMetadata)));

  onProgress?.(10);

  const response = await fetch(`${STORAGE_API_URL}/upload`, {
    method: "POST",
    headers: await getAuthHeader(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar para R2 (${response.status})`);
  }

  onProgress?.(100);
  const result = await response.json();
  const publicUrl = result.publicUrl || result.url || "";

  if (!publicUrl) {
    throw new Error("Worker R2 não retornou publicUrl.");
  }

  const versionFields = getMediaVersionFields(result);
  if (!versionFields.contentVersion) throw new Error("R2 não retornou versão confiável do objeto. Atualize o Worker antes de usar este backend.");
  return {
    storageProvider: "r2",
    storagePath: result.storagePath || path,
    storageKey: result.storageKey || path,
    publicUrl,
    url: publicUrl,
    ...versionFields,
  };
}

export async function getStorageAssetVersionMetadata({ storagePath, storageProvider = getStorageProvider() } = {}) {
  if (!storagePath) throw new Error("Caminho do arquivo não informado.");
  if (storageProvider === "r2") {
    if (!STORAGE_API_URL) throw new Error("Storage R2 configurado sem VITE_STORAGE_API_URL.");
    const response = await fetch(`${STORAGE_API_URL}/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
      body: JSON.stringify({ storagePath }),
    });
    if (!response.ok) throw new Error(`Falha ao consultar metadata R2 (${response.status})`);
    return { ...(await response.json()), storageProvider: "r2", storagePath };
  }
  const metadata = await getMetadata(ref(storage, storagePath));
  return { ...metadata, storageProvider: "firebase", storagePath };
}

export function getStorageProvider() {
  return STORAGE_PROVIDER === "r2" ? "r2" : "firebase";
}

export async function uploadStorageAsset(options) {
  if (getStorageProvider() === "r2") {
    return uploadR2Asset(options);
  }

  return uploadFirebaseAsset(options);
}

export async function deleteStoredAsset({ storagePath, storageProvider = getStorageProvider() } = {}) {
  if (!storagePath) return { skipped: true };

  if (storageProvider === "r2") {
    if (!STORAGE_API_URL) {
      throw new Error("Storage R2 configurado sem VITE_STORAGE_API_URL. Não foi possível excluir no R2.");
    }

    const response = await fetch(`${STORAGE_API_URL}/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeader()),
      },
      body: JSON.stringify({ storagePath }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao excluir no R2 (${response.status})`);
    }

    return response.json().catch(() => ({ deleted: true }));
  }

  await deleteObject(ref(storage, storagePath));
  return { deleted: true };
}
