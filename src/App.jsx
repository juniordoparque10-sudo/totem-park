import { useEffect, useState } from "react";
import { Routes, Route, useParams } from "react-router-dom";
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
} from "firebase/firestore";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

import { auth, db, storage } from "./firebase";
import logo from "./assets/logo.png";
import "./App.css";

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
      <Route path="/player/:clientId/:codigo" element={<PlayerPage />} />
    </Routes>
  );
}

function AdminApp() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedClient, setSelectedClient] = useState(null);

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

            <button className="logout-button" onClick={() => signOut(auth)}>
              <LogOut size={18} />
              Sair
            </button>
          </aside>

          <main className="content">
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

  return (
    <>
      <header className="header">
        <div>
          <div className="kicker">Painel Administrativo</div>
          <h1>Bem-vindo ao Totem Park</h1>
          <p>Sistema profissional de digital signage.</p>
        </div>
      </header>

      <section className="stats">
        <StatCard
          title="Clientes"
          value={clients.length}
          icon={<Users />}
          status="Cadastrados"
        />

        <StatCard
          title="Telas contratadas"
          value={clients.reduce(
            (total, client) => total + Number(client.screensLimit || 0),
            0
          )}
          icon={<Monitor />}
          status="Limite total"
        />

        <StatCard
          title="Planos"
          value="03"
          icon={<CreditCard />}
          status="Básico, Pro e Enterprise"
        />

        <StatCard
          title="Sistema"
          value="Online"
          icon={<Wifi />}
          status="Funcionando"
        />
      </section>
    </>
  );
}

