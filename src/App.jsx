import { useEffect, useRef, useState } from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  getAuth,
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
  runTransaction,
  deleteField,
} from "firebase/firestore";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { auth, db, storage } from "./firebase";
import {
  cacheOfflineAssets,
  restoreOfflineAssetMap,
} from "./offline-player-cache";
import logo from "./assets/logo.png";
import "./App.css";

const PUBLIC_WEB_URL = "https://totempark.com.br";
const TotemDevice = registerPlugin("TotemDevice");

function isNativeApp() {
  return (
    typeof window !== "undefined" &&
    (
      window.Capacitor?.isNativePlatform?.() ||
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

function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (value.toDate) return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  return 0;
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

function detectMediaFileMetadata(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(buildMediaDimensions(0, 0));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const isVideo = file.type?.startsWith("video/");
    const element = document.createElement(isVideo ? "video" : "img");

    function finish(width, height) {
      URL.revokeObjectURL(objectUrl);
      resolve(buildMediaDimensions(width, height));
    }

    element.onerror = () => finish(0, 0);

    if (isVideo) {
      element.preload = "metadata";
      element.onloadedmetadata = () => finish(element.videoWidth, element.videoHeight);
      element.src = objectUrl;
      return;
    }

    element.onload = () => finish(element.naturalWidth, element.naturalHeight);
    element.src = objectUrl;
  });
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

  if (!item) {
    return (
      <div className={`media-preview-frame landscape empty ${className}`.trim()}>
        {fallbackIcon}
      </div>
    );
  }

  const measuredItem = detectedDimensions ? { ...item, ...detectedDimensions } : item;
  const realType = measuredItem.templateType || measuredItem.type;
  const isTemplate = measuredItem.playerItemType === "template" || measuredItem.templateType;
  const isMarketingArt = realType === "marketing_art";
  const aspectClass = getPreviewAspectClass(measuredItem);
  const badgeLabel = getPreviewOrientationLabel(measuredItem);
  const frameClass = `media-preview-frame ${aspectClass} ${className}`.trim();

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
  } else if (measuredItem.preview) {
    content = isVideoItem(measuredItem) ? (
      <video
        src={measuredItem.preview}
        muted={!controls}
        controls={controls}
        autoPlay={autoPlay}
        loop={autoPlay}
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          handleDetectedSize(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
        }}
      />
    ) : (
      <img
        src={measuredItem.preview}
        alt={measuredItem.title || measuredItem.name || "Preview"}
        onLoad={(event) => {
          handleDetectedSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
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
  "Jovem Pan": "https://jovempan.com.br/feed",
  "GE": "https://ge.globo.com/rss/ge/",
  "Personalizado": "",
};

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
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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
  return (
    item?.thumbnail ||
    item?.enclosure?.link ||
    item?.enclosure?.url ||
    item?.media?.content?.url ||
    item?.media?.thumbnail?.url ||
    item?.["media:content"]?.url ||
    item?.["media:thumbnail"]?.url ||
    ""
  );
}

async function fetchWeatherByCity(cityName) {
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

async function fetchNewsFromRss(feedUrl) {
  const url = (feedUrl || "").trim();

  if (!url) {
    return DEFAULT_NEWS_ITEMS;
  }

  try {
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

function getTemplateThemeStyle(template) {
  const tickerSpeed = getTemplateTickerSpeed(template?.tickerSpeed);

  return {
    "--template-primary": template?.primaryColor || "#06b6d4",
    "--template-secondary": template?.secondaryColor || "#9333ea",
    "--template-accent": template?.accentColor || "#22d3ee",
    "--template-text": template?.textColor || "#ffffff",
    "--template-ticker-duration": `${getTemplateTickerDuration(tickerSpeed)}s`,
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
  if (speed === "fast") return "Rapida";
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
  const sources = getTemplateNewsSources(template);
  const customMap = customNewsSources.reduce((map, source) => {
    map[source.name] = source.url;
    return map;
  }, {});

  return sources
    .map((sourceName) => {
      if (sourceName === "Personalizado") return template?.newsFeedUrl;
      return customMap[sourceName] || NEWS_SOURCE_PRESETS[sourceName] || "";
    })
    .filter(Boolean);
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

function getWeatherConditionLabel(code) {
  const value = Number(code);
  if ([0, 1].includes(value)) return "Ensolarado";
  if ([2, 3].includes(value)) return "Parcialmente nublado";
  if ([45, 48].includes(value)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(value)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "Frio intenso";
  if ([95, 96, 99].includes(value)) return "Temporal";
  return "Tempo atualizado";
}

function getWeatherForecastCards(weather) {
  const daily = weather?.daily;
  const dates = daily?.time || [];

  return dates.slice(1, 5).map((date, index) => {
    const parsedDate = new Date(`${date}T12:00:00`);
    return {
      day: parsedDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase(),
      icon: getWeatherIcon(daily?.weather_code?.[index + 1]),
      max: Math.round(daily?.temperature_2m_max?.[index + 1] ?? 0),
      min: Math.round(daily?.temperature_2m_min?.[index + 1] ?? 0),
    };
  });
}

function getTemplateClockParts(template) {
  const now = new Date();
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
  ["showTitle", "Título"],
  ["showSubtitle", "Subtítulo"],
  ["showFooter", "Rodapé"],
];

const COMMERCIAL_PLANS = {
  Start: {
    name: "Start",
    price: 49.9,
    priceLabel: "R$ 49,90",
    screensLimit: 2,
    premiumTemplates: false,
    marketing: false,
  },
  Business: {
    name: "Business",
    price: 99,
    priceLabel: "R$ 99,00",
    screensLimit: 5,
    premiumTemplates: true,
    marketing: false,
  },
  Professional: {
    name: "Professional",
    price: 199,
    priceLabel: "R$ 199,00",
    screensLimit: 10,
    premiumTemplates: true,
    marketing: true,
  },
  Enterprise: {
    name: "Enterprise",
    price: 299,
    priceLabel: "R$ 299,00",
    screensLimit: 30,
    premiumTemplates: true,
    marketing: true,
  },
};

const STORAGE_GB = 1024 ** 3;
const STORAGE_MB = 1024 ** 2;

function getPlanLimits(planName) {
  const plan = getPlanConfig(planName);
  const limits = {
    Start: { storageGb: 5, videoMb: 100, imageMb: 10 },
    Business: { storageGb: 20, videoMb: 250, imageMb: 20 },
    Professional: { storageGb: 50, videoMb: 500, imageMb: 30 },
    Enterprise: { storageGb: 200, videoMb: 1024, imageMb: 50 },
  }[plan.name];

  return {
    screensLimit: plan.screensLimit,
    storageLimitBytes: limits.storageGb * STORAGE_GB,
    maxVideoSizeBytes: limits.videoMb * STORAGE_MB,
    maxImageSizeBytes: limits.imageMb * STORAGE_MB,
    marketingEnabled: plan.marketing,
    premiumTemplatesEnabled: plan.premiumTemplates,
  };
}

function getClientStorageLimit(client) {
  const customLimit = Number(client?.storageLimitBytes);
  return customLimit > 0 ? customLimit : getPlanLimits(client?.plan).storageLimitBytes;
}

function getMediaStorageUsed(mediaList = []) {
  return mediaList.reduce((total, media) => total + Math.max(0, Number(media?.sizeBytes) || 0), 0);
}

function formatStorageSize(bytes, fractionDigits = 2) {
  const safeBytes = Math.max(0, Number(bytes) || 0);
  if (safeBytes < STORAGE_GB) return `${(safeBytes / STORAGE_MB).toFixed(safeBytes ? 1 : 0)} MB`;
  return `${(safeBytes / STORAGE_GB).toFixed(fractionDigits)} GB`;
}

function formatFileSizeMb(bytes) {
  return `${(Math.max(0, Number(bytes) || 0) / STORAGE_MB).toFixed(2)} MB`;
}

function getStorageUsage(usedBytes, limitBytes) {
  const safeLimit = Math.max(1, Number(limitBytes) || 1);
  const percentage = Math.min(100, (Math.max(0, Number(usedBytes) || 0) / safeLimit) * 100);
  if (percentage >= 95) return { percentage, label: "Cheio", severity: "danger" };
  if (percentage >= 80) return { percentage, label: "Atenção", severity: "warning" };
  return { percentage, label: "Normal", severity: "normal" };
}

const LEGACY_PLAN_NAMES = {
  "Básico": "Start",
  Basico: "Start",
  Start: "Start",
  Business: "Business",
  Profissional: "Professional",
  Professional: "Professional",
  Enterprise: "Enterprise",
};

function getPlanConfig(planName) {
  const normalizedName = LEGACY_PLAN_NAMES[planName] || "Start";
  return COMMERCIAL_PLANS[normalizedName];
}

function getClientScreenLimit(client) {
  const configuredLimit = Number(client?.screensLimit);
  return configuredLimit > 0
    ? configuredLimit
    : getPlanConfig(client?.plan).screensLimit;
}

function hasPremiumTemplates(client) {
  return getPlanConfig(client?.plan).premiumTemplates;
}

function hasMarketingAccess(client) {
  return getPlanConfig(client?.plan).marketing;
}

function isPremiumTemplate(templateOrType) {
  const type = typeof templateOrType === "string"
    ? templateOrType
    : templateOrType?.templateType || templateOrType?.type;

  return PREMIUM_TEMPLATE_TYPES.includes(type);
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

const firebaseConfig = {
  apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
  authDomain: "totem-park.firebaseapp.com",
  projectId: "totem-park",
  storageBucket: "totem-park.firebasestorage.app",
  messagingSenderId: "442546117681",
  appId: "1:442546117681:web:10106346df8cd91d198910",
};


export default function App() {
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
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedClient, setSelectedClient] = useState(null);
  const [appMode, setAppMode] = useState(() => {
    if (!isNativeApp()) return "web";

    return localStorage.getItem("totempark-app-mode") || "";
  });

  useEffect(() => {
    let unsubscribeClient = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeClient) {
        unsubscribeClient();
        unsubscribeClient = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setLoadingAuth(false);
        return;
      }

      if (firebaseUser.email === "admin@parksolutions.com") {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: "admin",
        });

        setLoadingAuth(false);
        return;
      }

      const clientQuery = query(
        collection(db, "clients"),
        where("uid", "==", firebaseUser.uid)
      );

      unsubscribeClient = onSnapshot(
        clientQuery,
        (snapshot) => {
          if (snapshot.empty) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: "client",
              clientData: null,
            });
          } else {
            const clientDoc = snapshot.docs[0];

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: "client",
              clientData: {
                id: clientDoc.id,
                ...clientDoc.data(),
              },
            });
          }

          setLoadingAuth(false);
        },
        (error) => {
          console.log(error);
          setUser(null);
          setLoadingAuth(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeClient) {
        unsubscribeClient();
      }
    };
  }, []);

  if (loadingAuth) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Carregando...</h1>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

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
      <div className="app">
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
    <div className="app">
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
              icon={<Users size={20} />}
              text="Clientes"
              active={activePage === "clients" && !selectedClient}
              onClick={() => {
                setSelectedClient(null);
                setActivePage("clients");
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
          {!selectedClient && activePage === "dashboard" && <Dashboard />}
          {!selectedClient && activePage === "clients" && (
            <ClientsPage onOpenClient={setSelectedClient} />
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
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleAuth() {
    if (!form.email || !form.password) {
      alert("Preencha e-mail e senha.");
      return;
    }

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      } else {
        await createUserWithEmailAndPassword(auth, form.email, form.password);
      }
    } catch (error) {
      console.log(error);
      alert("Erro ao autenticar.");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-image">
          <img src={logo} alt="Totem Park" />
        </div>

        <p>Sistema profissional de TVs e totens digitais.</p>

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

        <button className="login-button" onClick={handleAuth}>
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <button
          className="login-button secondary"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Criar nova conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const [clients, setClients] = useState([]);
  const [screensData, setScreensData] = useState([]);
  const [playlistsData, setPlaylistsData] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let unsubScreens = [];
    let unsubPlaylists = [];

    const unsubscribeClients = onSnapshot(collection(db, "clients"), (snapshot) => {
      const clientsList = snapshot.docs.map((clientDoc) => ({
        id: clientDoc.id,
        ...clientDoc.data(),
      }));

      setClients(clientsList);
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
    });

    return () => {
      unsubscribeClients();
      unsubScreens.forEach((unsub) => unsub());
      unsubPlaylists.forEach((unsub) => unsub());
    };
  }, []);

  function getLastSeenDate(screen) {
    if (screen.lastSeenAt?.toDate) {
      return screen.lastSeenAt.toDate();
    }

    if (screen.lastSeenAt?.seconds) {
      return new Date(screen.lastSeenAt.seconds * 1000);
    }

    return null;
  }

  function isScreenOnline(screen) {
    const lastSeenDate = getLastSeenDate(screen);

    if (!lastSeenDate) return false;

    const diffInSeconds = (now - lastSeenDate.getTime()) / 1000;

    return diffInSeconds <= 20;
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

  const overdueClients = clients.filter((client) => {
    return getClientPlanAccess(client).isOverdue;
  });

  const clientAccessList = clients.map((client) => ({
    client,
    access: getClientPlanAccess(client),
  }));
  const activePlanClients = clientAccessList.filter(({ access }) => access.isActive);
  const alertPlanClients = clientAccessList.filter(({ access }) => access.statusLabel === "Vencido");
  const partialPlanClients = clientAccessList.filter(({ access }) => access.isPartialRestriction);
  const strongPlanClients = clientAccessList.filter(({ access }) => access.isStrongRestriction);
  const suspendedPlanClients = clientAccessList.filter(({ access }) => access.isSuspended);
  const estimatedMrr = clientAccessList
    .filter(({ access }) => !access.isSuspended)
    .reduce((total, { client }) => total + getPlanConfig(client.plan).price, 0);

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

      <section className="premium-stats">
        <PremiumStatCard
          title="Clientes"
          value={clients.length}
          icon={<Users size={26} />}
          status="Cadastrados"
          link="Ver todos os clientes →"
          color="purple"
        />

        <PremiumStatCard
          title="Telas online"
          value={`${onlineScreens.length}/${screensData.length}`}
          icon={<Monitor size={26} />}
          status="Agora"
          link="Ver todas as telas →"
          color="cyan"
        />

        <PremiumStatCard
          title="Playlists"
          value={playlistsData.length}
          icon={<ListVideo size={26} />}
          status={`${scheduledPlaylists.length} agendada(s)`}
          link="Ver playlists →"
          color="purple"
        />

        <PremiumStatCard
          title="Financeiro"
          value={overdueClients.length}
          icon={<CreditCard size={26} />}
          status="Cliente(s) vencido(s)"
          link="Ver financeiro →"
          color="green"
        />
      </section>

      <section className="admin-plan-kpis">
        <div><span>Ativos</span><strong>{activePlanClients.length}</strong></div>
        <div className="warning"><span>Vencidos</span><strong>{alertPlanClients.length}</strong></div>
        <div className="partial"><span>Restrição parcial</span><strong>{partialPlanClients.length}</strong></div>
        <div className="strong"><span>Restrição forte</span><strong>{strongPlanClients.length}</strong></div>
        <div className="suspended"><span>Suspensos</span><strong>{suspendedPlanClients.length}</strong></div>
        <div className="mrr"><span>MRR estimado</span><strong>{estimatedMrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>
      </section>

      <section className="premium-dashboard-grid">
        <div className="premium-panel">
          <div className="premium-panel-header">
            <div>
              <h2>Telas em tempo real</h2>
              <p>Monitoramento rápido das TVs conectadas.</p>
            </div>

            <div className="premium-screen-summary">
              <span className="online">{onlineScreens.length} online</span>
              <span className="offline">{offlineScreens.length} offline</span>
            </div>
          </div>

          <div className="premium-screen-list">
            {screensData.length === 0 ? (
              <div className="premium-empty">Nenhuma tela cadastrada ainda.</div>
            ) : (
              screensData.slice(0, 8).map((screen) => {
                const online = isScreenOnline(screen);

                return (
                  <div className="premium-screen-row" key={`${screen.clientId}-${screen.id}`}>
                    <div className={online ? "premium-screen-dot online" : "premium-screen-dot offline"}></div>

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
                      </div>
                    </div>

                    <div className="manager-screen-status-col">
                      <div className={online ? "premium-live-badge online" : "premium-live-badge offline"}>
                        {online ? "ONLINE" : "OFFLINE"}
                      </div>

                      <span>
                        {screen.nowPlayingIndex && screen.nowPlayingTotal
                          ? `${screen.nowPlayingIndex}/${screen.nowPlayingTotal}`
                          : "--"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="premium-panel premium-center-panel">
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

      <section className="premium-panel premium-full-panel">
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

function PremiumStatCard({ title, value, icon, status, link, color }) {
  return (
    <div className={`premium-stat-card ${color}`}>
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
    </div>
  );
}


function ClientsPage({ onOpenClient }) {
  const [clients, setClients] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [savingClient, setSavingClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    plan: "Start",
    billing: "Mensal",
    dueDate: "",
    screensLimit: "2",
    storageLimitGb: "5",
    status: "Ativo",
    logoFile: null,
    logoPreview: "",
    logoUrl: "",
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "clients"), (snapshot) => {
      const list = snapshot.docs.map((clientDoc) => ({
        id: clientDoc.id,
        ...clientDoc.data(),
      }));

      setClients(list);
    });

    return () => unsubscribe();
  }, []);

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
      dueDate: "",
      screensLimit: "2",
      storageLimitGb: "5",
      status: "Ativo",
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
      dueDate: client.dueDate || "",
      screensLimit: String(getClientScreenLimit(client)),
      storageLimitGb: String(getClientStorageLimit(client) / STORAGE_GB),
      status: client.status || "Ativo",
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
    setForm((current) => ({
      ...current,
      plan,
      screensLimit: String(getPlanConfig(plan).screensLimit),
      storageLimitGb: String(getPlanLimits(plan).storageLimitBytes / STORAGE_GB),
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

    try {
      setSavingClient(true);

      const clientData = {
        name: form.name.trim(),
        email: form.email.trim(),
        plan: getPlanConfig(form.plan).name,
        billing: form.billing,
        dueDate: form.dueDate,
        screensLimit: String(Math.max(1, Number(form.screensLimit) || 1)),
        storageLimitBytes: Math.max(STORAGE_MB, Number(form.storageLimitGb) * STORAGE_GB || getPlanLimits(form.plan).storageLimitBytes),
        status: form.status,
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
                  <strong>{getPlanConfig(client.plan).name}</strong>
                  <span>{client.billing}</span>
                </div>

                <div>
                  <strong>{client.dueDate || "Não informado"}</strong>
                  <span className={`client-due ${dueInfo.className}`}>
                    {dueInfo.text}
                  </span>
                </div>

                <div>
                  <strong>{getClientScreenLimit(client)}</strong>
                  <span>limite de telas</span>
                </div>

                <div>
                  <span className={`client-status-badge ${getStatusClass(planAccess.statusLabel)}`}>
                    {planAccess.statusLabel}
                  </span>
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
              <h3>Dados principais</h3>

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
      </div>

      {tab === "dashboard" && <ClientDashboard client={currentClient} access={operationalAccess} />}
      {tab === "media" && <ClientMediaPage client={currentClient} access={operationalAccess} />}
      {tab === "playlists" && <ClientPlaylistsPage client={currentClient} access={operationalAccess} />}
      {tab === "screens" && <ClientScreensPage client={currentClient} access={operationalAccess} />}
      {tab === "templates" && <ClientTemplatesPage client={currentClient} access={operationalAccess} />}
      {tab === "marketing" && <ClientMarketingPage client={currentClient} access={operationalAccess} />}
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
    if (screen.lastSeenAt?.toDate) {
      return screen.lastSeenAt.toDate();
    }

    if (screen.lastSeenAt?.seconds) {
      return new Date(screen.lastSeenAt.seconds * 1000);
    }

    return null;
  }

  function isScreenOnline(screen) {
    const lastSeenDate = getLastSeenDate(screen);

    if (!lastSeenDate) return false;

    const diffInSeconds = (Date.now() - lastSeenDate.getTime()) / 1000;

    return diffInSeconds <= 20;
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
          value={planConfig.premiumTemplates ? "Ativo" : "Bloqueado"}
          icon={<Newspaper />}
          status={planConfig.premiumTemplates ? "Recursos liberados" : "Disponível no Business"}
        />

        <StatCard
          title="Marketing"
          value={planConfig.marketing ? "Ativo" : "Bloqueado"}
          icon={<Palette />}
          status={planConfig.marketing ? "Criação de artes liberada" : "A partir do Professional"}
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

              const online = isScreenOnline(screen);

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

                      <div className={online ? "screen-status online" : "screen-status offline"}>
                        <div></div>
                        {online ? "Online agora" : "Offline"}
                      </div>
                    </div>

                    <div className="tv-monitor-meta">
                      <div className={screen.currentPlaylistMode === "scheduled" || active.mode === "scheduled" ? "monitor-mode scheduled" : "monitor-mode"}>
                        {screen.currentPlaylistMode === "scheduled" || active.mode === "scheduled"
                          ? "Agendada ativa"
                          : "Playlist padrão"}
                      </div>

                      <div className={online ? "monitor-heartbeat online" : "monitor-heartbeat offline"}>
                        {online ? "Sinal ativo" : "Sem sinal"}
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
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}


function ClientMediaPage({ client, access = getClientPlanAccess(client) }) {
  const [mediaList, setMediaList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingMedia, setEditingMedia] = useState(null);

  const storageUsedBytes = getMediaStorageUsed(mediaList);
  const storageLimitBytes = getClientStorageLimit(client);
  const storageUsage = getStorageUsage(storageUsedBytes, storageLimitBytes);
  const planLimits = getPlanLimits(client.plan);

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

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      alert("Selecione uma imagem ou vídeo compatível.");
      return false;
    }

    if (isVideo && file.size > planLimits.maxVideoSizeBytes) {
      alert("Este vídeo excede o limite do seu plano. Compacte o arquivo ou faça upgrade.");
      return false;
    }

    if (isImage && file.size > planLimits.maxImageSizeBytes) {
      alert("Esta imagem excede o limite do seu plano.");
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

    const type = file.type.startsWith("video/") ? "Vídeo" : "Imagem";
    const preview = URL.createObjectURL(file);
    const dimensions = await detectMediaFileMetadata(file);

    setForm({
      ...form,
      file,
      preview,
      type,
      title: form.title || file.name,
      ...dimensions,
      sound: type === "Vídeo" ? form.sound : false,
    });
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    handleSelectedFile(file);
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
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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
            item?.playerItemType !== "template" &&
            !item?.templateType;

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

      const fileName = `${Date.now()}_${form.file.name}`;
      const storagePath = `clients/${client.id}/media/${fileName}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, form.file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setProgress(percent);
        },
        (error) => {
          console.log(error);
          alert("Erro ao enviar arquivo.");
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, "clients", client.id, "media"), {
            title: form.title.trim(),
            duration,
            type: form.type,
            preview: downloadURL,
            width: form.width || null,
            height: form.height || null,
            orientation: form.orientation || "Paisagem",
            aspectRatio: form.aspectRatio || "custom",
            sound: form.type === "Vídeo" ? form.sound : false,
            sizeBytes: form.file.size,
            fileName: form.file.name,
            storagePath,
            createdAt: serverTimestamp(),
          });

          resetMediaForm();
          setUploading(false);
          alert("Mídia enviada com sucesso!");
        }
      );
    } catch (error) {
      console.log(error);
      alert("Erro ao enviar mídia.");
      setUploading(false);
    }
  }

  async function deleteMedia(media) {
    if (!requirePlanPermission(access, "canEdit", "excluir mídias")) return;

    try {
      if (media.storagePath) {
        try {
          await deleteObject(ref(storage, media.storagePath));
        } catch (storageError) {
          console.log("Não foi possível remover o arquivo do Storage:", storageError);
        }
      }

      await deleteDoc(doc(db, "clients", client.id, "media", media.id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir mídia.");
    }
  }

  const fileInputId = `media-file-${client.id}`;

  return (
    <>
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

      <section className="upload-panel">
        <div className="upload-preview-box">
          {form.preview ? (
            <UniversalPreview item={form} controls compact={false} />
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
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleSelectedFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                id={fileInputId}
                className="file-input-hidden"
                type="file"
                accept="image/*,video/*"
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
                <UniversalPreview item={media} controls compact={false} />
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

  function getPlaylistItemKey(item) {
    if (item?.playerItemType === "template" || item?.templateType) {
      return getTemplateKey(item.id);
    }

    return getMediaKey(item.id);
  }

  function getSelectedItemByKey(key) {
    if (key?.startsWith("template:")) {
      const templateId = key.replace("template:", "");
      const template = templates.find((item) => item.id === templateId);

      if (!template) return null;

      return {
        ...template,
        title: template.name,
        preview: "",
        sound: false,
        playerItemType: "template",
        templateType: template.type,
        type: template.type,
        duration: Number(template.duration || 15),
      };
    }

    const mediaId = key?.startsWith("media:") ? key.replace("media:", "") : key;
    const media = mediaList.find((item) => item.id === mediaId);

    if (!media) return null;

    return {
      ...media,
      playerItemType: "media",
    };
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

  function renderPlaylistMiniPreview(item) {
    if (!item) return <Monitor size={26} />;

    return <UniversalPreview item={item} className="playlist-preview-frame" compact />;
  }

  function getPlaylistItemLabel(item) {
    if (!item) return "Item não encontrado";

    if (item.playerItemType === "template" || item.templateType) {
      return `${getTemplateTypeLabel(item.templateType || item.type)} • ${item.duration || 15}s`;
    }

    return `${item.type} • ${item.duration}s • ${item.sound ? "Com som" : "Sem som"}`;
  }

  function handleCustomNewsUrlChange(url) {
    const source = saveCustomNewsSource(url);

    setCustomNewsSources(getSavedCustomNewsSources());

    setForm({
      ...form,
      newsSource: source?.name || "Personalizado",
      newsFeedUrl: url,
    });
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


  function handleDragStart(itemKey) {
    setDraggedMediaId(itemKey);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(targetItemKey) {
    if (!draggedMediaId || draggedMediaId === targetItemKey) {
      setDraggedMediaId(null);
      return;
    }

    const updated = [...form.selectedMediaIds];

    const draggedIndex = updated.indexOf(draggedMediaId);
    const targetIndex = updated.indexOf(targetItemKey);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMediaId(null);
      return;
    }

    updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedMediaId);

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

  function resetPlaylistForm() {
    setEditingPlaylist(null);

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

    setForm({
      name: playlist.name || "",
      transition: playlist.transition || "Fade suave",
      transitionSpeed: playlist.transitionSpeed || "Normal",
      orientation: playlist.orientation || "Paisagem",
      selectedMediaIds: playlist.items?.map((item) => getPlaylistItemKey(item)) || [],
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
        .map((key) => getSelectedItemByKey(key))
        .filter(Boolean);

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
                const item = getSelectedItemByKey(itemKey);

                if (!item) return null;

                return (
                  <div
                    key={itemKey}
                    className={
                      draggedMediaId === itemKey
                        ? "playlist-order-item dragging"
                        : "playlist-order-item"
                    }
                    draggable
                    onDragStart={() => handleDragStart(itemKey)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(itemKey)}
                    onDragEnd={() => setDraggedMediaId(null)}
                  >
                    <div className="drag-handle">
                      <GripVertical size={18} />
                    </div>

                    <div className="playlist-order-position">
                      {index + 1}
                    </div>

                    <div className="playlist-order-thumb">
                      {renderPlaylistMiniPreview(item)}
                    </div>

                    <div className="playlist-order-info">
                      <strong>{item.title || item.name}</strong>

                      <span>
                        {getPlaylistItemLabel(item)}
                      </span>
                    </div>

                    <div className="order-buttons">
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
                {playlist.items?.map((item, index) => (
                  <div className="playlist-item" key={`${playlist.id}-${index}`}>
                    <div className="playlist-number">
                      {index + 1}
                    </div>

                    <div className="playlist-thumb">
                      {renderPlaylistMiniPreview(item)}
                    </div>

                    <div className="playlist-item-info">
                      <strong>{item.title || item.name}</strong>

                      <span>
                        {getPlaylistItemLabel(item)}
                      </span>
                    </div>

                    <div>
                      {item.playerItemType === "template" || item.templateType ? (
                        <Newspaper size={18} />
                      ) : item.sound ? (
                        <Volume2 size={18} />
                      ) : (
                        <VolumeX size={18} />
                      )}
                    </div>
                  </div>
                ))}
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
    if (screen.lastSeenAt?.toDate) {
      return screen.lastSeenAt.toDate();
    }

    if (screen.lastSeenAt?.seconds) {
      return new Date(screen.lastSeenAt.seconds * 1000);
    }

    return null;
  }

  function isScreenOnline(screen) {
    const lastSeenDate = getLastSeenDate(screen);

    if (!lastSeenDate) {
      return false;
    }

    const diffInSeconds =
      (now - lastSeenDate.getTime()) / 1000;

    return diffInSeconds <= 20;
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
            const online = isScreenOnline(screen);
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

                    <div className={online ? "screen-status online" : "screen-status offline"}>
                      <div></div>
                      {online ? "Online agora" : "Offline"}
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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(
    storage,
    `clients/${clientId}/marketing/${folder}/${Date.now()}_${safeName}`
  );

  const uploadTask = uploadBytesResumable(storageRef, file);

  await new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      () => {},
      reject,
      resolve
    );
  });

  return getDownloadURL(uploadTask.snapshot.ref);
}

async function uploadClientLogo(clientId, file) {
  if (!file) return "";

  const storageRef = ref(storage, `clients/${clientId}/profile/logo`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  await new Promise((resolve, reject) => {
    uploadTask.on("state_changed", () => {}, reject, resolve);
  });

  return getDownloadURL(uploadTask.snapshot.ref);
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
  const [saving, setSaving] = useState(false);
  const [sendingArtId, setSendingArtId] = useState("");
  const [editingArt, setEditingArt] = useState(null);
  const [form, setForm] = useState(() => ({
    ...getMarketingDefaultForm(),
    logoUrl: client.logoUrl || "",
    logoPreview: client.logoUrl || "",
  }));

  useEffect(() => {
    const unsubscribe = onSnapshot(
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

    return () => unsubscribe();
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

      await addDoc(collection(db, "clients", client.id, "templates"), {
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
      });

      alert("Arte enviada para os Templates da playlist!");
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
    showHeader: true,
    showLogo: true,
    showTitle: true,
    showSubtitle: true,
    showFooter: true,
  });

  useEffect(() => {
    const unsubTemplates = onSnapshot(
      collection(db, "clients", client.id, "templates"),
      (snapshot) => {
        setTemplates(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
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
        subtitle: "Previsao de 4 dias com noticias ao vivo",
        duration: "20",
        city: "Joao Camara",
        selectedNewsSources: ["G1 RN"],
        tickerSpeed: "normal",
        showFooter: true,
      },
      hora_certa_premium: {
        name: "Hora Certa Premium",
        title: "Hora Certa",
        subtitle: "Relogio, data, clima e noticias ao vivo",
        duration: "20",
        city: "Joao Camara",
        selectedNewsSources: ["G1 RN"],
        tickerSpeed: "normal",
        timeFormat: "24h",
        showWeather: true,
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
        ["noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(type)
          ? prev.newsSource || "G1 RN"
          : prev.newsSource,
      newsFeedUrl:
        ["noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(type)
          ? prev.newsFeedUrl || NEWS_SOURCE_PRESETS["G1 RN"]
          : prev.newsFeedUrl,
      selectedNewsSources:
        ["jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(type)
          ? preset.selectedNewsSources || prev.selectedNewsSources || ["G1 RN"]
          : prev.selectedNewsSources,
    }));
  }

  function changeNewsSource(sourceName) {
    const customSource = customNewsSources.find(
      (source) => source.name === sourceName
    );

    setForm((prev) => ({
      ...prev,
      newsSource: sourceName,
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
      showHeader: true,
      showLogo: true,
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
        await updateDoc(
          doc(db, "clients", client.id, "templates", editingTemplate.id),
          templateData
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
      alert("Erro ao salvar template.");
    } finally {
      setSaving(false);
    }
  }

  function startEditTemplate(template) {
    if (!requirePlanPermission(access, "canEditTemplates", "editar templates")) return;
    if ((template.templateType || template.type) === "marketing_art") return;

    const { id, createdAt, updatedAt, ...savedData } = template;
    setEditingTemplate(template);
    setForm((current) => ({
      ...current,
      ...savedData,
      duration: String(template.duration || 15),
      targetScreenIds: Array.isArray(template.targetScreenIds) ? [...template.targetScreenIds] : [],
      menuItems: getTemplateMenuItems(template).map((item) => ({ ...item })),
      promoItems: getTemplatePromoItems(template).map((item) => ({ ...item })),
      corporateItems: [...getTemplateCorporateItems(template)],
      agendaItems: getTemplateAgendaItems(template).map((item) => ({ ...item })),
      indicatorItems: getTemplateIndicatorItems(template).map((item) => ({ ...item })),
      logoUrl: template.logoUrl || client.logoUrl || "",
      selectedNewsSources: getTemplateNewsSources(template),
      tickerSpeed: getTemplateTickerSpeed(template.tickerSpeed),
      timeFormat: template.timeFormat || "24h",
      showWeather: template.showWeather !== false,
    }));
    setPreviewOrientation(template.orientation === "Retrato" ? "Retrato" : "Paisagem");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteTemplate(id) {
    if (!requirePlanPermission(access, "canEditTemplates", "excluir templates")) return;

    try {
      await deleteDoc(doc(db, "clients", client.id, "templates", id));
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
              <span>Previsao 4 dias + ticker RSS</span>
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

            {["clima", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(form.type) && (
              <div className="form-group">
                <label>Cidade do clima</label>
                <input
                  value={form.city}
                  placeholder="Ex: João Câmara"
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            )}

            {["noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(form.type) && (
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

            {["clima", "noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(form.type) && (
              <div className="form-group">
                <label>Velocidade do rodape</label>
                <select
                  value={getTemplateTickerSpeed(form.tickerSpeed)}
                  onChange={(e) => setForm({ ...form, tickerSpeed: e.target.value })}
                >
                  <option value="slow">Lenta</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Rapida</option>
                </select>
              </div>
            )}
          </div>

          {["jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(form.type) && (
            <div className="template-color-panel">
              <div className="playlist-section-title compact">
                <div>
                  <h3>Fontes RSS do rodape</h3>
                  <p>Escolha uma ou mais fontes para alternar no ticker.</p>
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

          <div className="template-color-panel">
            <div className="playlist-section-title compact">
              <div>
                <h3>Cores do template</h3>
                <p>Personalize a identidade visual exibida na TV.</p>
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
              <div className="kicker">Resultado final</div>
              <h2>{previewOrientation}</h2>
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
                    {(template.templateType || template.type) !== "marketing_art" && (
                      <button
                        className="client-action"
                        onClick={() => startEditTemplate(template)}
                      >
                        Editar
                      </button>
                    )}
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
                      onClick={() => deleteTemplate(template.id)}
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
  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState(DEFAULT_NEWS_ITEMS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplateContent() {
      try {
        setLoading(true);

        const realTemplateType = template.templateType || template.type;

        if (["clima", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(realTemplateType)) {
          const data = await fetchWeatherByCity(template.city);
          if (!cancelled) setWeather(data);
        }

        if (["noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(realTemplateType)) {
          const feedUrls = getTemplateNewsFeedUrls(template);
          const newsLists = await Promise.all(
            (feedUrls.length ? feedUrls : [template.newsFeedUrl]).map((feedUrl) =>
              fetchNewsFromRss(feedUrl)
            )
          );
          const data = newsLists.flat().filter((item) => item?.title).slice(0, 12);
          if (!cancelled) setNews(data.length ? data : DEFAULT_NEWS_ITEMS);
        }
      } catch (error) {
        console.log(error);

        if (["clima", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(template.templateType || template.type) && !cancelled) {
          setWeather({
            city: template.city || "Sua cidade",
            temperature: "--",
            sensation: "--",
            humidity: "--",
            wind: "--",
            source: "Aguardando atualização",
          });
        }

        if (["noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(template.templateType || template.type) && !cancelled) {
          setNews(DEFAULT_NEWS_ITEMS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTemplateContent();

    const interval = setInterval(loadTemplateContent, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [template.type, template.templateType, template.city, template.newsFeedUrl, JSON.stringify(template.selectedNewsSources || [])]);

  const realTemplateType = template.templateType || template.type;
  const isPortrait = template.orientation === "Retrato";
  const orientationLabel = isPortrait ? "Retrato" : "Paisagem";
  const mainNews = news[0] || DEFAULT_NEWS_ITEMS[0];
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
  const clockParts = getTemplateClockParts(template);
  const tickerSpeed = getTemplateTickerSpeed(template.tickerSpeed);
  const isLiveCompactTemplate = ["clima", "noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(realTemplateType);
  const isTemplateVisible = (field) => template[field] !== false;

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
      className={`template-tv-preview template-${realTemplateType} template-orientation-${isPortrait ? "portrait" : "landscape"} ticker-${tickerSpeed} ${isLiveCompactTemplate ? "template-live-compact" : ""} ${compact ? "compact" : ""}`}
      style={getTemplateThemeStyle(template)}
    >
      <div className="template-orb one"></div>
      <div className="template-orb two"></div>

      {isTemplateVisible("showHeader") && <div className="template-tv-topbar">
        <div className="template-client-brand">
          {isTemplateVisible("showLogo") && template.logoUrl && (
            <img src={template.logoUrl} alt="Logo do cliente" />
          )}
          <span>{template.title || "Totem Park"} • {orientationLabel}</span>
        </div>
        <strong>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong>
      </div>}

      {(template.templateType || template.type) === "clima" && (
        <div className="template-weather-layout">
          <div>
            <small>Agora em</small>
            <h2>{weather?.city || template.city || "Sua cidade"}</h2>
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
              {news.slice(0, compact ? 2 : 3).map((item, index) => (
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
            {getNewsItemImage(news[0]) ? (
              <img
                src={getNewsItemImage(news[0])}
                alt={getNewsItemTitle(news[0])}
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
                {getNewsItemTitle(news[0])}
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
                  {getNewsItemDescription(news[0]) ||
                    `${getNewsItemSource(news[0], template.newsSource || "Notícias")} • ${getNewsItemTime(news[0])}`}
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
                {getNewsItemSource(news[0], template.newsSource || "Notícias")} • {getNewsItemTime(news[0])}
              </span>
            </div>
          </div>
        </div>
      )}

      {realTemplateType === "clima_premium_v2" && (
        <div className="template-premium-weather-v2">
          <div className="premium-weather-hero">
            <div>
              <div className="template-breaking">{getTemplateBadge(realTemplateType)}</div>
              {isTemplateVisible("showTitle") && <h2>{weather?.city || template.city || "Sua cidade"}</h2>}
              <p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>

            <div className="premium-weather-current">
              <span className="premium-weather-icon">{getWeatherIcon(weather?.weatherCode)}</span>
              <strong>{loading && !weather ? "--" : `${weather?.temperature ?? "--"}°C`}</strong>
              <small>{getWeatherConditionLabel(weather?.weatherCode)}</small>
              <em>Sensacao {weather?.sensation ?? "--"}°C</em>
            </div>
          </div>

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
                <small>{item.max}° / {item.min}°</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {realTemplateType === "hora_certa_premium" && (
        <div className="template-premium-clock">
          <div className="premium-clock-main">
            <div className="template-breaking">{getTemplateBadge(realTemplateType)}</div>
            <strong>{clockParts.time}</strong>
            <span>{clockParts.weekday}</span>
            <p>{clockParts.date}</p>
          </div>

          {template.showWeather !== false && (
            <div className="premium-clock-weather">
              <span>{getWeatherIcon(weather?.weatherCode)}</span>
              <strong>{weather?.temperature ?? "--"}°C</strong>
              <small>{weather?.city || template.city || "Sua cidade"}</small>
              <em>{getWeatherConditionLabel(weather?.weatherCode)}</em>
            </div>
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
                <p style={{ margin: 0 }}>{weather?.city || template.city || "Sua cidade"}</p>
              </div>

              <div className="template-journal-stat" style={{ borderRadius: 24, padding: compact ? 12 : 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <small>Agora</small>
                <h2 style={{ margin: "6px 0", fontSize: compact ? 22 : 42 }}>
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </h2>
                <p style={{ margin: 0 }}>{new Date().toLocaleDateString("pt-BR")}</p>
              </div>

              {!compact && (
                <div className="template-journal-headlines" style={{ borderRadius: 24, padding: 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", gridColumn: isPortrait ? "1 / -1" : "auto" }}>
                  <small>Manchetes</small>
                  {news.slice(1, isPortrait ? 4 : 5).map((item, index) => (
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
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {((template.templateType || template.type) === "comercial" || (template.templateType || template.type) === "aviso") && (
        <div className="template-generic-layout">
          <div className="template-generic-badge">
            {getTemplateBadge(realTemplateType)}
          </div>

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
          {["noticias", "jornal_premium", "clima_premium_v2", "hora_certa_premium"].includes(realTemplateType)
            ? `${getNewsItemSource(news[0], template.newsSource || "Notícias")} • ${getNewsItemTitle(news[0])}`
            : realTemplateType === "clima"
              ? `Clima em ${weather?.city || template.city || "sua cidade"} • Atualização automática`
              : realTemplateType === "cardapio_premium"
                ? `${template.title || "Cardápio Digital"} • Produtos, categorias e preços`
                : realTemplateType === "promocao_premium"
                  ? `${template.title || "Ofertas da Semana"} • Promoções em destaque`
                  : realTemplateType === "corporativo_premium"
                    ? `${template.title || "Comunicação Corporativa"} • Avisos, agenda e indicadores`
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

function TVConnectPage() {
  const navigate = useNavigate();

  const [screenCode, setScreenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenInUse, setScreenInUse] = useState(null);

  function finishConnection(clientId, code, deviceId) {
    localStorage.setItem(
      "totempark-tv-connection",
      JSON.stringify({ clientId, code, deviceId })
    );

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

            transaction.update(screenRef, {
              connectedDeviceId: deviceId,
              activeDeviceId: deleteField(),
              remoteCommand: null,
              lastCommandSent: "",
              commandStatus: "connected",
              lastConnection: new Date().toLocaleString("pt-BR"),
              lastSeenAt: serverTimestamp(),
            });
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

      finishConnection(clientId, code, deviceId);
    } catch (error) {
      console.log(error);
      alert("Erro ao conectar a TV. Verifique as regras do Firestore para leitura da coleção tv_codes.");
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("totempark-tv-connection");

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (parsed.clientId && parsed.code) {
        navigate(`/player/${parsed.clientId}/${parsed.code}`);
      }
    } catch (error) {
      console.log(error);
      localStorage.removeItem("totempark-tv-connection");
    }
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
            localStorage.removeItem("totempark-tv-connection");
            setScreenCode("");
          }}
        >
          Digitar outro código
        </button>

        <button
          className="tv-change-mode-button secondary"
          onClick={() => {
            localStorage.removeItem("totempark-tv-connection");
            localStorage.removeItem("totempark-app-mode");
            window.location.href = "/";
          }}
        >
          Voltar para o painel gestor
        </button>

        {isNativeApp() && (
          <button
            className="tv-change-mode-button tertiary"
            onClick={() => {
              localStorage.removeItem("totempark-app-mode");
              localStorage.removeItem("totempark-tv-connection");
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
  const [screenTemplates, setScreenTemplates] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [activeMode, setActiveMode] = useState("default");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [previousMediaIndex, setPreviousMediaIndex] = useState(null);
  const [readyMediaKey, setReadyMediaKey] = useState("");
  const [isAndroidTv, setIsAndroidTv] = useState(null);
  const [offlineAssetMap, setOfflineAssetMap] = useState(() =>
    isNativeApp() ? restoreOfflineAssetMap(offlineStorageKey) : {}
  );
  const [offlineCacheStatus, setOfflineCacheStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [remoteOverlay, setRemoteOverlay] = useState(null);
  const [takeoverMessage, setTakeoverMessage] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [blackoutMode, setBlackoutMode] = useState(false);
  const [pauseMode, setPauseMode] = useState(false);
  const [lastCommandId, setLastCommandId] = useState(null);
  const lastCommandIdRef = useRef(null);
  const transitionInProgressRef = useRef(false);
  const transitionCleanupRef = useRef(null);
  const offlineStatusTimerRef = useRef(null);
  const cacheQueueRef = useRef(Promise.resolve());
  const playbackTimerRef = useRef(null);
  const playbackTimingKeyRef = useRef("");
  const playbackRemainingRef = useRef(0);
  const playbackStartedAtRef = useRef(0);
  const advancingRef = useRef(false);
  const isAndroidSmartTv = isNativeApp() && isAndroidTv === true;

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
      clearTimeout(playbackTimerRef.current);
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

  const playerItems = [
    ...(activePlaylist?.items || []).map((item) => {
      const localizedItem = applyOfflineAssetUrls(item, offlineAssetMap);

      if (item?.playerItemType === "template" || item?.templateType) {
        return {
          ...localizedItem,
          title: localizedItem.title || localizedItem.name,
          templateType: localizedItem.templateType || localizedItem.type,
          type: localizedItem.templateType || localizedItem.type,
          duration: Number(localizedItem.duration || 15),
          playerItemType: "template",
        };
      }

      return {
        ...localizedItem,
        playerItemType: "media",
      };
    }),
    ...screenTemplates.map((template) => {
      const localizedTemplate = applyOfflineAssetUrls(template, offlineAssetMap);

      return {
        ...localizedTemplate,
        title: localizedTemplate.name,
        templateType: localizedTemplate.type,
        type: localizedTemplate.type,
        duration: Number(localizedTemplate.duration || 15),
        playerItemType: "template",
      };
    }),
  ];

  const activePlaylistRevision = [
    activePlaylist?.playlistRevision || "",
    activePlaylist?.transition || "Fade suave",
    activePlaylist?.transitionSpeed || "Normal",
    activePlaylist?.updatedAt?.seconds || "",
    activePlaylist?.updatedAt?.nanoseconds || "",
  ].join("-");
  const activeItemsKey = `${activePlaylistRevision}|${playerItems
    .map((item) => `${item.playerItemType}-${item.id || item.preview || item.title}-${Number(item.duration || 0)}-${item.updatedAt?.seconds || ""}`)
    .join("|")}`;

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
    screenTemplates,
    playlistsForOffline,
  ]);
  const offlineAssetsKey = offlineAssetUrls.join("|");

  useEffect(() => {
    if (!isNativeApp() || offlineAssetUrls.length === 0) return;

    let active = true;
    clearTimeout(offlineStatusTimerRef.current);
    setOfflineCacheStatus("downloading");

    cacheQueueRef.current = cacheQueueRef.current
      .catch(() => {})
      .then(() => cacheOfflineAssets(
        offlineAssetUrls,
        offlineScope,
        offlineStorageKey
      ))
      .then((result) => {
        if (!active) return;

        setOfflineAssetMap(result.urlMap);

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
          setOfflineCacheStatus("partial");
          offlineStatusTimerRef.current = setTimeout(() => {
            setOfflineCacheStatus("");
          }, 5000);
        }
      });

    return () => {
      active = false;
    };
  }, [offlineAssetsKey, offlineReadyMessageKey, offlineScope, offlineStorageKey]);

  function getPlayerItemKey(item, index) {
    return `${activePlaylist?.id || "templates"}-${activePlaylistRevision}-${item?.id || item?.preview || item?.title || "item"}-${index}`;
  }

  function goToNextMedia() {
    if (advancingRef.current) return;

    const items = playerItems;

    if (items.length <= 1) return;

    advancingRef.current = true;
    clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = null;

    setMediaIndex((prev) => {
      const safePrev = prev >= items.length ? 0 : prev;
      const nextIndex = safePrev + 1 >= items.length ? 0 : safePrev + 1;

      transitionInProgressRef.current = true;
      setPreviousMediaIndex(safePrev);

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

  function markCurrentMediaReady(item, index) {
    const itemKey = getPlayerItemKey(item, index);

    if (itemKey !== getPlayerItemKey(playerItems[mediaIndex], mediaIndex)) return;

    setReadyMediaKey(itemKey);
    clearTimeout(transitionCleanupRef.current);
    transitionCleanupRef.current = setTimeout(() => {
      setPreviousMediaIndex(null);
      transitionInProgressRef.current = false;
    }, 1800);
  }

  function skipFailedMedia() {
    transitionInProgressRef.current = false;
    setReadyMediaKey("");
    goToNextMedia();
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
      try {
        const localDeviceId = getTotemDeviceId();

        await runTransaction(db, async (transaction) => {
          const currentScreen = await transaction.get(screenDocRef);

          if (!currentScreen.exists()) return;

          const screenData = currentScreen.data();
          const connectedDeviceId = screenData.connectedDeviceId;
          const pendingExit =
            screenData.remoteCommand?.type === "exitTv" &&
            screenData.commandStatus === "sent";

          if (pendingExit) return;
          if (connectedDeviceId && connectedDeviceId !== localDeviceId) return;

          transaction.update(screenDocRef, {
            connectedDeviceId: localDeviceId,
            activeDeviceId: deleteField(),
            status: "online",
            lastConnection: new Date().toLocaleString("pt-BR"),
            lastSeenAt: serverTimestamp(),
          });
        });
      } catch (error) {
        console.log(error);
      }
    }

    sendHeartbeat();

    const interval = setInterval(() => {
      sendHeartbeat();
    }, 15000);

    return () => clearInterval(interval);
  }, [screen?.id, clientId, maintenanceMode, blackoutMode, takeoverMessage]);

  async function releaseCurrentScreen() {
    if (!screen?.id || !clientId) return;

    try {
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

      const isPendingExit =
        remoteCommand.type === "exitTv" && data.commandStatus === "sent";

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
        await releaseCurrentScreen();
        localStorage.removeItem("totempark-tv-connection");
        localStorage.removeItem("totempark-app-mode");

        if (isNativeApp()) {
          window.location.href = "/";
        } else {
          window.location.href = "/tv";
        }

        return;
      }

      try {
        await updateDoc(screenDocRef, {
          lastCommandExecuted: remoteCommand.type || "",
          lastCommandExecutedAt: serverTimestamp(),
          commandStatus: "executed",
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
  }, [screen?.id, clientId, activePlaylist?.id, activeMode, mediaIndex, activeItemsKey]);

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
        const list = snapshot.docs
          .map((templateDoc) => ({
            id: templateDoc.id,
            ...templateDoc.data(),
          }))
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

        setScreenTemplates(list);
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
      if (prev >= items.length) return 0;
      return prev;
    });
  }, [activePlaylist?.id, activePlaylist?.items?.length]);

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
    const timingKey = `${currentKey}-${durationInMs}`;
    const isPlaybackBlocked =
      pauseMode || takeoverMessage || blackoutMode || maintenanceMode;
    const isWaitingForAndroidTvVideo =
      isAndroidSmartTv &&
      currentItem?.type === "Vídeo" &&
      readyMediaKey !== currentKey;

    if (playbackTimingKeyRef.current !== timingKey) {
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

    playbackTimerRef.current = setTimeout(() => {
      playbackTimerRef.current = null;
      playbackRemainingRef.current = 0;
      goToNextMedia();
    }, remaining);

    return () => {
      if (!playbackTimerRef.current) return;

      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
      playbackRemainingRef.current = Math.max(
        0,
        playbackRemainingRef.current - (Date.now() - playbackStartedAtRef.current)
      );
    };
  }, [activePlaylist?.id, activeItemsKey, mediaIndex, readyMediaKey, pauseMode, takeoverMessage, blackoutMode, maintenanceMode, isAndroidSmartTv]);

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
    return <div className="player-screen">Tela não encontrada.</div>;
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

        <button
          className="tv-player-exit-button"
          onClick={() => {
            releaseCurrentScreen().finally(() => {
              localStorage.removeItem("totempark-tv-connection");
              window.location.href = "/tv";
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

  visibleLayers.push({
    item: currentMedia,
    index: safeMediaIndex,
    state: currentMediaReady
      ? `is-current is-ready ${currentTransitionReady ? "transition-active" : ""}`
      : "is-current is-pending",
  });

  function renderPlayerItem(item, index, isCurrent) {
    if (item.playerItemType === "template") {
      return <TemplateVisualPreview template={item} tv />;
    }

    if (item.type === "Vídeo") {
      return (
        <video
          src={item.preview}
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
          onLoadedMetadata={(event) => {
            if (isCurrent && !isAndroidSmartTv) markCurrentMediaReady(item, index);
            if (!pauseMode) event.currentTarget.play().catch(() => {});
          }}
          onLoadedData={(event) => {
            if (isCurrent && !isAndroidSmartTv) markCurrentMediaReady(item, index);

            if (!pauseMode) {
              event.currentTarget.play().catch((error) => {
                console.log("Autoplay aguardando video:", error);
              });
            }
          }}
          onCanPlay={(event) => {
            if (isCurrent && !isAndroidSmartTv) markCurrentMediaReady(item, index);
            if (!pauseMode) event.currentTarget.play().catch(() => {});
          }}
          onPlaying={() => {
            if (isCurrent && isAndroidSmartTv) markCurrentMediaReady(item, index);
          }}
          onPlay={(event) => {
            if (pauseMode) event.currentTarget.pause();
          }}
          onEnded={() => {
            if (!isCurrent || pauseMode) return;
            goToNextMedia();
          }}
          onWaiting={() => {}}
          onStalled={() => {}}
          onError={() => {
            if (!isCurrent) return;
            console.log("Erro ao carregar video. Pulando midia.");
            skipFailedMedia();
          }}
        />
      );
    }

    return (
      <img
        src={item.preview}
        alt={item.title}
        className="player-media"
        onLoad={() => {
          if (isCurrent) markCurrentMediaReady(item, index);
        }}
        onError={() => {
          if (!isCurrent) return;
          console.log("Erro ao carregar imagem. Pulando midia.");
          skipFailedMedia();
        }}
      />
    );
  }

  return (
    <div className={`player-screen ${playerOrientationClass} ${isAndroidSmartTv ? "android-tv-player" : ""}`}>
      {offlineCacheStatus && (
        <div className={`offline-cache-status ${offlineCacheStatus}`}>
          {offlineCacheStatus === "downloading"
            ? "Baixando conteúdo offline..."
            : offlineCacheStatus === "ready"
              ? "Conteúdo disponível offline"
              : "Cache offline parcial"}
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


function PlansPage() {
  return (
    <>
      <header className="header">
        <div>
          <div className="kicker">Planos</div>
          <h1>Planos do Totem Park</h1>
          <p>Modelo comercial sugerido para venda mensal e anual.</p>
        </div>
      </header>

      <section className="cards-grid plans-commercial-grid">
        {Object.values(COMMERCIAL_PLANS).map((plan) => (
          <div
            className={plan.name === "Professional" ? "plan-card featured" : "plan-card"}
            key={plan.name}
          >
            {plan.name === "Professional" && (
              <div className="plan-recommended">Mais recomendado</div>
            )}
            <h3>{plan.name}</h3>
            <div className="plan-price">
              {plan.priceLabel} <span>/mês</span>
            </div>
            <p className="plan-annual">Até {plan.screensLimit} telas</p>
            <div className="features">
              <Feature text={`${plan.screensLimit} telas incluídas`} />
              <Feature text={plan.premiumTemplates ? "Templates Premium" : "Templates simples"} />
              <Feature text={plan.marketing ? "Marketing integrado" : "Playlists e mídias"} />
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function SettingsPage({ user }) {
  return (
    <section className="panel">
      <h2>Configurações</h2>

      <div className="form-grid">
        <div className="form-group">
          <label>Usuário logado</label>
          <input value={user?.email || ""} readOnly />
        </div>
      </div>
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
