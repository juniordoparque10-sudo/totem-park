import { useEffect, useState } from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import { initializeApp, deleteApp } from "firebase/app";

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
} from "firebase/firestore";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

import { auth, db, storage } from "./firebase";
import logo from "./assets/logo.png";
import "./App.css";


function isNativeApp() {
  return (
    typeof window !== "undefined" &&
    (
      window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === "capacitor:"
    )
  );
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
  return (
    <Routes>
      <Route path="/" element={<AdminApp />} />
      <Route path="/tv" element={<TVConnectPage />} />
      <Route path="/player/:clientId/:codigo" element={<PlayerPage />} />
    </Routes>
  );
}

function AdminApp() {
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


function AppModeChoice({ client, onSelectMode }) {
  return (
    <div className="app-mode-page">
      <div className="app-mode-card">
        <img src={logo} alt="Totem Park" />

        <div className="app-mode-kicker">Aplicativo Totem Park</div>

        <h1>Escolha o modo de uso</h1>

        <p>
          Você está logado como <strong>{client?.name}</strong>. Escolha se deseja
          gerenciar sua conta ou abrir este dispositivo como TV.
        </p>

        <div className="app-mode-grid">
          <button
            type="button"
            className="app-mode-option manager"
            onClick={() => onSelectMode("manager")}
          >
            <span>Modo Gestor</span>
            <strong>Gerenciar painel</strong>
            <p>
              Acesse mídias, playlists, telas e configurações do cliente.
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
              Digite o código da tela e transforme este dispositivo em player fullscreen.
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
    }, 15000);

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

    return diffInSeconds <= 45;
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

                    <div className="premium-screen-icon">
                      <Monitor size={24} />
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
      </div>

      {tab === "dashboard" && <ClientDashboard client={client} />}
      {tab === "media" && <ClientMediaPage client={client} />}
      {tab === "playlists" && <ClientPlaylistsPage client={client} />}
      {tab === "screens" && <ClientScreensPage client={client} />}
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
    }, 15000);

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

    return diffInSeconds <= 45;
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
              const previewMedia = activePlaylist?.items?.[0];
              const online = isScreenOnline(screen);

              return (
                <div className="screen-live-card" key={screen.id}>
                  <div className="screen-live-preview">
                    {previewMedia ? (
                      previewMedia.type === "Vídeo" ? (
                        <video src={previewMedia.preview} muted />
                      ) : (
                        <img src={previewMedia.preview} alt={previewMedia.title} />
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
  const [playlists, setPlaylists] = useState([]);
  const [screens, setScreens] = useState([]);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [draggedMediaId, setDraggedMediaId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    transition: "Fade suave",
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
      unsubPlaylists();
      unsubScreens();
    };
  }, [client.id]);

  function toggleMedia(mediaId) {
    const selected = form.selectedMediaIds.includes(mediaId);

    setForm({
      ...form,
      selectedMediaIds: selected
        ? form.selectedMediaIds.filter((id) => id !== mediaId)
        : [...form.selectedMediaIds, mediaId],
    });
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


  function handleDragStart(mediaId) {
    setDraggedMediaId(mediaId);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(targetMediaId) {
    if (!draggedMediaId || draggedMediaId === targetMediaId) {
      setDraggedMediaId(null);
      return;
    }

    const updated = [...form.selectedMediaIds];

    const draggedIndex = updated.indexOf(draggedMediaId);
    const targetIndex = updated.indexOf(targetMediaId);

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
      orientation: playlist.orientation || "Paisagem",
      selectedMediaIds: playlist.items?.map((item) => item.id) || [],
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
      alert("Selecione pelo menos uma mídia.");
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
        .map((id) => mediaList.find((media) => media.id === id))
        .filter(Boolean);

      const playlistData = {
        name: form.name,
        transition: form.transition,
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
              {form.selectedMediaIds.length} selecionada(s)
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
                    form.selectedMediaIds.includes(media.id)
                      ? "select-media-card selected"
                      : "select-media-card"
                  }
                  onClick={() => toggleMedia(media.id)}
                >
                  <div className="select-media-thumb">
                    {media.type === "Vídeo" ? (
                      <video src={media.preview} />
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

              {form.selectedMediaIds.map((mediaId, index) => {
                const media = mediaList.find((item) => item.id === mediaId);

                if (!media) return null;

                return (
                  <div
                    key={media.id}
                    className={
                      draggedMediaId === media.id
                        ? "playlist-order-item dragging"
                        : "playlist-order-item"
                    }
                    draggable
                    onDragStart={() => handleDragStart(media.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(media.id)}
                    onDragEnd={() => setDraggedMediaId(null)}
                  >
                    <div className="drag-handle">
                      <GripVertical size={18} />
                    </div>

                    <div className="playlist-order-position">
                      {index + 1}
                    </div>

                    <div className="playlist-order-thumb">
                      {media.type === "Vídeo" ? (
                        <video src={media.preview} />
                      ) : (
                        <img src={media.preview} alt={media.title} />
                      )}
                    </div>

                    <div className="playlist-order-info">
                      <strong>{media.title}</strong>

                      <span>
                        {media.type} • {media.duration}s •{" "}
                        {media.sound ? "Com som" : "Sem som"}
                      </span>
                    </div>

                    <div className="order-buttons">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveMedia(index, "up")}
                        title="Subir mídia"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={index === form.selectedMediaIds.length - 1}
                        onClick={() => moveMedia(index, "down")}
                        title="Descer mídia"
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
                    {playlist.orientation} • {playlist.transition} •{" "}
                    {playlist.items?.length || 0} mídias
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
                      {item.type === "Vídeo" ? (
                        <video src={item.preview} />
                      ) : (
                        <img src={item.preview} alt={item.title} />
                      )}
                    </div>

                    <div className="playlist-item-info">
                      <strong>{item.title}</strong>

                      <span>
                        {item.type} • {item.duration}s •{" "}
                        {item.sound ? "Com som" : "Sem som"}
                      </span>
                    </div>

                    <div>
                      {item.sound ? (
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

    return diffInSeconds <= 45;
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
      await updateDoc(doc(db, "clients", client.id, "screens", screenId), {
        remoteCommand: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          ...command,
          sentAt: new Date().toISOString(),
        },
        lastCommandSent: command.type,
        lastCommandSentAt: serverTimestamp(),
      });
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
            const previewMedia = activePlaylist?.items?.[0];

            return (
              <div className="media-card" key={screen.id}>
                <div className="media-preview screen-preview">
                  {previewMedia ? (
                    previewMedia.type === "Vídeo" ? (
                      <video src={previewMedia.preview} muted />
                    ) : (
                      <img src={previewMedia.preview} alt={previewMedia.title} />
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



function TVConnectPage() {
  const navigate = useNavigate();

  const [screenCode, setScreenCode] = useState("");
  const [loading, setLoading] = useState(false);

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

      if (!clientId) {
        alert("Não foi possível identificar o cliente desta tela.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        "totempark-tv-connection",
        JSON.stringify({
          clientId,
          code,
        })
      );

      navigate(`/player/${clientId}/${code}`);
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

        {isNativeApp() && (
          <div className="tv-app-actions">
            <button
              className="tv-change-mode-button"
              onClick={() => {
                localStorage.removeItem("totempark-app-mode");
                localStorage.removeItem("totempark-tv-connection");
                window.location.href = "/";
              }}
            >
              Voltar para Modo Gestor
            </button>

            <button
              className="tv-change-screen-button"
              onClick={() => {
                localStorage.removeItem("totempark-tv-connection");
                setScreenCode("");
              }}
            >
              Conectar outra tela
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function PlayerPage() {
  const { clientId, codigo } = useParams();
  const [screen, setScreen] = useState(null);
  const [defaultPlaylist, setDefaultPlaylist] = useState(null);
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [activeMode, setActiveMode] = useState("default");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [remoteOverlay, setRemoteOverlay] = useState(null);
  const [takeoverMessage, setTakeoverMessage] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [blackoutMode, setBlackoutMode] = useState(false);
  const [pauseMode, setPauseMode] = useState(false);
  const [lastCommandId, setLastCommandId] = useState(null);
  const [showTvMenu, setShowTvMenu] = useState(false);

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

  function goToNextMedia() {
    const items = activePlaylist?.items || [];

    if (items.length === 0) return;

    setMediaIndex((prev) => (prev + 1 >= items.length ? 0 : prev + 1));
  }

  function getPlayerOrientationClass() {
    return screen?.orientation === "Retrato" ? "portrait-mode" : "landscape-mode";
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
        await updateDoc(screenDocRef, {
          status: "online",
          lastConnection: new Date().toLocaleString("pt-BR"),
          lastSeenAt: serverTimestamp(),
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
  }, [screen?.id, clientId]);


  useEffect(() => {
    if (!screen?.id || !clientId) return;

    const screenDocRef = doc(
      db,
      "clients",
      clientId,
      "screens",
      screen.id
    );

    const unsubscribe = onSnapshot(screenDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const remoteCommand = data.remoteCommand;

      if (!remoteCommand?.id || remoteCommand.id === lastCommandId) {
        return;
      }

      setLastCommandId(remoteCommand.id);

      try {
        await updateDoc(screenDocRef, {
          lastCommandExecuted: remoteCommand.type || "",
          lastCommandExecutedAt: serverTimestamp(),
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
        setPauseMode(true);
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
  }, [screen?.id, clientId, lastCommandId]);


  useEffect(() => {
    if (!screen?.id || !clientId || !activePlaylist) return;

    const items = activePlaylist?.items || [];
    const currentItem = items[mediaIndex];

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
          nowPlayingTitle: currentItem.title || "",
          nowPlayingType: currentItem.type || "",
          nowPlayingDuration: Number(currentItem.duration || 10),
          nowPlayingPreview: currentItem.preview || "",
          nowPlayingSound: currentItem.sound || false,
          nowPlayingIndex: mediaIndex + 1,
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
  }, [screen?.id, clientId, activePlaylist?.id, activeMode, mediaIndex]);

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
    const selected = chooseActivePlaylist();

    const previousId = activePlaylist?.id;

    setActivePlaylist(selected.playlist || null);
    setActiveMode(selected.mode);

    if (selected.playlist?.id !== previousId) {
      setMediaIndex(0);
    }
  }, [allPlaylists, defaultPlaylist, now, screen]);

  useEffect(() => {
    const items = activePlaylist?.items || [];

    if (pauseMode || takeoverMessage || blackoutMode || maintenanceMode) return;

    if (items.length === 0) return;

    const currentItem = items[mediaIndex];
    const duration = Number(currentItem?.duration || 10) * 1000;

    const timer = setTimeout(() => {
      goToNextMedia();
    }, duration);

    return () => clearTimeout(timer);
  }, [activePlaylist, mediaIndex, pauseMode, takeoverMessage, blackoutMode, maintenanceMode]);

  useEffect(() => {
    const mediaElement = document.querySelector(".player-media");

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

  if (!activePlaylist || !activePlaylist.items || activePlaylist.items.length === 0) {
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

  const currentMedia = activePlaylist.items[mediaIndex];
  const nextMedia =
    activePlaylist.items[
      mediaIndex + 1 >= activePlaylist.items.length ? 0 : mediaIndex + 1
    ];

  return (
    <div
      className={`player-screen ${getPlayerOrientationClass()}`}
      onDoubleClick={() => {
        if (isNativeApp()) {
          setShowTvMenu(true);
        }
      }}
    >
      {isNativeApp() && (
        <button
          className="tv-hidden-menu-zone"
          onClick={() => setShowTvMenu(true)}
          aria-label="Abrir menu da TV"
        ></button>
      )}

      {showTvMenu && (
        <div className="tv-player-menu">
          <div className="tv-player-menu-card">
            <img src={logo} alt="Totem Park" />

            <h2>Modo TV ativo</h2>

            <p>
              Tela conectada: <strong>{screen?.name}</strong>
              <br />
              Código: <strong>{codigo}</strong>
            </p>

            <button onClick={() => setShowTvMenu(false)}>
              Continuar exibindo
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("totempark-tv-connection");
                window.location.href = "/tv";
              }}
            >
              Conectar outra tela
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("totempark-app-mode");
                localStorage.removeItem("totempark-tv-connection");
                window.location.href = "/";
              }}
            >
              Voltar para Modo Gestor
            </button>
          </div>
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

      {activeMode === "scheduled" && (
        <div className="player-schedule-label">
          Programação ativa: {activePlaylist.name}
        </div>
      )}

      {currentMedia.type === "Vídeo" ? (
        <video
          key={`${currentMedia.preview}-${mediaIndex}`}
          src={currentMedia.preview}
          autoPlay={!pauseMode}
          muted={!currentMedia.sound}
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          className="player-media"
          onPlay={(event) => {
            if (pauseMode) {
              event.currentTarget.pause();
            }
          }}
          onEnded={goToNextMedia}
        />
      ) : (
        <img
          key={`${currentMedia.preview}-${mediaIndex}`}
          src={currentMedia.preview}
          alt={currentMedia.title}
          className="player-media"
          loading="eager"
          decoding="sync"
        />
      )}

      {nextMedia && (
        <div className="player-preload-media" aria-hidden="true">
          {nextMedia.type === "Vídeo" ? (
            <video src={nextMedia.preview} preload="auto" muted playsInline />
          ) : (
            <img src={nextMedia.preview} alt="" />
          )}
        </div>
      )}
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
