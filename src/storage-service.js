import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { auth, storage } from "./firebase";

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
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const totalBytes = Number(snapshot.totalBytes || 0);
        const bytesTransferred = Number(snapshot.bytesTransferred || 0);
        const percent = totalBytes > 0
          ? Math.round((bytesTransferred / totalBytes) * 100)
          : 0;
        onProgress?.(percent);
      },
      reject,
      () => resolve(uploadTask.snapshot.ref)
    );
  });
}

async function uploadFirebaseAsset({ path, file, contentType, customMetadata, onProgress }) {
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: contentType || file?.type || "application/octet-stream",
    customMetadata: normalizeCustomMetadata(customMetadata),
  };

  try {
    const uploadedRef = await uploadFirebaseFile(storageRef, file, metadata, onProgress);
    const publicUrl = await getDownloadURL(uploadedRef);

    return {
      storageProvider: "firebase",
      storagePath: path,
      publicUrl,
      url: publicUrl,
    };
  } catch (uploadError) {
    if (!isNativeRuntime()) throw uploadError;

    console.log("Upload resumível falhou no app; tentando arquivo estabilizado:", uploadError);
    onProgress?.(0);
    const stableFile = await buildStableUploadFile(file, metadata.contentType);
    const uploadedRef = await uploadFirebaseFile(storageRef, stableFile, metadata, onProgress);
    const publicUrl = await getDownloadURL(uploadedRef);

    return {
      storageProvider: "firebase",
      storagePath: path,
      publicUrl,
      url: publicUrl,
    };
  }
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

  return {
    storageProvider: "r2",
    storagePath: result.storagePath || path,
    storageKey: result.storageKey || path,
    publicUrl,
    url: publicUrl,
    fileHash: result.fileHash || "",
    etag: result.etag || "",
  };
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