function ClientsPage({ onOpenClient }) {
  const [clients, setClients] = useState([]);
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
      <header className="header">
        <div>
          <div className="kicker">Gestão SaaS</div>
          <h1>Clientes</h1>
          <p>Gerencie clientes, planos, limites de telas e cobrança.</p>
        </div>
      </header>

      <section className="panel">
        <h2>Novo cliente</h2>

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

        <div className="panel-actions">
          <button className="upload-button" onClick={handleCreateClient}>
            <Plus size={20} />
            Criar cliente
          </button>
        </div>
      </section>

      <section className="cards-grid">
        {clients.length === 0 ? (
          <div className="empty-library">Nenhum cliente cadastrado ainda.</div>
        ) : (
          clients.map((client) => (
            <div className="media-card" key={client.id}>
              <div className="media-info">
                <span>{client.plan}</span>
                <h3>{client.name}</h3>
                <p>{client.email || "Sem e-mail cadastrado"}</p>
                <p>Cobrança: {client.billing}</p>
                <p>Vencimento: {client.dueDate || "Não informado"}</p>
                <p>Limite de telas: {client.screensLimit}</p>
                <p>Status: {client.status}</p>

                <div className="card-actions">
                  <button
                    className="upload-button"
                    onClick={() => onOpenClient(client)}
                  >
                    Abrir cliente
                  </button>

                  <button
                    className="upload-button"
                    onClick={() => resetClientPassword(client.email)}
                  >
                    Resetar senha
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => deleteClient(client.id)}
                  >
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

  return (
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

  function handleFileChange(event) {
    const file = event.target.files[0];
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
              <p>Selecione uma imagem ou vídeo</p>
            </div>
          )}
        </div>

        <div className="upload-form">
          <div className="form-group">
            <label>Arquivo</label>
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
          </div>

          <div className="form-group">
            <label>Nome da mídia</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
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
  const [editingPlaylist, setEditingPlaylist] = useState(null);

  const [form, setForm] = useState({
    name: "",
    transition: "Fade suave",
    orientation: "Paisagem",
    selectedMediaIds: [],
  });

  useEffect(() => {
    const unsubMedia = onSnapshot(
      collection(db, "clients", client.id, "media"),
      (snapshot) => {
        setMediaList(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    const unsubPlaylists = onSnapshot(
      collection(db, "clients", client.id, "playlists"),
      (snapshot) => {
        setPlaylists(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    );

    return () => {
      unsubMedia();
      unsubPlaylists();
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

  function resetPlaylistForm() {
    setEditingPlaylist(null);
    setForm({
      name: "",
      transition: "Fade suave",
      orientation: "Paisagem",
      selectedMediaIds: [],
    });
  }

  function startEditPlaylist(playlist) {
    setEditingPlaylist(playlist);
    setForm({
      name: playlist.name || "",
      transition: playlist.transition || "Fade suave",
      orientation: playlist.orientation || "Paisagem",
      selectedMediaIds: playlist.items?.map((item) => item.id) || [],
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

    try {
      const selectedItems = form.selectedMediaIds
        .map((id) => mediaList.find((media) => media.id === id))
        .filter(Boolean);

      const playlistData = {
        name: form.name,
        transition: form.transition,
        orientation: form.orientation,
        items: selectedItems,
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
          <h2>{editingPlaylist ? "Editar playlist" : "Criar playlist"}</h2>

          <div className="form-grid">
            <div className="form-group">
              <label>Nome da playlist</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              <label>Transição</label>
              <select
                value={form.transition}
                onChange={(e) => setForm({ ...form, transition: e.target.value })}
              >
                <option>Fade suave</option>
                <option>Slide lateral</option>
                <option>Zoom leve</option>
                <option>Corte seco</option>
                <option>Dissolver</option>
              </select>
            </div>
          </div>

          <div className="media-selector">
            {mediaList.length === 0 ? (
              <div className="empty-library">Cadastre mídias primeiro.</div>
            ) : (
              mediaList.map((media) => (
                <button
                  key={media.id}
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
                    {media.type} • {media.duration}s • {media.sound ? "Com som" : "Sem som"}
                  </span>
                </button>
              ))
            )}
          </div>

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
          <div className="empty-library">Nenhuma playlist criada ainda.</div>
        ) : (
          playlists.map((playlist) => (
            <div className="playlist-card" key={playlist.id}>
              <div className="playlist-card-header">
                <div>
                  <h3>{playlist.name}</h3>
                  <p>
                    {playlist.orientation} • {playlist.transition} • {playlist.items?.length || 0} mídias
                  </p>
                </div>

                <div className="card-actions">
                  <button className="upload-button" onClick={() => startEditPlaylist(playlist)}>
                    Editar
                  </button>

                  <button className="delete-button" onClick={() => deletePlaylist(playlist.id)}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>

              <div className="playlist-items">
                {playlist.items?.map((item, index) => (
                  <div className="playlist-item" key={`${playlist.id}-${index}`}>
                    <div className="playlist-number">{index + 1}</div>

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
                        {item.type} • {item.duration}s • {item.sound ? "Com som" : "Sem som"}
                      </span>
                    </div>

                    <div>{item.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</div>
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

  const [form, setForm] = useState({
    name: "",
    location: "",
    orientation: "Paisagem",
    playlistId: "",
  });

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

  async function handleCreateScreen() {
    if (!form.name.trim()) {
      alert("Informe o nome da tela.");
      return;
    }

    if (screens.length >= Number(client.screensLimit || 0)) {
      alert("Este cliente atingiu o limite de telas do plano.");
      return;
    }

    const selectedPlaylist = playlists.find((playlist) => playlist.id === form.playlistId);

    try {
      await addDoc(collection(db, "clients", client.id, "screens"), {
        name: form.name,
        location: form.location || "Não informado",
        orientation: form.orientation,
        playlistId: selectedPlaylist?.id || "",
        playlistName: selectedPlaylist?.name || "Nenhuma playlist vinculada",
        code: generateCode(),
        status: "online",
        lastConnection: new Date().toLocaleString("pt-BR"),
        createdAt: serverTimestamp(),
      });

      setForm({
        name: "",
        location: "",
        orientation: "Paisagem",
        playlistId: "",
      });

      alert("Tela cadastrada com sucesso!");
    } catch (error) {
      console.log(error);
      alert("Erro ao cadastrar tela.");
    }
  }

  async function deleteScreen(id) {
    try {
      await deleteDoc(doc(db, "clients", client.id, "screens", id));
    } catch (error) {
      console.log(error);
      alert("Erro ao excluir tela.");
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Nova tela</h2>
        <p className="stat-status">Uso atual: {screens.length}/{client.screensLimit} telas</p>

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
            <label>Playlist vinculada</label>
            <select
              value={form.playlistId}
              onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
            >
              <option value="">Nenhuma playlist</option>
              {playlists.map((playlist) => (
                <option value={playlist.id} key={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="panel-actions">
          <button className="upload-button" onClick={handleCreateScreen}>
            <Plus size={20} />
            Cadastrar tela
          </button>
        </div>
      </section>

      <section className="cards-grid">
        {screens.length === 0 ? (
          <div className="empty-library">Nenhuma tela cadastrada ainda.</div>
        ) : (
          screens.map((screen) => (
            <div className="media-card" key={screen.id}>
              <div className="media-preview">
                <Monitor size={54} />
              </div>

              <div className="media-info">
                <span>{screen.orientation}</span>
                <h3>{screen.name}</h3>
                <p>Local: {screen.location}</p>
                <p>Playlist: {screen.playlistName}</p>

                <p>
                  Código:
                  <br />
                  <strong>{screen.code}</strong>
                </p>

                <p>
                  Player:
                  <br />
                  <strong>/player/{client.id}/{screen.code}</strong>
                </p>

                <p>
                  Última conexão:
                  <br />
                  {screen.lastConnection}
                </p>

                <div className="badge online">Online</div>

                <button className="delete-button" onClick={() => deleteScreen(screen.id)}>
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

function PlayerPage() {
  const { clientId, codigo } = useParams();
  const [screen, setScreen] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || !codigo) return;

    const screenQuery = query(
      collection(db, "clients", clientId, "screens"),
      where("code", "==", codigo.toUpperCase())
    );

    const unsubscribe = onSnapshot(screenQuery, async (snapshot) => {
      if (snapshot.empty) {
        setScreen(null);
        setLoading(false);
        return;
      }

      const screenDoc = snapshot.docs[0];
      const screenData = { id: screenDoc.id, ...screenDoc.data() };

      setScreen(screenData);
      setLoading(false);

      try {
        await updateDoc(doc(db, "clients", clientId, "screens", screenDoc.id), {
          status: "online",
          lastConnection: new Date().toLocaleString("pt-BR"),
        });
      } catch (error) {
        console.log(error);
      }
    });

    return () => unsubscribe();
  }, [clientId, codigo]);

  useEffect(() => {
    if (!screen?.playlistId || !clientId) {
      setPlaylist(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "clients", clientId, "playlists", screen.playlistId),
      (playlistDoc) => {
        if (playlistDoc.exists()) {
          setPlaylist({ id: playlistDoc.id, ...playlistDoc.data() });
          setMediaIndex(0);
        } else {
          setPlaylist(null);
        }
      }
    );

    return () => unsubscribe();
  }, [screen, clientId]);

  useEffect(() => {
    const items = playlist?.items || [];
    if (items.length === 0) return;

    const currentItem = items[mediaIndex];
    const duration = Number(currentItem?.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setMediaIndex((prev) => (prev + 1 >= items.length ? 0 : prev + 1));
    }, duration);

    return () => clearTimeout(timer);
  }, [playlist, mediaIndex]);

  if (loading) {
    return <div className="player-screen">Carregando player...</div>;
  }

  if (!screen) {
    return <div className="player-screen">Tela não encontrada.</div>;
  }

  if (!playlist || !playlist.items || playlist.items.length === 0) {
    return (
      <div className="player-screen">
        <div className="player-empty">
          <img src={logo} alt="Totem Park" style={{ width: 180 }} />
          <h1>{screen.name}</h1>
          <p>Nenhuma playlist vinculada a esta tela.</p>
        </div>
      </div>
    );
  }

  const currentMedia = playlist.items[mediaIndex];

  return (
    <div className="player-screen">
      {currentMedia.type === "Vídeo" ? (
        <video
          key={`${currentMedia.preview}-${mediaIndex}`}
          src={currentMedia.preview}
          autoPlay
          muted={!currentMedia.sound}
          playsInline
          className="player-media"
        />
      ) : (
        <img
          key={`${currentMedia.preview}-${mediaIndex}`}
          src={currentMedia.preview}
          alt={currentMedia.title}
          className="player-media"
        />
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
