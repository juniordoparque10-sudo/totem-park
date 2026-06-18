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
  runTransaction,
  deleteField,
} from "firebase/firestore";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

import { auth, db, storage } from "./firebase";
import {
  cacheOfflineAssets,
  restoreOfflineAssetMap,
} from "./offline-player-cache";
import logo from "./assets/logo.png";
import "./App.css";

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

  if (!media?.preview) {
    return icon || <Monitor size={48} />;
  }

  if (media.type === "Vídeo") {
    return (
      <video
        key={media.liveKey}
        src={media.preview}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
      />
    );
  }

  return (
    <img
      key={media.liveKey}
      src={media.preview}
      alt={media.title || "Preview da tela"}
    />
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
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3`
    );

    const weatherData = await weatherResponse.json();

    return {
      city: `${place.name}${place.admin1 ? `/${place.admin1}` : ""}`,
      temperature: Math.round(weatherData?.current?.temperature_2m ?? 0),
      sensation: Math.round(weatherData?.current?.apparent_temperature ?? 0),
      humidity: Math.round(weatherData?.current?.relative_humidity_2m ?? 0),
      wind: Math.round(weatherData?.current?.wind_speed_10m ?? 0),
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
  return {
    "--template-primary": template?.primaryColor || "#06b6d4",
    "--template-secondary": template?.secondaryColor || "#9333ea",
    "--template-accent": template?.accentColor || "#22d3ee",
    "--template-text": template?.textColor || "#ffffff",
  };
}

function getTemplateTypeLabel(type) {
  const labels = {
    clima: "Clima ao vivo",
    noticias: "Notícias ao vivo",
    comercial: "Comercial",
    aviso: "Aviso",
    jornal_premium: "Jornal TV Premium",
    cardapio_premium: "Cardápio Premium",
    promocao_premium: "Promoção Premium",
    corporativo_premium: "Corporativo Premium",
    marketing_art: "Arte de Marketing",
  };

  return labels[type] || type || "Template";
}

function getTemplateBadge(type) {
  if (type === "jornal_premium") return "JORNAL TV";
  if (type === "cardapio_premium") return "CARDÁPIO";
  if (type === "promocao_premium") return "OFERTAS";
  if (type === "corporativo_premium") return "CORPORATIVO";
  if (type === "comercial") return "OFERTA";
  if (type === "aviso") return "AVISO";

  return "AO VIVO";
}

const PREMIUM_TEMPLATE_TYPES = [
  "jornal_premium",
  "cardapio_premium",
  "promocao_premium",
  "corporativo_premium",
];

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
              <strong>{user.clientData.name}</strong>
              <p>
                Plano {user.clientData.plan} • {user.clientData.billing}
              </p>
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

  return (
    <div className="app-mode-page app-mode-native-only">
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
    const days = getDaysToDue(client.dueDate);
    return days !== null && days < 0;
  });

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
                  <span>{client.plan} • {client.billing}</span>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    plan: "Básico",
    billing: "Mensal",
    dueDate: "",
    screensLimit: "2",
    status: "Ativo",
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
    const days = getDaysToDue(client.dueDate);

    if (days === null) {
      return {
        text: "Sem vencimento",
        className: "neutral",
      };
    }

    if (days < 0) {
      return {
        text: `Vencido há ${Math.abs(days)} dia(s)`,
        className: "danger",
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
    if (status === "Suspenso") return "warning";
    if (status === "Vencido") return "danger";

    return "neutral";
  }

  const activeClients = clients.filter((client) => client.status === "Ativo");
  const suspendedClients = clients.filter((client) => client.status === "Suspenso");
  const overdueClients = clients.filter((client) => {
    const days = getDaysToDue(client.dueDate);
    return days !== null && days < 0;
  });

  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      client.name?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.plan?.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "Todos" || client.status === statusFilter;

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
      plan: "Básico",
      billing: "Mensal",
      dueDate: "",
      screensLimit: "2",
      status: "Ativo",
    });
  }

  async function handleCreateClient() {
    if (!form.name.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    if (!form.email.trim()) {
      alert("Informe o e-mail do cliente.");
      return;
    }

    if (!form.password.trim()) {
      alert("Informe a senha inicial do cliente.");
      return;
    }

    if (form.password.length < 6) {
      alert("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    if (!form.dueDate) {
      alert("Informe o vencimento do plano.");
      return;
    }

    try {
      const uid = await createClientAuthUser(form.email, form.password);

      await addDoc(collection(db, "clients"), {
        name: form.name,
        email: form.email,
        uid,
        plan: form.plan,
        billing: form.billing,
        dueDate: form.dueDate,
        screensLimit: form.screensLimit,
        status: form.status,
        createdAt: serverTimestamp(),
      });

      resetForm();
      setShowCreateModal(false);

      alert("Cliente cadastrado com login, senha e vencimento!");
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

      alert("Erro ao cadastrar cliente.");
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
          onClick={() => setShowCreateModal(true)}
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
          {["Todos", "Ativo", "Suspenso", "Vencido"].map((status) => (
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

            return (
              <div className="clients-table-row" key={client.id}>
                <div className="client-profile-cell">
                  <div className="client-avatar">
                    {client.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>

                  <div>
                    <strong>{client.name}</strong>
                    <span>{client.email || "Sem e-mail cadastrado"}</span>
                  </div>
                </div>

                <div>
                  <strong>{client.plan}</strong>
                  <span>{client.billing}</span>
                </div>

                <div>
                  <strong>{client.dueDate || "Não informado"}</strong>
                  <span className={`client-due ${dueInfo.className}`}>
                    {dueInfo.text}
                  </span>
                </div>

                <div>
                  <strong>{client.screensLimit}</strong>
                  <span>limite de telas</span>
                </div>

                <div>
                  <span className={`client-status-badge ${getStatusClass(client.status)}`}>
                    {client.status || "Ativo"}
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
                <div className="kicker">Novo acesso</div>
                <h2>Cadastrar cliente</h2>
                <p>Crie o cliente, login, senha inicial e vencimento do plano.</p>
              </div>

              <button
                className="modal-close-button"
                onClick={() => setShowCreateModal(false)}
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
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Senha inicial</label>
                  <input
                    type="password"
                    value={form.password}
                    placeholder="Mínimo 6 caracteres"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>

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
              </div>
            </div>

            <div className="client-modal-section">
              <h3>Plano e cobrança</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Plano</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  >
                    <option>Básico</option>
                    <option>Profissional</option>
                    <option>Enterprise</option>
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
              </div>
            </div>

            <div className="client-modal-actions">
              <button
                className="client-modal-cancel"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </button>

              <button className="clients-create-button" onClick={handleCreateClient}>
                <Plus size={20} />
                Criar cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ClientInternalPanel({ client, onBack, hideBackButton = false }) {
  const [tab, setTab] = useState("dashboard");

  return (
    <>
      <header className="header">
        <div>
          {!hideBackButton && onBack && (
            <button className="player-back-button" onClick={onBack}>
              ← Voltar
            </button>
          )}

          <div className="kicker">Cliente</div>
          <h1>{client.name}</h1>
          <p>
            Plano {client.plan} • {client.billing} • Vencimento:{" "}
            {client.dueDate || "não informado"} • Limite de telas:{" "}
            {client.screensLimit}
          </p>
        </div>
      </header>

      <div className="client-tabs">
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

      {tab === "dashboard" && <ClientDashboard client={client} />}
      {tab === "media" && <ClientMediaPage client={client} />}
      {tab === "playlists" && <ClientPlaylistsPage client={client} />}
      {tab === "screens" && <ClientScreensPage client={client} />}
      {tab === "templates" && <ClientTemplatesPage client={client} />}
      {tab === "marketing" && <ClientMarketingPage client={client} />}
    </>
  );
}

function ClientDashboard({ client }) {
  const [media, setMedia] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [screens, setScreens] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 5000);

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

  return (
    <>
      <section className="stats">
        <StatCard
          title="Mídias"
          value={media.length}
          icon={<Image />}
          status="Arquivos cadastrados"
        />

        <StatCard
          title="Playlists"
          value={playlists.length}
          icon={<ListVideo />}
          status="Campanhas criadas"
        />

        <StatCard
          title="Telas"
          value={`${screens.length}/${client.screensLimit}`}
          icon={<Monitor />}
          status="Uso do plano"
        />

        <StatCard
          title="Vencimento"
          value={client.dueDate || "--"}
          icon={<CreditCard />}
          status={client.status}
        />
      </section>

      <section className="panel">
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
              const previewMedia = screen.nowPlayingPreview
                ? {
                    preview: screen.nowPlayingPreview,
                    title: screen.nowPlayingTitle || "Mídia atual",
                    type: screen.nowPlayingType || "Imagem",
                  }
                : activePlaylist?.items?.[0];

              const online = isScreenOnline(screen);

              return (
                <div className="screen-live-card" key={screen.id}>
                  <div className="screen-live-preview">
                    {previewMedia ? (
                      previewMedia.type === "Vídeo" ? (
                        <video
                          key={`${screen.id}-${screen.nowPlayingPreview || previewMedia.preview}-${screen.nowPlayingIndex || 0}`}
                          src={previewMedia.preview}
                          muted
                          autoPlay
                          loop
                          playsInline
                          preload="auto"
                        />
                      ) : (
                        <img
                          key={`${screen.id}-${screen.nowPlayingPreview || previewMedia.preview}-${screen.nowPlayingIndex || 0}`}
                          src={previewMedia.preview}
                          alt={previewMedia.title}
                        />
                      )
                    ) : (
                      <Monitor size={48} />
                    )}

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
                      <strong>{screen.nowPlayingTitle || previewMedia?.title || "Aguardando mídia"}</strong>
                      <span>
                        {screen.nowPlayingIndex && screen.nowPlayingTotal
                          ? `${screen.nowPlayingIndex}/${screen.nowPlayingTotal}`
                          : "Sem progresso"} • {screen.nowPlayingType || previewMedia?.type || "Mídia"}
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


function ClientMediaPage({ client }) {
  const [mediaList, setMediaList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [form, setForm] = useState({
    title: "",
    duration: "10",
    file: null,
    preview: "",
    type: "",
    sound: false,
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

  function handleSelectedFile(file) {
    if (!file) return;

    const type = file.type.startsWith("video") ? "Vídeo" : "Imagem";
    const preview = URL.createObjectURL(file);

    setForm({
      ...form,
      file,
      preview,
      type,
      title: form.title || file.name,
      sound: type === "Vídeo" ? form.sound : false,
    });
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    handleSelectedFile(file);
  }

  async function handleSaveMedia() {
    if (!form.file) {
      alert("Selecione uma imagem ou vídeo.");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const fileName = `${Date.now()}_${form.file.name}`;
      const storageRef = ref(storage, `clients/${client.id}/media/${fileName}`);
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
            title: form.title,
            duration: Number(form.duration || 10),
            type: form.type,
            preview: downloadURL,
            sound: form.type === "Vídeo" ? form.sound : false,
            createdAt: serverTimestamp(),
          });

          setForm({
            title: "",
            duration: "10",
            file: null,
            preview: "",
            type: "",
            sound: false,
          });

          setProgress(0);
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

  async function deleteMedia(id) {
    try {
      await deleteDoc(doc(db, "clients", client.id, "media", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir mídia.");
    }
  }

  const fileInputId = `media-file-${client.id}`;

  return (
    <>
      <section className="upload-panel">
        <div className="upload-preview-box">
          {form.preview ? (
            form.type === "Vídeo" ? (
              <video src={form.preview} controls />
            ) : (
              <img src={form.preview} alt="Prévia" />
            )
          ) : (
            <div className="empty-upload">
              <Upload size={42} />
              <p>Prévia da mídia aparecerá aqui</p>
            </div>
          )}
        </div>

        <div className="upload-form">
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
            <button
              className="upload-button"
              onClick={handleSaveMedia}
              disabled={uploading}
            >
              <Plus size={20} />
              {uploading ? `Enviando ${progress}%` : "Salvar mídia"}
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
                {media.type === "Vídeo" ? (
                  <video src={media.preview} controls />
                ) : (
                  <img src={media.preview} alt={media.title} />
                )}
              </div>

              <div className="media-info">
                <span>{media.type}</span>
                <h3>{media.title}</h3>
                <p>{media.duration} segundos</p>
                <p>{media.sound ? "Com som" : "Sem som"}</p>

                <button className="delete-button" onClick={() => deleteMedia(media.id)}>
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function ClientPlaylistsPage({ client }) {
  const [mediaList, setMediaList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [screens, setScreens] = useState([]);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [draggedMediaId, setDraggedMediaId] = useState(null);

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
    toggleItemKey(getTemplateKey(templateId));
  }

  function renderPlaylistMiniPreview(item) {
    if (!item) return <Monitor size={26} />;

    if (item.playerItemType === "template" || item.templateType) {
      return <TemplateVisualPreview template={item} compact />;
    }

    if (item.type === "Vídeo") {
      return <video src={item.preview} muted playsInline preload="metadata" />;
    }

    return <img src={item.preview} alt={item.title} />;
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSavePlaylist() {
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
        await updateDoc(
          doc(db, "clients", client.id, "playlists", editingPlaylist.id),
          playlistData
        );

        alert("Playlist atualizada com sucesso!");
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
    try {
      await deleteDoc(doc(db, "clients", client.id, "playlists", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir playlist.");
    }
  }

  return (
    <>
      <section className="playlist-builder">
        <div className="panel">
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

          <div className="media-selector">
            {mediaList.length === 0 ? (
              <div className="empty-library">
                Cadastre mídias primeiro.
              </div>
            ) : (
              mediaList.map((media) => (
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
                  <div className="select-media-thumb">
                    {media.type === "Vídeo" ? (
                      <video src={media.preview} muted playsInline preload="metadata" />
                    ) : (
                      <img src={media.preview} alt={media.title} />
                    )}
                  </div>

                  <strong>{media.title}</strong>

                  <span>
                    {media.type} • {media.duration}s •{" "}
                    {media.sound ? "Com som" : "Sem som"}
                  </span>
                </button>
              ))
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

          <div className="media-selector">
            {templates.length === 0 ? (
              <div className="empty-library">
                Cadastre templates primeiro na aba Templates.
              </div>
            ) : (
              templates.map((template) => (
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
                  <div className="select-media-thumb">
                    <TemplateVisualPreview template={template} compact />
                  </div>

                  <strong>{template.name}</strong>

                  <span>
                    {getTemplateTypeLabel(template.type)} • {template.duration || 15}s
                  </span>
                </button>
              ))
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




function ClientScreensPage({ client }) {
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [editingScreen, setEditingScreen] = useState(null);

  const [form, setForm] = useState({
    name: "",
    location: "",
    orientation: "Paisagem",
    playlistId: "",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);

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
    setEditingScreen(screen);

    setForm({
      name: screen.name || "",
      location: screen.location || "",
      orientation: screen.orientation || "Paisagem",
      playlistId: screen.playlistId || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSaveScreen() {
    if (!form.name.trim()) {
      alert("Informe o nome da tela.");
      return;
    }

    if (!editingScreen && screens.length >= Number(client.screensLimit || 0)) {
      alert("Este cliente atingiu o limite de telas do plano.");
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
    try {
      const screenToDelete = screens.find((screen) => screen.id === id);

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
      <section className="panel">
        <div className="playlist-editor-header">
          <div>
            <h2>{editingScreen ? "Editar tela" : "Nova tela"}</h2>
            <p className="stat-status">
              Uso atual: {screens.length}/{client.screensLimit} telas
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
          <strong>Como funciona:</strong> a playlist padrão roda normalmente. Quando uma playlist agendada entrar no período configurado, ela assume temporariamente a TV. Ao terminar, a TV volta para a playlist padrão desta tela. Para conectar uma TV, abra /tv e digite apenas o código da tela.
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
            const previewMedia = screen.nowPlayingPreview
              ? {
                  preview: screen.nowPlayingPreview,
                  title: screen.nowPlayingTitle || "Mídia atual",
                  type: screen.nowPlayingType || "Imagem",
                }
              : activePlaylist?.items?.[0];

            return (
              <div className="media-card" key={screen.id}>
                <div className="media-preview screen-preview">
                  {previewMedia ? (
                    previewMedia.type === "Vídeo" ? (
                      <video
                        key={`${screen.id}-${screen.nowPlayingPreview || previewMedia.preview}-${screen.nowPlayingIndex || 0}`}
                        src={previewMedia.preview}
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="auto"
                      />
                    ) : (
                      <img
                          key={`${screen.id}-${screen.nowPlayingPreview || previewMedia.preview}-${screen.nowPlayingIndex || 0}`}
                          src={previewMedia.preview}
                          alt={previewMedia.title}
                        />
                    )
                  ) : (
                    <Monitor size={54} />
                  )}

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
                      <strong>{screen.nowPlayingTitle || previewMedia?.title || "Aguardando mídia"}</strong>
                      <span>
                        {screen.nowPlayingIndex && screen.nowPlayingTotal
                          ? `${screen.nowPlayingIndex}/${screen.nowPlayingTotal}`
                          : "Sem progresso"} • {screen.nowPlayingType || previewMedia?.type || "Mídia"}
                      </span>
                    </div>
                  </div>

                  <div className="screen-code-box">
                    <small>Código para conectar no /tv</small>
                    <strong>{screen.code}</strong>
                  </div>

                  <p>
                    Player direto:
                    <br />
                    <strong>/player/{client.id}/{screen.code}</strong>
                  </p>

                  <div className="last-seen-card">
                    <small>Último sinal</small>
                    <strong>{getLastSeenLabel(screen)}</strong>
                  </div>

                  <div className="remote-control-panel-inline">
                    <div className="remote-control-title">
                      Controle remoto
                    </div>

                    <div className="remote-control-grid-inline">
                      <button
                        className="remote-mini-button info"
                        onClick={() => sendRemoteCommand(screen.id, { type: "refresh" })}
                      >
                        Atualizar
                      </button>

                      <button
                        className="remote-mini-button"
                        onClick={() => sendRemoteCommand(screen.id, { type: "pause" })}
                      >
                        Pausar
                      </button>

                      <button
                        className="remote-mini-button"
                        onClick={() => sendRemoteCommand(screen.id, { type: "play" })}
                      >
                        Play
                      </button>

                      <button
                        className="remote-mini-button warning"
                        onClick={() => sendOverlayCommand(screen.id)}
                      >
                        Overlay
                      </button>

                      <button
                        className="remote-mini-button danger"
                        onClick={() => sendTakeoverCommand(screen.id)}
                      >
                        Takeover
                      </button>

                      <button
                        className="remote-mini-button"
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
                        {screen.lastCommandExecuted === "maintenance"
                          ? "Sair manutenção"
                          : "Manutenção"}
                      </button>

                      <button
                        className="remote-mini-button"
                        onClick={() => sendRemoteCommand(screen.id, { type: "blackout" })}
                      >
                        Tela preta
                      </button>

                      <button
                        className="remote-mini-button success"
                        onClick={() => sendRemoteCommand(screen.id, { type: "clear" })}
                      >
                        Limpar
                      </button>

                      <button
                        className="remote-mini-button danger"
                        onClick={() => sendRemoteCommand(screen.id, { type: "reload" })}
                      >
                        Reiniciar
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
                        Sair da TV
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

function MarketingArtPreview({ art, compact = false, tv = false }) {
  const marketingType = art.marketingType || art.formatType || art.type;
  const ratio = getMarketingFormatRatio(marketingType);
  const isFeed = marketingType === "feed";
  const imageSrc = art.imagePreview || art.imageUrl || "";
  const logoSrc = art.logoPreview || art.logoUrl || "";
  const qrValue = art.qrText || art.whatsapp || "";
  const qrUrl = art.qrImageUrl || buildQrUrl(qrValue);

  const outerStyle = {
    width: tv ? "100%" : compact ? (isFeed ? 210 : 160) : (isFeed ? "min(520px, 100%)" : "min(360px, 100%)"),
    height: tv ? "100%" : "auto",
    aspectRatio: tv ? "auto" : ratio.aspectRatio,
    borderRadius: tv ? 0 : compact ? 22 : 34,
    overflow: "hidden",
    position: "relative",
    color: art.textColor || "#ffffff",
    background:
      `radial-gradient(circle at 20% 15%, ${art.primaryColor || "#06b6d4"}66, transparent 34%),
       radial-gradient(circle at 90% 80%, ${art.secondaryColor || "#9333ea"}66, transparent 34%),
       linear-gradient(145deg, #020617 0%, #0f172a 46%, #111827 100%)`,
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: compact ? "none" : "0 28px 80px rgba(0,0,0,0.42)",
  };

  const contentStyle = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: isFeed ? "flex-end" : "space-between",
    padding: compact ? 16 : isFeed ? 34 : 30,
    zIndex: 3,
  };

  const titleSize = compact ? (isFeed ? 22 : 18) : isFeed ? 54 : 48;

  return (
    <div style={outerStyle}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={art.title || "Imagem da arte"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: isFeed ? 0.76 : 0.82,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.16)",
          }}
        >
          <Image size={compact ? 54 : 110} />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            isFeed
              ? "linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.88) 66%, rgba(2,6,23,0.98))"
              : "linear-gradient(180deg, rgba(2,6,23,0.20), rgba(2,6,23,0.48) 48%, rgba(2,6,23,0.94))",
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: compact ? 14 : 22,
          left: compact ? 14 : 22,
          right: compact ? 14 : 22,
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: compact ? "6px 10px" : "8px 14px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.72)",
            border: "1px solid rgba(255,255,255,0.16)",
            fontSize: compact ? 9 : 12,
            fontWeight: 950,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {MARKETING_TYPE_LABELS[marketingType] || "Marketing"}
        </div>

        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Logo"
            style={{
              width: compact ? 34 : 54,
              height: compact ? 34 : 54,
              objectFit: "contain",
              borderRadius: 12,
              background: "rgba(255,255,255,0.92)",
              padding: 6,
            }}
          />
        ) : (
          <div
            style={{
              width: compact ? 34 : 54,
              height: compact ? 34 : 54,
              borderRadius: 14,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 1000,
              color: art.accentColor || "#22d3ee",
            }}
          >
            TP
          </div>
        )}
      </div>

      <div style={contentStyle}>
        {!isFeed && <div></div>}

        <div>
          <div
            style={{
              width: compact ? 42 : 74,
              height: compact ? 5 : 8,
              borderRadius: 99,
              background: art.accentColor || "#22d3ee",
              marginBottom: compact ? 10 : 18,
            }}
          />

          <h1
            style={{
              margin: 0,
              fontSize: titleSize,
              lineHeight: 0.9,
              textTransform: marketingType === "reels" ? "uppercase" : "none",
              letterSpacing: marketingType === "reels" ? "-0.05em" : "-0.035em",
              maxWidth: isFeed ? "92%" : "100%",
            }}
          >
            {art.title || "Seu título"}
          </h1>

          <p
            style={{
              margin: compact ? "8px 0 0" : "14px 0 0",
              color: "rgba(255,255,255,0.82)",
              fontSize: compact ? 12 : isFeed ? 20 : 18,
              lineHeight: 1.25,
              maxWidth: isFeed ? "86%" : "100%",
            }}
          >
            {art.subtitle || "Seu subtítulo"}
          </p>

          <div
            style={{
              marginTop: compact ? 12 : 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: compact ? "8px 10px" : "12px 18px",
                borderRadius: 999,
                background: `linear-gradient(135deg, ${art.primaryColor || "#06b6d4"}, ${art.secondaryColor || "#9333ea"})`,
                color: "#ffffff",
                fontWeight: 1000,
                fontSize: compact ? 10 : 16,
                boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
              }}
            >
              {art.cta || "Chamada para ação"}
            </div>

            {qrUrl && (
              <div
                style={{
                  width: compact ? 42 : isFeed ? 82 : 78,
                  height: compact ? 42 : isFeed ? 82 : 78,
                  minWidth: compact ? 42 : isFeed ? 82 : 78,
                  borderRadius: compact ? 9 : 16,
                  background: "#ffffff",
                  padding: compact ? 4 : 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src={qrUrl} alt="QR Code" style={{ width: "100%", height: "100%" }} />
              </div>
            )}
          </div>

          {!compact && (art.whatsapp || art.location) && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                color: "rgba(255,255,255,0.78)",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {art.whatsapp && <span>WhatsApp: {art.whatsapp}</span>}
              {art.location && <span>{art.location}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientMarketingPage({ client }) {
  const [arts, setArts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sendingArtId, setSendingArtId] = useState("");
  const [form, setForm] = useState(getMarketingDefaultForm());

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
    setForm(getMarketingDefaultForm());
  }

  async function handleSaveMarketingArt() {
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
        : form.logoUrl || "";

      const payload = {
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "clients", client.id, "marketing"), payload);

      resetMarketingForm();
      alert("Arte de marketing salva com sucesso!");
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar arte de marketing.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMarketingArt(id) {
    try {
      await deleteDoc(doc(db, "clients", client.id, "marketing", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir arte.");
    }
  }

  async function duplicateMarketingArt(art) {
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
    try {
      setSendingArtId(art.id);

      const primaryColor = art.primaryColor || "#06b6d4";
      const secondaryColor = art.secondaryColor || "#9333ea";
      const accentColor = art.accentColor || "#22d3ee";
      const textColor = art.textColor || "#ffffff";
      const marketingType = art.marketingType || art.formatType || art.type || "feed";

      await addDoc(collection(db, "clients", client.id, "templates"), {
        type: "marketing_art",
        templateType: "marketing_art",
        marketingType,
        formatType: marketingType,
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
    setForm({
      ...getMarketingDefaultForm(),
      ...art,
      imageFile: null,
      imagePreview: art.imageUrl || "",
      logoFile: null,
      logoPreview: art.logoUrl || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const selectedSize = getMarketingFormatSize(form.type);

  return (
    <>
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

          <div className="template-color-panel">
            <div className="playlist-section-title compact">
              <div>
                <h3>Imagem e logo</h3>
                <p>A imagem principal ocupa o fundo da arte. A logo aparece no topo.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Imagem principal</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    readMarketingFile(e.target.files?.[0], setForm, "imageFile", "imagePreview")
                  }
                />
              </div>

              <div className="form-group">
                <label>Logo do cliente</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    readMarketingFile(e.target.files?.[0], setForm, "logoFile", "logoPreview")
                  }
                />
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
              {saving ? "Salvando..." : "Salvar arte"}
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

          <MarketingArtPreview art={form} />
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
                <MarketingArtPreview art={art} compact />

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
    </>
  );
}


function ClientTemplatesPage({ client }) {
  const [templates, setTemplates] = useState([]);
  const [screens, setScreens] = useState([]);
  const [saving, setSaving] = useState(false);
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

  function changeType(type) {
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
        type === "noticias" || type === "jornal_premium"
          ? prev.newsSource || "G1 RN"
          : prev.newsSource,
      newsFeedUrl:
        type === "noticias" || type === "jornal_premium"
          ? prev.newsFeedUrl || NEWS_SOURCE_PRESETS["G1 RN"]
          : prev.newsFeedUrl,
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

  function handleCustomNewsUrlChange(url) {
    const source = saveCustomNewsSource(url);

    setCustomNewsSources(getSavedCustomNewsSources());

    setForm((prev) => ({
      ...prev,
      newsSource: source?.name || "Personalizado",
      newsFeedUrl: url,
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
    setForm({
      name: "Clima ao vivo",
      type: "clima",
      orientation: "Paisagem",
      duration: "15",
      city: "João Câmara",
      newsSource: "G1 RN",
      newsFeedUrl: NEWS_SOURCE_PRESETS["G1 RN"],
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
    });
  }

  async function handleSaveTemplate() {
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

      await addDoc(collection(db, "clients", client.id, "templates"), {
        ...form,
        duration: Number(form.duration || 15),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      resetForm();
      alert("Template criado com sucesso!");
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar template.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id) {
    try {
      await deleteDoc(doc(db, "clients", client.id, "templates", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir template.");
    }
  }

  async function toggleTemplate(template) {
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

      <section className="templates-builder-grid">
        <div className="templates-editor-panel">
          <div className="playlist-editor-header">
            <div>
              <h2>Novo template</h2>
              <p>Configure o visual, duração e origem do conteúdo.</p>
            </div>
          </div>

          <div className="template-type-grid">
            <button
              className={form.type === "clima" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("clima")}
              type="button"
            >
              <CloudSun size={28} />
              <strong>Clima ao vivo</strong>
              <span>Open-Meteo, cidade configurável</span>
            </button>

            <button
              className={form.type === "noticias" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("noticias")}
              type="button"
            >
              <Newspaper size={28} />
              <strong>Notícias ao vivo</strong>
              <span>RSS de portal ou fonte local</span>
            </button>

            <button
              className={form.type === "comercial" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("comercial")}
              type="button"
            >
              <Palette size={28} />
              <strong>Comercial</strong>
              <span>Promoção, serviço ou oferta</span>
            </button>

            <button
              className={form.type === "aviso" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("aviso")}
              type="button"
            >
              <Clock3 size={28} />
              <strong>Aviso</strong>
              <span>Comunicado institucional</span>
            </button>

            <button
              className={form.type === "jornal_premium" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("jornal_premium")}
              type="button"
            >
              <Newspaper size={28} />
              <strong>Jornal TV Premium</strong>
              <span>RSS + clima + hora, em paisagem e retrato</span>
            </button>

            <button
              className={form.type === "cardapio_premium" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("cardapio_premium")}
              type="button"
            >
              <Palette size={28} />
              <strong>Cardápio Premium</strong>
              <span>Produtos, categorias e preços para restaurantes</span>
            </button>

            <button
              className={form.type === "promocao_premium" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("promocao_premium")}
              type="button"
            >
              <CreditCard size={28} />
              <strong>Promoção Premium</strong>
              <span>Ofertas, preço antigo, preço destaque e CTA</span>
            </button>

            <button
              className={form.type === "corporativo_premium" ? "template-type-card active" : "template-type-card"}
              onClick={() => changeType("corporativo_premium")}
              type="button"
            >
              <Clock3 size={28} />
              <strong>Corporativo Premium</strong>
              <span>Avisos, agenda, indicadores e comunicação interna</span>
            </button>
          </div>

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

            {(form.type === "clima" || form.type === "jornal_premium") && (
              <div className="form-group">
                <label>Cidade do clima</label>
                <input
                  value={form.city}
                  placeholder="Ex: João Câmara"
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            )}

            {(form.type === "noticias" || form.type === "jornal_premium") && (
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
          </div>

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
            <button className="upload-button" onClick={handleSaveTemplate} disabled={saving}>
              <Plus size={20} />
              {saving ? "Salvando..." : "Salvar template"}
            </button>
          </div>
        </div>

        <div className="templates-preview-panel">
          <TemplateVisualPreview template={form} compact={false} />
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
                <TemplateVisualPreview template={template} compact />

                <div className="template-saved-info">
                  <div>
                    <strong>{template.name}</strong>
                    <span>
                      {getTemplateTypeLabel(template.type)} • {template.duration || 15}s • {template.orientation}
                    </span>
                  </div>

                  <div className="template-actions-row">
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

function TemplateVisualPreview({ template, compact = false }) {
  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState(DEFAULT_NEWS_ITEMS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplateContent() {
      try {
        setLoading(true);

        const realTemplateType = template.templateType || template.type;

        if (realTemplateType === "clima" || realTemplateType === "jornal_premium") {
          const data = await fetchWeatherByCity(template.city);
          if (!cancelled) setWeather(data);
        }

        if (realTemplateType === "noticias" || realTemplateType === "jornal_premium") {
          const data = await fetchNewsFromRss(template.newsFeedUrl);
          if (!cancelled) setNews(data);
        }
      } catch (error) {
        console.log(error);

        if (((template.templateType || template.type) === "clima" || (template.templateType || template.type) === "jornal_premium") && !cancelled) {
          setWeather({
            city: template.city || "Sua cidade",
            temperature: "--",
            sensation: "--",
            humidity: "--",
            wind: "--",
            source: "Aguardando atualização",
          });
        }

        if (((template.templateType || template.type) === "noticias" || (template.templateType || template.type) === "jornal_premium") && !cancelled) {
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
  }, [template.type, template.templateType, template.city, template.newsFeedUrl]);

  const realTemplateType = template.templateType || template.type;
  const isPortrait = template.orientation === "Retrato";
  const orientationLabel = isPortrait ? "Retrato" : "Paisagem";
  const mainNews = news[0] || DEFAULT_NEWS_ITEMS[0];

  if (realTemplateType === "marketing_art") {
    return <MarketingArtPreview art={template} compact={compact} tv={!compact} />;
  }

  const premiumFrameStyle = {
    minHeight: compact ? 160 : isPortrait ? 620 : 430,
    height: compact ? "100%" : "auto",
    display: "flex",
    flexDirection: "column",
    gap: compact ? 10 : 18,
    position: "relative",
    zIndex: 2,
  };

  const premiumGridStyle = {
    display: "grid",
    gridTemplateColumns: isPortrait || compact ? "1fr" : "1.25fr 0.75fr",
    gap: compact ? 10 : 18,
    flex: 1,
  };

  return (
    <div
      className={`template-tv-preview template-${realTemplateType} template-orientation-${isPortrait ? "portrait" : "landscape"} ${compact ? "compact" : ""}`}
      style={getTemplateThemeStyle(template)}
    >
      <div className="template-orb one"></div>
      <div className="template-orb two"></div>

      <div className="template-tv-topbar">
        <span>{template.title || "Totem Park"} • {orientationLabel}</span>
        <strong>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong>
      </div>

      {(template.templateType || template.type) === "clima" && (
        <div className="template-weather-layout">
          <div>
            <small>Agora em</small>
            <h2>{weather?.city || template.city || "Sua cidade"}</h2>
            <p>
              {template.subtitle || "Previsão atualizada automaticamente"}
              {weather?.source ? ` • ${weather.source}` : ""}
            </p>
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
            gridTemplateColumns: compact ? "1fr" : "1.05fr 0.95fr",
            gap: compact ? 12 : 30,
            alignItems: "center",
          }}
        >
          <div>
            <div className="template-breaking">
              {template.newsSource || "AO VIVO"}
            </div>

            <h2>{template.title || "Últimas notícias"}</h2>
            <p>{template.subtitle || "Manchetes atualizadas automaticamente"}</p>

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

      {realTemplateType === "jornal_premium" && (
        <div style={premiumFrameStyle}>
          <div style={premiumGridStyle}>
            <div
              style={{
                borderRadius: compact ? 18 : 30,
                overflow: "hidden",
                minHeight: compact ? 120 : isPortrait ? 300 : 360,
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
                style={{
                  position: "absolute",
                  inset: "auto 0 0 0",
                  padding: compact ? 12 : 26,
                  background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.94))",
                }}
              >
                <div className="template-breaking">{template.newsSource || getNewsItemSource(mainNews, "Notícias")}</div>
                <h2 style={{ margin: "8px 0 0", fontSize: compact ? 18 : isPortrait ? 34 : 42, lineHeight: 1.02 }}>
                  {getNewsItemTitle(mainNews)}
                </h2>
                {!compact && (
                  <p style={{ marginTop: 12, color: "rgba(255,255,255,0.78)", fontSize: isPortrait ? 16 : 18 }}>
                    {getNewsItemDescription(mainNews) || template.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isPortrait || compact ? "1fr 1fr" : "1fr",
                gap: compact ? 8 : 14,
              }}
            >
              <div style={{ borderRadius: 24, padding: compact ? 12 : 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <small>Clima</small>
                <h2 style={{ margin: "6px 0", fontSize: compact ? 22 : 42 }}>{weather?.temperature ?? "--"}°</h2>
                <p style={{ margin: 0 }}>{weather?.city || template.city || "Sua cidade"}</p>
              </div>

              <div style={{ borderRadius: 24, padding: compact ? 12 : 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <small>Agora</small>
                <h2 style={{ margin: "6px 0", fontSize: compact ? 22 : 42 }}>
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </h2>
                <p style={{ margin: 0 }}>{new Date().toLocaleDateString("pt-BR")}</p>
              </div>

              {!compact && (
                <div style={{ borderRadius: 24, padding: 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", gridColumn: isPortrait ? "1 / -1" : "auto" }}>
                  <small>Manchetes</small>
                  {news.slice(1, isPortrait ? 4 : 5).map((item, index) => (
                    <p key={`${getNewsItemTitle(item)}-${index}`} style={{ margin: "10px 0 0", fontWeight: 800 }}>
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
        <div style={premiumFrameStyle}>
          <div
            style={{
              borderRadius: compact ? 18 : 30,
              padding: compact ? 14 : 30,
              background: "linear-gradient(135deg, rgba(6,182,212,0.22), rgba(147,51,234,0.24))",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <div className="template-breaking">CARDÁPIO DIGITAL</div>
            <h2 style={{ margin: "8px 0 0", fontSize: compact ? 22 : isPortrait ? 42 : 54 }}>{template.title || "Cardápio Digital"}</h2>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.74)" }}>{template.subtitle || "Produtos e preços em destaque"}</p>
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

          {!compact && (
            <div style={{ marginTop: "auto", borderRadius: 22, padding: 18, background: "rgba(0,0,0,0.26)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <span>{template.callToAction || "Peça pelo QR Code ou no balcão"}</span>
              <strong style={{ color: "var(--template-accent)" }}>{template.footerText || "Totem Park Menu"}</strong>
            </div>
          )}
        </div>
      )}

      {realTemplateType === "promocao_premium" && (
        <div style={premiumFrameStyle}>
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
            <h2 style={{ margin: "8px 0", fontSize: compact ? 24 : isPortrait ? 46 : 64 }}>{template.title || "Ofertas da Semana"}</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>{template.subtitle || "Promoções em destaque para sua TV"}</p>
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
        <div style={premiumFrameStyle}>
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
                <h2 style={{ margin: "10px 0 0", fontSize: compact ? 22 : isPortrait ? 42 : 56 }}>{template.title || "Comunicação Corporativa"}</h2>
                <p style={{ color: "rgba(255,255,255,0.76)" }}>{template.subtitle || "Avisos, agenda e indicadores em tempo real"}</p>
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

          <h2>{template.title || template.name}</h2>
          <p>{template.subtitle || "Mensagem personalizada para sua TV."}</p>

          <div className="template-generic-footer">
            <span>Totem Park</span>
            <strong>{template.duration || 15}s</strong>
          </div>
        </div>
      )}

      <div className="template-tv-ticker">
        <span>
          {realTemplateType === "noticias" || realTemplateType === "jornal_premium"
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
      </div>
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

  const activeItemsKey = playerItems
    .map((item) => `${item.playerItemType}-${item.id || item.preview || item.title}-${item.updatedAt?.seconds || ""}`)
    .join("|");

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
    return `${activePlaylist?.id || "templates"}-${item?.id || item?.preview || item?.title || "item"}-${index}`;
  }

  function goToNextMedia() {
    const items = playerItems;

    if (items.length <= 1) return;

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
    const items = playerItems;

    transitionInProgressRef.current = false;
    setReadyMediaKey("");
    setMediaIndex((prev) => {
      const safePrev = prev >= items.length ? 0 : prev;
      return safePrev + 1 >= items.length ? 0 : safePrev + 1;
    });
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
        setScreen(null);
        setLoading(false);
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

          const connectedDeviceId = currentScreen.data().connectedDeviceId;
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
        if (currentScreen.data().connectedDeviceId !== localDeviceId) return;

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

      if (firstSnapshot) {
        lastCommandIdRef.current = remoteCommand.id;
        setLastCommandId(remoteCommand.id);
        firstSnapshot = false;
        return;
      }

      if (lastCommandIdRef.current === remoteCommand.id) {
        return;
      }

      lastCommandIdRef.current = remoteCommand.id;
      setLastCommandId(remoteCommand.id);

      try {
        await updateDoc(screenDocRef, {
          lastCommandExecuted: remoteCommand.type || "",
          lastCommandExecutedAt: serverTimestamp(),
          commandStatus: "executed",
        });
      } catch (error) {
        console.log(error);
      }

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
    const isReady =
      currentItem?.playerItemType === "template" || readyMediaKey === currentKey;
    const isPlaybackBlocked =
      pauseMode || takeoverMessage || blackoutMode || maintenanceMode;

    if (playbackTimingKeyRef.current !== timingKey) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
      playbackTimingKeyRef.current = timingKey;
      playbackRemainingRef.current = durationInMs;
      playbackStartedAtRef.current = 0;
    }

    if (!isReady || isPlaybackBlocked) return;

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
  }, [activePlaylist?.id, activeItemsKey, mediaIndex, readyMediaKey, pauseMode, takeoverMessage, blackoutMode, maintenanceMode]);

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

  if (loading) {
    return <div className="player-screen">Carregando player...</div>;
  }

  if (!screen) {
    return <div className="player-screen">Tela não encontrada.</div>;
  }

  if (activeTemplate) {
    return (
      <div className={`player-screen ${getPlayerOrientationClass()}`}>
        <TemplateVisualPreview
          template={applyOfflineAssetUrls(activeTemplate, offlineAssetMap)}
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
    currentMedia.playerItemType === "template" || readyMediaKey === currentMediaKey;
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
    state: currentMediaReady ? "is-current is-ready" : "is-current is-pending",
  });

  function renderPlayerItem(item, index, isCurrent) {
    if (item.playerItemType === "template") {
      return <TemplateVisualPreview template={item} />;
    }

    if (item.type === "Vídeo") {
      return (
        <video
          src={item.preview}
          autoPlay={!pauseMode}
          muted={!item.sound}
          playsInline
          preload="auto"
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          className="player-media"
          onLoadedData={(event) => {
            if (isCurrent) markCurrentMediaReady(item, index);

            if (!pauseMode) {
              event.currentTarget.play().catch((error) => {
                console.log("Autoplay aguardando video:", error);
              });
            }
          }}
          onCanPlay={(event) => {
            if (isCurrent) markCurrentMediaReady(item, index);
            if (!pauseMode) event.currentTarget.play().catch(() => {});
          }}
          onPlay={(event) => {
            if (pauseMode) event.currentTarget.pause();
          }}
          onError={() => {
            if (!isCurrent) return;
            console.log("Erro ao carregar video. Pulando midia.");
            setTimeout(skipFailedMedia, 800);
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
          setTimeout(skipFailedMedia, 800);
        }}
      />
    );
  }

  return (
    <div className={`player-screen ${playerOrientationClass}`}>
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
          key={getPlayerItemKey(item, index)}
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

      <section className="cards-grid">
        <div className="plan-card">
          <h3>Básico</h3>
          <div className="plan-price">R$ 49 <span>/mês</span></div>
          <p className="plan-annual">R$ 490 no anual</p>
          <div className="features">
            <Feature text="Até 2 telas" />
            <Feature text="Modo paisagem" />
            <Feature text="Playlists básicas" />
          </div>
        </div>

        <div className="plan-card">
          <h3>Profissional</h3>
          <div className="plan-price">R$ 129 <span>/mês</span></div>
          <p className="plan-annual">R$ 1.290 no anual</p>
          <div className="features">
            <Feature text="Até 10 telas" />
            <Feature text="Paisagem e retrato" />
            <Feature text="Campanhas avançadas" />
          </div>
        </div>

        <div className="plan-card">
          <h3>Enterprise</h3>
          <div className="plan-price">R$ 299 <span>/mês</span></div>
          <p className="plan-annual">R$ 2.990 no anual</p>
          <div className="features">
            <Feature text="Telas personalizadas" />
            <Feature text="Multiunidades" />
            <Feature text="Suporte prioritário" />
          </div>
        </div>
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

function StatCard({ title, value, icon, status }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon">{icon}</div>
      </div>

      <div className="stat-value">{value}</div>
      <div className="stat-status">{status}</div>
    </div>
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
