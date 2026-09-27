import UploadLimitDialog from "./UploadLimitDialog";
import { uploadLimitBytes, uploadSizeNotice } from "./upload-plan-policy";
import TelemetryDashboard from "./TelemetryDashboard";
import { linkedAtForScreen, telemetryStatus } from "./telemetry-v1";
﻿import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { initializeApp, deleteApp } from "firebase/app";
import { registerPlugin } from "@capacitor/core";

import {
  LayoutDashboard,
  Monitor,
  Image,
  ListVideo,
  Settings,
  Upload,
  Wifi,
  Plus,
  Trash2,
  Users,
  CreditCard,
  LogOut,
  Volume2,
  VolumeX,
  GripVertical,
  Search,
  X,
  Newspaper,
  CloudSun,
  Palette,
  Clock3,
  RefreshCw,
  Pause,
  Play,
  MessageSquare,
  TriangleAlert,
  Wrench,
  MonitorOff,
  Eraser,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  Trophy,
  Coffee,
  Sparkles,
  Megaphone,
} from "lucide-react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  getAuth,
  updatePassword,
} from "firebase/auth";

import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  query,
  where,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  getDocsFromServer,
  runTransaction,
  deleteField,
} from "firebase/firestore";

import firebaseApp, { auth, authPersistenceReady, db } from "./firebase";
import {
  buildMediaCacheManifest,
  cacheOfflineAssets,
  cachePlaylistMedia,
  clearScreenMediaCache,
  getMediaCacheKey,
  getMediaCacheStats,
  isCacheableMediaItem,
  removeUnusedCachedMedia,
  restoreOfflineAssetMap,
} from "./offline-player-cache";
import {
  exportLabReport,
  getLabReport,
  labEnabled,
  recordPlayback,
  recordSourceAssigned,
  shareLastDecoderDiagnostic,
} from "./android-diagnostics";
import {
  getJumpEvents,
  jumpDiagnosticEnabled,
  mediaElementSnapshot,
  recordCurrentTimeAssignment,
  recordJumpEvent,
  recordSrcChange,
  recordVideoEvent,
  registerVideoElement,
} from "./jump-diagnostics";
import { isVideoToVideoTransition, releaseVideoElement } from "./decoder-lifecycle";
import {
  isAndroidLocalMediaSource,
  resolveAndroidMediaSource,
} from "./android-media-source";
import {
  LINK_STATES,
  classifyLinkValidation,
  clearTvConnection,
  logLinkEvent,
  persistTvConnection,
  readTvConnection,
  updateTvConnectionScreenId,
} from "./android-link-lifecycle";
import {
  isSingleImagePlaylist,
  isSingleVideoPlaylist,
  restartSingleVideo,
} from "./single-item-loop";
import { createPlayerTelemetry, readPlayerTelemetryReport, TELEMETRY_DEFAULT_CONFIG } from "./player-telemetry";
import { comparePortalScreens, getPortalScreenPage, sortClientsAlphabetically } from "./portal-status";
import {
  claimPlayerBinding,
  classifyPlayerIdentityFailure,
  PLAYER_IDENTITY_STATES,
  revokeOwnPlayerBinding,
} from "./player-identity";
import { deleteStoredAsset, uploadStorageAsset } from "./storage-service";
import logo from "./assets/logo.png";
import "./App.css";

const PUBLIC_WEB_URL = "https://totempark.com.br";
const BOOTSTRAP_MASTER_EMAILS = [
  "admin@parksolutions.com",
  "juniordoparque10@gmail.com",
];
const MASTER_ACCESS_DOC = ["settings", "masterAccess"];
const ACCOUNT_REQUESTS_COLLECTION = "account_requests";
const DEVELOPER_MODE_PASSWORD = "654";
const COMMERCIAL_WHATSAPP = "5584991346016";
const ACCOUNT_REQUEST_STATUS = {
  new: "Nova solicitação",
  waitingContact: "Aguardando contato",
  contacted: "Contato realizado",
  proposalSent: "Proposta enviada",
  waitingConfirmation: "Aguardando confirmação",
  approved: "Aprovada",
  activated: "Conta ativada",
  rejected: "Não aprovada",
};
const ACCOUNT_REQUEST_STATUS_OPTIONS = Object.values(ACCOUNT_REQUEST_STATUS);
const PENDING_ACCOUNT_STATUS = "pending_commercial_validation";
const TotemDevice = registerPlugin("TotemDevice");

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

async function loadMasterEmails() {
  const snapshot = await getDoc(doc(db, ...MASTER_ACCESS_DOC));
  const savedEmails = snapshot.exists() && Array.isArray(snapshot.data().emails)
    ? snapshot.data().emails.map(normalizeEmail).filter(Boolean)
    : [];

  return snapshot.exists()
    ? Array.from(new Set(savedEmails))
    : BOOTSTRAP_MASTER_EMAILS;
}

function getAccountRequestDocId(email = "") {
  const normalized = normalizeEmail(email);
  return encodeURIComponent(normalized).replaceAll(".", "%2E");
}

function formatFirestoreDateTime(value) {
  if (!value) return "Não informado";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "Não informado";

  return date.toLocaleString("pt-BR");
}

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function validateCnpj(value = "") {
  const digits = onlyDigits(value);
  if (!digits) return true;
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const calcCheck = (base) => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split("").reduce((total, digit, index) => (
      total + Number(digit) * weights[index]
    ), 0);
    const rest = sum % 11;
    return rest < 2 ? "0" : String(11 - rest);
  };

  const first = calcCheck(digits.slice(0, 12));
  const second = calcCheck(digits.slice(0, 12) + first);
  return digits.endsWith(first + second);
}

function getWhatsappUrl(phone = COMMERCIAL_WHATSAPP, message = "") {
  const text = encodeURIComponent(
    message || "Olá! Acabei de solicitar a criação de uma conta na Totem Park e gostaria de mais informações."
  );
  return `https://wa.me/${onlyDigits(phone) || COMMERCIAL_WHATSAPP}?text=${text}`;
}

function getCommercialWhatsappUrl(message = "") {
  return getWhatsappUrl(COMMERCIAL_WHATSAPP, message);
}

async function trySendAccountRequestEmail(requestData) {
  const endpoint = import.meta.env.VITE_ACCOUNT_REQUEST_EMAIL_ENDPOINT;
  if (!endpoint) return { skipped: true };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: "Recebemos sua solicitação de cadastro na Totem Park",
      to: requestData.email,
      name: requestData.responsibleName,
      companyName: requestData.companyName,
      status: "Aguardando validação comercial",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha no serviço de e-mail (${response.status})`);
  }

  return { sent: true };
}

function isNativeApp() {
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

const SCREEN_ROTATIONS = {
  horizontal: 0,
  vertical: 90,
  horizontalInvertida: 180,
  verticalInvertida: 270,
};

function getSavedScreenRotation() {
  if (!isNativeApp()) return "horizontal";

  const saved = localStorage.getItem("totempark-screen-rotation");
  return Object.hasOwn(SCREEN_ROTATIONS, saved) ? saved : "horizontal";
}

function getTotemDeviceId() {
  const storageKey = "totempark-device-id";
  const saved = localStorage.getItem(storageKey);

  if (saved) return saved;

  const id = globalThis.crypto?.randomUUID?.()
    || `totem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(storageKey, id);
  return id;
}


function buildLivePreviewMedia(screen, fallbackMedia) {
  if (screen?.nowPlayingPreview) {
    return {
      preview: screen.nowPlayingPreview,
      title: screen.nowPlayingTitle || "Mídia atual",
      type: screen.nowPlayingType || "Imagem",
      orientation: screen.nowPlayingOrientation || fallbackMedia?.orientation || "Paisagem",
      aspectRatio: screen.nowPlayingAspectRatio || fallbackMedia?.aspectRatio || "",
      width: screen.nowPlayingWidth || fallbackMedia?.width || null,
      height: screen.nowPlayingHeight || fallbackMedia?.height || null,
      templateType: screen.nowPlayingTemplateType || fallbackMedia?.templateType || "",
      playerItemType: screen.nowPlayingItemType || fallbackMedia?.playerItemType || "",
      liveKey: `${screen.id}-${screen.nowPlayingPreview}-${screen.nowPlayingIndex || 0}-${screen.lastMediaUpdateAt?.seconds || ""}`,
    };
  }

  if (fallbackMedia?.preview) {
    return {
      ...fallbackMedia,
      liveKey: `${screen?.id || "screen"}-${fallbackMedia.preview}`,
    };
  }

  return null;
}

function renderLivePreviewMedia(screen, fallbackMedia, icon = null) {
  const media = buildLivePreviewMedia(screen, fallbackMedia);

  return (
    <UniversalPreview
      key={media?.liveKey || `${screen?.id || "screen"}-empty-preview`}
      item={media}
      className="screen-universal-preview"
      compact
      autoPlay
      fallbackIcon={icon || <Monitor size={48} />}
    />
  );
}

function isVideoItem(item = {}) {
  const value = String(item.type || item.mimeType || item.fileType || "").toLowerCase();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.includes("video");
}

function isMediaTypeName(type) {
  const normalized = String(type || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return normalized === "imagem" || normalized === "video";
}

function isTemplatePreviewItem(item = {}) {
  if (item.playerItemType === "template") return true;
  if (!item.templateType) return false;
  if (isMediaTypeName(item.templateType)) return false;
  return true;
}

function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (value.toDate) return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

const SCREEN_ONLINE_WINDOW_SECONDS = 45;
const SCREEN_ATTENTION_WINDOW_SECONDS = 120;
const SCREEN_LOCATION_CACHE_KEY = "totempark-screen-location-cache";
const SCREEN_LOCATION_CACHE_TTL_MS = 30 * 60 * 1000;
let screenLocationRetryAfter = 0;

function getScreenDeviceLabel(screen = {}) {
  const deviceId = screen.connectedDeviceId || screen.activeDeviceId || "";

  if (!deviceId) return "Nenhum dispositivo";

  return screen.deviceName
    || screen.connectedDeviceName
    || `Dispositivo ${String(deviceId).slice(-6).toUpperCase()}`;
}

function getScreenLastSeenDate(screen = {}) {
  // Only timestamps written by the player count as proof of connectivity.
  const timestamp = Math.max(
    getTimestampMs(screen.lastSeenAt),
    getTimestampMs(screen.lastCommandExecutedAt),
    getTimestampMs(screen.lastMediaUpdateAt)
  );
  return timestamp ? new Date(timestamp) : null;
}

function getScreenConnectionStatus(screen = {}, nowValue = Date.now()) {
  const nowMs = getTimestampMs(nowValue) || Date.now();
  const lastSeenDate = getScreenLastSeenDate(screen);
  const lastSeenMs = lastSeenDate?.getTime?.() || 0;
  const diffInSeconds = lastSeenMs ? (nowMs - lastSeenMs) / 1000 : Infinity;
  const hasDevice = Boolean(screen.connectedDeviceId || screen.activeDeviceId);
  const isOnline = hasDevice && diffInSeconds <= SCREEN_ONLINE_WINDOW_SECONDS;

  if (isOnline) {
    return {
      key: "online",
      className: "online",
      label: "Online",
      detail: "Sinal ativo",
      isOnline: true,
      hasDevice,
      deviceLabel: getScreenDeviceLabel(screen),
      lastSeenDate,
      lastConnection: screen.lastConnection || "Data não informada",
    };
  }

  if (hasDevice && diffInSeconds <= SCREEN_ATTENTION_WINDOW_SECONDS) {
    return {
      key: "attention",
      className: "attention",
      label: "Atenção",
      detail: "Sinal atrasado",
      isOnline: false,
      hasDevice,
      deviceLabel: getScreenDeviceLabel(screen),
      lastSeenDate,
      lastConnection: screen.lastConnection || "Data não informada",
    };
  }

  if (hasDevice) {
    return {
      key: "logged-offline",
      className: "logged-offline",
      label: "Logada mas Offline",
      detail: "Sem sinal recente",
      isOnline: false,
      hasDevice,
      deviceLabel: getScreenDeviceLabel(screen),
      lastSeenDate,
      lastConnection: screen.lastConnection || "Data não informada",
    };
  }

  return {
    key: "not-logged",
    className: "not-logged",
    label: "Não está logada",
    detail: "Nenhum dispositivo vinculado",
    isOnline: false,
    hasDevice,
    deviceLabel: "Nenhum dispositivo",
    lastSeenDate,
    lastConnection: screen.lastConnection || "Ainda não conectou",
  };
}

function formatScreenConnectionDate(value) {
  const timestamp = getTimestampMs(value);

  if (!timestamp) return "Sem registro";

  return new Date(timestamp).toLocaleString("pt-BR");
}

function getScreenDeviceLocation(screen = {}) {
  const location = screen.deviceLocation || {};
  const city = screen.deviceLocationCity
    || location.cityLabel
    || location.displayName
    || [location.city, location.regionCode || location.region].filter(Boolean).join("/")
    || "";

  return {
    city: city || "Sem registro",
    detail: location.source === "gps"
      ? `GPS${location.accuracy ? ` • precisão ${Math.round(Number(location.accuracy))}m` : ""}`
      : location.source === "ip"
        ? "Localização aproximada por internet"
        : "Localização ainda não registrada",
    updatedAt: screen.deviceLocationUpdatedAt || location.capturedAt || null,
  };
}

function getScreenDisplayLocation(screen = {}) {
  const location = screen.deviceLocation || {};
  const registeredLocation = typeof screen.location === "string"
    ? screen.location.trim()
    : "";
  const detectedCity = screen.deviceLocationCity
    || location.cityLabel
    || location.displayName
    || [location.city, location.regionCode || location.region].filter(Boolean).join("/")
    || "";
  const city = detectedCity || registeredLocation || "";

  return {
    city: city || "Sem registro",
    detail: detectedCity && location.source === "gps"
      ? `GPS${location.accuracy ? ` - precisao ${Math.round(Number(location.accuracy))}m` : ""}`
      : detectedCity && location.source === "ip"
        ? "Localizacao aproximada por internet"
        : registeredLocation
          ? "Local informado no cadastro"
          : "Localizacao ainda nao registrada",
    updatedAt: screen.deviceLocationUpdatedAt || location.capturedAt || null,
    detected: Boolean(detectedCity),
  };
}

function readCachedScreenLocation() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SCREEN_LOCATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const capturedAt = getTimestampMs(parsed?.capturedAt);

    if (!capturedAt || Date.now() - capturedAt > SCREEN_LOCATION_CACHE_TTL_MS) return null;

    return parsed;
  } catch (error) {
    return null;
  }
}

function saveCachedScreenLocation(location) {
  if (typeof window === "undefined" || !location) return;

  try {
    window.localStorage.setItem(SCREEN_LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch (error) {
    // Cache local é opcional; o player não deve quebrar se a TV bloquear storage.
  }
}

async function fetchIpScreenLocation() {
  if (typeof fetch === "undefined") return null;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;

  try {
    const response = await fetch("https://ipapi.co/json/", {
      cache: "no-store",
      signal: controller?.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const city = data?.city || "";
    const regionCode = data?.region_code || data?.region || "";

    if (!city && !regionCode) return null;

    return {
      source: "ip",
      city,
      region: data?.region || "",
      regionCode,
      country: data?.country_name || data?.country || "",
      cityLabel: [city, regionCode].filter(Boolean).join("/"),
      latitude: data?.latitude || data?.lat || null,
      longitude: data?.longitude || data?.lon || null,
      capturedAt: new Date().toISOString(),
    };
  } catch (error) {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function getBrowserScreenLocationIfAllowed() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state !== "granted") return null;
    } else {
      return null;
    }

    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            source: "gps",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date().toISOString(),
          });
        },
        () => resolve(null),
        { enableHighAccuracy: false, maximumAge: SCREEN_LOCATION_CACHE_TTL_MS, timeout: 3500 }
      );
    });
  } catch (error) {
    return null;
  }
}

async function resolveScreenLocationSnapshot() {
  if (screenLocationRetryAfter && Date.now() < screenLocationRetryAfter) return null;

  const cached = readCachedScreenLocation();
  if (cached) return cached;

  const ipLocation = await fetchIpScreenLocation();
  const gpsLocation = await getBrowserScreenLocationIfAllowed();
  const location = ipLocation || gpsLocation
    ? {
        ...(ipLocation || {}),
        ...(gpsLocation || {}),
        source: gpsLocation ? "gps" : "ip",
        cityLabel: ipLocation?.cityLabel || ipLocation?.city || "Coordenadas detectadas",
        capturedAt: new Date().toISOString(),
      }
    : null;

  if (location) saveCachedScreenLocation(location);
  if (!location) screenLocationRetryAfter = Date.now() + SCREEN_LOCATION_CACHE_TTL_MS;

  return location;
}

function getPlaylistItemDurationMs(item = {}) {
  const seconds = Number(item.duration || 10);
  return Math.max(1, Number.isFinite(seconds) ? seconds : 10) * 1000;
}

function getPlaylistPreviewIndex(playlist, nowValue = Date.now(), screen = {}) {
  const items = Array.isArray(playlist?.items) ? playlist.items : [];

  if (items.length === 0) return 0;

  const nowMs = getTimestampMs(nowValue) || Date.now();
  const durations = items.map(getPlaylistItemDurationMs);
  const totalDuration = durations.reduce((total, duration) => total + duration, 0);

  if (!totalDuration) return 0;

  const reportedIndex = Math.max(0, Math.min(items.length - 1, Number(screen.nowPlayingIndex || 1) - 1));
  const anchorMs = getTimestampMs(screen.lastMediaUpdateAt) || getTimestampMs(screen.lastSeenAt) || nowMs;
  const baseOffset = durations
    .slice(0, reportedIndex)
    .reduce((total, duration) => total + duration, 0);
  const elapsed = ((baseOffset + (nowMs - anchorMs)) % totalDuration + totalDuration) % totalDuration;

  let cursor = 0;

  for (let index = 0; index < durations.length; index += 1) {
    cursor += durations[index];

    if (elapsed < cursor) {
      return index;
    }
  }

  return 0;
}

function getPreviewOrientation(item = {}) {
  if (item.detectedOrientation === "Retrato") return "Retrato";
  if (item.detectedOrientation === "Paisagem") return "Paisagem";
  if (item.orientation === "Retrato") return "Retrato";
  if (item.orientation === "Paisagem") return "Paisagem";

  const width = Number(item.width || item.videoWidth || item.naturalWidth || 0);
  const height = Number(item.height || item.videoHeight || item.naturalHeight || 0);

  if (width > 0 && height > 0) {
    return height > width ? "Retrato" : "Paisagem";
  }

  if (item.type === "story" || item.type === "reels") return "Retrato";
  if (item.format === "story" || item.format === "reels") return "Retrato";
  if (item.marketingType === "story" || item.marketingType === "reels") return "Retrato";
  if (item.formatType === "story" || item.formatType === "reels") return "Retrato";

  return "Paisagem";
}

function getPreviewAspectClass(item = {}) {
  const itemType = item.templateType || item.playerItemType || item.type;

  if (
    itemType === "marketing_art" ||
    item.playerItemType === "marketing_art" ||
    item.templateType === "marketing_art"
  ) {
    if (item.type === "feed" || item.format === "feed" || item.marketingType === "feed" || item.formatType === "feed") {
      return "square";
    }

    if (
      item.type === "story" ||
      item.type === "reels" ||
      item.format === "story" ||
      item.format === "reels" ||
      item.marketingType === "story" ||
      item.marketingType === "reels" ||
      item.formatType === "story" ||
      item.formatType === "reels"
    ) {
      return "portrait";
    }
  }

  if (item.aspectRatio === "1:1") return "square";
  if (item.aspectRatio === "9:16") return "portrait";
  if (item.aspectRatio === "16:9") return "landscape";
  if (item.detectedAspectRatio === "1:1") return "square";
  if (item.detectedAspectRatio === "9:16") return "portrait";
  if (item.detectedAspectRatio === "16:9") return "landscape";

  return getPreviewOrientation(item) === "Retrato" ? "portrait" : "landscape";
}

function getPreviewOrientationLabel(item = {}) {
  const aspectClass = getPreviewAspectClass(item);
  if (aspectClass === "square") return "Feed";
  return getPreviewOrientation(item);
}

function getPlayableOrientation(item = {}, fallbackOrientation = "Paisagem") {
  const aspectClass = getPreviewAspectClass(item);
  if (aspectClass === "portrait") return "Retrato";
  if (aspectClass === "landscape") return "Paisagem";

  if (item.resolvedOrientation === "Retrato") return "Retrato";
  if (item.resolvedOrientation === "Paisagem") return "Paisagem";
  if (item.orientation === "Retrato") return "Retrato";
  if (item.orientation === "Paisagem") return "Paisagem";

  return fallbackOrientation === "Retrato" ? "Retrato" : "Paisagem";
}

function isOrientationCompatible(item = {}, targetOrientation = "Paisagem") {
  if (!targetOrientation || targetOrientation === "Paisagem + Retrato") return true;
  return getPlayableOrientation(item, targetOrientation) === targetOrientation;
}

function getAspectRatioLabel(width, height) {
  if (!width || !height) return "custom";

  const ratio = width / height;

  if (Math.abs(ratio - 16 / 9) < 0.08) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.08) return "9:16";
  if (Math.abs(ratio - 1) < 0.08) return "1:1";

  return "custom";
}

function buildMediaDimensions(width, height, fallbackOrientation = "Paisagem") {
  const cleanWidth = Number(width || 0);
  const cleanHeight = Number(height || 0);
  const orientation =
    cleanWidth > 0 && cleanHeight > 0
      ? cleanHeight > cleanWidth ? "Retrato" : "Paisagem"
      : fallbackOrientation || "Paisagem";

  return {
    width: cleanWidth || null,
    height: cleanHeight || null,
    orientation,
    aspectRatio: getAspectRatioLabel(cleanWidth, cleanHeight),
  };
}

const VIDEO_FILE_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "mkv", "avi", "3gp"]);
const IMAGE_FILE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);

function getUploadFileKind(file) {
  const mimeType = String(file?.type || "").toLowerCase();
  const extension = String(file?.name || "")
    .split(".")
    .pop()
    ?.toLowerCase();

  if (mimeType.startsWith("video/") || VIDEO_FILE_EXTENSIONS.has(extension)) return "video";
  if (mimeType.startsWith("image/") || IMAGE_FILE_EXTENSIONS.has(extension)) return "image";

  return "";
}

function getUploadContentType(file) {
  const mimeType = String(file?.type || "").toLowerCase();
  if (mimeType.includes("/")) return mimeType;

  const extension = String(file?.name || "")
    .split(".")
    .pop()
    ?.toLowerCase();

  const fallbackTypes = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    "3gp": "video/3gpp",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
  };

  return fallbackTypes[extension] || "application/octet-stream";
}

function sanitizeStorageFileName(fileName = "midia") {
  return (
    String(fileName || "midia")
      .replace(/[\\/#?%*:|"<>]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "midia"
  );
}

function getUploadErrorMessage(error) {
  if (error?.code === "storage/unauthorized") {
    return "Sem permissão para enviar arquivo. Verifique se este usuário está vinculado ao cliente correto.";
  }

  if (error?.code === "permission-denied") {
    return "Arquivo enviado, mas sem permissão para salvar a mídia neste cliente.";
  }

  return error?.message || "Erro ao enviar mídia.";
}
function detectMediaFileMetadata(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(buildMediaDimensions(0, 0));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const isVideo = getUploadFileKind(file) === "video";
    const element = document.createElement(isVideo ? "video" : "img");
    let done = false;
    let timeoutId = null;

    function finish(width, height, durationSeconds = null) {
      if (done) return;
      done = true;
      if (timeoutId) clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      resolve({
        ...buildMediaDimensions(width, height),
        naturalDuration: durationSeconds,
      });
    }

    timeoutId = setTimeout(() => finish(0, 0), isVideo ? 4500 : 2500);
    element.onerror = () => finish(0, 0);

    if (isVideo) {
      element.preload = "metadata";
      element.onloadedmetadata = () => {
        const durationSeconds = Number.isFinite(element.duration)
          ? Math.max(1, Math.round(element.duration))
          : null;
        finish(element.videoWidth, element.videoHeight, durationSeconds);
      };
      element.onloadeddata = () => {
        if (element.videoWidth || element.videoHeight) {
          const durationSeconds = Number.isFinite(element.duration)
            ? Math.max(1, Math.round(element.duration))
            : null;
          finish(element.videoWidth, element.videoHeight, durationSeconds);
        }
      };
      element.src = objectUrl;
      element.load?.();
      return;
    }

    element.onload = () => finish(element.naturalWidth, element.naturalHeight);
    element.src = objectUrl;
  });
}

function VideoPreviewMedia({ src, title, compact, onDetectedSize }) {
  const [thumbnail, setThumbnail] = useState("");
  const [failed, setFailed] = useState(false);
  const [directVideoFailed, setDirectVideoFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setThumbnail("");
      setFailed(true);
      setDirectVideoFailed(true);
      return undefined;
    }

    let active = true;
    setThumbnail("");
    setFailed(false);
    setDirectVideoFailed(false);

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    function fail() {
      if (!active) return;
      setFailed(true);
    }

    function captureFrame() {
      if (!active) return;

      try {
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;

        if (!width || !height) {
          fail();
          return;
        }

        onDetectedSize?.(width, height);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", compact ? 0.68 : 0.78);

        setThumbnail(dataUrl);
        setFailed(false);
      } catch {
        fail();
      }
    }

    video.onloadedmetadata = () => {
      if (!active) return;

      onDetectedSize?.(video.videoWidth, video.videoHeight);

      if (Number.isFinite(video.duration) && video.duration > 0.25) {
        try {
          recordCurrentTimeAssignment(video, Math.min(0.2, video.duration / 2), "preview-frame");
          video.currentTime = Math.min(0.2, video.duration / 2);
          return;
        } catch {}
      }

      captureFrame();
    };
    video.onseeked = captureFrame;
    video.onloadeddata = () => {
      if (!thumbnail) captureFrame();
    };
    video.onerror = fail;
    video.src = src;
    video.load();

    return () => {
      active = false;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, compact]);

  if (thumbnail) {
    return <img src={thumbnail} alt={title || "Preview do vídeo"} />;
  }

  if (failed && src && !directVideoFailed) {
    return (
      <video
        src={src}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        className={compact ? "preview-video is-compact" : "preview-video"}
        onLoadedMetadata={(event) => {
          onDetectedSize?.(
            event.currentTarget.videoWidth,
            event.currentTarget.videoHeight
          );
        }}
        onCanPlay={(event) => {
          event.currentTarget.play().catch(() => {});
        }}
        onError={() => setDirectVideoFailed(true)}
      />
    );
  }

  return (
    <div className="video-preview-fallback">
      <div className="video-preview-play"></div>
      <span>{failed ? "Preview do vídeo indisponível" : "Carregando preview"}</span>
    </div>
  );
}

function UniversalPreview({
  item,
  className = "",
  compact = true,
  showBadge = true,
  controls = false,
  autoPlay = false,
  fallbackIcon = <Monitor size={34} />,
}) {
  const [detectedDimensions, setDetectedDimensions] = useState(null);
  const [sourceFallbackIndex, setSourceFallbackIndex] = useState(0);

  useEffect(() => {
    setSourceFallbackIndex(0);
  }, [item?.id, item?.preview, item?.remotePreview, item?.imageUrl, item?.logoUrl]);

  if (!item) {
    return (
      <div className={`media-preview-frame landscape empty ${className}`.trim()}>
        {fallbackIcon}
      </div>
    );
  }

  const measuredItem = detectedDimensions ? { ...item, ...detectedDimensions } : item;
  const realType = measuredItem.templateType || measuredItem.type;
  const isTemplate = isTemplatePreviewItem(measuredItem);
  const isMarketingArt = realType === "marketing_art";
  const aspectClass = getPreviewAspectClass(measuredItem);
  const badgeLabel = getPreviewOrientationLabel(measuredItem);
  const frameClass = `media-preview-frame ${aspectClass} ${className}`.trim();
  const useDirectMediaPreview =
    className.includes("playlist-preview-frame") ||
    className.includes("playlist-created-item-preview") ||
    className.includes("playlist-order");
  const mediaSources = [
    measuredItem.preview,
    measuredItem.sourcePreview,
    measuredItem.remotePreview,
    measuredItem.sourceRemotePreview,
    measuredItem.imageUrl,
    measuredItem.sourceImageUrl,
    measuredItem.logoUrl,
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  const mediaSrc = mediaSources[sourceFallbackIndex] || mediaSources[0] || "";

  function tryNextPreviewSource() {
    if (sourceFallbackIndex < mediaSources.length - 1) {
      setSourceFallbackIndex((current) => current + 1);
      return true;
    }

    return false;
  }

  function handleDetectedSize(width, height) {
    const cleanWidth = Number(width || 0);
    const cleanHeight = Number(height || 0);

    if (!cleanWidth || !cleanHeight) return;

    const dimensions = buildMediaDimensions(cleanWidth, cleanHeight, item.orientation || "Paisagem");

    setDetectedDimensions((current) => {
      if (
        current?.width === dimensions.width &&
        current?.height === dimensions.height &&
        current?.orientation === dimensions.orientation &&
        current?.aspectRatio === dimensions.aspectRatio
      ) {
        return current;
      }

      return {
        width: dimensions.width,
        height: dimensions.height,
        orientation: dimensions.orientation,
        aspectRatio: dimensions.aspectRatio,
        detectedOrientation: dimensions.orientation,
        detectedAspectRatio: dimensions.aspectRatio,
      };
    });
  }

  let content = null;

  if (isMarketingArt) {
    content = <MarketingArtPreview art={measuredItem} compact={compact} />;
  } else if (isTemplate) {
    content = <TemplateVisualPreview template={measuredItem} compact={compact} />;
  } else if (mediaSrc) {
    content = isVideoItem(measuredItem) && (compact || (!useDirectMediaPreview && !(controls && !compact))) ? (
      <VideoPreviewMedia
        src={mediaSrc}
        title={measuredItem.title || measuredItem.name}
        compact={compact}
        onDetectedSize={handleDetectedSize}
      />
    ) : isVideoItem(measuredItem) ? (
      <video
        src={mediaSrc}
        muted
        controls={controls && !compact}
        autoPlay={autoPlay || compact}
        loop={autoPlay || compact}
        playsInline
        preload="metadata"
        className={compact ? "preview-video is-compact" : "preview-video"}
        onLoadedMetadata={(event) => {
          handleDetectedSize(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
          if (compact && event.currentTarget.duration > 0.2) {
            try {
              recordCurrentTimeAssignment(event.currentTarget, Math.min(0.15, event.currentTarget.duration / 2), "preview-frame");
              event.currentTarget.currentTime = Math.min(0.15, event.currentTarget.duration / 2);
            } catch {}
          }
        }}
        onCanPlay={(event) => {
          if (compact) {
            event.currentTarget.play().catch(() => {});
          }
        }}
        onError={() => {
          tryNextPreviewSource();
        }}
      />
    ) : (
      <img
        src={mediaSrc}
        alt={measuredItem.title || measuredItem.name || "Preview"}
        loading="lazy"
        onLoad={(event) => {
          handleDetectedSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
        }}
        onError={() => {
          tryNextPreviewSource();
        }}
      />
    );
  } else {
    content = (
      <div className="universal-preview-fallback">
        {fallbackIcon}
        <strong>{measuredItem.title || measuredItem.name || "Preview indisponível"}</strong>
        <span>{getTemplateTypeLabel(realType)}</span>
      </div>
    );
  }

  return (
    <div className={frameClass}>
      {content}
      {showBadge && <span className="orientation-badge">{badgeLabel}</span>}
    </div>
  );
}


const DEFAULT_NEWS_ITEMS = [
  {
    title: "Totem Park exibe comunicados, ofertas e informações em tempo real.",
    description: "Conteúdo dinâmico para sua TV.",
    image: "",
    source: "Totem Park",
    pubDate: "",
    link: "",
  },
  {
    title: "Atualize suas telas com notícias, clima e campanhas dinâmicas.",
    description: "Sua comunicação visual mais moderna.",
    image: "",
    source: "Totem Park",
    pubDate: "",
    link: "",
  },
  {
    title: "Sua comunicação visual agora está conectada com o que acontece ao vivo.",
    description: "Templates profissionais para qualquer negócio.",
    image: "",
    source: "Totem Park",
    pubDate: "",
    link: "",
  },
];

const NEWS_SOURCE_PRESETS = {
  "G1 RN": "https://g1.globo.com/rss/g1/rn/rio-grande-do-norte/",
  "G1 Brasil": "https://g1.globo.com/rss/g1/",
  "CNN Brasil": "https://www.cnnbrasil.com.br/feed/",
  "UOL Notícias": "https://rss.uol.com.br/feed/noticias.xml",
  "Globo": "https://g1.globo.com/rss/g1/",
  "Metrópoles": "https://www.metropoles.com/feed",
  "Metrópoles Celebridades": "https://www.metropoles.com/celebridades/feed",
  "Metrópoles Vida & Estilo": "https://www.metropoles.com/vida-e-estilo/feed",
  "Jovem Pan": "https://jovempan.com.br/feed",
  "GE": "https://ge.globo.com/rss/ge/",
  "Steal The Look": "https://stealthelook.com.br/feed/",
  "Beauty Buzz": "https://beautybuzz.com.br/feed/",
  "Saudável Receita": "https://saudavelreceita.com.br/feed/",
  "Personalizado": "",
};

const BEAUTY_TEMPLATE_ALLOWED_SOURCES = ["Steal The Look", "Beauty Buzz", "Personalizado"];
const BEAUTY_TEMPLATE_KEYWORDS = [
  "beleza",
  "beauty",
  "skincare",
  "skin care",
  "maquiagem",
  "make",
  "cabelo",
  "cabelos",
  "unha",
  "unhas",
  "esmalte",
  "estetica",
  "estetico",
  "autocuidado",
  "cosmetico",
  "cosmeticos",
  "dermocosmetico",
  "dermocosmeticos",
  "perfume",
  "perfumaria",
  "moda",
  "look",
  "looks",
  "tendencia",
  "tendencias",
  "salon",
  "salao",
  "botox",
  "spa",
];

function getSavedCustomNewsSources() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("totempark-custom-news-sources") || "[]"
    );

    return Array.isArray(saved)
      ? saved.filter((item) => item?.name && item?.url)
      : [];
  } catch (error) {
    return [];
  }
}

function saveCustomNewsSource(url) {
  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) return null;

  const saved = getSavedCustomNewsSources();
  const alreadyExists = saved.some((item) => item.url === cleanUrl);

  if (alreadyExists) {
    return saved.find((item) => item.url === cleanUrl);
  }

  const source = {
    name: `Personalizado ${saved.length + 1}`,
    url: cleanUrl,
  };

  const updated = [...saved, source];

  localStorage.setItem(
    "totempark-custom-news-sources",
    JSON.stringify(updated)
  );

  return source;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&atilde;/g, "ã")
    .replace(/&otilde;/g, "õ")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Atilde;/g, "Ã")
    .replace(/&Otilde;/g, "Õ")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isBeautyNewsItem(item = {}) {
  const text = normalizeSearchText([
    item.title,
    item.description,
    item.source,
    item.link,
  ].filter(Boolean).join(" "));

  return BEAUTY_TEMPLATE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function filterBeautyNewsItems(items = []) {
  const filtered = (Array.isArray(items) ? items : []).filter(isBeautyNewsItem);
  return filtered.length ? filtered : [];
}

function getNewsItemTitle(item) {
  if (typeof item === "string") return item;
  return item?.title || "Notícia em atualização";
}

function getNewsItemDescription(item) {
  if (typeof item === "string") return "";
  return item?.description || "";
}

function getNewsItemImage(item) {
  if (typeof item === "string") return "";
  return item?.image || "";
}

function findImageUrlDeep(value, depth = 0) {
  if (!value || depth > 4) return "";

  if (typeof value === "string") {
    const cleanValue = value.trim();
    if (/^https?:\/\/.+\.(?:jpg|jpeg|png|webp)(?:\?.*)?$/i.test(cleanValue)) {
      return cleanValue;
    }

    const htmlMatch = cleanValue.match(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i)
      || cleanValue.match(/https?:\/\/[^"'<>\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'<>\s]*)?/i);
    return htmlMatch?.[1] || htmlMatch?.[0] || "";
  }

  if (Array.isArray(value)) {
    for (const nestedItem of value) {
      const found = findImageUrlDeep(nestedItem, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    const preferredKeys = ["image", "thumbnail", "thumbnailUrl", "url", "link", "source_url", "guid", "content", "description", "encoded"];

    for (const key of preferredKeys) {
      const found = findImageUrlDeep(value[key], depth + 1);
      if (found) return found;
    }

    for (const nestedValue of Object.values(value)) {
      const found = findImageUrlDeep(nestedValue, depth + 1);
      if (found) return found;
    }
  }

  return "";
}

function getNewsItemSource(item, fallback = "Notícias") {
  if (typeof item === "string") return fallback;
  return item?.source || fallback;
}

function getNewsItemTime(item) {
  if (typeof item === "string" || !item?.pubDate) {
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const date = new Date(item.pubDate);

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNewsItemImageFromRss(item) {
  const htmlSource = [
    item?.description,
    item?.content,
    item?.content_encoded,
    item?.["content:encoded"],
  ].filter(Boolean).join(" ");
  const imageMatch = String(htmlSource).match(/<img[^>]+src=["']([^"']+)["']/i)
    || String(htmlSource).match(/https?:\/\/[^"'<>\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'<>\s]*)?/i);

  return (
    item?.thumbnail ||
    item?.enclosure?.link ||
    item?.enclosure?.url ||
    item?.media?.content?.url ||
    item?.media?.thumbnail?.url ||
    item?.["media:content"]?.url ||
    item?.["media:thumbnail"]?.url ||
    findImageUrlDeep(item) ||
    imageMatch?.[1] ||
    imageMatch?.[0] ||
    ""
  );
}

const WEATHER_COORDINATE_PRESETS = {
  "joao camara/rn": { name: "João Câmara", admin1: "RN", displayName: "João Câmara/RN", latitude: -5.5376, longitude: -35.8197 },
  "joao camara": { name: "João Câmara", admin1: "RN", displayName: "João Câmara/RN", latitude: -5.5376, longitude: -35.8197 },
  "natal/rn": { name: "Natal", admin1: "RN", displayName: "Natal/RN", latitude: -5.7945, longitude: -35.2110 },
  "natal": { name: "Natal", admin1: "RN", displayName: "Natal/RN", latitude: -5.7945, longitude: -35.2110 },
  "jandaira/rn": { name: "Jandaira", admin1: "RN", displayName: "Jandaira/RN", latitude: -5.3544, longitude: -36.1278 },
  "macau/rn": { name: "Macau", admin1: "RN", displayName: "Macau/RN", latitude: -5.1150, longitude: -36.6347 },
  "guamare/rn": { name: "Guamare", admin1: "RN", displayName: "Guamare/RN", latitude: -5.1078, longitude: -36.3228 },
  "galinhos/rn": { name: "Galinhos", admin1: "RN", displayName: "Galinhos/RN", latitude: -5.0919, longitude: -36.2758 },
  "parazinho/rn": { name: "Parazinho", admin1: "RN", displayName: "Parazinho/RN", latitude: -5.2222, longitude: -35.8392 },
  "bento fernandes/rn": { name: "Bento Fernandes", admin1: "RN", displayName: "Bento Fernandes/RN", latitude: -5.6992, longitude: -35.8158 },
  "jardim de angicos/rn": { name: "Jardim de Angicos", admin1: "RN", displayName: "Jardim de Angicos/RN", latitude: -5.6497, longitude: -35.9717 },
  "pedra preta/rn": { name: "Pedra Preta", admin1: "RN", displayName: "Pedra Preta/RN", latitude: -5.5817, longitude: -36.1036 },
  "ceara mirim/rn": { name: "Ceara-Mirim", admin1: "RN", displayName: "Ceara-Mirim/RN", latitude: -5.6344, longitude: -35.4256 },
  "currais novos/rn": { name: "Currais Novos", admin1: "RN", displayName: "Currais Novos/RN", latitude: -6.2608, longitude: -36.5178 },
  "parnamirim/rn": { name: "Parnamirim", admin1: "RN", displayName: "Parnamirim/RN", latitude: -5.9156, longitude: -35.2628 },
  "mossoro/rn": { name: "Mossoro", admin1: "RN", displayName: "Mossoro/RN", latitude: -5.1875, longitude: -37.3442 },
  "recife/pe": { name: "Recife", admin1: "PE", displayName: "Recife/PE", latitude: -8.0476, longitude: -34.8770 },
  "fortaleza/ce": { name: "Fortaleza", admin1: "CE", displayName: "Fortaleza/CE", latitude: -3.7319, longitude: -38.5267 },
  "joao pessoa/pb": { name: "João Pessoa", admin1: "PB", displayName: "João Pessoa/PB", latitude: -7.1195, longitude: -34.8450 },
  "salvador/ba": { name: "Salvador", admin1: "BA", displayName: "Salvador/BA", latitude: -12.9777, longitude: -38.5016 },
  "sao paulo/sp": { name: "São Paulo", admin1: "SP", displayName: "São Paulo/SP", latitude: -23.5505, longitude: -46.6333 },
  "rio de janeiro/rj": { name: "Rio de Janeiro", admin1: "RJ", displayName: "Rio de Janeiro/RJ", latitude: -22.9068, longitude: -43.1729 },
};

function repairWeatherText(value = "") {
  return String(value || "")
    .replace(/JoÃ£o/g, "Jo\u00e3o")
    .replace(/CÃ¢mara/g, "C\u00e2mara")
    .replace(/SÃ£o/g, "S\u00e3o")
    .replace(/TambaÃº/g, "Tamba\u00fa")
    .replace(/CearÃ¡/g, "Cear\u00e1")
    .replace(/atualizaÃ§Ã£o/g, "atualiza\u00e7\u00e3o")
    .replace(/nÃ£o/g, "n\u00e3o")
    .replace(/cÃ³digo/g, "c\u00f3digo");
}

function repairWeatherTextSafe(value = "") {
  return repairWeatherText(value)
    .replace(/Jo(?:\u00c3\u0192\u00c2\u00a3|\u00c3\u00a3)o/g, "Jo\u00e3o")
    .replace(/C(?:\u00c3\u0192\u00c2\u00a2|\u00c3\u00a2)mara/g, "C\u00e2mara")
    .replace(/S(?:\u00c3\u0192\u00c2\u00a3|\u00c3\u00a3)o/g, "S\u00e3o")
    .replace(/Tamba(?:\u00c3\u0192\u00c2\u00ba|\u00c3\u00ba)/g, "Tamba\u00fa")
    .replace(/Cear(?:\u00c3\u0192\u00c2\u00a1|\u00c3\u00a1)/g, "Cear\u00e1")
    .replace(/atualiza(?:\u00c3\u0192\u00c2\u00a7|\u00c3\u00a7)(?:\u00c3\u0192\u00c2\u00a3|\u00c3\u00a3)o/g, "atualiza\u00e7\u00e3o")
    .replace(/n(?:\u00c3\u0192\u00c2\u00a3|\u00c3\u00a3)o/g, "n\u00e3o")
    .replace(/c(?:\u00c3\u0192\u00c2\u00b3|\u00c3\u00b3)digo/g, "c\u00f3digo");
}

function normalizeWeatherKey(value = "") {
  return repairWeatherTextSafe(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeWeatherCityName(value = "") {
  return String(value || "João Câmara/RN").split("/")[0].trim() || "João Câmara";
}

function pickBestWeatherPlace(results = [], originalCity = "") {
  const state = String(originalCity).split("/")[1]?.trim().toLowerCase();

  if (state) {
    const byState = results.find((place) => normalizeWeatherKey(place.admin1 || place.admin2 || "").includes(state));
    if (byState) return byState;
  }

  return results[0] || null;
}

function toRoundedWeatherValue(value, fallback = "--") {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function buildFallbackWeatherDaily() {
  const today = new Date();
  return {
    time: Array.from({ length: 5 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date.toISOString().slice(0, 10);
    }),
    weather_code: [2, 2, 3, 61, 2],
    temperature_2m_max: [30, 31, 31, 29, 30],
    temperature_2m_min: [23, 24, 24, 22, 23],
  };
}

async function fetchWeatherByCityLegacy(cityName) {
  const city = (cityName || "João Câmara").trim();

  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`
    );

    const geoData = await geoResponse.json();
    const place = geoData?.results?.[0];

    if (!place) {
      throw new Error("Cidade não encontrada.");
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5`
    );

    const weatherData = await weatherResponse.json();

    return {
      city: `${place.name}${place.admin1 ? `/${place.admin1}` : ""}`,
      temperature: Math.round(weatherData?.current?.temperature_2m ?? 0),
      sensation: Math.round(weatherData?.current?.apparent_temperature ?? 0),
      humidity: Math.round(weatherData?.current?.relative_humidity_2m ?? 0),
      wind: Math.round(weatherData?.current?.wind_speed_10m ?? 0),
      weatherCode: weatherData?.current?.weather_code ?? null,
      daily: weatherData?.daily || null,
      source: "Open-Meteo",
    };
  } catch (error) {
    console.log("Erro ao buscar clima:", error);

    return {
      city,
      temperature: "--",
      sensation: "--",
      humidity: "--",
      wind: "--",
      daily: null,
      source: "Aguardando atualização",
    };
  }
}

async function fetchWeatherByCity(cityName) {
  const city = (cityName || "João Câmara/RN").trim();
  const repairedCity = repairWeatherTextSafe(city);
  const normalizedCity = normalizeWeatherCityName(repairedCity);

  try {
    let place = WEATHER_COORDINATE_PRESETS[normalizeWeatherKey(repairedCity)]
      || WEATHER_COORDINATE_PRESETS[normalizeWeatherKey(normalizedCity)];

    if (!place) {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalizedCity)}&count=5&language=pt&format=json`
      );

      if (!geoResponse.ok) {
        throw new Error("Falha ao consultar cidade.");
      }

      const geoData = await geoResponse.json();
      place = pickBestWeatherPlace(geoData?.results || [], repairedCity);
    }

    if (!place) {
      throw new Error("Cidade nao encontrada.");
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5`
    );

    if (!weatherResponse.ok) {
      throw new Error("Falha ao consultar clima.");
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData?.current || {};

    return {
      city: repairWeatherTextSafe(place.displayName || `${place.name}${place.admin1 ? `/${place.admin1}` : ""}`),
      temperature: toRoundedWeatherValue(current.temperature_2m),
      sensation: toRoundedWeatherValue(current.apparent_temperature),
      humidity: toRoundedWeatherValue(current.relative_humidity_2m),
      wind: toRoundedWeatherValue(current.wind_speed_10m),
      weatherCode: current.weather_code ?? null,
      daily: weatherData?.daily || null,
      source: "Open-Meteo",
      updatedAt: current.time || new Date().toISOString(),
    };
  } catch (error) {
    console.log("Erro ao buscar clima:", error);

    return {
      city: repairedCity,
      temperature: "--",
      sensation: "--",
      humidity: "--",
      wind: "--",
      weatherCode: null,
      daily: buildFallbackWeatherDaily(),
      source: "Aguardando atualização",
    };
  }
}

async function fetchHealthyRecipePostsFromWordPress(feedUrl) {
  const sourceUrl = String(feedUrl || "").trim();
  if (!sourceUrl.includes("saudavelreceita.com.br")) return [];

  try {
    const response = await fetch("https://saudavelreceita.com.br/wp-json/wp/v2/posts?per_page=12&_embed=1");
    if (!response.ok) throw new Error("Falha ao consultar receitas.");

    const posts = await response.json();
    return (Array.isArray(posts) ? posts : [])
      .map((post) => {
        const embeddedMedia = post?._embedded?.["wp:featuredmedia"]?.[0];
        const image = embeddedMedia?.media_details?.sizes?.large?.source_url
          || embeddedMedia?.media_details?.sizes?.medium_large?.source_url
          || embeddedMedia?.media_details?.sizes?.medium?.source_url
          || embeddedMedia?.source_url
          || findImageUrlDeep(post);

        return {
          title: stripHtml(post?.title?.rendered || post?.title || ""),
          description: stripHtml(post?.excerpt?.rendered || post?.content?.rendered || "").slice(0, 160),
          image,
          source: "Saudável Receita",
          pubDate: post?.date || post?.modified || "",
          link: post?.link || "",
        };
      })
      .filter((item) => item.title);
  } catch (error) {
    console.log("Erro ao buscar receitas fitness:", error);
    return [];
  }
}

async function fetchBeautyPostsFromWordPress(feedUrl) {
  const sourceUrl = String(feedUrl || "").trim();
  const isBeautyBuzz = sourceUrl.includes("beautybuzz.com.br");
  const isStealTheLook = sourceUrl.includes("stealthelook.com.br");
  if (!isBeautyBuzz && !isStealTheLook) return [];

  const endpoint = isStealTheLook
    ? "https://stealthelook.com.br/wp-json/wp/v2/posts?per_page=16&_embed=1"
    : "https://beautybuzz.com.br/wp-json/wp/v2/posts?per_page=16&_embed=1";
  const sourceName = isStealTheLook ? "Steal The Look" : "Beauty Buzz";

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Falha ao consultar ${sourceName}.`);

    const posts = await response.json();
    const items = (Array.isArray(posts) ? posts : [])
      .map((post) => {
        const embeddedMedia = post?._embedded?.["wp:featuredmedia"]?.[0];
        const image = embeddedMedia?.media_details?.sizes?.large?.source_url
          || embeddedMedia?.media_details?.sizes?.medium_large?.source_url
          || embeddedMedia?.media_details?.sizes?.medium?.source_url
          || embeddedMedia?.source_url
          || findImageUrlDeep(post);

        return {
          title: stripHtml(post?.title?.rendered || post?.title || ""),
          description: stripHtml(post?.excerpt?.rendered || post?.content?.rendered || "").slice(0, 160),
          image,
          source: sourceName,
          pubDate: post?.date || post?.modified || "",
          link: post?.link || "",
        };
      })
      .filter((item) => item.title);

    return filterBeautyNewsItems(items);
  } catch (error) {
    console.log("Erro ao buscar tendencias de beleza:", error);
    return [];
  }
}

async function fetchNewsFromRss(feedUrl) {
  const url = (feedUrl || "").trim();

  if (!url) {
    return DEFAULT_NEWS_ITEMS;
  }

  try {
    const recipeItems = await fetchHealthyRecipePostsFromWordPress(url);
    if (recipeItems.length) return recipeItems;

    const beautyItems = await fetchBeautyPostsFromWordPress(url);
    if (beautyItems.length) return beautyItems;

    const response = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`
    );

    const data = await response.json();
    const feedTitle = data?.feed?.title || data?.feed?.description || "Notícias";

    const items = (data?.items || [])
      .slice(0, 8)
      .map((item) => ({
        title: stripHtml(item.title),
        description: stripHtml(item.description || item.content || "").slice(0, 160),
        image: getNewsItemImageFromRss(item),
        source: feedTitle,
        pubDate: item.pubDate || item.published || "",
        link: item.link || "",
      }))
      .filter((item) => item.title);

    return items.length > 0 ? items : DEFAULT_NEWS_ITEMS;
  } catch (error) {
    console.log("Erro ao buscar notícias:", error);
    return DEFAULT_NEWS_ITEMS;
  }
}

function getTemplateTickerDurationForText(value, text = "") {
  const speed = getTemplateTickerSpeed(value);
  const length = String(text || "").length;

  if (speed === "slow") return Math.max(42, Math.min(150, Math.round(32 + length * 0.22)));
  if (speed === "fast") return Math.max(16, Math.min(90, Math.round(12 + length * 0.12)));

  return Math.max(26, Math.min(120, Math.round(18 + length * 0.17)));
}

function getTemplateThemeStyle(template, tickerText = "") {
  const tickerSpeed = getTemplateTickerSpeed(template?.tickerSpeed);
  const backgroundTheme = getTemplateBackgroundTheme(template);
  const fallbackTextColor = backgroundTheme === "light_premium" ? "#0f172a" : "#ffffff";

  return {
    "--template-primary": template?.primaryColor || "#06b6d4",
    "--template-secondary": template?.secondaryColor || "#9333ea",
    "--template-accent": template?.accentColor || "#22d3ee",
    "--template-text": template?.textColor || fallbackTextColor,
    "--template-main-text": template?.mainTextColor || template?.textColor || fallbackTextColor,
    "--template-ticker-duration": `${getTemplateTickerDurationForText(tickerSpeed, tickerText)}s`,
  };
}

function getTemplateTypeLabel(type) {
  const labels = {
    clima: "Clima ao vivo",
    noticias: "Notícias ao vivo",
    comercial: "Comercial",
    aviso: "Aviso",
    jornal_premium: "Jornal TV Premium",
    clima_premium_v2: "Clima Premium V2",
    hora_certa_premium: "Hora Certa Premium",
    resultados_esportivos_premium: "Resultados Esportivos Premium",
    tela_corporativa_personalizada: "Tela Corporativa Personalizada",
    receitas_fitness_premium: "Receitas Fitness Premium",
    tendencia_beleza_premium: "Tendência de Beleza Premium",
    fofocas_premium: "Fofocas Brasil Premium",
    cardapio_premium: "Cardápio Premium",
    promocao_premium: "Promoção Premium",
    corporativo_premium: "Corporativo Premium",
    marketing_art: "Arte de Marketing",
  };

  return labels[type] || type || "Template";
}

function getTemplateBadge(type) {
  if (type === "jornal_premium") return "JORNAL TV";
  if (type === "clima_premium_v2") return "CLIMA PREMIUM";
  if (type === "hora_certa_premium") return "HORA CERTA";
  if (type === "resultados_esportivos_premium") return "PLACAR";
  if (type === "tela_corporativa_personalizada") return "CORPORATIVO";
  if (type === "receitas_fitness_premium") return "RECEITAS";
  if (type === "tendencia_beleza_premium") return "BELEZA";
  if (type === "fofocas_premium") return "FOFOCAS BR";
  if (type === "cardapio_premium") return "CARDÁPIO";
  if (type === "promocao_premium") return "OFERTAS";
  if (type === "corporativo_premium") return "CORPORATIVO";
  if (type === "comercial") return "OFERTA";
  if (type === "aviso") return "AVISO";

  return "AO VIVO";
}

const PREMIUM_TEMPLATE_TYPES = [
  "jornal_premium",
  "clima_premium_v2",
  "hora_certa_premium",
  "resultados_esportivos_premium",
  "tela_corporativa_personalizada",
  "receitas_fitness_premium",
  "tendencia_beleza_premium",
  "fofocas_premium",
  "cardapio_premium",
  "promocao_premium",
  "corporativo_premium",
];

function getTemplateTickerSpeed(value) {
  if (value === "slow" || value === "lenta") return "slow";
  if (value === "fast" || value === "rapida" || value === "rápida") return "fast";
  return "normal";
}

function getTemplateTickerSpeedLabel(value) {
  const speed = getTemplateTickerSpeed(value);
  if (speed === "slow") return "Lenta";
  if (speed === "fast") return "Rápida";
  return "Normal";
}

function getTemplateTickerDuration(value) {
  const speed = getTemplateTickerSpeed(value);
  if (speed === "slow") return 42;
  if (speed === "fast") return 16;
  return 26;
}

function getTemplateNewsSources(template) {
  if (Array.isArray(template?.selectedNewsSources) && template.selectedNewsSources.length > 0) {
    return template.selectedNewsSources;
  }

  return [template?.newsSource || "G1 RN"];
}

function getTemplateNewsFeedUrls(template, customNewsSources = []) {
  const templateType = template?.templateType || template?.type || "";
  const sources = getTemplateNewsSources(template);
  const customMap = customNewsSources.reduce((map, source) => {
    map[source.name] = source.url;
    return map;
  }, {});
  const resolvedSources = templateType === "tendencia_beleza_premium"
    ? sources.filter((sourceName) =>
        BEAUTY_TEMPLATE_ALLOWED_SOURCES.includes(sourceName) || Boolean(customMap[sourceName])
      )
    : sources;
  const safeSources = templateType === "tendencia_beleza_premium"
    ? Array.from(new Set([
        ...(resolvedSources.includes("Beauty Buzz") ? ["Steal The Look"] : []),
        ...(resolvedSources.length ? resolvedSources : ["Steal The Look", "Beauty Buzz"]),
      ]))
    : resolvedSources;

  return safeSources
    .map((sourceName) => {
      if (sourceName === "Personalizado") return template?.newsFeedUrl;
      return customMap[sourceName] || NEWS_SOURCE_PRESETS[sourceName] || "";
    })
    .filter(Boolean);
}

function isRssTemplateType(type) {
  return [
    "noticias",
    "jornal_premium",
    "clima_premium_v2",
    "hora_certa_premium",
    "receitas_fitness_premium",
    "tendencia_beleza_premium",
    "fofocas_premium",
    "tela_corporativa_personalizada",
  ].includes(type);
}

function isDefaultNewsItem(item) {
  const title = getNewsItemTitle(item);
  return DEFAULT_NEWS_ITEMS.some((defaultItem) => defaultItem.title === title);
}

function getTemplateNewsRotationSeconds(template) {
  const value = Number(template?.newsRotationInterval || template?.liveRotationInterval || 12);
  return Number.isFinite(value) && value >= 5 ? value : 12;
}

function getRotatingNewsIndex(items, template) {
  const length = Array.isArray(items) ? items.length : 0;
  if (length <= 1) return 0;
  const intervalMs = getTemplateNewsRotationSeconds(template) * 1000;
  return Math.floor(Date.now() / intervalMs) % length;
}

function rotateNewsItems(items, startIndex = 0) {
  if (!Array.isArray(items) || items.length === 0) return DEFAULT_NEWS_ITEMS;
  const index = Math.max(0, Math.min(startIndex, items.length - 1));
  return [...items.slice(index), ...items.slice(0, index)];
}

function buildSequentialNewsTicker(items, template = {}) {
  const newsItems = (Array.isArray(items) && items.length > 0 ? items : DEFAULT_NEWS_ITEMS)
    .filter((item) => getNewsItemTitle(item));

  if (newsItems.length === 0) return "Notícias em atualização";

  const grouped = newsItems.reduce((groups, item) => {
    const source = getNewsItemSource(item, template.newsSource || "Notícias");
    const key = source || "Notícias";

    if (!groups[key]) groups[key] = [];
    groups[key].push(item);

    return groups;
  }, {});

  const selectedSources = getTemplateNewsSources(template);
  const sourceOrder = [
    ...selectedSources,
    ...Object.keys(grouped).filter((source) => !selectedSources.includes(source)),
  ];
  const groups = sourceOrder
    .map((source) => grouped[source])
    .filter((group) => Array.isArray(group) && group.length > 0);
  const interleaved = [];
  const maxGroupLength = Math.max(...groups.map((group) => group.length), 0);

  for (let index = 0; index < maxGroupLength; index += 1) {
    groups.forEach((group) => {
      if (group[index]) interleaved.push(group[index]);
    });
  }

  return (interleaved.length ? interleaved : newsItems)
    .slice(0, 14)
    .map((item) => `${getNewsItemSource(item, template.newsSource || "Notícias")} — ${getNewsItemTitle(item)}`)
    .join("     •     ");
}

function getWeatherIcon(code) {
  const value = Number(code);
  if ([0, 1].includes(value)) return "☀";
  if ([2, 3].includes(value)) return "⛅";
  if ([45, 48].includes(value)) return "☁";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "🌧";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "❄";
  if ([95, 96, 99].includes(value)) return "⛈";
  return "☀";
}

function getWeatherReferenceDate(weather) {
  const updatedAt = weather?.updatedAt;
  const parsed = updatedAt ? new Date(updatedAt) : null;

  return parsed && Number.isFinite(parsed.getTime()) ? parsed : new Date();
}

function isNightFromDate(date) {
  const hour = date.getHours();
  return hour < 5 || hour >= 18;
}

function getWeatherConditionLabel(code, referenceDate = new Date()) {
  const value = Number(code);
  if ([0, 1].includes(value)) return isNightFromDate(referenceDate) ? "Ceu limpo" : "Ensolarado";
  if ([2, 3].includes(value)) return "Parcialmente nublado";
  if ([45, 48].includes(value)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(value)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "Frio intenso";
  if ([95, 96, 99].includes(value)) return "Temporal";
  return "Tempo atualizado";
}

function getWeatherIconSafe(code, referenceDate = new Date()) {
  const value = Number(code);
  if ([0, 1].includes(value)) return isNightFromDate(referenceDate) ? "\ud83c\udf19" : "\u2600";
  if ([2, 3].includes(value)) return "\u26c5";
  if ([45, 48].includes(value)) return "\u2601";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "\ud83c\udf27";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "\u2744";
  if ([95, 96, 99].includes(value)) return "\u26c8";
  return "\u2600";
}

function getWeatherForecastCards(weather) {
  const daily = weather?.daily;
  const dates = daily?.time || [];

  return dates.slice(0, 4).map((date, index) => {
    const parsedDate = new Date(`${date}T12:00:00`);
    return {
      day: parsedDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase(),
      icon: getWeatherIconSafe(daily?.weather_code?.[index]),
      max: Math.round(daily?.temperature_2m_max?.[index] ?? 0),
      min: Math.round(daily?.temperature_2m_min?.[index] ?? 0),
    };
  });
}

const WEATHER_CITY_PRESETS = [
  "João Câmara/RN",
  "Natal/RN",
  "Jandaira/RN",
  "Macau/RN",
  "Guamare/RN",
  "Galinhos/RN",
  "Parazinho/RN",
  "Bento Fernandes/RN",
  "Jardim de Angicos/RN",
  "Pedra Preta/RN",
  "Ceara-Mirim/RN",
  "Currais Novos/RN",
  "Parnamirim/RN",
  "Mossoro/RN",
  "Recife/PE",
  "Fortaleza/CE",
  "João Pessoa/PB",
  "Salvador/BA",
  "São Paulo/SP",
  "Rio de Janeiro/RJ",
];

const TIDE_BEACH_PRESETS = [
  { name: "Ponta Negra/RN", city: "Natal/RN", tideStation: "Natal" },
  { name: "Touros/RN", city: "Touros/RN", tideStation: "Touros", latitude: -5.1989, longitude: -35.4608 },
  { name: "Caicara do Norte/RN", city: "Caicara do Norte/RN", tideStation: "Macau", latitude: -5.0708, longitude: -36.0717 },
  { name: "Sao Bento do Norte/RN", city: "Sao Bento do Norte/RN", tideStation: "Macau", latitude: -5.0922, longitude: -35.9583 },
  { name: "Marcos/RN", city: "Marcos/RN", tideStation: "Macau", latitude: -5.1300, longitude: -36.1500 },
  { name: "Areia Branca/RN", city: "Areia Branca/RN", tideStation: "Areia Branca", latitude: -4.9561, longitude: -37.1369 },
  { name: "Galinhos/RN", city: "Galinhos/RN", tideStation: "Macau", latitude: -5.0919, longitude: -36.2758 },
  { name: "Baia Formosa/RN", city: "Baia Formosa/RN", tideStation: "Natal", latitude: -6.3719, longitude: -35.0036 },
  { name: "Genipabu/RN", city: "Extremoz/RN", tideStation: "Natal" },
  { name: "Maracajau/RN", city: "Maxaranguape/RN", tideStation: "Touros" },
  { name: "São Miguel do Gostoso/RN", city: "São Miguel do Gostoso/RN", tideStation: "Touros" },
  { name: "Pipa/RN", city: "Tibau do Sul/RN", tideStation: "Natal" },
  { name: "Boa Viagem/PE", city: "Recife/PE", tideStation: "Recife" },
  { name: "Iracema/CE", city: "Fortaleza/CE", tideStation: "Fortaleza" },
  { name: "Tambaú/PB", city: "João Pessoa/PB", tideStation: "Cabedelo" },
];

function getTemplateWeatherCity(template = {}) {
  return String(template.weatherCity || template.city || "João Câmara/RN").trim();
}

function getTemplateTideBeach(template = {}) {
  return String(template.tideBeach || template.beach || "Ponta Negra/RN").trim();
}

function getTemplateTideStation(template = {}) {
  const beach = getTemplateTideBeach(template);
  return (
    TIDE_BEACH_PRESETS.find((item) => item.name === beach)?.tideStation ||
    template.tideStation ||
    beach
  );
}

function parseTemplateListField(value, fallback = []) {
  const parsed = (Array.isArray(value) ? value : String(value || "").split(/[,;\n]/))
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
  return parsed.length ? parsed : fallback;
}

function getTemplateWeatherCities(template = {}) {
  return parseTemplateListField(template.weatherCities, [getTemplateWeatherCity(template)]);
}

function getTemplateTideBeaches(template = {}) {
  return parseTemplateListField(template.tideBeaches, [getTemplateTideBeach(template)]);
}

function getTemplateLocationRotationSeconds(template = {}) {
  const value = Number(template.locationRotationInterval || template.tideRotationInterval || 30);
  return Number.isFinite(value) && value >= 10 ? value : 30;
}

function getRotatingLocationIndex(items = [], template = {}, nowValue = Date.now()) {
  if (!Array.isArray(items) || items.length <= 1) return 0;
  const intervalMs = getTemplateLocationRotationSeconds(template) * 1000;
  return Math.floor(Number(nowValue || Date.now()) / intervalMs) % items.length;
}

function getActiveTemplateWeatherCity(template = {}, nowValue = Date.now()) {
  const cities = getTemplateWeatherCities(template);
  return cities[getRotatingLocationIndex(cities, template, nowValue)] || getTemplateWeatherCity(template);
}

function getActiveTemplateTideBeach(template = {}, nowValue = Date.now()) {
  const beaches = getTemplateTideBeaches(template);
  return beaches[getRotatingLocationIndex(beaches, template, nowValue)] || getTemplateTideBeach(template);
}

function getTideBeachConfig(beachName = "") {
  const beach = String(beachName || "").trim();
  return TIDE_BEACH_PRESETS.find((item) => normalizeWeatherKey(item.name) === normalizeWeatherKey(beach)) || {
    name: beach || "Ponta Negra/RN",
    city: beach || "Natal/RN",
    tideStation: beach || "Natal",
  };
}

function getTideForecastForTemplate(template = {}) {
  const beach = getActiveTemplateTideBeach(template);
  const beachConfig = getTideBeachConfig(beach);
  const station = beachConfig.tideStation || getTemplateTideStation({ ...template, tideBeach: beach });
  const seed = Array.from(`${beach}-${station}`).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const lowA = 3 + (seed % 3);
  const highA = 9 + (seed % 2);
  const lowB = 15 + (seed % 4);
  const highB = 21 + (seed % 3);

  return {
    beach,
    station,
    source: "Previsão de maré configurável",
    items: [
      { time: `${String(lowA).padStart(2, "0")}:18`, label: "Baixa", height: `${(0.3 + (seed % 4) / 10).toFixed(1)}m`, level: 28 + (seed % 10) },
      { time: `${String(highA).padStart(2, "0")}:36`, label: "Alta", height: `${(1.8 + (seed % 6) / 10).toFixed(1)}m`, level: 78 + (seed % 14) },
      { time: `${String(lowB).padStart(2, "0")}:52`, label: "Baixa", height: `${(0.4 + (seed % 5) / 10).toFixed(1)}m`, level: 30 + (seed % 12) },
      { time: `${String(highB).padStart(2, "0")}:04`, label: "Alta", height: `${(1.7 + (seed % 7) / 10).toFixed(1)}m`, level: 74 + (seed % 16) },
    ],
  };
}

async function fetchTideForecastForTemplate(template = {}) {
  const beach = getActiveTemplateTideBeach(template);
  const beachConfig = getTideBeachConfig(beach);
  const latitude = Number(beachConfig.latitude);
  const longitude = Number(beachConfig.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return getTideForecastForTemplate({ ...template, tideBeach: beach });
  }

  try {
    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=sea_level_height_msl&timezone=auto&forecast_days=1`
    );

    if (!response.ok) throw new Error("Falha ao consultar mare.");

    const data = await response.json();
    const times = data?.hourly?.time || [];
    const heights = data?.hourly?.sea_level_height_msl || [];
    const points = times
      .map((time, index) => ({ time, height: Number(heights[index]) }))
      .filter((item) => Number.isFinite(item.height));

    if (points.length < 4) {
      return getTideForecastForTemplate({ ...template, tideBeach: beach });
    }

    const extremes = [];
    for (let index = 1; index < points.length - 1; index += 1) {
      const previous = points[index - 1].height;
      const current = points[index].height;
      const next = points[index + 1].height;
      if (current >= previous && current >= next) {
        extremes.push({ ...points[index], label: "Alta" });
      } else if (current <= previous && current <= next) {
        extremes.push({ ...points[index], label: "Baixa" });
      }
    }

    const selected = (extremes.length ? extremes : points.filter((_, index) => index % 6 === 0)).slice(0, 4);
    const minHeight = Math.min(...points.map((item) => item.height));
    const maxHeight = Math.max(...points.map((item) => item.height));
    const range = Math.max(0.1, maxHeight - minHeight);

    return {
      beach: beachConfig.name || beach,
      station: beachConfig.tideStation || beachConfig.city || beach,
      source: "Open-Meteo Marine",
      items: selected.map((item) => ({
        time: new Date(item.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        label: item.label || "Nivel",
        height: `${item.height.toFixed(1)}m`,
        level: Math.max(12, Math.min(92, Math.round(((item.height - minHeight) / range) * 80) + 12)),
      })),
    };
  } catch (error) {
    console.log("Erro ao buscar mare:", error);
    return getTideForecastForTemplate({ ...template, tideBeach: beach });
  }
}

const TEMPLATE_BACKGROUND_THEMES = [
  { value: "neon_gradient", label: "Neon degradê" },
  { value: "corporate_dark", label: "Corporativo escuro" },
  { value: "glass_panels", label: "Vidro premium" },
  { value: "light_premium", label: "Claro premium" },
  { value: "sunset", label: "Sunset" },
  { value: "nature", label: "Natureza" },
  { value: "arena", label: "Arena esportiva" },
  { value: "minimal", label: "Minimal limpo" },
];

function getTemplateBackgroundTheme(template = {}) {
  const selectedTheme = String(template.backgroundTheme || "neon_gradient").trim();
  return TEMPLATE_BACKGROUND_THEMES.some((theme) => theme.value === selectedTheme)
    ? selectedTheme
    : "neon_gradient";
}

function getTemplateClockParts(template, referenceDate = new Date()) {
  const now = referenceDate;
  const use12h = template?.timeFormat === "12h";

  return {
    time: now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: use12h,
    }),
    weekday: now.toLocaleDateString("pt-BR", { weekday: "long" }),
    date: now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
}

const TEMPLATE_VISIBILITY_OPTIONS = [
  ["showHeader", "Cabeçalho"],
  ["showLogo", "Logo"],
  ["showBadge", "Selo"],
  ["showTitle", "Título"],
  ["showSubtitle", "Subtítulo"],
  ["showFooter", "Rodapé"],
];

const STORAGE_GB = 1024 ** 3;
const STORAGE_MB = 1024 ** 2;
const DEFAULT_DEMO_TICKER_TEXT =
  "Demonstração Totem Park • Telas corporativas, playlists e comunicação visual em tempo real";

const COMMERCIAL_PLANS = {
  Demonstracao: {
    key: "demonstracao",
    name: "Demonstração",
    price: 0,
    priceMonthly: 0,
    priceLabel: "R$ 0,00",
    screensLimit: 1,
    storageLimitBytes: 500 * STORAGE_MB,
    maxVideoSizeBytes: 50 * STORAGE_MB,
    maxImageSizeBytes: 10 * STORAGE_MB,
    premiumTemplates: false,
    premiumTemplatesEnabled: false,
    marketing: false,
    marketingEnabled: false,
    isDemo: true,
    defaultTrialDays: 7,
    watermarkEnabled: true,
    trafficSoftLimitBytes: 5 * STORAGE_GB,
    trafficWarningLimitBytes: 4 * STORAGE_GB,
    recommendedMaxPlaylistWeightBytes: 500 * STORAGE_MB,
    recommendedMaxVideoSizeBytes: 50 * STORAGE_MB,
    badge: "Demonstração",
  },
  Start: {
    key: "start",
    name: "Start",
    price: 49.9,
    priceMonthly: 49.9,
    priceLabel: "R$ 49,90",
    screensLimit: 1,
    storageLimitBytes: 5 * STORAGE_GB,
    maxVideoSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 100 : 50) * STORAGE_MB,
    maxImageSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 10 : 5) * STORAGE_MB,
    premiumTemplates: false,
    premiumTemplatesEnabled: false,
    marketing: false,
    marketingEnabled: false,
    isDemo: false,
    defaultTrialDays: 0,
    watermarkEnabled: false,
    trafficSoftLimitBytes: 30 * STORAGE_GB,
    trafficWarningLimitBytes: 24 * STORAGE_GB,
    recommendedMaxPlaylistWeightBytes: 1 * STORAGE_GB,
    recommendedMaxVideoSizeBytes: 100 * STORAGE_MB,
  },
  Business: {
    key: "business",
    name: "Business",
    price: 99,
    priceMonthly: 99,
    priceLabel: "R$ 99,00",
    screensLimit: 5,
    storageLimitBytes: 20 * STORAGE_GB,
    maxVideoSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 150 : 100) * STORAGE_MB,
    maxImageSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 20 : 10) * STORAGE_MB,
    premiumTemplates: true,
    premiumTemplatesEnabled: true,
    marketing: false,
    marketingEnabled: false,
    isDemo: false,
    defaultTrialDays: 0,
    watermarkEnabled: false,
    trafficSoftLimitBytes: 120 * STORAGE_GB,
    trafficWarningLimitBytes: 96 * STORAGE_GB,
    recommendedMaxPlaylistWeightBytes: 3 * STORAGE_GB,
    recommendedMaxVideoSizeBytes: 150 * STORAGE_MB,
  },
  Professional: {
    key: "professional",
    name: "Professional",
    price: 199,
    priceMonthly: 199,
    priceLabel: "R$ 199,00",
    screensLimit: 10,
    storageLimitBytes: 50 * STORAGE_GB,
    maxVideoSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 200 : 150) * STORAGE_MB,
    maxImageSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 30 : 15) * STORAGE_MB,
    premiumTemplates: true,
    premiumTemplatesEnabled: true,
    marketing: true,
    marketingEnabled: true,
    isDemo: false,
    defaultTrialDays: 0,
    watermarkEnabled: false,
    trafficSoftLimitBytes: 300 * STORAGE_GB,
    trafficWarningLimitBytes: 240 * STORAGE_GB,
    recommendedMaxPlaylistWeightBytes: 6 * STORAGE_GB,
    recommendedMaxVideoSizeBytes: 200 * STORAGE_MB,
  },
  Enterprise: {
    key: "enterprise",
    name: "Enterprise",
    price: 299,
    priceMonthly: 299,
    priceLabel: "R$ 299,00",
    screensLimit: 30,
    storageLimitBytes: 200 * STORAGE_GB,
    maxVideoSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 250 : 200) * STORAGE_MB,
    maxImageSizeBytes: (import.meta.env.VITE_APP_MODE === "player" ? 50 : 20) * STORAGE_MB,
    premiumTemplates: true,
    premiumTemplatesEnabled: true,
    marketing: true,
    marketingEnabled: true,
    isDemo: false,
    defaultTrialDays: 0,
    watermarkEnabled: false,
    trafficSoftLimitBytes: null,
    trafficWarningLimitBytes: null,
    recommendedMaxPlaylistWeightBytes: null,
    recommendedMaxVideoSizeBytes: 250 * STORAGE_MB,
  },
};

function getPlanLimits(planName) {
  const plan = getPlanConfig(planName);
  return {
    screensLimit: plan.screensLimit,
    storageLimitBytes: plan.storageLimitBytes,
    maxVideoSizeBytes: plan.maxVideoSizeBytes,
    maxImageSizeBytes: plan.maxImageSizeBytes,
    trafficSoftLimitBytes: plan.trafficSoftLimitBytes,
    trafficWarningLimitBytes: plan.trafficWarningLimitBytes,
    recommendedMaxPlaylistWeightBytes: plan.recommendedMaxPlaylistWeightBytes,
    recommendedMaxVideoSizeBytes: plan.recommendedMaxVideoSizeBytes,
    marketingEnabled: plan.marketing,
    premiumTemplatesEnabled: plan.premiumTemplates,
  };
}

function getClientStorageLimit(client) {
  const customLimit = Number(client?.storageLimitBytes);
  return customLimit > 0 ? customLimit : getPlanLimits(client?.plan).storageLimitBytes;
}

function getClientMaxVideoSize(client) {
  const planLimit = uploadLimitBytes(getPlanConfig(client?.plan).name, "video");
  if (!IS_PLAYER_BUILD && planLimit) return planLimit;
  const customLimit = Number(client?.maxVideoSizeBytes);
  return customLimit > 0 ? customLimit : getPlanLimits(client?.plan).maxVideoSizeBytes;
}

function getClientMaxImageSize(client) {
  const planLimit = uploadLimitBytes(getPlanConfig(client?.plan).name, "image");
  if (!IS_PLAYER_BUILD && planLimit) return planLimit;
  const customLimit = Number(client?.maxImageSizeBytes);
  return customLimit > 0 ? customLimit : getPlanLimits(client?.plan).maxImageSizeBytes;
}

function getClientUploadLimits(client) {
  return {
    ...getPlanLimits(client?.plan),
    storageLimitBytes: getClientStorageLimit(client),
    maxVideoSizeBytes: getClientMaxVideoSize(client),
    maxImageSizeBytes: getClientMaxImageSize(client),
  };
}

function getMediaStorageUsed(mediaList = []) {
  return mediaList.reduce((total, media) => total + Math.max(0, Number(media?.sizeBytes) || 0), 0);
}

function getPlaylistWeightBytes(playlist = {}) {
  return (playlist?.items || []).reduce((total, item) => total + Math.max(0, Number(item?.sizeBytes) || 0), 0);
}

function getClientScreensByStatus(screens = [], nowValue = Date.now()) {
  return screens.reduce(
    (groups, screen) => {
      const connection = getScreenConnectionStatus(screen, nowValue);
      groups[connection.key].push(screen);
      return groups;
    },
    { online: [], attention: [], "logged-offline": [], "not-logged": [] }
  );
}

function getClientCacheRisk({ client, screens = [], activePlaylistWeightBytes = 0, estimatedMonthlyTrafficBytes = 0 } = {}) {
  const plan = getPlanConfig(client?.plan);
  const hasCacheError = screens.some((screen) => ["erro", "preparando"].includes(screen.cacheStatus));
  const hasInternetSource = screens.some((screen) => !["cache"].includes(screen.currentMediaSource));
  const hasPartialCache = screens.some((screen) => screen.cacheStatus === "parcial");
  const overRecommendedPlaylist =
    Number(plan.recommendedMaxPlaylistWeightBytes || 0) > 0 &&
    activePlaylistWeightBytes > plan.recommendedMaxPlaylistWeightBytes;
  const overSoftTraffic =
    Number(plan.trafficSoftLimitBytes || 0) > 0 &&
    estimatedMonthlyTrafficBytes > plan.trafficSoftLimitBytes;
  const overWarningTraffic =
    Number(plan.trafficWarningLimitBytes || 0) > 0 &&
    estimatedMonthlyTrafficBytes > plan.trafficWarningLimitBytes;

  if (hasCacheError || overSoftTraffic || (overRecommendedPlaylist && hasInternetSource)) {
    return {
      key: "high",
      label: "Alto",
      message: "Cliente com alto risco de custo por download de mídia.",
    };
  }

  if (hasPartialCache || overWarningTraffic || overRecommendedPlaylist || hasInternetSource) {
    return {
      key: "medium",
      label: "Médio",
      message: "Acompanhar cache e peso da playlist.",
    };
  }

  return {
    key: "low",
    label: "Baixo",
    message: "Cache e playlists dentro do esperado.",
  };
}

function formatStorageSize(bytes, fractionDigits = 2) {
  const safeBytes = Math.max(0, Number(bytes) || 0);
  if (safeBytes < STORAGE_GB) return `${(safeBytes / STORAGE_MB).toFixed(safeBytes ? 1 : 0)} MB`;
  return `${(safeBytes / STORAGE_GB).toFixed(fractionDigits)} GB`;
}

function getCacheStatusLabel(screen = {}) {
  const status = screen.cacheStatus || "";
  const cached = Number(screen.cachedItems || 0);
  const total = Number(screen.totalCacheableItems || 0);

  if (status === "preparando") return `Preparando ${cached}/${total}`;
  if (status === "pronto") return `Pronto ${cached}/${total}`;
  if (status === "parcial") return `Parcial ${cached}/${total}`;
  if (status === "erro") return "Erro";
  if (total > 0) return `${cached}/${total}`;
  return "Sem mídias";
}

function getMediaSourceLabel(source) {
  if (source === "cache" || source === "local") return "Reproduzindo do cache local";
  if (source === "mixed") return "Reprodução alternada: cache local e internet";
  if (source === "remote" || source === "internet") return "Reproduzindo pela internet";
  return "Origem da reprodução não informada";
}

function getCacheSyncLabel(screen = {}) {
  const downloaded = Number(screen.cacheDownloadedItems || 0);
  const removed = Number(screen.cacheRemovedItems || 0);
  const downloadedBytes = Number(screen.lastMediaDownloadBytes || 0);
  const status = screen.cacheStatus || "";
  const cached = Number(screen.cachedItems || 0);
  const total = Number(screen.totalCacheableItems || 0);
  const failed = Number(screen.failedCacheItems || 0);

  if (downloaded > 0 && removed > 0) {
    return `Última sinc.: ${downloaded} baixada(s), ${removed} removida(s)`;
  }

  if (downloaded > 0) {
    return `Última sinc.: ${downloaded} baixada(s) • ${formatStorageSize(downloadedBytes)}`;
  }

  if (removed > 0) {
    return `Última sinc.: ${removed} removida(s)`;
  }

  if (status === "preparando" && total > 0) {
    return `Sincronizando mídias: ${cached}/${total}`;
  }

  if (status === "parcial" && total > 0) {
    const pending = Math.max(0, total - cached);
    return `Sincronização parcial: ${cached}/${total}${failed ? ` • ${failed} falha(s)` : pending ? ` • ${pending} pendente(s)` : ""}`;
  }

  if (status === "erro" && total > 0) {
    return `Falha ao sincronizar: ${failed || total} mídia(s)`;
  }

  if (status === "pronto" && total > 0) {
    return "Última sinc.: nenhuma mídia nova";
  }

  return "";
}

function formatFirestoreDate(value) {
  const ms = getTimestampMs(value);
  if (!ms) return "--";
  return new Date(ms).toLocaleString("pt-BR");
}

function getFirestoreReadErrorMessage(error) {
  if (error?.code === "permission-denied") {
    return "Sem permissão para carregar clientes. Verifique se este login está como administrador.";
  }

  if (error?.code === "unavailable") {
    return "Não foi possível conectar ao Firestore agora. Verifique a internet e tente atualizar.";
  }

  return error?.message || "Não foi possível carregar os clientes.";
}

function formatFileSizeMb(bytes) {
  return `${(Math.max(0, Number(bytes) || 0) / STORAGE_MB).toFixed(2)} MB`;
}

function formatDurationLabel(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")} min`;
}

function getStorageUsage(usedBytes, limitBytes) {
  const safeLimit = Math.max(1, Number(limitBytes) || 1);
  const percentage = Math.min(100, (Math.max(0, Number(usedBytes) || 0) / safeLimit) * 100);
  if (percentage >= 95) return { percentage, label: "Cheio", severity: "danger" };
  if (percentage >= 90) return { percentage, label: "Quase cheio", severity: "danger" };
  if (percentage >= 80) return { percentage, label: "Atenção", severity: "warning" };
  return { percentage, label: "Normal", severity: "normal" };
}

const LEGACY_PLAN_NAMES = {
  "Básico": "Start",
  Basico: "Start",
  Demo: "Demonstracao",
  Demonstracao: "Demonstracao",
  "Demonstração": "Demonstracao",
  "DemonstraÃ§Ã£o": "Demonstracao",
  demonstracao: "Demonstracao",
  Start: "Start",
  start: "Start",
  Business: "Business",
  business: "Business",
  Profissional: "Professional",
  Professional: "Professional",
  professional: "Professional",
  Enterprise: "Enterprise",
  enterprise: "Enterprise",
};

function getPlanConfig(planName) {
  const planText = String(planName || "").trim();
  const normalizedName = LEGACY_PLAN_NAMES[planName] || LEGACY_PLAN_NAMES[planText] || LEGACY_PLAN_NAMES[planText.toLowerCase()] || "Start";
  return COMMERCIAL_PLANS[normalizedName];
}

function formatCurrencyBr(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseOptionalMoney(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function formatSetupFee(client) {
  const value = parseOptionalMoney(client?.setupFee);
  return value === null ? "Valor da adesão não informado" : formatCurrencyBr(value);
}

function getSetupInfo(client = {}) {
  const setupEnabled = client.setupEnabled === true;
  const setupStatus = client.setupStatus || "Não informada";
  const setupPaidStatus = client.setupPaidStatus || "Não informado";
  const setupFee = parseOptionalMoney(client.setupFee);

  return {
    setupEnabled,
    setupStatus,
    setupPaidStatus,
    setupFee,
    isInProgress: setupEnabled && ["Pendente", "Em implantação"].includes(setupStatus),
    isPending: setupEnabled && setupPaidStatus === "Pendente",
    isCompleted: setupEnabled && setupStatus === "Concluída",
    isPaidRevenue: setupPaidStatus === "Pago" && setupFee !== null,
  };
}

function getTodayDateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDefaultVisiblePlanKeys() {
  return Object.values(COMMERCIAL_PLANS)
    .filter((plan) => !plan.isDemo)
    .map((plan) => plan.key);
}

function isPlanVisibleForClients(plan, visiblePlanKeys) {
  const keys = Array.isArray(visiblePlanKeys) ? visiblePlanKeys : getDefaultVisiblePlanKeys();
  return keys.includes(plan.key);
}

function getClientScreenLimit(client) {
  const configuredLimit = Number(client?.screensLimit);
  return configuredLimit > 0
    ? configuredLimit
    : getPlanConfig(client?.plan).screensLimit;
}

function hasPremiumTemplates(client) {
  if (getPlanConfig(client?.plan).isDemo && typeof client?.premiumTemplatesEnabled === "boolean") {
    return client.premiumTemplatesEnabled;
  }

  return getPlanConfig(client?.plan).premiumTemplates;
}

function hasMarketingAccess(client) {
  if (getPlanConfig(client?.plan).isDemo && typeof client?.marketingEnabled === "boolean") {
    return client.marketingEnabled;
  }

  return getPlanConfig(client?.plan).marketing;
}

function isPremiumTemplate(templateOrType) {
  const type = typeof templateOrType === "string"
    ? templateOrType
    : templateOrType?.templateType || templateOrType?.type;

  return PREMIUM_TEMPLATE_TYPES.includes(type);
}

function normalizeSavedTemplate(template = {}) {
  const type = template.templateType || template.type || template.category || "aviso";
  const numericDuration = Number(template.duration || template.seconds || 15);
  const orientation =
    template.orientation === "Retrato" || template.format === "story" || template.format === "reels"
      ? "Retrato"
      : "Paisagem";
  const label = getTemplateTypeLabel(type);

  return {
    ...template,
    type,
    templateType: template.templateType || type,
    name: template.name || template.title || label,
    title: template.title || template.name || label,
    duration: Number.isFinite(numericDuration) && numericDuration > 0 ? numericDuration : 15,
    orientation,
    enabled: template.enabled !== false,
  };
}

function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function parseClientDate(value, endOfDay = false) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  if (value instanceof Date) return value;

  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T${endOfDay ? "23:59:59" : "00:00:00"}`)
    : new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPlanAccessDate(value) {
  const date = parseClientDate(value);
  if (!date) return "--";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getClientPlanAccess(client, currentDate = new Date()) {
  const now = currentDate instanceof Date ? currentDate : new Date(currentDate);
  const graceUnlockUntil = parseClientDate(client?.graceUnlockUntil);
  const hasTemporaryUnlock = Boolean(
    graceUnlockUntil && graceUnlockUntil.getTime() > now.getTime()
  );
  const explicitCanceled = client?.status === "Cancelado";
  const explicitSuspended = client?.status === "Suspenso";
  const dueDate = parseClientDate(client?.dueDate, true);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = dueDate
    ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    : null;
  const daysOverdue = dueStart && dueStart < todayStart
    ? Math.floor((todayStart.getTime() - dueStart.getTime()) / 86400000)
    : 0;

  let statusLabel = "Ativo";
  let severity = "success";
  let message = "Plano ativo. Todos os recursos estão disponíveis.";
  let canCreate = true;
  let canEdit = true;
  let canShowTvContent = true;

  if (hasTemporaryUnlock && !explicitCanceled) {
    statusLabel = "Liberação temporária";
    severity = "temporary";
    message = `Acesso liberado temporariamente até ${formatPlanAccessDate(graceUnlockUntil)}.`;
  } else if (explicitCanceled) {
    statusLabel = "Cancelado";
    severity = "suspended";
    message = "Este plano foi cancelado. Entre em contato com a Park Solutions.";
    canCreate = false;
    canEdit = false;
    canShowTvContent = false;
  } else if (explicitSuspended || daysOverdue >= 15) {
    statusLabel = "Suspenso";
    severity = "suspended";
    message = "Seu plano foi temporariamente suspenso. Regularize para reativar o serviço.";
    canCreate = false;
    canEdit = false;
    canShowTvContent = false;
  } else if (daysOverdue >= 10) {
    statusLabel = "Restrição Forte";
    severity = "strong";
    message = `Seu plano está vencido há ${daysOverdue} dias. O sistema está em modo de visualização. Regularize para voltar a editar.`;
    canCreate = false;
    canEdit = false;
  } else if (daysOverdue >= 5) {
    statusLabel = "Restrição Parcial";
    severity = "partial";
    message = `Seu plano está vencido há ${daysOverdue} dias. O conteúdo atual continua ativo, mas a criação de novos materiais está temporariamente bloqueada.`;
    canCreate = false;
  } else if (daysOverdue >= 1) {
    statusLabel = "Vencido";
    severity = "warning";
    message = `Seu plano venceu há ${daysOverdue} dia(s). Regularize para evitar restrições.`;
  }

  const isSuspended = statusLabel === "Suspenso" || statusLabel === "Cancelado";
  const isStrongRestriction = statusLabel === "Restrição Forte";
  const isPartialRestriction = statusLabel === "Restrição Parcial";
  const isOverdue = daysOverdue > 0;
  const isActive = statusLabel === "Ativo" || hasTemporaryUnlock;
  const canUseSystem = !isSuspended;

  return {
    statusLabel,
    daysOverdue,
    isActive,
    isOverdue,
    isPartialRestriction,
    isStrongRestriction,
    isSuspended,
    hasTemporaryUnlock,
    canUseSystem,
    canCreate,
    canEdit,
    canUpload: canCreate,
    canCreateScreens: canCreate,
    canCreatePlaylists: canCreate,
    canCreateTemplates: canCreate,
    canCreateMarketing: canCreate,
    canEditScreens: canEdit,
    canEditPlaylists: canEdit,
    canEditTemplates: canEdit,
    canEditMarketing: canEdit,
    canShowTvContent,
    message,
    severity,
    graceUnlockUntil,
  };
}

function getPlanRestrictionAlert(access, action = "editar conteúdos") {
  if (access.isStrongRestriction || access.isSuspended) {
    return `Plano em modo visualização. Regularize para ${action}.`;
  }

  return "Plano em restrição parcial. Regularize para criar novos conteúdos.";
}

function requirePlanPermission(access, permission, action) {
  if (!access || access[permission] !== false) return true;
  alert(getPlanRestrictionAlert(access, action));
  return false;
}

const TV_MANAGER_FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled):not([type='hidden'])",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getVisibleFocusableElements(container) {
  return Array.from(container.querySelectorAll(TV_MANAGER_FOCUSABLE_SELECTOR))
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    });
}

function focusNativeManagerElement(element) {
  if (!element) return;

  element.focus({ preventScroll: true });
  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

function handleNativeManagerDirectionalNavigation(event) {
  if (!isNativeApp()) return;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;

  const container = event.currentTarget;
  const focusableElements = getVisibleFocusableElements(container);

  if (focusableElements.length === 0) return;

  const current = document.activeElement;

  if (!focusableElements.includes(current)) {
    event.preventDefault();
    event.stopPropagation();
    focusNativeManagerElement(focusableElements[0]);
    return;
  }

  const currentRect = current.getBoundingClientRect();
  const currentCenter = {
    x: currentRect.left + currentRect.width / 2,
    y: currentRect.top + currentRect.height / 2,
  };
  const direction = {
    ArrowUp: { axis: "y", sign: -1 },
    ArrowDown: { axis: "y", sign: 1 },
    ArrowLeft: { axis: "x", sign: -1 },
    ArrowRight: { axis: "x", sign: 1 },
  }[event.key];

  const candidates = focusableElements
    .filter((element) => element !== current)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;
      const primary = (direction.axis === "x" ? dx : dy) * direction.sign;
      const cross = Math.abs(direction.axis === "x" ? dy : dx);
      const distance = Math.hypot(dx, dy);
      return {
        element,
        primary,
        score: primary + cross * 2.2 + distance * 0.08,
      };
    })
    .filter(({ primary }) => primary > 6)
    .sort((a, b) => a.score - b.score);

  event.preventDefault();
  event.stopPropagation();

  if (candidates[0]) {
    focusNativeManagerElement(candidates[0].element);
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    container.scrollBy({
      top: event.key === "ArrowDown" ? window.innerHeight * 0.55 : -window.innerHeight * 0.55,
      behavior: "smooth",
    });
  }
}

const DEFAULT_MENU_ITEMS = [
  { category: "Lanches", name: "Combo Especial", description: "Sanduíche, batata e bebida", price: "R$ 29,90" },
  { category: "Bebidas", name: "Refrigerante", description: "Lata ou copo", price: "R$ 7,00" },
  { category: "Sobremesa", name: "Doce da Casa", description: "Sobremesa especial", price: "R$ 12,00" },
  { category: "Promoção", name: "Oferta do Dia", description: "Produto em destaque", price: "R$ 24,90" },
];

const DEFAULT_PROMO_ITEMS = [
  { name: "Produto destaque", description: "Oferta principal da campanha", oldPrice: "R$ 49,90", price: "R$ 39,90" },
  { name: "Oferta 01", description: "Produto em promoção", oldPrice: "R$ 19,90", price: "R$ 14,90" },
  { name: "Oferta 02", description: "Produto em promoção", oldPrice: "R$ 29,90", price: "R$ 21,90" },
  { name: "Oferta 03", description: "Produto em promoção", oldPrice: "R$ 12,90", price: "R$ 9,90" },
];

const DEFAULT_CORPORATE_ITEMS = [
  "Atendimento com qualidade e agilidade",
  "Agenda do dia disponível na recepção",
  "Novos comunicados atualizados em tempo real",
];

const DEFAULT_AGENDA_ITEMS = [
  { time: "08:00", title: "Abertura", responsible: "Equipe" },
  { time: "10:00", title: "Reunião", responsible: "Coordenação" },
  { time: "15:00", title: "Atendimento", responsible: "Recepção" },
];

const DEFAULT_INDICATOR_ITEMS = [
  { label: "Atendimento", value: "98%", note: "Satisfação" },
  { label: "Agenda", value: "12", note: "Eventos hoje" },
  { label: "Status", value: "OK", note: "Operação" },
];

const DEFAULT_FOOTBALL_COMPETITIONS = [
  { id: "brasileirao_a", name: "Campeonato Brasileiro Serie A", category: "Brasil", enabled: true, priority: 1, sportsDbLeagueId: "4351", gender: "Male" },
  { id: "brasileirao_b", name: "Campeonato Brasileiro Serie B", category: "Brasil", enabled: false, priority: 2, gender: "Male" },
  { id: "brasileirao_c", name: "Campeonato Brasileiro Serie C", category: "Brasil", enabled: false, priority: 3, gender: "Male" },
  { id: "brasileirao_d", name: "Campeonato Brasileiro Serie D", category: "Brasil", enabled: false, priority: 3, sportsDbLeagueId: "5079", gender: "Male" },
  { id: "brasileirao_feminino", name: "Brasileirao Feminino A1", category: "Brasil", enabled: false, priority: 2, sportsDbLeagueId: "5201", gender: "Female" },
  { id: "copa_do_brasil", name: "Copa do Brasil", category: "Brasil", enabled: false, priority: 2 },
  { id: "supercopa_brasil", name: "Supercopa do Brasil", category: "Brasil", enabled: false, priority: 3 },
  { id: "estaduais", name: "Estaduais", category: "Brasil", enabled: false, priority: 3 },
  { id: "acreano", name: "Campeonato Acreano", category: "Brasil", enabled: false, priority: 4, sportsDbLeagueId: "5676" },
  { id: "alagoano", name: "Campeonato Alagoano", category: "Brasil", enabled: false, priority: 4, sportsDbLeagueId: "5677" },
  { id: "amapaense", name: "Campeonato Amapaense", category: "Brasil", enabled: false, priority: 4, sportsDbLeagueId: "5678" },
  { id: "copa_do_nordeste", name: "Copa do Nordeste", category: "Brasil", enabled: false, priority: 2 },
  { id: "libertadores", name: "Libertadores", category: "America do Sul", enabled: false, priority: 2 },
  { id: "sul_americana", name: "Copa Sul-Americana", category: "America do Sul", enabled: false, priority: 2 },
  { id: "recopa_sul_americana", name: "Recopa Sul-Americana", category: "America do Sul", enabled: false, priority: 3 },
  { id: "champions_league", name: "Champions League", category: "Europa", enabled: false, priority: 1 },
  { id: "europa_league", name: "Europa League", category: "Europa", enabled: false, priority: 2 },
  { id: "conference_league", name: "Conference League", category: "Europa", enabled: false, priority: 3 },
  { id: "premier_league", name: "Premier League", category: "Europa", enabled: false, priority: 1 },
  { id: "la_liga", name: "La Liga", category: "Europa", enabled: false, priority: 2 },
  { id: "serie_a_italiana", name: "Serie A Italiana", category: "Europa", enabled: false, priority: 2 },
  { id: "bundesliga", name: "Bundesliga", category: "Europa", enabled: false, priority: 2 },
  { id: "ligue_1", name: "Ligue 1", category: "Europa", enabled: false, priority: 3 },
  { id: "liga_portugal", name: "Liga Portugal", category: "Europa", enabled: false, priority: 3 },
  { id: "copa_do_mundo", name: "Copa do Mundo", category: "Internacional", enabled: false, priority: 1 },
  { id: "mundial_de_clubes", name: "Mundial de Clubes", category: "Internacional", enabled: false, priority: 1 },
  { id: "eliminatorias", name: "Eliminatorias", category: "Internacional", enabled: false, priority: 2 },
  { id: "amistosos", name: "Amistosos Internacionais", category: "Internacional", enabled: false, priority: 4 },
];

const SPORTSDB_API_KEY = "123";
const SPORTSDB_API_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}`;
const SPORTSDB_CACHE_TTL_MS = 3 * 60 * 1000;
const sportsDbMemoryCache = new Map();

const DEFAULT_SPORTS_MATCHES = [
  { id: "demo-live-1", sport: "football", competitionId: "brasileirao_a", competitionName: "Campeonato Brasileiro Serie A", status: "live", homeTeam: "Natal FC", awayTeam: "Arena Clube", homeScore: 2, awayScore: 1, startTime: "20:30", matchTime: "68'", period: "2 tempo", venue: "Arena das Dunas", lastEvent: "Gol de Natal FC aos 66'", priority: 1 },
  { id: "demo-live-2", sport: "football", competitionId: "libertadores", competitionName: "Libertadores", status: "live", homeTeam: "Atletico Sul", awayTeam: "Deportivo Norte", homeScore: 0, awayScore: 0, startTime: "21:00", matchTime: "31'", period: "1 tempo", venue: "Estadio Central", lastEvent: "Pressao do mandante", priority: 2 },
  { id: "demo-finished-1", sport: "football", competitionId: "copa_do_brasil", competitionName: "Copa do Brasil", status: "finished", homeTeam: "Litoral", awayTeam: "Serrano", homeScore: 3, awayScore: 2, startTime: "18:00", period: "Encerrado", venue: "Estadio Municipal", lastEvent: "Fim de jogo", priority: 2 },
  { id: "demo-upcoming-1", sport: "football", competitionId: "brasileirao_a", competitionName: "Campeonato Brasileiro Serie A", status: "scheduled", homeTeam: "Parque EC", awayTeam: "Uniao RN", startTime: "22:00", venue: "Arena Park", lastEvent: "Proximo jogo", priority: 1 },
];

const DEFAULT_OTHER_SPORTS_EVENTS = [
  { id: "basket-demo", sport: "Basquete", status: "live", title: "Liga Nacional", score: "72 x 68", detail: "4 quarto", priority: "Media" },
  { id: "volley-demo", sport: "Volei", status: "scheduled", title: "Superliga", score: "21:30", detail: "Proxima partida", priority: "Baixa" },
  { id: "f1-demo", sport: "Formula 1", status: "finished", title: "Classificacao", score: "P1", detail: "Volta mais rapida", priority: "Alta" },
];

const DEFAULT_SPORTS_TABLE_ROWS = [
  { position: 1, team: "America/RN", points: 31 },
  { position: 2, team: "Sousa", points: 29 },
  { position: 3, team: "Santa Cruz/RN", points: 26 },
  { position: 4, team: "Treze", points: 24 },
];

const DEFAULT_BRASILEIRAO_SERIE_A_TABLE_ROWS = [
  { position: 1, team: "Flamengo", points: "-" },
  { position: 2, team: "Palmeiras", points: "-" },
  { position: 3, team: "Cruzeiro", points: "-" },
  { position: 4, team: "Botafogo", points: "-" },
  { position: 5, team: "Bahia", points: "-" },
  { position: 6, team: "Sao Paulo", points: "-" },
  { position: 7, team: "Fluminense", points: "-" },
  { position: 8, team: "Atletico Mineiro", points: "-" },
];

const DEFAULT_OTHER_SPORTS_OPTIONS = [
  { id: "basquete", name: "Basquete", sportsDbSport: "Basketball", enabled: true, priority: "Media" },
  { id: "volei", name: "Volei", sportsDbSport: "Volleyball", enabled: true, priority: "Baixa" },
  { id: "tenis", name: "Tenis", sportsDbSport: "Tennis", enabled: false, priority: "Baixa" },
  { id: "formula_1", name: "Formula 1", sportsDbSport: "Motorsport", enabled: true, priority: "Alta" },
  { id: "futsal", name: "Futsal", enabled: false, priority: "Media" },
  { id: "outros", name: "Outros", enabled: false, priority: "Baixa" },
];

function getTemplateMenuItems(template) {
  return Array.isArray(template?.menuItems) && template.menuItems.length > 0
    ? template.menuItems
    : DEFAULT_MENU_ITEMS;
}

function getTemplatePromoItems(template) {
  return Array.isArray(template?.promoItems) && template.promoItems.length > 0
    ? template.promoItems
    : DEFAULT_PROMO_ITEMS;
}

function getTemplateCorporateItems(template) {
  return Array.isArray(template?.corporateItems) && template.corporateItems.length > 0
    ? template.corporateItems
    : DEFAULT_CORPORATE_ITEMS;
}

function getTemplateAgendaItems(template) {
  return Array.isArray(template?.agendaItems) && template.agendaItems.length > 0
    ? template.agendaItems
    : DEFAULT_AGENDA_ITEMS;
}

function getTemplateIndicatorItems(template) {
  return Array.isArray(template?.indicatorItems) && template.indicatorItems.length > 0
    ? template.indicatorItems
    : DEFAULT_INDICATOR_ITEMS;
}

function getSportsFootballCompetitions(template = {}) {
  const saved = Array.isArray(template.footballCompetitions)
    ? template.footballCompetitions
    : [];

  return DEFAULT_FOOTBALL_COMPETITIONS.map((competition) => ({
    ...competition,
    ...(saved.find((item) => item.id === competition.id) || {}),
  }));
}

function isWomenFootballText(value = "") {
  return /\b(women|woman|feminino|feminina|femininas|femininos)\b/i.test(String(value || ""));
}

function isMaleProfessionalFootballCompetition(competition = {}) {
  if (competition.gender === "Female") return false;
  if (competition.id === "brasileirao_feminino") return false;
  return !isWomenFootballText(`${competition.name || ""} ${competition.strLeague || ""}`);
}

function isMaleProfessionalFootballMatch(match = {}) {
  return !isWomenFootballText([
    match.competitionName,
    match.homeTeam,
    match.awayTeam,
    match.title,
    match.detail,
  ].filter(Boolean).join(" "));
}

function getSportsFootballMode(template = {}) {
  const mode = String(template.footballMode || template.sportsDataMode || "brasileirao_a").trim();
  return ["brasileirao_a", "selected", "manual"].includes(mode) ? mode : "brasileirao_a";
}

function getEnabledFootballCompetitions(template = {}) {
  const competitions = getSportsFootballCompetitions(template).filter(isMaleProfessionalFootballCompetition);
  const footballMode = getSportsFootballMode(template);

  if (footballMode === "brasileirao_a" || footballMode === "manual") {
    return competitions.filter((competition) => competition.id === "brasileirao_a");
  }

  const enabled = competitions.filter((competition) => competition.enabled);

  return enabled.length
    ? enabled
    : competitions.filter((competition) => competition.id === "brasileirao_a");
}

function getSportsMatches(template = {}) {
  return Array.isArray(template.sportsMatches) && template.sportsMatches.length > 0
    ? template.sportsMatches
    : DEFAULT_SPORTS_MATCHES;
}

function getOtherSportsOptions(template = {}) {
  const saved = Array.isArray(template.otherSports)
    ? template.otherSports
    : [];

  return DEFAULT_OTHER_SPORTS_OPTIONS.map((sport) => ({
    ...sport,
    ...(saved.find((item) => item.id === sport.id) || {}),
  }));
}

function getSportsData(templateConfig = {}) {
  const enabledCompetitionIds = new Set(
    getEnabledFootballCompetitions(templateConfig).map((competition) => competition.id)
  );
  const matches = getSportsMatches(templateConfig)
    .filter((match) => match.sport === "football")
    .filter((match) => !match.competitionId || enabledCompetitionIds.has(match.competitionId))
    .filter(isMaleProfessionalFootballMatch)
    .sort((a, b) => Number(a.priority || 9) - Number(b.priority || 9));
  const liveFootball = matches.filter((match) => ["live", "halftime"].includes(match.status));
  const finishedFootball = matches.filter((match) => match.status === "finished");
  const upcomingFootball = matches.filter((match) => match.status === "scheduled");
  const selectedOtherSports = getOtherSportsOptions(templateConfig).filter((sport) => sport.enabled);
  const enabledOtherNames = new Set(selectedOtherSports.map((sport) => sport.name));
  const otherSportsEvents = DEFAULT_OTHER_SPORTS_EVENTS.filter((event) => enabledOtherNames.has(event.sport));

  return {
    source: "demo_manual",
    competitions: getEnabledFootballCompetitions(templateConfig),
    liveFootball,
    finishedFootball,
    upcomingFootball,
    otherSportsEvents,
    selectedOtherSports,
    primaryMatch: liveFootball[0] || finishedFootball[0] || upcomingFootball[0] || null,
  };
}

function getMatchStatusLabel(status) {
  if (status === "live") return "AO VIVO";
  if (status === "halftime") return "INTERVALO";
  if (status === "finished") return "ENCERRADO";
  if (status === "postponed") return "ADIADO";
  return "PROXIMO";
}

function getTeamInitials(name = "") {
  return String(name || "TP")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "TP";
}

function getSportsMatchScoreLabel(match = {}) {
  if (match.status === "scheduled") return "x";
  return `${match.homeScore ?? 0} x ${match.awayScore ?? 0}`;
}

function getSportsMatchLine(match = {}) {
  return `${match.homeTeam || "Mandante"} ${getSportsMatchScoreLabel(match)} ${match.awayTeam || "Visitante"}`;
}

function buildSportsTableRows(sportsData = {}, template = {}) {
  if (getSportsFootballMode(template) === "manual" && Array.isArray(template.sportsTableRows) && template.sportsTableRows.length) {
    return template.sportsTableRows.slice(0, 8);
  }

  if (Array.isArray(sportsData.tableRows) && sportsData.tableRows.length) {
    return sportsData.tableRows.slice(0, 8);
  }

  const standings = new Map();
  const finishedMatches = Array.isArray(sportsData.finishedFootball)
    ? sportsData.finishedFootball
    : [];

  finishedMatches.forEach((match) => {
    const homeTeam = String(match.homeTeam || "").trim();
    const awayTeam = String(match.awayTeam || "").trim();
    const homeScore = Number(match.homeScore ?? 0);
    const awayScore = Number(match.awayScore ?? 0);

    if (!homeTeam || !awayTeam) return;

    if (!standings.has(homeTeam)) standings.set(homeTeam, { team: homeTeam, points: 0, played: 0 });
    if (!standings.has(awayTeam)) standings.set(awayTeam, { team: awayTeam, points: 0, played: 0 });

    const home = standings.get(homeTeam);
    const away = standings.get(awayTeam);
    home.played += 1;
    away.played += 1;

    if (homeScore > awayScore) {
      home.points += 3;
    } else if (awayScore > homeScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  });

  const rows = Array.from(standings.values())
    .sort((a, b) => Number(b.points || 0) - Number(a.points || 0) || String(a.team).localeCompare(String(b.team)))
    .map((row, index) => ({ ...row, position: index + 1 }));

  if (rows.length >= 3) return rows.slice(0, 8);

  const upcomingTeams = (sportsData.upcomingFootball || [])
    .flatMap((match) => [match.homeTeam, match.awayTeam])
    .filter(Boolean)
    .filter((team, index, list) => list.indexOf(team) === index)
    .slice(0, 6)
    .map((team, index) => ({ position: index + 1, team, points: "-" }));

  if (upcomingTeams.length >= 3) return upcomingTeams;

  return getSportsFootballMode(template) === "brasileirao_a"
    ? DEFAULT_BRASILEIRAO_SERIE_A_TABLE_ROWS
    : DEFAULT_SPORTS_TABLE_ROWS;
}

function buildSportsTickerText(template = {}, sportsData = {}, primaryMatch = {}) {
  const upcoming = (sportsData.upcomingFootball || []).slice(0, 2).map((match) => {
    const when = [match.dateEvent, match.startTime || match.matchTime].filter(Boolean).join(" ");
    return `${getSportsMatchLine(match)}${when ? ` em ${when}` : ""}`;
  });
  const finished = (sportsData.finishedFootball || []).slice(0, 2).map((match) => getSportsMatchLine(match));
  const other = (sportsData.otherSportsEvents || []).slice(0, 2).map((event) => {
    const teams = [event.homeTeam, event.awayTeam].filter(Boolean).join(" x ");
    return `${event.sport || "Esporte"}: ${teams || event.detail || event.title || "evento"} ${event.score || ""}`.trim();
  });

  const parts = [...upcoming, ...finished, ...other].filter(Boolean);
  const source = sportsData.source === "TheSportsDB" ? "TheSportsDB" : "dados cadastrados";

  if (parts.length) return `Fonte ${source} - ${parts.join(" - ")}`;

  return `${template.title || "Resultados Esportivos"} - ${getSportsMatchLine(primaryMatch)} - agenda e resultados atualizados automaticamente`;
}

function getSportsDbLeagueId(competition = {}) {
  return competition.sportsDbLeagueId || null;
}

function getDefaultSportsDbCompetitions() {
  return DEFAULT_FOOTBALL_COMPETITIONS
    .filter(isMaleProfessionalFootballCompetition)
    .filter((competition) => getSportsDbLeagueId(competition))
    .sort((a, b) => Number(a.priority || 9) - Number(b.priority || 9))
    .slice(0, 4);
}

function getSportsDbCompetitions(templateConfig = {}) {
  const selected = getEnabledFootballCompetitions(templateConfig)
    .filter(isMaleProfessionalFootballCompetition)
    .filter((competition) => getSportsDbLeagueId(competition))
    .sort((a, b) => Number(a.priority || 9) - Number(b.priority || 9));

  return (selected.length ? selected : getDefaultSportsDbCompetitions()).slice(0, 4);
}

function normalizeSportsDbTime(event = {}) {
  const time = String(event.strTime || event.strTimestamp || "").trim();
  if (!time) return "Horario a definir";

  if (time.includes("T")) {
    const date = new Date(time);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
  }

  return time.slice(0, 5);
}

function mapSportsDbEvent(event = {}, competition = {}, status = "scheduled") {
  const homeScore = event.intHomeScore !== null && event.intHomeScore !== undefined && event.intHomeScore !== ""
    ? Number(event.intHomeScore)
    : null;
  const awayScore = event.intAwayScore !== null && event.intAwayScore !== undefined && event.intAwayScore !== ""
    ? Number(event.intAwayScore)
    : null;
  const isFinished = status === "finished" || homeScore !== null || awayScore !== null;

  return {
    id: event.idEvent || `${competition.id}-${event.strEvent || Date.now()}`,
    sport: "football",
    competitionId: competition.id,
    competitionName: event.strLeague || competition.name,
    status: isFinished ? "finished" : "scheduled",
    homeTeam: event.strHomeTeam || "Mandante",
    awayTeam: event.strAwayTeam || "Visitante",
    homeScore,
    awayScore,
    startTime: normalizeSportsDbTime(event),
    matchTime: isFinished ? "FT" : normalizeSportsDbTime(event),
    period: isFinished ? "Encerrado" : "Proximo jogo",
    venue: event.strVenue || "Local a definir",
    lastEvent: isFinished ? "Resultado oficial" : "Agenda oficial",
    priority: Number(competition.priority || 9),
    dateEvent: event.dateEvent || "",
    source: "TheSportsDB",
    homeLogo: event.strHomeTeamBadge || "",
    awayLogo: event.strAwayTeamBadge || "",
    leagueLogo: event.strLeagueBadge || "",
  };
}

function getLocalDateValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function mapSportsDbOtherEvent(event = {}, selectedSport = {}) {
  const hasScore = event.intHomeScore !== null && event.intHomeScore !== undefined && event.intHomeScore !== "";
  const homeScore = hasScore ? event.intHomeScore : "";
  const awayScore = event.intAwayScore !== null && event.intAwayScore !== undefined && event.intAwayScore !== ""
    ? event.intAwayScore
    : "";
  const score = hasScore
    ? `${homeScore} x ${awayScore}`
    : normalizeSportsDbTime(event);

  return {
    id: event.idEvent || `${selectedSport.id}-${event.strEvent || Date.now()}`,
    sport: selectedSport.name || event.strSport || "Esporte",
    status: hasScore || event.strStatus === "FT" ? "finished" : "scheduled",
    title: event.strLeague || event.strSport || selectedSport.name || "Evento",
    score,
    detail: event.strEvent || `${event.strHomeTeam || ""} ${event.strAwayTeam || ""}`.trim() || event.strVenue || "Agenda",
    priority: selectedSport.priority || "Media",
    dateEvent: event.dateEvent || "",
    homeTeam: event.strHomeTeam || "",
    awayTeam: event.strAwayTeam || "",
    homeLogo: event.strHomeTeamBadge || "",
    awayLogo: event.strAwayTeamBadge || "",
    leagueLogo: event.strLeagueBadge || "",
    source: "TheSportsDB",
  };
}

function mapSportsDbStandingRow(row = {}, index = 0) {
  return {
    position: Number(row.intRank || row.intPosition || index + 1),
    team: row.strTeam || row.strTeamShort || "Time",
    points: row.intPoints ?? row.intPts ?? "-",
    played: row.intPlayed ?? row.intFormedYear ?? "",
    badge: row.strTeamBadge || row.strBadge || "",
  };
}

async function fetchSportsDbJson(endpoint, signal) {
  const response = await fetch(`${SPORTSDB_API_BASE}/${endpoint}`, { signal });
  if (!response.ok) throw new Error(`TheSportsDB ${response.status}`);
  return response.json();
}

async function fetchSportsDbStandings(competition = {}, signal) {
  const leagueId = getSportsDbLeagueId(competition);
  if (!leagueId) return [];

  const currentYear = new Date().getFullYear();
  const seasons = [`${currentYear}`, `${currentYear - 1}`, `${currentYear}-${currentYear + 1}`, `${currentYear - 1}-${currentYear}`];

  for (const season of seasons) {
    try {
      const data = await fetchSportsDbJson(
        `lookuptable.php?l=${encodeURIComponent(leagueId)}&s=${encodeURIComponent(season)}`,
        signal
      );
      const rows = (data?.table || [])
        .map(mapSportsDbStandingRow)
        .filter((row) => row.team && !isWomenFootballText(row.team));

      if (rows.length) return rows;
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  return [];
}

async function fetchSportsFromTheSportsDB(templateConfig = {}) {
  if (getSportsFootballMode(templateConfig) === "manual") return null;

  const competitions = getSportsDbCompetitions(templateConfig);

  if (!competitions.length) return null;

  const cacheKey = competitions.map((competition) => getSportsDbLeagueId(competition)).join("-");
  const cached = sportsDbMemoryCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < SPORTSDB_CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const primaryCompetition = competitions.find((competition) => competition.id === "brasileirao_a") || competitions[0];
    const standingsPromise = fetchSportsDbStandings(primaryCompetition, controller.signal);
    const settled = await Promise.allSettled(
      competitions.flatMap((competition) => {
        const leagueId = getSportsDbLeagueId(competition);
        return [
          fetchSportsDbJson(`eventspastleague.php?id=${encodeURIComponent(leagueId)}`, controller.signal)
            .then((data) => ({ competition, status: "finished", events: data?.events || [] })),
          fetchSportsDbJson(`eventsnextleague.php?id=${encodeURIComponent(leagueId)}`, controller.signal)
            .then((data) => ({ competition, status: "scheduled", events: data?.events || [] })),
        ];
      })
    );

    const matches = settled
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) =>
        result.value.events
          .slice(0, 5)
          .map((event) => mapSportsDbEvent(event, result.value.competition, result.value.status))
      )
      .filter((match) => match.homeTeam && match.awayTeam)
      .filter(isMaleProfessionalFootballMatch)
      .sort((a, b) => {
        const dateA = new Date(`${a.dateEvent || ""}T${a.startTime || "00:00"}`).getTime();
        const dateB = new Date(`${b.dateEvent || ""}T${b.startTime || "00:00"}`).getTime();

        if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
          return dateA - dateB;
        }

        return Number(a.priority || 9) - Number(b.priority || 9);
      });

    const finishedFootball = matches.filter((match) => match.status === "finished").reverse();
    const upcomingFootball = matches.filter((match) => match.status === "scheduled");
    const selectedOtherSports = getOtherSportsOptions(templateConfig).filter((sport) => sport.enabled);
    const otherSportsSettled = await Promise.allSettled(
      selectedOtherSports
        .filter((sport) => sport.sportsDbSport)
        .slice(0, 4)
        .map((sport) =>
          fetchSportsDbJson(
            `eventsday.php?d=${getLocalDateValue(0)}&s=${encodeURIComponent(sport.sportsDbSport)}`,
            controller.signal
          ).then((data) => ({
            sport,
            events: data?.events || [],
          }))
        )
    );
    const realOtherSportsEvents = otherSportsSettled
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) =>
        result.value.events
          .slice(0, 2)
          .map((event) => mapSportsDbOtherEvent(event, result.value.sport))
      )
      .slice(0, 6);
    const standingsResult = await Promise.allSettled([standingsPromise]);
    const tableRows = standingsResult[0]?.status === "fulfilled" && standingsResult[0].value.length
      ? standingsResult[0].value
      : (primaryCompetition?.id === "brasileirao_a" ? DEFAULT_BRASILEIRAO_SERIE_A_TABLE_ROWS : []);

    if (!matches.length && !tableRows.length) return null;

    const realData = {
      source: "TheSportsDB",
      sourceSyncedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      competitions,
      liveFootball: [],
      finishedFootball,
      upcomingFootball,
      otherSportsEvents: realOtherSportsEvents.length
        ? realOtherSportsEvents
        : getSportsData(templateConfig).otherSportsEvents,
      selectedOtherSports,
      tableRows,
      primaryMatch: upcomingFootball[0]
        || finishedFootball[0]
        || matches[0]
        || getSportsData(templateConfig).primaryMatch,
    };

    sportsDbMemoryCache.set(cacheKey, {
      cachedAt: Date.now(),
      data: realData,
    });

    return realData;
  } catch (error) {
    console.log("Erro ao buscar esportes na TheSportsDB:", error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

const TEMPLATE_LIVE_CONTENT_CACHE_TTL_MS = 4 * 60 * 1000;
const templateLiveContentCache = new Map();

function isWeatherLiveTemplate(type) {
  return ["clima", "jornal_premium", "clima_premium_v2", "hora_certa_premium", "tela_corporativa_personalizada"].includes(type);
}

function isTemplateLiveContentType(type) {
  return isWeatherLiveTemplate(type) || isRssTemplateType(type) || type === "resultados_esportivos_premium";
}

function getTemplateLiveContentCacheKey(template = {}) {
  const type = template.templateType || template.type || "";
  const activeCity = getActiveTemplateWeatherCity(template);
  const activeTideBeach = getActiveTemplateTideBeach(template);
  return JSON.stringify({
    type,
    city: activeCity || template.city || template.weatherCity || "",
    weatherCities: template.weatherCities || "",
    tideBeach: activeTideBeach || template.tideBeach || "",
    tideBeaches: template.tideBeaches || "",
    tideStation: template.tideStation || "",
    locationRotationInterval: template.locationRotationInterval || "",
    newsFeedUrl: template.newsFeedUrl || "",
    selectedNewsSources: template.selectedNewsSources || [],
    footballMode: template.footballMode || "",
    footballCompetitions: template.footballCompetitions || [],
    otherSports: template.otherSports || [],
  });
}

function getCachedTemplateLiveContent(template = {}) {
  const cached = templateLiveContentCache.get(getTemplateLiveContentCacheKey(template));
  if (!cached?.data) return null;
  if (Date.now() - cached.cachedAt > TEMPLATE_LIVE_CONTENT_CACHE_TTL_MS) return null;
  return cached.data;
}

async function fetchTemplateLiveContent(template = {}) {
  const realTemplateType = template.templateType || template.type;
  const result = {};
  const tasks = [];

  if (isWeatherLiveTemplate(realTemplateType)) {
    tasks.push(
      fetchWeatherByCity(getActiveTemplateWeatherCity(template))
        .then((weather) => {
          result.weather = weather;
        })
    );
  }

  if (realTemplateType === "clima_premium_v2") {
    tasks.push(
      fetchTideForecastForTemplate(template)
        .then((tideForecast) => {
          result.tideForecast = tideForecast;
        })
    );
  }

  if (isRssTemplateType(realTemplateType)) {
    tasks.push(
      Promise.all(
        (getTemplateNewsFeedUrls(template).length ? getTemplateNewsFeedUrls(template) : [template.newsFeedUrl])
          .map((feedUrl) => fetchNewsFromRss(feedUrl))
      ).then((newsLists) => {
        const collectedNews = newsLists.flat().filter((item) => item?.title);
        const realNews = collectedNews.filter((item) => !isDefaultNewsItem(item));
        const topicalNews = realTemplateType === "tendencia_beleza_premium"
          ? filterBeautyNewsItems(realNews.length ? realNews : collectedNews)
          : (realNews.length ? realNews : collectedNews);
        const news = topicalNews.slice(0, 12);
        result.news = news.length ? news : DEFAULT_NEWS_ITEMS;
      })
    );
  }

  if (realTemplateType === "resultados_esportivos_premium") {
    tasks.push(
      fetchSportsFromTheSportsDB(template)
        .then((sportsData) => {
          result.sportsData = sportsData;
        })
    );
  }

  await Promise.all(tasks);
  return result;
}

function primeTemplateLiveContent(template = {}, options = {}) {
  const type = template.templateType || template.type;
  if (!isTemplateLiveContentType(type)) return Promise.resolve(null);

  const cacheKey = getTemplateLiveContentCacheKey(template);
  const cached = templateLiveContentCache.get(cacheKey);

  if (!options.force && cached) {
    if (cached.data && Date.now() - cached.cachedAt < TEMPLATE_LIVE_CONTENT_CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }

    if (cached.promise) return cached.promise;
  }

  const promise = fetchTemplateLiveContent(template)
    .then((data) => {
      templateLiveContentCache.set(cacheKey, {
        cachedAt: Date.now(),
        data,
      });
      return data;
    })
    .catch((error) => {
      templateLiveContentCache.delete(cacheKey);
      throw error;
    });

  templateLiveContentCache.set(cacheKey, {
    cachedAt: Date.now(),
    data: cached?.data || null,
    promise,
  });

  return promise;
}

const firebaseConfig = {
  apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
  authDomain: "totem-park.firebaseapp.com",
  projectId: "totem-park",
  storageBucket: "totem-park.firebasestorage.app",
  messagingSenderId: "442546117681",
  appId: "1:442546117681:web:10106346df8cd91d198910",
};

const APP_BUILD_MODE = import.meta.env.VITE_APP_MODE || "web";
const IS_PLAYER_BUILD = ["player", "playerLab", "playerCanary", "playerRc", "playerPhaseB", "playerLinkFix", "playerLoopAudit", "playerTelemetry", "playerJumpDiag", "playerDecoderExperiment"].includes(APP_BUILD_MODE);
const IS_PLAYER_LAB_BUILD = APP_BUILD_MODE === "playerLab";
const IS_PLAYER_CANARY_BUILD = APP_BUILD_MODE === "playerCanary";
const IS_PLAYER_RC_BUILD = APP_BUILD_MODE === "playerRc";
const IS_PLAYER_TELEMETRY_BUILD = APP_BUILD_MODE === "playerTelemetry";
const IS_PLAYER_JUMP_DIAG_BUILD = APP_BUILD_MODE === "playerJumpDiag";
const IS_PLAYER_DECODER_EXPERIMENT_BUILD = APP_BUILD_MODE === "playerDecoderExperiment";
const IS_PLAYER_DECODER_LIFECYCLE_BUILD = IS_PLAYER_RC_BUILD || IS_PLAYER_DECODER_EXPERIMENT_BUILD;
const IS_PLAYER_PHASE_B_BUILD = APP_BUILD_MODE === "playerPhaseB";
const IS_PLAYER_LINK_FIX_BUILD = APP_BUILD_MODE === "playerLinkFix";

function PlayerOnlySplash() {
  return (
    <div className="player-only-splash">
      <div className="player-only-splash-card">
        <img src={logo} alt="Totem Park Player" />
        <span>Totem Park Player</span>
        <strong>Preparando player da TV</strong>
      </div>
    </div>
  );
}

function PlayerOnlyOrientationChoice({ screenRotation, onScreenRotationChange, onContinue }) {
  const rotationOptions = [
    { value: "horizontal", label: "Horizontal" },
    { value: "vertical", label: "Vertical" },
    { value: "horizontalInvertida", label: "Horizontal invertida" },
    { value: "verticalInvertida", label: "Vertical invertida" },
  ];

  function handleRemoteDirectionalNavigation(event) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;

    const container = event.currentTarget;
    const current = document.activeElement;
    const buttons = Array.from(container.querySelectorAll("button:not(:disabled)"))
      .filter((button) => button.offsetParent !== null);

    if (!buttons.includes(current)) return;

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    const direction = {
      ArrowUp: { axis: "y", sign: -1 },
      ArrowDown: { axis: "y", sign: 1 },
      ArrowLeft: { axis: "x", sign: -1 },
      ArrowRight: { axis: "x", sign: 1 },
    }[event.key];

    const candidates = buttons
      .filter((button) => button !== current)
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const dx = center.x - currentCenter.x;
        const dy = center.y - currentCenter.y;
        const primary = (direction.axis === "x" ? dx : dy) * direction.sign;
        const cross = Math.abs(direction.axis === "x" ? dy : dx);
        return { button, primary, cross, score: primary + cross * 2.5 };
      })
      .filter(({ primary }) => primary > 6)
      .sort((a, b) => a.score - b.score);

    event.preventDefault();
    event.stopPropagation();
    candidates[0]?.button.focus();
  }

  return (
    <div className="player-only-orientation-page" onKeyDown={handleRemoteDirectionalNavigation}>
      <div className="player-only-orientation-card">
        <img src={logo} alt="Totem Park" />
        <span className="player-only-kicker">Totem Park Player</span>
        <h1>Orientação da tela</h1>
        <p>Escolha como esta Smart TV está instalada antes de conectar o código.</p>

        <div className="app-rotation-grid player-only-rotation-grid">
          {rotationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={screenRotation === option.value ? "active" : ""}
              autoFocus={screenRotation === option.value}
              onClick={() => onScreenRotationChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button className="tv-connect-button player-only-continue-button" onClick={onContinue}>
          Continuar
        </button>
      </div>
    </div>
  );
}

function PlayerOnlyApp() {
  const navigate = useNavigate();
  const [savedTvConnection] = useState(() => readTvConnection());
  const [screenRotation, setScreenRotation] = useState(getSavedScreenRotation);
  const [showSplash, setShowSplash] = useState(true);
  const [orientationReady, setOrientationReady] = useState(() =>
    Boolean(localStorage.getItem("totempark-screen-rotation")) || Boolean(savedTvConnection)
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(timeoutId);
  }, []);

  function handleScreenRotation(rotation) {
    if (!Object.hasOwn(SCREEN_ROTATIONS, rotation)) return;

    localStorage.setItem("totempark-screen-rotation", rotation);
    setScreenRotation(rotation);
  }

  function handleOrientationContinue() {
    if (!localStorage.getItem("totempark-screen-rotation")) {
      localStorage.setItem("totempark-screen-rotation", screenRotation);
    }

    setOrientationReady(true);
    navigate("/tv", { replace: true });
  }

  const routes = (
    <Routes>
      <Route
        path="/"
        element={(
          <Navigate
            to={
              savedTvConnection
                ? `/player/${savedTvConnection.clientId}/${savedTvConnection.code}`
                : orientationReady
                  ? "/tv"
                  : "/orientacao"
            }
            replace
          />
        )}
      />
      <Route
        path="/orientacao"
        element={(
          <PlayerOnlyOrientationChoice
            screenRotation={screenRotation}
            onScreenRotationChange={handleScreenRotation}
            onContinue={handleOrientationContinue}
          />
        )}
      />
      <Route path="/tv" element={<TVConnectPage playerOnly />} />
      <Route path="/player/:clientId/:codigo" element={<PlayerPage />} />
      {IS_PLAYER_LAB_BUILD && <Route path="/diagnostico-lab" element={<PlayerLabDiagnostics />} />}
      {IS_PLAYER_CANARY_BUILD && <Route path="/diagnostico-canary" element={<PlayerLabDiagnostics />} />}
      {IS_PLAYER_RC_BUILD && <Route path="/diagnostico-rc" element={<PlayerLabDiagnostics />} />}
      {IS_PLAYER_PHASE_B_BUILD && <Route path="/diagnostico-2a2-b" element={<PlayerLabDiagnostics />} />}
      {IS_PLAYER_LINK_FIX_BUILD && <Route path="/diagnostico-link-fix" element={<PlayerLabDiagnostics />} />}
      {IS_PLAYER_TELEMETRY_BUILD && <Route path="/diagnostico-telemetria" element={<PlayerLabDiagnostics />} />}
      {(IS_PLAYER_JUMP_DIAG_BUILD || IS_PLAYER_DECODER_EXPERIMENT_BUILD) && <Route path="/diagnostico-salto" element={<PlayerLabDiagnostics />} />}
      <Route path="*" element={<Navigate to="/tv" replace />} />
    </Routes>
  );

  return (
    <div className={`native-rotation-shell player-only-shell rotation-${screenRotation}`}>
      <div className="native-rotation-content">
        {showSplash ? <PlayerOnlySplash /> : routes}
      </div>
    </div>
  );
}

function PlayerLabDiagnostics() {
  const navigate = useNavigate();
  const [report, setReport] = useState(() => getLabReport());
  const [exportStatus, setExportStatus] = useState("");
  const [exportedDiagnostic, setExportedDiagnostic] = useState(null);
  useEffect(() => {
    const refresh = () => setReport(getLabReport());
    window.addEventListener("totempark-lab-diagnostic", refresh);
    window.addEventListener("totempark-jump-diagnostic", refresh);
    const interval = setInterval(refresh, 2000);
    return () => { window.removeEventListener("totempark-lab-diagnostic", refresh); window.removeEventListener("totempark-jump-diagnostic", refresh); clearInterval(interval); };
  }, []);
  if (!labEnabled() || !report) return <Navigate to="/" replace />;
  const latest = report.events.at(-1);
  const current = Object.values(report.media).find((entry) => entry.currentSource !== "UNKNOWN");
  const operational = readPlayerTelemetryReport();
  return (
    <main className="player-lab-diagnostics">
      <header><div><span>{IS_PLAYER_DECODER_EXPERIMENT_BUILD ? "DECODER EXPERIMENTAL" : IS_PLAYER_JUMP_DIAG_BUILD ? "Somente JUMP DIAG" : IS_PLAYER_TELEMETRY_BUILD ? "Piloto 2A.2-C" : IS_PLAYER_LINK_FIX_BUILD ? "Somente LINK-FIX" : IS_PLAYER_PHASE_B_BUILD ? "Somente 2A.2-B" : IS_PLAYER_RC_BUILD ? "Somente RC" : IS_PLAYER_CANARY_BUILD ? "Somente CANARY" : "Somente LAB"}</span><h1>Diagnóstico Android 2A.2</h1></div><button onClick={() => navigate(-1)}>Voltar</button></header>
      <section className="player-lab-grid">
        <article><small>Sessão</small><strong>{report.session.id.slice(0, 8)}</strong><p>{report.session.startedAt}</p></article>
        <article><small>Downloads concluídos</small><strong>{report.totals.fileTransferCompleted}</strong><p>{report.totals.bytesDownloaded.toLocaleString("pt-BR")} bytes</p></article>
        <article><small>Cache</small><strong>{report.totals.cacheHits} hits / {report.totals.cacheMisses} misses</strong><p>{report.totals.fileTransferFailed} falhas · {report.totals.fileTransferTimeouts} timeouts</p></article>
        <article><small>Reprodução</small><strong>{report.totals.localPlaybackCount} local / {report.totals.remotePlaybackCount} remota</strong><p>Origem: {current?.currentSource || "UNKNOWN"}</p></article>
      </section>
      <section className="player-lab-current"><h2>Mídia atual/recente</h2><p>{current?.mediaName || current?.mediaId || "Nenhuma mídia registrada"}</p><p>{current?.finalFileSizeBytes?.toLocaleString("pt-BR") || 0} bytes · {current?.currentSource || "UNKNOWN"}</p></section>
      <section className="player-lab-current"><h2>Último evento</h2><p>{latest?.type || "Nenhum"} · {latest?.at || ""}</p><p>{latest?.message || "Sem erro registrado"}</p></section>
      <section className="player-lab-current"><h2>Telemetria passiva 2A.2-C</h2><p>{operational ? `${operational.lastPlayerEvents?.length || 0} eventos · ${operational.transitions?.length || 0} transições` : "Desativada ou sem dados"}</p><p>{operational?.current?.lastPlayerEvent || "Nenhum evento operacional"}</p></section>
      <button className="player-lab-export" onClick={async () => {
        setExportedDiagnostic(null);
        setExportStatus("Exportando diagnóstico...");
        try {
          const result = await exportLabReport();
          if (IS_PLAYER_DECODER_EXPERIMENT_BUILD) {
            setExportedDiagnostic(result);
            setExportStatus("DIAGNÓSTICO EXPORTADO");
          } else {
            setExportStatus(`Salvo em: ${result}`);
          }
        } catch (error) {
          setExportStatus(`ERRO DE EXPORTAÇÃO: ${error?.message || error}`);
        }
      }}>Exportar diagnóstico JSON</button>
      {IS_PLAYER_DECODER_EXPERIMENT_BUILD && <section className="player-lab-current">
        <h2>{exportStatus || "Exportação pública do diagnóstico"}</h2>
        {exportedDiagnostic && <>
          <p>Arquivo: {exportedDiagnostic.fileName}</p>
          <p>Local: {exportedDiagnostic.fallback ? "FALLBACK: " : ""}{exportedDiagnostic.folder}</p>
          <p>Tamanho: {(exportedDiagnostic.sizeBytes / 1024).toFixed(1)} KB</p>
          <p>Sessão: {exportedDiagnostic.sessionId.slice(0, 8)}</p>
          <p>Versão: {exportedDiagnostic.appVersion}</p>
          <button className="player-lab-export" onClick={async () => {
            try { await shareLastDecoderDiagnostic(); }
            catch (error) { setExportStatus(`Compartilhamento falhou: ${error?.message || error}`); }
          }}>Compartilhar JSON</button>
        </>}
        <details><summary>Ver eventos</summary><pre>{JSON.stringify(getJumpEvents(), null, 2)}</pre></details>
      </section>}
      {IS_PLAYER_JUMP_DIAG_BUILD && <section className="player-lab-current"><h2>Salto · últimos {getJumpEvents().length} eventos</h2><p>{exportStatus || "Os eventos ficam salvos localmente e visíveis aqui."}</p><button className="player-lab-export" onClick={async () => { const json = JSON.stringify({ diagnostic: getLabReport(), jumpEvents: getJumpEvents() }, null, 2); try { await navigator.clipboard.writeText(json); setExportStatus("JSON copiado."); } catch (error) { setExportStatus(`Cópia indisponível: ${error?.message || error}`); } }}>Copiar JSON</button><button className="player-lab-export" onClick={async () => { const json = JSON.stringify({ diagnostic: getLabReport(), jumpEvents: getJumpEvents() }, null, 2); const file = new File([json], "totempark-jump-diagnostic.json", { type: "application/json" }); try { if (!navigator.canShare?.({ files: [file] })) throw new Error("Compartilhamento de arquivo indisponível nesta TV"); await navigator.share({ files: [file], title: "Diagnóstico do salto" }); setExportStatus("JSON compartilhado."); } catch (error) { setExportStatus(`Compartilhamento indisponível: ${error?.message || error}`); } }}>Compartilhar JSON</button><details><summary>Ver eventos</summary><pre>{JSON.stringify(getJumpEvents(), null, 2)}</pre></details></section>}
      <details><summary>Relatório por mídia</summary><pre>{JSON.stringify(report.media, null, 2)}</pre></details>
    </main>
  );
}


export default function App() {
  return IS_PLAYER_BUILD ? <PlayerOnlyApp /> : <FullApp />;
}

function FullApp() {
  const [screenRotation, setScreenRotation] = useState(getSavedScreenRotation);

  function handleScreenRotation(rotation) {
    if (!isNativeApp() || !Object.hasOwn(SCREEN_ROTATIONS, rotation)) return;

    localStorage.setItem("totempark-screen-rotation", rotation);
    setScreenRotation(rotation);
  }

  const routes = (
    <Routes>
      <Route
        path="/"
        element={(
          <AdminApp
            screenRotation={screenRotation}
            onScreenRotationChange={handleScreenRotation}
          />
        )}
      />
      <Route path="/solicitar-conta" element={<AccountRequestPage />} />
      <Route path="/tv" element={<TVConnectPage />} />
      <Route path="/player/:clientId/:codigo" element={<PlayerPage />} />
    </Routes>
  );

  if (!isNativeApp()) return routes;

  return (
    <div className={`native-rotation-shell rotation-${screenRotation}`}>
      <div className="native-rotation-content">
        {routes}
      </div>
    </div>
  );
}

function AdminApp({ screenRotation, onScreenRotationChange }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("AUTH_LOADING");
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedClient, setSelectedClient] = useState(null);
  const [telemetryFocus, setTelemetryFocus] = useState(null);
  const [appMode, setAppMode] = useState(() => {
    if (!isNativeApp()) return "web";

    return "";
  });

  useEffect(() => {
    let unsubscribeClient = null;
    let unsubscribeAuth = () => {};
    let active = true;

    const observeAuth = () => onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeClient) {
        unsubscribeClient();
        unsubscribeClient = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setAuthStatus("UNAUTHENTICATED");
        return;
      }

      // Firebase has conclusively restored a session. Profile reads may retry or
      // fail transiently without turning that authenticated session into a logout.
      setAuthStatus("AUTHENTICATED");

      const userEmail = normalizeEmail(firebaseUser.email);

      try {
        const masterEmails = await loadMasterEmails();

        if (masterEmails.includes(userEmail)) {
          setUser({
            uid: firebaseUser.uid,
            email: userEmail,
            role: "admin",
          });

          return;
        }
      } catch (error) {
        console.log("Nao foi possivel carregar masters do sistema:", error);
      }

      const clientQuery = query(
        collection(db, "clients"),
        where("uid", "==", firebaseUser.uid)
      );

      unsubscribeClient = onSnapshot(
        clientQuery,
        (snapshot) => {
          if (snapshot.empty) {
            getDoc(doc(db, ACCOUNT_REQUESTS_COLLECTION, getAccountRequestDocId(userEmail)))
              .then((requestSnapshot) => {
                if (requestSnapshot.exists()) {
                  setUser({
                    uid: firebaseUser.uid,
                    email: userEmail,
                    role: "pending",
                    requestData: {
                      id: requestSnapshot.id,
                      ...requestSnapshot.data(),
                    },
                  });
                } else {
                  setUser({
                    uid: firebaseUser.uid,
                    email: userEmail,
                    role: "client",
                    clientData: null,
                  });
                }

              })
              .catch((error) => {
                console.log("Nao foi possivel verificar solicitacao pendente:", error);
                setUser({
                  uid: firebaseUser.uid,
                  email: userEmail,
                  role: "client",
                  clientData: null,
                });
              });
            return;
          } else {
            const clientDoc = snapshot.docs[0];
            const clientData = {
              id: clientDoc.id,
              ...clientDoc.data(),
            };

            if (clientData.accountStatus === PENDING_ACCOUNT_STATUS) {
              setUser({
                uid: firebaseUser.uid,
                email: userEmail,
                role: "pending",
                requestData: clientData,
              });
              return;
            }

            setUser({
              uid: firebaseUser.uid,
              email: userEmail,
              role: "client",
              clientData,
            });
          }

        },
        (error) => {
          console.log(error);
          // Keep the last resolved profile. Firestore listener errors (for example
          // while a suspended tab reconnects) are not authentication failures.
        }
      );
    });

    authPersistenceReady
      .catch(() => undefined)
      .then(() => {
        if (active) unsubscribeAuth = observeAuth();
      });

    return () => {
      active = false;
      unsubscribeAuth();

      if (unsubscribeClient) {
        unsubscribeClient();
      }
    };
  }, []);

  useEffect(() => {
    if (!isNativeApp() || appMode === "tv" || !user) return undefined;

    const timeoutId = setTimeout(() => {
      const managerApp = document.querySelector(".native-manager-app");
      if (!managerApp) return;
      if (managerApp.contains(document.activeElement) && document.activeElement !== document.body) return;

      focusNativeManagerElement(getVisibleFocusableElements(managerApp)[0]);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [user?.uid, appMode, activePage, selectedClient?.id]);

  if (authStatus === "AUTH_LOADING" || (authStatus === "AUTHENTICATED" && !user)) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Carregando...</h1>
        </div>
      </div>
    );
  }

  if (authStatus === "UNAUTHENTICATED") return <LoginPage />;

  if (user.role === "pending") {
    return <PendingAccountPanel onBack={() => signOut(auth)} />;
  }

  if (user.role === "client") {
    if (!user.clientData) {
      return (
        <div className="login-page">
          <div className="login-card">
            <h1>Cliente não encontrado</h1>
            <p>
              Este login existe no Firebase Authentication, mas não está
              vinculado a nenhum cliente no Firestore.
            </p>
            <button className="login-button" onClick={() => signOut(auth)}>
              Sair
            </button>
          </div>
        </div>
      );
    }

    if (isNativeApp() && !appMode) {
      return (
        <AppModeChoice
          client={user.clientData}
          screenRotation={screenRotation}
          onScreenRotationChange={onScreenRotationChange}
          onSelectMode={(mode) => {
            localStorage.setItem("totempark-app-mode", mode);
            setAppMode(mode);
          }}
        />
      );
    }

    if (isNativeApp() && appMode === "tv") {
      return <TVConnectPage />;
    }

    return (
      <div
        className={isNativeApp() ? "app native-manager-app" : "app"}
        onKeyDown={isNativeApp() ? handleNativeManagerDirectionalNavigation : undefined}
      >
        <div className="layout">
          <aside className="sidebar">
            <div className="logo-area">
              <div className="logo-image-box">
                <img src={logo} alt="Totem Park" className="logo-image" />
              </div>

              <div>
                <div className="logo-title">Totem Park</div>
                <div className="logo-subtitle">Painel do Cliente</div>
              </div>
            </div>

            <div className="sidebar-card">
              <div className="client-sidebar-profile">
                <div className="client-avatar">
                  {user.clientData.logoUrl ? (
                    <img src={user.clientData.logoUrl} alt={`Logo de ${user.clientData.name}`} />
                  ) : (
                    user.clientData.name?.charAt(0)?.toUpperCase() || "C"
                  )}
                </div>
                <div>
                  <strong>{user.clientData.name}</strong>
                  <p>
                    Plano {getPlanConfig(user.clientData.plan).name} • {user.clientData.billing}
                  </p>
                </div>
              </div>
            </div>

            <button
              className="logout-button"
              onClick={() => {
                localStorage.removeItem("totempark-app-mode");
                signOut(auth);
              }}
            >
              <LogOut size={18} />
              Sair
            </button>
          </aside>

          <main className="content">
            {isNativeApp() && (
              <div className="native-mode-switch">
                <span>Modo Gestor ativo</span>

                <button
                  onClick={() => {
                    localStorage.removeItem("totempark-app-mode");
                    setAppMode("");
                  }}
                >
                  Trocar modo
                </button>
              </div>
            )}

            <ClientInternalPanel
              client={user.clientData}
              hideBackButton
              isAdmin={false}
            />
            <Footer />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className={isNativeApp() ? "app native-manager-app" : "app"}
      onKeyDown={isNativeApp() ? handleNativeManagerDirectionalNavigation : undefined}
    >
      <div className="layout">
        <aside className="sidebar">
          <div className="logo-area">
            <div className="logo-image-box">
              <img src={logo} alt="Totem Park" className="logo-image" />
            </div>

            <div>
              <div className="logo-title">Totem Park</div>
              <div className="logo-subtitle">Gestor Park Solutions</div>
            </div>
          </div>

          <nav className="menu">
            <MenuItem
              icon={<LayoutDashboard size={20} />}
              text="Dashboard"
              active={activePage === "dashboard" && !selectedClient}
              onClick={() => {
                setSelectedClient(null);
                setActivePage("dashboard");
              }}
            />

            <MenuItem
              icon={<Monitor size={20} />}
              text="Telemetria"
              active={activePage === "telemetry" && !selectedClient}
              onClick={() => {
                setSelectedClient(null);
                setActivePage("telemetry");
              }}
            />

            <MenuItem
              icon={<Users size={20} />}
              text="Clientes"
              active={activePage === "clients" && !selectedClient}
              onClick={() => {
                setSelectedClient(null);
                setActivePage("clients");
              }}
            />

            <MenuItem
              icon={<MessageSquare size={20} />}
              text="Solicitações"
              active={activePage === "accountRequests" && !selectedClient}
              onClick={() => {
                setSelectedClient(null);
                setActivePage("accountRequests");
              }}
            />

            <MenuItem
              icon={<CreditCard size={20} />}
              text="Planos"
              active={activePage === "plans" && !selectedClient}
              onClick={() => {
                setSelectedClient(null);
                setActivePage("plans");
              }}
            />

            <MenuItem
              icon={<Settings size={20} />}
              text="Configurações"
              active={activePage === "settings" && !selectedClient}
              onClick={() => {
                setSelectedClient(null);
                setActivePage("settings");
              }}
            />
          </nav>

          <div className="sidebar-card">
            <strong>Desenvolvido por Park Solutions</strong>
            <p>Sistema profissional de TVs e totens digitais.</p>
          </div>

          <button className="logout-button" onClick={() => signOut(auth)}>
            <LogOut size={18} />
            Sair
          </button>
        </aside>

        <main className="content">
          {!selectedClient && activePage === "dashboard" && <Dashboard onNavigate={setActivePage} onOpenTelemetry={(screen) => {
            setTelemetryFocus({ clientId: screen.clientId, id: screen.id });
            setActivePage("telemetry");
          }} />}
          {!selectedClient && activePage === "telemetry" && <TelemetryDashboard focusScreen={telemetryFocus} />}
          {!selectedClient && activePage === "clients" && (
            <ClientsPage onOpenClient={setSelectedClient} />
          )}
          {!selectedClient && activePage === "accountRequests" && (
            <AccountRequestsPage />
          )}
          {!selectedClient && activePage === "plans" && <PlansPage />}
          {!selectedClient && activePage === "settings" && (
            <SettingsPage user={user} />
          )}

          {selectedClient && (
            <ClientInternalPanel
              client={selectedClient}
              onBack={() => setSelectedClient(null)}
              isAdmin
              adminUser={user}
            />
          )}

          <Footer />
        </main>
      </div>
    </div>
  );
}


function AppModeChoice({
  client,
  onSelectMode,
  screenRotation,
  onScreenRotationChange,
}) {
  const rotationOptions = [
    { value: "horizontal", label: "Horizontal" },
    { value: "vertical", label: "Vertical" },
    { value: "horizontalInvertida", label: "Horizontal invertida" },
    { value: "verticalInvertida", label: "Vertical invertida" },
  ];

  function handleRemoteDirectionalNavigation(event) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;

    const container = event.currentTarget;
    const current = document.activeElement;
    const buttons = Array.from(container.querySelectorAll("button:not(:disabled)"))
      .filter((button) => button.offsetParent !== null);

    if (!buttons.includes(current)) return;

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    const direction = {
      ArrowUp: { axis: "y", sign: -1 },
      ArrowDown: { axis: "y", sign: 1 },
      ArrowLeft: { axis: "x", sign: -1 },
      ArrowRight: { axis: "x", sign: 1 },
    }[event.key];

    const candidates = buttons
      .filter((button) => button !== current)
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const dx = center.x - currentCenter.x;
        const dy = center.y - currentCenter.y;
        const primary = (direction.axis === "x" ? dx : dy) * direction.sign;
        const cross = Math.abs(direction.axis === "x" ? dy : dx);
        return { button, primary, cross, score: primary + cross * 2.5 };
      })
      .filter(({ primary }) => primary > 6)
      .sort((a, b) => a.score - b.score);

    event.preventDefault();
    event.stopPropagation();
    if (!candidates[0]) return;

    candidates[0].button.focus();
  }

  return (
    <div className="app-mode-page app-mode-native-only" onKeyDown={handleRemoteDirectionalNavigation}>
      <div className="app-mode-card app-mode-ultra-compact">
        <img src={logo} alt="Totem Park" />

        <div className="app-mode-kicker">Aplicativo Totem Park</div>

        <h1>Escolha o modo de uso</h1>

        <p>
          Você está logado como <strong>{client?.name}</strong>.
          <br />
          Escolha se deseja gerenciar sua conta ou abrir este dispositivo como TV.
        </p>

        {isNativeApp() && (
          <div className="app-rotation-picker">
            <span>Orientação da tela</span>

            <div className="app-rotation-grid">
              {rotationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={screenRotation === option.value ? "active" : ""}
                  autoFocus={screenRotation === option.value}
                  onClick={() => onScreenRotationChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="app-mode-grid">
          <button
            type="button"
            className="app-mode-option manager"
            onClick={() => onSelectMode("manager")}
          >
            <span>Modo Gestor</span>
            <strong>Gerenciar painel</strong>
            <p>
              Gerenciar painel, mídias, playlists, telas e configurações.
            </p>
          </button>

          <button
            type="button"
            className="app-mode-option tv"
            onClick={() => onSelectMode("tv")}
          >
            <span>Modo TV</span>
            <strong>Abrir player</strong>
            <p>
              Abrir este dispositivo como TV para exibir conteúdos.
            </p>
          </button>
        </div>

        <button
          className="app-mode-logout"
          onClick={() => {
            localStorage.removeItem("totempark-app-mode");
            signOut(auth);
          }}
        >
          Sair desta conta
        </button>

        <div className="auth-footer-brand">
          Desenvolvido por <strong>Park Solutions</strong>
        </div>
      </div>
    </div>
  );
}


function LoginPage() {
  const navigate = useNavigate();
  const mode = "login";
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleAuth(event) {
    event?.preventDefault?.();
    const email = form.email.trim().toLowerCase();

    if (!email || !form.password) {
      alert("Preencha e-mail e senha.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, form.password);
    } catch (error) {
      console.log(error);
      alert("Não foi possível entrar. Confira seus dados ou fale com nossa equipe.");
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleAuth}>
        <div className="login-logo-image">
          <img src={logo} alt="Totem Park" />
        </div>

        <p>Transforme telas em experiências que conectam.</p>

        <div className="form-group">
          <label>E-mail</label>
          <input
            type="email"
            value={form.email}
            placeholder="Digite seu e-mail"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Senha</label>
          <input
            type="password"
            value={form.password}
            placeholder="Digite sua senha"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button className="login-button" type="submit">
          Entrar
        </button>

        <button
          type="button"
          className="login-button secondary"
          onClick={() => navigate("/solicitar-conta")}
        >
          {mode === "login" ? "Criar nova conta" : "Já tenho conta"}
        </button>
      </form>
    </div>
  );
}

function AccountRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    responsibleName: "",
    email: "",
    whatsapp: "",
    role: "",
    companyName: "",
    cnpj: "",
    segment: "",
    city: "",
    state: "",
    screensEstimate: "",
    intendedUse: "",
    notes: "",
    termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT",
    "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
    "RR", "SC", "SP", "SE", "TO",
  ];
  const screenOptions = ["1 tela", "2 a 5 telas", "6 a 10 telas", "Mais de 10 telas"];
  const useOptions = [
    "TVs em ambiente comercial",
    "Totens digitais",
    "Comunicação interna",
    "Cardápio digital",
    "Publicidade",
    "Gestão de telas para clientes",
    "Ainda estou avaliando",
  ];

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function validateForm() {
    const nextErrors = {};
    [
      ["responsibleName", "Informe o nome completo."],
      ["email", "Informe o e-mail."],
      ["whatsapp", "Informe o WhatsApp."],
      ["role", "Informe o cargo ou função."],
      ["companyName", "Informe o nome da empresa."],
      ["segment", "Informe o segmento."],
      ["city", "Informe a cidade."],
      ["state", "Informe o estado."],
      ["screensEstimate", "Informe a quantidade estimada de telas."],
      ["intendedUse", "Informe a finalidade de uso."],
    ].forEach(([field, message]) => {
      if (!String(form[field] || "").trim()) nextErrors[field] = message;
    });

    if (form.email && !isValidEmail(form.email)) nextErrors.email = "Informe um e-mail válido.";
    if (form.whatsapp && onlyDigits(form.whatsapp).length < 10) {
      nextErrors.whatsapp = "Informe um WhatsApp válido com DDD.";
    }
    if (form.cnpj && !validateCnpj(form.cnpj)) {
      nextErrors.cnpj = "Informe um CNPJ válido ou deixe vazio.";
    }
    if (form.state && !states.includes(form.state)) nextErrors.state = "Selecione um estado válido.";
    if (!form.termsAccepted) nextErrors.termsAccepted = "É necessário aceitar os termos para enviar.";

    return nextErrors;
  }

  async function hasActiveDuplicate() {
    const email = normalizeEmail(form.email);
    const clientsByEmail = await getDocs(query(
      collection(db, "clients"),
      where("email", "==", email)
    ));

    if (!clientsByEmail.empty) return "Já existe uma conta ativa com este e-mail.";

    const companyName = form.companyName.trim();
    if (companyName) {
      const clientsByCompany = await getDocs(query(
        collection(db, "clients"),
        where("name", "==", companyName)
      ));

      if (!clientsByCompany.empty) return "Já existe uma empresa cadastrada com este nome.";
    }

    const cnpjDigits = onlyDigits(form.cnpj);
    if (!cnpjDigits) return "";

    const clientsByCnpj = await getDocs(query(
      collection(db, "clients"),
      where("cnpj", "==", cnpjDigits)
    ));

    return clientsByCnpj.empty ? "" : "Já existe uma empresa cadastrada com este CNPJ.";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);

      const duplicateMessage = await hasActiveDuplicate();
      if (duplicateMessage) {
        setErrors({ form: duplicateMessage });
        return;
      }

      const requestData = {
        responsibleName: form.responsibleName.trim(),
        email: normalizeEmail(form.email),
        whatsapp: form.whatsapp.trim(),
        whatsappDigits: onlyDigits(form.whatsapp),
        role: form.role.trim(),
        companyName: form.companyName.trim(),
        cnpj: onlyDigits(form.cnpj),
        cnpjDisplay: form.cnpj.trim(),
        segment: form.segment.trim(),
        city: form.city.trim(),
        state: form.state,
        screensEstimate: form.screensEstimate,
        intendedUse: form.intendedUse,
        notes: form.notes.trim(),
        status: ACCOUNT_REQUEST_STATUS.new,
        accountStatus: PENDING_ACCOUNT_STATUS,
        source: "public_signup_request",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        statusHistory: [{
          status: ACCOUNT_REQUEST_STATUS.new,
          at: new Date().toISOString(),
          by: "Solicitação pública",
        }],
      };

      await setDoc(
        doc(db, ACCOUNT_REQUESTS_COLLECTION, getAccountRequestDocId(requestData.email)),
        requestData
      );

      try {
        const emailResult = await trySendAccountRequestEmail(requestData);
        setSubmitted({ ...requestData, emailResult });
      } catch (emailError) {
        console.log("Falha segura ao enviar e-mail de solicitação:", emailError);
        setSubmitted({ ...requestData, emailResult: { failed: true } });
      }
    } catch (error) {
      console.log(error);

      if (error.code === "permission-denied" || error.code === "already-exists") {
        setErrors({
          form: "Este cadastro já foi recebido e está aguardando análise da equipe comercial.",
        });
        return;
      }

      setErrors({
        form: "Não foi possível salvar sua solicitação agora. Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <AccountRequestShell>
        <div className="account-request-success">
          <div className="account-request-icon"><CheckCircle2 size={34} /></div>
          <div className="kicker">Aguardando validação comercial</div>
          <h1>Solicitação enviada com sucesso!</h1>
          <p>
            Recebemos seus dados e sua solicitação de criação de conta na Totem Park.
            Nossa equipe comercial analisará as informações e entrará em contato em breve
            para apresentar os planos, entender as necessidades da sua empresa e concluir
            a ativação da conta.
          </p>
          <p>Também tentamos enviar uma confirmação para o e-mail informado no cadastro.</p>
          <div className="account-request-actions">
            <button className="login-button secondary" onClick={() => navigate("/")}>
              Voltar para o login
            </button>
            <a className="login-button" href={getCommercialWhatsappUrl()} target="_blank" rel="noreferrer">
              Falar com nossa equipe
            </a>
          </div>
        </div>
      </AccountRequestShell>
    );
  }

  return (
    <AccountRequestShell>
      <div className="account-request-intro">
        <div className="kicker">Totem Park</div>
        <h1>Comece com a Totem Park</h1>
        <p>
          Preencha seus dados para solicitar a criação da sua conta. Nossa equipe
          comercial analisará as informações e entrará em contato para apresentar
          a melhor solução para sua empresa.
        </p>
        <ul>
          <li>Gerencie TVs e totens em um só lugar;</li>
          <li>Publique conteúdos de forma remota;</li>
          <li>Receba orientação da equipe comercial.</li>
        </ul>
      </div>

      <form className="account-request-form" onSubmit={handleSubmit}>
        {errors.form && <div className="form-alert">{errors.form}</div>}
        <h2>Dados do responsável</h2>
        <div className="account-request-grid">
          <RequestField label="Nome completo" error={errors.responsibleName}>
            <input value={form.responsibleName} onChange={(e) => updateField("responsibleName", e.target.value)} />
          </RequestField>
          <RequestField label="E-mail" error={errors.email}>
            <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
          </RequestField>
          <RequestField label="WhatsApp" error={errors.whatsapp}>
            <input value={form.whatsapp} placeholder="84 99999-9999" onChange={(e) => updateField("whatsapp", e.target.value)} />
          </RequestField>
          <RequestField label="Cargo ou função" error={errors.role}>
            <input value={form.role} onChange={(e) => updateField("role", e.target.value)} />
          </RequestField>
        </div>

        <h2>Dados da empresa</h2>
        <div className="account-request-grid">
          <RequestField label="Nome da empresa" error={errors.companyName}>
            <input value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
          </RequestField>
          <RequestField label="CNPJ (opcional)" error={errors.cnpj}>
            <input value={form.cnpj} onChange={(e) => updateField("cnpj", e.target.value)} />
          </RequestField>
          <RequestField label="Segmento de atuação" error={errors.segment}>
            <input value={form.segment} placeholder="Ex: restaurante, loja, clínica..." onChange={(e) => updateField("segment", e.target.value)} />
          </RequestField>
          <RequestField label="Cidade" error={errors.city}>
            <input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
          </RequestField>
          <RequestField label="Estado" error={errors.state}>
            <select value={form.state} onChange={(e) => updateField("state", e.target.value)}>
              <option value="">Selecione</option>
              {states.map((state) => <option key={state}>{state}</option>)}
            </select>
          </RequestField>
          <RequestField label="Quantidade estimada de telas" error={errors.screensEstimate}>
            <select value={form.screensEstimate} onChange={(e) => updateField("screensEstimate", e.target.value)}>
              <option value="">Selecione</option>
              {screenOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </RequestField>
          <RequestField label="Finalidade de uso" error={errors.intendedUse}>
            <select value={form.intendedUse} onChange={(e) => updateField("intendedUse", e.target.value)}>
              <option value="">Selecione</option>
              {useOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </RequestField>
          <RequestField label="Observações" full>
            <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
          </RequestField>
        </div>

        <label className="account-request-terms">
          <input
            type="checkbox"
            checked={form.termsAccepted}
            onChange={(e) => updateField("termsAccepted", e.target.checked)}
          />
          <span>
            Aceito os Termos de Uso e a Política de Privacidade da Totem Park.
            Os links oficiais serão conectados quando as páginas jurídicas estiverem publicadas.
          </span>
        </label>
        {errors.termsAccepted && <small className="field-error">{errors.termsAccepted}</small>}

        <button className="login-button" type="submit" disabled={saving}>
          {saving ? "Enviando..." : "Solicitar criação da conta"}
        </button>
        <p className="account-request-note">
          O envio da solicitação não ativa a conta imediatamente. Nossa equipe entrará
          em contato para concluir o cadastro.
        </p>
        <button type="button" className="login-button secondary" onClick={() => navigate("/")}>
          Já tenho uma conta — Entrar
        </button>
      </form>
    </AccountRequestShell>
  );
}

function AccountRequestShell({ children }) {
  return (
    <div className="account-request-page">
      <div className="account-request-card">
        <div className="account-request-brand">
          <img src={logo} alt="Totem Park" />
        </div>
        {children}
        <div className="auth-footer-brand">
          Desenvolvido por <strong>Park Solutions</strong>
        </div>
      </div>
    </div>
  );
}

function RequestField({ label, error, children, full = false }) {
  return (
    <label className={`request-field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function PendingAccountPanel({ onBack }) {
  return (
    <div className="login-page">
      <div className="login-card pending-account-card">
        <div className="login-logo-image">
          <img src={logo} alt="Totem Park" />
        </div>
        <div className="kicker">Conta aguardando validação</div>
        <h1>Conta aguardando validação</h1>
        <p>
          Seu cadastro foi recebido e está sendo analisado pela nossa equipe comercial.
          Assim que a conta for aprovada e ativada, você receberá um e-mail com as
          orientações para acessar a plataforma.
        </p>
        <p>Em caso de dúvidas, entre em contato com nossa equipe.</p>
        <button className="login-button" onClick={onBack}>
          Voltar para o login
        </button>
        <a
          className="login-button secondary"
          href={getCommercialWhatsappUrl("Olá! Gostaria de consultar minha solicitação de conta na Totem Park.")}
          target="_blank"
          rel="noreferrer"
        >
          Falar com a equipe comercial
        </a>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate, onOpenTelemetry }) {
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState("");
  const [screensData, setScreensData] = useState([]);
  const [playerBindings, setPlayerBindings] = useState([]);
  const [telemetryConfig, setTelemetryConfig] = useState({ enabled: false, screenIds: [], clientIds: [], deviceIds: [] });
  const [playlistsData, setPlaylistsData] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [screenStatusFilter, setScreenStatusFilter] = useState("all");
  const [screenPage, setScreenPage] = useState(1);
  const [cachePanelExpanded, setCachePanelExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => onSnapshot(collection(db, "playerDeviceBindings"), (snapshot) => {
    setPlayerBindings(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => setPlayerBindings([])), []);

  useEffect(() => onSnapshot(doc(db, "settings", "telemetry2a2c"), (snapshot) => {
    setTelemetryConfig(snapshot.exists() ? snapshot.data() : { enabled: false, screenIds: [], clientIds: [], deviceIds: [] });
  }), []);

  useEffect(() => {
    let unsubScreens = [];
    let unsubPlaylists = [];
    let active = true;
    const clientsRef = collection(db, "clients");

    function applyClientsSnapshot(snapshot) {
      const clientsList = snapshot.docs.map((clientDoc) => ({
        id: clientDoc.id,
        ...clientDoc.data(),
      }));

      setClientsError("");
      setClients(sortClientsAlphabetically(clientsList));
      setScreensData([]);
      setPlaylistsData([]);

      unsubScreens.forEach((unsub) => unsub());
      unsubPlaylists.forEach((unsub) => unsub());

      unsubScreens = [];
      unsubPlaylists = [];

      clientsList.forEach((client) => {
        const screensRef = collection(db, "clients", client.id, "screens");
        const playlistsRef = collection(db, "clients", client.id, "playlists");

        const screenUnsub = onSnapshot(screensRef, (screensSnapshot) => {
          const clientScreens = screensSnapshot.docs.map((screenDoc) => ({
            id: screenDoc.id,
            clientId: client.id,
            clientName: client.name,
            ...screenDoc.data(),
          }));

          setScreensData((previous) => [
            ...previous.filter((screen) => screen.clientId !== client.id),
            ...clientScreens,
          ]);
        });

        const playlistUnsub = onSnapshot(playlistsRef, (playlistsSnapshot) => {
          const clientPlaylists = playlistsSnapshot.docs.map((playlistDoc) => ({
            id: playlistDoc.id,
            clientId: client.id,
            clientName: client.name,
            ...playlistDoc.data(),
          }));

          setPlaylistsData((previous) => [
            ...previous.filter((playlist) => playlist.clientId !== client.id),
            ...clientPlaylists,
          ]);
        });

        unsubScreens.push(screenUnsub);
        unsubPlaylists.push(playlistUnsub);
      });
    }

    let serverConfirmed = false;
    let refreshing = false;
    function receiveSnapshot(snapshot) {
      if (!active || (serverConfirmed && snapshot.metadata.fromCache)) return;
      if (!snapshot.metadata.fromCache) serverConfirmed = true;
      applyClientsSnapshot(snapshot);
    }
    async function refreshClients() {
      if (!active || refreshing) return;
      refreshing = true;
      try {
        const snapshot = await getDocsFromServer(clientsRef);
        receiveSnapshot(snapshot);
      } catch (error) {
        if (active) setClientsError(getFirestoreReadErrorMessage(error));
      } finally {
        refreshing = false;
      }
    }
    function refreshVisibleClients() {
      if (document.visibilityState === "visible") refreshClients();
    }
    refreshClients();
    const refreshInterval = setInterval(refreshVisibleClients, 30000);
    window.addEventListener("online", refreshClients);
    document.addEventListener("visibilitychange", refreshVisibleClients);

    const unsubscribeClients = onSnapshot(
      clientsRef,
      { includeMetadataChanges: true },
      receiveSnapshot,
      (error) => {
        console.log("Erro no realtime de clientes:", error);
        setClientsError(getFirestoreReadErrorMessage(error));
      }
    );

    return () => {
      active = false;
      clearInterval(refreshInterval);
      window.removeEventListener("online", refreshClients);
      document.removeEventListener("visibilitychange", refreshVisibleClients);
      unsubscribeClients();
      unsubScreens.forEach((unsub) => unsub());
      unsubPlaylists.forEach((unsub) => unsub());
    };
  }, []);

  function getLastSeenDate(screen) {
    return getScreenLastSeenDate(screen);
  }

  function scrollDashboardSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function isScreenOnline(screen) {
    return getScreenConnectionStatus(screen, now).isOnline;
  }

  function getDaysToDue(dueDate) {
    if (!dueDate) return null;

    const today = new Date();
    const due = new Date(`${dueDate}T23:59:59`);
    const diff = due.getTime() - today.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getClientDueStatus(client) {
    const days = getDaysToDue(client.dueDate);

    if (days === null) {
      return {
        label: "Sem vencimento",
        className: "neutral",
      };
    }

    if (days < 0) {
      return {
        label: `Vencido há ${Math.abs(days)} dia(s)`,
        className: "danger",
      };
    }

    if (days <= 7) {
      return {
        label: `Vence em ${days} dia(s)`,
        className: "warning",
      };
    }

    return {
      label: `Vence em ${days} dia(s)`,
      className: "success",
    };
  }

  const onlineScreens = screensData.filter(isScreenOnline);
  const offlineScreens = screensData.filter((screen) => !isScreenOnline(screen));
  const loggedOfflineScreens = screensData.filter(
    (screen) => getScreenConnectionStatus(screen, now).key === "logged-offline"
  );
  const attentionScreens = screensData.filter(
    (screen) => getScreenConnectionStatus(screen, now).key === "attention"
  );
  const notLoggedScreens = screensData.filter(
    (screen) => getScreenConnectionStatus(screen, now).key === "not-logged"
  );
  const filteredRealtimeScreens = screensData
    .filter((screen) => {
      if (screenStatusFilter === "all") return true;
      return getScreenConnectionStatus(screen, now).key === screenStatusFilter;
    })
    .sort(comparePortalScreens);
  const screensPerPage = 8;
  const screenPagination = getPortalScreenPage(filteredRealtimeScreens, screenPage, screensPerPage);
  const { page: safeScreenPage, pageCount: screenPageCount, items: visibleRealtimeScreens } = screenPagination;

  useEffect(() => {
    setScreenPage(1);
  }, [screenStatusFilter]);

  useEffect(() => {
    setScreenPage((current) => Math.min(current, screenPageCount));
  }, [screenPageCount]);

  const overdueClients = clients.filter((client) => {
    return getClientPlanAccess(client).isOverdue;
  });

  const clientAccessList = clients.map((client) => ({
    client,
    access: getClientPlanAccess(client),
  }));
  const activePlanClients = clientAccessList.filter(({ access }) => access.isActive);
  const demoClients = clients.filter((client) => getPlanConfig(client.plan).isDemo);
  const setupClientList = clients.map((client) => getSetupInfo(client));
  const setupInProgressClients = setupClientList.filter((setup) => setup.isInProgress);
  const setupPendingClients = setupClientList.filter((setup) => setup.isPending);
  const setupCompletedClients = setupClientList.filter((setup) => setup.isCompleted);
  const alertPlanClients = clientAccessList.filter(({ access }) => access.statusLabel === "Vencido");
  const partialPlanClients = clientAccessList.filter(({ access }) => access.isPartialRestriction);
  const strongPlanClients = clientAccessList.filter(({ access }) => access.isStrongRestriction);
  const suspendedPlanClients = clientAccessList.filter(({ access }) => access.isSuspended);
  const estimatedMrr = clientAccessList
    .filter(({ client, access }) => !access.isSuspended && !getPlanConfig(client.plan).isDemo)
    .reduce((total, { client }) => total + getPlanConfig(client.plan).priceMonthly, 0);
  const paidSetupRevenue = clients.reduce((total, client) => {
    const setup = getSetupInfo(client);
    return setup.isPaidRevenue ? total + setup.setupFee : total;
  }, 0);

  const soonDueClients = clients.filter((client) => {
    const days = getDaysToDue(client.dueDate);
    return days !== null && days >= 0 && days <= 7;
  });

  const scheduledPlaylists = playlistsData.filter((playlist) => playlist.scheduleEnabled);
  const recentClients = [...clients].slice(-5).reverse();
  const criticalClients = [...overdueClients, ...soonDueClients].slice(0, 5);

  function getDashboardActivePlaylist(screen) {
    const clientPlaylists = playlistsData.filter(
      (playlist) => playlist.clientId === screen.clientId
    );

    const scheduled = clientPlaylists
      .filter((playlist) => {
        if (!playlist?.scheduleEnabled) return false;

        if (
          playlist.targetScreenIds &&
          playlist.targetScreenIds.length > 0 &&
          !playlist.targetScreenIds.includes(screen.id)
        ) {
          return false;
        }

        const date = new Date(now);
        const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        if (playlist.startDate && today < playlist.startDate) return false;
        if (playlist.endDate && today > playlist.endDate) return false;

        const currentMinutes = date.getHours() * 60 + date.getMinutes();
        const startMinutes = timeToMinutes(playlist.startTime);
        const endMinutes = timeToMinutes(playlist.endTime);

        if (startMinutes === endMinutes) return true;

        if (startMinutes < endMinutes) {
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        }

        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      })
      .sort((a, b) => {
        const aDate = `${a.startDate || ""} ${a.startTime || ""}`;
        const bDate = `${b.startDate || ""} ${b.startTime || ""}`;

        return bDate.localeCompare(aDate);
      });

    if (scheduled.length > 0) return scheduled[0];

    return clientPlaylists.find((playlist) => playlist.id === screen.playlistId);
  }

  const trafficCards = clients.map((client) => {
    const clientScreens = screensData.filter((screen) => screen.clientId === client.id);
    const statusGroups = getClientScreensByStatus(clientScreens, now);
    const storageUsed = Math.max(
      0,
      Number(client.storageUsedBytes || client.usedStorageBytes || client.mediaStorageBytes || 0)
    );
    const activePlaylistWeights = clientScreens.map((screen) => getPlaylistWeightBytes(getDashboardActivePlaylist(screen)));
    const activePlaylistWeightBytes = activePlaylistWeights.reduce((largest, weight) => Math.max(largest, weight), 0);
    const reportedTraffic = clientScreens.reduce(
      (total, screen) => total + Math.max(0, Number(screen.estimatedMonthlyTrafficBytes || 0)),
      0
    );
    const estimatedMonthlyTrafficBytes = reportedTraffic || activePlaylistWeightBytes * Math.max(1, statusGroups.online.length || clientScreens.length) * 30;
    const cacheStatuses = clientScreens.map((screen) => screen.cacheStatus).filter(Boolean);
    const cacheStatus = cacheStatuses.includes("erro")
      ? "Erro"
      : cacheStatuses.includes("preparando")
        ? "Preparando"
        : cacheStatuses.includes("parcial")
          ? "Parcial"
          : cacheStatuses.includes("pronto")
            ? "Pronto"
            : "Indisponível";
    const sourceStatuses = clientScreens.map((screen) => screen.currentMediaSource).filter(Boolean);
    const mediaSource = sourceStatuses.includes("mixed")
      ? "Misto"
      : sourceStatuses.includes("remote")
        ? "Internet"
        : sourceStatuses.includes("cache")
          ? "Cache"
          : "Sem sinal";
    const risk = getClientCacheRisk({
      client,
      screens: clientScreens,
      activePlaylistWeightBytes,
      estimatedMonthlyTrafficBytes,
    });

    return {
      client,
      statusGroups,
      storageUsed,
      activePlaylistWeightBytes,
      estimatedMonthlyTrafficBytes,
      cacheStatus,
      mediaSource,
      risk,
    };
  });
  const visibleTrafficCards = cachePanelExpanded ? trafficCards : trafficCards.slice(0, 4);

  return (
    <>
      <header className="premium-dashboard-hero">
        <div>
          <div className="kicker">Painel Administrativo</div>
          <h1>Dashboard do Totem Park</h1>
          <p>
            Visão geral dos clientes, telas online, vencimentos e programações
            ativas da plataforma.
          </p>
        </div>

        <div className="premium-status-card">
          <div className="premium-status-dot"></div>

          <div>
            <span>Status geral</span>
            <strong>Operacional</strong>
            <p>{onlineScreens.length} tela(s) online agora</p>
          </div>

          <div className="radar-circle">
            <div></div>
          </div>
        </div>
      </header>

      {clientsError && (
        <div className="admin-data-alert">
          <strong>Clientes não carregados</strong>
          <span>{clientsError}</span>
        </div>
      )}

      <section className="premium-stats">
        <PremiumStatCard
          title="Clientes"
          value={clients.length}
          icon={<Users size={26} />}
          status="Cadastrados"
          link="Ver todos os clientes →"
          color="purple"
          onClick={() => onNavigate?.("clients")}
        />

        <PremiumStatCard
          title="Telas online"
          value={`${onlineScreens.length}/${screensData.length}`}
          icon={<Monitor size={26} />}
          status="Agora"
          link="Ver todas as telas →"
          color="cyan"
          onClick={() => scrollDashboardSection("dashboard-live-screens")}
        />

        <PremiumStatCard
          title="Playlists"
          value={playlistsData.length}
          icon={<ListVideo size={26} />}
          status={`${scheduledPlaylists.length} agendada(s)`}
          link="Ver playlists →"
          color="purple"
          onClick={() => scrollDashboardSection("dashboard-schedules")}
        />

        <PremiumStatCard
          title="Financeiro"
          value={overdueClients.length}
          icon={<CreditCard size={26} />}
          status="Cliente(s) vencido(s)"
          link="Ver financeiro →"
          color="green"
          onClick={() => scrollDashboardSection("dashboard-due-dates")}
        />
      </section>

      <section className="admin-plan-kpis">
        <div><span>Ativos</span><strong>{activePlanClients.length}</strong></div>
        <div><span>Demonstração</span><strong>{demoClients.length}</strong></div>
        <div><span>Em implantação</span><strong>{setupInProgressClients.length}</strong></div>
        <div className="warning"><span>Adesões pendentes</span><strong>{setupPendingClients.length}</strong></div>
        <div><span>Adesões concluídas</span><strong>{setupCompletedClients.length}</strong></div>
        <div className="warning"><span>Vencidos</span><strong>{alertPlanClients.length}</strong></div>
        <div className="partial"><span>Restrição parcial</span><strong>{partialPlanClients.length}</strong></div>
        <div className="strong"><span>Restrição forte</span><strong>{strongPlanClients.length}</strong></div>
        <div className="suspended"><span>Suspensos</span><strong>{suspendedPlanClients.length}</strong></div>
        <div className="mrr"><span>MRR estimado</span><strong>{formatCurrencyBr(estimatedMrr)}</strong></div>
        <div className="mrr"><span>Adesões pagas</span><strong>{formatCurrencyBr(paidSetupRevenue)}</strong></div>
      </section>

      <section className="premium-panel traffic-cache-panel">
        <div className="premium-panel-header">
          <div>
            <h2>Consumo e Cache</h2>
            <p>Monitoramento administrativo para reduzir downloads repetidos de mídias.</p>
          </div>
          {trafficCards.length > 0 && (
            <div className="traffic-cache-actions">
              <span>
                {visibleTrafficCards.length}/{trafficCards.length} cliente(s)
              </span>
              <button
                type="button"
                className="client-action"
                onClick={() => setCachePanelExpanded((current) => !current)}
              >
                {cachePanelExpanded ? "Recolher" : "Expandir"}
              </button>
            </div>
          )}
        </div>

        <div className={`traffic-cache-grid ${cachePanelExpanded ? "expanded" : "collapsed"}`}>
          {trafficCards.length === 0 ? (
            <div className="premium-empty">Nenhum cliente para monitorar ainda.</div>
          ) : (
            visibleTrafficCards.map(({ client, statusGroups, storageUsed, activePlaylistWeightBytes, estimatedMonthlyTrafficBytes, cacheStatus, mediaSource, risk }) => (
              <div className={`traffic-cache-card risk-${risk.key}`} key={client.id}>
                <div className="traffic-cache-card-top">
                  <div>
                    <strong>{client.name}</strong>
                    <span>Plano {getPlanConfig(client.plan).name}</span>
                  </div>
                  <b>{risk.label}</b>
                </div>

                <div className="traffic-cache-metrics">
                  <span>Telas: {statusGroups.online.length} online • {statusGroups.attention.length} atenção • {statusGroups["logged-offline"].length} offline • {statusGroups["not-logged"].length} não logada(s)</span>
                  <span>Storage: {formatStorageSize(storageUsed)} / {formatStorageSize(getClientStorageLimit(client), 0)}</span>
                  <span>Playlist ativa: {formatStorageSize(activePlaylistWeightBytes)}</span>
                  <span>Cache: {cacheStatus} • {mediaSource}</span>
                  <span>Tráfego estimado: {formatStorageSize(estimatedMonthlyTrafficBytes)}</span>
                </div>

                <p>{risk.message}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="premium-dashboard-grid">
        <div className="premium-panel" id="dashboard-live-screens">
          <div className="premium-panel-header">
            <div>
              <h2>Telas em tempo real</h2>
              <p>Monitoramento rápido das TVs conectadas.</p>
            </div>

            <div className="premium-screen-summary" role="group" aria-label="Filtro de status das telas">
              <button
                type="button"
                className={screenStatusFilter === "all" ? "active" : ""}
                onClick={() => setScreenStatusFilter("all")}
              >
                Todas {screensData.length}
              </button>
              <button
                type="button"
                className={screenStatusFilter === "online" ? "online active" : "online"}
                onClick={() => setScreenStatusFilter("online")}
              >
                Online {onlineScreens.length}
              </button>
              <button
                type="button"
                className={screenStatusFilter === "attention" ? "warning active" : "warning"}
                onClick={() => setScreenStatusFilter("attention")}
              >
                Atenção {attentionScreens.length}
              </button>
              <button
                type="button"
                className={screenStatusFilter === "logged-offline" ? "warning active" : "warning"}
                onClick={() => setScreenStatusFilter("logged-offline")}
              >
                Logada offline {loggedOfflineScreens.length}
              </button>
              <button
                type="button"
                className={screenStatusFilter === "not-logged" ? "offline active" : "offline"}
                onClick={() => setScreenStatusFilter("not-logged")}
              >
                Não logada {notLoggedScreens.length}
              </button>
            </div>
          </div>

          <div className="premium-screen-list">
            {filteredRealtimeScreens.length === 0 ? (
              <div className="premium-empty">Nenhuma tela cadastrada ainda.</div>
            ) : (
              visibleRealtimeScreens.map((screen) => {
                const connection = getScreenConnectionStatus(screen, now);
                const deviceLocation = getScreenDisplayLocation(screen);

                return (
                  <div className="premium-screen-row" key={`${screen.clientId}-${screen.id}`} role="button" tabIndex={0} onClick={() => onOpenTelemetry?.(screen)} onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenTelemetry?.(screen); }
                  }}>
                    <div className={`premium-screen-dot ${connection.className}`}></div>

                    <div className="premium-screen-icon premium-screen-thumb">
                      {renderLivePreviewMedia(
                        screen,
                        getDashboardActivePlaylist(screen)?.items?.[0],
                        <Monitor size={24} />
                      )}
                    </div>

                    <div className="premium-screen-text">
                      <strong>{screen.name}</strong>
                      <span>
                        {screen.clientName} • {screen.location || "Não informado"}
                      </span>

                      <div className="manager-now-playing">
                        <small>{screen.currentPlaylistName || "Playlist não informada"}</small>
                        <b>{screen.nowPlayingTitle || "Aguardando mídia"}</b>
                        <span className="manager-cache-line">
                          Cache: {getCacheStatusLabel(screen)} • {getMediaSourceLabel(screen.currentMediaSource)}
                        </span>
                        {getCacheSyncLabel(screen) && (
                          <span className="manager-cache-line muted">
                            {getCacheSyncLabel(screen)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="manager-screen-status-col">
                      <div className={`premium-live-badge ${connection.className}`}>
                        {connection.label}
                      </div>

                      <span>
                        {connection.deviceLabel}
                      </span>

                      <span>
                        Login: {connection.lastConnection}
                      </span>

                      <span>
                        Última comunicação: {formatScreenConnectionDate(getScreenLastSeenDate(screen))}
                      </span>

                      <span>
                        Vinculada desde: {linkedAtForScreen(screen, playerBindings) ? formatScreenConnectionDate(linkedAtForScreen(screen, playerBindings)) : "—"}
                      </span>

                      <span>
                        Telemetria: {telemetryStatus(screen, telemetryConfig, now)}
                      </span>

                      <span>
                        App: {screen.telemetry?.session?.appVersion || "—"} • Tempo ativo: {screen.telemetry?.schemaVersion >= 3 && Number.isFinite(Number(screen.telemetry?.counters?.activeTimeMs)) ? `${Math.floor(Number(screen.telemetry.counters.activeTimeMs) / 60000)} min` : "—"}
                      </span>

                      <span>
                        Local: {deviceLocation.city}
                      </span>

                      <span>
                        Item: {screen.nowPlayingIndex && screen.nowPlayingTotal
                          ? `${screen.nowPlayingIndex}/${screen.nowPlayingTotal}`
                          : "--"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredRealtimeScreens.length > screensPerPage && (
            <div className="premium-screen-pagination" aria-label="Paginação das telas">
              <span>
                Mostrando {(safeScreenPage - 1) * screensPerPage + 1}–{Math.min(safeScreenPage * screensPerPage, filteredRealtimeScreens.length)} de {filteredRealtimeScreens.length}
              </span>
              <div>
                <button type="button" disabled={safeScreenPage === 1} onClick={() => setScreenPage((page) => Math.max(1, page - 1))}>
                  Anterior
                </button>
                <strong>{safeScreenPage}/{screenPageCount}</strong>
                <button type="button" disabled={safeScreenPage === screenPageCount} onClick={() => setScreenPage((page) => Math.min(screenPageCount, page + 1))}>
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="premium-panel premium-center-panel" id="dashboard-due-dates">
          <div className="premium-panel-header">
            <div>
              <h2>Vencimentos</h2>
              <p>Clientes que precisam de atenção.</p>
            </div>
          </div>

          {criticalClients.length === 0 ? (
            <div className="premium-empty-state">
              <CreditCard size={72} />
              <p>Nenhum vencimento crítico.</p>
              <button>Ver todos os vencimentos</button>
            </div>
          ) : (
            <div className="premium-due-list">
              {criticalClients.map((client) => {
                const status = getClientDueStatus(client);

                return (
                  <div className="premium-due-row" key={client.id}>
                    <div>
                      <strong>{client.name}</strong>
                      <span>{client.dueDate || "Sem data"}</span>
                    </div>

                    <div className={`due-badge ${status.className}`}>
                      {status.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="premium-panel premium-full-panel">
        <div className="premium-panel-header">
          <div>
            <h2>Clientes recentes</h2>
            <p>Últimos clientes cadastrados.</p>
          </div>
        </div>

        <div className="premium-client-table">
          <div className="premium-client-head">
            <span>Cliente</span>
            <span>Plano</span>
            <span>Vencimento</span>
            <span>Status</span>
          </div>

          {recentClients.length === 0 ? (
            <div className="premium-empty">Nenhum cliente ainda.</div>
          ) : (
            recentClients.map((client) => {
              const status = getClientDueStatus(client);

              return (
                <div className="premium-client-row" key={client.id}>
                  <strong>{client.name}</strong>
                  <span>{getPlanConfig(client.plan).name} • {client.billing}</span>
                  <span>{status.label}</span>
                  <div className={`premium-client-status ${client.status === "Ativo" ? "active" : "inactive"}`}>
                    {client.status || "Ativo"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="premium-panel premium-full-panel" id="dashboard-schedules">
        <div className="premium-panel-header">
          <div>
            <h2>Programações agendadas</h2>
            <p>Playlists com data e horário definidos.</p>
          </div>
        </div>

        <div className="premium-schedule-list">
          {scheduledPlaylists.length === 0 ? (
            <div className="premium-empty">Nenhuma programação agendada.</div>
          ) : (
            scheduledPlaylists.slice(0, 6).map((playlist) => (
              <div className="premium-schedule-card" key={`${playlist.clientId}-${playlist.id}`}>
                <div>
                  <strong>{playlist.name}</strong>
                  <span>{playlist.clientName}</span>
                </div>

                <p>
                  {playlist.startDate} até {playlist.endDate}
                  <br />
                  {playlist.startTime} às {playlist.endTime}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function PremiumStatCard({ title, value, icon, status, link, color, onClick }) {
  return (
    <button type="button" className={`premium-stat-card ${color}`} onClick={onClick}>
      <div className="premium-stat-main">
        <div className="premium-stat-icon">{icon}</div>

        <div>
          <span>{title}</span>
          <strong>{value}</strong>
          <p>{status}</p>
        </div>
      </div>

      <div className="premium-stat-link">
        {link}
      </div>
    </button>
  );
}


function AccountRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, ACCOUNT_REQUESTS_COLLECTION),
      (snapshot) => {
        const list = snapshot.docs
          .map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });

        setRequests(list);
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        console.log("Erro ao carregar solicitações:", snapshotError);
        setError(getFirestoreReadErrorMessage(snapshotError));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function updateRequestStatus(requestItem, nextStatus) {
    try {
      setUpdatingId(requestItem.id);
      const history = Array.isArray(requestItem.statusHistory) ? requestItem.statusHistory : [];

      await updateDoc(doc(db, ACCOUNT_REQUESTS_COLLECTION, requestItem.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...history,
          {
            status: nextStatus,
            at: new Date().toISOString(),
            by: auth.currentUser?.email || "Administrador",
          },
        ],
      });
    } catch (statusError) {
      console.log(statusError);
      alert("Não foi possível atualizar o status da solicitação.");
    } finally {
      setUpdatingId("");
    }
  }

  const filteredRequests = requests.filter((requestItem) => (
    statusFilter === "Todos" || requestItem.status === statusFilter
  ));
  const pendingCount = requests.filter((requestItem) => (
    requestItem.status !== ACCOUNT_REQUEST_STATUS.activated &&
    requestItem.status !== ACCOUNT_REQUEST_STATUS.rejected
  )).length;

  return (
    <>
      <header className="clients-premium-header">
        <div>
          <div className="kicker">Comercial</div>
          <h1>Solicitações de cadastro</h1>
          <p>Pedidos enviados pelo botão Criar nova conta, aguardando validação comercial.</p>
        </div>
      </header>

      {error && (
        <div className="admin-data-alert">
          <strong>Solicitações não carregadas</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="clients-kpi-grid account-request-kpis">
        <div className="clients-kpi-card">
          <span>Total recebido</span>
          <strong>{requests.length}</strong>
          <p>Solicitações registradas</p>
        </div>
        <div className="clients-kpi-card warning">
          <span>Em andamento</span>
          <strong>{pendingCount}</strong>
          <p>Aguardam validação ou contato</p>
        </div>
        <div className="clients-kpi-card active">
          <span>Ativadas</span>
          <strong>{requests.filter((item) => item.status === ACCOUNT_REQUEST_STATUS.activated).length}</strong>
          <p>Marcadas como conta ativada</p>
        </div>
        <div className="clients-kpi-card danger">
          <span>Não aprovadas</span>
          <strong>{requests.filter((item) => item.status === ACCOUNT_REQUEST_STATUS.rejected).length}</strong>
          <p>Encerradas pelo comercial</p>
        </div>
      </section>

      <section className="clients-toolbar">
        <div className="clients-filter-group">
          {["Todos", ...ACCOUNT_REQUEST_STATUS_OPTIONS].map((status) => (
            <button
              key={status}
              className={statusFilter === status ? "active" : ""}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      <section className="account-requests-panel">
        {loading && <p>Carregando solicitações...</p>}

        {!loading && filteredRequests.length === 0 && (
          <div className="clients-empty">
            <strong>Nenhuma solicitação encontrada</strong>
            <span>Novos pedidos aparecerão aqui automaticamente.</span>
          </div>
        )}

        {filteredRequests.map((requestItem) => (
          <article className="account-request-admin-card" key={requestItem.id}>
            <div className="account-request-admin-main">
              <div>
                <span className="client-status-badge temporary">
                  {requestItem.status || ACCOUNT_REQUEST_STATUS.new}
                </span>
                <h3>{requestItem.companyName || "Empresa não informada"}</h3>
                <p>
                  {requestItem.responsibleName} • {requestItem.role || "Cargo não informado"}
                </p>
              </div>
              <div className="account-request-admin-select">
                <label>Status</label>
                <select
                  value={requestItem.status || ACCOUNT_REQUEST_STATUS.new}
                  disabled={updatingId === requestItem.id}
                  onChange={(event) => updateRequestStatus(requestItem, event.target.value)}
                >
                  {ACCOUNT_REQUEST_STATUS_OPTIONS.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="account-request-admin-grid">
              <span><strong>E-mail</strong>{requestItem.email}</span>
              <span><strong>WhatsApp</strong>{requestItem.whatsapp}</span>
              <span><strong>CNPJ</strong>{requestItem.cnpjDisplay || requestItem.cnpj || "Opcional"}</span>
              <span><strong>Segmento</strong>{requestItem.segment}</span>
              <span><strong>Cidade/UF</strong>{requestItem.city}/{requestItem.state}</span>
              <span><strong>Telas</strong>{requestItem.screensEstimate}</span>
              <span><strong>Finalidade</strong>{requestItem.intendedUse}</span>
              <span><strong>Solicitado em</strong>{formatFirestoreDateTime(requestItem.createdAt)}</span>
            </div>

            {requestItem.notes && (
              <p className="account-request-notes">
                <strong>Observações:</strong> {requestItem.notes}
              </p>
            )}

            <div className="account-request-admin-actions">
              <a
                className="client-action primary"
                href={getWhatsappUrl(requestItem.whatsappDigits || requestItem.whatsapp, `Olá, ${requestItem.responsibleName}! Recebemos sua solicitação da Totem Park e vamos dar sequência ao atendimento.`)}
                target="_blank"
                rel="noreferrer"
              >
                Chamar no WhatsApp
              </a>
              <button
                className="client-action"
                onClick={() => navigator.clipboard?.writeText?.(
                  `${requestItem.companyName}\n${requestItem.responsibleName}\n${requestItem.email}\n${requestItem.whatsapp}`
                )}
              >
                Copiar dados
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function ClientsPage({ onOpenClient }) {
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [savingClient, setSavingClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [clientUsage, setClientUsage] = useState({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    plan: "Start",
    billing: "Mensal",
    startDate: "",
    dueDate: "",
    screensLimit: "1",
    storageLimitGb: "5",
    maxVideoSizeMb: "100",
    maxImageSizeMb: "10",
    status: "Ativo",
    premiumTemplatesEnabled: false,
    marketingEnabled: false,
    setupEnabled: false,
    setupStatus: "Não informada",
    setupFee: "",
    setupPaidStatus: "Não informado",
    setupPaidAt: "",
    setupMethod: "",
    setupStartDate: "",
    setupCompletedAt: "",
    setupNotes: "",
    demoWatermarkEnabled: true,
    demoTickerEnabled: true,
    demoTickerText: DEFAULT_DEMO_TICKER_TEXT,
    logoFile: null,
    logoPreview: "",
    logoUrl: "",
  });

  useEffect(() => {
    let active = true;
    const clientsRef = collection(db, "clients");

    function applyClientsSnapshot(snapshot) {
      const list = snapshot.docs.map((clientDoc) => ({
        id: clientDoc.id,
        ...clientDoc.data(),
      }));

      setClientsError("");
      setClients(sortClientsAlphabetically(list));
    }

    let serverConfirmed = false;
    let refreshing = false;
    function receiveSnapshot(snapshot) {
      if (!active || (serverConfirmed && snapshot.metadata.fromCache)) return;
      if (!snapshot.metadata.fromCache) serverConfirmed = true;
      applyClientsSnapshot(snapshot);
    }
    async function refreshClients() {
      if (!active || refreshing) return;
      refreshing = true;
      try {
        const snapshot = await getDocsFromServer(clientsRef);
        receiveSnapshot(snapshot);
      } catch (error) {
        if (active) setClientsError(getFirestoreReadErrorMessage(error));
      } finally {
        refreshing = false;
      }
    }
    function refreshVisibleClients() {
      if (document.visibilityState === "visible") refreshClients();
    }
    refreshClients();
    const refreshInterval = setInterval(refreshVisibleClients, 30000);
    window.addEventListener("online", refreshClients);
    document.addEventListener("visibilitychange", refreshVisibleClients);

    const unsubscribe = onSnapshot(
      clientsRef,
      { includeMetadataChanges: true },
      receiveSnapshot,
      (error) => {
        console.log("Erro no realtime de clientes:", error);
        setClientsError(getFirestoreReadErrorMessage(error));
      }
    );

    return () => {
      active = false;
      clearInterval(refreshInterval);
      window.removeEventListener("online", refreshClients);
      document.removeEventListener("visibilitychange", refreshVisibleClients);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (clients.length === 0) {
      setClientUsage({});
      return undefined;
    }

    const unsubscribers = clients.flatMap((client) => {
      const screensUnsub = onSnapshot(
        collection(db, "clients", client.id, "screens"),
        (snapshot) => {
          setClientUsage((previous) => ({
            ...previous,
            [client.id]: {
              ...(previous[client.id] || {}),
              screensCount: snapshot.size,
            },
          }));
        }
      );

      const mediaUnsub = onSnapshot(
        collection(db, "clients", client.id, "media"),
        (snapshot) => {
          const storageUsedBytes = getMediaStorageUsed(
            snapshot.docs.map((item) => item.data())
          );

          setClientUsage((previous) => ({
            ...previous,
            [client.id]: {
              ...(previous[client.id] || {}),
              storageUsedBytes,
            },
          }));
        }
      );

      return [screensUnsub, mediaUnsub];
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [clients]);

  function getDaysToDue(dueDate) {
    if (!dueDate) return null;

    const today = new Date();
    const due = new Date(`${dueDate}T23:59:59`);
    const diff = due.getTime() - today.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getDueInfo(client) {
    const access = getClientPlanAccess(client);
    const days = getDaysToDue(client.dueDate);

    if (days === null) {
      return {
        text: "Sem vencimento",
        className: "neutral",
      };
    }

    if (access.isOverdue) {
      return {
        text: `Vencido há ${access.daysOverdue} dia(s)`,
        className: access.severity === "warning" ? "warning" : "danger",
      };
    }

    if (days <= 7) {
      return {
        text: `Vence em ${days} dia(s)`,
        className: "warning",
      };
    }

    return {
      text: `Vence em ${days} dia(s)`,
      className: "success",
    };
  }

  function getStatusClass(status) {
    if (status === "Ativo") return "active";
    if (status === "Liberação temporária") return "temporary";
    if (status === "Vencido") return "warning";
    if (status === "Restrição Parcial") return "partial";
    if (status === "Restrição Forte") return "strong";
    if (status === "Suspenso" || status === "Cancelado") return "danger";

    return "neutral";
  }

  const activeClients = clients.filter((client) => getClientPlanAccess(client).isActive);
  const suspendedClients = clients.filter((client) => getClientPlanAccess(client).isSuspended);
  const overdueClients = clients.filter((client) => getClientPlanAccess(client).isOverdue);

  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      client.name?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.plan?.toLowerCase().includes(search) ||
      getPlanConfig(client.plan).name.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "Todos" || getClientPlanAccess(client).statusLabel === statusFilter;

    return matchesSearch && matchesStatus;
  });

  async function createClientAuthUser(email, password) {
    const secondaryApp = initializeApp(
      firebaseConfig,
      `secondary-client-${Date.now()}`
    );

    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

      return userCredential.user.uid;
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  function resetForm() {
    setForm({
      name: "",
      email: "",
      password: "",
      plan: "Start",
      billing: "Mensal",
      startDate: "",
      dueDate: "",
      screensLimit: "1",
      storageLimitGb: "5",
      maxVideoSizeMb: "100",
      maxImageSizeMb: "10",
      status: "Ativo",
      premiumTemplatesEnabled: false,
      marketingEnabled: false,
      setupEnabled: false,
      setupStatus: "Não informada",
      setupFee: "",
      setupPaidStatus: "Não informado",
      setupPaidAt: "",
      setupMethod: "",
      setupStartDate: "",
      setupCompletedAt: "",
      setupNotes: "",
      demoWatermarkEnabled: true,
      demoTickerEnabled: true,
      demoTickerText: DEFAULT_DEMO_TICKER_TEXT,
      logoFile: null,
      logoPreview: "",
      logoUrl: "",
    });
  }

  function openCreateClientModal() {
    setEditingClient(null);
    resetForm();
    setShowCreateModal(true);
  }

  function openEditClientModal(client) {
    setEditingClient(client);
    setForm({
      name: client.name || "",
      email: client.email || "",
      password: "",
      plan: getPlanConfig(client.plan).name,
      billing: client.billing || "Mensal",
      startDate: client.startDate || "",
      dueDate: client.dueDate || "",
      screensLimit: String(getClientScreenLimit(client)),
      storageLimitGb: String(getClientStorageLimit(client) / STORAGE_GB),
      maxVideoSizeMb: String(getClientMaxVideoSize(client) / STORAGE_MB),
      maxImageSizeMb: String(getClientMaxImageSize(client) / STORAGE_MB),
      status: client.status || "Ativo",
      premiumTemplatesEnabled: hasPremiumTemplates(client),
      marketingEnabled: hasMarketingAccess(client),
      setupEnabled: client.setupEnabled === true,
      setupStatus: client.setupStatus || "Não informada",
      setupFee: client.setupFee ?? "",
      setupPaidStatus: client.setupPaidStatus || "Não informado",
      setupPaidAt: client.setupPaidAt || "",
      setupMethod: client.setupMethod || "",
      setupStartDate: client.setupStartDate || "",
      setupCompletedAt: client.setupCompletedAt || "",
      setupNotes: client.setupNotes || "",
      demoWatermarkEnabled: client.demoWatermarkEnabled !== false,
      demoTickerEnabled: client.demoTickerEnabled !== false,
      demoTickerText: client.demoTickerText || DEFAULT_DEMO_TICKER_TEXT,
      logoFile: null,
      logoPreview: client.logoUrl || "",
      logoUrl: client.logoUrl || "",
    });
    setShowCreateModal(true);
  }

  function closeClientModal() {
    setShowCreateModal(false);
    setEditingClient(null);
    resetForm();
  }

  function handleClientPlanChange(plan) {
    const planConfig = getPlanConfig(plan);
    const planLimits = getPlanLimits(plan);

    setForm((current) => ({
      ...current,
      plan: planConfig.name,
      screensLimit: String(planConfig.screensLimit),
      storageLimitGb: String(planLimits.storageLimitBytes / STORAGE_GB),
      maxVideoSizeMb: String(planLimits.maxVideoSizeBytes / STORAGE_MB),
      maxImageSizeMb: String(planLimits.maxImageSizeBytes / STORAGE_MB),
      premiumTemplatesEnabled: planConfig.premiumTemplatesEnabled,
      marketingEnabled: planConfig.marketingEnabled,
      dueDate: planConfig.isDemo && !current.dueDate
        ? getTodayDateInput(planConfig.defaultTrialDays)
        : current.dueDate,
      demoWatermarkEnabled: planConfig.isDemo ? current.demoWatermarkEnabled !== false : current.demoWatermarkEnabled,
      demoTickerEnabled: planConfig.isDemo ? current.demoTickerEnabled !== false : current.demoTickerEnabled,
      demoTickerText: planConfig.isDemo && !current.demoTickerText
        ? DEFAULT_DEMO_TICKER_TEXT
        : current.demoTickerText,
    }));
  }

  function handleClientLogoFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecione uma imagem válida para a logo.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("A logo deve ter no máximo 5 MB.");
      return;
    }

    setForm((current) => ({
      ...current,
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
    }));
  }

  async function handleSaveClient() {
    if (!form.name.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    if (!form.email.trim()) {
      alert("Informe o e-mail do cliente.");
      return;
    }

    if (!editingClient && !form.password.trim()) {
      alert("Informe a senha inicial do cliente.");
      return;
    }

    if (!editingClient && form.password.length < 6) {
      alert("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    if (!form.dueDate) {
      alert("Informe o vencimento do plano.");
      return;
    }

    if (String(form.setupFee).trim() && parseOptionalMoney(form.setupFee) === null) {
      alert("Informe um valor de adesão válido ou deixe o campo vazio.");
      return;
    }

    try {
      setSavingClient(true);

      const clientData = {
        name: form.name.trim(),
        email: form.email.trim(),
        plan: getPlanConfig(form.plan).name,
        billing: form.billing,
        startDate: form.startDate || "",
        dueDate: form.dueDate,
        screensLimit: String(Math.max(1, Number(form.screensLimit) || 1)),
        storageLimitBytes: Math.max(STORAGE_MB, Number(form.storageLimitGb) * STORAGE_GB || getPlanLimits(form.plan).storageLimitBytes),
        maxVideoSizeBytes: Math.max(STORAGE_MB, Number(form.maxVideoSizeMb) * STORAGE_MB || getPlanLimits(form.plan).maxVideoSizeBytes),
        maxImageSizeBytes: Math.max(STORAGE_MB, Number(form.maxImageSizeMb) * STORAGE_MB || getPlanLimits(form.plan).maxImageSizeBytes),
        status: form.status,
        premiumTemplatesEnabled: Boolean(form.premiumTemplatesEnabled),
        marketingEnabled: Boolean(form.marketingEnabled),
        setupEnabled: Boolean(form.setupEnabled),
        setupStatus: form.setupEnabled ? form.setupStatus : "Não informada",
        setupFee: parseOptionalMoney(form.setupFee) === null ? "" : parseOptionalMoney(form.setupFee),
        setupPaidStatus: form.setupEnabled ? form.setupPaidStatus : "Não informado",
        setupPaidAt: form.setupPaidAt || "",
        setupMethod: form.setupMethod.trim(),
        setupStartDate: form.setupStartDate || "",
        setupCompletedAt: form.setupCompletedAt || "",
        setupNotes: form.setupNotes.trim(),
        demoWatermarkEnabled: Boolean(form.demoWatermarkEnabled),
        demoTickerEnabled: Boolean(form.demoTickerEnabled),
        demoTickerText: form.demoTickerText?.trim() || DEFAULT_DEMO_TICKER_TEXT,
        updatedAt: serverTimestamp(),
      };

      if (editingClient) {
        let logoUrl = form.logoUrl || editingClient.logoUrl || "";

        if (form.logoFile) {
          logoUrl = await uploadClientLogo(editingClient.id, form.logoFile);
        }

        await updateDoc(doc(db, "clients", editingClient.id), {
          ...clientData,
          logoUrl,
        });

        closeClientModal();
        alert("Cliente atualizado com sucesso!");
      } else {
        const uid = await createClientAuthUser(form.email.trim(), form.password);
        const clientRef = await addDoc(collection(db, "clients"), {
          ...clientData,
          accountStatus: "active",
          uid,
          logoUrl: "",
          createdAt: serverTimestamp(),
        });

        if (form.logoFile) {
          try {
            const logoUrl = await uploadClientLogo(clientRef.id, form.logoFile);
            await updateDoc(clientRef, { logoUrl, updatedAt: serverTimestamp() });
          } catch (logoError) {
            console.log("Erro ao enviar logo do cliente:", logoError);
            alert("Cliente criado, mas não foi possível enviar a logo agora.");
          }
        }

        closeClientModal();
        alert("Cliente cadastrado com login, senha e vencimento!");
      }
    } catch (error) {
      console.log(error);

      if (error.code === "auth/email-already-in-use") {
        alert("Este e-mail já está em uso.");
        return;
      }

      if (error.code === "auth/weak-password") {
        alert("A senha precisa ter no mínimo 6 caracteres.");
        return;
      }
      alert(editingClient ? "Erro ao atualizar cliente." : "Erro ao cadastrar cliente.");
    } finally {
      setSavingClient(false);
    }
  }

  async function deleteClient(id) {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir este cliente do Firestore?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "clients", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir cliente.");
    }
  }

  async function resetClientPassword(email) {
    if (!email) {
      alert("Este cliente não possui e-mail cadastrado.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("E-mail de redefinição enviado para o cliente.");
    } catch (error) {
      console.log(error);
      alert("Erro ao enviar redefinição de senha.");
    }
  }

  async function toggleClientSuspension(client) {
    const isSuspended = getClientPlanAccess(client).isSuspended;
    const nextStatus = isSuspended ? "Ativo" : "Suspenso";
    const confirmMessage = isSuspended
      ? `Retornar o cliente ${client.name} para Ativo?`
      : `Suspender o cliente ${client.name}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await updateDoc(doc(db, "clients", client.id), {
        status: nextStatus,
        ...(nextStatus === "Ativo"
          ? {
              suspendedAt: deleteField(),
              suspensionReason: deleteField(),
            }
          : {
              suspendedAt: serverTimestamp(),
              suspensionReason: "Suspenso pelo modo gestor",
            }),
        updatedAt: serverTimestamp(),
      });

      alert(nextStatus === "Ativo" ? "Cliente reativado." : "Cliente suspenso.");
    } catch (error) {
      console.log(error);
      alert("Erro ao alterar status do cliente.");
    }
  }

  return (
    <>
      <header className="clients-premium-header">
        <div>
          <div className="kicker">Gestão SaaS</div>
          <h1>Clientes</h1>
          <p>Gerencie clientes, planos, vencimentos, acessos e limites de telas.</p>
        </div>

        <button
          className="clients-create-button"
          onClick={openCreateClientModal}
        >
          <Plus size={20} />
          Novo cliente
        </button>
      </header>

      {clientsError && (
        <div className="admin-data-alert">
          <strong>Clientes não carregados</strong>
          <span>{clientsError}</span>
        </div>
      )}

      <section className="clients-kpi-grid">
        <div className="clients-kpi-card">
          <span>Total</span>
          <strong>{clients.length}</strong>
          <p>Clientes cadastrados</p>
        </div>

        <div className="clients-kpi-card active">
          <span>Ativos</span>
          <strong>{activeClients.length}</strong>
          <p>Em operação</p>
        </div>

        <div className="clients-kpi-card warning">
          <span>Suspensos</span>
          <strong>{suspendedClients.length}</strong>
          <p>Atenção necessária</p>
        </div>

        <div className="clients-kpi-card danger">
          <span>Vencidos</span>
          <strong>{overdueClients.length}</strong>
          <p>Planos em atraso</p>
        </div>
      </section>

      <section className="clients-toolbar">
        <div className="clients-search">
          <Search size={20} />
          <input
            value={searchTerm}
            placeholder="Buscar por nome, e-mail ou plano..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="clients-filter-group">
          {["Todos", "Ativo", "Vencido", "Restrição Parcial", "Restrição Forte", "Suspenso"].map((status) => (
            <button
              key={status}
              className={statusFilter === status ? "active" : ""}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      <section className="clients-table-panel">
        <div className="clients-table-head">
          <span>Cliente</span>
          <span>Plano</span>
          <span>Vencimento</span>
          <span>Telas</span>
          <span>Status</span>
          <span>Ações</span>
        </div>

        {filteredClients.length === 0 ? (
          <div className="clients-empty">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients.map((client) => {
            const dueInfo = getDueInfo(client);
            const planAccess = getClientPlanAccess(client);
            const planConfig = getPlanConfig(client.plan);
            const setupInfo = getSetupInfo(client);
            const usage = clientUsage[client.id] || {};
            const screensUsed = Number(usage.screensCount || 0);
            const storageUsedBytes = Number(usage.storageUsedBytes || 0);
            const storageLimitBytes = getClientStorageLimit(client);
            const storageUsage = getStorageUsage(storageUsedBytes, storageLimitBytes);

            return (
              <div className="clients-table-row" key={client.id}>
                <div className="client-profile-cell">
                  <div className="client-avatar">
                    {client.logoUrl ? (
                      <img src={client.logoUrl} alt={`Logo de ${client.name}`} />
                    ) : (
                      client.name?.charAt(0)?.toUpperCase() || "C"
                    )}
                  </div>

                  <div>
                    <strong>{client.name}</strong>
                    <span>{client.email || "Sem e-mail cadastrado"}</span>
                  </div>
                </div>

                <div>
                  <strong>{planConfig.name}</strong>
                  <span>{client.billing}</span>
                  {planConfig.isDemo && (
                    <span className="client-status-badge temporary">Demonstração</span>
                  )}
                </div>

                <div>
                  <strong>{client.dueDate || "Não informado"}</strong>
                  <span className={`client-due ${dueInfo.className}`}>
                    {dueInfo.text}
                  </span>
                </div>

                <div>
                  <strong>{screensUsed}/{getClientScreenLimit(client)}</strong>
                  <span>{formatStorageSize(storageUsedBytes)} / {formatStorageSize(storageLimitBytes, 0)}</span>
                  <span className={`client-due ${storageUsage.severity === "danger" ? "danger" : storageUsage.severity === "warning" ? "warning" : "success"}`}>
                    {storageUsage.label}
                  </span>
                </div>

                <div>
                  <span className={`client-status-badge ${getStatusClass(planAccess.statusLabel)}`}>
                    {planAccess.statusLabel}
                  </span>
                  <span className="client-setup-line">
                    Adesão: {setupInfo.setupEnabled ? setupInfo.setupStatus : "Não acompanhada"}
                  </span>
                  <span className="client-setup-line">{formatSetupFee(client)}</span>
                </div>

                <div className="clients-actions">
                  <button
                    className="client-action primary"
                    onClick={() => onOpenClient(client)}
                  >
                    Abrir
                  </button>

                  <button
                    className="client-action"
                    onClick={() => resetClientPassword(client.email)}
                  >
                    Senha
                  </button>

                  <button
                    className="client-action"
                    onClick={() => openEditClientModal(client)}
                  >
                    Editar
                  </button>

                  <button
                    className={planAccess.isSuspended ? "client-action primary" : "client-action warning"}
                    onClick={() => toggleClientSuspension(client)}
                  >
                    {planAccess.isSuspended ? "Retornar" : "Suspender"}
                  </button>

                  <button
                    className="client-action danger"
                    onClick={() => deleteClient(client.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {showCreateModal && (
        <div className="client-modal-overlay">
          <div className="client-modal">
            <div className="client-modal-header">
              <div>
                <div className="kicker">{editingClient ? "Configuração" : "Novo acesso"}</div>
                <h2>{editingClient ? "Editar cliente" : "Cadastrar cliente"}</h2>
                <p>
                  {editingClient
                    ? "Atualize plano, vencimento, limite de telas e identidade visual."
                    : "Crie o cliente, login, senha inicial e vencimento do plano."}
                </p>
              </div>

              <button
                className="modal-close-button"
                onClick={closeClientModal}
              >
                <X size={22} />
              </button>
            </div>

            <div className="client-modal-section">
              <h3>Identificação</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do cliente</label>
                  <input
                    value={form.name}
                    placeholder="Ex: Supermercado Central"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    placeholder="cliente@email.com"
                    disabled={Boolean(editingClient)}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                {!editingClient && (
                  <div className="form-group">
                    <label>Senha inicial</label>
                    <input
                      type="password"
                      value={form.password}
                      placeholder="Mínimo 6 caracteres"
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Ativo</option>
                    <option>Suspenso</option>
                    <option>Vencido</option>
                  </select>
                </div>

                <div className="form-group client-logo-field">
                  <label>Logo ou foto do cliente</label>
                  <label className="client-logo-upload" htmlFor="client-profile-logo">
                    <span className="client-logo-preview">
                      {form.logoPreview ? (
                        <img src={form.logoPreview} alt="Prévia da logo" />
                      ) : (
                        form.name?.charAt(0)?.toUpperCase() || "C"
                      )}
                    </span>
                    <span>
                      <strong>Selecionar imagem</strong>
                      <small>{form.logoFile?.name || "PNG, JPG ou WEBP até 5 MB"}</small>
                    </span>
                    <input
                      id="client-profile-logo"
                      className="file-input-hidden"
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleClientLogoFile(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="client-modal-section">
              <h3>Plano e cobrança</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Plano</label>
                  <select
                    value={form.plan}
                    onChange={(e) => handleClientPlanChange(e.target.value)}
                  >
                    {Object.values(COMMERCIAL_PLANS).map((plan) => (
                      <option key={plan.name} value={plan.name}>
                        {plan.name} — {plan.priceLabel}/mês
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Cobrança</label>
                  <select
                    value={form.billing}
                    onChange={(e) => setForm({ ...form, billing: e.target.value })}
                  >
                    <option>Mensal</option>
                    <option>Anual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Vencimento do plano</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Data de início</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Limite de telas</label>
                  <input
                    type="number"
                    min="1"
                    value={form.screensLimit}
                    onChange={(e) =>
                      setForm({ ...form, screensLimit: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Limite de armazenamento (GB)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.storageLimitGb}
                    onChange={(e) => setForm({ ...form, storageLimitGb: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Vídeo máximo (MB)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.maxVideoSizeMb}
                    onChange={(e) => setForm({ ...form, maxVideoSizeMb: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Imagem máxima (MB)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.maxImageSizeMb}
                    onChange={(e) => setForm({ ...form, maxImageSizeMb: e.target.value })}
                  />
                </div>

                {getPlanConfig(form.plan).isDemo && (
                  <>
                    <div className="form-group">
                      <label>Templates Premium na demonstração</label>
                      <select
                        value={form.premiumTemplatesEnabled ? "Sim" : "Não"}
                        onChange={(e) => setForm({ ...form, premiumTemplatesEnabled: e.target.value === "Sim" })}
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Marketing na demonstração</label>
                      <select
                        value={form.marketingEnabled ? "Sim" : "Não"}
                        onChange={(e) => setForm({ ...form, marketingEnabled: e.target.value === "Sim" })}
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Logo/nome de demonstraÃ§Ã£o no Player</label>
                      <select
                        value={form.demoWatermarkEnabled ? "Sim" : "NÃ£o"}
                        onChange={(e) => setForm({ ...form, demoWatermarkEnabled: e.target.value === "Sim" })}
                      >
                        <option>Sim</option>
                        <option>NÃ£o</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Barra inferior de demonstraÃ§Ã£o</label>
                      <select
                        value={form.demoTickerEnabled ? "Sim" : "NÃ£o"}
                        onChange={(e) => setForm({ ...form, demoTickerEnabled: e.target.value === "Sim" })}
                      >
                        <option>Sim</option>
                        <option>NÃ£o</option>
                      </select>
                    </div>

                    <div className="form-group full">
                      <label>Mensagem da barra inferior</label>
                      <input
                        value={form.demoTickerText}
                        placeholder="Mensagem exibida no rodapÃ© do Player"
                        onChange={(e) => setForm({ ...form, demoTickerText: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="client-modal-section setup-section">
              <h3>Adesão / Implantação</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Acompanhar adesão</label>
                  <select
                    value={form.setupEnabled ? "Sim" : "Não"}
                    onChange={(e) => setForm({ ...form, setupEnabled: e.target.value === "Sim" })}
                  >
                    <option>Não</option>
                    <option>Sim</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status da implantação</label>
                  <select
                    value={form.setupStatus}
                    onChange={(e) => setForm({ ...form, setupStatus: e.target.value })}
                  >
                    <option>Não informada</option>
                    <option>Pendente</option>
                    <option>Em implantação</option>
                    <option>Concluída</option>
                    <option>Isenta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Valor opcional</label>
                  <input
                    value={form.setupFee}
                    placeholder="Deixe vazio se não informado"
                    onChange={(e) => setForm({ ...form, setupFee: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Status do pagamento</label>
                  <select
                    value={form.setupPaidStatus}
                    onChange={(e) => setForm({ ...form, setupPaidStatus: e.target.value })}
                  >
                    <option>Não informado</option>
                    <option>Pendente</option>
                    <option>Pago</option>
                    <option>Isento</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Forma de pagamento</label>
                  <input
                    value={form.setupMethod}
                    placeholder="Pix, boleto, cartão..."
                    onChange={(e) => setForm({ ...form, setupMethod: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Data de início</label>
                  <input
                    type="date"
                    value={form.setupStartDate}
                    onChange={(e) => setForm({ ...form, setupStartDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Data de conclusão</label>
                  <input
                    type="date"
                    value={form.setupCompletedAt}
                    onChange={(e) => setForm({ ...form, setupCompletedAt: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Pagamento em</label>
                  <input
                    type="date"
                    value={form.setupPaidAt}
                    onChange={(e) => setForm({ ...form, setupPaidAt: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label>Observações internas</label>
                  <textarea
                    value={form.setupNotes}
                    placeholder="Anotações administrativas sobre a implantação"
                    onChange={(e) => setForm({ ...form, setupNotes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="client-modal-actions">
              <button
                className="client-modal-cancel"
                onClick={closeClientModal}
              >
                Cancelar
              </button>

              <button
                className="clients-create-button"
                onClick={handleSaveClient}
                disabled={savingClient}
              >
                <Plus size={20} />
                {savingClient
                  ? "Salvando..."
                  : editingClient
                    ? "Salvar alterações"
                    : "Criar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ClientInternalPanel({ client, onBack, hideBackButton = false, isAdmin = false, adminUser = null }) {
  const [tab, setTab] = useState("dashboard");
  const [currentClient, setCurrentClient] = useState(client);

  useEffect(() => {
    setCurrentClient(client);
    if (!client?.id) return undefined;

    return onSnapshot(doc(db, "clients", client.id), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentClient({ id: snapshot.id, ...snapshot.data() });
      }
    });
  }, [client]);

  const planAccess = getClientPlanAccess(currentClient);
  const operationalAccess = isAdmin
    ? {
        ...planAccess,
        canUseSystem: true,
        canCreate: true,
        canEdit: true,
        canUpload: true,
        canCreateScreens: true,
        canCreatePlaylists: true,
        canCreateTemplates: true,
        canCreateMarketing: true,
        canEditScreens: true,
        canEditPlaylists: true,
        canEditTemplates: true,
        canEditMarketing: true,
      }
    : planAccess;

  return (
    <>
      <header className="header client-dashboard-header">
        <div className="client-dashboard-identity">
          <div className="client-avatar client-avatar-dashboard">
            {currentClient.logoUrl ? (
              <img src={currentClient.logoUrl} alt={`Logo de ${currentClient.name}`} />
            ) : (
              currentClient.name?.charAt(0)?.toUpperCase() || "C"
            )}
          </div>

          <div>
          {!hideBackButton && onBack && (
            <button className="player-back-button" onClick={onBack}>
              ← Voltar
            </button>
          )}

          <div className="kicker">Cliente</div>
          <h1>{currentClient.name}</h1>
          <p>
            Plano {getPlanConfig(currentClient.plan).name} • {currentClient.billing} • Vencimento:{" "}
            {currentClient.dueDate || "não informado"} • Limite de telas:{" "}
            {getClientScreenLimit(currentClient)}
          </p>
          </div>
        </div>
      </header>

      <PlanStatusBanner access={planAccess} />

      {isAdmin && (
        <AdminPlanControls client={currentClient} adminUser={adminUser} />
      )}

      {!isAdmin && planAccess.isSuspended ? (
        <SuspendedClientPanel client={currentClient} access={planAccess} />
      ) : (
        <>

      <div className="client-tabs client-dashboard-tabs">
        <button
          className={tab === "dashboard" ? "client-tab active" : "client-tab"}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={tab === "media" ? "client-tab active" : "client-tab"}
          onClick={() => setTab("media")}
        >
          Mídias
        </button>

        <button
          className={tab === "playlists" ? "client-tab active" : "client-tab"}
          onClick={() => setTab("playlists")}
        >
          Playlists
        </button>

        <button
          className={tab === "screens" ? "client-tab active" : "client-tab"}
          onClick={() => setTab("screens")}
        >
          Telas
        </button>

        <button
          className={tab === "templates" ? "client-tab active" : "client-tab"}
          onClick={() => setTab("templates")}
        >
          Templates
        </button>

        <button
          className={tab === "marketing" ? "client-tab active" : "client-tab"}
          onClick={() => setTab("marketing")}
        >
          Marketing
        </button>

        <button
          className={tab === "plans" ? "client-tab active" : "client-tab"}
          onClick={() => setTab("plans")}
        >
          Planos
        </button>
      </div>

      {tab === "dashboard" && <ClientDashboard client={currentClient} access={operationalAccess} />}
      {tab === "media" && <ClientMediaPage client={currentClient} access={operationalAccess} />}
      {tab === "playlists" && <ClientPlaylistsPage client={currentClient} access={operationalAccess} />}
      {tab === "screens" && <ClientScreensPage client={currentClient} access={operationalAccess} />}
      {tab === "templates" && <ClientTemplatesPage client={currentClient} access={operationalAccess} />}
      {tab === "marketing" && <ClientMarketingPage client={currentClient} access={operationalAccess} />}
      {tab === "plans" && <PlansPage clientView />}
        </>
      )}
    </>
  );
}

function ClientDashboard({ client, access = getClientPlanAccess(client) }) {
  const [media, setMedia] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [screens, setScreens] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubMedia = onSnapshot(
      collection(db, "clients", client.id, "media"),
      (snapshot) => {
        setMedia(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    const unsubPlaylists = onSnapshot(
      collection(db, "clients", client.id, "playlists"),
      (snapshot) => {
        setPlaylists(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    const unsubScreens = onSnapshot(
      collection(db, "clients", client.id, "screens"),
      (snapshot) => {
        setScreens(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    return () => {
      unsubMedia();
      unsubPlaylists();
      unsubScreens();
    };
  }, [client.id]);

  function timeToMinutes(time) {
    if (!time) return 0;

    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
  }

  function getTodayValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function isPlaylistInSchedule(playlist, screenId) {
    if (!playlist?.scheduleEnabled) return false;

    if (
      playlist.targetScreenIds &&
      playlist.targetScreenIds.length > 0 &&
      !playlist.targetScreenIds.includes(screenId)
    ) {
      return false;
    }

    const today = getTodayValue(now);

    if (playlist.startDate && today < playlist.startDate) return false;
    if (playlist.endDate && today > playlist.endDate) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = timeToMinutes(playlist.startTime);
    const endMinutes = timeToMinutes(playlist.endTime);

    if (startMinutes === endMinutes) return true;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  function getActivePlaylist(screen) {
    const scheduled = playlists
      .filter((playlist) => isPlaylistInSchedule(playlist, screen.id))
      .sort((a, b) => {
        const aDate = `${a.startDate || ""} ${a.startTime || ""}`;
        const bDate = `${b.startDate || ""} ${b.startTime || ""}`;

        return bDate.localeCompare(aDate);
      });

    if (scheduled.length > 0) {
      return {
        playlist: scheduled[0],
        mode: "scheduled",
      };
    }

    return {
      playlist: playlists.find((playlist) => playlist.id === screen.playlistId),
      mode: "default",
    };
  }

  function getLastSeenDate(screen) {
    return getScreenLastSeenDate(screen);
  }

  function isScreenOnline(screen) {
    return getScreenConnectionStatus(screen).isOnline;
  }

  const onlineScreensCount = screens.filter(isScreenOnline).length;
  const dueDateLabel = client.dueDate
    ? new Date(`${client.dueDate}T12:00:00`).toLocaleDateString("pt-BR")
    : "--";
  const planConfig = getPlanConfig(client.plan);
  const screenLimit = getClientScreenLimit(client);
  const storageUsedBytes = getMediaStorageUsed(media);
  const storageLimitBytes = getClientStorageLimit(client);
  const storageUsage = getStorageUsage(storageUsedBytes, storageLimitBytes);
  const setupInfo = getSetupInfo(client);
  const screenReports = screens.map((screen) => {
    const active = getActivePlaylist(screen);
    const connection = getScreenConnectionStatus(screen);

    return {
      id: screen.id,
      name: screen.name || "Tela",
      code: screen.code || "--",
      location: screen.location || "Nao informado",
      orientation: screen.orientation || "Paisagem",
      status: connection.label,
      statusClass: connection.className,
      deviceId: screen.connectedDeviceId || screen.activeDeviceId || "",
      lastConnection: screen.lastConnection || "Ainda nao conectou",
      lastSeen: formatScreenConnectionDate(connection.lastSeenDate),
      playlist: screen.currentPlaylistName || active.playlist?.name || "Sem playlist",
      mode: screen.currentPlaylistMode || active.mode || "default",
      nowPlaying: screen.nowPlayingTitle || "Aguardando conteudo",
      itemProgress: screen.nowPlayingIndex && screen.nowPlayingTotal
        ? `${screen.nowPlayingIndex}/${screen.nowPlayingTotal}`
        : "--",
      cache: screen.cacheStatus
        ? `${screen.cacheStatus} ${Number(screen.cachedItems || 0)}/${Number(screen.totalCacheableItems || 0)}`
        : "Sem cache informado",
      mediaSource: screen.currentMediaSource || "remote",
    };
  });
  const loggedScreensCount = screenReports.filter((report) => report.deviceId).length;
  const loggedOfflineScreensCount = screenReports.filter((report) => report.deviceId && report.statusClass !== "online").length;

  return (
    <>
      <section className="stats client-dashboard-stats">
        <StatCard
          title="Plano atual"
          value={planConfig.name}
          icon={<CreditCard />}
          status={client.billing || "Mensal"}
        />

        <StatCard
          title="Valor mensal"
          value={planConfig.priceLabel}
          icon={<CreditCard />}
          status="Assinatura do plano"
        />

        <StatCard
          title="Uso de telas"
          value={`${screens.length}/${screenLimit}`}
          icon={<Monitor />}
          status={`${onlineScreensCount} online agora`}
        />

        <StatCard
          title="Armazenamento"
          value={`${formatStorageSize(storageUsedBytes)} / ${formatStorageSize(storageLimitBytes, 0)}`}
          icon={<Upload />}
          status={`${storageUsage.percentage.toFixed(1)}% • ${storageUsage.label}`}
          severity={storageUsage.severity}
        />

        <StatCard
          title="Templates Premium"
          value={hasPremiumTemplates(client) ? "Ativo" : "Bloqueado"}
          icon={<Newspaper />}
          status={hasPremiumTemplates(client) ? "Recursos liberados" : "Disponível no Business"}
        />

        <StatCard
          title="Marketing"
          value={hasMarketingAccess(client) ? "Ativo" : "Bloqueado"}
          icon={<Palette />}
          status={hasMarketingAccess(client) ? "Criação de artes liberada" : "A partir do Professional"}
        />

        <StatCard
          title="Limite por vídeo"
          value={formatStorageSize(getClientMaxVideoSize(client), 0)}
          icon={<Upload />}
          status={`Imagem até ${formatStorageSize(getClientMaxImageSize(client), 0)}`}
        />

        <StatCard
          title="Vencimento"
          value={dueDateLabel}
          icon={<CreditCard />}
          status={access.daysOverdue > 0 ? `${access.daysOverdue} dia(s) em atraso` : access.message}
        />

        <StatCard
          title="Status do plano"
          value={access.statusLabel}
          icon={access.isActive ? <CheckCircle2 /> : <TriangleAlert />}
          status={access.hasTemporaryUnlock ? `Até ${formatPlanAccessDate(access.graceUnlockUntil)}` : access.message}
        />

        <StatCard
          title="Playlists"
          value={playlists.length}
          icon={<ListVideo />}
          status="Campanhas criadas"
        />
      </section>

      {setupInfo.setupEnabled && (
        <section className="panel client-setup-summary">
          <div className="playlist-editor-header">
            <div>
              <h2>Implantação</h2>
              <p>Status da adesão e implantação do projeto.</p>
            </div>
          </div>

          <div className="client-setup-summary-grid">
            <div><span>Status</span><strong>{setupInfo.setupStatus}</strong></div>
            <div><span>Pagamento</span><strong>{setupInfo.setupPaidStatus}</strong></div>
            <div><span>Valor</span><strong>{formatSetupFee(client)}</strong></div>
          </div>
        </section>
      )}

      <section className="panel client-dashboard-preview-panel">
        <div className="playlist-editor-header">
          <div>
            <h2>Preview das telas</h2>
            <p>
              Acompanhe em tempo real qual programação cada tela está exibindo.
            </p>
          </div>
        </div>

        <div className="screen-preview-grid">
          {screens.length === 0 ? (
            <div className="empty-library">
              Nenhuma tela cadastrada ainda.
            </div>
          ) : (
            screens.map((screen) => {
              const active = getActivePlaylist(screen);
              const activePlaylist = active.playlist;
              const currentIndex = getPlaylistPreviewIndex(activePlaylist, now, screen);
              const reportedIndex = Math.max(0, Number(screen.nowPlayingIndex || 1) - 1);
              const activeItem = activePlaylist?.items?.[currentIndex] || activePlaylist?.items?.[0];
              const canUseLivePreview = screen.nowPlayingPreview && reportedIndex === currentIndex;
              const previewMedia = canUseLivePreview
                ? {
                    ...activeItem,
                    preview: screen.nowPlayingPreview,
                    title: screen.nowPlayingTitle || activeItem?.title || activeItem?.name || "Mídia atual",
                    type: screen.nowPlayingType || activeItem?.type || "Imagem",
                    orientation: screen.nowPlayingOrientation || activeItem?.orientation || "Paisagem",
                    aspectRatio: screen.nowPlayingAspectRatio || activeItem?.aspectRatio || "",
                    width: screen.nowPlayingWidth || activeItem?.width || null,
                    height: screen.nowPlayingHeight || activeItem?.height || null,
                    templateType: screen.nowPlayingTemplateType || activeItem?.templateType || "",
                    playerItemType: screen.nowPlayingItemType || activeItem?.playerItemType || "",
                  }
                : activeItem;
              const previewIndexLabel = activePlaylist?.items?.length ? currentIndex + 1 : screen.nowPlayingIndex;

              const connection = getScreenConnectionStatus(screen);
              const deviceLocation = getScreenDisplayLocation(screen);
              const online = connection.isOnline;

              return (
                <div className="screen-live-card" key={screen.id}>
                  <div className="screen-live-preview">
                    <UniversalPreview
                      key={`${screen.id}-${screen.nowPlayingPreview || previewMedia?.preview || "empty"}-${screen.nowPlayingIndex || 0}`}
                      item={previewMedia}
                      className="screen-universal-preview"
                      compact
                      autoPlay
                      fallbackIcon={<Monitor size={48} />}
                    />

                    <div className={online ? "live-dot online" : "live-dot offline"}></div>
                  </div>

                  <div className="screen-live-info">
                    <div className="screen-card-top">
                      <strong>{screen.name}</strong>

                      <div className={`screen-status ${connection.className}`}>
                        <div></div>
                        {connection.label}
                      </div>
                    </div>

                    <div className="tv-monitor-meta">
                      <div className={screen.currentPlaylistMode === "scheduled" || active.mode === "scheduled" ? "monitor-mode scheduled" : "monitor-mode"}>
                        {screen.currentPlaylistMode === "scheduled" || active.mode === "scheduled"
                          ? "Agendada ativa"
                          : "Playlist padrão"}
                      </div>

                      <div className={`monitor-heartbeat ${connection.className}`}>
                        {connection.detail}
                      </div>
                    </div>

                    <h4>{screen.currentPlaylistName || activePlaylist?.name || "Nenhuma playlist ativa"}</h4>

                    <div className="now-playing-box">
                      <small>Passando agora</small>
                      <strong>{previewMedia?.title || previewMedia?.name || screen.nowPlayingTitle || "Aguardando mídia"}</strong>
                      <span>
                        {previewIndexLabel && (screen.nowPlayingTotal || activePlaylist?.items?.length)
                          ? `${previewIndexLabel}/${screen.nowPlayingTotal || activePlaylist?.items?.length}`
                          : "Sem progresso"} • {previewMedia?.type || screen.nowPlayingType || "Mídia"}
                      </span>
                    </div>

                    <div className="screen-cache-box">
                      <small>Cache</small>
                      <strong>{getCacheStatusLabel(screen)}</strong>
                      <span>
                        {getMediaSourceLabel(screen.currentMediaSource)} • {formatStorageSize(screen.cacheSizeBytes || 0)} estimado
                      </span>
                      {getCacheSyncLabel(screen) && <span>{getCacheSyncLabel(screen)}</span>}
                      <span>Atualizado: {formatFirestoreDate(screen.cacheUpdatedAt)}</span>
                    </div>

                    <div className="screen-connection-box">
                      <small>Dispositivo</small>
                      <strong>{connection.deviceLabel}</strong>
                      <span>Logado em: {connection.lastConnection}</span>
                      <span>Último sinal: {formatScreenConnectionDate(connection.lastSeenDate)}</span>
                      <span>Local: {deviceLocation.city}</span>
                      <span>{deviceLocation.detail}</span>
                      <span>Local atualizado: {formatScreenConnectionDate(deviceLocation.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="panel screen-usage-report-panel">
        <div className="playlist-editor-header">
          <div>
            <h2>Relatorio de uso das telas</h2>
            <p>Resumo detalhado por tela, dispositivo, playlist atual, item exibido e cache.</p>
          </div>
        </div>

        <div className="screen-usage-summary">
          <div><span>Total de telas</span><strong>{screens.length}</strong></div>
          <div><span>Online agora</span><strong>{onlineScreensCount}</strong></div>
          <div><span>Logadas</span><strong>{loggedScreensCount}</strong></div>
          <div><span>Logadas offline</span><strong>{loggedOfflineScreensCount}</strong></div>
        </div>

        <div className="screen-usage-table-wrap">
          <table className="screen-usage-table">
            <thead>
              <tr>
                <th>Tela</th>
                <th>Status</th>
                <th>Dispositivo</th>
                <th>Conexao</th>
                <th>Playlist / Item</th>
                <th>Cache</th>
              </tr>
            </thead>
            <tbody>
              {screenReports.length === 0 ? (
                <tr>
                  <td colSpan="6">Nenhuma tela cadastrada.</td>
                </tr>
              ) : (
                screenReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.name}</strong>
                      <span>{report.location} • {report.orientation} • Codigo {report.code}</span>
                    </td>
                    <td>
                      <span className={`screen-report-status ${report.statusClass}`}>{report.status}</span>
                    </td>
                    <td>
                      <strong>{report.deviceId ? report.deviceId.slice(0, 18) : "Nenhum dispositivo"}</strong>
                      {report.deviceId && <span>{report.deviceId}</span>}
                    </td>
                    <td>
                      <strong>Login: {report.lastConnection}</strong>
                      <span>Ultimo sinal: {report.lastSeen}</span>
                    </td>
                    <td>
                      <strong>{report.playlist}</strong>
                      <span>{report.nowPlaying} • Item {report.itemProgress}</span>
                    </td>
                    <td>
                      <strong>{report.cache}</strong>
                      <span>Origem: {report.mediaSource}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}


function ClientMediaPage({ client, access = getClientPlanAccess(client) }) {
  const [uploadNotice, setUploadNotice] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingMedia, setEditingMedia] = useState(null);
  const mediaEditorRef = useRef(null);
  const mediaFileInputRef = useRef(null);

  const storageUsedBytes = getMediaStorageUsed(mediaList);
  const storageLimitBytes = getClientStorageLimit(client);
  const storageUsage = getStorageUsage(storageUsedBytes, storageLimitBytes);
  const planLimits = getClientUploadLimits(client);

  const [form, setForm] = useState({
    title: "",
    duration: "10",
    file: null,
    preview: "",
    type: "",
    sound: false,
    width: null,
    height: null,
    orientation: "Paisagem",
    aspectRatio: "custom",
    naturalDuration: null,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "clients", client.id, "media"),
      (snapshot) => {
        const list = snapshot.docs.map((mediaDoc) => ({
          id: mediaDoc.id,
          ...mediaDoc.data(),
        }));

        setMediaList(list);
      }
    );

    return () => unsubscribe();
  }, [client.id]);

  function validateMediaFile(file) {
    if (!file) return false;

    const fileKind = getUploadFileKind(file);
    const isVideo = fileKind === "video";
    const isImage = fileKind === "image";

    if (!isVideo && !isImage) {
      alert("Selecione uma imagem ou vídeo compatível.");
      return false;
    }

    const limit = isVideo ? planLimits.maxVideoSizeBytes : planLimits.maxImageSizeBytes;
    const notice = uploadSizeNotice(getPlanConfig(client.plan).name, fileKind, file.size, limit);
    if (notice) {
      setUploadNotice(notice);
      return false;
    }

    if (storageUsedBytes + file.size > storageLimitBytes) {
      alert("Limite de armazenamento atingido. Remova arquivos ou faça upgrade do plano.");
      return false;
    }

    return true;
  }

  async function handleSelectedFile(file) {
    if (!file || !validateMediaFile(file)) return;

    const isVideo = getUploadFileKind(file) === "video";
    const type = isVideo ? "Vídeo" : "Imagem";
    const preview = URL.createObjectURL(file);
    let dimensions = buildMediaDimensions(0, 0, form.orientation || "Paisagem");

    try {
      dimensions = await detectMediaFileMetadata(file);
    } catch (error) {
      console.log("NÃ£o foi possÃ­vel ler metadata da mÃ­dia:", error);
    }

    const detectedDuration = dimensions.naturalDuration || null;

    setForm({
      ...form,
      file,
      preview,
      type,
      title: form.title || file.name,
      duration: isVideo && detectedDuration ? String(detectedDuration) : form.duration,
      ...dimensions,
      sound: isVideo ? form.sound : false,
    });
  }

  async function handleFileChange(event) {
    const file = event.target.files[0];
    await handleSelectedFile(file);

    if (!isNativeApp()) {
      event.target.value = "";
    }
  }

  function openMediaFilePicker() {
    mediaFileInputRef.current?.click();
  }

  function resetMediaForm() {
    setEditingMedia(null);
    setForm({
      title: "",
      duration: "10",
      file: null,
      preview: "",
      type: "",
      sound: false,
      width: null,
      height: null,
      orientation: "Paisagem",
      aspectRatio: "custom",
      naturalDuration: null,
    });
    setProgress(0);
  }

  function startEditMedia(media) {
    if (!requirePlanPermission(access, "canEdit", "editar mídias")) return;

    setEditingMedia(media);
    setForm({
      title: media.title || "",
      duration: String(media.duration || 10),
      file: null,
      preview: media.preview || "",
      type: media.type || "Imagem",
      sound: Boolean(media.sound),
      width: media.width || null,
      height: media.height || null,
      orientation: media.orientation || "Paisagem",
      aspectRatio: media.aspectRatio || "custom",
      naturalDuration: media.naturalDuration || media.duration || null,
    });

    requestAnimationFrame(() => {
      mediaEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function updateMediaInPlaylists(mediaId, changes) {
    const playlistsSnapshot = await getDocs(
      collection(db, "clients", client.id, "playlists")
    );

    await Promise.all(
      playlistsSnapshot.docs.map(async (playlistDoc) => {
        const playlist = playlistDoc.data();
        const items = Array.isArray(playlist.items) ? playlist.items : [];
        let changed = false;

        const updatedItems = items.map((item) => {
          const isTargetMedia =
            item?.id === mediaId &&
            !isTemplatePreviewItem(item);

          if (!isTargetMedia) return item;

          changed = true;
          return { ...item, ...changes };
        });

        if (!changed) return;

        await updateDoc(playlistDoc.ref, {
          items: updatedItems,
          updatedAt: serverTimestamp(),
        });
      })
    );
  }

  function isPlaylistMediaReference(item, media) {
    if (!item || isTemplatePreviewItem(item)) return false;

    const ids = [item.id, item.mediaId, item.sourceMediaId, item.originalId]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (ids.includes(String(media.id))) return true;

    const previews = [item.preview, item.remotePreview, item.imageUrl, item.url, item.downloadURL]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const mediaPreviews = [media.preview, media.remotePreview, media.imageUrl, media.url, media.downloadURL]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return previews.some((preview) => mediaPreviews.includes(preview));
  }

  async function removeMediaFromPlaylists(media) {
    const playlistsSnapshot = await getDocs(
      collection(db, "clients", client.id, "playlists")
    );
    let affectedPlaylists = 0;
    let removedItems = 0;

    await Promise.all(
      playlistsSnapshot.docs.map(async (playlistDoc) => {
        const playlist = playlistDoc.data();
        const items = Array.isArray(playlist.items) ? playlist.items : [];
        const updatedItems = items.filter((item) => !isPlaylistMediaReference(item, media));
        const removedFromPlaylist = items.length - updatedItems.length;

        if (removedFromPlaylist <= 0) return;

        affectedPlaylists += 1;
        removedItems += removedFromPlaylist;

        await updateDoc(playlistDoc.ref, {
          items: updatedItems,
          playlistRevision: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          updatedAt: serverTimestamp(),
        });
      })
    );

    return { affectedPlaylists, removedItems };
  }

  async function handleSaveMedia() {
    if (!form.title.trim()) {
      alert("Informe o nome da mídia.");
      return;
    }

    const duration = Number(form.duration);

    if (!Number.isFinite(duration) || duration < 1) {
      alert("Informe uma duração válida, a partir de 1 segundo.");
      return;
    }

    if (editingMedia) {
      if (!requirePlanPermission(access, "canEdit", "editar mídias")) return;

      try {
        setUploading(true);

        const changes = {
          title: form.title.trim(),
          duration,
          sound: form.type === "Vídeo" ? form.sound : false,
        };

        await updateDoc(
          doc(db, "clients", client.id, "media", editingMedia.id),
          { ...changes, updatedAt: serverTimestamp() }
        );
        await updateMediaInPlaylists(editingMedia.id, changes);

        resetMediaForm();
        alert("Tempo da mídia atualizado em todas as playlists!");
      } catch (error) {
        console.log(error);
        alert("Erro ao atualizar a mídia.");
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!form.file) {
      alert("Selecione uma imagem ou vídeo.");
      return;
    }

    if (!requirePlanPermission(access, "canUpload", "enviar novas mídias")) return;
    if (!validateMediaFile(form.file)) return;

    try {
      setUploading(true);
      setProgress(0);

      const fileName = `${Date.now()}_${sanitizeStorageFileName(form.file.name)}`;
      const storagePath = `clients/${client.id}/media/${fileName}`;
      const uploadMetadata = {
        originalName: form.file.name || fileName,
        clientId: client.id,
        uploadedByUid: auth.currentUser?.uid || "",
        uploadedByEmail: normalizeEmail(auth.currentUser?.email || ""),
      };

      async function saveMediaDocument(downloadURL) {
        await addDoc(collection(db, "clients", client.id, "media"), {
          title: form.title.trim(),
          duration,
          type: form.type,
          preview: downloadURL,
          width: form.width || null,
          height: form.height || null,
          orientation: form.orientation || "Paisagem",
          aspectRatio: form.aspectRatio || "custom",
          naturalDuration: form.naturalDuration || null,
          sound: Boolean(form.sound),
          sizeBytes: form.file.size,
          fileName: form.file.name,
          storagePath: uploadResult.storagePath || storagePath,
          storageProvider: uploadResult.storageProvider || "firebase",
          storageKey: uploadResult.storageKey || uploadResult.storagePath || storagePath,
          fileHash: uploadResult.fileHash || "",
          etag: uploadResult.etag || "",
          clientId: client.id,
          uploadedByUid: auth.currentUser?.uid || "",
          uploadedByEmail: normalizeEmail(auth.currentUser?.email || ""),
          createdAt: serverTimestamp(),
        });
      }

      const uploadResult = await uploadStorageAsset({
        path: storagePath,
        file: form.file,
        contentType: getUploadContentType(form.file),
        customMetadata: uploadMetadata,
        onProgress: setProgress,
      });
      setProgress(100);
      await saveMediaDocument(uploadResult.publicUrl || uploadResult.url);
      resetMediaForm();
      alert("Mídia enviada com sucesso!");
    } catch (error) {
      console.log(error);
      alert(getUploadErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function deleteMedia(media) {
    if (!requirePlanPermission(access, "canEdit", "excluir mídias")) return;

    const confirmDelete = window.confirm(
      `Excluir a mídia "${media.title}" do sistema?\n\nEla também será removida automaticamente das playlists onde estiver presente.`
    );

    if (!confirmDelete) return;

    try {
      const cleanup = await removeMediaFromPlaylists(media);

      if (media.storagePath) {
        try {
          await deleteStoredAsset({
            storagePath: media.storagePath,
            storageProvider: media.storageProvider || "firebase",
          });
        } catch (storageError) {
          console.log("Não foi possível remover o arquivo do Storage:", storageError);
        }
      }

      await deleteDoc(doc(db, "clients", client.id, "media", media.id));
      alert(
        cleanup.removedItems > 0
          ? `Mídia excluída e removida de ${cleanup.affectedPlaylists} playlist(s).`
          : "Mídia excluída."
      );
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir mídia.");
    }
  }

  const fileInputId = `media-file-${client.id}`;

  return (
    <>
      <UploadLimitDialog notice={uploadNotice} onClose={() => setUploadNotice(null)} />
      <section className={`storage-usage-card ${storageUsage.severity}`}>
        <div className="storage-usage-header">
          <div>
            <span>Armazenamento usado</span>
            <strong>{formatStorageSize(storageUsedBytes)} / {formatStorageSize(storageLimitBytes, 0)}</strong>
          </div>
          <b>{storageUsage.percentage.toFixed(1)}%</b>
        </div>
        <div className="storage-progress-track">
          <div style={{ width: `${storageUsage.percentage}%` }} />
        </div>
        <p>
          {storageUsage.label} • Vídeos até {formatStorageSize(planLimits.maxVideoSizeBytes)} • Imagens até {formatStorageSize(planLimits.maxImageSizeBytes)}
        </p>
      </section>

      <section className="upload-panel" ref={mediaEditorRef}>
        <div className="upload-preview-box">
          {form.preview ? (
            <>
              <UniversalPreview item={form} className="upload-media-preview" controls compact={false} />

              <div className="upload-preview-details">
                <div>
                  <span>Arquivo selecionado</span>
                  <strong>{form.file?.name || form.title}</strong>
                </div>
                <div>
                  <span>Tempo real</span>
                  <strong>
                    {form.naturalDuration
                      ? formatDurationLabel(form.naturalDuration)
                      : form.type === "Imagem"
                        ? "Imagem estática"
                        : "Detectando..."}
                  </strong>
                </div>
                <div>
                  <span>Tempo salvo</span>
                  <strong>{formatDurationLabel(form.duration)}</strong>
                </div>
                <div>
                  <span>Formato</span>
                  <strong>{getPreviewOrientationLabel(form)} • {form.aspectRatio || "custom"}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-upload">
              <Upload size={42} />
              <p>Prévia da mídia aparecerá aqui</p>
            </div>
          )}
        </div>

        <div className="upload-form">
          {editingMedia ? (
            <div className="editing-media-banner">
              <div className="editing-badge">Editando mídia</div>
              <strong>{editingMedia.title}</strong>
              <p>Altere o nome, o tempo de exibição ou o som. O arquivo original será mantido.</p>
            </div>
          ) : (
            <div className="modern-upload-group">
            <div className="modern-upload-title">
              <div className="modern-upload-icon">
                <Upload size={22} />
              </div>

              <div>
                <label>Arquivo</label>
                <p>Selecione ou arraste uma imagem/vídeo para enviar.</p>
              </div>
            </div>

            <label
              className="file-dropzone"
              htmlFor={fileInputId}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                if (event.target?.tagName === "INPUT") return;
                event.preventDefault();
                openMediaFilePicker();
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                openMediaFilePicker();
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleSelectedFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                ref={mediaFileInputRef}
                id={fileInputId}
                className="file-input-hidden"
                type="file"
                accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.m4v,.webm,.mkv,.avi,.3gp"
                onChange={handleFileChange}
              />

              <div className="file-upload-button">
                <Upload size={30} />

                <div>
                  <strong>Selecionar arquivo</strong>
                  <span>Clique para escolher no dispositivo</span>
                </div>
              </div>

              <div className="file-drop-divider"></div>

              <div className="file-drop-copy">
                <div className="file-drop-icon">📁</div>
                <strong>Ou arraste e solte aqui</strong>
                <span>Imagens e vídeos</span>
              </div>
            </label>

            <div className="file-upload-help">
              <span>ⓘ</span>
              Formatos suportados: JPG, PNG, MP4, MOV e WEBM
            </div>

            {form.file && (
              <div className="selected-file-card">
                <strong>{form.file.name}</strong>
                <span>{form.type} selecionado</span>
              </div>
            )}
            </div>
          )}

          <div className="form-group media-name-group">
            <label>Nome da mídia</label>
            <input
              value={form.title}
              maxLength={80}
              placeholder="Ex.: Promoção Loja, Vídeo Institucional, Música Ambiente..."
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <small>{form.title.length}/80</small>
          </div>

          <div className="form-group">
            <label>Duração em segundos</label>
            <input
              type="number"
              min="1"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </div>

          {form.type === "Vídeo" && (
            <button
              type="button"
              className={form.sound ? "sound-toggle active" : "sound-toggle"}
              onClick={() => setForm({ ...form, sound: !form.sound })}
            >
              {form.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {form.sound ? "Com som" : "Sem som"}
            </button>
          )}

          {uploading && (
            <div className="upload-progress">
              <div
                className="upload-progress-bar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          <div className="panel-actions">
            {editingMedia && (
              <button
                type="button"
                className="client-action"
                onClick={resetMediaForm}
                disabled={uploading}
              >
                Cancelar edição
              </button>
            )}

            <button
              className="upload-button"
              onClick={handleSaveMedia}
              disabled={uploading}
            >
              <Plus size={20} />
              {uploading
                ? editingMedia
                  ? "Salvando..."
                  : `Enviando ${progress}%`
                : editingMedia
                  ? "Salvar alterações"
                  : "Salvar mídia"}
            </button>
          </div>
        </div>
      </section>

      <section className="cards-grid media-list">
        {mediaList.length === 0 ? (
          <div className="empty-library">Nenhuma mídia cadastrada ainda.</div>
        ) : (
          mediaList.map((media) => (
            <div className="media-card" key={media.id}>
              <div className="media-preview">
                <UniversalPreview item={media} compact={false} />
              </div>

              <div className="media-info">
                <span>{media.type}</span>
                <h3>{media.title}</h3>
                <p>{media.duration} segundos</p>
                <p>{getPreviewOrientationLabel(media)} • {media.aspectRatio || "custom"}</p>
                <p>{media.sound ? "Com som" : "Sem som"}</p>
                <p>{media.sizeBytes ? formatFileSizeMb(media.sizeBytes) : "Tamanho não informado"}</p>

                <div className="media-card-actions">
                  <button className="client-action primary" onClick={() => startEditMedia(media)}>
                    Editar tempo
                  </button>

                  <button className="delete-button" onClick={() => deleteMedia(media)}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function ClientPlaylistsPage({ client, access = getClientPlanAccess(client) }) {
  const [mediaList, setMediaList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [screens, setScreens] = useState([]);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [draggedMediaId, setDraggedMediaId] = useState(null);
  const [draftPlaylistItems, setDraftPlaylistItems] = useState([]);
  const playlistEditorRef = useRef(null);
  const canUsePremiumTemplates = hasPremiumTemplates(client);

  const [form, setForm] = useState({
    name: "",
    transition: "Fade suave",
    transitionSpeed: "Normal",
    orientation: "Paisagem",
    selectedMediaIds: [],
    scheduleEnabled: false,
    targetScreenIds: [],
    startDate: "",
    endDate: "",
    startTime: "08:00",
    endTime: "18:00",
  });

  useEffect(() => {
    const unsubMedia = onSnapshot(
      collection(db, "clients", client.id, "media"),
      (snapshot) => {
        setMediaList(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      }
    );

    const unsubTemplates = onSnapshot(
      collection(db, "clients", client.id, "templates"),
      (snapshot) => {
        setTemplates(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      }
    );

    const unsubPlaylists = onSnapshot(
      collection(db, "clients", client.id, "playlists"),
      (snapshot) => {
        setPlaylists(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      }
    );

    const unsubScreens = onSnapshot(
      collection(db, "clients", client.id, "screens"),
      (snapshot) => {
        setScreens(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      }
    );

    return () => {
      unsubMedia();
      unsubTemplates();
      unsubPlaylists();
      unsubScreens();
    };
  }, [client.id]);

  function getMediaKey(mediaId) {
    return `media:${mediaId}`;
  }

  function getTemplateKey(templateId) {
    return `template:${templateId}`;
  }

  function getPlaylistItemKey(item, index = 0) {
    if (isTemplatePreviewItem(item)) {
      const templateId = item.id || item.templateId || item.sourceTemplateId || item.sourceMarketingId;
      return templateId ? getTemplateKey(templateId) : `legacy:${index}`;
    }

    const mediaId = item?.id || item?.mediaId || item?.sourceMediaId;
    return mediaId ? getMediaKey(mediaId) : `legacy:${index}`;
  }

  function getSelectedItemByKey(key, index = 0) {
    const legacyItem = draftPlaylistItems[index] || null;

    if (key?.startsWith("legacy:")) {
      return legacyItem;
    }

    if (key?.startsWith("template:")) {
      const templateId = key.replace("template:", "");
      const template = templates.find((item) => item.id === templateId);

      if (!template) return legacyItem;

      return {
        ...template,
        title: template.name,
        preview: template.preview || template.previewUrl || template.thumbnailUrl || template.imageUrl || "",
        sound: false,
        playerItemType: "template",
        templateType: template.type,
        type: template.type,
        duration: Number(template.duration || 15),
      };
    }

    const mediaId = key?.startsWith("media:") ? key.replace("media:", "") : key;
    const media = mediaList.find((item) => item.id === mediaId);

    if (!media) return legacyItem;

    return {
      ...media,
      playerItemType: "media",
    };
  }

  function findPlaylistItemSource(item = {}) {
    const identifiers = [
      item.id,
      item.mediaId,
      item.templateId,
      item.sourceId,
      item.sourceMediaId,
      item.originalId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const knownPreviews = [
      item.preview,
      item.previewUrl,
      item.thumbnailUrl,
      item.remotePreview,
      item.imageUrl,
      item.url,
      item.downloadURL,
      item.fileUrl,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const normalizedTitle = String(item.title || item.name || "").trim().toLowerCase();
    const isTemplateItem = isTemplatePreviewItem(item);
    const sourceList = isTemplateItem ? templates : [...mediaList, ...templates];

    return (
      sourceList.find((candidate) => identifiers.includes(String(candidate.id || "").trim())) ||
      sourceList.find((candidate) =>
        knownPreviews.some((preview) =>
          [
            candidate.preview,
            candidate.previewUrl,
            candidate.thumbnailUrl,
            candidate.remotePreview,
            candidate.imageUrl,
            candidate.url,
            candidate.downloadURL,
            candidate.fileUrl,
          ]
            .map((value) => String(value || "").trim())
            .includes(preview)
        )
      ) ||
      sourceList.find((candidate) => {
        const candidateTitle = String(candidate.title || candidate.name || "").trim().toLowerCase();
        return normalizedTitle && candidateTitle === normalizedTitle;
      }) ||
      {}
    );
  }

  function isSelectedKey(key) {
    return form.selectedMediaIds.includes(key);
  }

  function toggleItemKey(key) {
    const selected = isSelectedKey(key);

    setForm({
      ...form,
      selectedMediaIds: selected
        ? form.selectedMediaIds.filter((id) => id !== key)
        : [...form.selectedMediaIds, key],
    });
  }

  function toggleMedia(mediaId) {
    toggleItemKey(getMediaKey(mediaId));
  }

  function toggleTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);

    if (isPremiumTemplate(template) && !canUsePremiumTemplates) {
      alert("Templates Premium disponíveis a partir do plano Business.");
      return;
    }

    toggleItemKey(getTemplateKey(templateId));
  }

  function isValidPreviewSource(value) {
    if (typeof value !== "string") return false;
    const clean = value.trim();
    if (!clean) return false;
    if (clean === "undefined" || clean === "null") return false;
    return /^(https?:|blob:|data:|capacitor:|file:)/i.test(clean);
  }

  function resolvePreviewSource(item = {}) {
    const candidates = [
      item.preview,
      item.previewUrl,
      item.thumbnailUrl,
      item.remotePreview,
      item.imageUrl,
      item.url,
      item.downloadURL,
      item.fileUrl,
      item.marketingArt?.imageUrl,
      item.marketingArt?.imagePreview,
      item.templateData?.imageUrl,
      item.logoUrl,
    ];

    return candidates.find(isValidPreviewSource) || "";
  }

  function resolveItemOrientation(item = {}, playlistOrientation = "Paisagem") {
    const marketingType = item.marketingType || item.formatType || item.format || item.type;

    if (item.templateType === "marketing_art" || item.playerItemType === "marketing_art" || item.type === "marketing_art") {
      if (marketingType === "feed") return "Quadrado";
      if (marketingType === "story" || marketingType === "reels") return "Retrato";
    }

    const aspect = String(item.aspectRatio || "").trim();
    if (aspect === "1:1") return "Quadrado";
    if (aspect === "9:16") return "Retrato";
    if (aspect === "16:9") return "Paisagem";

    const width = Number(item.width || item.videoWidth || item.naturalWidth || 0);
    const height = Number(item.height || item.videoHeight || item.naturalHeight || 0);

    if (width > 0 && height > 0) {
      const diff = Math.abs(width - height) / Math.max(width, height);
      if (diff < 0.08) return "Quadrado";
      return height > width ? "Retrato" : "Paisagem";
    }

    if (item.orientation === "Retrato" || item.orientation === "Paisagem") return item.orientation;
    if (playlistOrientation === "Retrato" || playlistOrientation === "Paisagem") return playlistOrientation;

    return "Paisagem";
  }

  function hydratePlaylistItem(item = {}, playlistOrientation = "Paisagem") {
    const isTemplateItem = isTemplatePreviewItem(item);
    const source = findPlaylistItemSource(item);
    const hydrated = {
      ...source,
      ...item,
    };
    const sourcePreview = resolvePreviewSource(source);
    const preview = resolvePreviewSource(hydrated) || sourcePreview;
    const orientation = resolveItemOrientation(hydrated, playlistOrientation);

    return {
      ...hydrated,
      preview,
      resolvedPreview: preview,
      sourcePreview,
      sourceRemotePreview: source.remotePreview || "",
      sourceImageUrl: source.imageUrl || "",
      orientation: orientation === "Quadrado" ? hydrated.orientation || "Paisagem" : orientation,
      resolvedOrientation: orientation,
      aspectRatio:
        orientation === "Quadrado"
          ? "1:1"
          : orientation === "Retrato"
            ? hydrated.aspectRatio || "9:16"
            : hydrated.aspectRatio || "16:9",
      playerItemType: item.playerItemType || (isTemplateItem ? "template" : "media"),
      templateType: isTemplateItem ? (item.templateType || source.templateType || source.type) : "",
      duration: item.duration || source.duration,
      sound: item.sound ?? source.sound,
    };
  }

  function renderPlaylistMiniPreview(item) {
    if (!item) return <Monitor size={26} />;

    return <UniversalPreview item={item} className="playlist-created-item-preview playlist-preview-frame" compact />;
  }

  function getPlaylistItemLabel(item) {
    if (!item) return "Item não encontrado";

    if (item.playerItemType === "template" || item.templateType) {
      return `${getTemplateTypeLabel(item.templateType || item.type)} • ${item.duration || 15}s`;
    }

    return `${item.type} • ${item.duration}s • ${item.sound ? "Com som" : "Sem som"}`;
  }

  function normalizePlaylistItemForSave(item = {}, playlistOrientation = "Paisagem") {
    const hydrated = hydratePlaylistItem(item, playlistOrientation);
    const isTemplateItem = hydrated.playerItemType === "template" || Boolean(hydrated.templateType);
    const source = findPlaylistItemSource(hydrated);
    const sourceId = hydrated.id || source.id || "";
    const orientation = hydrated.resolvedOrientation || getPlayableOrientation(hydrated, playlistOrientation);

    return {
      ...hydrated,
      id: sourceId || hydrated.id || `${isTemplateItem ? "template" : "media"}-${Date.now()}`,
      ...(isTemplateItem
        ? {
            templateId: hydrated.templateId || source.id || sourceId,
            sourceTemplateId: hydrated.sourceTemplateId || source.id || sourceId,
          }
        : {
            mediaId: hydrated.mediaId || source.id || sourceId,
            sourceMediaId: hydrated.sourceMediaId || source.id || sourceId,
          }),
      title: hydrated.title || hydrated.name || source.title || source.name || "Item",
      name: hydrated.name || hydrated.title || source.name || source.title || "Item",
      playerItemType: isTemplateItem ? "template" : "media",
      templateType: isTemplateItem ? (hydrated.templateType || source.templateType || source.type || hydrated.type) : "",
      type: isTemplateItem ? (hydrated.templateType || source.templateType || source.type || hydrated.type) : hydrated.type,
      orientation: orientation === "Quadrado" ? playlistOrientation || "Paisagem" : orientation,
      resolvedOrientation: orientation,
      aspectRatio:
        orientation === "Quadrado"
          ? "1:1"
          : orientation === "Retrato"
            ? hydrated.aspectRatio || "9:16"
            : hydrated.aspectRatio || "16:9",
      preview: hydrated.resolvedPreview || hydrated.preview || source.preview || source.previewUrl || source.imageUrl || "",
      duration: Number(hydrated.duration || source.duration || 15),
      sound: Boolean(hydrated.sound),
    };
  }



  function updateArrayItem(field, index, key, value) {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? [...prev[field]] : [];

      current[index] = {
        ...(current[index] || {}),
        [key]: value,
      };

      return {
        ...prev,
        [field]: current,
      };
    });
  }

  function updateTextArrayItem(field, index, value) {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? [...prev[field]] : [];

      current[index] = value;

      return {
        ...prev,
        [field]: current,
      };
    });
  }

  function addArrayItem(field, item) {
    setForm((prev) => ({
      ...prev,
      [field]: [...(Array.isArray(prev[field]) ? prev[field] : []), item],
    }));
  }

  function removeArrayItem(field, index) {
    setForm((prev) => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] : []).filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }



  function toggleTargetScreen(screenId) {
    const selected = form.targetScreenIds.includes(screenId);

    setForm({
      ...form,
      targetScreenIds: selected
        ? form.targetScreenIds.filter((id) => id !== screenId)
        : [...form.targetScreenIds, screenId],
    });
  }


  function handleDragStart(index) {
    setDraggedMediaId(index);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(targetIndex) {
    if (draggedMediaId === null || draggedMediaId === targetIndex) {
      setDraggedMediaId(null);
      return;
    }

    const updated = [...form.selectedMediaIds];
    const draggedIndex = draggedMediaId;

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMediaId(null);
      return;
    }

    const [draggedItemKey] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItemKey);

    setForm({
      ...form,
      selectedMediaIds: updated,
    });

    setDraggedMediaId(null);
  }

  function moveMedia(index, direction) {
    const newOrder = [...form.selectedMediaIds];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length) {
      return;
    }

    [newOrder[index], newOrder[targetIndex]] = [
      newOrder[targetIndex],
      newOrder[index],
    ];

    setForm({
      ...form,
      selectedMediaIds: newOrder,
    });
  }

  function removeItemFromEditingPlaylist(index) {
    const item = getSelectedItemByKey(form.selectedMediaIds[index], index);
    const itemName = item?.title || item?.name || `item ${index + 1}`;

    if (!window.confirm(`Remover "${itemName}" apenas desta playlist?`)) return;

    setForm((current) => ({
      ...current,
      selectedMediaIds: current.selectedMediaIds.filter((_, itemIndex) => itemIndex !== index),
    }));
    setDraftPlaylistItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function removeItemFromSavedPlaylist(playlist, index) {
    if (!requirePlanPermission(access, "canEditPlaylists", "editar playlists")) return;

    const items = Array.isArray(playlist.items) ? playlist.items : [];
    const item = items[index];
    const itemName = item?.title || item?.name || `item ${index + 1}`;

    if (!window.confirm(`Remover "${itemName}" apenas da playlist "${playlist.name}"?`)) return;

    try {
      const updatedItems = items.filter((_, itemIndex) => itemIndex !== index);
      const playlistRevision = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await updateDoc(doc(db, "clients", client.id, "playlists", playlist.id), {
        items: updatedItems,
        playlistRevision,
        updatedAt: serverTimestamp(),
      });

      await Promise.all(
        screens
          .filter((screen) => screen.playlistId === playlist.id)
          .map((screen) => updateDoc(doc(db, "clients", client.id, "screens", screen.id), {
            playlistRevision,
            remoteCommand: {
              id: `playlist-remove-${playlistRevision}-${screen.id}`,
              type: "refresh",
              sentAt: new Date().toISOString(),
            },
            updatedAt: serverTimestamp(),
          }))
      );

      alert("Item removido da playlist.");
    } catch (error) {
      console.log(error);
      alert("Erro ao remover item da playlist.");
    }
  }

  function resetPlaylistForm() {
    setEditingPlaylist(null);
    setDraftPlaylistItems([]);

    setForm({
      name: "",
      transition: "Fade suave",
      transitionSpeed: "Normal",
      orientation: "Paisagem",
      selectedMediaIds: [],
      scheduleEnabled: false,
      targetScreenIds: [],
      startDate: "",
      endDate: "",
      startTime: "08:00",
      endTime: "18:00",
    });
  }

  function startEditPlaylist(playlist) {
    if (!requirePlanPermission(access, "canEditPlaylists", "editar playlists")) return;

    setEditingPlaylist(playlist);
    const normalizedItems = (playlist.items || []).map((item) =>
      normalizePlaylistItemForSave(item, playlist.orientation || "Paisagem")
    );
    setDraftPlaylistItems(normalizedItems);

    setForm({
      name: playlist.name || "",
      transition: playlist.transition || "Fade suave",
      transitionSpeed: playlist.transitionSpeed || "Normal",
      orientation: playlist.orientation || "Paisagem",
      selectedMediaIds: normalizedItems.map((item, index) => getPlaylistItemKey(item, index)),
      scheduleEnabled: playlist.scheduleEnabled || false,
      targetScreenIds: playlist.targetScreenIds || [],
      startDate: playlist.startDate || "",
      endDate: playlist.endDate || "",
      startTime: playlist.startTime || "08:00",
      endTime: playlist.endTime || "18:00",
    });

    requestAnimationFrame(() => {
      playlistEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function handleSavePlaylist() {
    const permission = editingPlaylist ? "canEditPlaylists" : "canCreatePlaylists";
    const action = editingPlaylist ? "editar playlists" : "criar novas playlists";
    if (!requirePlanPermission(access, permission, action)) return;

    if (!form.name.trim()) {
      alert("Informe o nome da playlist.");
      return;
    }

    if (form.selectedMediaIds.length === 0) {
      alert("Selecione pelo menos uma mídia ou template.");
      return;
    }

    if (form.scheduleEnabled) {
      if (form.targetScreenIds.length === 0) {
        alert("Selecione pelo menos uma tela para receber esta programação.");
        return;
      }

      if (!form.startDate || !form.endDate) {
        alert("Informe a data inicial e final do agendamento.");
        return;
      }

      if (!form.startTime || !form.endTime) {
        alert("Informe o horário inicial e final do agendamento.");
        return;
      }

      if (form.endDate < form.startDate) {
        alert("A data final não pode ser menor que a data inicial.");
        return;
      }
    }

    try {
      const selectedItems = form.selectedMediaIds
        .map((key, index) => getSelectedItemByKey(key, index))
        .filter(Boolean)
        .map((item) => normalizePlaylistItemForSave(item, form.orientation));
      const incompatibleItems = selectedItems.filter((item) => !isOrientationCompatible(item, form.orientation));

      if (incompatibleItems.length > 0) {
        alert(
          `Remova ${incompatibleItems.length} item(ns) incompatível(is) com a orientação "${form.orientation}" antes de salvar a playlist.`
        );
        return;
      }

      const playlistData = {
        name: form.name,
        transition: form.transition,
        transitionSpeed: form.transitionSpeed,
        orientation: form.orientation,
        items: selectedItems,
        scheduleEnabled: form.scheduleEnabled,
        targetScreenIds: form.scheduleEnabled ? form.targetScreenIds : [],
        startDate: form.scheduleEnabled ? form.startDate : "",
        endDate: form.scheduleEnabled ? form.endDate : "",
        startTime: form.scheduleEnabled ? form.startTime : "",
        endTime: form.scheduleEnabled ? form.endTime : "",
        updatedAt: serverTimestamp(),
      };

      if (editingPlaylist) {
        const playlistRevision = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        await updateDoc(
          doc(db, "clients", client.id, "playlists", editingPlaylist.id),
          { ...playlistData, playlistRevision }
        );

        const affectedScreens = screens.filter((screen) => (
          screen.playlistId === editingPlaylist.id ||
          (form.scheduleEnabled && form.targetScreenIds.includes(screen.id)) ||
          (editingPlaylist.scheduleEnabled && editingPlaylist.targetScreenIds?.includes(screen.id))
        ));

        await Promise.all(
          affectedScreens.map((screen) => updateDoc(
            doc(db, "clients", client.id, "screens", screen.id),
            {
              playlistRevision,
              playlistTransition: form.transition,
              playlistTransitionSpeed: form.transitionSpeed,
              remoteCommand: {
                id: `playlist-refresh-${playlistRevision}-${screen.id}`,
                type: "refresh",
                sentAt: new Date().toISOString(),
              },
              updatedAt: serverTimestamp(),
            }
          ))
        );

        alert(
          affectedScreens.length > 0
            ? `Playlist atualizada e enviada para ${affectedScreens.length} tela(s)!`
            : "Playlist atualizada com sucesso!"
        );
      } else {
        await addDoc(collection(db, "clients", client.id, "playlists"), {
          ...playlistData,
          createdAt: serverTimestamp(),
        });

        alert("Playlist criada com sucesso!");
      }

      resetPlaylistForm();
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar playlist.");
    }
  }

  async function deletePlaylist(id) {
    if (!requirePlanPermission(access, "canEditPlaylists", "excluir playlists")) return;

    try {
      await deleteDoc(doc(db, "clients", client.id, "playlists", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir playlist.");
    }
  }

  const availableTemplates = templates.filter((template) =>
    canUsePremiumTemplates || !isPremiumTemplate(template)
  );
  const landscapeMedia = mediaList.filter((media) => getPreviewAspectClass(media) !== "portrait");
  const portraitMedia = mediaList.filter((media) => getPreviewAspectClass(media) === "portrait");
  const landscapeTemplates = availableTemplates.filter((template) => getPreviewAspectClass(template) !== "portrait");
  const portraitTemplates = availableTemplates.filter((template) => getPreviewAspectClass(template) === "portrait");

  function renderSelectableMediaCard(media) {
    return (
      <button
        key={media.id}
        type="button"
        className={
          isSelectedKey(getMediaKey(media.id))
            ? "select-media-card selected"
            : "select-media-card"
        }
        onClick={() => toggleMedia(media.id)}
      >
        <UniversalPreview item={media} className="playlist-preview-frame" compact />

        <strong>{media.title}</strong>

        <span>
          {media.type} • {media.duration}s • {getPreviewOrientationLabel(media)}
        </span>
      </button>
    );
  }

  function renderSelectableTemplateCard(template) {
    return (
      <button
        key={template.id}
        type="button"
        className={
          isSelectedKey(getTemplateKey(template.id))
            ? "select-media-card selected"
            : "select-media-card"
        }
        onClick={() => toggleTemplate(template.id)}
      >
        <UniversalPreview
          item={{
            ...template,
            playerItemType: "template",
            templateType: template.templateType || template.type,
          }}
          className="playlist-preview-frame"
          compact
        />

        <strong>{template.name}</strong>

        <span>
          {getTemplateTypeLabel(template.type)} • {template.duration || 15}s • {getPreviewOrientationLabel(template)}
        </span>
      </button>
    );
  }

  return (
    <>
      <section
        ref={playlistEditorRef}
        className={editingPlaylist ? "playlist-builder playlist-builder-editing" : "playlist-builder"}
      >
        <div className="panel">
          {editingPlaylist && (
            <div className="playlist-edit-mode-banner">
              <div>
                <span>Modo de edição</span>
                <strong>{editingPlaylist.name}</strong>
                <p>Altere os campos abaixo e use “Salvar alterações” para atualizar esta playlist.</p>
              </div>
              <button type="button" className="client-action" onClick={resetPlaylistForm}>
                Cancelar edição
              </button>
            </div>
          )}

          <div className="playlist-editor-header">
            <div>
              <h2>
                {editingPlaylist ? "Editar playlist" : "Criar playlist"}
              </h2>

              <p>
                Selecione as mídias, organize a sequência, defina data/horário e escolha em quais telas vai entrar.
              </p>
            </div>

            {editingPlaylist && (
              <div className="editing-badge">
                Editando
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Nome da playlist</label>

              <input
                value={form.name}
                placeholder="Ex.: Promoção Dia dos Namorados"
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Orientação</label>

              <select
                value={form.orientation}
                onChange={(e) =>
                  setForm({
                    ...form,
                    orientation: e.target.value,
                  })
                }
              >
                <option>Paisagem</option>
                <option>Retrato</option>
                <option>Paisagem + Retrato</option>
              </select>
            </div>

            <div className="form-group">
              <label>Transição</label>

              <select
                value={form.transition}
                onChange={(e) =>
                  setForm({
                    ...form,
                    transition: e.target.value,
                  })
                }
              >
                <option>Fade suave</option>
                <option>Slide lateral</option>
                <option>Zoom leve</option>
                <option>Corte seco</option>
                <option>Dissolver</option>
              </select>
            </div>

            <div className="form-group">
              <label>Velocidade da transição</label>

              <select
                value={form.transitionSpeed}
                onChange={(e) =>
                  setForm({
                    ...form,
                    transitionSpeed: e.target.value,
                  })
                }
              >
                <option>Rápida</option>
                <option>Normal</option>
                <option>Lenta</option>
                <option>Cinematográfica</option>
              </select>
            </div>
          </div>

          <div className="schedule-box">
            <div className="schedule-box-header">
              <div>
                <h3>Agendamento por data, horário e tela</h3>
                <p>
                  Quando ativado, esta playlist entra nas telas escolhidas e depois elas voltam para a playlist padrão.
                </p>
              </div>

              <button
                type="button"
                className={
                  form.scheduleEnabled
                    ? "schedule-toggle active"
                    : "schedule-toggle"
                }
                onClick={() =>
                  setForm({
                    ...form,
                    scheduleEnabled: !form.scheduleEnabled,
                  })
                }
              >
                {form.scheduleEnabled ? "Ativado" : "Desativado"}
              </button>
            </div>

            {form.scheduleEnabled && (
              <>
                <div className="target-screens-box">
                  <div className="playlist-section-title compact">
                    <div>
                      <h3>Telas que receberão a programação</h3>
                      <p>Escolha onde esta playlist agendada vai entrar.</p>
                    </div>

                    <span>
                      {form.targetScreenIds.length} tela(s)
                    </span>
                  </div>

                  <div className="target-screens-grid">
                    {screens.length === 0 ? (
                      <div className="empty-library">
                        Cadastre uma tela antes de agendar.
                      </div>
                    ) : (
                      screens.map((screen) => (
                        <button
                          key={screen.id}
                          type="button"
                          className={
                            form.targetScreenIds.includes(screen.id)
                              ? "target-screen-card selected"
                              : "target-screen-card"
                          }
                          onClick={() => toggleTargetScreen(screen.id)}
                        >
                          <Monitor size={22} />

                          <div>
                            <strong>{screen.name}</strong>
                            <span>{screen.location}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="schedule-grid extended">
                  <div className="form-group">
                    <label>Data inicial</label>

                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Data final</label>

                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Início</label>

                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Fim</label>

                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          endTime: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="schedule-preview">
                    <small>Período de exibição</small>
                    <strong>
                      {form.startDate || "--"} até {form.endDate || "--"}
                    </strong>
                    <span>
                      {form.startTime} às {form.endTime}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="playlist-section-title">
            <div>
              <h3>Biblioteca de mídias</h3>
              <p>Clique nas mídias que deseja adicionar à playlist.</p>
            </div>

            <span>
              {form.selectedMediaIds.length} item(ns) selecionado(s)
            </span>
          </div>

          <div className="media-selector grouped">
            {mediaList.length === 0 ? (
              <div className="empty-library">
                Cadastre mídias primeiro.
              </div>
            ) : (
              <>
                <div className="preview-library-group">
                  <h4>Conteúdo Paisagem</h4>
                  <div className="preview-library-grid">
                    {landscapeMedia.length > 0 ? (
                      landscapeMedia.map(renderSelectableMediaCard)
                    ) : (
                      <div className="empty-library compact">Nenhuma mídia paisagem.</div>
                    )}
                  </div>
                </div>

                <div className="preview-library-group">
                  <h4>Conteúdo Retrato</h4>
                  <div className="preview-library-grid">
                    {portraitMedia.length > 0 ? (
                      portraitMedia.map(renderSelectableMediaCard)
                    ) : (
                      <div className="empty-library compact">Nenhuma mídia retrato.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="playlist-section-title">
            <div>
              <h3>Templates da playlist</h3>
              <p>Adicione clima, notícias, avisos e campanhas no mesmo loop das mídias.</p>
            </div>

            <span>
              {form.selectedMediaIds.filter((key) => key.startsWith("template:")).length} template(s)
            </span>
          </div>

          {!canUsePremiumTemplates && templates.some(isPremiumTemplate) && (
            <div className="playlist-access-note">
              Templates Premium estão bloqueados no plano Start. Faça upgrade para adicioná-los à playlist.
            </div>
          )}

          <div className="media-selector grouped">
            {availableTemplates.length === 0 ? (
              <div className="empty-library">
                Cadastre templates simples primeiro na aba Templates.
              </div>
            ) : (
              <>
                <div className="preview-library-group">
                  <h4>Templates Paisagem</h4>
                  <div className="preview-library-grid">
                    {landscapeTemplates.length > 0 ? (
                      landscapeTemplates.map(renderSelectableTemplateCard)
                    ) : (
                      <div className="empty-library compact">Nenhum template paisagem.</div>
                    )}
                  </div>
                </div>

                <div className="preview-library-group">
                  <h4>Templates Retrato</h4>
                  <div className="preview-library-grid">
                    {portraitTemplates.length > 0 ? (
                      portraitTemplates.map(renderSelectableTemplateCard)
                    ) : (
                      <div className="empty-library compact">Nenhum template retrato.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {form.selectedMediaIds.length > 0 && (
            <div className="playlist-order-list">
              <div className="playlist-order-header">
                <div>
                  <h3>Ordem da playlist</h3>
                  <p>Use os botões para definir a sequência de exibição.</p>
                </div>

                <span>
                  {form.selectedMediaIds.length} item(ns)
                </span>
              </div>

              {form.selectedMediaIds.map((itemKey, index) => {
                const item = getSelectedItemByKey(itemKey, index);

                if (!item) return null;

                const hydratedItem = hydratePlaylistItem(item, form.orientation);
                const orientationClass =
                  hydratedItem.resolvedOrientation === "Retrato"
                    ? "portrait"
                    : hydratedItem.resolvedOrientation === "Quadrado"
                      ? "square"
                      : "landscape";

                return (
                  <div
                    key={`${itemKey}-${index}`}
                    className={
                      draggedMediaId === index
                        ? `playlist-order-item playlist-order-item-card ${orientationClass} dragging`
                        : `playlist-order-item playlist-order-item-card ${orientationClass}`
                    }
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => setDraggedMediaId(null)}
                  >
                    <div className="drag-handle">
                      <GripVertical size={18} />
                    </div>

                    <div className="playlist-order-position">
                      {index + 1}
                    </div>

                    <div className={`playlist-order-thumb playlist-order-preview ${orientationClass}`}>
                      {renderPlaylistMiniPreview(hydratedItem)}
                    </div>

                    <div className="playlist-order-info">
                      <strong>{hydratedItem.title || hydratedItem.name}</strong>

                      <span>
                        {getPlaylistItemLabel(hydratedItem)}
                      </span>

                      <small className={`playlist-created-orientation ${orientationClass}`}>
                        {hydratedItem.resolvedOrientation || "Paisagem"}
                      </small>
                    </div>

                    <div className="order-buttons">
                      <button
                        type="button"
                        className="order-remove-button"
                        onClick={() => removeItemFromEditingPlaylist(index)}
                        title="Remover apenas da playlist"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveMedia(index, "up")}
                        title="Subir item"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={index === form.selectedMediaIds.length - 1}
                        onClick={() => moveMedia(index, "down")}
                        title="Descer item"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="panel-actions">
            <button className="upload-button" onClick={handleSavePlaylist}>
              <Plus size={20} />
              {editingPlaylist ? "Salvar alterações" : "Salvar playlist"}
            </button>

            {editingPlaylist && (
              <button className="delete-button" onClick={resetPlaylistForm}>
                Cancelar edição
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="playlists-list">
        {playlists.length === 0 ? (
          <div className="empty-library">
            Nenhuma playlist criada ainda.
          </div>
        ) : (
          playlists.map((playlist) => (
            <div className={editingPlaylist?.id === playlist.id ? "playlist-card editing-playlist-card" : "playlist-card"} key={playlist.id}>
              <div className="playlist-card-header">
                <div>
                  <div className="playlist-title-row">
                    <h3>{playlist.name}</h3>

                    {editingPlaylist?.id === playlist.id && (
                      <span className="editing-now-badge">
                        Editando agora
                      </span>
                    )}
                  </div>

                  <p>
                    {playlist.orientation} • {playlist.transition} • {playlist.transitionSpeed || "Normal"} •{" "}
                    {playlist.items?.length || 0} item(ns)
                  </p>

                  {playlist.scheduleEnabled ? (
                    <div className="schedule-badge active">
                      Agendada: {playlist.startDate} até {playlist.endDate} • {playlist.startTime} às {playlist.endTime} • {playlist.targetScreenIds?.length || 0} tela(s)
                    </div>
                  ) : (
                    <div className="schedule-badge">
                      Playlist padrão/manual
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  <button
                    className={editingPlaylist?.id === playlist.id ? "upload-button editing-button-active" : "upload-button"}
                    onClick={() => startEditPlaylist(playlist)}
                  >
                    {editingPlaylist?.id === playlist.id ? "Em edição" : "Editar"}
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => deletePlaylist(playlist.id)}
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>

              <div className="playlist-items">
                {playlist.items?.map((item, index) => {
                  const hydratedItem = hydratePlaylistItem(item, playlist.orientation);
                  const orientationClass =
                    hydratedItem.resolvedOrientation === "Retrato"
                      ? "portrait"
                      : hydratedItem.resolvedOrientation === "Quadrado"
                        ? "square"
                        : "landscape";

                  return (
                  <div className={`playlist-item playlist-created-item ${orientationClass}`} key={`${playlist.id}-${index}`}>
                    <div className="playlist-number">
                      {index + 1}
                    </div>

                    <div className={`playlist-thumb playlist-created-item-frame ${orientationClass}`}>
                      {renderPlaylistMiniPreview(hydratedItem)}
                    </div>

                    <div className="playlist-item-info playlist-created-item-info">
                      <strong>{hydratedItem.title || hydratedItem.name}</strong>

                      <span>
                        {getPlaylistItemLabel(hydratedItem)}
                      </span>

                      <small className={`playlist-created-orientation ${orientationClass}`}>
                        {hydratedItem.resolvedOrientation || "Paisagem"}
                      </small>
                    </div>

                    <div className="playlist-item-actions">
                      {isTemplatePreviewItem(hydratedItem) ? (
                        <Newspaper size={18} />
                      ) : hydratedItem.sound ? (
                        <Volume2 size={18} />
                      ) : (
                        <VolumeX size={18} />
                      )}

                      <button
                        type="button"
                        className="playlist-item-remove"
                        onClick={() => removeItemFromSavedPlaylist(playlist, index)}
                        title="Remover apenas desta playlist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}




function ClientScreensPage({ client, access = getClientPlanAccess(client) }) {
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [editingScreen, setEditingScreen] = useState(null);
  const screenEditorRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    location: "",
    orientation: "Paisagem",
    playlistId: "",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    screens.forEach((screen) => {
      if (screen.code) {
        syncTvCode(screen.id, screen.code, screen.name);
      }
    });
  }, [screens]);

  useEffect(() => {
    const unsubScreens = onSnapshot(
      collection(db, "clients", client.id, "screens"),
      (snapshot) => {
        setScreens(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    const unsubPlaylists = onSnapshot(
      collection(db, "clients", client.id, "playlists"),
      (snapshot) => {
        setPlaylists(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    return () => {
      unsubScreens();
      unsubPlaylists();
    };
  }, [client.id]);

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  async function syncTvCode(screenId, code, screenName) {
    if (!code) return;

    try {
      await setDoc(
        doc(db, "tv_codes", code),
        {
          code,
          clientId: client.id,
          screenId,
          screenName: screenName || "",
          clientName: client.name || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.log("Erro ao sincronizar código da TV:", error);
    }
  }

  function getLastSeenDate(screen) {
    return getScreenLastSeenDate(screen);
  }

  function isScreenOnline(screen) {
    return getScreenConnectionStatus(screen, now).isOnline;
  }

  function getLastSeenLabel(screen) {
    const lastSeenDate = getLastSeenDate(screen);

    if (!lastSeenDate) {
      return "Ainda não conectou";
    }

    const diffInSeconds = Math.floor(
      (now - lastSeenDate.getTime()) / 1000
    );

    if (diffInSeconds < 10) {
      return "Agora mesmo";
    }

    if (diffInSeconds < 60) {
      return `Há ${diffInSeconds}s`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);

    if (diffInMinutes < 60) {
      return `Há ${diffInMinutes}min`;
    }

    return lastSeenDate.toLocaleString("pt-BR");
  }

  function timeToMinutes(time) {
    if (!time) return 0;

    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
  }

  function getTodayValue() {
    const date = new Date(now);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function isPlaylistInSchedule(playlist, screenId) {
    if (!playlist?.scheduleEnabled) return false;

    if (
      playlist.targetScreenIds &&
      playlist.targetScreenIds.length > 0 &&
      !playlist.targetScreenIds.includes(screenId)
    ) {
      return false;
    }

    const today = getTodayValue();

    if (playlist.startDate && today < playlist.startDate) return false;
    if (playlist.endDate && today > playlist.endDate) return false;

    const date = new Date(now);
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = timeToMinutes(playlist.startTime);
    const endMinutes = timeToMinutes(playlist.endTime);

    if (startMinutes === endMinutes) return true;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  function getActivePlaylist(screen) {
    const scheduled = playlists
      .filter((playlist) => isPlaylistInSchedule(playlist, screen.id))
      .sort((a, b) => {
        const aDate = `${a.startDate || ""} ${a.startTime || ""}`;
        const bDate = `${b.startDate || ""} ${b.startTime || ""}`;

        return bDate.localeCompare(aDate);
      });

    if (scheduled.length > 0) {
      return {
        playlist: scheduled[0],
        mode: "scheduled",
      };
    }

    return {
      playlist: playlists.find((playlist) => playlist.id === screen.playlistId),
      mode: "default",
    };
  }

  function resetScreenForm() {
    setEditingScreen(null);

    setForm({
      name: "",
      location: "",
      orientation: "Paisagem",
      playlistId: "",
    });
  }

  function startEditScreen(screen) {
    if (!requirePlanPermission(access, "canEditScreens", "editar telas")) return;

    setEditingScreen(screen);

    setForm({
      name: screen.name || "",
      location: screen.location || "",
      orientation: screen.orientation || "Paisagem",
      playlistId: screen.playlistId || "",
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screenEditorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }

  async function handleSaveScreen() {
    const permission = editingScreen ? "canEditScreens" : "canCreateScreens";
    const action = editingScreen ? "editar telas" : "criar novas telas";
    if (!requirePlanPermission(access, permission, action)) return;

    if (!form.name.trim()) {
      alert("Informe o nome da tela.");
      return;
    }

    if (!editingScreen && screens.length >= getClientScreenLimit(client)) {
      alert("Limite de telas atingido para este plano. Faça upgrade para adicionar novas telas.");
      return;
    }

    const selectedPlaylist = playlists.find((playlist) => playlist.id === form.playlistId);

    try {
      const screenData = {
        name: form.name,
        location: form.location || "Não informado",
        orientation: form.orientation,
        playlistId: selectedPlaylist?.id || "",
        playlistName: selectedPlaylist?.name || "Nenhuma playlist vinculada",
      };

      if (editingScreen) {
        await updateDoc(
          doc(db, "clients", client.id, "screens", editingScreen.id),
          {
            ...screenData,
            updatedAt: serverTimestamp(),
          }
        );

        await syncTvCode(editingScreen.id, editingScreen.code, form.name);

        alert("Tela atualizada com sucesso!");
      } else {
        const code = generateCode();

        const screenRef = await addDoc(collection(db, "clients", client.id, "screens"), {
          ...screenData,
          code,
          status: "offline",
          lastConnection: "Ainda não conectou",
          lastSeenAt: null,
          createdAt: serverTimestamp(),
        });

        await syncTvCode(screenRef.id, code, form.name);

        alert("Tela cadastrada com sucesso!");
      }

      resetScreenForm();
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar tela.");
    }
  }

  async function deleteScreen(id) {
    if (!requirePlanPermission(access, "canEditScreens", "excluir telas")) return;

    const screenToDelete = screens.find((screen) => screen.id === id);
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a tela "${screenToDelete?.name || "sem nome"}"?\n\nEsta ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "clients", client.id, "screens", id));

      if (screenToDelete?.code) {
        await deleteDoc(doc(db, "tv_codes", screenToDelete.code));
      }
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir tela.");
    }
  }


  async function sendRemoteCommand(screenId, command) {
    if (!requirePlanPermission(access, "canEditScreens", "controlar telas")) return;

    try {
      const commandId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const payload = {
        remoteCommand: {
          id: commandId,
          ...command,
          sentAt: new Date().toISOString(),
        },
        lastCommandSent: command.type,
        lastCommandSentAt: serverTimestamp(),
        commandStatus: "sent",
      };

      if (command.type === "exitTv") {
        payload.connectedDeviceId = deleteField();
        payload.activeDeviceId = deleteField();
        payload.status = "offline";
        payload.lastSeenAt = null;
      }

      if (command.type === "maintenance") {
        payload.lastCommandExecuted = "maintenance";
      }

      if (command.type === "clear") {
        payload.lastCommandExecuted = "clear";
      }

      await updateDoc(doc(db, "clients", client.id, "screens", screenId), payload);
    } catch (error) {
      console.log(error);
      alert("Erro ao enviar comando para a TV.");
    }
  }

  function sendOverlayCommand(screenId) {
    const message = window.prompt("Digite a mensagem do overlay:");

    if (!message) return;

    sendRemoteCommand(screenId, {
      type: "overlay",
      title: "Aviso",
      message,
      duration: 10,
    });
  }

  function sendTakeoverCommand(screenId) {
    const title = window.prompt("Título do alerta:", "ATENÇÃO");

    if (!title) return;

    const message = window.prompt("Mensagem do alerta:");

    if (!message) return;

    sendRemoteCommand(screenId, {
      type: "takeover",
      title,
      message,
      duration: 20,
    });
  }


  return (
    <>
      <section className="panel screen-editor-panel" ref={screenEditorRef}>
        <div className="playlist-editor-header">
          <div>
            <h2>{editingScreen ? "Editar tela" : "Nova tela"}</h2>
            <p className="stat-status">
              Uso atual: {screens.length}/{getClientScreenLimit(client)} telas
            </p>
          </div>

          {editingScreen && (
            <div className="editing-badge">
              Editando
            </div>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Nome da tela</label>
            <input
              placeholder="Ex: TV Recepção"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Local de instalação</label>
            <input
              placeholder="Ex: Entrada principal"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Orientação</label>
            <select
              value={form.orientation}
              onChange={(e) => setForm({ ...form, orientation: e.target.value })}
            >
              <option>Paisagem</option>
              <option>Retrato</option>
            </select>
          </div>

          <div className="form-group">
            <label>Playlist padrão da tela</label>
            <select
              value={form.playlistId}
              onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
            >
              <option value="">Nenhuma playlist</option>
              {playlists
                .filter((playlist) => !playlist.scheduleEnabled)
                .map((playlist) => (
                  <option value={playlist.id} key={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="screen-schedule-note">
          <strong>Como funciona:</strong> a playlist padrão roda normalmente. Quando uma playlist agendada entrar no período configurado, ela assume temporariamente a TV. Ao terminar, a TV volta para a playlist padrão desta tela. Para conectar uma TV, abra {PUBLIC_WEB_URL}/tv e digite apenas o código da tela.
        </div>

        <div className="panel-actions">
          <button className="upload-button" onClick={handleSaveScreen}>
            <Plus size={20} />
            {editingScreen ? "Salvar alterações" : "Cadastrar tela"}
          </button>

          {editingScreen && (
            <button className="delete-button" onClick={resetScreenForm}>
              Cancelar edição
            </button>
          )}
        </div>
      </section>

      <section className="cards-grid">
        {screens.length === 0 ? (
          <div className="empty-library">Nenhuma tela cadastrada ainda.</div>
        ) : (
          screens.map((screen) => {
            const connection = getScreenConnectionStatus(screen, now);
            const deviceLocation = getScreenDisplayLocation(screen);
            const online = connection.isOnline;
            const active = getActivePlaylist(screen);
            const activePlaylist = active.playlist;
            const currentIndex = getPlaylistPreviewIndex(activePlaylist, now, screen);
            const reportedIndex = Math.max(0, Number(screen.nowPlayingIndex || 1) - 1);
            const activeItem = activePlaylist?.items?.[currentIndex] || activePlaylist?.items?.[0];
            const canUseLivePreview = screen.nowPlayingPreview && reportedIndex === currentIndex;
            const previewMedia = canUseLivePreview
              ? {
                  ...activeItem,
                  preview: screen.nowPlayingPreview,
                  title: screen.nowPlayingTitle || activeItem?.title || activeItem?.name || "Mídia atual",
                  type: screen.nowPlayingType || activeItem?.type || "Imagem",
                  orientation: screen.nowPlayingOrientation || activeItem?.orientation || "Paisagem",
                  aspectRatio: screen.nowPlayingAspectRatio || activeItem?.aspectRatio || "",
                  width: screen.nowPlayingWidth || activeItem?.width || null,
                  height: screen.nowPlayingHeight || activeItem?.height || null,
                  templateType: screen.nowPlayingTemplateType || activeItem?.templateType || "",
                  playerItemType: screen.nowPlayingItemType || activeItem?.playerItemType || "",
                }
              : activeItem;
            const previewIndexLabel = activePlaylist?.items?.length ? currentIndex + 1 : screen.nowPlayingIndex;

            return (
              <div className="media-card" key={screen.id}>
                <div className="media-preview screen-preview">
                  <UniversalPreview
                    key={`${screen.id}-${screen.nowPlayingPreview || previewMedia?.preview || "empty"}-${screen.nowPlayingIndex || 0}`}
                    item={previewMedia}
                    className="screen-universal-preview"
                    compact
                    autoPlay
                    fallbackIcon={<Monitor size={54} />}
                  />

                  <div className={online ? "live-dot online" : "live-dot offline"}></div>
                </div>

                <div className="media-info">
                  <div className="screen-card-top">
                    <span>{screen.orientation}</span>

                    <div className={`screen-status ${connection.className}`}>
                      <div></div>
                      {connection.label}
                    </div>
                  </div>

                  <h3>{screen.name}</h3>
                  <p>Local: {screen.location}</p>
                  <p>Playlist padrão: {screen.playlistName}</p>

                  <div className={screen.currentPlaylistMode === "scheduled" || active.mode === "scheduled" ? "active-program scheduled" : "active-program"}>
                    <small>Exibindo agora</small>
                    <strong>{screen.currentPlaylistName || activePlaylist?.name || "Nenhuma playlist ativa"}</strong>
                    <span>
                      {screen.currentPlaylistMode === "scheduled" || active.mode === "scheduled"
                        ? "Programação agendada"
                        : "Playlist padrão"}
                    </span>

                    <div className="screen-now-playing">
                      <small>Mídia atual</small>
                      <strong>{previewMedia?.title || previewMedia?.name || screen.nowPlayingTitle || "Aguardando mídia"}</strong>
                      <span>
                        {previewIndexLabel && (screen.nowPlayingTotal || activePlaylist?.items?.length)
                          ? `${previewIndexLabel}/${screen.nowPlayingTotal || activePlaylist?.items?.length}`
                          : "Sem progresso"} • {previewMedia?.type || screen.nowPlayingType || "Mídia"}
                      </span>
                    </div>

                    <div className="screen-cache-box">
                      <small>Cache</small>
                      <strong>{getCacheStatusLabel(screen)}</strong>
                      <span>
                        {getMediaSourceLabel(screen.currentMediaSource)} • {formatStorageSize(screen.cacheSizeBytes || 0)} estimado
                      </span>
                      {getCacheSyncLabel(screen) && <span>{getCacheSyncLabel(screen)}</span>}
                      <span>Atualizado: {formatFirestoreDate(screen.cacheUpdatedAt)}</span>
                    </div>
                  </div>

                  <div className="screen-code-box">
                    <small>Código para conectar em {PUBLIC_WEB_URL}/tv</small>
                    <strong>{screen.code}</strong>
                  </div>

                  <p>
                    Player direto:
                    <br />
                    <strong>{PUBLIC_WEB_URL}/player/{client.id}/{screen.code}</strong>
                  </p>

                  <div className="last-seen-card">
                    <small>Último sinal</small>
                    <strong>{getLastSeenLabel(screen)}</strong>
                  </div>

                  <div className="screen-connection-box">
                    <small>Status de login</small>
                    <strong>{connection.label}</strong>
                    <span>Dispositivo: {connection.deviceLabel}</span>
                    <span>Logado em: {connection.lastConnection}</span>
                    <span>Último sinal real: {formatScreenConnectionDate(connection.lastSeenDate)}</span>
                    <span>Local: {deviceLocation.city}</span>
                    <span>{deviceLocation.detail}</span>
                    <span>Local atualizado: {formatScreenConnectionDate(deviceLocation.updatedAt)}</span>
                  </div>

                  <div className="remote-control-panel-inline">
                    <div className="remote-control-heading">
                      <div className="remote-control-title">
                        <Monitor size={16} />
                        Controle remoto
                      </div>
                      <span className="remote-live-label">Tempo real</span>
                    </div>

                    <div className="remote-control-grid-inline">
                      <button
                        className="remote-mini-button info"
                        onClick={() => sendRemoteCommand(screen.id, { type: "refresh" })}
                      >
                        <RefreshCw size={16} />
                        <span>Atualizar</span>
                      </button>

                      <button
                        className="remote-mini-button"
                        onClick={() => sendRemoteCommand(screen.id, { type: "pause" })}
                      >
                        <Pause size={16} />
                        <span>Pausar</span>
                      </button>

                      <button
                        className="remote-mini-button play"
                        onClick={() => sendRemoteCommand(screen.id, { type: "play" })}
                      >
                        <Play size={16} />
                        <span>Play</span>
                      </button>

                      <button
                        className="remote-mini-button warning"
                        onClick={() => sendOverlayCommand(screen.id)}
                      >
                        <MessageSquare size={16} />
                        <span>Overlay</span>
                      </button>

                      <button
                        className="remote-mini-button danger"
                        onClick={() => sendTakeoverCommand(screen.id)}
                      >
                        <TriangleAlert size={16} />
                        <span>Takeover</span>
                      </button>

                      <button
                        className="remote-mini-button maintenance"
                        onClick={() =>
                          sendRemoteCommand(
                            screen.id,
                            {
                              type:
                                screen.lastCommandExecuted === "maintenance"
                                  ? "clear"
                                  : "maintenance",
                            }
                          )
                        }
                      >
                        <Wrench size={16} />
                        <span>
                          {screen.lastCommandExecuted === "maintenance"
                            ? "Sair manutenção"
                            : "Manutenção"}
                        </span>
                      </button>

                      <button
                        className="remote-mini-button blackout"
                        onClick={() => sendRemoteCommand(screen.id, { type: "blackout" })}
                      >
                        <MonitorOff size={16} />
                        <span>Tela preta</span>
                      </button>

                      <button
                        className="remote-mini-button success"
                        onClick={() => sendRemoteCommand(screen.id, { type: "clear" })}
                      >
                        <Eraser size={16} />
                        <span>Limpar</span>
                      </button>

                      <button
                        className="remote-mini-button info"
                        onClick={() => sendRemoteCommand(screen.id, { type: "clearCache" })}
                      >
                        <RefreshCw size={16} />
                        <span>Limpar cache</span>
                      </button>

                      <button
                        className="remote-mini-button danger"
                        onClick={() => sendRemoteCommand(screen.id, { type: "reload" })}
                      >
                        <RotateCcw size={16} />
                        <span>Reiniciar</span>
                      </button>

                      <button
                        className="remote-mini-button exit-tv"
                        onClick={() => {
                          const confirmExit = window.confirm(
                            "Deseja tirar esta tela do modo TV e voltar para a escolha de modo?"
                          );

                          if (!confirmExit) return;

                          sendRemoteCommand(screen.id, { type: "exitTv" });
                        }}
                      >
                        <LogOut size={16} />
                        <span>Sair da TV</span>
                      </button>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="upload-button"
                      onClick={() => startEditScreen(screen)}
                    >
                      Editar tela
                    </button>

                    <button className="delete-button" onClick={() => deleteScreen(screen.id)}>
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}



const MARKETING_TYPE_LABELS = {
  feed: "Feed Instagram",
  story: "Stories",
  reels: "Capa Reels",
};

const MARKETING_VISIBILITY_OPTIONS = [
  ["showFormatLabel", "Formato"],
  ["showImage", "Imagem"],
  ["showLogo", "Logo"],
  ["showAccent", "Destaque"],
  ["showTitle", "Título"],
  ["showSubtitle", "Subtítulo"],
  ["showCta", "Botão CTA"],
  ["showQr", "QR Code"],
  ["showWhatsapp", "WhatsApp"],
  ["showLocation", "Localização"],
];

function getMarketingVisibility(values) {
  return Object.fromEntries(
    MARKETING_VISIBILITY_OPTIONS.map(([field]) => [field, values[field] !== false])
  );
}

function getMarketingFormatSize(type) {
  if (type === "feed") return "1080x1080";
  return "1080x1920";
}

function getMarketingFormatRatio(type) {
  if (type === "feed") {
    return {
      width: 1080,
      height: 1080,
      aspectRatio: "1 / 1",
    };
  }

  return {
    width: 1080,
    height: 1920,
    aspectRatio: "9 / 16",
  };
}

function getMarketingDefaultForm() {
  return {
    type: "feed",
    title: "Seu título",
    subtitle: "Seu subtítulo",
    cta: "Chamada para ação",
    whatsapp: "",
    location: "",
    qrText: "",
    primaryColor: "#06b6d4",
    secondaryColor: "#9333ea",
    accentColor: "#22d3ee",
    textColor: "#ffffff",
    imageFile: null,
    imagePreview: "",
    imageUrl: "",
    logoFile: null,
    logoPreview: "",
    logoUrl: "",
    showFormatLabel: true,
    showImage: true,
    showLogo: true,
    showAccent: true,
    showTitle: true,
    showSubtitle: true,
    showCta: true,
    showQr: true,
    showWhatsapp: true,
    showLocation: true,
  };
}

function buildQrUrl(value) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "";

  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(cleanValue)}`;
}

const OFFLINE_ASSET_FIELDS = new Set(["preview", "imageUrl", "logoUrl"]);

function collectOfflineAssetUrls(values) {
  const urls = new Set();
  const visited = new WeakSet();

  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    Object.entries(value).forEach(([key, fieldValue]) => {
      if (
        OFFLINE_ASSET_FIELDS.has(key) &&
        typeof fieldValue === "string" &&
        /^https?:\/\//i.test(fieldValue)
      ) {
        urls.add(fieldValue);
      }

      if (fieldValue && typeof fieldValue === "object") visit(fieldValue);
    });

    const qrUrl = buildQrUrl(value.qrText || value.whatsapp || "");
    if (qrUrl) urls.add(qrUrl);
  }

  visit(values);
  return [...urls].sort();
}

function applyOfflineAssetUrls(item, urlMap) {
  if (!item) return item;

  const localized = { ...item };

  OFFLINE_ASSET_FIELDS.forEach((field) => {
    if (localized[field] && urlMap[localized[field]]) {
      if (field === "preview") localized.remotePreview = localized[field];
      localized[field] = urlMap[localized[field]];
    }
  });

  const qrUrl = buildQrUrl(localized.qrText || localized.whatsapp || "");
  if (qrUrl && urlMap[qrUrl]) localized.qrImageUrl = urlMap[qrUrl];

  return localized;
}

function readMarketingFile(file, setter, fieldFile, fieldPreview) {
  if (!file) return;

  const preview = URL.createObjectURL(file);

  setter((prev) => ({
    ...prev,
    [fieldFile]: file,
    [fieldPreview]: preview,
  }));
}

async function uploadMarketingAsset(clientId, file, folder) {
  if (!file) return "";

  const safeName = sanitizeStorageFileName(file.name || "marketing-asset");
  const uploadResult = await uploadStorageAsset({
    path: `clients/${clientId}/marketing/${folder}/${Date.now()}_${safeName}`,
    file,
    contentType: getUploadContentType(file),
    customMetadata: {
      source: "marketing",
      clientId,
      folder,
    },
  });

  return uploadResult.publicUrl || uploadResult.url || "";
}

async function uploadClientLogo(clientId, file) {
  if (!file) return "";

  const uploadResult = await uploadStorageAsset({
    path: `clients/${clientId}/profile/logo`,
    file,
    contentType: getUploadContentType(file),
    customMetadata: {
      source: "client-logo",
      clientId,
    },
  });

  return uploadResult.publicUrl || uploadResult.url || "";
}

async function uploadTemplateImageAsset(clientId, templateId, file, folder = "background") {
  if (!file) return "";
  if (!file.type?.startsWith("image/")) {
    throw new Error("Apenas imagens podem ser usadas neste upload.");
  }

  const safeName = sanitizeStorageFileName(file.name || "template-image");
  const targetId = templateId || `draft_${Date.now()}`;
  const uploadResult = await uploadStorageAsset({
    path: `clients/${clientId}/templates/${targetId}/${folder}/${Date.now()}_${safeName}`,
    file,
    contentType: getUploadContentType(file),
    customMetadata: {
      source: "template",
      clientId,
      folder,
    },
  });

  return uploadResult.publicUrl || uploadResult.url || "";
}

function MarketingArtPreview({ art, compact = false, tv = false }) {
  const marketingType = art.marketingType || art.formatType || art.type;
  const ratio = getMarketingFormatRatio(marketingType);
  const isFeed = marketingType === "feed";
  const imageSrc = art.imagePreview || art.imageUrl || "";
  const logoSrc = art.logoPreview || art.logoUrl || "";
  const qrValue = art.qrText || art.whatsapp || "";
  const qrUrl = art.qrImageUrl || buildQrUrl(qrValue);
  const isVisible = (field) => art[field] !== false;
  const showTopRow = isVisible("showFormatLabel") || isVisible("showLogo");
  const showActions = isVisible("showCta") || (isVisible("showQr") && qrUrl);
  const showContacts = !compact && (
    (isVisible("showWhatsapp") && art.whatsapp) ||
    (isVisible("showLocation") && art.location)
  );
  const titleSize = compact ? (isFeed ? 22 : 18) : isFeed ? 54 : 48;

  const outerStyle = {
    width: tv && isFeed ? "min(100vw, 100vh)" : tv ? "100%" : compact ? (isFeed ? 210 : 160) : (isFeed ? "min(520px, 100%)" : "min(360px, 100%)"),
    height: tv && isFeed ? "min(100vw, 100vh)" : tv ? "100%" : "auto",
    aspectRatio: tv && isFeed ? "1 / 1" : tv ? "auto" : ratio.aspectRatio,
    borderRadius: tv ? 0 : compact ? 22 : 34,
    overflow: "hidden",
    position: tv && isFeed ? "absolute" : "relative",
    left: tv && isFeed ? "50%" : undefined,
    top: tv && isFeed ? "50%" : undefined,
    transform: tv && isFeed ? "translate(-50%, -50%)" : undefined,
    color: art.textColor || "#ffffff",
    background: `radial-gradient(circle at 20% 15%, ${art.primaryColor || "#06b6d4"}66, transparent 34%), radial-gradient(circle at 90% 80%, ${art.secondaryColor || "#9333ea"}66, transparent 34%), linear-gradient(145deg, #020617 0%, #0f172a 46%, #111827 100%)`,
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: compact ? "none" : "0 28px 80px rgba(0,0,0,0.42)",
  };

  return (
    <div className={`marketing-art-preview format-${marketingType} ${compact ? "is-compact" : ""} ${tv ? "is-tv" : ""}`} style={outerStyle}>
      {isVisible("showImage") && (imageSrc ? (
        <img
          src={imageSrc}
          alt={art.title || "Imagem da arte"}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: isFeed ? 0.76 : 0.82 }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.16)" }}>
          <Image size={compact ? 54 : 110} />
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isFeed
            ? "linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.88) 66%, rgba(2,6,23,0.98))"
            : "linear-gradient(180deg, rgba(2,6,23,0.20), rgba(2,6,23,0.48) 48%, rgba(2,6,23,0.94))",
          zIndex: 2,
        }}
      />

      {showTopRow && (
        <div style={{ position: "absolute", top: compact ? 14 : 22, left: compact ? 14 : 22, right: compact ? 14 : 22, zIndex: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {isVisible("showFormatLabel") ? (
            <div style={{ padding: compact ? "6px 10px" : "8px 14px", borderRadius: 999, background: "rgba(15,23,42,0.72)", border: "1px solid rgba(255,255,255,0.16)", fontSize: compact ? 9 : 12, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {MARKETING_TYPE_LABELS[marketingType] || "Marketing"}
            </div>
          ) : <div />}

          {isVisible("showLogo") && (logoSrc ? (
            <img src={logoSrc} alt="Logo" style={{ width: compact ? 34 : 54, height: compact ? 34 : 54, objectFit: "contain", borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 6 }} />
          ) : (
            <div style={{ width: compact ? 34 : 54, height: compact ? 34 : 54, borderRadius: 14, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", display: "grid", placeItems: "center", fontWeight: 1000, color: art.accentColor || "#22d3ee" }}>
              TP
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: isFeed ? "flex-end" : "space-between", padding: compact ? 16 : isFeed ? 34 : 30, zIndex: 3 }}>
        {!isFeed && <div />}
        <div>
          {isVisible("showAccent") && <div style={{ width: compact ? 42 : 74, height: compact ? 5 : 8, borderRadius: 99, background: art.accentColor || "#22d3ee", marginBottom: compact ? 10 : 18 }} />}

          {isVisible("showTitle") && (
            <h1 style={{ margin: 0, fontSize: titleSize, lineHeight: 0.9, textTransform: marketingType === "reels" ? "uppercase" : "none", letterSpacing: marketingType === "reels" ? "-0.05em" : "-0.035em", maxWidth: isFeed ? "92%" : "100%" }}>
              {art.title || "Seu título"}
            </h1>
          )}

          {isVisible("showSubtitle") && (
            <p style={{ margin: compact ? "8px 0 0" : "14px 0 0", color: "rgba(255,255,255,0.82)", fontSize: compact ? 12 : isFeed ? 20 : 18, lineHeight: 1.25, maxWidth: isFeed ? "86%" : "100%" }}>
              {art.subtitle || "Seu subtítulo"}
            </p>
          )}

          {showActions && (
            <div style={{ marginTop: compact ? 12 : 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              {isVisible("showCta") && (
                <div style={{ display: "inline-flex", alignItems: "center", padding: compact ? "8px 10px" : "12px 18px", borderRadius: 999, background: `linear-gradient(135deg, ${art.primaryColor || "#06b6d4"}, ${art.secondaryColor || "#9333ea"})`, color: "#ffffff", fontWeight: 1000, fontSize: compact ? 10 : 16, boxShadow: "0 14px 36px rgba(0,0,0,0.28)" }}>
                  {art.cta || "Chamada para ação"}
                </div>
              )}

              {isVisible("showQr") && qrUrl && (
                <div style={{ width: compact ? 42 : isFeed ? 82 : 78, height: compact ? 42 : isFeed ? 82 : 78, minWidth: compact ? 42 : isFeed ? 82 : 78, borderRadius: compact ? 9 : 16, background: "#ffffff", padding: compact ? 4 : 8, display: "grid", placeItems: "center" }}>
                  <img src={qrUrl} alt="QR Code" style={{ width: "100%", height: "100%" }} />
                </div>
              )}
            </div>
          )}

          {showContacts && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10, color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: 800 }}>
              {isVisible("showWhatsapp") && art.whatsapp && <span>WhatsApp: {art.whatsapp}</span>}
              {isVisible("showLocation") && art.location && <span>{art.location}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientMarketingPage({ client, access = getClientPlanAccess(client) }) {
  const [arts, setArts] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sendingArtId, setSendingArtId] = useState("");
  const [editingArt, setEditingArt] = useState(null);
  const [form, setForm] = useState(() => ({
    ...getMarketingDefaultForm(),
    logoUrl: client.logoUrl || "",
    logoPreview: client.logoUrl || "",
  }));

  useEffect(() => {
    const unsubscribeMarketing = onSnapshot(
      collection(db, "clients", client.id, "marketing"),
      (snapshot) => {
        setArts(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      }
    );
    const unsubscribePlaylists = onSnapshot(
      collection(db, "clients", client.id, "playlists"),
      (snapshot) => {
        setPlaylists(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      }
    );

    return () => {
      unsubscribeMarketing();
      unsubscribePlaylists();
    };
  }, [client.id]);

  function changeMarketingType(type) {
    setForm((prev) => ({
      ...prev,
      type,
      title:
        type === "feed"
          ? "Promoção Especial"
          : type === "story"
            ? "Confira agora"
            : "Título do Reels",
      subtitle:
        type === "feed"
          ? "Uma arte pronta para divulgar sua marca"
          : type === "story"
            ? "Chame seu público para interagir"
            : "Capa chamativa para seu vídeo",
      cta:
        type === "feed"
          ? "Saiba mais"
          : type === "story"
            ? "Arraste para saber mais"
            : "Assista agora",
    }));
  }

  function resetMarketingForm() {
    setEditingArt(null);
    setForm({
      ...getMarketingDefaultForm(),
      logoUrl: client.logoUrl || "",
      logoPreview: client.logoUrl || "",
    });
  }

  async function handleSaveMarketingArt() {
    const permission = editingArt ? "canEditMarketing" : "canCreateMarketing";
    const action = editingArt ? "editar artes" : "criar novas artes";
    if (!requirePlanPermission(access, permission, action)) return;

    if (!form.title.trim()) {
      alert("Informe o título da arte.");
      return;
    }

    try {
      setSaving(true);

      const imageUrl = form.imageFile
        ? await uploadMarketingAsset(client.id, form.imageFile, "images")
        : form.imageUrl || "";

      const logoUrl = form.logoFile
        ? await uploadMarketingAsset(client.id, form.logoFile, "logos")
        : form.logoUrl || client.logoUrl || "";

      const payload = {
        ...getMarketingVisibility(form),
        type: form.type,
        title: String(form.title || "").trim(),
        subtitle: String(form.subtitle || "").trim(),
        cta: String(form.cta || "").trim(),
        whatsapp: String(form.whatsapp || "").trim(),
        location: String(form.location || "").trim(),
        qrText: String(form.qrText || "").trim(),
        imageUrl,
        logoUrl,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
        textColor: form.textColor,
        width: getMarketingFormatRatio(form.type).width,
        height: getMarketingFormatRatio(form.type).height,
        formatLabel: getMarketingFormatSize(form.type),
        updatedAt: serverTimestamp(),
      };

      if (editingArt) {
        await updateDoc(doc(db, "clients", client.id, "marketing", editingArt.id), payload);
      } else {
        await addDoc(collection(db, "clients", client.id, "marketing"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetMarketingForm();
      alert(editingArt ? "Arte atualizada com sucesso!" : "Arte de marketing salva com sucesso!");
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar arte de marketing.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMarketingArt(id) {
    if (!requirePlanPermission(access, "canEditMarketing", "excluir artes")) return;

    try {
      await deleteDoc(doc(db, "clients", client.id, "marketing", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir arte.");
    }
  }

  async function duplicateMarketingArt(art) {
    if (!requirePlanPermission(access, "canCreateMarketing", "duplicar artes")) return;

    try {
      const { id, createdAt, updatedAt, ...payload } = art;

      await addDoc(collection(db, "clients", client.id, "marketing"), {
        ...payload,
        title: `${art.title || "Arte"} - cópia`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.log(error);
      alert("Erro ao duplicar arte.");
    }
  }

  async function sendMarketingArtToPlaylist(art) {
    if (!requirePlanPermission(access, "canEditMarketing", "enviar artes para a playlist")) return;

    try {
      setSendingArtId(art.id);

      const primaryColor = art.primaryColor || "#06b6d4";
      const secondaryColor = art.secondaryColor || "#9333ea";
      const accentColor = art.accentColor || "#22d3ee";
      const textColor = art.textColor || "#ffffff";
      const marketingType = art.marketingType || art.formatType || art.type || "feed";

      const templatePayload = {
        ...getMarketingVisibility(art),
        type: "marketing_art",
        templateType: "marketing_art",
        marketingType,
        formatType: marketingType,
        format: marketingType,
        aspectRatio: marketingType === "feed" ? "1:1" : "9:16",
        width: marketingType === "feed" ? 1080 : 1080,
        height: marketingType === "feed" ? 1080 : 1920,
        sourceMarketingId: art.id,
        name: String(art.title || "Arte de Marketing").trim(),
        title: String(art.title || "").trim(),
        subtitle: String(art.subtitle || "").trim(),
        cta: String(art.cta || "").trim(),
        imageUrl: art.imageUrl || "",
        logoUrl: art.logoUrl || "",
        qrText: String(art.qrText || "").trim(),
        whatsapp: String(art.whatsapp || "").trim(),
        location: String(art.location || "").trim(),
        primaryColor,
        secondaryColor,
        accentColor,
        textColor,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          text: textColor,
        },
        duration: 15,
        orientation: marketingType === "feed" ? "Paisagem + Retrato" : "Retrato",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const templateRef = await addDoc(collection(db, "clients", client.id, "templates"), templatePayload);
      alert("Arte enviada para os Templates. Adicione manualmente na playlist desejada.");
    } catch (error) {
      console.log(error);
      alert("Erro ao enviar a arte para a playlist.");
    } finally {
      setSendingArtId("");
    }
  }

  function startFromSavedArt(art) {
    if (!requirePlanPermission(access, "canEditMarketing", "editar artes")) return;

    setEditingArt(art);
    setForm({
      ...getMarketingDefaultForm(),
      ...art,
      imageFile: null,
      imagePreview: art.imageUrl || "",
      logoFile: null,
      logoUrl: art.logoUrl || client.logoUrl || "",
      logoPreview: art.logoUrl || client.logoUrl || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const selectedSize = getMarketingFormatSize(form.type);
  const marketingImageInputId = `marketing-image-${client.id}`;
  const marketingLogoInputId = `marketing-logo-${client.id}`;

  if (!hasMarketingAccess(client)) {
    return (
      <UpgradeAccessCard
        title="Marketing bloqueado"
        message="Marketing disponível a partir do plano Professional."
      />
    );
  }

  return (
    <div className="marketing-page">
      <section className="templates-hero">
        <div>
          <div className="kicker">Marketing integrado</div>
          <h1>Artes para Instagram, Stories e Reels</h1>
          <p>
            Crie peças profissionais para redes sociais e salve na biblioteca do cliente.
            A próxima etapa será enviar essas artes direto para a playlist da TV.
          </p>
        </div>

        <div className="templates-hero-badge">
          <SparklineIcon />
          {selectedSize}
        </div>
      </section>

      <section className="templates-builder-grid">
        <div className="templates-editor-panel">
          <div className="playlist-editor-header">
            <div>
              <h2>Nova arte</h2>
              <p>Escolha o formato, adicione imagem, logo, cores e chamada.</p>
            </div>
          </div>

          <div className="template-type-grid">
            <button
              type="button"
              className={form.type === "feed" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeMarketingType("feed")}
            >
              <Image size={28} />
              <strong>Feed Instagram</strong>
              <span>Arte quadrada 1080x1080</span>
            </button>

            <button
              type="button"
              className={form.type === "story" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeMarketingType("story")}
            >
              <Monitor size={28} />
              <strong>Stories</strong>
              <span>Vertical 1080x1920 para status e stories</span>
            </button>

            <button
              type="button"
              className={form.type === "reels" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeMarketingType("reels")}
            >
              <Palette size={28} />
              <strong>Capa Reels</strong>
              <span>Título forte para cortes e vídeos</span>
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Título principal</label>
              <input
                value={form.title}
                maxLength={80}
                placeholder="Ex: Promoção Especial"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Subtítulo</label>
              <input
                value={form.subtitle}
                maxLength={130}
                placeholder="Ex: Só hoje com condições especiais"
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Chamada / CTA</label>
              <input
                value={form.cta}
                maxLength={60}
                placeholder="Ex: Peça agora"
                onChange={(e) => setForm({ ...form, cta: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>WhatsApp</label>
              <input
                value={form.whatsapp}
                placeholder="Ex: 84 99999-9999"
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Localização</label>
              <input
                value={form.location}
                placeholder="Ex: João Câmara/RN"
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>QR Code / Link</label>
              <input
                value={form.qrText}
                placeholder="Link, WhatsApp ou texto para QR Code"
                onChange={(e) => setForm({ ...form, qrText: e.target.value })}
              />
            </div>
          </div>

          <VisibilityControls
            title="Elementos visíveis na arte"
            options={MARKETING_VISIBILITY_OPTIONS}
            values={form}
            onChange={(field, visible) => setForm((current) => ({
              ...current,
              [field]: visible,
            }))}
          />

          <div className="template-color-panel">
            <div className="playlist-section-title compact">
              <div>
                <h3>Imagem e logo</h3>
                <p>A imagem principal ocupa o fundo da arte. A logo aparece no topo.</p>
              </div>
            </div>

            <div className="form-grid marketing-assets-grid">
              <div className="form-group marketing-file-field">
                <label>Imagem principal</label>

                <label className="marketing-file-picker" htmlFor={marketingImageInputId}>
                  <span className="marketing-file-icon"><Image size={22} /></span>
                  <strong>Selecionar imagem</strong>
                  <small>{form.imageFile?.name || (form.imageUrl ? "Imagem salva" : "JPG, PNG ou WEBP")}</small>

                  <input
                    id={marketingImageInputId}
                    className="file-input-hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readMarketingFile(e.target.files?.[0], setForm, "imageFile", "imagePreview")
                    }
                  />
                </label>
              </div>

              <div className="form-group marketing-file-field">
                <label>Logo do cliente</label>

                <label className="marketing-file-picker" htmlFor={marketingLogoInputId}>
                  <span className="marketing-file-icon"><Upload size={22} /></span>
                  <strong>Selecionar logo</strong>
                  <small>{form.logoFile?.name || (form.logoUrl ? "Logo salva" : "Preferencialmente PNG")}</small>

                  <input
                    id={marketingLogoInputId}
                    className="file-input-hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readMarketingFile(e.target.files?.[0], setForm, "logoFile", "logoPreview")
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="template-color-panel">
            <div className="playlist-section-title compact">
              <div>
                <h3>Cores da arte</h3>
                <p>Controle o degradê, o destaque e a cor dos textos.</p>
              </div>
            </div>

            <div className="template-color-grid">
              <label>
                <span>Primária</span>
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                />
              </label>

              <label>
                <span>Secundária</span>
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                />
              </label>

              <label>
                <span>Destaque</span>
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                />
              </label>

              <label>
                <span>Texto</span>
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                />
              </label>

              <label>
                <span>Texto principal</span>
                <input
                  type="color"
                  value={form.mainTextColor || form.textColor || "#ffffff"}
                  onChange={(e) => setForm({ ...form, mainTextColor: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="panel-actions">
            <button
              className="upload-button"
              onClick={handleSaveMarketingArt}
              disabled={saving}
            >
              <Plus size={20} />
              {saving ? "Salvando..." : editingArt ? "Salvar alterações" : "Salvar arte"}
            </button>

            <button className="delete-button" type="button" onClick={resetMarketingForm}>
              Limpar campos
            </button>
          </div>
        </div>

        <div className="templates-preview-panel">
          <div style={{ marginBottom: 16 }}>
            <div className="kicker">Preview</div>
            <h2 style={{ margin: "6px 0 0" }}>
              {MARKETING_TYPE_LABELS[form.type]} • {selectedSize}
            </h2>
          </div>

          <div className={`marketing-preview-stage format-${form.type}`}>
            <MarketingArtPreview art={form} />
          </div>
        </div>
      </section>

      <section className="templates-list-panel">
        <div className="playlist-editor-header">
          <div>
            <h2>Biblioteca de artes</h2>
            <p>Artes salvas por este cliente para reaproveitar em campanhas.</p>
          </div>
        </div>

        <div className="templates-list-grid">
          {arts.length === 0 ? (
            <div className="empty-library">Nenhuma arte criada ainda.</div>
          ) : (
            arts.map((art) => (
              <div className="template-saved-card" key={art.id}>
                <div className={`template-saved-preview-shell marketing format-${art.type}`}>
                  <MarketingArtPreview art={art} compact />
                </div>

                <div className="template-saved-info">
                  <div>
                    <strong>{art.title || "Sem título"}</strong>
                    <span>
                      {MARKETING_TYPE_LABELS[art.type] || "Marketing"} • {art.formatLabel || getMarketingFormatSize(art.type)}
                    </span>
                  </div>

                  <div className="template-actions-row">
                    <button
                      className="client-action primary"
                      disabled={sendingArtId === art.id}
                      onClick={() => sendMarketingArtToPlaylist(art)}
                    >
                      {sendingArtId === art.id ? "Enviando..." : "Enviar para Playlist"}
                    </button>

                    <button className="client-action primary" onClick={() => startFromSavedArt(art)}>
                      Editar base
                    </button>

                    <button className="client-action" onClick={() => duplicateMarketingArt(art)}>
                      Duplicar
                    </button>

                    <button className="client-action danger" onClick={() => deleteMarketingArt(art.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <small style={{ color: "rgba(255,255,255,0.48)" }}>
                    A arte enviada ficará disponível em Playlists &gt; Templates da playlist.
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}


function ClientTemplatesPage({ client, access = getClientPlanAccess(client) }) {
  const [templates, setTemplates] = useState([]);
  const [screens, setScreens] = useState([]);
  const [saving, setSaving] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [previewOrientation, setPreviewOrientation] = useState("Paisagem");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const canUsePremiumTemplates = hasPremiumTemplates(client);
  const [customNewsSources, setCustomNewsSources] = useState(() =>
    getSavedCustomNewsSources()
  );

  const [form, setForm] = useState({
    name: "Clima ao vivo",
    type: "clima",
    orientation: "Paisagem",
    duration: "15",
    city: "João Câmara",
    weatherCity: "João Câmara/RN",
    weatherCities: "João Câmara/RN",
    tideBeach: "Ponta Negra/RN",
    tideBeaches: "Ponta Negra/RN",
    tideStation: "Natal",
    locationRotationInterval: "30",
    newsSource: "G1 RN",
    newsFeedUrl: NEWS_SOURCE_PRESETS["G1 RN"],
    selectedNewsSources: ["G1 RN"],
    tickerSpeed: "normal",
    newsRotationInterval: "12",
    timeFormat: "24h",
    showWeather: true,
    title: "Informação ao vivo",
    subtitle: "Atualização automática para sua TV",
    primaryColor: "#06b6d4",
    secondaryColor: "#9333ea",
    accentColor: "#22d3ee",
    textColor: "#ffffff",
    mainTextColor: "#ffffff",
    backgroundTheme: "neon_gradient",
    targetScreenIds: [],
    enabled: true,
    menuItems: DEFAULT_MENU_ITEMS.map((item) => ({ ...item })),
    promoItems: DEFAULT_PROMO_ITEMS.map((item) => ({ ...item })),
    corporateItems: [...DEFAULT_CORPORATE_ITEMS],
    agendaItems: DEFAULT_AGENDA_ITEMS.map((item) => ({ ...item })),
    indicatorItems: DEFAULT_INDICATOR_ITEMS.map((item) => ({ ...item })),
    footerText: "Desenvolvido por Park Solutions",
    callToAction: "Aponte a câmera e saiba mais",
    logoUrl: client.logoUrl || "",
    brandTitle: client.name || "Sua empresa",
    brandSubtitle: "Comunicacao corporativa",
    useClientLogo: true,
    customLogoUrl: "",
    mainTitle: "Comunicados e campanhas em destaque",
    mainSubtitle: "Tela corporativa personalizada",
    mainText: "Use este espaco para avisos, indicadores, campanhas e conteudos institucionais.",
    mainImageUrl: "",
    backgroundMode: "gradient",
    backgroundUrl: "",
    overlayOpacity: "55",
    benefits: ["Recepcao", "Elevadores", "Mural digital"],
    showHeader: true,
    showLogo: true,
    showBadge: true,
    showTitle: true,
    showSubtitle: true,
    showFooter: true,
  });

  useEffect(() => {
    const unsubTemplates = onSnapshot(
      collection(db, "clients", client.id, "templates"),
      (snapshot) => {
        setTemplates(
          snapshot.docs.map((item) => normalizeSavedTemplate({ id: item.id, ...item.data() }))
        );
      }
    );

    const unsubScreens = onSnapshot(
      collection(db, "clients", client.id, "screens"),
      (snapshot) => {
        setScreens(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    return () => {
      unsubTemplates();
      unsubScreens();
    };
  }, [client.id]);

  useEffect(() => {
    if (form.orientation === "Paisagem" || form.orientation === "Retrato") {
      setPreviewOrientation(form.orientation);
    }
  }, [form.orientation]);

  function changeType(type) {
    if (isPremiumTemplate(type) && !canUsePremiumTemplates) {
      setUpgradeMessage("Templates Premium disponíveis a partir do plano Business.");
      return;
    }

    setUpgradeMessage("");

    const presets = {
      clima: {
        name: "Clima ao vivo",
        title: "Clima ao vivo",
        subtitle: "Previsão atualizada automaticamente",
        duration: "15",
        city: "João Câmara",
      },
      noticias: {
        name: "Notícias ao vivo",
        title: "Últimas notícias",
        subtitle: "Manchetes atualizadas automaticamente",
        duration: "15",
      },
      comercial: {
        name: "Oferta premium",
        title: "Oferta especial",
        subtitle: "Destaque sua promoção na TV",
        duration: "15",
      },
      aviso: {
        name: "Aviso institucional",
        title: "Comunicado importante",
        subtitle: "Informe seu público com visual profissional",
        duration: "15",
      },
      jornal_premium: {
        name: "Jornal TV Premium",
        title: "Jornal TV",
        subtitle: "Notícias, clima e hora em layout profissional",
        duration: "20",
        city: "João Câmara",
      },
      clima_premium_v2: {
        name: "Clima Premium V2",
        title: "Clima Premium",
        subtitle: "Previsão de 4 dias com notícias ao vivo",
        duration: "20",
        city: "João Câmara/RN",
        weatherCity: "João Câmara/RN",
        weatherCities: "João Câmara/RN",
        tideBeach: "Ponta Negra/RN",
        tideBeaches: "Ponta Negra/RN",
        tideStation: "Natal",
        locationRotationInterval: "30",
        selectedNewsSources: ["G1 RN"],
        tickerSpeed: "normal",
        showFooter: true,
      },
      hora_certa_premium: {
        name: "Hora Certa Premium",
        title: "Hora Certa",
        subtitle: "Relógio, data, clima e notícias ao vivo",
        duration: "20",
        city: "João Câmara/RN",
        weatherCity: "João Câmara/RN",
        selectedNewsSources: ["G1 RN"],
        tickerSpeed: "normal",
        timeFormat: "24h",
        showWeather: true,
        showFooter: true,
      },
      resultados_esportivos_premium: {
        name: "Resultados Esportivos Premium",
        title: "Totem Park Esportes",
        subtitle: "Boletim esportivo corporativo com dados manuais",
        duration: "20",
        city: "João Câmara/RN",
        sportsTheme: "corporate_broadcast",
        showTime: true,
        showDate: true,
        showSportsNews: true,
        showUpcomingGames: true,
        showOtherSports: true,
        footballMode: "brasileirao_a",
        liveRotationInterval: "15",
        tickerSpeed: "normal",
        enableScoreAnimations: true,
        footballCompetitions: DEFAULT_FOOTBALL_COMPETITIONS.map((item) => ({ ...item })),
        sportsMatches: DEFAULT_SPORTS_MATCHES.map((item) => ({ ...item })),
        otherSports: DEFAULT_OTHER_SPORTS_OPTIONS.map((item) => ({ ...item })),
        footerText: "Dados reais gratuitos via TheSportsDB quando disponiveis",
      },
      tela_corporativa_personalizada: {
        name: "Tela Corporativa Personalizada",
        title: "Tela Corporativa Personalizada",
        subtitle: "Marca, hora, clima, noticias e conteudo institucional",
        duration: "20",
        orientation: "Paisagem + Retrato",
        city: "JoÃ£o CÃ¢mara/RN",
        weatherCity: "JoÃ£o CÃ¢mara/RN",
        selectedNewsSources: ["G1 RN"],
        newsSource: "G1 RN",
        newsFeedUrl: NEWS_SOURCE_PRESETS["G1 RN"],
        tickerSpeed: "normal",
        newsRotationInterval: "12",
        timeFormat: "24h",
        showWeather: true,
        showForecastDays: true,
        showClock: true,
        showDate: true,
        showFooter: true,
        showNewsTicker: true,
        backgroundTheme: "corporate_dark",
        backgroundMode: "gradient",
        primaryColor: "#06b6d4",
        secondaryColor: "#7c3aed",
        accentColor: "#22d3ee",
        textColor: "#ffffff",
        mainTextColor: "#ffffff",
        overlayOpacity: "55",
        useClientLogo: true,
        logoUrl: client.logoUrl || "",
        customLogoUrl: "",
        brandTitle: client.name || "Sua empresa",
        brandSubtitle: "Comunicacao corporativa",
        mainTitle: "Comunicados e campanhas em destaque",
        mainSubtitle: "Painel institucional em tempo real",
        mainText: "Use este espaco para avisos, campanhas, indicadores e conteudos da sua empresa.",
        mainImageUrl: "",
        backgroundUrl: "",
        benefits: ["Recepcao", "Elevadores", "Mural digital"],
        footerText: "Totem Park - comunicacao que conecta",
      },
      receitas_fitness_premium: {
        name: "Receitas Fitness Premium",
        title: "Receitas Fitness",
        subtitle: "Comidas saudáveis em rotação RSS",
        duration: "20",
        selectedNewsSources: ["Saudável Receita"],
        newsSource: "Saudável Receita",
        newsFeedUrl: NEWS_SOURCE_PRESETS["Saudável Receita"],
        tickerSpeed: "normal",
        newsRotationInterval: "12",
        showFooter: true,
      },
      tendencia_beleza_premium: {
        name: "Tendência de Beleza Premium",
        title: "Tendência de Beleza",
        subtitle: "Moda, estética e autocuidado",
        duration: "20",
        selectedNewsSources: ["Steal The Look"],
        newsSource: "Steal The Look",
        newsFeedUrl: NEWS_SOURCE_PRESETS["Steal The Look"],
        tickerSpeed: "normal",
        newsRotationInterval: "12",
        showFooter: true,
      },
      fofocas_premium: {
        name: "Fofocas Brasil Premium",
        title: "Fofocas Brasil",
        subtitle: "Celebridades, TV e bastidores nacionais",
        duration: "20",
        selectedNewsSources: ["Metrópoles Celebridades"],
        newsSource: "Metrópoles Celebridades",
        newsFeedUrl: NEWS_SOURCE_PRESETS["Metrópoles Celebridades"],
        tickerSpeed: "normal",
        newsRotationInterval: "10",
        showFooter: true,
      },
      cardapio_premium: {
        name: "Cardápio Premium",
        title: "Cardápio Digital",
        subtitle: "Produtos, categorias e preços com visual moderno",
        duration: "20",
        menuItems: DEFAULT_MENU_ITEMS.map((item) => ({ ...item })),
        callToAction: "Peça pelo QR Code ou no balcão",
        footerText: "Totem Park Menu",
      },
      promocao_premium: {
        name: "Promoção Premium",
        title: "Ofertas da Semana",
        subtitle: "Promoções em destaque para sua TV",
        duration: "18",
        promoItems: DEFAULT_PROMO_ITEMS.map((item) => ({ ...item })),
        callToAction: "Promoção por tempo limitado",
      },
      corporativo_premium: {
        name: "Corporativo Premium",
        title: "Comunicação Corporativa",
        subtitle: "Avisos, agenda, indicadores e vídeo institucional",
        duration: "20",
        corporateItems: [...DEFAULT_CORPORATE_ITEMS],
        agendaItems: DEFAULT_AGENDA_ITEMS.map((item) => ({ ...item })),
        indicatorItems: DEFAULT_INDICATOR_ITEMS.map((item) => ({ ...item })),
        footerText: "Comunicação interna atualizada em tempo real",
      },
    };

    const preset = presets[type] || presets.clima;

    setForm((prev) => ({
      ...prev,
      ...preset,
      type,
      newsSource:
        isRssTemplateType(type)
          ? preset.newsSource || prev.newsSource || "G1 RN"
          : prev.newsSource,
      newsFeedUrl:
        isRssTemplateType(type)
          ? preset.newsFeedUrl || prev.newsFeedUrl || NEWS_SOURCE_PRESETS["G1 RN"]
          : prev.newsFeedUrl,
      selectedNewsSources:
        isRssTemplateType(type)
          ? preset.selectedNewsSources || prev.selectedNewsSources || ["G1 RN"]
          : prev.selectedNewsSources,
      weatherCity:
        ["clima", "jornal_premium", "clima_premium_v2", "hora_certa_premium", "tela_corporativa_personalizada"].includes(type)
          ? preset.weatherCity || preset.city || prev.weatherCity || prev.city || "João Câmara/RN"
          : prev.weatherCity,
      weatherCities:
        type === "clima_premium_v2"
          ? preset.weatherCities || prev.weatherCities || preset.weatherCity || preset.city || prev.weatherCity || "Joao Camara/RN"
          : prev.weatherCities,
      tideBeach:
        type === "clima_premium_v2"
          ? preset.tideBeach || prev.tideBeach || "Ponta Negra/RN"
          : prev.tideBeach,
      tideBeaches:
        type === "clima_premium_v2"
          ? preset.tideBeaches || prev.tideBeaches || preset.tideBeach || prev.tideBeach || "Ponta Negra/RN"
          : prev.tideBeaches,
      tideStation:
        type === "clima_premium_v2"
          ? preset.tideStation || prev.tideStation || "Natal"
          : prev.tideStation,
      locationRotationInterval:
        type === "clima_premium_v2"
          ? preset.locationRotationInterval || prev.locationRotationInterval || "30"
          : prev.locationRotationInterval,
    }));
  }

  function changeNewsSource(sourceName) {
    const customSource = customNewsSources.find(
      (source) => source.name === sourceName
    );

    setForm((prev) => ({
      ...prev,
      newsSource: sourceName,
      selectedNewsSources: [sourceName],
      newsFeedUrl:
        sourceName === "Personalizado"
          ? prev.newsFeedUrl
          : customSource?.url || NEWS_SOURCE_PRESETS[sourceName] || prev.newsFeedUrl,
    }));
  }

  function toggleNewsSource(sourceName) {
    setForm((prev) => {
      const current = Array.isArray(prev.selectedNewsSources)
        ? prev.selectedNewsSources
        : [prev.newsSource || "G1 RN"];
      const next = current.includes(sourceName)
        ? current.filter((source) => source !== sourceName)
        : [...current, sourceName];
      const safeNext = next.length > 0 ? next : ["G1 RN"];
      const firstSource = safeNext[0];
      const customSource = customNewsSources.find(
        (source) => source.name === firstSource
      );

      return {
        ...prev,
        selectedNewsSources: safeNext,
        newsSource: firstSource,
        newsFeedUrl:
          firstSource === "Personalizado"
            ? prev.newsFeedUrl
            : customSource?.url || NEWS_SOURCE_PRESETS[firstSource] || prev.newsFeedUrl,
      };
    });
  }

  function handleCustomNewsUrlChange(url) {
    const source = saveCustomNewsSource(url);

    setCustomNewsSources(getSavedCustomNewsSources());

    setForm((prev) => ({
      ...prev,
      newsSource: source?.name || "Personalizado",
      newsFeedUrl: url,
      selectedNewsSources: Array.from(new Set([
        ...(Array.isArray(prev.selectedNewsSources) ? prev.selectedNewsSources : []),
        source?.name || "Personalizado",
      ])),
    }));
  }

  function updateArrayItem(field, index, key, value) {
    setForm((prev) => {
      const current = Array.isArray(prev[field])
        ? prev[field].map((item) =>
            item && typeof item === "object" && !Array.isArray(item)
              ? { ...item }
              : item
          )
        : [];

      current[index] = {
        ...(current[index] || {}),
        [key]: value,
      };

      return {
        ...prev,
        [field]: current,
      };
    });
  }

  function updateTextArrayItem(field, index, value) {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? [...prev[field]] : [];

      current[index] = value;

      return {
        ...prev,
        [field]: current,
      };
    });
  }

  function addArrayItem(field, item) {
    setForm((prev) => ({
      ...prev,
      [field]: [
        ...(Array.isArray(prev[field]) ? prev[field] : []),
        item && typeof item === "object" && !Array.isArray(item)
          ? { ...item }
          : item,
      ],
    }));
  }

  function removeArrayItem(field, index) {
    setForm((prev) => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] : []).filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  async function handleTemplateImageUpload(event, field, folder) {
    const permission = editingTemplate ? "canEditTemplates" : "canCreateTemplates";
    if (!requirePlanPermission(access, permission, "enviar imagens do template")) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setSaving(true);
      const imageUrl = await uploadTemplateImageAsset(
        client.id,
        editingTemplate?.id,
        file,
        folder
      );
      setForm((prev) => ({
        ...prev,
        [field]: imageUrl,
        ...(field === "backgroundUrl" ? { backgroundMode: "image" } : {}),
      }));
    } catch (error) {
      console.log(error);
      alert(error.message || "Erro ao enviar imagem do template.");
    } finally {
      setSaving(false);
    }
  }

  function toggleTargetScreen(screenId) {
    const selected = form.targetScreenIds.includes(screenId);

    setForm({
      ...form,
      targetScreenIds: selected
        ? form.targetScreenIds.filter((id) => id !== screenId)
        : [...form.targetScreenIds, screenId],
    });
  }

  function resetForm() {
    setEditingTemplate(null);
    setForm({
      name: "Clima ao vivo",
      type: "clima",
      orientation: "Paisagem",
      duration: "15",
      city: "João Câmara",
      weatherCity: "João Câmara/RN",
      weatherCities: "JoÃ£o CÃ¢mara/RN",
      tideBeach: "Ponta Negra/RN",
      tideBeaches: "Ponta Negra/RN",
      tideStation: "Natal",
      locationRotationInterval: "30",
      newsSource: "G1 RN",
      newsFeedUrl: NEWS_SOURCE_PRESETS["G1 RN"],
      selectedNewsSources: ["G1 RN"],
      tickerSpeed: "normal",
      timeFormat: "24h",
      showWeather: true,
      title: "Informação ao vivo",
      subtitle: "Atualização automática para sua TV",
      primaryColor: "#06b6d4",
      secondaryColor: "#9333ea",
      accentColor: "#22d3ee",
      textColor: "#ffffff",
      mainTextColor: "#ffffff",
      backgroundTheme: "neon_gradient",
      targetScreenIds: [],
      enabled: true,
      menuItems: DEFAULT_MENU_ITEMS.map((item) => ({ ...item })),
      promoItems: DEFAULT_PROMO_ITEMS.map((item) => ({ ...item })),
      corporateItems: [...DEFAULT_CORPORATE_ITEMS],
      agendaItems: DEFAULT_AGENDA_ITEMS.map((item) => ({ ...item })),
      indicatorItems: DEFAULT_INDICATOR_ITEMS.map((item) => ({ ...item })),
      sportsTheme: "corporate_broadcast",
      showTime: true,
      showDate: true,
      showSportsNews: true,
      showUpcomingGames: true,
      showOtherSports: true,
      footballMode: "brasileirao_a",
      liveRotationInterval: "15",
      enableScoreAnimations: true,
      footballCompetitions: DEFAULT_FOOTBALL_COMPETITIONS.map((item) => ({ ...item })),
      sportsMatches: DEFAULT_SPORTS_MATCHES.map((item) => ({ ...item })),
      otherSports: DEFAULT_OTHER_SPORTS_OPTIONS.map((item) => ({ ...item })),
      footerText: "Desenvolvido por Park Solutions",
      callToAction: "Aponte a câmera e saiba mais",
      logoUrl: client.logoUrl || "",
      brandTitle: client.name || "Sua empresa",
      brandSubtitle: "Comunicacao corporativa",
      useClientLogo: true,
      customLogoUrl: "",
      mainTitle: "Comunicados e campanhas em destaque",
      mainSubtitle: "Tela corporativa personalizada",
      mainText: "Use este espaco para avisos, indicadores, campanhas e conteudos institucionais.",
      mainImageUrl: "",
      backgroundMode: "gradient",
      backgroundUrl: "",
      overlayOpacity: "55",
      benefits: ["Recepcao", "Elevadores", "Mural digital"],
      showHeader: true,
      showLogo: true,
      showBadge: true,
      showTitle: true,
      showSubtitle: true,
      showFooter: true,
    });
  }

  function getTemplateTypeCardClass(type) {
    return [
      "template-type-card",
      form.type === type ? "active" : "",
      isPremiumTemplate(type) && !canUsePremiumTemplates ? "locked" : "",
    ].filter(Boolean).join(" ");
  }

  async function handleSaveTemplate() {
    const permission = editingTemplate ? "canEditTemplates" : "canCreateTemplates";
    const action = editingTemplate ? "editar templates" : "criar novos templates";
    if (!requirePlanPermission(access, permission, action)) return;

    if (isPremiumTemplate(form.type) && !canUsePremiumTemplates) {
      setUpgradeMessage("Templates Premium disponíveis a partir do plano Business.");
      return;
    }

    if (!form.name.trim()) {
      alert("Informe o nome do template.");
      return;
    }

    if (Number(form.duration || 0) < 5) {
      alert("A duração mínima recomendada é de 5 segundos.");
      return;
    }

    try {
      setSaving(true);

      const templateData = {
        ...form,
        logoUrl: form.logoUrl || client.logoUrl || "",
        duration: Number(form.duration || 15),
        updatedAt: serverTimestamp(),
      };

      if (editingTemplate) {
        const templateRevision = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await updateDoc(
          doc(db, "clients", client.id, "templates", editingTemplate.id),
          { ...templateData, templateRevision }
        );

        await Promise.all(
          screens.map((screen) => updateDoc(
            doc(db, "clients", client.id, "screens", screen.id),
            {
              templateRevision,
              remoteCommand: {
                id: `template-refresh-${templateRevision}-${screen.id}`,
                type: "refresh",
                sentAt: new Date().toISOString(),
              },
              updatedAt: serverTimestamp(),
            }
          ))
        );
      } else {
        await addDoc(collection(db, "clients", client.id, "templates"), {
          ...templateData,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      alert(editingTemplate ? "Template atualizado com sucesso!" : "Template criado com sucesso!");
    } catch (error) {
      console.log(error);
      alert(error.code === "permission-denied"
        ? "Sua conta não tem permissão para salvar este template. Entre em contato com o suporte para verificar o cadastro."
        : "Não foi possível salvar o template. Confira sua conexão e tente novamente. Seus dados continuam no formulário.");
    } finally {
      setSaving(false);
    }
  }

  function startEditTemplate(template) {
    if (!requirePlanPermission(access, "canEditTemplates", "editar templates")) return;
    const normalizedTemplate = normalizeSavedTemplate(template);

    const { id, createdAt, updatedAt, ...savedData } = normalizedTemplate;
    setEditingTemplate(normalizedTemplate);
    setForm((current) => ({
      ...current,
      ...savedData,
      type: normalizedTemplate.type,
      templateType: normalizedTemplate.templateType,
      duration: String(normalizedTemplate.duration || 15),
      targetScreenIds: Array.isArray(normalizedTemplate.targetScreenIds) ? [...normalizedTemplate.targetScreenIds] : [],
      menuItems: getTemplateMenuItems(normalizedTemplate).map((item) => ({ ...item })),
      promoItems: getTemplatePromoItems(normalizedTemplate).map((item) => ({ ...item })),
      corporateItems: [...getTemplateCorporateItems(normalizedTemplate)],
      agendaItems: getTemplateAgendaItems(normalizedTemplate).map((item) => ({ ...item })),
      indicatorItems: getTemplateIndicatorItems(normalizedTemplate).map((item) => ({ ...item })),
      footballCompetitions: getSportsFootballCompetitions(normalizedTemplate).map((item) => ({ ...item })),
      sportsMatches: getSportsMatches(normalizedTemplate).map((item) => ({ ...item })),
      otherSports: getOtherSportsOptions(normalizedTemplate).map((item) => ({ ...item })),
      sportsTheme: normalizedTemplate.sportsTheme || "arena_dark",
      showTime: normalizedTemplate.showTime !== false,
      showDate: normalizedTemplate.showDate !== false,
      showSportsNews: normalizedTemplate.showSportsNews !== false,
      showUpcomingGames: normalizedTemplate.showUpcomingGames !== false,
      showOtherSports: normalizedTemplate.showOtherSports !== false,
      footballMode: getSportsFootballMode(normalizedTemplate),
      liveRotationInterval: String(normalizedTemplate.liveRotationInterval || "15"),
      enableScoreAnimations: normalizedTemplate.enableScoreAnimations !== false,
      logoUrl: normalizedTemplate.logoUrl || client.logoUrl || "",
      selectedNewsSources: getTemplateNewsSources(normalizedTemplate),
      weatherCity: getTemplateWeatherCity(normalizedTemplate),
      tideBeach: getTemplateTideBeach(normalizedTemplate),
      tideStation: getTemplateTideStation(normalizedTemplate),
      tickerSpeed: getTemplateTickerSpeed(normalizedTemplate.tickerSpeed),
      timeFormat: normalizedTemplate.timeFormat || "24h",
      showWeather: normalizedTemplate.showWeather !== false,
      mainTextColor: normalizedTemplate.mainTextColor || normalizedTemplate.textColor || current.mainTextColor || "#ffffff",
    }));
    setPreviewOrientation(normalizedTemplate.orientation === "Retrato" ? "Retrato" : "Paisagem");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteTemplate(templateOrId) {
    if (!requirePlanPermission(access, "canEditTemplates", "excluir templates")) return;
    const templateId = typeof templateOrId === "string" ? templateOrId : templateOrId?.id;

    if (!templateId) {
      alert("Este template antigo nao possui identificador para exclusao.");
      return;
    }

    const templateName = typeof templateOrId === "string" ? "este template" : templateOrId?.name || "este template";

    if (!window.confirm(`Excluir ${templateName}? Esta acao nao pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "clients", client.id, "templates", templateId));
      if (editingTemplate?.id === templateId) resetForm();
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir template.");
    }
  }

  async function toggleTemplate(template) {
    if (!requirePlanPermission(access, "canEditTemplates", "editar templates")) return;

    if (isPremiumTemplate(template) && !canUsePremiumTemplates) {
      setUpgradeMessage("Faça upgrade para gerenciar Templates Premium.");
      return;
    }

    try {
      await updateDoc(doc(db, "clients", client.id, "templates", template.id), {
        enabled: !template.enabled,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.log(error);
      alert("Erro ao alterar status do template.");
    }
  }

  async function applyTemplateToScreens(template) {
    if (!requirePlanPermission(access, "canEditTemplates", "aplicar templates")) return;

    if (isPremiumTemplate(template) && !canUsePremiumTemplates) {
      setUpgradeMessage("Faça upgrade para o plano Business ou superior para aplicar Templates Premium.");
      return;
    }

    const targetScreens =
      template.targetScreenIds && template.targetScreenIds.length > 0
        ? screens.filter((screen) => template.targetScreenIds.includes(screen.id))
        : screens;

    if (targetScreens.length === 0) {
      alert("Nenhuma tela selecionada ou cadastrada.");
      return;
    }

    try {
      await Promise.all(
        targetScreens.map((screen) =>
          updateDoc(doc(db, "clients", client.id, "screens", screen.id), {
            activeTemplateId: template.id,
            activeTemplateName: template.name,
            ...(template.orientation === "Retrato" || template.orientation === "Paisagem"
              ? { orientation: template.orientation }
              : {}),
            templateUpdatedAt: serverTimestamp(),
          })
        )
      );

      alert("Template aplicado nas telas selecionadas.");
    } catch (error) {
      console.log(error);
      alert("Erro ao aplicar template nas telas.");
    }
  }

  return (
    <>
      <section className="templates-hero">
        <div>
          <div className="kicker">Templates dinâmicos</div>
          <h1>Templates prontos para TV</h1>
          <p>
            Crie telas modernas de clima, notícias, avisos e campanhas comerciais.
            Cada template tem duração, cores e telas de destino.
          </p>
        </div>

        <div className="templates-hero-badge">
          <SparklineIcon />
          Ao vivo + personalizável
        </div>
      </section>

      {upgradeMessage && (
        <UpgradeAccessCard
          title="Templates Premium bloqueados"
          message={upgradeMessage}
          onClose={() => setUpgradeMessage("")}
        />
      )}

      <section className="templates-builder-grid">
        <div className="templates-editor-panel">
          <div className="playlist-editor-header">
            <div>
              <h2>{editingTemplate ? "Editar template" : "Novo template"}</h2>
              <p>{editingTemplate ? `Atualizando ${editingTemplate.name || "template salvo"}.` : "Configure o visual, duração e origem do conteúdo."}</p>
            </div>
          </div>

          <div className="template-type-grid">
            <button
              className={getTemplateTypeCardClass("clima")}
              onClick={() => changeType("clima")}
              type="button"
            >
              <CloudSun size={28} />
              <strong>Clima ao vivo</strong>
              <span>Open-Meteo, cidade configurável</span>
            </button>

            <button
              className={getTemplateTypeCardClass("noticias")}
              onClick={() => changeType("noticias")}
              type="button"
            >
              <Newspaper size={28} />
              <strong>Notícias ao vivo</strong>
              <span>RSS de portal ou fonte local</span>
            </button>

            <button
              className={getTemplateTypeCardClass("comercial")}
              onClick={() => changeType("comercial")}
              type="button"
            >
              <Palette size={28} />
              <strong>Comercial</strong>
              <span>Promoção, serviço ou oferta</span>
            </button>

            <button
              className={getTemplateTypeCardClass("aviso")}
              onClick={() => changeType("aviso")}
              type="button"
            >
              <Clock3 size={28} />
              <strong>Aviso</strong>
              <span>Comunicado institucional</span>
            </button>

            <button
              className={getTemplateTypeCardClass("jornal_premium")}
              onClick={() => changeType("jornal_premium")}
              type="button"
            >
              <Newspaper size={28} />
              <strong>Jornal TV Premium</strong>
              <span>RSS + clima + hora, em paisagem e retrato</span>
            </button>

            <button
              className={getTemplateTypeCardClass("clima_premium_v2")}
              onClick={() => changeType("clima_premium_v2")}
              type="button"
            >
              <CloudSun size={28} />
              <strong>Clima Premium V2</strong>
              <span>Previsão 4 dias + ticker RSS</span>
            </button>

            <button
              className={getTemplateTypeCardClass("hora_certa_premium")}
              onClick={() => changeType("hora_certa_premium")}
              type="button"
            >
              <Clock3 size={28} />
              <strong>Hora Certa Premium</strong>
              <span>Hora, data, clima e RSS</span>
            </button>

            <button
              className={getTemplateTypeCardClass("resultados_esportivos_premium")}
              onClick={() => changeType("resultados_esportivos_premium")}
              type="button"
            >
              <Trophy size={28} />
              <strong>Resultados Esportivos Premium</strong>
              <span>Futebol em destaque com fonte gratuita</span>
            </button>

            <button
              className={getTemplateTypeCardClass("tela_corporativa_personalizada")}
              onClick={() => changeType("tela_corporativa_personalizada")}
              type="button"
            >
              <LayoutDashboard size={28} />
              <strong>Tela Corporativa Personalizada</strong>
              <span>Marca, hora, clima, noticias e conteudo fixo</span>
            </button>

            <button
              className={getTemplateTypeCardClass("receitas_fitness_premium")}
              onClick={() => changeType("receitas_fitness_premium")}
              type="button"
            >
              <Coffee size={28} />
              <strong>Receitas Fitness Premium</strong>
              <span>Receitas saudáveis com RSS e fotos</span>
            </button>

            <button
              className={getTemplateTypeCardClass("tendencia_beleza_premium")}
              onClick={() => changeType("tendencia_beleza_premium")}
              type="button"
            >
              <Sparkles size={28} />
              <strong>Tendência de Beleza Premium</strong>
              <span>Beleza, estética e autocuidado</span>
            </button>

            <button
              className={getTemplateTypeCardClass("fofocas_premium")}
              onClick={() => changeType("fofocas_premium")}
              type="button"
            >
              <Megaphone size={28} />
              <strong>Fofocas Brasil Premium</strong>
              <span>Celebridades e bastidores nacionais</span>
            </button>

            <button
              className={getTemplateTypeCardClass("cardapio_premium")}
              onClick={() => changeType("cardapio_premium")}
              type="button"
            >
              <Palette size={28} />
              <strong>Cardápio Premium</strong>
              <span>Produtos, categorias e preços para restaurantes</span>
            </button>

            <button
              className={getTemplateTypeCardClass("promocao_premium")}
              onClick={() => changeType("promocao_premium")}
              type="button"
            >
              <CreditCard size={28} />
              <strong>Promoção Premium</strong>
              <span>Ofertas, preço antigo, preço destaque e CTA</span>
            </button>

            <button
              className={getTemplateTypeCardClass("corporativo_premium")}
              onClick={() => changeType("corporativo_premium")}
              type="button"
            >
              <Clock3 size={28} />
              <strong>Corporativo Premium</strong>
              <span>Avisos, agenda, indicadores e comunicação interna</span>
            </button>
          </div>

          <VisibilityControls
            title="Elementos visíveis no template"
            options={TEMPLATE_VISIBILITY_OPTIONS}
            values={form}
            onChange={(field, visible) => setForm((current) => ({
              ...current,
              [field]: visible,
            }))}
          />

          <div className="form-grid">
            <div className="form-group">
              <label>Nome do template</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Duração na TV (segundos)</label>
              <input
                type="number"
                min="5"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Orientação</label>
              <select
                value={form.orientation}
                onChange={(e) => setForm({ ...form, orientation: e.target.value })}
              >
                <option>Paisagem</option>
                <option>Retrato</option>
                <option>Paisagem + Retrato</option>
              </select>
            </div>

            <div className="form-group">
              <label>Título principal</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Subtítulo</label>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>

            {["clima", "jornal_premium", "clima_premium_v2", "hora_certa_premium", "tela_corporativa_personalizada"].includes(form.type) && (
              <div className="form-group">
                <label>Cidade do clima</label>
                <select
                  value={WEATHER_CITY_PRESETS.includes(getTemplateWeatherCity(form)) ? getTemplateWeatherCity(form) : "custom"}
                  onChange={(e) => {
                    if (e.target.value === "custom") return;
                    setForm({ ...form, city: e.target.value, weatherCity: e.target.value, weatherCities: e.target.value });
                  }}
                >
                  {WEATHER_CITY_PRESETS.map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                  <option value="custom">Outra cidade</option>
                </select>
                <input
                  value={getTemplateWeatherCity(form)}
                  placeholder="Ex: João Câmara"
                  onChange={(e) => setForm({ ...form, city: e.target.value, weatherCity: e.target.value, weatherCities: e.target.value })}
                />
              </div>
            )}

            {form.type === "clima_premium_v2" && (
              <>
                <div className="form-group full">
                  <label>Cidades em rotacao</label>
                  <textarea
                    value={form.weatherCities || getTemplateWeatherCity(form)}
                    placeholder="Ex: Joao Camara/RN, Macau/RN, Galinhos/RN"
                    onChange={(e) => {
                      const firstCity = parseTemplateListField(e.target.value, [getTemplateWeatherCity(form)])[0] || getTemplateWeatherCity(form);
                      setForm({
                        ...form,
                        weatherCities: e.target.value,
                        city: firstCity,
                        weatherCity: firstCity,
                      });
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Praia para maré</label>
                  <select
                    value={TIDE_BEACH_PRESETS.some((beach) => beach.name === getTemplateTideBeach(form)) ? getTemplateTideBeach(form) : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") return;
                      const selectedBeach = TIDE_BEACH_PRESETS.find((beach) => beach.name === e.target.value);
                      setForm({
                        ...form,
                        tideBeach: selectedBeach.name,
                        tideBeaches: selectedBeach.name,
                        tideStation: selectedBeach.tideStation,
                      });
                    }}
                  >
                    {TIDE_BEACH_PRESETS.map((beach) => (
                      <option key={beach.name} value={beach.name}>{beach.name}</option>
                    ))}
                    <option value="custom">Outra praia</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Praia personalizada</label>
                  <input
                    value={getTemplateTideBeach(form)}
                    placeholder="Ex: Ponta Negra/RN"
                    onChange={(e) => setForm({ ...form, tideBeach: e.target.value, tideBeaches: e.target.value, tideStation: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label>Praias em rotacao</label>
                  <textarea
                    value={form.tideBeaches || getTemplateTideBeach(form)}
                    placeholder="Ex: Ponta Negra/RN, Touros/RN, Galinhos/RN"
                    onChange={(e) => {
                      const firstBeach = parseTemplateListField(e.target.value, [getTemplateTideBeach(form)])[0] || getTemplateTideBeach(form);
                      const selectedBeach = getTideBeachConfig(firstBeach);
                      setForm({
                        ...form,
                        tideBeaches: e.target.value,
                        tideBeach: firstBeach,
                        tideStation: selectedBeach.tideStation || firstBeach,
                      });
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Trocar cidade/praia a cada (segundos)</label>
                  <input
                    type="number"
                    min="10"
                    value={form.locationRotationInterval || "30"}
                    onChange={(e) => setForm({ ...form, locationRotationInterval: e.target.value })}
                  />
                </div>
              </>
            )}

            {isRssTemplateType(form.type) && (
              <>
                <div className="form-group">
                  <label>Fonte de notícias</label>
                  <select
                    value={form.newsSource || "G1 RN"}
                    onChange={(e) => changeNewsSource(e.target.value)}
                  >
                    {Object.keys(NEWS_SOURCE_PRESETS).map((sourceName) => (
                      <option key={sourceName}>{sourceName}</option>
                    ))}

                    {customNewsSources.map((source) => (
                      <option key={source.url}>{source.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>URL RSS personalizada</label>
                  <input
                    value={form.newsFeedUrl}
                    placeholder="https://site.com/rss"
                    onChange={(e) => handleCustomNewsUrlChange(e.target.value)}
                  />
                </div>
              </>
            )}

            {form.type === "hora_certa_premium" && (
              <>
                <div className="form-group">
                  <label>Formato da hora</label>
                  <select
                    value={form.timeFormat || "24h"}
                    onChange={(e) => setForm({ ...form, timeFormat: e.target.value })}
                  >
                    <option value="24h">24 horas</option>
                    <option value="12h">12 horas</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mostrar clima</label>
                  <select
                    value={form.showWeather === false ? "nao" : "sim"}
                    onChange={(e) => setForm({ ...form, showWeather: e.target.value === "sim" })}
                  >
                    <option value="sim">Sim</option>
                    <option value="nao">Nao</option>
                  </select>
                </div>
              </>
            )}

            {["clima", "noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium", "resultados_esportivos_premium", "receitas_fitness_premium", "tendencia_beleza_premium", "fofocas_premium", "tela_corporativa_personalizada"].includes(form.type) && (
              <>
                <div className="form-group">
                  <label>Velocidade do rodape</label>
                  <select
                    value={getTemplateTickerSpeed(form.tickerSpeed)}
                    onChange={(e) => setForm({ ...form, tickerSpeed: e.target.value })}
                  >
                    <option value="slow">Lenta</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Rápida</option>
                  </select>
                </div>

                {isRssTemplateType(form.type) && (
                  <div className="form-group">
                    <label>Alternar notícia principal a cada (segundos)</label>
                    <input
                      type="number"
                      min="5"
                      value={form.newsRotationInterval || "12"}
                      onChange={(e) => setForm({ ...form, newsRotationInterval: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {isRssTemplateType(form.type) && (
            <div className="template-color-panel">
              <div className="playlist-section-title compact">
                <div>
                  <h3>Fontes RSS</h3>
                  <p>Escolha uma ou mais fontes para alternar notícia principal e ticker.</p>
                </div>
              </div>

              <div className="template-rss-source-grid">
                {[...Object.keys(NEWS_SOURCE_PRESETS), ...customNewsSources.map((source) => source.name)].map((sourceName) => (
                  <button
                    type="button"
                    key={sourceName}
                    className={(form.selectedNewsSources || []).includes(sourceName) ? "rss-source-chip active" : "rss-source-chip"}
                    onClick={() => toggleNewsSource(sourceName)}
                  >
                    {sourceName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.type === "tela_corporativa_personalizada" && (
            <div className="template-color-panel">
              <div className="playlist-section-title compact">
                <div>
                  <h3>Tela Corporativa Personalizada</h3>
                  <p>Configure identidade, clima, hora, fundo e conteúdo principal.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Tema visual</label>
                  <select
                    value={form.corporateTheme || "corporate_dark"}
                    onChange={(e) => setForm({
                      ...form,
                      corporateTheme: e.target.value,
                      backgroundTheme:
                        e.target.value === "elevator_premium"
                          ? "glass_panels"
                          : e.target.value === "minimal_light"
                            ? "light_premium"
                            : e.target.value === "neon_corporate"
                              ? "neon_gradient"
                              : "corporate_dark",
                    })}
                  >
                    <option value="corporate_dark">Corporativo Dark</option>
                    <option value="elevator_premium">Elevador Premium</option>
                    <option value="minimal_light">Minimal Light</option>
                    <option value="neon_corporate">Neon Corporativo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Usar logo do cliente</label>
                  <select
                    value={form.useClientLogo === false ? "nao" : "sim"}
                    onChange={(e) => setForm({
                      ...form,
                      useClientLogo: e.target.value === "sim",
                      logoUrl: e.target.value === "sim" ? client.logoUrl || form.logoUrl || "" : form.logoUrl,
                    })}
                  >
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Logo personalizada</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleTemplateImageUpload(event, "customLogoUrl", "logo")}
                  />
                  <input
                    value={form.customLogoUrl || ""}
                    placeholder="URL da logo personalizada"
                    onChange={(e) => setForm({ ...form, customLogoUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Marca / título</label>
                  <input
                    value={form.brandTitle || ""}
                    onChange={(e) => setForm({ ...form, brandTitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Subtítulo da marca</label>
                  <input
                    value={form.brandSubtitle || ""}
                    onChange={(e) => setForm({ ...form, brandSubtitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fundo</label>
                  <select
                    value={form.backgroundMode || "gradient"}
                    onChange={(e) => setForm({ ...form, backgroundMode: e.target.value })}
                  >
                    <option value="gradient">Gradiente do tema</option>
                    <option value="solid">Cor sólida</option>
                    <option value="image">Imagem personalizada</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Imagem de fundo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleTemplateImageUpload(event, "backgroundUrl", "background")}
                  />
                  <input
                    value={form.backgroundUrl || ""}
                    placeholder="URL da imagem de fundo"
                    onChange={(e) => setForm({ ...form, backgroundUrl: e.target.value, backgroundMode: e.target.value ? "image" : form.backgroundMode })}
                  />
                </div>

                <div className="form-group">
                  <label>Sobreposição do fundo (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={form.overlayOpacity || "55"}
                    onChange={(e) => setForm({ ...form, overlayOpacity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Título do conteúdo</label>
                  <input
                    value={form.mainTitle || ""}
                    onChange={(e) => setForm({ ...form, mainTitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Subtítulo do conteúdo</label>
                  <input
                    value={form.mainSubtitle || ""}
                    onChange={(e) => setForm({ ...form, mainSubtitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Imagem principal</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleTemplateImageUpload(event, "mainImageUrl", "main")}
                  />
                  <input
                    value={form.mainImageUrl || ""}
                    placeholder="URL da imagem principal"
                    onChange={(e) => setForm({ ...form, mainImageUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Benefícios (separados por vírgula)</label>
                  <input
                    value={Array.isArray(form.benefits) ? form.benefits.join(", ") : form.benefits || ""}
                    onChange={(e) => setForm({
                      ...form,
                      benefits: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                    })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Texto principal</label>
                <textarea
                  value={form.mainText || ""}
                  onChange={(e) => setForm({ ...form, mainText: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Texto institucional do rodapé</label>
                <input
                  value={form.footerText || ""}
                  onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.type === "cardapio_premium" && (
            <div className="template-color-panel">
              <div className="playlist-section-title compact">
                <div>
                  <h3>Itens do cardápio</h3>
                  <p>Edite categorias, produtos, descrições e preços.</p>
                </div>

                <button
                  type="button"
                  className="client-action primary"
                  onClick={() =>
                    addArrayItem("menuItems", {
                      category: "Categoria",
                      name: "Novo produto",
                      description: "Descrição do produto",
                      price: "R$ 0,00",
                    })
                  }
                >
                  + Item
                </button>
              </div>

              {(form.menuItems || []).map((item, index) => (
                <div className="form-grid" key={`menu-item-${index}`}>
                  <div className="form-group">
                    <label>Categoria</label>
                    <input
                      value={item.category || ""}
                      onChange={(e) =>
                        updateArrayItem("menuItems", index, "category", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Produto</label>
                    <input
                      value={item.name || ""}
                      onChange={(e) =>
                        updateArrayItem("menuItems", index, "name", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Descrição</label>
                    <input
                      value={item.description || ""}
                      onChange={(e) =>
                        updateArrayItem("menuItems", index, "description", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Preço</label>
                    <input
                      value={item.price || ""}
                      onChange={(e) =>
                        updateArrayItem("menuItems", index, "price", e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => removeArrayItem("menuItems", index)}
                  >
                    Remover
                  </button>
                </div>
              ))}

              <div className="form-group">
                <label>Chamada do rodapé</label>
                <input
                  value={form.callToAction || ""}
                  onChange={(e) => setForm({ ...form, callToAction: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.type === "promocao_premium" && (
            <div className="template-color-panel">
              <div className="playlist-section-title compact">
                <div>
                  <h3>Produtos em promoção</h3>
                  <p>Edite produto, descrição, preço antigo e preço promocional.</p>
                </div>

                <button
                  type="button"
                  className="client-action primary"
                  onClick={() =>
                    addArrayItem("promoItems", {
                      name: "Nova oferta",
                      description: "Descrição da oferta",
                      oldPrice: "R$ 0,00",
                      price: "R$ 0,00",
                    })
                  }
                >
                  + Oferta
                </button>
              </div>

              {(form.promoItems || []).map((item, index) => (
                <div className="form-grid" key={`promo-item-${index}`}>
                  <div className="form-group">
                    <label>Produto</label>
                    <input
                      value={item.name || ""}
                      onChange={(e) =>
                        updateArrayItem("promoItems", index, "name", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Descrição</label>
                    <input
                      value={item.description || ""}
                      onChange={(e) =>
                        updateArrayItem("promoItems", index, "description", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Preço antigo</label>
                    <input
                      value={item.oldPrice || ""}
                      onChange={(e) =>
                        updateArrayItem("promoItems", index, "oldPrice", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Preço promocional</label>
                    <input
                      value={item.price || ""}
                      onChange={(e) =>
                        updateArrayItem("promoItems", index, "price", e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => removeArrayItem("promoItems", index)}
                  >
                    Remover
                  </button>
                </div>
              ))}

              <div className="form-group">
                <label>Chamada da promoção</label>
                <input
                  value={form.callToAction || ""}
                  onChange={(e) => setForm({ ...form, callToAction: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.type === "corporativo_premium" && (
            <div className="template-color-panel">
              <div className="playlist-section-title compact">
                <div>
                  <h3>Comunicação corporativa</h3>
                  <p>Edite avisos, agenda e indicadores exibidos na TV.</p>
                </div>
              </div>

              <div className="playlist-section-title compact">
                <div>
                  <h3>Avisos</h3>
                  <p>Mensagens rápidas da empresa.</p>
                </div>

                <button
                  type="button"
                  className="client-action primary"
                  onClick={() => addArrayItem("corporateItems", "Novo aviso corporativo")}
                >
                  + Aviso
                </button>
              </div>

              {(form.corporateItems || []).map((item, index) => (
                <div className="form-grid" key={`corporate-item-${index}`}>
                  <div className="form-group">
                    <label>Aviso {index + 1}</label>
                    <input
                      value={item || ""}
                      onChange={(e) =>
                        updateTextArrayItem("corporateItems", index, e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => removeArrayItem("corporateItems", index)}
                  >
                    Remover
                  </button>
                </div>
              ))}

              <div className="playlist-section-title compact">
                <div>
                  <h3>Agenda</h3>
                  <p>Horários, eventos e responsáveis.</p>
                </div>

                <button
                  type="button"
                  className="client-action primary"
                  onClick={() =>
                    addArrayItem("agendaItems", {
                      time: "00:00",
                      title: "Novo evento",
                      responsible: "Responsável",
                    })
                  }
                >
                  + Agenda
                </button>
              </div>

              {(form.agendaItems || []).map((item, index) => (
                <div className="form-grid" key={`agenda-item-${index}`}>
                  <div className="form-group">
                    <label>Hora</label>
                    <input
                      value={item.time || ""}
                      onChange={(e) =>
                        updateArrayItem("agendaItems", index, "time", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Evento</label>
                    <input
                      value={item.title || ""}
                      onChange={(e) =>
                        updateArrayItem("agendaItems", index, "title", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Responsável</label>
                    <input
                      value={item.responsible || ""}
                      onChange={(e) =>
                        updateArrayItem("agendaItems", index, "responsible", e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => removeArrayItem("agendaItems", index)}
                  >
                    Remover
                  </button>
                </div>
              ))}

              <div className="playlist-section-title compact">
                <div>
                  <h3>Indicadores</h3>
                  <p>Metas, números e status.</p>
                </div>

                <button
                  type="button"
                  className="client-action primary"
                  onClick={() =>
                    addArrayItem("indicatorItems", {
                      label: "Indicador",
                      value: "0",
                      note: "Descrição",
                    })
                  }
                >
                  + Indicador
                </button>
              </div>

              {(form.indicatorItems || []).map((item, index) => (
                <div className="form-grid" key={`indicator-item-${index}`}>
                  <div className="form-group">
                    <label>Nome</label>
                    <input
                      value={item.label || ""}
                      onChange={(e) =>
                        updateArrayItem("indicatorItems", index, "label", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Valor</label>
                    <input
                      value={item.value || ""}
                      onChange={(e) =>
                        updateArrayItem("indicatorItems", index, "value", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Observação</label>
                    <input
                      value={item.note || ""}
                      onChange={(e) =>
                        updateArrayItem("indicatorItems", index, "note", e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => removeArrayItem("indicatorItems", index)}
                  >
                    Remover
                  </button>
                </div>
              ))}

              <div className="form-group">
                <label>Rodapé corporativo</label>
                <input
                  value={form.footerText || ""}
                  onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.type === "resultados_esportivos_premium" && (
            <div className="template-color-panel sports-template-editor">
              <div className="playlist-section-title compact">
                <div>
                  <h3>Resultados Esportivos Premium</h3>
                  <p>Busca dados reais gratuitos na TheSportsDB e usa dados manuais apenas como reserva.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Fonte de dados</label>
                  <input value="TheSportsDB gratuita + fallback manual" readOnly />
                </div>

                <div className="form-group">
                  <label>Foco do futebol</label>
                  <select
                    value={getSportsFootballMode(form)}
                    onChange={(e) => setForm({ ...form, footballMode: e.target.value })}
                  >
                    <option value="brasileirao_a">Brasileirao Serie A masculino</option>
                    <option value="selected">Campeonatos selecionados abaixo</option>
                    <option value="manual">Usar apenas jogos manuais</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cidade/local opcional</label>
                  <input
                    value={form.city || ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Tema visual</label>
                  <select
                    value={form.sportsTheme || "corporate_broadcast"}
                    onChange={(e) => setForm({ ...form, sportsTheme: e.target.value })}
                  >
                    <option value="corporate_broadcast">Corporativo Broadcast</option>
                    <option value="arena_dark">Arena Dark</option>
                    <option value="neon_scoreboard">Neon Scoreboard</option>
                    <option value="minimal_premium">Minimal Premium</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Alternancia entre jogos ao vivo</label>
                  <select
                    value={String(form.liveRotationInterval || "15")}
                    onChange={(e) => setForm({ ...form, liveRotationInterval: e.target.value })}
                  >
                    <option value="10">10s</option>
                    <option value="15">15s</option>
                    <option value="20">20s</option>
                    <option value="30">30s</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Animacoes do placar</label>
                  <select
                    value={form.enableScoreAnimations === false ? "nao" : "sim"}
                    onChange={(e) => setForm({ ...form, enableScoreAnimations: e.target.value === "sim" })}
                  >
                    <option value="sim">Sim</option>
                    <option value="nao">Nao</option>
                  </select>
                </div>

                {[
                  ["showTime", "Mostrar hora"],
                  ["showDate", "Mostrar data"],
                  ["showSportsNews", "Mostrar noticias esportivas"],
                  ["showUpcomingGames", "Mostrar proximos jogos"],
                  ["showOtherSports", "Mostrar outros esportes"],
                ].map(([field, label]) => (
                  <div className="form-group" key={field}>
                    <label>{label}</label>
                    <select
                      value={form[field] === false ? "nao" : "sim"}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value === "sim" })}
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Nao</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="sports-config-group">
                <h4>Campeonatos de Futebol</h4>
                <p>
                  No foco Serie A, o template busca apenas Brasileiro Serie A masculino. Para liberar outros campeonatos, escolha "Campeonatos selecionados".
                </p>

                {Array.from(new Set(getSportsFootballCompetitions(form).filter(isMaleProfessionalFootballCompetition).map((item) => item.category))).map((category) => (
                  <div className="sports-competition-category" key={category}>
                    <strong>{category}</strong>
                    <div className="sports-chip-grid">
                      {getSportsFootballCompetitions(form)
                        .map((competition, index) => ({ competition, index }))
                        .filter(({ competition }) => isMaleProfessionalFootballCompetition(competition))
                        .filter(({ competition }) => competition.category === category)
                        .map(({ competition, index }) => (
                          <button
                            type="button"
                            key={competition.id}
                            className={[
                              competition.enabled ? "sports-chip active" : "sports-chip",
                              getSportsFootballMode(form) !== "selected" ? "disabled" : "",
                              getSportsFootballMode(form) === "brasileirao_a" && competition.id === "brasileirao_a" ? "active" : "",
                            ].filter(Boolean).join(" ")}
                            disabled={getSportsFootballMode(form) !== "selected"}
                            onClick={() => updateArrayItem("footballCompetitions", index, "enabled", !competition.enabled)}
                          >
                            {competition.name}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sports-config-group">
                <h4>Outros Esportes</h4>
                <div className="sports-other-grid">
                  {getOtherSportsOptions(form).map((sport, index) => (
                    <div className="sports-other-card" key={sport.id}>
                      <button
                        type="button"
                        className={sport.enabled ? "sports-chip active" : "sports-chip"}
                        onClick={() => updateArrayItem("otherSports", index, "enabled", !sport.enabled)}
                      >
                        {sport.name}
                      </button>
                      <select
                        value={sport.priority || "Media"}
                        onChange={(e) => updateArrayItem("otherSports", index, "priority", e.target.value)}
                      >
                        <option>Baixa</option>
                        <option>Media</option>
                        <option>Alta</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sports-config-group">
                <div className="playlist-section-title compact">
                  <div>
                    <h4>Jogos manuais / demo</h4>
                    <p>Edite jogos manuais de reserva. Eles aparecem apenas quando a fonte gratuita nao retornar partidas.</p>
                  </div>
                  <button
                    type="button"
                    className="client-action primary"
                    onClick={() =>
                      addArrayItem("sportsMatches", {
                        id: `manual-${Date.now()}`,
                        sport: "football",
                        competitionId: "brasileirao_a",
                        competitionName: "Campeonato Brasileiro Serie A",
                        status: "scheduled",
                        homeTeam: "Mandante",
                        awayTeam: "Visitante",
                        homeScore: 0,
                        awayScore: 0,
                        startTime: "20:00",
                        matchTime: "",
                        period: "Pre-jogo",
                        venue: "Estadio",
                        lastEvent: "Proximo jogo",
                        priority: 3,
                      })
                    }
                  >
                    + Jogo
                  </button>
                </div>

                {(form.sportsMatches || []).map((match, index) => (
                  <div className="form-grid sports-match-form" key={match.id || index}>
                    <div className="form-group">
                      <label>Campeonato</label>
                      <input value={match.competitionName || ""} onChange={(e) => updateArrayItem("sportsMatches", index, "competitionName", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>ID do campeonato</label>
                      <select value={match.competitionId || "brasileirao_a"} onChange={(e) => updateArrayItem("sportsMatches", index, "competitionId", e.target.value)}>
                        {getSportsFootballCompetitions(form).filter(isMaleProfessionalFootballCompetition).map((competition) => (
                          <option key={competition.id} value={competition.id}>{competition.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={match.status || "scheduled"} onChange={(e) => updateArrayItem("sportsMatches", index, "status", e.target.value)}>
                        <option value="live">Ao vivo</option>
                        <option value="halftime">Intervalo</option>
                        <option value="finished">Encerrado</option>
                        <option value="scheduled">Proximo</option>
                        <option value="postponed">Adiado</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mandante</label>
                      <input value={match.homeTeam || ""} onChange={(e) => updateArrayItem("sportsMatches", index, "homeTeam", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Visitante</label>
                      <input value={match.awayTeam || ""} onChange={(e) => updateArrayItem("sportsMatches", index, "awayTeam", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Logo mandante</label>
                      <input value={match.homeLogo || ""} placeholder="https://..." onChange={(e) => updateArrayItem("sportsMatches", index, "homeLogo", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Logo visitante</label>
                      <input value={match.awayLogo || ""} placeholder="https://..." onChange={(e) => updateArrayItem("sportsMatches", index, "awayLogo", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Placar mandante</label>
                      <input type="number" value={match.homeScore ?? 0} onChange={(e) => updateArrayItem("sportsMatches", index, "homeScore", Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>Placar visitante</label>
                      <input type="number" value={match.awayScore ?? 0} onChange={(e) => updateArrayItem("sportsMatches", index, "awayScore", Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>Tempo / horario</label>
                      <input value={match.matchTime || match.startTime || ""} onChange={(e) => updateArrayItem("sportsMatches", index, match.status === "scheduled" ? "startTime" : "matchTime", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Ultimo evento</label>
                      <input value={match.lastEvent || ""} onChange={(e) => updateArrayItem("sportsMatches", index, "lastEvent", e.target.value)} />
                    </div>
                    <button type="button" className="delete-button" onClick={() => removeArrayItem("sportsMatches", index)}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="template-color-panel">
            <div className="playlist-section-title compact">
              <div>
                <h3>Cores do template</h3>
                <p>Personalize a identidade visual exibida na TV.</p>
              </div>
            </div>

            <div className="template-color-grid">
              <label className="template-theme-select">
                <span>Tema de fundo</span>
                <select
                  value={getTemplateBackgroundTheme(form)}
                  onChange={(e) => setForm({ ...form, backgroundTheme: e.target.value })}
                >
                  {TEMPLATE_BACKGROUND_THEMES.map((theme) => (
                    <option key={theme.value} value={theme.value}>{theme.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Primária</span>
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                />
              </label>

              <label>
                <span>Secundária</span>
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                />
              </label>

              <label>
                <span>Destaque</span>
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                />
              </label>

              <label>
                <span>Texto</span>
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="target-screens-box">
            <div className="playlist-section-title compact">
              <div>
                <h3>Telas de destino</h3>
                <p>Se não selecionar nenhuma, poderá aplicar em todas.</p>
              </div>

              <span>{form.targetScreenIds.length} tela(s)</span>
            </div>

            <div className="target-screens-grid">
              {screens.length === 0 ? (
                <div className="empty-library">Cadastre uma tela primeiro.</div>
              ) : (
                screens.map((screen) => (
                  <button
                    type="button"
                    key={screen.id}
                    className={
                      form.targetScreenIds.includes(screen.id)
                        ? "target-screen-card selected"
                        : "target-screen-card"
                    }
                    onClick={() => toggleTargetScreen(screen.id)}
                  >
                    <Monitor size={22} />

                    <div>
                      <strong>{screen.name}</strong>
                      <span>{screen.location}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="panel-actions">
            {editingTemplate && (
              <button className="client-action" type="button" onClick={resetForm} disabled={saving}>
                Cancelar edição
              </button>
            )}
            <button className="upload-button" onClick={handleSaveTemplate} disabled={saving}>
              <Plus size={20} />
              {saving ? "Salvando..." : editingTemplate ? "Salvar alterações" : "Salvar template"}
            </button>
          </div>
        </div>

        <div className="templates-preview-panel">
          <div className="template-preview-heading">
            <div>
              <div className="kicker">Preview automático</div>
              <h2>{previewOrientation}</h2>
              <p>Atualiza em tempo real conforme você edita o template.</p>
            </div>
            <div className="template-orientation-switch">
              <button
                type="button"
                className={previewOrientation === "Paisagem" ? "active" : ""}
                onClick={() => setPreviewOrientation("Paisagem")}
                disabled={form.orientation === "Retrato"}
              >
                Paisagem
              </button>
              <button
                type="button"
                className={previewOrientation === "Retrato" ? "active" : ""}
                onClick={() => setPreviewOrientation("Retrato")}
                disabled={form.orientation === "Paisagem"}
              >
                Retrato
              </button>
            </div>
          </div>
          <div className={`template-preview-stage ${previewOrientation === "Retrato" ? "portrait" : "landscape"}`}>
            <TemplateVisualPreview template={{ ...form, orientation: previewOrientation }} compact={false} />
          </div>
        </div>
      </section>

      <section className="templates-list-panel">
        <div className="playlist-editor-header">
          <div>
            <h2>Templates cadastrados</h2>
            <p>Esses templates entram no loop da TV com a duração configurada.</p>
          </div>
        </div>

        <div className="templates-list-grid">
          {templates.length === 0 ? (
            <div className="empty-library">Nenhum template criado ainda.</div>
          ) : (
            templates.map((template) => (
              <div className="template-saved-card" key={template.id}>
                <div className={`template-saved-preview-shell ${template.orientation === "Retrato" ? "portrait" : "landscape"}`}>
                  <TemplateVisualPreview template={template} />
                </div>

                <div className="template-saved-info">
                  <div>
                    <strong>{template.name}</strong>
                    <span>
                      {getTemplateTypeLabel(template.type)} • {template.duration || 15}s • {template.orientation}
                    </span>
                  </div>

                  <div className="template-actions-row">
                    <button
                      className="client-action"
                      onClick={() => startEditTemplate(template)}
                    >
                      Editar
                    </button>
                    <button
                      className={template.enabled ? "client-action primary" : "client-action"}
                      onClick={() => toggleTemplate(template)}
                    >
                      {template.enabled ? "Ativo" : "Desativado"}
                    </button>

                    <button
                      className="client-action primary"
                      onClick={() => applyTemplateToScreens(template)}
                    >
                      Aplicar nas telas
                    </button>

                    <button
                      className="client-action danger"
                      onClick={() => deleteTemplate(template)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function SparklineIcon() {
  return (
    <div className="sparkline-icon">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

function TemplateVisualPreview({ template, compact = false, tv = false }) {
  const [locationRotationTick, setLocationRotationTick] = useState(Date.now());
  const activeTemplate = (template.templateType || template.type) === "clima_premium_v2"
    ? {
        ...template,
        weatherCity: getActiveTemplateWeatherCity(template, locationRotationTick),
        city: getActiveTemplateWeatherCity(template, locationRotationTick),
        tideBeach: getActiveTemplateTideBeach(template, locationRotationTick),
      }
    : template;
  const initialLiveContent = getCachedTemplateLiveContent(activeTemplate);
  const [weather, setWeather] = useState(initialLiveContent?.weather || null);
  const [news, setNews] = useState(initialLiveContent?.news || DEFAULT_NEWS_ITEMS);
  const [realSportsData, setRealSportsData] = useState(initialLiveContent?.sportsData || null);
  const [realTideForecast, setRealTideForecast] = useState(initialLiveContent?.tideForecast || null);
  const [loading, setLoading] = useState(false);
  const [clockTick, setClockTick] = useState(() => new Date());
  const liveContentKey = getTemplateLiveContentCacheKey(activeTemplate);

  useEffect(() => {
    const interval = setInterval(() => setClockTick(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ((template.templateType || template.type) !== "clima_premium_v2") return undefined;
    const intervalMs = getTemplateLocationRotationSeconds(template) * 1000;
    const interval = setInterval(() => setLocationRotationTick(Date.now()), Math.max(10000, intervalMs));
    return () => clearInterval(interval);
  }, [template.templateType, template.type, template.locationRotationInterval, template.tideRotationInterval, template.weatherCities, template.tideBeaches]);

  useEffect(() => {
    let cancelled = false;

    function applyLiveContent(data = {}) {
      if (data.weather) setWeather(data.weather);
      if (data.news) setNews(data.news.length ? data.news : DEFAULT_NEWS_ITEMS);
      if (Object.hasOwn(data, "sportsData")) setRealSportsData(data.sportsData);
      if (Object.hasOwn(data, "tideForecast")) setRealTideForecast(data.tideForecast);
    }

    async function loadTemplateContent(force = false) {
      try {
        const cached = getCachedTemplateLiveContent(activeTemplate);
        if (!force && cached && !cancelled) applyLiveContent(cached);

        setLoading(!cached);

        const data = await primeTemplateLiveContent(activeTemplate, { force });
        if (!cancelled && data) applyLiveContent(data);
      } catch (error) {
        console.log(error);

        if (isWeatherLiveTemplate(template.templateType || template.type) && !cancelled) {
          setWeather({
            city: getTemplateWeatherCity(activeTemplate) || "Sua cidade",
            temperature: "--",
            sensation: "--",
            humidity: "--",
            wind: "--",
            source: "Aguardando atualização",
          });
        }

        if (isRssTemplateType(template.templateType || template.type) && !cancelled) {
          setNews(DEFAULT_NEWS_ITEMS);
        }

        if ((template.templateType || template.type) === "resultados_esportivos_premium" && !cancelled) {
          setRealSportsData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTemplateContent();

    const refreshInterval = (template.templateType || template.type) === "resultados_esportivos_premium"
      ? 3 * 60 * 1000
      : 10 * 60 * 1000;
    const interval = setInterval(() => loadTemplateContent(true), refreshInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveContentKey]);

  const realTemplateType = template.templateType || template.type;
  const isPortrait = template.orientation === "Retrato";
  const orientationLabel = isPortrait ? "Retrato" : "Paisagem";
  const newsRotationIndex = getRotatingNewsIndex(news, template);
  const rotatedNews = rotateNewsItems(news, newsRotationIndex);
  const mainNews = rotatedNews[0] || DEFAULT_NEWS_ITEMS[0];
  const mainNewsTitle = getNewsItemTitle(mainNews);
  const mainNewsTitleSize = compact
    ? 18
    : isPortrait
      ? mainNewsTitle.length > 95
        ? 22
        : mainNewsTitle.length > 65
          ? 26
          : mainNewsTitle.length > 42
            ? 30
            : 34
      : mainNewsTitle.length > 95
        ? 30
      : mainNewsTitle.length > 60
        ? 35
        : 42;
  const forecastCards = getWeatherForecastCards(weather);
  const tideForecast = realTemplateType === "clima_premium_v2"
    ? (realTideForecast || getTideForecastForTemplate(activeTemplate))
    : null;
  const weatherReferenceDate = getWeatherReferenceDate(weather);
  const clockParts = getTemplateClockParts(template, clockTick);
  const tickerSpeed = getTemplateTickerSpeed(template.tickerSpeed);
  const isLiveCompactTemplate = ["clima", "noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium", "receitas_fitness_premium", "tendencia_beleza_premium", "fofocas_premium", "tela_corporativa_personalizada"].includes(realTemplateType);
  const isTemplateVisible = (field) => template[field] !== false;
  const sportsData = realTemplateType === "resultados_esportivos_premium"
    ? (realSportsData || getSportsData(template))
    : null;
  const sportsUsingRealData = sportsData?.source === "TheSportsDB";
  const liveRotationMs = Math.max(10, Number(template.liveRotationInterval || 15)) * 1000;
  const sportsLiveIndex = sportsData?.liveFootball?.length
    ? Math.floor(Date.now() / liveRotationMs) % sportsData.liveFootball.length
    : 0;
  const primarySportsMatch = sportsData?.liveFootball?.[sportsLiveIndex]
    || sportsData?.primaryMatch
    || DEFAULT_SPORTS_MATCHES[0];
  const sportsUpcomingList = sportsData?.liveFootball?.length
    ? sportsData.liveFootball
    : sportsData?.upcomingFootball?.length
      ? sportsData.upcomingFootball
      : sportsData?.finishedFootball || [];
  const sportsRecentList = sportsData?.finishedFootball?.length
    ? sportsData.finishedFootball
    : sportsData?.upcomingFootball || [];
  const sportsTableRows = realTemplateType === "resultados_esportivos_premium"
    ? buildSportsTableRows(sportsData || {}, template)
    : [];
  const sportsTickerText = realTemplateType === "resultados_esportivos_premium"
    ? buildSportsTickerText(template, sportsData || {}, primarySportsMatch)
    : "";
  const sportsHeadline = primarySportsMatch
    ? (template.subtitle || `${primarySportsMatch.homeTeam} e ${primarySportsMatch.awayTeam} movimentam a rodada`)
    : (template.subtitle || "Boletim esportivo corporativo");
  const corporateLogoUrl = template.customLogoUrl
    || (template.useClientLogo === false ? "" : template.logoUrl)
    || template.logoUrl
    || logo;
  const corporateBenefits = Array.isArray(template.benefits)
    ? template.benefits
    : String(template.benefits || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const corporateOverlayOpacity = Math.min(90, Math.max(0, Number(template.overlayOpacity ?? 55))) / 100;
  const corporateBackgroundStyle = realTemplateType === "tela_corporativa_personalizada"
    ? {
        "--corporate-overlay": corporateOverlayOpacity,
        backgroundImage:
          template.backgroundMode === "image" && template.backgroundUrl
            ? `linear-gradient(135deg, rgba(2, 6, 23, ${corporateOverlayOpacity}), rgba(15, 23, 42, ${Math.min(0.92, corporateOverlayOpacity + 0.18)})), url("${template.backgroundUrl}")`
            : undefined,
      }
    : {};
  const footerTickerText = isRssTemplateType(realTemplateType)
    ? buildSequentialNewsTicker(rotatedNews, template)
    : realTemplateType === "clima"
      ? `Clima em ${weather?.city || template.city || "sua cidade"} • Atualização automática`
      : realTemplateType === "cardapio_premium"
        ? `${template.title || "Cardápio Digital"} • Produtos, categorias e preços`
        : realTemplateType === "promocao_premium"
          ? `${template.title || "Ofertas da Semana"} • Promoções em destaque`
          : realTemplateType === "corporativo_premium"
            ? `${template.title || "Comunicação Corporativa"} • Avisos, agenda e indicadores`
            : realTemplateType === "resultados_esportivos_premium"
              ? sportsTickerText
              : template.subtitle || "Template profissional para TV";

  if (realTemplateType === "marketing_art") {
    return <MarketingArtPreview art={template} compact={compact} tv={tv} />;
  }

  const premiumFrameStyle = {
    minHeight: 0,
    height: "100%",
    boxSizing: "border-box",
    padding: compact ? "40px 8px 26px" : isPortrait ? "86px 24px 58px" : "78px 32px 58px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: compact ? 10 : 18,
    position: "relative",
    zIndex: 2,
  };

  const premiumGridStyle = {
    display: "grid",
    gridTemplateColumns: isPortrait || compact ? "1fr" : "1.25fr 0.75fr",
    gridTemplateRows: isPortrait && !compact ? "minmax(0, 1.05fr) minmax(0, 0.95fr)" : undefined,
    gap: compact ? 10 : 18,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  };

  return (
    <div
      className={`template-tv-preview template-${realTemplateType} template-bg-${getTemplateBackgroundTheme(template)} template-orientation-${isPortrait ? "portrait" : "landscape"} ticker-${tickerSpeed} ${isLiveCompactTemplate ? "template-live-compact" : ""} ${compact ? "compact" : ""}`}
      style={{ ...getTemplateThemeStyle(template, footerTickerText), ...corporateBackgroundStyle }}
    >
      <div className="template-orb one"></div>
      <div className="template-orb two"></div>

      {isTemplateVisible("showHeader") && realTemplateType !== "tela_corporativa_personalizada" && <div className="template-tv-topbar">
        <div className="template-client-brand">
          {isTemplateVisible("showLogo") && template.logoUrl && (
            <img src={template.logoUrl} alt="Logo do cliente" />
          )}
          {isTemplateVisible("showTitle") && <span>{template.title || "Totem Park"} • {orientationLabel}</span>}
        </div>
        <strong>{clockParts.time}</strong>
      </div>}

      {realTemplateType === "tela_corporativa_personalizada" && (
        <div className={`template-corporate-custom theme-${template.corporateTheme || "corporate_dark"}`}>
          <header className="corporate-custom-header">
            <div className="corporate-custom-brand">
              {isTemplateVisible("showLogo") && (
                <span className="corporate-custom-logo">
                  {corporateLogoUrl ? (
                    <img src={corporateLogoUrl} alt="Logo" />
                  ) : (
                    (template.brandTitle || template.title || "TP").slice(0, 2).toUpperCase()
                  )}
                </span>
              )}
              <div>
                {isTemplateVisible("showTitle") && <strong>{template.brandTitle || template.title || "Tela Corporativa"}</strong>}
                {isTemplateVisible("showSubtitle") && (
                  <small>{template.brandSubtitle || template.subtitle || "Comunicacao corporativa"}</small>
                )}
              </div>
            </div>

            <div className="corporate-custom-live">
              {template.showClock !== false && (
                <div className="corporate-custom-clock">
                  <strong>{clockParts.time}</strong>
                  {template.showDate !== false && <span>{clockParts.date}</span>}
                </div>
              )}

              {template.showWeather !== false && (
                <div className="corporate-custom-weather">
                  <span>{getWeatherIconSafe(weather?.weatherCode, weatherReferenceDate)}</span>
                  <div>
                    <strong>{weather?.temperature ?? "--"}{"\u00b0C"}</strong>
                    <small>{weather?.city || getTemplateWeatherCity(template) || "Sua cidade"}</small>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="corporate-custom-main">
            <section className="corporate-custom-message">
              {isTemplateVisible("showBadge") && <div className="template-breaking">{getTemplateBadge(realTemplateType)}</div>}
              {isTemplateVisible("showTitle") && (
                <h2>{template.mainTitle || template.title || "Comunicados e campanhas em destaque"}</h2>
              )}
              {isTemplateVisible("showSubtitle") && (
                <p>{template.mainSubtitle || template.subtitle || "Painel institucional em tempo real"}</p>
              )}
              <span>{template.mainText || "Use este espaco para avisos, campanhas, indicadores e conteudos da sua empresa."}</span>

              <div className="corporate-custom-benefits">
                {(corporateBenefits.length ? corporateBenefits : ["Recepcao", "Elevadores", "Mural digital"]).slice(0, compact ? 2 : 4).map((item, index) => (
                  <b key={`${item}-${index}`}>{item}</b>
                ))}
              </div>
            </section>

            <section className="corporate-custom-media">
              {template.mainImageUrl ? (
                <img src={template.mainImageUrl} alt={template.mainTitle || template.title || "Conteudo"} />
              ) : (
                <div>
                  <LayoutDashboard size={compact ? 38 : 82} />
                  <strong>{template.callToAction || "Painel pronto para sua comunicacao"}</strong>
                </div>
              )}
            </section>
          </main>

          {!compact && template.showForecastDays !== false && (
            <section className="corporate-custom-forecast">
              {(forecastCards.length ? forecastCards : [
                { day: "SEG", icon: "☀", max: 32, min: 24 },
                { day: "TER", icon: "⛅", max: 31, min: 23 },
                { day: "QUA", icon: "☔", max: 29, min: 22 },
                { day: "QUI", icon: "☁", max: 30, min: 23 },
              ]).slice(0, 4).map((item, index) => (
                <div key={`${item.day}-${index}`}>
                  <strong>{item.day}</strong>
                  <span>{item.icon}</span>
                  <small>{item.max}{"\u00b0"} / {item.min}{"\u00b0"}</small>
                </div>
              ))}
            </section>
          )}

          {!compact && template.footerText && (
            <div className="corporate-custom-footer-text">
              {template.footerText}
            </div>
          )}
        </div>
      )}

      {(template.templateType || template.type) === "clima" && (
        <div className="template-weather-layout">
          <div>
            <small>Agora em</small>
            <h2>{weather?.city || getTemplateWeatherCity(template) || "Sua cidade"}</h2>
            {isTemplateVisible("showSubtitle") && <p>
              {template.subtitle || "Previsão atualizada automaticamente"}
              {weather?.source ? ` • ${weather.source}` : ""}
            </p>}
          </div>

          <div className="template-weather-temp">
            {loading && !weather ? "--" : `${weather?.temperature ?? "--"}°`}
          </div>

          <div className="template-weather-info">
            <span>Sensação {weather?.sensation ?? "--"}°</span>
            <span>Umidade {weather?.humidity ?? "--"}%</span>
            <span>Vento {weather?.wind ?? "--"} km/h</span>
          </div>
        </div>
      )}

      {(template.templateType || template.type) === "noticias" && (
        <div
          className="template-news-layout"
          style={{
            display: "grid",
            gridTemplateColumns: isPortrait || compact ? "1fr" : "1.05fr 0.95fr",
            gap: compact ? 12 : 30,
            alignItems: "center",
          }}
        >
          <div>
            <div className="template-breaking">
              {template.newsSource || "AO VIVO"}
            </div>

            {isTemplateVisible("showTitle") && <h2>{template.title || "Últimas notícias"}</h2>}
            {isTemplateVisible("showSubtitle") && <p>{template.subtitle || "Manchetes atualizadas automaticamente"}</p>}

            <div className="template-news-list">
              {rotatedNews.slice(0, compact ? 2 : 3).map((item, index) => (
                <div key={`${getNewsItemTitle(item)}-${index}`} className="template-news-item">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{getNewsItemTitle(item)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              minHeight: compact ? 120 : 330,
              borderRadius: compact ? 18 : 28,
              overflow: "hidden",
              background: "linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(147, 51, 234, 0.22))",
              border: "1px solid rgba(255,255,255,0.12)",
              position: "relative",
              display: "flex",
              alignItems: "stretch",
            }}
          >
            {getNewsItemImage(mainNews) ? (
              <img
                src={getNewsItemImage(mainNews)}
                alt={getNewsItemTitle(mainNews)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  minHeight: compact ? 120 : 330,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--template-accent)",
                }}
              >
                <Newspaper size={compact ? 42 : 88} />
              </div>
            )}

            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: compact ? 12 : 22,
                background: "linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.92))",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: compact ? 14 : 26,
                  lineHeight: 1.08,
                  color: "#ffffff",
                }}
              >
                {getNewsItemTitle(mainNews)}
              </strong>

              {!compact && (
                <p
                  style={{
                    marginTop: 10,
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 16,
                    lineHeight: 1.25,
                  }}
                >
                  {getNewsItemDescription(mainNews) ||
                    `${getNewsItemSource(mainNews, template.newsSource || "Notícias")} • ${getNewsItemTime(mainNews)}`}
                </p>
              )}

              <span
                style={{
                  display: "block",
                  marginTop: 10,
                  color: "var(--template-accent)",
                  fontWeight: 950,
                  fontSize: compact ? 11 : 14,
                }}
              >
                {getNewsItemSource(mainNews, template.newsSource || "Notícias")} • {getNewsItemTime(mainNews)}
              </span>
            </div>
          </div>
        </div>
      )}

      {realTemplateType === "clima_premium_v2" && (
        <div className="template-premium-weather-v2">
          <div className="premium-weather-hero">
            <div>
              {isTemplateVisible("showBadge") && <div className="template-breaking">{getTemplateBadge(realTemplateType)}</div>}
              {isTemplateVisible("showTitle") && <h2>{weather?.city || getTemplateWeatherCity(template) || "Sua cidade"}</h2>}
              <p>{weatherReferenceDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>

            <div className="premium-weather-current">
              <span className="premium-weather-icon">{getWeatherIconSafe(weather?.weatherCode, weatherReferenceDate)}</span>
              <strong className="weather-text-fixed">{loading && !weather ? "--" : <>{weather?.temperature ?? "--"}{"\u00b0C"}</>}</strong>
              <strong>{loading && !weather ? "--" : `${weather?.temperature ?? "--"}°C`}</strong>
              <small>{getWeatherConditionLabel(weather?.weatherCode, weatherReferenceDate)}</small>
              <em className="weather-text-fixed">Sensação {weather?.sensation ?? "--"}{"\u00b0C"}</em>
              <em>Sensacao {weather?.sensation ?? "--"}°C</em>
            </div>
          </div>

            {tideForecast && (
              <div className="premium-weather-tide">
                <div>
                  <span>Tábua de maré</span>
                  <strong>{tideForecast.beach}</strong>
                  <small>Estação {tideForecast.station}</small>
                </div>

                <div className="premium-tide-list">
                  {tideForecast.items.map((item) => (
                    <div className="premium-tide-row" key={`${item.time}-${item.label}`}>
                      <span>{item.time}</span>
                      <strong>{item.label}</strong>
                      <small>{item.height}</small>
                      <i style={{ "--tide-level": `${item.level}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          <div className="premium-weather-forecast">
            {(forecastCards.length ? forecastCards : [
              { day: "SEG", icon: "☀", max: 32, min: 24 },
              { day: "TER", icon: "⛅", max: 31, min: 23 },
              { day: "QUA", icon: "🌧", max: 29, min: 22 },
              { day: "QUI", icon: "☁", max: 30, min: 23 },
            ]).map((item, index) => (
              <div className="premium-weather-day" key={`${item.day}-${index}`}>
                <strong>{item.day}</strong>
                <span>{item.icon}</span>
                <small className="weather-text-fixed">{item.max}{"\u00b0"} / {item.min}{"\u00b0"}</small>
                <small>{item.max}° / {item.min}°</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {realTemplateType === "hora_certa_premium" && (
        <div className="template-premium-clock">
          <div className="premium-clock-main">
            {isTemplateVisible("showBadge") && <div className="template-breaking">{getTemplateBadge(realTemplateType)}</div>}
            <strong>{clockParts.time}</strong>
            <span>{clockParts.weekday}</span>
            <p>{clockParts.date}</p>
          </div>

          {template.showWeather !== false && (
            <div className="premium-clock-weather">
              <span>{getWeatherIconSafe(weather?.weatherCode, weatherReferenceDate)}</span>
              <strong className="weather-text-fixed">{weather?.temperature ?? "--"}{"\u00b0C"}</strong>
              <strong>{weather?.temperature ?? "--"}°C</strong>
              <small>{weather?.city || template.city || "Sua cidade"}</small>
              <em>{getWeatherConditionLabel(weather?.weatherCode, weatherReferenceDate)}</em>
            </div>
          )}
        </div>
      )}

      {realTemplateType === "resultados_esportivos_premium" && (
        <div
          className={[
            "template-sports-scoreboard",
            `sports-theme-${template.sportsTheme || "corporate_broadcast"}`,
            template.enableScoreAnimations === false ? "no-score-animation" : "",
          ].filter(Boolean).join(" ")}
        >
          {isTemplateVisible("showHeader") && <div className="sports-score-header">
            <div className="sports-brand">
              {isTemplateVisible("showLogo") && (template.logoUrl ? <img src={template.logoUrl} alt="Logo" /> : <Trophy size={compact ? 18 : 30} />)}
              <div>
                {isTemplateVisible("showTitle") && <strong>{template.title || "Resultados Esportivos"}</strong>}
                {isTemplateVisible("showSubtitle") && <span>{template.city || "Esportes ao vivo"}</span>}
              </div>
            </div>

            <div className="sports-clock-box">
              {template.showTime !== false && (
                <strong>{clockParts.time}</strong>
              )}
              {template.showDate !== false && (
                <span>{weatherReferenceDate.toLocaleDateString("pt-BR", { weekday: compact ? undefined : "short", day: "2-digit", month: "2-digit" })}</span>
              )}
              {sportsUsingRealData && sportsData.sourceSyncedAt && !compact && (
                <span>Atualizado {sportsData.sourceSyncedAt}</span>
              )}
            </div>

            {isTemplateVisible("showBadge") && <div className={`sports-status-pill ${primarySportsMatch.status === "live" ? "live" : ""}`}>
              {sportsUsingRealData && primarySportsMatch.status !== "live"
                ? "DADOS REAIS"
                : getMatchStatusLabel(primarySportsMatch.status)}
            </div>}
          </div>}

          <div className="sports-headline">
            <span>Boletim esportivo</span>
            <strong>{sportsHeadline}</strong>
          </div>

          <div className="sports-score-content">
            <div className="sports-main-match">
              <div className="sports-match-kicker">
                <span>{primarySportsMatch.competitionName}</span>
                <b>
                  {primarySportsMatch.dateEvent ? `${primarySportsMatch.dateEvent} - ` : ""}
                  {primarySportsMatch.matchTime || primarySportsMatch.startTime || "Horario a definir"}
                </b>
              </div>

              <div className="sports-teams-row">
                <div className="sports-team">
                  <div className="sports-team-logo">
                    {primarySportsMatch.homeLogo
                      ? <img src={primarySportsMatch.homeLogo} alt={primarySportsMatch.homeTeam} />
                      : getTeamInitials(primarySportsMatch.homeTeam)}
                  </div>
                  <strong>{primarySportsMatch.homeTeam}</strong>
                </div>

                <div className="sports-score">
                  {primarySportsMatch.status === "scheduled" ? (
                    <span>x</span>
                  ) : (
                    <>
                      <strong>{primarySportsMatch.homeScore ?? 0}</strong>
                      <span>x</span>
                      <strong>{primarySportsMatch.awayScore ?? 0}</strong>
                    </>
                  )}
                </div>

                <div className="sports-team">
                  <div className="sports-team-logo">
                    {primarySportsMatch.awayLogo
                      ? <img src={primarySportsMatch.awayLogo} alt={primarySportsMatch.awayTeam} />
                      : getTeamInitials(primarySportsMatch.awayTeam)}
                  </div>
                  <strong>{primarySportsMatch.awayTeam}</strong>
                </div>
              </div>

              <div className="sports-match-footer">
                <span>{primarySportsMatch.period || "Tempo nao informado"}</span>
                <strong>{primarySportsMatch.lastEvent || "Acompanhe os resultados aqui"}</strong>
              </div>

              {sportsData.liveFootball.length > 1 && (
                <div className="sports-rotation-note">
                  {sportsLiveIndex + 1} de {sportsData.liveFootball.length} ao vivo - alternancia automatica a cada {template.liveRotationInterval || 15}s
                </div>
              )}
            </div>

            <div className="sports-side-panel">
              <div className="sports-panel-card">
                <h4>
                  {sportsData.liveFootball.length ? "Jogos ao vivo" : "Proximos jogos"}
                </h4>
                {(sportsData.liveFootball.length
                  ? sportsData.liveFootball
                  : sportsUsingRealData && sportsData.upcomingFootball.length
                    ? sportsData.upcomingFootball
                    : sportsData.finishedFootball).slice(0, compact ? 2 : 4).map((match) => (
                  <div className="sports-mini-match" key={match.id}>
                    <span>{match.competitionName}</span>
                    <strong>{match.homeTeam} {match.status === "scheduled" ? "x" : `${match.homeScore ?? 0} x ${match.awayScore ?? 0}`} {match.awayTeam}</strong>
                    <small>{match.dateEvent ? `${match.dateEvent} - ` : ""}{getMatchStatusLabel(match.status)}</small>
                  </div>
                ))}
              </div>

              {template.showUpcomingGames !== false && (
                <div className="sports-panel-card">
                  <h4>{sportsUsingRealData ? "Resultados recentes" : "Proximos jogos"}</h4>
                  {(sportsUsingRealData && sportsData.finishedFootball.length
                    ? sportsData.finishedFootball
                    : sportsData.upcomingFootball).slice(0, compact ? 1 : 3).map((match) => (
                    <div className="sports-mini-match" key={match.id}>
                      <span>{match.dateEvent || match.startTime || "Horario a definir"} - {match.competitionName}</span>
                      <strong>
                        {match.homeTeam} {match.status === "scheduled" ? "x" : `${match.homeScore ?? 0} x ${match.awayScore ?? 0}`} {match.awayTeam}
                      </strong>
                      <small>{match.venue || "Local a definir"}</small>
                    </div>
                  ))}
                </div>
              )}

              <div className="sports-panel-card sports-table-card">
                <h4>Tabela</h4>
                {sportsTableRows.slice(0, compact ? 4 : 8).map((row, index) => (
                  <div className="sports-table-row" key={`${row.team}-${index}`}>
                    <span>{row.position || index + 1}</span>
                    <strong>{row.team}</strong>
                    <b>{row.points ?? row.pts ?? "-"}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {template.showOtherSports !== false && (
            <div className="sports-other-events">
              {sportsData.otherSportsEvents.slice(0, compact ? 2 : 4).map((event) => (
                <div className="sports-other-card" key={event.id}>
                  <div className="sports-other-logos">
                    <span className="sports-other-logo">
                      {event.homeLogo ? <img src={event.homeLogo} alt={event.homeTeam || event.sport} /> : getTeamInitials(event.homeTeam || event.sport)}
                    </span>
                    <em>x</em>
                    <span className="sports-other-logo">
                      {event.awayLogo ? <img src={event.awayLogo} alt={event.awayTeam || event.sport} /> : getTeamInitials(event.awayTeam || event.title)}
                    </span>
                  </div>
                  <span>{event.sport}{event.dateEvent ? ` • ${event.dateEvent}` : ""}</span>
                  <strong className="sports-other-score">{event.score}</strong>
                  <small className="sports-other-title">{event.title}</small>
                  <small className="sports-other-detail">{event.detail}</small>
                </div>
              ))}
            </div>
          )}

          {template.showSportsNews !== false && !compact && (
            <div className="sports-demo-note">
              Fonte: {sportsData.source === "TheSportsDB"
                ? "TheSportsDB gratuita - resultados e agenda reais"
                : "manual/demo - aguardando dados gratuitos disponiveis"}. Livescore minuto a minuto pode exigir fonte paga.
            </div>
          )}
        </div>
      )}

      {["receitas_fitness_premium", "tendencia_beleza_premium", "fofocas_premium"].includes(realTemplateType) && (
        <div className={`template-rss-magazine template-rss-${realTemplateType} news-focus`}>
          {isTemplateVisible("showHeader") && <header className="template-rss-magazine-header">
            <div className="template-rss-magazine-brand">
              {isTemplateVisible("showLogo") && <span>{realTemplateType === "receitas_fitness_premium" ? "RF" : realTemplateType === "tendencia_beleza_premium" ? "TB" : "FB"}</span>}
              <div>
                {isTemplateVisible("showTitle") && <strong>{template.title || getTemplateTypeLabel(realTemplateType)}</strong>}
                {isTemplateVisible("showSubtitle") && <small>{template.subtitle || getNewsItemSource(mainNews, "RSS atualizado")}</small>}
              </div>
            </div>
            {isTemplateVisible("showBadge") && <em>{getTemplateBadge(realTemplateType)}</em>}
          </header>}

          <main className="template-rss-magazine-body">
            <section className="template-rss-magazine-kicker">
              <div className="template-breaking">
                {realTemplateType === "receitas_fitness_premium" ? "Receita do dia" : realTemplateType === "tendencia_beleza_premium" ? "Destaque" : "Prioridade Brasil"}
              </div>
              <h2>
                {realTemplateType === "receitas_fitness_premium"
                  ? "Comida fitness para a rotina"
                  : realTemplateType === "tendencia_beleza_premium"
                    ? "Tendências reais de beleza e autocuidado"
                    : "Celebridades, TV e bastidores nacionais"}
              </h2>
              {!compact && (
                <p>
                  {realTemplateType === "receitas_fitness_premium"
                    ? "A matéria principal alterna receitas saudáveis com imagem, resumo e fonte."
                    : realTemplateType === "tendencia_beleza_premium"
                      ? "A notícia principal alterna com foto, título e resumo em visual editorial."
                      : "As notícias alternam com prioridade em fontes brasileiras e conteúdo nacional."}
                </p>
              )}
            </section>

            <article className="template-rss-magazine-main">
              <div className="template-rss-magazine-photo">
                {getNewsItemImage(mainNews) ? (
                  <img src={getNewsItemImage(mainNews)} alt={getNewsItemTitle(mainNews)} />
                ) : (
                  <div className="template-rss-magazine-placeholder">
                    {realTemplateType === "receitas_fitness_premium" ? <Coffee size={compact ? 34 : 64} /> : realTemplateType === "tendencia_beleza_premium" ? <Sparkles size={compact ? 34 : 64} /> : <Megaphone size={compact ? 34 : 64} />}
                  </div>
                )}
              </div>

              <div className="template-rss-magazine-copy">
                <div className="template-breaking">{getNewsItemSource(mainNews, template.newsSource || "RSS")}</div>
                <h3>{mainNewsTitle}</h3>
                {!compact && <p>{getNewsItemDescription(mainNews) || "Conteúdo em atualização automática."}</p>}
              </div>
            </article>
          </main>

          {!compact && (
            <section className="template-rss-magazine-cards">
              {rotatedNews.slice(1, 3).map((item, index) => (
                <div className="template-rss-mini-card" key={`${getNewsItemTitle(item)}-${index}`}>
                  <strong>{getNewsItemTitle(item)}</strong>
                  <span>{getNewsItemSource(item, template.newsSource || "RSS")}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {realTemplateType === "jornal_premium" && (
        <div className="template-premium-frame" style={premiumFrameStyle}>
          <div style={premiumGridStyle}>
            <div
              className="template-journal-main"
              style={{
                borderRadius: compact ? 18 : 30,
                overflow: "hidden",
                minHeight: compact ? 120 : isPortrait ? 0 : 360,
                height: isPortrait && !compact ? "100%" : undefined,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                position: "relative",
              }}
            >
              {getNewsItemImage(mainNews) ? (
                <img
                  src={getNewsItemImage(mainNews)}
                  alt={getNewsItemTitle(mainNews)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", minHeight: compact ? 120 : 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--template-accent)" }}>
                  <Newspaper size={compact ? 40 : 96} />
                </div>
              )}

              <div
                className="template-journal-overlay"
                style={{
                  position: "absolute",
                  inset: "auto 0 0 0",
                  maxHeight: isPortrait && !compact ? "88%" : "92%",
                  padding: compact ? 12 : isPortrait ? 20 : 26,
                  overflow: "hidden",
                  background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.94))",
                }}
              >
                <div className="template-breaking">{template.newsSource || getNewsItemSource(mainNews, "Notícias")}</div>
                <h2 style={{ margin: "8px 0 0", fontSize: mainNewsTitleSize, lineHeight: 1.02, overflowWrap: "anywhere" }}>
                  {mainNewsTitle}
                </h2>
                {!compact && (
                  <p style={{ marginTop: 10, color: "rgba(255,255,255,0.78)", fontSize: isPortrait ? 13 : 17, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: isPortrait ? 4 : 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {getNewsItemDescription(mainNews) || template.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div
              className="template-journal-sidebar"
              style={{
                display: "grid",
                gridTemplateColumns: isPortrait || compact ? "1fr 1fr" : "1fr",
                gridTemplateRows: isPortrait && !compact ? "auto minmax(0, 1fr)" : undefined,
                gap: compact ? 8 : 14,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <div className="template-journal-stat" style={{ borderRadius: 24, padding: compact ? 12 : 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <small>Clima</small>
                <h2 style={{ margin: "6px 0", fontSize: compact ? 22 : 42 }}>{weather?.temperature ?? "--"}°</h2>
                <p style={{ margin: 0 }}>{weather?.city || getTemplateWeatherCity(template) || "Sua cidade"}</p>
              </div>

              <div className="template-journal-stat" style={{ borderRadius: 24, padding: compact ? 12 : 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <small>Agora</small>
                <h2 style={{ margin: "6px 0", fontSize: compact ? 22 : 42 }}>
                  {clockParts.time}
                </h2>
                <p style={{ margin: 0 }}>{weatherReferenceDate.toLocaleDateString("pt-BR")}</p>
              </div>

              {!compact && (
                <div className="template-journal-headlines" style={{ borderRadius: 24, padding: 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", gridColumn: isPortrait ? "1 / -1" : "auto" }}>
                  <small>Manchetes</small>
                  {rotatedNews.slice(1, isPortrait ? 4 : 5).map((item, index) => (
                    <p className="template-journal-headline" key={`${getNewsItemTitle(item)}-${index}`} style={{ margin: "10px 0 0", fontWeight: 800 }}>
                      {String(index + 1).padStart(2, "0")} • {getNewsItemTitle(item)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {realTemplateType === "cardapio_premium" && (
        <div className="template-premium-frame" style={premiumFrameStyle}>
          <div
            style={{
              borderRadius: compact ? 18 : 30,
              padding: compact ? 14 : 30,
              background: "linear-gradient(135deg, rgba(6,182,212,0.22), rgba(147,51,234,0.24))",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <div className="template-breaking">CARDÁPIO DIGITAL</div>
            {isTemplateVisible("showTitle") && <h2 style={{ margin: "8px 0 0", fontSize: compact ? 22 : isPortrait ? 42 : 54 }}>{template.title || "Cardápio Digital"}</h2>}
            {isTemplateVisible("showSubtitle") && <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.74)" }}>{template.subtitle || "Produtos e preços em destaque"}</p>}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isPortrait || compact ? "1fr" : "repeat(2, 1fr)",
              gap: compact ? 10 : 16,
            }}
          >
            {getTemplateMenuItems(template).slice(0, compact ? 2 : 6).map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                style={{
                  borderRadius: compact ? 16 : 24,
                  padding: compact ? 12 : 22,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.13)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <small style={{ color: "var(--template-accent)", fontWeight: 900 }}>{item.category}</small>
                  <strong style={{ display: "block", fontSize: compact ? 15 : 22, marginTop: 4 }}>{item.name}</strong>
                  {!compact && item.description && (
                    <span style={{ display: "block", color: "rgba(255,255,255,0.62)", marginTop: 4, fontSize: 13 }}>
                      {item.description}
                    </span>
                  )}
                </div>
                <strong style={{ fontSize: compact ? 18 : 28, color: "var(--template-accent)" }}>{item.price}</strong>
              </div>
            ))}
          </div>

          {!compact && isTemplateVisible("showFooter") && (
            <div style={{ marginTop: "auto", borderRadius: 22, padding: 18, background: "rgba(0,0,0,0.26)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <span>{template.callToAction || "Peça pelo QR Code ou no balcão"}</span>
              <strong style={{ color: "var(--template-accent)" }}>{template.footerText || "Totem Park Menu"}</strong>
            </div>
          )}
        </div>
      )}

      {realTemplateType === "promocao_premium" && (
        <div className="template-premium-frame" style={premiumFrameStyle}>
          <div
            style={{
              borderRadius: compact ? 18 : 32,
              padding: compact ? 14 : 34,
              background: "linear-gradient(135deg, rgba(251,191,36,0.22), rgba(239,68,68,0.25), rgba(147,51,234,0.24))",
              border: "1px solid rgba(255,255,255,0.16)",
              textAlign: "center",
            }}
          >
            <div className="template-breaking">OFERTA ESPECIAL</div>
            {isTemplateVisible("showTitle") && <h2 style={{ margin: "8px 0", fontSize: compact ? 24 : isPortrait ? 46 : 64 }}>{template.title || "Ofertas da Semana"}</h2>}
            {isTemplateVisible("showSubtitle") && <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>{template.subtitle || "Promoções em destaque para sua TV"}</p>}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isPortrait || compact ? "1fr" : "1.25fr repeat(3, 1fr)",
              gap: compact ? 10 : 16,
              flex: 1,
            }}
          >
            {getTemplatePromoItems(template).slice(0, compact ? 2 : 4).map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                style={{
                  borderRadius: compact ? 16 : 26,
                  padding: compact ? 12 : 22,
                  background: index === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: compact ? 82 : isPortrait ? 120 : 210,
                }}
              >
                <small style={{ color: "rgba(255,255,255,0.62)", textDecoration: "line-through" }}>{item.oldPrice}</small>
                <strong style={{ marginTop: 8, fontSize: compact ? 15 : 22 }}>{item.name}</strong>
                {!compact && item.description && (
                  <small style={{ marginTop: 6, color: "rgba(255,255,255,0.62)", textDecoration: "none" }}>
                    {item.description}
                  </small>
                )}
                <span style={{ marginTop: 10, color: "var(--template-accent)", fontWeight: 1000, fontSize: index === 0 && !compact ? 46 : compact ? 22 : 32 }}>
                  {item.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {realTemplateType === "corporativo_premium" && (
        <div className="template-premium-frame" style={premiumFrameStyle}>
          <div style={premiumGridStyle}>
            <div
              style={{
                borderRadius: compact ? 18 : 30,
                padding: compact ? 14 : 30,
                background: "linear-gradient(135deg, rgba(15,23,42,0.82), rgba(88,28,135,0.46))",
                border: "1px solid rgba(255,255,255,0.16)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: compact ? 120 : isPortrait ? 260 : 360,
              }}
            >
              <div>
                <div className="template-breaking">COMUNICAÇÃO INTERNA</div>
                {isTemplateVisible("showTitle") && <h2 style={{ margin: "10px 0 0", fontSize: compact ? 22 : isPortrait ? 42 : 56 }}>{template.title || "Comunicação Corporativa"}</h2>}
                {isTemplateVisible("showSubtitle") && <p style={{ color: "rgba(255,255,255,0.76)" }}>{template.subtitle || "Avisos, agenda e indicadores em tempo real"}</p>}
              </div>

              {!compact && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {getTemplateIndicatorItems(template).slice(0, 3).map((item, index) => (
                    <div key={`${item.label}-${index}`} style={{ borderRadius: 18, padding: 16, background: "rgba(255,255,255,0.08)" }}>
                      <small>{item.label}</small>
                      <strong style={{ display: "block", marginTop: 6, color: "var(--template-accent)" }}>
                        {item.value}
                      </strong>
                      <span style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,0.62)", fontSize: 12 }}>{item.note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isPortrait || compact ? "1fr" : "1fr",
                gap: compact ? 8 : 14,
              }}
            >
              {getTemplateCorporateItems(template).slice(0, compact ? 2 : 3).map((item, index) => (
                <div key={`${item}-${index}`} style={{ borderRadius: 22, padding: compact ? 12 : 20, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)" }}>
                  <small style={{ color: "var(--template-accent)", fontWeight: 900 }}>Aviso {String(index + 1).padStart(2, "0")}</small>
                  <strong style={{ display: "block", marginTop: 8 }}>{item}</strong>
                </div>
              ))}

              {!compact && getTemplateAgendaItems(template).slice(0, 2).map((item, index) => (
                <div key={`${item.time}-${index}`} style={{ borderRadius: 22, padding: compact ? 12 : 20, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)" }}>
                  <small style={{ color: "var(--template-accent)", fontWeight: 900 }}>{item.time}</small>
                  <strong style={{ display: "block", marginTop: 8 }}>{item.title}</strong>
                  <span style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,0.62)" }}>{item.responsible}</span>
                </div>
              ))}

              <div style={{ borderRadius: 22, padding: compact ? 12 : 20, background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.13)" }}>
                <small>Agora</small>
                <strong style={{ display: "block", marginTop: 8, fontSize: compact ? 20 : 34 }}>
                  {clockParts.time}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {((template.templateType || template.type) === "comercial" || (template.templateType || template.type) === "aviso") && (
        <div className="template-generic-layout">
          {isTemplateVisible("showBadge") && <div className="template-generic-badge">
            {getTemplateBadge(realTemplateType)}
          </div>}

          {isTemplateVisible("showTitle") && <h2>{template.title || template.name}</h2>}
          {isTemplateVisible("showSubtitle") && <p>{template.subtitle || "Mensagem personalizada para sua TV."}</p>}

          {isTemplateVisible("showFooter") && <div className="template-generic-footer">
            <span>Totem Park</span>
            <strong>{template.duration || 15}s</strong>
          </div>}
        </div>
      )}

      {isTemplateVisible("showFooter") && <div className="template-tv-ticker">
        <span>
          {isRssTemplateType(realTemplateType)
            ? buildSequentialNewsTicker(rotatedNews, template)
            : realTemplateType === "clima"
              ? `Clima em ${weather?.city || template.city || "sua cidade"} • Atualização automática`
              : realTemplateType === "cardapio_premium"
                ? `${template.title || "Cardápio Digital"} • Produtos, categorias e preços`
                : realTemplateType === "promocao_premium"
                  ? `${template.title || "Ofertas da Semana"} • Promoções em destaque`
                  : realTemplateType === "corporativo_premium"
                    ? `${template.title || "Comunicação Corporativa"} • Avisos, agenda e indicadores`
                    : realTemplateType === "resultados_esportivos_premium"
                      ? sportsTickerText
                      : template.subtitle || "Template profissional para TV"}
        </span>
      </div>}
    </div>
  );
}

function ScreenInUseCard({ screen, loading, onBack, onTryAnother }) {
  return (
    <div className="tv-connect-page">
      <div className="tv-connect-card tv-code-only-card tv-screen-in-use">
        <div className="tv-screen-in-use-icon">
          <Monitor size={52} />
        </div>

        <div className="tv-connect-kicker">Totem Park Player</div>
        <h1>Tela em uso</h1>
        <p>Este código já está conectado em outro aparelho.</p>

        <div className="tv-screen-in-use-details">
          <div>
            <span>Nome da tela</span>
            <strong>{screen.screenName}</strong>
          </div>
          <div>
            <span>Cliente</span>
            <strong>{screen.clientName}</strong>
          </div>
          <div>
            <span>Última conexão</span>
            <strong>{screen.lastConnection}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong className="tv-screen-online-status">Online</strong>
          </div>
        </div>

        <div className="tv-screen-in-use-actions">
          <button
            className="tv-change-mode-button"
            disabled={loading}
            onClick={onBack}
          >
            Voltar
          </button>

          <button
            className="tv-connect-button"
            disabled={loading}
            onClick={onTryAnother}
          >
            Tente outro Código
          </button>
        </div>
      </div>
    </div>
  );
}

function TVConnectPage({ playerOnly = false }) {
  const navigate = useNavigate();

  const [screenCode, setScreenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenInUse, setScreenInUse] = useState(null);

  function finishConnection(clientId, code, deviceId, screenId = "") {
    persistTvConnection({ clientId, code, deviceId, screenId });

    navigate(`/player/${clientId}/${code}`);
  }

  async function handleConnect() {
    if (!screenCode.trim()) {
      alert("Informe o código da tela.");
      return;
    }

    const code = screenCode.trim().toUpperCase();

    try {
      setLoading(true);

      if (IS_PLAYER_TELEMETRY_BUILD) {
        const deviceId = getTotemDeviceId();
        const binding = await claimPlayerBinding({
          app: firebaseApp,
          auth,
          code,
          deviceId,
          appVersion: import.meta.env.VITE_APP_VERSION || "2a2-c.1",
        });
        finishConnection(binding.clientId, code, deviceId, binding.screenId);
        return;
      }

      const codeRef = doc(db, "tv_codes", code);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        alert(
          "Tela não encontrada. Abra o cliente no painel, vá em Telas e confirme o código exibido."
        );
        setLoading(false);
        return;
      }

      const codeData = codeSnap.data();
      const clientId = codeData.clientId;
      const screenId = codeData.screenId;
      const deviceId = getTotemDeviceId();
      const deviceLocation = await resolveScreenLocationSnapshot();

      if (!clientId) {
        alert("Não foi possível identificar o cliente desta tela.");
        setLoading(false);
        return;
      }

      if (screenId) {
        const screenRef = doc(db, "clients", clientId, "screens", screenId);
        const connectionResult = await runTransaction(db, async (transaction) => {
            const screenSnap = await transaction.get(screenRef);

            if (!screenSnap.exists()) {
              return { screenNotFound: true };
            }

            const screenData = screenSnap.data();
            const lastSeenAt = screenData.lastSeenAt;
            const lastSeenMillis = lastSeenAt?.toMillis?.()
              ?? (lastSeenAt?.seconds ? lastSeenAt.seconds * 1000 : 0);
            const isRecentlyOnline =
              lastSeenMillis > 0 && Date.now() - lastSeenMillis <= 60000;
            const connectedDeviceId = screenData.connectedDeviceId || "";
            const belongsToAnotherDevice =
              Boolean(connectedDeviceId) && connectedDeviceId !== deviceId;

            if (isRecentlyOnline && belongsToAnotherDevice) {
              return {
                inUse: true,
                screen: {
                  clientId,
                  screenId,
                  code,
                  screenName: screenData.name || codeData.screenName || "Tela",
                  clientName: codeData.clientName || "Cliente não informado",
                  lastConnection:
                    screenData.lastConnection ||
                    new Date(lastSeenMillis).toLocaleString("pt-BR"),
                  lastSeenAt,
                  connectedDeviceId,
                },
              };
            }

            const connectionPayload = {
              connectedDeviceId: deviceId,
              activeDeviceId: deleteField(),
              status: "online",
              remoteCommand: null,
              lastCommandSent: "",
              commandStatus: "connected",
              lastConnection: new Date().toLocaleString("pt-BR"),
              lastSeenAt: serverTimestamp(),
            };

            if (deviceLocation) {
              connectionPayload.deviceLocation = deviceLocation;
              connectionPayload.deviceLocationCity = deviceLocation.cityLabel || deviceLocation.city || "";
              connectionPayload.deviceLocationUpdatedAt = serverTimestamp();
            }

            transaction.update(screenRef, connectionPayload);
            return { inUse: false };
          });

        if (connectionResult?.screenNotFound) {
          alert("Esta tela não existe mais. Tente outro código.");
          setLoading(false);
          return;
        }

        if (connectionResult?.inUse) {
          setScreenInUse(connectionResult.screen);
          setLoading(false);
          return;
        }
      }

      finishConnection(clientId, code, deviceId, screenId);
    } catch (error) {
      console.log(error);
      alert("Erro ao conectar a TV. Verifique as regras do Firestore para leitura da coleção tv_codes.");
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = readTvConnection();
    if (saved) navigate(`/player/${saved.clientId}/${saved.code}`);
  }, [navigate]);

  if (screenInUse) {
    return (
      <ScreenInUseCard
        screen={screenInUse}
        loading={loading}
        onBack={() => {
          setScreenInUse(null);
          setLoading(false);
        }}
        onTryAnother={() => {
          setScreenInUse(null);
          setScreenCode("");
          setLoading(false);
        }}
      />
    );
  }

  return (
    <div className="tv-connect-page">
      <div className="tv-connect-card tv-code-only-card">
        <img src={logo} alt="Totem Park" className="tv-connect-logo" />

        <div className="tv-connect-kicker">
          Totem Park Player
        </div>

        <h1>Conectar TV</h1>

        <p>
          Digite apenas o código da tela. O sistema identifica o cliente automaticamente.
        </p>

        <div className="tv-connect-form">
          <div className="tv-field tv-code-field">
            <div className="tv-field-icon">
              <Monitor size={32} />
            </div>

            <div className="tv-field-content">
              <label>Código da tela</label>

              <input
                value={screenCode}
                placeholder="ABC123"
                autoFocus
                maxLength={8}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleConnect();
                  }
                }}
                onChange={(e) =>
                  setScreenCode(e.target.value.toUpperCase())
                }
              />
            </div>
          </div>

          <button
            className="tv-connect-button"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? "Conectando..." : "Iniciar player"}
          </button>
        </div>

        <div className="tv-help">
          <span>?</span>
          O código aparece no painel do cliente, dentro da aba Telas.
        </div>

        <button
          className="tv-change-mode-button"
          onClick={() => {
            clearTvConnection({ explicit: true, reason: "choose-another-code" });
            setScreenCode("");
          }}
        >
          Digitar outro código
        </button>

        {!playerOnly && (
          <button
            className="tv-change-mode-button secondary"
            onClick={() => {
              clearTvConnection({ explicit: true, reason: "return-to-manager" });
              localStorage.removeItem("totempark-app-mode");
              window.location.href = "/";
            }}
          >
            Voltar para o painel gestor
          </button>
        )}

        {!playerOnly && isNativeApp() && (
          <button
            className="tv-change-mode-button tertiary"
            onClick={() => {
              localStorage.removeItem("totempark-app-mode");
              clearTvConnection({ explicit: true, reason: "change-app-mode" });
              window.location.href = "/";
            }}
          >
            Trocar Modo Gestor / Modo TV
          </button>
        )}
      </div>
    </div>
  );
}


function PlayerPage() {
  const { clientId, codigo } = useParams();
  const navigate = useNavigate();
  const hasManualScreenRotation =
    isNativeApp() && Boolean(localStorage.getItem("totempark-screen-rotation"));
  const offlineStorageKey = `totempark-offline-assets-${clientId}-${codigo}`;
  const offlineReadyMessageKey = `totempark-offline-ready-shown-${clientId}-${codigo}`;
  const offlineScope = `${clientId}-${String(codigo || "tv").toLowerCase()}`;
  const [screen, setScreen] = useState(null);
  const [playerClient, setPlayerClient] = useState(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [defaultPlaylist, setDefaultPlaylist] = useState(null);
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [clientTemplates, setClientTemplates] = useState([]);
  const [screenTemplates, setScreenTemplates] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [activeMode, setActiveMode] = useState("default");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [previousMediaIndex, setPreviousMediaIndex] = useState(null);
  const [decoderReleasePending, setDecoderReleasePending] = useState(false);
  const [readyMediaKey, setReadyMediaKey] = useState("");
  const [isAndroidTv, setIsAndroidTv] = useState(null);
  const [offlineAssetMap, setOfflineAssetMap] = useState(() =>
    isNativeApp() ? restoreOfflineAssetMap(offlineStorageKey) : {}
  );
  const [mediaCacheMap, setMediaCacheMap] = useState({});
  const [offlineCacheStatus, setOfflineCacheStatus] = useState("");
  const [playerCacheStatus, setPlayerCacheStatus] = useState({
    cacheStatus: "",
    cachedItems: 0,
    totalCacheableItems: 0,
    failedCacheItems: 0,
    cacheSizeBytes: 0,
    currentMediaSource: "remote",
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [remoteOverlay, setRemoteOverlay] = useState(null);
  const [takeoverMessage, setTakeoverMessage] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [blackoutMode, setBlackoutMode] = useState(false);
  const [pauseMode, setPauseMode] = useState(false);
  const [singleImageLoopCycle, setSingleImageLoopCycle] = useState(0);
  const [linkValidationState, setLinkValidationState] = useState(LINK_STATES.VALIDATION_START);
  const [lastCommandId, setLastCommandId] = useState(null);
  const lastCommandIdRef = useRef(null);
  const transitionInProgressRef = useRef(false);
  const transitionCleanupRef = useRef(null);
  const offlineStatusTimerRef = useRef(null);
  const cacheQueueRef = useRef(Promise.resolve());
  const mediaCacheRunRef = useRef(0);
  const mediaCacheProgressReportAtRef = useRef(0);
  const mediaCacheObjectUrlsRef = useRef(new Set());
  const lastCacheStatusPayloadRef = useRef("");
  const playbackTimerRef = useRef(null);
  const playbackTimingKeyRef = useRef("");
  const playbackRemainingRef = useRef(0);
  const playbackStartedAtRef = useRef(0);
  const jumpVideoRefs = useRef(new Map());
  const releasingVideoNodesRef = useRef(new WeakSet());
  const jumpLastReactKeyRef = useRef("");
  const jumpLastSourceByElement = useRef(new WeakMap());
  const advancingRef = useRef(false);
  const lastPlaybackItemIdentityRef = useRef("");
  const returnToTvTimerRef = useRef(null);
  const exitingTvRef = useRef(false);
  const playerSessionStartedAtRef = useRef(Date.now());
  const telemetryRef = useRef(null);
  const telemetryTransitionRef = useRef("");
  const lastTelemetryHistorySyncRef = useRef(0);
  const playerBindingRef = useRef(null);
  const playerIdentityStateRef = useRef(PLAYER_IDENTITY_STATES.UNAVAILABLE);
  if (!telemetryRef.current) {
    telemetryRef.current = createPlayerTelemetry({
      identity: {
        clientId,
        deviceId: getTotemDeviceId(),
        appVersion: import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_APP_MODE || "unknown",
        platform: isNativeApp() ? "ANDROID" : "WEB",
      },
    });
  }
  const isAndroidSmartTv = isNativeApp() && isAndroidTv === true;

  useEffect(() => {
    if (!IS_PLAYER_TELEMETRY_BUILD || !clientId || !codigo) return undefined;
    let cancelled = false;
    const establishIdentity = async () => {
      try {
        const binding = await claimPlayerBinding({
          app: firebaseApp,
          auth,
          code: codigo,
          deviceId: getTotemDeviceId(),
          appVersion: import.meta.env.VITE_APP_VERSION || "2a2-c.1",
        });
        if (cancelled) return;
        playerBindingRef.current = binding;
        playerIdentityStateRef.current = PLAYER_IDENTITY_STATES.BOUND;
      } catch (error) {
        if (cancelled) return;
        playerBindingRef.current = null;
        playerIdentityStateRef.current = classifyPlayerIdentityFailure(error);
        console.log("Identidade do Player ainda não validada:", error);
      }
    };
    establishIdentity();
    window.addEventListener("online", establishIdentity);
    return () => {
      cancelled = true;
      window.removeEventListener("online", establishIdentity);
    };
  }, [clientId, codigo]);

  useEffect(() => {
    if (!IS_PLAYER_TELEMETRY_BUILD || !screen?.id || !clientId) return undefined;
    const telemetry = telemetryRef.current;
    telemetry.updateIdentity({ clientId, screenId: screen.id, deviceId: getTotemDeviceId() });
    const unsubscribe = onSnapshot(
      doc(db, "settings", "telemetry2a2c"),
      (snapshot) => telemetry.configure(snapshot.exists() ? snapshot.data() : TELEMETRY_DEFAULT_CONFIG),
      () => telemetry.configure(TELEMETRY_DEFAULT_CONFIG)
    );
    const online = () => telemetry.setConnection("ONLINE");
    const offline = () => telemetry.setConnection("OFFLINE");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      unsubscribe();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [screen?.id, clientId]);

  useEffect(() => {
    const telemetry = telemetryRef.current;
    const onOperationalEvent = ({ detail = {} }) => {
      const mapping = {
        CACHE_HIT: ["cacheHits", 1], CACHE_MISS: ["cacheMisses", 1],
        DOWNLOAD_START: ["downloadStarts", 1], DOWNLOAD_COMPLETE: ["downloadCompleted", 1],
        DOWNLOAD_FAILED: ["downloadFailed", 1], DOWNLOAD_TIMEOUT: ["downloadTimeouts", 1],
        FILETRANSFER_RETRY: ["downloadRetries", 1], FILETRANSFER_STALLED: ["downloadStalls", 1],
      };
      const metric = mapping[detail.type];
      if (metric) telemetry.increment(metric[0], metric[1]);
      if (detail.type === "DOWNLOAD_COMPLETE") telemetry.increment("bytesDownloaded", Number(detail.finalFileSizeBytes || 0));
      if (detail.partialFileSize) telemetry.increment("partialBytesObserved", Number(detail.partialFileSize || 0));
    };
    window.addEventListener("totempark-operational-event", onOperationalEvent);
    return () => window.removeEventListener("totempark-operational-event", onOperationalEvent);
  }, []);

  function isFreshExitCommand(remoteCommand, commandStatus) {
    if (remoteCommand?.type !== "exitTv" || commandStatus !== "sent") return false;

    const sentAtMs = getTimestampMs(remoteCommand.sentAt);

    if (!sentAtMs) return true;

    return sentAtMs >= playerSessionStartedAtRef.current - 5000;
  }

  useEffect(() => {
    if (!isNativeApp()) return;

    TotemDevice.getDeviceType()
      .then(({ isTelevision }) => setIsAndroidTv(Boolean(isTelevision)))
      .catch((error) => {
        console.log("Nao foi possivel identificar o tipo do aparelho:", error);
        setIsAndroidTv(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(transitionCleanupRef.current);
      clearTimeout(offlineStatusTimerRef.current);
      clearTimeout(returnToTvTimerRef.current);
      clearTimeout(playbackTimerRef.current);
      mediaCacheObjectUrlsRef.current.forEach((url) => {
        if (String(url).startsWith("blob:")) URL.revokeObjectURL(url);
      });
      mediaCacheObjectUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const clock = setInterval(() => {
      setNow(new Date());
    }, 15000);

    return () => clearInterval(clock);
  }, []);

  function timeToMinutes(time) {
    if (!time) return 0;

    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
  }

  function getTodayValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function isPlaylistInSchedule(currentPlaylist) {
    if (!currentPlaylist?.scheduleEnabled) {
      return false;
    }

    if (
      currentPlaylist.targetScreenIds &&
      currentPlaylist.targetScreenIds.length > 0 &&
      screen?.id &&
      !currentPlaylist.targetScreenIds.includes(screen.id)
    ) {
      return false;
    }

    const today = getTodayValue(now);

    if (
      currentPlaylist.startDate &&
      today < currentPlaylist.startDate
    ) {
      return false;
    }

    if (
      currentPlaylist.endDate &&
      today > currentPlaylist.endDate
    ) {
      return false;
    }

    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    const startMinutes = timeToMinutes(currentPlaylist.startTime);
    const endMinutes = timeToMinutes(currentPlaylist.endTime);

    if (startMinutes === endMinutes) {
      return true;
    }

    if (startMinutes < endMinutes) {
      return (
        currentMinutes >= startMinutes &&
        currentMinutes <= endMinutes
      );
    }

    return (
      currentMinutes >= startMinutes ||
      currentMinutes <= endMinutes
    );
  }

  function chooseActivePlaylist() {
    const scheduledPlaylists = allPlaylists
      .filter((playlist) => isPlaylistInSchedule(playlist))
      .sort((a, b) => {
        const aDate = `${a.startDate || ""} ${a.startTime || ""}`;
        const bDate = `${b.startDate || ""} ${b.startTime || ""}`;

        return bDate.localeCompare(aDate);
      });

    if (scheduledPlaylists.length > 0) {
      return {
        playlist: scheduledPlaylists[0],
        mode: "scheduled",
      };
    }

    return {
      playlist: defaultPlaylist,
      mode: "default",
    };
  }

  function updateLocalMediaCacheMap(results = {}) {
    setMediaCacheMap((previous) => {
      Object.values(previous).forEach((entry) => {
        if (entry?.url && String(entry.url).startsWith("blob:")) {
          URL.revokeObjectURL(entry.url);
          mediaCacheObjectUrlsRef.current.delete(entry.url);
        }
      });

      const next = {};

      Object.entries(results).forEach(([key, value]) => {
        if (!value?.url) return;
        next[key] = value;
        if (String(value.url).startsWith("blob:")) {
          mediaCacheObjectUrlsRef.current.add(value.url);
        }
      });

      return next;
    });
  }

  function applyPlayerMediaCache(item) {
    if (!item || !isCacheableMediaItem(item)) return item;

    const remotePreview = item.remotePreview || item.preview;
    const mediaCacheKey = getMediaCacheKey(clientId, item);
    const cached = mediaCacheMap[mediaCacheKey];

    if (isNativeApp() && isAndroidLocalMediaSource(item.preview)) {
      return {
        ...item,
        remotePreview,
        mediaCacheKey,
        currentMediaSource: "local",
      };
    }

    if (cached?.url) {
      return {
        ...item,
        remotePreview,
        preview: cached.url,
        mediaCacheKey,
        currentMediaSource: "cache",
      };
    }

    return {
      ...item,
      remotePreview,
      mediaCacheKey,
      currentMediaSource: "remote",
    };
  }

  function fallbackToRemoteMedia(item) {
    if (
      (IS_PLAYER_LAB_BUILD || IS_PLAYER_CANARY_BUILD || IS_PLAYER_RC_BUILD) &&
      item?.currentMediaSource === "local" &&
      item.remotePreview
    ) {
      setOfflineAssetMap((previous) => {
        const next = { ...previous };
        delete next[item.remotePreview];
        return next;
      });
      setPlayerCacheStatus((previous) => ({
        ...previous,
        currentMediaSource: "remote",
      }));
      return true;
    }

    if (item?.currentMediaSource !== "cache" || !item.mediaCacheKey || !item.remotePreview) {
      return false;
    }

    setMediaCacheMap((previous) => {
      const cached = previous[item.mediaCacheKey];

      if (cached?.url && String(cached.url).startsWith("blob:")) {
        URL.revokeObjectURL(cached.url);
        mediaCacheObjectUrlsRef.current.delete(cached.url);
      }

      const next = { ...previous };
      delete next[item.mediaCacheKey];
      return next;
    });

    setPlayerCacheStatus((previous) => ({
      ...previous,
      currentMediaSource: "remote",
    }));

    return true;
  }

  function hydrateTemplatePlaylistItem(item = {}) {
    const isTemplateItem = item?.playerItemType === "template" || Boolean(item?.templateType);
    if (!isTemplateItem) return item;

    const identifiers = [
      item.templateId,
      item.sourceTemplateId,
      item.id,
      item.sourceMarketingId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const latestTemplate = clientTemplates.find((template) =>
      identifiers.includes(String(template.id || "").trim())
    );

    if (!latestTemplate) return item;

    return {
      ...item,
      ...latestTemplate,
      id: latestTemplate.id,
      templateId: item.templateId || latestTemplate.id,
      sourceTemplateId: item.sourceTemplateId || latestTemplate.id,
      title: latestTemplate.title || latestTemplate.name || item.title || item.name,
      name: latestTemplate.name || latestTemplate.title || item.name || item.title,
      templateType: latestTemplate.templateType || latestTemplate.type || item.templateType || item.type,
      type: latestTemplate.templateType || latestTemplate.type || item.templateType || item.type,
      duration: Number(latestTemplate.duration || item.duration || 15),
      playerItemType: "template",
    };
  }

  async function reportCacheStatus(payload) {
    if (!screen?.id || !clientId) return;

    const normalized = {
      cacheStatus: payload.cacheStatus || "",
      cachedItems: Number(payload.cachedItems || 0),
      totalCacheableItems: Number(payload.totalCacheableItems || 0),
      failedCacheItems: Number(payload.failedCacheItems || 0),
      cacheSizeBytes: Number(payload.cacheSizeBytes || 0),
      currentMediaSource: payload.currentMediaSource || playerCacheStatus.currentMediaSource || "remote",
      activePlaylistWeightBytes: Number(payload.activePlaylistWeightBytes || 0),
      estimatedMonthlyTrafficBytes: Number(payload.estimatedMonthlyTrafficBytes || 0),
      cacheManifestKey: payload.cacheManifestKey || "",
      cacheManifestItems: Number(payload.cacheManifestItems || 0),
      cacheManifestSizeBytes: Number(payload.cacheManifestSizeBytes || 0),
      cacheDownloadedItems: Number(payload.cacheDownloadedItems || 0),
      cacheRemovedItems: Number(payload.cacheRemovedItems || 0),
    };
    const signature = JSON.stringify(normalized);

    if (lastCacheStatusPayloadRef.current === signature) return;
    lastCacheStatusPayloadRef.current = signature;

    try {
      const statusPayload = {
        ...normalized,
        cacheUpdatedAt: serverTimestamp(),
      };

      if (payload.lastMediaDownloadAt) {
        statusPayload.lastMediaDownloadAt = payload.lastMediaDownloadAt;
        statusPayload.lastMediaDownloadBytes = Number(payload.lastMediaDownloadBytes || 0);
      }

      await updateDoc(doc(db, "clients", clientId, "screens", screen.id), statusPayload);
    } catch (error) {
      console.log("Erro ao atualizar status do cache:", error);
    }
  }

  const activePlaylistItems = activePlaylist?.items || [];
  const hasActivePlaylistItems = activePlaylistItems.length > 0;
  const playerItems = [
    ...activePlaylistItems.map((item) => {
      const latestItem = hydrateTemplatePlaylistItem(item);
      const localizedItem = applyOfflineAssetUrls(latestItem, offlineAssetMap);
      const cachedItem = applyPlayerMediaCache(localizedItem);

      if (item?.playerItemType === "template" || item?.templateType) {
        return {
          ...cachedItem,
          title: cachedItem.title || cachedItem.name,
          templateType: cachedItem.templateType || cachedItem.type,
          type: cachedItem.templateType || cachedItem.type,
          duration: Number(cachedItem.duration || 15),
          playerItemType: "template",
        };
      }

      return {
        ...cachedItem,
        playerItemType: "media",
      };
    }),
    ...(hasActivePlaylistItems ? [] : screenTemplates).map((template) => {
      const localizedTemplate = applyOfflineAssetUrls(template, offlineAssetMap);
      const cachedTemplate = applyPlayerMediaCache(localizedTemplate);

      return {
        ...cachedTemplate,
        title: cachedTemplate.name,
        templateType: cachedTemplate.type,
        type: cachedTemplate.type,
        duration: Number(cachedTemplate.duration || 15),
        playerItemType: "template",
      };
    }),
  ].filter((item) => isOrientationCompatible(item, screen?.orientation || activePlaylist?.orientation || "Paisagem"));

  const activePlaylistRevision = [
    activePlaylist?.playlistRevision || "",
    activePlaylist?.transition || "Fade suave",
    activePlaylist?.transitionSpeed || "Normal",
    activePlaylist?.updatedAt?.seconds || "",
    activePlaylist?.updatedAt?.nanoseconds || "",
  ].join("-");
  const activeItemsKey = `${activePlaylistRevision}|${playerItems
    .map((item) => [
      item.playerItemType,
      item.id || item.templateId || item.remotePreview || item.preview || item.title || "item",
      item.templateRevision || "",
      Number(item.duration || 0),
      item.updatedAt?.seconds || "",
      item.updatedAt?.nanoseconds || "",
      item.sizeBytes || "",
      Array.isArray(item.selectedNewsSources) ? item.selectedNewsSources.join(",") : "",
      item.newsSource || "",
      item.tickerSpeed || "",
      item.showBadge === false ? "hideBadge" : "showBadge",
    ].join("-"))
    .join("|")}`;
  useEffect(() => {
    if (!jumpDiagnosticEnabled()) return;
    const item = playerItems[mediaIndex] || playerItems[0];
    if (!item) return;
    const newKey = `${activePlaylist?.id || "templates"}-${activePlaylistRevision}-${item?.id || item?.preview || item?.title || "item"}-${mediaIndex}-${activePlaylistRevision}`;
    const oldKey = jumpLastReactKeyRef.current;
    if (oldKey && oldKey !== newKey) recordJumpEvent("REACT_KEY_CHANGE", { oldKey, newKey, mediaId: item.mediaId || item.id || "", index: mediaIndex, reason: "item-or-playlist-revision" });
    jumpLastReactKeyRef.current = newKey;
  }, [activePlaylist?.id, activePlaylistRevision, activeItemsKey, mediaIndex]);
  const mediaCacheReadyKey = Object.keys(mediaCacheMap).sort().join("|");
  const mediaCacheManifest = buildMediaCacheManifest(clientId, playerItems);
  const mediaCacheManifestKey = mediaCacheManifest.manifestKey;
  const activePlaylistWeightBytes = getPlaylistWeightBytes({ items: playerItems });
  const estimatedMonthlyTrafficBytes = activePlaylistWeightBytes * 30;

  useEffect(() => {
    if (!playerItems.length) return;

    [0, 1, 2].forEach((offset) => {
      const nextIndex = (mediaIndex + offset) % playerItems.length;
      const item = playerItems[nextIndex];

      if (item?.playerItemType === "template" || item?.templateType) {
        primeTemplateLiveContent(item).catch((error) => {
          console.log("Erro ao pre-carregar dados do template:", error);
        });
      }
    });
  }, [activeItemsKey, mediaIndex]);

  const playlistsForOffline = allPlaylists.filter((playlist) => {
    if (playlist.id === screen?.playlistId) return true;
    if (!playlist.scheduleEnabled) return false;

    return (
      !playlist.targetScreenIds?.length ||
      playlist.targetScreenIds.includes(screen?.id)
    );
  });
  const offlineAssetUrls = collectOfflineAssetUrls([
    defaultPlaylist,
    activeTemplate,
    hasActivePlaylistItems ? [] : screenTemplates,
    playlistsForOffline,
  ]);
  const offlineAssetsKey = offlineAssetUrls.join("|");

  useEffect(() => {
    if (!isNativeApp() || offlineAssetUrls.length === 0) return;

    let active = true;
    clearTimeout(offlineStatusTimerRef.current);
    setOfflineCacheStatus("downloading");

    const reportNativeOfflineProgress = (payload = {}) => {
      const total = Number(payload.total || offlineAssetUrls.length || 0);
      const failed = Number(payload.failed || 0);
      const downloaded = Number(payload.downloaded || 0);
      const statusPayload = {
        cacheStatus: "preparando",
        cachedItems: Math.max(0, Number(payload.completed || 0) - failed),
        totalCacheableItems: total,
        failedCacheItems: failed,
        cacheDownloadedItems: downloaded,
        cacheRemovedItems: Number(payload.removed || 0),
        lastMediaDownloadBytes: Number(payload.downloadedBytes || 0),
        cacheUpdatedAt: serverTimestamp(),
        currentMediaSource: downloaded > 0 ? "mixed" : "internet",
        activePlaylistWeightBytes,
        estimatedMonthlyTrafficBytes,
      };

      setPlayerCacheStatus((previous) => ({
        ...previous,
        ...statusPayload,
      }));

      if (Date.now() - mediaCacheProgressReportAtRef.current > 3000 || payload.completed === total) {
        mediaCacheProgressReportAtRef.current = Date.now();
        reportCacheStatus(statusPayload);
      }
    };

    reportNativeOfflineProgress({ completed: 0, total: offlineAssetUrls.length });

    cacheQueueRef.current = cacheQueueRef.current
      .catch(() => {})
      .then(() => cacheOfflineAssets(
        offlineAssetUrls,
        offlineScope,
        offlineStorageKey,
        {
          purgeUnused: true,
          mediaByUrl: Object.fromEntries(playerItems.map((item) => {
            const remoteUrl = item.remotePreview || item.preview || item.imageUrl || "";
            return [remoteUrl, { mediaId: item.mediaId || item.id || "", mediaName: item.title || item.name || item.fileName || "", fileName: item.fileName || "", sizeBytes: Number(item.sizeBytes || 0), playlistId: activePlaylist?.id || "", screenId: screen?.id || "" }];
          }).filter(([url]) => /^https?:\/\//i.test(url))),
          onProgress: reportNativeOfflineProgress,
        }
      ))
      .then((result) => {
        if (!active) return;

        setOfflineAssetMap(result.urlMap);

        const finalStatus = {
          cacheStatus: result.failed > 0 ? "parcial" : "pronto",
          cachedItems: Math.max(0, Number(result.total || 0) - Number(result.failed || 0)),
          totalCacheableItems: Number(result.total || 0),
          failedCacheItems: Number(result.failed || 0),
          cacheDownloadedItems: Number(result.downloaded || 0),
          cacheRemovedItems: Number(result.removed || 0),
          lastMediaDownloadBytes: Number(result.downloadedBytes || 0),
          cacheUpdatedAt: serverTimestamp(),
          currentMediaSource: result.downloaded > 0 ? "mixed" : "internet",
          activePlaylistWeightBytes,
          estimatedMonthlyTrafficBytes,
        };

        if (result.downloaded > 0) {
          finalStatus.lastMediaDownloadAt = serverTimestamp();
        }

        setPlayerCacheStatus((previous) => ({
          ...previous,
          ...finalStatus,
        }));
        reportCacheStatus(finalStatus);

        if (result.failed > 0) {
          setOfflineCacheStatus("partial");
          offlineStatusTimerRef.current = setTimeout(() => {
            setOfflineCacheStatus("");
          }, 5000);
          return;
        }

        const readyMessageWasShown = localStorage.getItem(offlineReadyMessageKey) === "true";

        if (readyMessageWasShown) {
          setOfflineCacheStatus("");
          return;
        }

        localStorage.setItem(offlineReadyMessageKey, "true");
        setOfflineCacheStatus("ready");
        offlineStatusTimerRef.current = setTimeout(() => {
          setOfflineCacheStatus("");
        }, 4000);
      })
      .catch((error) => {
        console.log("Erro ao preparar playlist offline:", error);
        if (active) {
          const errorStatus = {
            cacheStatus: "parcial",
            cachedItems: 0,
            totalCacheableItems: offlineAssetUrls.length,
            failedCacheItems: offlineAssetUrls.length,
            cacheDownloadedItems: 0,
            cacheRemovedItems: 0,
            cacheUpdatedAt: serverTimestamp(),
            currentMediaSource: "internet",
            activePlaylistWeightBytes,
            estimatedMonthlyTrafficBytes,
          };

          setPlayerCacheStatus((previous) => ({
            ...previous,
            ...errorStatus,
          }));
          reportCacheStatus(errorStatus);
          setOfflineCacheStatus("partial");
          offlineStatusTimerRef.current = setTimeout(() => {
            setOfflineCacheStatus("");
          }, 5000);
        }
      });

    return () => {
      active = false;
    };
  }, [offlineAssetsKey, offlineReadyMessageKey, offlineScope, offlineStorageKey, activePlaylistWeightBytes, estimatedMonthlyTrafficBytes]);

  useEffect(() => {
    if (!screen?.id || !clientId || playerItems.length === 0) return;
    if (isNativeApp()) return;

    const cacheableItems = playerItems.filter(isCacheableMediaItem);
    const totalCacheableItems = cacheableItems.length;
    const runId = mediaCacheRunRef.current + 1;
    mediaCacheRunRef.current = runId;

    if (totalCacheableItems === 0) {
      const stats = getMediaCacheStats(clientId);
      const emptyStatus = {
        cacheStatus: "pronto",
        cachedItems: 0,
        totalCacheableItems: 0,
        failedCacheItems: 0,
        cacheSizeBytes: stats.cacheSizeBytes,
        currentMediaSource: "remote",
        activePlaylistWeightBytes,
        estimatedMonthlyTrafficBytes: 0,
      cacheManifestKey: mediaCacheManifestKey,
      cacheManifestItems: 0,
      cacheManifestSizeBytes: 0,
      cacheDownloadedItems: 0,
      cacheRemovedItems: 0,
    };
      setPlayerCacheStatus(emptyStatus);
      reportCacheStatus(emptyStatus);
      return;
    }

    const currentItem = playerItems[mediaIndex] || playerItems[0];
    const currentKey = currentItem ? getMediaCacheKey(clientId, currentItem) : "";
    const initialStatus = {
      cacheStatus: "preparando",
      cachedItems: 0,
      totalCacheableItems,
      failedCacheItems: 0,
      cacheSizeBytes: getMediaCacheStats(clientId).cacheSizeBytes,
      currentMediaSource: currentItem?.currentMediaSource || "remote",
      activePlaylistWeightBytes,
      estimatedMonthlyTrafficBytes,
      cacheManifestKey: mediaCacheManifestKey,
      cacheManifestItems: mediaCacheManifest.totalItems,
      cacheManifestSizeBytes: mediaCacheManifest.totalSizeBytes,
      cacheDownloadedItems: 0,
      cacheRemovedItems: 0,
    };

    setPlayerCacheStatus(initialStatus);
    reportCacheStatus(initialStatus);

    cachePlaylistMedia({
      clientId,
      items: playerItems,
      currentIndex: mediaIndex,
      concurrency: isAndroidSmartTv ? 1 : 2,
      onProgress: ({ completed, total, failed, downloaded }) => {
        if (mediaCacheRunRef.current !== runId) return;

        const progressStatus = {
          cacheStatus: "preparando",
          cachedItems: Math.max(0, completed - failed),
          totalCacheableItems: total,
          failedCacheItems: failed,
          cacheSizeBytes: getMediaCacheStats(clientId).cacheSizeBytes,
          cacheDownloadedItems: downloaded || 0,
          cacheManifestKey: mediaCacheManifestKey,
          cacheManifestItems: mediaCacheManifest.totalItems,
          cacheManifestSizeBytes: mediaCacheManifest.totalSizeBytes,
          cacheRemovedItems: 0,
          currentMediaSource: currentItem?.currentMediaSource || "remote",
          activePlaylistWeightBytes,
          estimatedMonthlyTrafficBytes,
        };

        setPlayerCacheStatus((previous) => ({
          ...previous,
          ...progressStatus,
        }));

        const shouldReportProgress =
          completed === total ||
          Date.now() - mediaCacheProgressReportAtRef.current > 3000;

        if (shouldReportProgress) {
          mediaCacheProgressReportAtRef.current = Date.now();
          reportCacheStatus(progressStatus);
        }
      },
    })
      .then(async (result) => {
        if (mediaCacheRunRef.current !== runId) return;

        updateLocalMediaCacheMap(result.results);

        const keepKeys = cacheableItems.map((item) => getMediaCacheKey(clientId, item));
        const cleanup = await removeUnusedCachedMedia(keepKeys, [currentKey]).catch(() => ({ removed: 0 }));

        const stats = getMediaCacheStats(clientId);
        const finalStatus = {
          cacheStatus: result.failed > 0 ? "parcial" : "pronto",
          cachedItems: result.cached,
          totalCacheableItems: result.total,
          failedCacheItems: result.failed,
          cacheSizeBytes: stats.cacheSizeBytes,
          currentMediaSource: result.cached > 0 && result.cached < result.total
            ? "mixed"
            : currentKey && result.results[currentKey]
              ? "cache"
              : currentItem?.currentMediaSource || "remote",
          activePlaylistWeightBytes,
          estimatedMonthlyTrafficBytes: result.failed > 0 ? estimatedMonthlyTrafficBytes : 0,
          cacheManifestKey: result.manifest?.manifestKey || mediaCacheManifestKey,
          cacheManifestItems: result.manifest?.totalItems ?? mediaCacheManifest.totalItems,
          cacheManifestSizeBytes: result.manifest?.totalSizeBytes ?? mediaCacheManifest.totalSizeBytes,
          cacheDownloadedItems: result.downloaded || 0,
          cacheRemovedItems: cleanup.removed || 0,
        };

        if (result.downloaded > 0) {
          finalStatus.lastMediaDownloadAt = serverTimestamp();
          finalStatus.lastMediaDownloadBytes = result.downloadedBytes || 0;
        }

        setPlayerCacheStatus(finalStatus);
        reportCacheStatus(finalStatus);
      })
      .catch((error) => {
        if (mediaCacheRunRef.current !== runId) return;

        console.log("Erro ao preparar cache inteligente:", error);
        const stats = getMediaCacheStats(clientId);
        const errorStatus = {
          cacheStatus: "erro",
          cachedItems: 0,
          totalCacheableItems,
          failedCacheItems: totalCacheableItems,
          cacheSizeBytes: stats.cacheSizeBytes,
          currentMediaSource: currentItem?.currentMediaSource || "remote",
          activePlaylistWeightBytes,
          estimatedMonthlyTrafficBytes,
          cacheManifestKey: mediaCacheManifestKey,
          cacheManifestItems: mediaCacheManifest.totalItems,
          cacheManifestSizeBytes: mediaCacheManifest.totalSizeBytes,
        };

        setPlayerCacheStatus(errorStatus);
        reportCacheStatus(errorStatus);
      });
  }, [screen?.id, clientId, mediaCacheManifestKey, isAndroidSmartTv, activePlaylistWeightBytes, estimatedMonthlyTrafficBytes]);

  function getPlayerItemKey(item, index) {
    return `${activePlaylist?.id || "templates"}-${activePlaylistRevision}-${item?.id || item?.preview || item?.title || "item"}-${index}`;
  }

  function getStablePlayerItemIdentity(item = {}) {
    return [
      item.playerItemType || "",
      item.mediaId || item.sourceMediaId || item.templateId || item.id || "",
      item.storagePath || "",
      item.remotePreview || item.preview || item.imageUrl || "",
      item.title || item.name || "",
      item.templateType || item.type || "",
    ].join("|");
  }

  function goToNextMedia(reason = "UNKNOWN") {
    if (advancingRef.current) return;

    recordJumpEvent("PLAYER_ADVANCE_REQUEST", { reason, index: mediaIndex, mediaId: playerItems[mediaIndex]?.mediaId || playerItems[mediaIndex]?.id || "" });

    const items = playerItems;

    if (items.length === 1) {
      if (isSingleImagePlaylist(items)) {
        setSingleImageLoopCycle((cycle) => cycle + 1);
      }
      return;
    }

    const nextItemIndex = mediaIndex + 1 >= items.length ? 0 : mediaIndex + 1;
    const singleDecoderTransition = IS_PLAYER_DECODER_LIFECYCLE_BUILD &&
      isVideoToVideoTransition(items, mediaIndex);

    advancingRef.current = true;
    clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = null;

    if (singleDecoderTransition) {
      clearTimeout(transitionCleanupRef.current);
      const oldVideo = document.querySelector(".player-transition-layer.is-current video.player-media");
      recordJumpEvent("DECODER_RELEASE_START", {
        reason,
        fromIndex: mediaIndex,
        toIndex: nextItemIndex,
        ...mediaElementSnapshot(oldVideo, items[mediaIndex]?.mediaId || items[mediaIndex]?.id || "", mediaIndex),
      });
      if (oldVideo) releasingVideoNodesRef.current.add(oldVideo);
      const release = releaseVideoElement(oldVideo);
      recordJumpEvent("DECODER_SOURCE_CLEARED", { reason, ...release });
      setDecoderReleasePending(true);
      setPreviousMediaIndex(null);
    }

    setMediaIndex((prev) => {
      const safePrev = prev >= items.length ? 0 : prev;
      const nextIndex = safePrev + 1 >= items.length ? 0 : safePrev + 1;

      telemetryTransitionRef.current = telemetryRef.current.startTransition({
        fromMediaId: items[safePrev]?.mediaId || items[safePrev]?.id || "",
        toMediaId: items[nextIndex]?.mediaId || items[nextIndex]?.id || "",
        reason,
      });

      transitionInProgressRef.current = true;
      if (!singleDecoderTransition) setPreviousMediaIndex(safePrev);

      if (items[nextIndex]?.playerItemType === "template") {
        setReadyMediaKey(getPlayerItemKey(items[nextIndex], nextIndex));
        clearTimeout(transitionCleanupRef.current);
        transitionCleanupRef.current = setTimeout(() => {
          setPreviousMediaIndex(null);
          transitionInProgressRef.current = false;
        }, 1800);
      } else {
        setReadyMediaKey("");
      }

      return nextIndex;
    });
  }

  useLayoutEffect(() => {
    if (!IS_PLAYER_DECODER_LIFECYCLE_BUILD || !decoderReleasePending) return;
    const remainingVideoCount = document.querySelectorAll(".player-transition-layer video.player-media").length;
    recordJumpEvent("DECODER_RELEASE_END", { remainingVideoCount, nextIndex: mediaIndex });
    if (remainingVideoCount === 0) setDecoderReleasePending(false);
  }, [decoderReleasePending, mediaIndex]);

  function markCurrentMediaReady(item, index) {
    const itemKey = getPlayerItemKey(item, index);

    if (itemKey !== getPlayerItemKey(playerItems[mediaIndex], mediaIndex)) return;

    setReadyMediaKey(itemKey);
    telemetryRef.current.completeTransition(telemetryTransitionRef.current, "SUCCESS");
    telemetryTransitionRef.current = "";
    clearTimeout(transitionCleanupRef.current);
    transitionCleanupRef.current = setTimeout(() => {
      setPreviousMediaIndex(null);
      transitionInProgressRef.current = false;
    }, 1800);
  }

  function skipFailedMedia() {
    transitionInProgressRef.current = false;
    setReadyMediaKey("");
    goToNextMedia("ERROR");
  }

  function getPlayerOrientationClass() {
    if (hasManualScreenRotation) return "natural-mode";
    if (isNativeApp() && isAndroidTv === false) return "natural-mode";

    return screen?.orientation === "Retrato" ? "portrait-mode" : "landscape-mode";
  }

  function getTransitionClass(transition) {
    if (transition === "Slide lateral") return "transition-slide";
    if (transition === "Zoom leve") return "transition-zoom";
    if (transition === "Corte seco") return "transition-cut";
    if (transition === "Dissolver") return "transition-dissolve";

    return "transition-fade";
  }

  function getTransitionSpeedClass(speed) {
    if (speed === "Rápida") return "speed-fast";
    if (speed === "Lenta") return "speed-slow";
    if (speed === "Cinematográfica") return "speed-cinematic";

    return "speed-normal";
  }

  function showTvCodeScreen() {
    exitingTvRef.current = true;
    clearTimeout(returnToTvTimerRef.current);
    clearTimeout(playbackTimerRef.current);
    localStorage.removeItem("totempark-app-mode");
    window.location.replace("/tv");
  }

  function clearTvConnectionAndShowCode(reason) {
    clearTvConnection({ explicit: true, reason });
    showTvCodeScreen();
  }

  useEffect(() => {
    if (!clientId || !codigo) return;

    let cancelled = false;
    let unsubscribeScreen = null;
    const localDeviceId = getTotemDeviceId();
    const savedTvConnection = readTvConnection();
    const canRecoverSavedDeviceLink = (connectedDeviceId) =>
      isNativeApp() &&
      Boolean(connectedDeviceId) &&
      savedTvConnection?.clientId === clientId &&
      String(savedTvConnection?.code || "").toUpperCase() === codigo.toUpperCase() &&
      savedTvConnection?.deviceId === connectedDeviceId;

    function scheduleValidationTimeout(reason) {
      clearTimeout(returnToTvTimerRef.current);
      returnToTvTimerRef.current = setTimeout(() => {
        const result = classifyLinkValidation({ timedOut: true });
        setLinkValidationState(result.state);
        logLinkEvent(result.state, { reason });
        setLoading(false);
      }, isNativeApp() ? 10000 : 0);
    }

    function handleScreenData(screenDoc) {
      if (cancelled) return;
      if (exitingTvRef.current) return;

      if (!screenDoc.exists()) {
        scheduleValidationTimeout("screen-document-not-confirmed");
        return;
      }

      clearTimeout(returnToTvTimerRef.current);

      const screenData = { id: screenDoc.id, ...screenDoc.data() };
      const connectedDeviceId = screenData.connectedDeviceId || "";
      const lastSeenMs = getTimestampMs(screenData.lastSeenAt);
      const recentlyOnline = lastSeenMs > 0 && Date.now() - lastSeenMs <= 60000;

      if (
        connectedDeviceId &&
        connectedDeviceId !== localDeviceId &&
        recentlyOnline &&
        !canRecoverSavedDeviceLink(connectedDeviceId)
      ) {
        const result = classifyLinkValidation({
          connectedDeviceId,
          localDeviceId,
          recentlyOnline,
        });
        setLinkValidationState(result.state);
        logLinkEvent(result.state, { connectedDeviceId, localDeviceId });
        setLoading(false);
        return;
      }

      persistTvConnection({
        clientId,
        code: codigo,
        deviceId: localDeviceId,
        screenId: screenDoc.id,
      });
      setLinkValidationState(LINK_STATES.VALIDATED);
      logLinkEvent(LINK_STATES.VALIDATED, { screenId: screenDoc.id });
      setScreen(screenData);
      setLoading(false);
    }

    function subscribeToScreenRef(screenRef) {
      unsubscribeScreen?.();
      unsubscribeScreen = onSnapshot(screenRef, handleScreenData, (error) => {
        console.log("Erro ao acompanhar tela do player:", error);
        const result = classifyLinkValidation({ error });
        setLinkValidationState(result.state);
        logLinkEvent(result.state, { stage: "screen-listener", code: error?.code || "" });
        setLoading(false);
      });
    }

    async function subscribeToScreen() {
      if (exitingTvRef.current) return;

      try {
        setLinkValidationState(LINK_STATES.VALIDATION_START);
        logLinkEvent(LINK_STATES.VALIDATION_START, { hasScreenId: Boolean(savedTvConnection?.screenId) });

        if (!navigator.onLine) {
          const result = classifyLinkValidation({ online: false });
          setLinkValidationState(result.state);
          logLinkEvent(result.state);
        }

        if (savedTvConnection?.screenId) {
          subscribeToScreenRef(doc(db, "clients", clientId, "screens", savedTvConnection.screenId));
          return;
        }

        const codeRef = doc(db, "tv_codes", codigo.toUpperCase());
        const codeSnap = await getDoc(codeRef);

        if (cancelled) return;

        if (codeSnap.exists() && codeSnap.data()?.screenId) {
          const resolvedScreenId = codeSnap.data().screenId;
          updateTvConnectionScreenId(resolvedScreenId);
          subscribeToScreenRef(doc(db, "clients", clientId, "screens", resolvedScreenId));
          return;
        }

        const screenQuery = query(
          collection(db, "clients", clientId, "screens"),
          where("code", "==", codigo.toUpperCase())
        );

        unsubscribeScreen = onSnapshot(screenQuery, (snapshot) => {
          if (snapshot.empty) {
            scheduleValidationTimeout("screen-query-empty");
            return;
          }

          handleScreenData(snapshot.docs[0]);
        }, (error) => {
          console.log("Erro ao buscar tela pelo codigo:", error);
          const result = classifyLinkValidation({ error });
          setLinkValidationState(result.state);
          logLinkEvent(result.state, { stage: "screen-query", code: error?.code || "" });
          setLoading(false);
        });
      } catch (error) {
        console.log("Erro ao resolver codigo da TV:", error);
        const result = classifyLinkValidation({
          online: navigator.onLine,
          error,
        });
        setLinkValidationState(result.state);
        logLinkEvent(result.state, { stage: "code-resolution", code: error?.code || "" });
        setLoading(false);
      }
    }

    subscribeToScreen();
    const retryValidation = () => subscribeToScreen();
    const markOffline = () => {
      setLinkValidationState(LINK_STATES.OFFLINE);
      logLinkEvent(LINK_STATES.OFFLINE);
      setLoading(false);
    };
    window.addEventListener("online", retryValidation);
    window.addEventListener("offline", markOffline);

    return () => {
      cancelled = true;
      clearTimeout(returnToTvTimerRef.current);
      unsubscribeScreen?.();
      window.removeEventListener("online", retryValidation);
      window.removeEventListener("offline", markOffline);
    };
  }, [clientId, codigo]);

  /*
  useEffect(() => {
    if (!clientId || !codigo) return;

    const screenQuery = query(
      collection(db, "clients", clientId, "screens"),
      where("code", "==", codigo.toUpperCase())
    );

    const unsubscribe = onSnapshot(screenQuery, (snapshot) => {
      if (snapshot.empty) {
        localStorage.removeItem("totempark-tv-connection");
        window.location.replace("/tv");
        return;
      }

      const screenDoc = snapshot.docs[0];
      const screenData = { id: screenDoc.id, ...screenDoc.data() };
      const localDeviceId = getTotemDeviceId();

      if (
        screenData.connectedDeviceId &&
        screenData.connectedDeviceId !== localDeviceId
      ) {
        localStorage.removeItem("totempark-tv-connection");
        window.location.href = "/tv";
        return;
      }

      setScreen(screenData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientId, codigo]);
  */

  useEffect(() => {
    if (!clientId) return undefined;

    return onSnapshot(
      doc(db, "clients", clientId),
      (snapshot) => {
        setPlayerClient(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        setClientLoading(false);
      },
      (error) => {
        console.log("Erro ao carregar cliente do player:", error);
        setClientLoading(false);
      }
    );
  }, [clientId]);

  useEffect(() => {
    if (!screen?.id || !clientId) return;

    const screenDocRef = doc(
      db,
      "clients",
      clientId,
      "screens",
      screen.id
    );

    async function sendHeartbeat() {
      if (exitingTvRef.current) return;

      try {
        const localDeviceId = getTotemDeviceId();
        const currentScreen = await getDoc(screenDocRef);

        if (!currentScreen.exists()) return;

        const screenData = currentScreen.data();

        if (isFreshExitCommand(screenData.remoteCommand, screenData.commandStatus)) {
          return;
        }

        const telemetryHeartbeat = telemetryRef.current.heartbeat();
        const telemetrySnapshot = telemetryHeartbeat?.snapshot;
        const heartbeatPayload = {
          connectedDeviceId: localDeviceId,
          activeDeviceId: deleteField(),
          status: "online",
          lastConnection: new Date().toLocaleString("pt-BR"),
          lastSeenAt: serverTimestamp(),
        };

        await updateDoc(screenDocRef, heartbeatPayload);

        const binding = playerBindingRef.current;
        const canSyncTelemetry = telemetrySnapshot
          && telemetryHeartbeat?.due
          && binding?.status === "ACTIVE"
          && binding.clientId === clientId
          && binding.screenId === screen.id
          && binding.deviceId === localDeviceId;

        if (canSyncTelemetry) {
          await updateDoc(screenDocRef, {
            telemetry: {
            schemaVersion: telemetrySnapshot.schemaVersion,
            session: telemetrySnapshot.session,
            current: telemetrySnapshot.current,
            counters: telemetrySnapshot.counters,
            lastPlayerEvents: telemetrySnapshot.lastPlayerEvents.slice(-3),
            transitions: telemetrySnapshot.transitions.slice(-2),
            },
            telemetryUpdatedAt: serverTimestamp(),
          });
        }

        if (canSyncTelemetry && telemetryHeartbeat.outbox.length > 0 && Date.now() - lastTelemetryHistorySyncRef.current >= 15 * 60 * 1000) {
          const pending = telemetryHeartbeat.outbox.at(-1);
          await setDoc(
            doc(db, "clients", clientId, "screens", screen.id, "telemetrySessions", telemetrySnapshot.session.sessionId),
            { ...pending.payload, sequence: pending.sequence, updatedAt: serverTimestamp() },
            { merge: true }
          );
          telemetryRef.current.acknowledge(pending.sequence);
          lastTelemetryHistorySyncRef.current = Date.now();
        }
      } catch (error) {
        console.log(error);
      }
    }

    sendHeartbeat();

    const interval = setInterval(() => {
      sendHeartbeat();
    }, 15000);

    const onVisible = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    window.addEventListener("online", sendHeartbeat);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", sendHeartbeat);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [screen?.id, clientId, maintenanceMode, blackoutMode, takeoverMessage]);

  useEffect(() => {
    if (!screen?.id || !clientId) return;
    let cancelled = false;
    async function updateLocation() {
      try {
        const deviceLocation = await resolveScreenLocationSnapshot();
        if (!deviceLocation || cancelled || exitingTvRef.current) return;
        await updateDoc(doc(db, "clients", clientId, "screens", screen.id), {
          deviceLocation,
          deviceLocationCity: deviceLocation.cityLabel || deviceLocation.city || "",
          deviceLocationUpdatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.log("Erro ao atualizar localização da TV:", error);
      }
    }
    updateLocation();
    const interval = setInterval(updateLocation, SCREEN_LOCATION_CACHE_TTL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [screen?.id, clientId]);

  async function releaseCurrentScreen() {
    if (!screen?.id || !clientId) return;

    try {
      exitingTvRef.current = true;
      clearTimeout(returnToTvTimerRef.current);
      if (IS_PLAYER_TELEMETRY_BUILD && playerBindingRef.current?.status === "ACTIVE") {
        await revokeOwnPlayerBinding({ app: firebaseApp, auth, reason: "PLAYER_RELEASE" });
        playerBindingRef.current = null;
        playerIdentityStateRef.current = PLAYER_IDENTITY_STATES.REVOKED;
        return;
      }
      const screenRef = doc(db, "clients", clientId, "screens", screen.id);
      const localDeviceId = getTotemDeviceId();

      await runTransaction(db, async (transaction) => {
        const currentScreen = await transaction.get(screenRef);

        if (!currentScreen.exists()) return;
        const connectedDeviceId = currentScreen.data().connectedDeviceId;
        if (connectedDeviceId && connectedDeviceId !== localDeviceId) return;

        transaction.update(screenRef, {
          connectedDeviceId: deleteField(),
          activeDeviceId: deleteField(),
          status: "offline",
          lastSeenAt: null,
          commandStatus: "disconnected",
        });
      });
    } catch (error) {
      console.log("Não foi possível liberar o vínculo da TV:", error);
    }
  }


  useEffect(() => {
    if (!screen?.id || !clientId) return;

    const screenDocRef = doc(
      db,
      "clients",
      clientId,
      "screens",
      screen.id
    );

    let firstSnapshot = true;

    const unsubscribe = onSnapshot(screenDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const remoteCommand = data.remoteCommand;

      if (!remoteCommand?.id) {
        firstSnapshot = false;
        return;
      }

      const isPendingExit = isFreshExitCommand(remoteCommand, data.commandStatus);

      if (firstSnapshot && !isPendingExit) {
        lastCommandIdRef.current = remoteCommand.id;
        setLastCommandId(remoteCommand.id);
        firstSnapshot = false;
        return;
      }

      firstSnapshot = false;

      if (lastCommandIdRef.current === remoteCommand.id) {
        return;
      }

      lastCommandIdRef.current = remoteCommand.id;
      setLastCommandId(remoteCommand.id);

      if (remoteCommand.type === "exitTv") {
        if (!isFreshExitCommand(remoteCommand, data.commandStatus)) return;

        exitingTvRef.current = true;
        await releaseCurrentScreen();
        clearTvConnectionAndShowCode("remote-exit-command");
        return;
      }

      try {
        await updateDoc(screenDocRef, {
          lastCommandExecuted: remoteCommand.type || "",
          lastCommandExecutedAt: serverTimestamp(),
          commandStatus: "executed",
          lastSeenAt: serverTimestamp(),
          status: "online",
        });
      } catch (error) {
        console.log(error);
      }

      if (remoteCommand.type === "reload") {
        window.location.reload();
        return;
      }

      if (remoteCommand.type === "refresh") {
        setMediaIndex(0);
        setNow(new Date());
        return;
      }

      if (remoteCommand.type === "clearCache") {
        clearScreenMediaCache(clientId)
          .then((result) => {
            updateLocalMediaCacheMap({});
            const stats = getMediaCacheStats(clientId);
            const clearedStatus = {
              cacheStatus: "preparando",
              cachedItems: 0,
              totalCacheableItems: 0,
              failedCacheItems: 0,
              cacheSizeBytes: stats.cacheSizeBytes,
              currentMediaSource: "remote",
            };
            setPlayerCacheStatus(clearedStatus);
            reportCacheStatus(clearedStatus);
            console.log(`Cache da tela limpo: ${result.removed} arquivo(s).`);
          })
          .catch((error) => {
            console.log("Erro ao limpar cache da tela:", error);
          });
        return;
      }

      if (remoteCommand.type === "pause") {
        if (!maintenanceMode && !blackoutMode && !takeoverMessage) {
          setPauseMode(true);
        }
        return;
      }

      if (remoteCommand.type === "play") {
        setPauseMode(false);
        setNow(new Date());
        return;
      }

      if (remoteCommand.type === "blackout") {
        setBlackoutMode(true);
        setMaintenanceMode(false);
        setTakeoverMessage(null);
        return;
      }

      if (remoteCommand.type === "maintenance") {
        setMaintenanceMode(true);
        setBlackoutMode(false);
        setTakeoverMessage(null);
        setRemoteOverlay(null);
        setPauseMode(false);
        return;
      }

      if (remoteCommand.type === "clear") {
        setBlackoutMode(false);
        setMaintenanceMode(false);
        setTakeoverMessage(null);
        setRemoteOverlay(null);
        setPauseMode(false);
        return;
      }

      if (remoteCommand.type === "overlay") {
        setRemoteOverlay({
          title: remoteCommand.title || "Mensagem",
          message: remoteCommand.message || "",
        });

        setTimeout(() => {
          setRemoteOverlay(null);
        }, Number(remoteCommand.duration || 10) * 1000);

        return;
      }

      if (remoteCommand.type === "takeover") {
        setTakeoverMessage({
          title: remoteCommand.title || "Atenção",
          message: remoteCommand.message || "",
        });

        setBlackoutMode(false);
        setMaintenanceMode(false);

        if (Number(remoteCommand.duration || 0) > 0) {
          setTimeout(() => {
            setTakeoverMessage(null);
          }, Number(remoteCommand.duration) * 1000);
        }

        return;
      }
    });

    return () => unsubscribe();
  }, [screen?.id, clientId]);


  useEffect(() => {
    if (!screen?.id || !clientId || !activePlaylist) return;

    const items = playerItems;
    const safeIndex = mediaIndex >= items.length ? 0 : mediaIndex;
    const currentItem = items[safeIndex];

    if (!currentItem) return;

    const screenDocRef = doc(
      db,
      "clients",
      clientId,
      "screens",
      screen.id
    );

    async function updateNowPlaying() {
      try {
        await updateDoc(screenDocRef, {
          nowPlayingTitle: currentItem.title || currentItem.name || "",
          nowPlayingType:
            currentItem.playerItemType === "template"
              ? `Template ${currentItem.type || ""}`
              : currentItem.type || "",
          nowPlayingDuration: Number(currentItem.duration || 10),
          nowPlayingPreview: currentItem.remotePreview || currentItem.preview || "",
          nowPlayingOrientation: getPreviewOrientation(currentItem),
          nowPlayingAspectRatio: currentItem.aspectRatio || "",
          nowPlayingWidth: currentItem.width || null,
          nowPlayingHeight: currentItem.height || null,
          nowPlayingTemplateType: currentItem.templateType || "",
          nowPlayingItemType: currentItem.playerItemType || "",
          nowPlayingSound: currentItem.sound || false,
          currentMediaSource: currentItem.currentMediaSource || "remote",
          nowPlayingIndex: safeIndex + 1,
          nowPlayingTotal: items.length,
          currentPlaylistId: activePlaylist.id || "",
          currentPlaylistName: activePlaylist.name || "",
          currentPlaylistMode: activeMode,
          lastMediaUpdateAt: serverTimestamp(),
        });
      } catch (error) {
        console.log(error);
      }
    }

    updateNowPlaying();
  }, [screen?.id, clientId, activePlaylist?.id, activeMode, mediaIndex, activeItemsKey, mediaCacheReadyKey]);

  useEffect(() => {
    if (!clientId) return;

    const unsubscribe = onSnapshot(
      collection(db, "clients", clientId, "playlists"),
      (snapshot) => {
        const list = snapshot.docs.map((playlistDoc) => ({
          id: playlistDoc.id,
          ...playlistDoc.data(),
        }));

        setAllPlaylists(list);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !screen?.id) return;

    const unsubscribe = onSnapshot(
      collection(db, "clients", clientId, "templates"),
      (snapshot) => {
        const list = snapshot.docs.map((templateDoc) => ({
            id: templateDoc.id,
            ...templateDoc.data(),
          }));
        const screenScopedTemplates = list
          .filter((template) => {
            if (!template.enabled) return false;

            if (
              template.targetScreenIds &&
              template.targetScreenIds.length > 0 &&
              !template.targetScreenIds.includes(screen.id)
            ) {
              return false;
            }

            return true;
          });

        setClientTemplates(list);
        setScreenTemplates(screenScopedTemplates);
      }
    );

    return () => unsubscribe();
  }, [clientId, screen?.id]);

  useEffect(() => {
    if (!screen?.playlistId || !clientId) {
      setDefaultPlaylist(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "clients", clientId, "playlists", screen.playlistId),
      (playlistDoc) => {
        if (playlistDoc.exists()) {
          setDefaultPlaylist({ id: playlistDoc.id, ...playlistDoc.data() });
        } else {
          setDefaultPlaylist(null);
        }
      }
    );

    return () => unsubscribe();
  }, [screen, clientId]);

  useEffect(() => {
    if (!screen?.templateEnabled || !screen?.templateId || !clientId) {
      setActiveTemplate(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "clients", clientId, "templates", screen.templateId),
      (templateDoc) => {
        if (templateDoc.exists()) {
          setActiveTemplate({ id: templateDoc.id, ...templateDoc.data() });
        } else {
          setActiveTemplate(null);
        }
      }
    );

    return () => unsubscribe();
  }, [screen?.templateEnabled, screen?.templateId, clientId]);

  useEffect(() => {
    const selected = chooseActivePlaylist();

    const previousId = activePlaylist?.id;
    const nextId = selected.playlist?.id || "";

    setActivePlaylist(selected.playlist || null);
    setActiveMode(selected.mode);

    if (nextId && nextId !== previousId) {
      transitionInProgressRef.current = false;
      setPreviousMediaIndex(null);
      setReadyMediaKey("");
      setMediaIndex(0);
    }
  }, [allPlaylists, defaultPlaylist, now, screen?.id, screen?.playlistId]);

  useEffect(() => {
    const items = playerItems;

    if (items.length === 0) return;

    setMediaIndex((prev) => {
      const previousIdentity = lastPlaybackItemIdentityRef.current;

      if (previousIdentity) {
        const preservedIndex = items.findIndex(
          (item) => getStablePlayerItemIdentity(item) === previousIdentity
        );

        if (preservedIndex >= 0) return preservedIndex;
      }

      if (prev >= items.length) return 0;
      return prev;
    });
  }, [activePlaylist?.id, activeItemsKey]);

  useEffect(() => {
    const currentItem = playerItems[mediaIndex] || playerItems[0];
    if (!currentItem) return;
    lastPlaybackItemIdentityRef.current = getStablePlayerItemIdentity(currentItem);
  }, [activeItemsKey, mediaIndex]);

  useEffect(() => {
    const items = playerItems;
    if (items.length === 0) return;

    const safeIndex = mediaIndex >= items.length ? 0 : mediaIndex;
    const currentItem = items[safeIndex];
    const currentKey = getPlayerItemKey(currentItem, safeIndex);
    const durationInSeconds = Number(currentItem?.duration);
    const fallbackDuration = currentItem?.playerItemType === "template" ? 15 : 10;
    const durationInMs =
      Number.isFinite(durationInSeconds) && durationInSeconds > 0
        ? durationInSeconds * 1000
        : fallbackDuration * 1000;
    const timingKey = `${currentKey}-${durationInMs}-${
      isSingleImagePlaylist(items) ? singleImageLoopCycle : ""
    }`;
    const isPlaybackBlocked =
      pauseMode || takeoverMessage || blackoutMode || maintenanceMode;
    const isWaitingForAndroidTvVideo =
      isAndroidSmartTv &&
      currentItem?.type === "Vídeo" &&
      readyMediaKey !== currentKey;

    if (playbackTimingKeyRef.current !== timingKey) {
      if (playbackTimerRef.current) recordJumpEvent("TIMER_CANCELLED", { reason: "timing-key-change", index: safeIndex, mediaId: currentItem?.mediaId || currentItem?.id || "", timingKey: playbackTimingKeyRef.current });
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
      playbackTimingKeyRef.current = timingKey;
      playbackRemainingRef.current = durationInMs;
      playbackStartedAtRef.current = 0;
      advancingRef.current = false;
    }

    if (isPlaybackBlocked || advancingRef.current || isWaitingForAndroidTvVideo) return;

    playbackStartedAtRef.current = Date.now();
    const remaining = Math.max(0, playbackRemainingRef.current);
    const expectedFireAt = Date.now() + remaining;
    recordJumpEvent("TIMER_CREATED", { expectedFireAt, remainingMs: remaining, durationMs: durationInMs, index: safeIndex, mediaId: currentItem?.mediaId || currentItem?.id || "", timingKey });

    playbackTimerRef.current = setTimeout(() => {
      const video = document.querySelector(".player-transition-layer.is-current video");
      recordJumpEvent("TIMER_FIRED", { expectedFireAt, actualFireAt: Date.now(), remainingMs: remaining, durationMs: durationInMs, ...mediaElementSnapshot(video, currentItem?.mediaId || currentItem?.id || "", safeIndex) });
      playbackTimerRef.current = null;
      playbackRemainingRef.current = 0;
      goToNextMedia(currentItem?.playerItemType === "template" ? "TEMPLATE_TIMER" : currentItem?.type === "Imagem" ? "IMAGE_TIMER" : "VIDEO_TIMER");
    }, remaining);

    return () => {
      if (!playbackTimerRef.current) return;

      recordJumpEvent("TIMER_CANCELLED", { reason: "effect-cleanup", expectedFireAt, index: safeIndex, mediaId: currentItem?.mediaId || currentItem?.id || "", currentTime: document.querySelector(".player-transition-layer.is-current video")?.currentTime ?? null });
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
      playbackRemainingRef.current = Math.max(
        0,
        playbackRemainingRef.current - (Date.now() - playbackStartedAtRef.current)
      );
    };
  }, [activePlaylist?.id, activeItemsKey, mediaIndex, readyMediaKey, pauseMode, takeoverMessage, blackoutMode, maintenanceMode, isAndroidSmartTv, singleImageLoopCycle]);

  useEffect(() => {
    const mediaElement = document.querySelector(
      ".player-buffer-layer.is-current .player-media"
    );

    if (!mediaElement || mediaElement.tagName !== "VIDEO") {
      return;
    }

    if (pauseMode) {
      mediaElement.pause();
      return;
    }

    mediaElement.play().catch((error) => {
      console.log("Autoplay bloqueado ao retomar vídeo:", error);
    });
  }, [pauseMode, mediaIndex, activePlaylist?.id]);

  const playerPlanAccess = getClientPlanAccess(playerClient);
  const showDemoWatermark = Boolean(
    playerClient &&
    getPlanConfig(playerClient.plan).watermarkEnabled &&
    playerClient.demoWatermarkEnabled !== false
  );
  const demoTickerText = String(playerClient?.demoTickerText || DEFAULT_DEMO_TICKER_TEXT).trim();
  const showDemoTicker = Boolean(
    showDemoWatermark &&
    playerClient?.demoTickerEnabled !== false &&
    demoTickerText
  );
  const demoPlayerOverlay = showDemoWatermark ? (
    <>
      <div className="demo-player-watermark">
        <img src={logo} alt="" />
        <span>Demonstração</span>
      </div>

      {showDemoTicker && (
        <div className="demo-player-bottom-bar">
          <span>{demoTickerText}</span>
        </div>
      )}
    </>
  ) : null;
  const playerCacheSyncLabel = getCacheSyncLabel(playerCacheStatus);
  const shouldShowPlayerCacheSyncLabel = Boolean(
    playerCacheSyncLabel &&
    playerCacheStatus.cacheStatus === "preparando"
  );

  if (loading || clientLoading) {
    return <div className="player-screen">Carregando player...</div>;
  }

  if (playerClient && !playerPlanAccess.canShowTvContent) {
    return (
      <TvSuspensionScreen
        client={playerClient}
        access={playerPlanAccess}
        orientationClass={getPlayerOrientationClass()}
      />
    );
  }

  if (blackoutMode) {
    return (
      <div className={`player-screen tv-blackout-screen ${getPlayerOrientationClass()}`}></div>
    );
  }

  if (maintenanceMode) {
    return (
      <div className={`player-screen tv-maintenance-screen ${getPlayerOrientationClass()}`}>
        <div className="tv-maintenance-content">
          <img src={logo} alt="Totem Park" />

          <div className="tv-maintenance-icon">
            🛠️
          </div>

          <h1>
            <span>TELA</span> em Manutenção
          </h1>

          <div className="tv-maintenance-divider"></div>

          <p>
            Aguarde. Esta tela está temporariamente em modo manutenção.
          </p>

          <div className="tv-maintenance-loader"></div>
        </div>
      </div>
    );
  }

  if (takeoverMessage) {
    return (
      <div className={`player-screen tv-takeover-screen ${getPlayerOrientationClass()}`}>
        <div className="tv-takeover-content">
          <h1>{takeoverMessage.title}</h1>
          <p>{takeoverMessage.message}</p>
        </div>
      </div>
    );
  }

  if (!screen) {
    const validationMessage = {
      [LINK_STATES.OFFLINE]: "Offline. Vínculo preservado; aguardando reconexão.",
      [LINK_STATES.VALIDATION_ERROR]: "Não foi possível validar agora. Vínculo preservado.",
      [LINK_STATES.VALIDATION_TIMEOUT]: "Validação pendente. Vínculo preservado.",
      [LINK_STATES.DEVICE_CONFLICT]: "Conflito de dispositivo pendente. Vínculo preservado.",
    }[linkValidationState] || "Validando vínculo da tela...";
    return <div className="player-screen">{validationMessage}</div>;
  }

  if (activeTemplate) {
    return (
      <div className={`player-screen ${getPlayerOrientationClass()}`}>
        <TemplateVisualPreview
          template={applyOfflineAssetUrls(activeTemplate, offlineAssetMap)}
          tv
        />

        {offlineCacheStatus && (
          <div className={`offline-cache-status ${offlineCacheStatus}`}>
            {offlineCacheStatus === "downloading"
              ? "Baixando conteúdo offline..."
              : offlineCacheStatus === "ready"
                ? "Conteúdo disponível offline"
                : "Cache offline parcial"}
          </div>
        )}

        {demoPlayerOverlay}

        {shouldShowPlayerCacheSyncLabel && !offlineCacheStatus && (
          <div className="offline-cache-status smart-cache-status">
            {playerCacheSyncLabel}
          </div>
        )}

        <button
          className="tv-player-exit-button"
          onClick={() => {
            releaseCurrentScreen().finally(() => {
              clearTvConnectionAndShowCode("operator-exit-button");
            });
          }}
        >
          Sair da TV
        </button>
      </div>
    );
  }

  if ((!activePlaylist || !activePlaylist.items || activePlaylist.items.length === 0) && screenTemplates.length === 0) {
    return (
      <div className="player-screen">
        <div className="player-empty">
          <img src={logo} alt="Totem Park" style={{ width: 180 }} />
          <h1>{screen.name}</h1>
          <p>Nenhuma playlist disponível para esta tela.</p>
        </div>
      </div>
    );
  }

  const safeMediaIndex =
    mediaIndex >= playerItems.length ? 0 : mediaIndex;
  const currentMedia = playerItems[safeMediaIndex] || playerItems[0];
  const currentMediaKey = getPlayerItemKey(currentMedia, safeMediaIndex);
  const currentMediaReady =
    currentMedia.playerItemType === "template" ||
    readyMediaKey === currentMediaKey;
  const currentTransitionReady = currentMediaReady;
  const transitionClass = getTransitionClass(activePlaylist?.transition || "Fade suave");
  const transitionSpeedClass = getTransitionSpeedClass(activePlaylist?.transitionSpeed || "Normal");
  const playerOrientationClass = hasManualScreenRotation
    ? "natural-mode"
    : isNativeApp() && isAndroidTv === false
    ? "natural-mode"
    : currentMedia?.playerItemType === "template" && currentMedia.orientation === "Retrato"
      ? "portrait-mode"
      : currentMedia?.playerItemType === "template" && currentMedia.orientation === "Paisagem"
        ? "landscape-mode"
        : getPlayerOrientationClass();

  const visibleLayers = [];

  if (
    !decoderReleasePending &&
    previousMediaIndex !== null &&
    previousMediaIndex !== safeMediaIndex &&
    playerItems[previousMediaIndex]
  ) {
    visibleLayers.push({
      item: playerItems[previousMediaIndex],
      index: previousMediaIndex,
      state: "is-previous",
    });
  }

  if (!decoderReleasePending) {
    visibleLayers.push({
      item: currentMedia,
      index: safeMediaIndex,
      state: currentMediaReady
        ? `is-current is-ready ${currentTransitionReady ? "transition-active" : ""}`
        : "is-current is-pending",
    });
  }

  function renderPlayerItem(item, index, isCurrent) {
    if (item.playerItemType === "template") {
      return <TemplateVisualPreview template={item} tv />;
    }

    if (item.type === "Vídeo") {
      const resolvedSource = resolveAndroidMediaSource(item);
      const source = resolvedSource.kind === "LOCAL" ? "LOCAL" : "REMOTE";
      const diagnosticMedia = { mediaId: item.mediaId || item.id || "", mediaName: item.title || item.name || item.fileName || "", remoteUrl: resolvedSource.remoteUrl, localPath: source === "LOCAL" ? resolvedSource.src : "", fileName: item.fileName || "", sizeBytes: Number(item.sizeBytes || 0), playlistId: activePlaylist?.id || "", screenId: screen?.id || "", src: resolvedSource.src };
      const telemetryMedia = { ...diagnosticMedia, mediaType: "VIDEO", mediaSource: source === "LOCAL" ? "CACHE_LOCAL" : "INTERNET_FALLBACK" };
      const reactKey = `${getPlayerItemKey(item, index)}-${activePlaylistRevision}`;
      const jumpContext = { mediaId: diagnosticMedia.mediaId, index, reactKey, expectedTransition: !isCurrent || transitionInProgressRef.current };
      let videoRef = jumpVideoRefs.current.get(reactKey);
      if (!videoRef && jumpDiagnosticEnabled()) {
        let previousNode = null;
        videoRef = (node) => {
          if (node === previousNode) return;
          if (previousNode) registerVideoElement(null, { ...jumpContext, previousNode });
          previousNode = node;
          if (node) registerVideoElement(node, jumpContext);
        };
        jumpVideoRefs.current.set(reactKey, videoRef);
      }
      const captureVideoEvent = (type, event, extra = {}) => {
        const video = event?.currentTarget;
        recordVideoEvent(type, video, { ...jumpContext, expectedTransition: !isCurrent || transitionInProgressRef.current });
        telemetryRef.current.record(type, { ...telemetryMedia, currentTime: video?.currentTime, duration: video?.duration, readyState: video?.readyState, networkState: video?.networkState, paused: video?.paused, ended: video?.ended, errorCode: video?.error?.code || null, ...extra });
      };
      recordSourceAssigned(source, diagnosticMedia);
      return (
        <video
          ref={videoRef}
          src={resolvedSource.src}
          poster={isAndroidSmartTv ? "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" : undefined}
          autoPlay={!pauseMode}
          muted={!item.sound}
          playsInline
          preload="auto"
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
          className="player-media"
          onLoadStart={(event) => {
            const previousSrc = jumpLastSourceByElement.current.get(event.currentTarget) || "";
            const nextSrc = event.currentTarget.currentSrc || event.currentTarget.src;
            recordSrcChange(event.currentTarget, previousSrc, nextSrc, { ...jumpContext, reason: "loadstart" });
            jumpLastSourceByElement.current.set(event.currentTarget, nextSrc);
          }}
          onLoadedMetadata={(event) => {
            captureVideoEvent("loadedmetadata", event);
            if (isCurrent && !isAndroidSmartTv) markCurrentMediaReady(item, index);
            if (!pauseMode) event.currentTarget.play().catch(() => {});
          }}
          onLoadedData={(event) => {
            captureVideoEvent("loadeddata", event);
            if (isCurrent && !isAndroidSmartTv) markCurrentMediaReady(item, index);

            if (!pauseMode) {
              event.currentTarget.play().catch((error) => {
                console.log("Autoplay aguardando video:", error);
              });
            }
          }}
          onCanPlay={(event) => {
            captureVideoEvent("canplay", event);
            if (isCurrent && !isAndroidSmartTv) markCurrentMediaReady(item, index);
            if (!pauseMode) event.currentTarget.play().catch(() => {});
          }}
          onCanPlayThrough={(event) => captureVideoEvent("canplaythrough", event)}
          onDurationChange={(event) => captureVideoEvent("durationchange", event)}
          onRateChange={(event) => captureVideoEvent("ratechange", event)}
          onTimeUpdate={(event) => recordVideoEvent("timeupdate", event.currentTarget, { ...jumpContext, expectedTransition: !isCurrent || transitionInProgressRef.current })}
          onSeeking={(event) => captureVideoEvent("seeking", event)}
          onSeeked={(event) => captureVideoEvent("seeked", event)}
          onSuspend={(event) => captureVideoEvent("suspend", event)}
          onPlaying={(event) => {
            if (IS_PLAYER_DECODER_LIFECYCLE_BUILD && releasingVideoNodesRef.current.has(event.currentTarget)) return;
            captureVideoEvent("playing", event);
            if (isCurrent && isAndroidSmartTv) markCurrentMediaReady(item, index);
            if (isCurrent) {
              recordPlayback("PLAYBACK_START", source, diagnosticMedia);
              telemetryRef.current.record("PLAYBACK_START", telemetryMedia);
            }
          }}
          onPlay={(event) => {
            captureVideoEvent("play", event);
            if (pauseMode) event.currentTarget.pause();
          }}
          onPause={(event) => captureVideoEvent("pause", event)}
          onAbort={(event) => captureVideoEvent("abort", event)}
          onEmptied={(event) => captureVideoEvent("emptied", event)}
          onEnded={(event) => {
            if (!isCurrent || pauseMode) return;
            captureVideoEvent("ended", event);
            telemetryRef.current.record("PLAYBACK_END", telemetryMedia);
            recordPlayback("PLAYBACK_END", source, diagnosticMedia);
            if (isSingleVideoPlaylist(playerItems)) {
              telemetryTransitionRef.current = telemetryRef.current.startTransition({
                fromMediaId: telemetryMedia.mediaId,
                toMediaId: telemetryMedia.mediaId,
                reason: "LOOP_SINGLE_ITEM",
              });
              restartSingleVideo(event.currentTarget);
              return;
            }
            goToNextMedia("VIDEO_ENDED");
          }}
          onWaiting={(event) => captureVideoEvent("waiting", event)}
          onStalled={(event) => captureVideoEvent("stalled", event)}
          onError={(event) => {
            if (IS_PLAYER_DECODER_LIFECYCLE_BUILD && releasingVideoNodesRef.current.has(event.currentTarget)) return;
            if (!isCurrent) return;
            captureVideoEvent("error", event, { message: "Erro ao carregar vídeo" });
            telemetryRef.current.record("PLAYBACK_ERROR", { ...telemetryMedia, message: "Erro ao carregar vídeo" });
            recordPlayback("PLAYBACK_ERROR", source, { ...diagnosticMedia, message: "Erro ao carregar vídeo" });
            if (fallbackToRemoteMedia(item)) return;
            console.log("Erro ao carregar video. Pulando midia.");
            skipFailedMedia();
          }}
        />
      );
    }

    const resolvedSource = resolveAndroidMediaSource(item);
    const source = resolvedSource.kind === "LOCAL" ? "LOCAL" : "REMOTE";
    const diagnosticMedia = { mediaId: item.mediaId || item.id || "", mediaName: item.title || item.name || item.fileName || "", remoteUrl: resolvedSource.remoteUrl, localPath: source === "LOCAL" ? resolvedSource.src : "", fileName: item.fileName || "", sizeBytes: Number(item.sizeBytes || 0), playlistId: activePlaylist?.id || "", screenId: screen?.id || "", src: resolvedSource.src };
    const telemetryMedia = { ...diagnosticMedia, mediaType: "IMAGE", mediaSource: source === "LOCAL" ? "CACHE_LOCAL" : "INTERNET_FALLBACK" };
    recordSourceAssigned(source, diagnosticMedia);
    return (
      <img
        ref={!isNativeApp() && String(item.preview).startsWith("blob:") ? (image) => {
          // A retained previous layer can become current without another load event.
          if (
            isCurrent && image?.complete && image.naturalWidth > 0 &&
            image.naturalHeight > 0 &&
            readyMediaKey !== getPlayerItemKey(item, index)
          ) {
            markCurrentMediaReady(item, index);
          }
        } : undefined}
        src={resolvedSource.src}
        alt={item.title}
        className="player-media"
        onLoad={() => {
          if (isCurrent) { markCurrentMediaReady(item, index); recordPlayback("PLAYBACK_START", source, diagnosticMedia); telemetryRef.current.record("PLAYBACK_START", telemetryMedia); }
        }}
        onError={() => {
          if (!isCurrent) return;
          telemetryRef.current.record("PLAYBACK_ERROR", { ...telemetryMedia, message: "Erro ao carregar imagem" });
          recordPlayback("PLAYBACK_ERROR", source, { ...diagnosticMedia, message: "Erro ao carregar imagem" });
          if (fallbackToRemoteMedia(item)) return;
          console.log("Erro ao carregar imagem. Pulando midia.");
          skipFailedMedia();
        }}
      />
    );
  }

  return (
    <div className={`player-screen ${playerOrientationClass} ${isAndroidSmartTv ? "android-tv-player" : ""}`}>
      {IS_PLAYER_LAB_BUILD && <button className="player-lab-badge" onClick={() => navigate("/diagnostico-lab")}>LAB · Diagnóstico</button>}
      {IS_PLAYER_CANARY_BUILD && <button className="player-lab-badge" onClick={() => navigate("/diagnostico-canary")}>CANARY · Diagnóstico</button>}
      {IS_PLAYER_RC_BUILD && <button className="player-lab-badge" onClick={() => navigate("/diagnostico-rc")}>RC · Diagnóstico</button>}
      {IS_PLAYER_PHASE_B_BUILD && <button className="player-lab-badge" onClick={() => navigate("/diagnostico-2a2-b")}>2A.2-B · Diagnóstico</button>}
      {IS_PLAYER_LINK_FIX_BUILD && <button className="player-lab-badge" onClick={() => navigate("/diagnostico-link-fix")}>LINK-FIX · Diagnóstico</button>}
      {IS_PLAYER_TELEMETRY_BUILD && <button className="player-lab-badge" onClick={() => navigate("/diagnostico-telemetria")}>2A.2-C · Diagnóstico</button>}
      {(IS_PLAYER_JUMP_DIAG_BUILD || IS_PLAYER_DECODER_EXPERIMENT_BUILD) && <button className="player-lab-badge" onClick={() => navigate("/diagnostico-salto")}>SALTO · Diagnóstico</button>}
      {offlineCacheStatus && (
        <div className={`offline-cache-status ${offlineCacheStatus}`}>
          {offlineCacheStatus === "downloading"
            ? "Baixando conteúdo offline..."
            : offlineCacheStatus === "ready"
              ? "Conteúdo disponível offline"
              : "Cache offline parcial"}
        </div>
      )}

      {shouldShowPlayerCacheSyncLabel && !offlineCacheStatus && (
        <div className="offline-cache-status smart-cache-status">
          {playerCacheSyncLabel}
        </div>
      )}

      {remoteOverlay && (
        <div className="tv-overlay-alert">
          <strong>{remoteOverlay.title}</strong>
          <span>{remoteOverlay.message}</span>
        </div>
      )}

      {pauseMode && (
        <div className="tv-pause-badge">
          PAUSADO PELO PAINEL
        </div>
      )}

      {activeMode === "scheduled" && activePlaylist && (
        <div className="player-schedule-label">
          Programação ativa: {activePlaylist.name}
        </div>
      )}

      {demoPlayerOverlay}

      {visibleLayers.map(({ item, index, state }) => (
        <div
          key={`${getPlayerItemKey(item, index)}-${activePlaylistRevision}`}
          className={`player-transition-layer player-buffer-layer ${state} ${transitionClass} ${transitionSpeedClass} ${item.playerItemType === "template" ? "template-layer" : ""}`}
        >
          {renderPlayerItem(item, index, index === safeMediaIndex)}
        </div>
      ))}
    </div>
  );
}


function PlansPage({ clientView = false } = {}) {
  const [visiblePlanKeys, setVisiblePlanKeys] = useState(getDefaultVisiblePlanKeys());
  const [savingPlanVisibility, setSavingPlanVisibility] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "commercialPlans"),
      (snapshot) => {
        const keys = snapshot.data()?.visiblePlanKeys;
        setVisiblePlanKeys(Array.isArray(keys) ? keys : getDefaultVisiblePlanKeys());
      },
      (error) => {
        console.log("Erro ao carregar visibilidade dos planos:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  async function togglePlanVisibility(plan) {
    const currentlyVisible = isPlanVisibleForClients(plan, visiblePlanKeys);
    const nextKeys = currentlyVisible
      ? visiblePlanKeys.filter((key) => key !== plan.key)
      : [...new Set([...visiblePlanKeys, plan.key])];

    try {
      setSavingPlanVisibility(plan.key);
      await setDoc(
        doc(db, "settings", "commercialPlans"),
        {
          visiblePlanKeys: nextKeys,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setVisiblePlanKeys(nextKeys);
    } catch (error) {
      console.log(error);
      alert("Erro ao alterar visibilidade do plano.");
    } finally {
      setSavingPlanVisibility("");
    }
  }

  const plansToRender = Object.values(COMMERCIAL_PLANS).filter((plan) => {
    if (!clientView) return true;
    return isPlanVisibleForClients(plan, visiblePlanKeys);
  });

  return (
    <>
      <header className="header">
        <div>
          <div className="kicker">Planos</div>
          <h1>Planos do Totem Park</h1>
          <p>
            {clientView
              ? "Conheça os planos disponíveis para contratação e upgrade."
              : "Planos comerciais oficiais. Use Visualizar/Ocultar para controlar o que aparece para clientes."}
          </p>
        </div>
      </header>

      <section className="cards-grid plans-commercial-grid">
        {plansToRender.map((plan) => {
          const visibleForClients = isPlanVisibleForClients(plan, visiblePlanKeys);

          return (
          <div
            className={plan.name === "Professional" ? "plan-card featured" : "plan-card"}
            key={plan.name}
          >
            {plan.name === "Professional" && (
              <div className="plan-recommended">Mais recomendado</div>
            )}
            {!clientView && (
              <div className={`plan-visibility-badge ${visibleForClients ? "visible" : "hidden"}`}>
                {visibleForClients ? "Visível para clientes" : "Oculto para clientes"}
              </div>
            )}
            <h3>{plan.name}</h3>
            <div className="plan-price">
              {plan.priceLabel} <span>/mês</span>
            </div>
            <p className="plan-annual">
              {plan.isDemo ? "Uso interno/comercial" : `Até ${plan.screensLimit} tela(s)`}
            </p>
            <div className="features">
              <Feature text={`${plan.screensLimit} tela(s) incluída(s)`} />
              <Feature text={`${formatStorageSize(plan.storageLimitBytes, plan.isDemo ? 1 : 0)} de armazenamento`} />
              <Feature text={`Vídeo até ${formatStorageSize(plan.maxVideoSizeBytes, 0)}`} />
              <Feature text={`Imagem até ${formatStorageSize(plan.maxImageSizeBytes, 0)}`} />
              {plan.isDemo && <Feature text={`Validade padrão de ${plan.defaultTrialDays} dias`} />}
              {plan.watermarkEnabled && <Feature text="Marca d'água no Player" />}
              <Feature text={plan.premiumTemplates ? "Templates Premium" : "Templates simples"} />
              <Feature text={plan.marketing ? "Marketing integrado" : "Playlists e mídias"} />
            </div>

            {!clientView && (
              <button
                className={visibleForClients ? "client-action warning plan-visibility-button" : "client-action primary plan-visibility-button"}
                disabled={savingPlanVisibility === plan.key}
                onClick={() => togglePlanVisibility(plan)}
              >
                {savingPlanVisibility === plan.key
                  ? "Salvando..."
                  : visibleForClients
                    ? "Ocultar dos clientes"
                    : "Visualizar para clientes"}
              </button>
            )}
          </div>
          );
        })}
      </section>

      {clientView && plansToRender.length === 0 && (
        <section className="panel">
          <p>Nenhum plano está disponível para visualização no momento.</p>
        </section>
      )}
    </>
  );
}

function SettingsPage({ user }) {
  const [developerPassword, setDeveloperPassword] = useState("");
  const [developerUnlocked, setDeveloperUnlocked] = useState(false);
  const [masterEmails, setMasterEmails] = useState(BOOTSTRAP_MASTER_EMAILS);
  const [masterForm, setMasterForm] = useState({ email: "", password: "" });
  const [editingMasterEmail, setEditingMasterEmail] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [savingDeveloperAction, setSavingDeveloperAction] = useState(false);

  useEffect(() => {
    if (!developerUnlocked) return undefined;

    let active = true;

    loadMasterEmails()
      .then((emails) => {
        if (active) setMasterEmails(emails);
      })
      .catch((error) => {
        console.log("Nao foi possivel carregar masters:", error);
      });

    return () => {
      active = false;
    };
  }, [developerUnlocked]);

  function unlockDeveloperMode() {
    if (developerPassword !== DEVELOPER_MODE_PASSWORD) {
      alert("Senha do modo desenvolvedor inválida.");
      return;
    }

    setDeveloperUnlocked(true);
    setDeveloperPassword("");
  }

  async function createJuniorMasterAccount() {
    const email = "juniordoparque10@gmail.com";
    const password = "123456";
    const secondaryApp = initializeApp(firebaseConfig, `secondary-master-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      setSavingDeveloperAction(true);
      await createUserWithEmailAndPassword(secondaryAuth, email, password);
      alert("Master Junior cadastrado no Firebase Auth com senha inicial 123456.");
    } catch (error) {
      console.log(error);

      if (error.code === "auth/email-already-in-use") {
        alert("Este master já existe no Firebase Auth. Ele já está autorizado como master no sistema.");
        return;
      }

      alert("Erro ao cadastrar o master Junior.");
    } finally {
      await deleteApp(secondaryApp).catch(() => {});
      setSavingDeveloperAction(false);
    }
  }

  async function sendMasterPasswordReset(email) {
    try {
      setSavingDeveloperAction(true);
      await sendPasswordResetEmail(auth, email);
      alert(`E-mail de redefinição enviado para ${email}.`);
    } catch (error) {
      console.log(error);
      alert("Erro ao enviar redefinição de senha do master.");
    } finally {
      setSavingDeveloperAction(false);
    }
  }

  async function persistMasterEmails(nextEmails) {
    const normalizedEmails = Array.from(
      new Set(nextEmails.map(normalizeEmail).filter(Boolean))
    );

    if (normalizedEmails.length === 0) {
      alert("Mantenha pelo menos um perfil master ativo.");
      return false;
    }

    await setDoc(
      doc(db, ...MASTER_ACCESS_DOC),
      {
        emails: normalizedEmails,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || auth.currentUser?.email || "",
      },
      { merge: true }
    );

    setMasterEmails(normalizedEmails);
    return true;
  }

  async function createMasterAuthAccount(email, password) {
    if (!password) return;

    if (password.length < 6) {
      throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    }

    const secondaryApp = initializeApp(firebaseConfig, `secondary-master-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      await createUserWithEmailAndPassword(secondaryAuth, email, password);
    } catch (error) {
      if (error.code !== "auth/email-already-in-use") throw error;
    } finally {
      await deleteApp(secondaryApp).catch(() => {});
    }
  }

  function startEditMaster(email) {
    setEditingMasterEmail(email);
    setMasterForm({ email, password: "" });
  }

  function cancelMasterEdit() {
    setEditingMasterEmail("");
    setMasterForm({ email: "", password: "" });
  }

  async function saveMasterAccess() {
    const email = normalizeEmail(masterForm.email);

    if (!email || !email.includes("@")) {
      alert("Informe um e-mail valido para o master.");
      return;
    }

    try {
      setSavingDeveloperAction(true);

      if (masterForm.password) {
        await createMasterAuthAccount(email, masterForm.password);
      }

      const nextEmails = editingMasterEmail
        ? masterEmails.map((item) => item === editingMasterEmail ? email : item)
        : [...masterEmails, email];

      const saved = await persistMasterEmails(nextEmails);
      if (!saved) return;

      cancelMasterEdit();
      alert(
        masterForm.password
          ? "Master salvo e login criado/validado no Firebase Auth."
          : "Acesso master salvo."
      );
    } catch (error) {
      console.log(error);
      alert(error?.message || "Erro ao salvar master.");
    } finally {
      setSavingDeveloperAction(false);
    }
  }

  async function removeMasterAccess(email) {
    const normalizedEmail = normalizeEmail(email);
    const confirmRemove = window.confirm(
      `Remover o acesso master de ${normalizedEmail}?\n\nO usuario pode continuar existindo no Firebase Auth, mas nao entrara mais como master.`
    );

    if (!confirmRemove) return;

    try {
      setSavingDeveloperAction(true);
      const saved = await persistMasterEmails(
        masterEmails.filter((item) => item !== normalizedEmail)
      );

      if (saved) {
        if (editingMasterEmail === normalizedEmail) cancelMasterEdit();
        alert("Acesso master removido.");
      }
    } catch (error) {
      console.log(error);
      alert("Erro ao remover acesso master.");
    } finally {
      setSavingDeveloperAction(false);
    }
  }

  async function updateLoggedMasterPassword() {
    if (!newMasterPassword || newMasterPassword.length < 6) {
      alert("Informe uma nova senha com pelo menos 6 caracteres.");
      return;
    }

    if (!auth.currentUser) {
      alert("Nenhum usuário logado no Firebase Auth.");
      return;
    }

    try {
      setSavingDeveloperAction(true);
      await updatePassword(auth.currentUser, newMasterPassword);
      setNewMasterPassword("");
      alert("Senha do master logado atualizada.");
    } catch (error) {
      console.log(error);
      alert("Não foi possível alterar a senha. Por segurança, faça logout, entre novamente e tente de novo.");
    } finally {
      setSavingDeveloperAction(false);
    }
  }

  return (
    <section className="panel">
      <h2>Configurações</h2>

      <div className="form-grid">
        <div className="form-group">
          <label>Usuário logado</label>
          <input value={user?.email || ""} readOnly />
        </div>
      </div>

      <section className="developer-mode-panel">
        <div className="developer-mode-header">
          <div>
            <div className="kicker">Acesso restrito</div>
            <h3>Modo desenvolvedor</h3>
            <p>Gerencie perfis master e ações sensíveis do sistema.</p>
          </div>
          <span>{developerUnlocked ? "Liberado" : "Bloqueado"}</span>
        </div>

        {!developerUnlocked ? (
          <div className="developer-unlock-row">
            <input
              type="password"
              value={developerPassword}
              placeholder="Senha do desenvolvedor"
              onChange={(event) => setDeveloperPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") unlockDeveloperMode();
              }}
            />
            <button className="client-action primary" onClick={unlockDeveloperMode}>
              Entrar
            </button>
          </div>
        ) : (
          <>
            <div className="developer-master-grid">
              {masterEmails.map((email) => (
                <div className="developer-master-card" key={email}>
                  <small>Perfil master</small>
                  <strong>{email}</strong>
                  <button
                    className="client-action"
                    disabled={savingDeveloperAction}
                    onClick={() => sendMasterPasswordReset(email)}
                  >
                    Redefinir senha por e-mail
                  </button>
                  <button
                    className="client-action"
                    disabled={savingDeveloperAction}
                    onClick={() => startEditMaster(email)}
                  >
                    Editar
                  </button>
                  <button
                    className="client-action danger"
                    disabled={savingDeveloperAction || masterEmails.length <= 1}
                    onClick={() => removeMasterAccess(email)}
                  >
                    Remover acesso
                  </button>
                </div>
              ))}
            </div>

            <div className="developer-actions-box">
              <h4>{editingMasterEmail ? "Editar master" : "Adicionar master"}</h4>
              <p>
                Autoriza e cria o login <strong>juniordoparque10@gmail.com</strong> com senha inicial <strong>123456</strong>, caso ainda não exista.
              </p>
              <div className="developer-unlock-row">
                <input
                  type="email"
                  value={masterForm.email}
                  placeholder="email@dominio.com"
                  onChange={(event) => setMasterForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))}
                />
                <input
                  type="password"
                  value={masterForm.password}
                  placeholder="Senha inicial opcional"
                  onChange={(event) => setMasterForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))}
                />
              </div>
              {editingMasterEmail && (
                <button
                  className="client-action"
                  disabled={savingDeveloperAction}
                  onClick={cancelMasterEdit}
                >
                  Cancelar edicao
                </button>
              )}
              <button
                className="client-action primary"
                disabled={savingDeveloperAction}
                onClick={saveMasterAccess}
              >
                {editingMasterEmail ? "Salvar edicao" : "Adicionar master"}
              </button>
            </div>

            <div className="developer-actions-box">
              <h4>Senha do master logado</h4>
              <p>Por regra do Firebase, o painel só altera diretamente a senha do usuário master atualmente logado.</p>
              <div className="developer-unlock-row">
                <input
                  type="password"
                  value={newMasterPassword}
                  placeholder="Nova senha do master logado"
                  onChange={(event) => setNewMasterPassword(event.target.value)}
                />
                <button
                  className="client-action primary"
                  disabled={savingDeveloperAction}
                  onClick={updateLoggedMasterPassword}
                >
                  Alterar senha
                </button>
              </div>
            </div>

            <div className="developer-actions-box">
              <h4>Clientes</h4>
              <p>
                Cadastro, edição, suspensão e retorno ficam na aba <strong>Clientes</strong>. Senhas de clientes são redefinidas pelo botão <strong>Senha</strong>, usando o fluxo seguro do Firebase.
              </p>
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function MenuItem({ icon, text, active, onClick }) {
  return (
    <button onClick={onClick} className={active ? "menu-item active" : "menu-item"}>
      {icon}
      {text}
    </button>
  );
}

function StatCard({ title, value, icon, status, severity = "" }) {
  return (
    <div className={`stat-card ${severity ? `storage-${severity}` : ""}`}>
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon">{icon}</div>
      </div>

      <div className="stat-value">{value}</div>
      <div className="stat-status">{status}</div>
    </div>
  );
}

function UpgradeAccessCard({ title, message, onClose }) {
  return (
    <section className="upgrade-access-card">
      <div className="upgrade-access-icon">
        <CreditCard size={28} />
      </div>
      <div>
        <div className="kicker">Recurso do plano</div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {onClose && (
        <button type="button" className="client-action" onClick={onClose}>
          Fechar
        </button>
      )}
    </section>
  );
}

function PlanStatusBanner({ access }) {
  if (!access || (access.statusLabel === "Ativo" && !access.hasTemporaryUnlock)) {
    return null;
  }

  const titles = {
    warning: "Plano vencido",
    partial: "Restrição parcial ativa",
    strong: "Modo visualização",
    suspended: "Plano temporariamente suspenso",
    temporary: "Liberação temporária ativa",
  };

  return (
    <section className={`plan-status-banner ${access.severity}`}>
      <div className="plan-status-banner-icon">
        {access.hasTemporaryUnlock ? <Clock3 size={22} /> : <TriangleAlert size={22} />}
      </div>
      <div>
        <strong>{titles[access.severity] || access.statusLabel}</strong>
        <p>{access.message}</p>
      </div>
    </section>
  );
}

function SuspendedClientPanel({ client, access }) {
  const whatsappUrl = "https://wa.me/5584991346016?text=Olá,%20quero%20solicitar%20a%20renovação%20do%20Totem%20Park.";

  return (
    <section className="client-suspension-panel">
      <div className="client-suspension-icon"><CreditCard size={34} /></div>
      <div className="kicker">Acesso ao painel</div>
      <h2>Plano temporariamente suspenso</h2>
      <p>{access.message}</p>
      <div className="client-suspension-details">
        <span>Cliente <strong>{client.name}</strong></span>
        <span>Plano <strong>{getPlanConfig(client.plan).name}</strong></span>
        <span>Dias vencidos <strong>{access.daysOverdue}</strong></span>
      </div>
      <p>Entre em contato com a Park Solutions para reativar.</p>
      <a className="upload-button" href={whatsappUrl} target="_blank" rel="noreferrer">
        Solicitar renovação • 84 99134-6016
      </a>
    </section>
  );
}

function TvSuspensionScreen({ client, access, orientationClass }) {
  return (
    <div className={`player-screen tv-plan-suspension-screen ${orientationClass || ""}`}>
      <div className="tv-plan-suspension-card">
        <div className="tv-plan-suspension-brands">
          <img src={logo} alt="Totem Park" />
          {client.logoUrl && <img src={client.logoUrl} alt={`Logo de ${client.name}`} />}
        </div>
        <div className="kicker">Totem Park Player</div>
        <h1>Plano temporariamente suspenso</h1>
        <p>A exibição desta tela foi pausada até a regularização do plano.</p>
        <div className="tv-plan-suspension-details">
          <span>Cliente <strong>{client.name}</strong></span>
          <span>Plano atual <strong>{getPlanConfig(client.plan).name}</strong></span>
          <span>Vencimento <strong>{client.dueDate || "Não informado"}</strong></span>
          <span>Dias vencidos <strong>{access.daysOverdue}</strong></span>
        </div>
        <div className="tv-plan-suspension-footer">
          <strong>Entre em contato com a Park Solutions</strong>
          <span>WhatsApp: 84 99134-6016</span>
        </div>
      </div>
    </div>
  );
}

function AdminPlanControls({ client, adminUser }) {
  const [form, setForm] = useState({
    plan: getPlanConfig(client.plan).name,
    billing: client.billing || "Mensal",
    dueDate: client.dueDate || "",
    status: client.status || "Ativo",
    screensLimit: String(getClientScreenLimit(client)),
    storageLimitGb: String(getClientStorageLimit(client) / STORAGE_GB),
    maxVideoSizeMb: String(getClientMaxVideoSize(client) / STORAGE_MB),
    maxImageSizeMb: String(getClientMaxImageSize(client) / STORAGE_MB),
  });
  const [saving, setSaving] = useState(false);
  const access = getClientPlanAccess(client);

  useEffect(() => {
    setForm({
      plan: getPlanConfig(client.plan).name,
      billing: client.billing || "Mensal",
      dueDate: client.dueDate || "",
      status: client.status || "Ativo",
      screensLimit: String(getClientScreenLimit(client)),
      storageLimitGb: String(getClientStorageLimit(client) / STORAGE_GB),
      maxVideoSizeMb: String(getClientMaxVideoSize(client) / STORAGE_MB),
      maxImageSizeMb: String(getClientMaxImageSize(client) / STORAGE_MB),
    });
  }, [client]);

  async function unlockForOneDay() {
    try {
      setSaving(true);
      const graceUnlockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(doc(db, "clients", client.id), {
        graceUnlockUntil,
        updatedAt: serverTimestamp(),
      });
      alert("Cliente liberado temporariamente por 24 horas.");
    } catch (error) {
      console.log(error);
      alert("Erro ao liberar o cliente temporariamente.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTemporaryUnlock() {
    try {
      setSaving(true);
      await updateDoc(doc(db, "clients", client.id), {
        graceUnlockUntil: deleteField(),
        updatedAt: serverTimestamp(),
      });
      alert("Liberação temporária removida.");
    } catch (error) {
      console.log(error);
      alert("Erro ao remover a liberação temporária.");
    } finally {
      setSaving(false);
    }
  }

  async function renewPlan() {
    if (!form.dueDate) {
      alert("Informe a nova data de vencimento.");
      return;
    }

    try {
      setSaving(true);
      await updateDoc(doc(db, "clients", client.id), {
        plan: getPlanConfig(form.plan).name,
        billing: form.billing,
        dueDate: form.dueDate,
        status: "Ativo",
        screensLimit: String(Math.max(1, Number(form.screensLimit) || 1)),
        storageLimitBytes: Math.max(STORAGE_MB, Number(form.storageLimitGb) * STORAGE_GB || getPlanLimits(form.plan).storageLimitBytes),
        maxVideoSizeBytes: Math.max(STORAGE_MB, Number(form.maxVideoSizeMb) * STORAGE_MB || getPlanLimits(form.plan).maxVideoSizeBytes),
        maxImageSizeBytes: Math.max(STORAGE_MB, Number(form.maxImageSizeMb) * STORAGE_MB || getPlanLimits(form.plan).maxImageSizeBytes),
        graceUnlockUntil: deleteField(),
        suspendedAt: deleteField(),
        suspensionReason: deleteField(),
        lastRenewedAt: serverTimestamp(),
        lastRenewedBy: adminUser?.email || adminUser?.uid || "Gestor Park Solutions",
        updatedAt: serverTimestamp(),
      });
      alert("Plano renovado com sucesso.");
    } catch (error) {
      console.log(error);
      alert("Erro ao renovar o plano.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-plan-controls">
      <div className="admin-plan-controls-header">
        <div>
          <div className="kicker">Gestão do plano</div>
          <h2>Liberação e renovação</h2>
          <p>Status calculado: <strong>{access.statusLabel}</strong></p>
        </div>
        <div className="admin-plan-quick-actions">
          <button className="client-action primary" onClick={unlockForOneDay} disabled={saving}>
            Liberar por 1 dia
          </button>
          {access.hasTemporaryUnlock && (
            <button className="client-action" onClick={removeTemporaryUnlock} disabled={saving}>
              Remover liberação temporária
            </button>
          )}
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Novo plano</label>
          <select
            value={form.plan}
            onChange={(event) => {
              const plan = event.target.value;
              setForm((current) => ({
                ...current,
                plan,
                screensLimit: String(getPlanConfig(plan).screensLimit),
                storageLimitGb: String(getPlanLimits(plan).storageLimitBytes / STORAGE_GB),
                maxVideoSizeMb: String(getPlanLimits(plan).maxVideoSizeBytes / STORAGE_MB),
                maxImageSizeMb: String(getPlanLimits(plan).maxImageSizeBytes / STORAGE_MB),
              }));
            }}
          >
            {Object.values(COMMERCIAL_PLANS).map((plan) => (
              <option key={plan.name}>{plan.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Tipo de cobrança</label>
          <select value={form.billing} onChange={(event) => setForm({ ...form, billing: event.target.value })}>
            <option>Mensal</option>
            <option>Anual</option>
          </select>
        </div>
        <div className="form-group">
          <label>Nova data de vencimento</label>
          <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
        </div>
        <div className="form-group">
          <label>Status após renovação</label>
          <input value="Ativo" disabled />
        </div>
        <div className="form-group">
          <label>Limite de telas</label>
          <input type="number" min="1" value={form.screensLimit} onChange={(event) => setForm({ ...form, screensLimit: event.target.value })} />
        </div>
        <div className="form-group">
          <label>Limite de armazenamento (GB)</label>
          <input type="number" min="0.1" step="0.1" value={form.storageLimitGb} onChange={(event) => setForm({ ...form, storageLimitGb: event.target.value })} />
        </div>
        <div className="form-group">
          <label>Vídeo máximo (MB)</label>
          <input type="number" min="1" step="1" value={form.maxVideoSizeMb} onChange={(event) => setForm({ ...form, maxVideoSizeMb: event.target.value })} />
        </div>
        <div className="form-group">
          <label>Imagem máxima (MB)</label>
          <input type="number" min="1" step="1" value={form.maxImageSizeMb} onChange={(event) => setForm({ ...form, maxImageSizeMb: event.target.value })} />
        </div>
      </div>

      <div className="panel-actions">
        <button className="upload-button" onClick={renewPlan} disabled={saving}>
          <CreditCard size={18} />
          {saving ? "Salvando..." : "Renovar plano"}
        </button>
      </div>
    </section>
  );
}

function VisibilityControls({ title, options, values, onChange }) {
  return (
    <section className="visibility-controls">
      <div className="visibility-controls-header">
        <div>
          <h3>{title}</h3>
          <p>Escolha o que aparece no preview e no Player TV.</p>
        </div>
      </div>

      <div className="visibility-controls-grid">
        {options.map(([field, label]) => {
          const visible = values[field] !== false;

          return (
            <button
              type="button"
              className={visible ? "visibility-control active" : "visibility-control"}
              key={field}
              onClick={() => onChange(field, !visible)}
            >
              {visible ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{label}</span>
              <strong>{visible ? "Visível" : "Oculto"}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Feature({ text }) {
  return (
    <div className="feature">
      <div className="dot"></div>
      {text}
    </div>
  );
}

function Footer() {
  return <footer className="footer">Desenvolvido por Park Solutions</footer>;
}
