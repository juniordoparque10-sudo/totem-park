import { Capacitor } from "@capacitor/core";
import { getFirestoreTabMode, shouldUsePersistentFirestoreCache } from "./firestore-cache-policy";
import { initializeApp } from "firebase/app";

import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from "firebase/auth";

import {
  initializeFirestore,
  connectFirestoreEmulator,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
} from "firebase/firestore";

import { connectStorageEmulator, getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const isBasicHom = import.meta.env.VITE_BASIC_HOM === "true";
const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
const emulatorHost = isBasicHom ? import.meta.env.VITE_EMULATOR_HOST : "127.0.0.1";
const emulatorProjectId = import.meta.env.VITE_EMULATOR_PROJECT_ID;

if (isBasicHom && (
  !useFirebaseEmulators ||
  import.meta.env.VITE_APP_MODE !== "playerRc" ||
  emulatorProjectId !== "demo-totem-basic-hom" ||
  !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(emulatorHost || "") ||
  emulatorHost.startsWith("127.") ||
  emulatorHost.startsWith("0.")
)) {
  throw new Error("BASIC HOM bloqueado: configuracao de emuladores invalida.");
}

const firebaseConfig = isBasicHom ? {
  apiKey: "fake-api-key-basic-hom",
  authDomain: "demo-totem-basic-hom.firebaseapp.com",
  projectId: "demo-totem-basic-hom",
  storageBucket: "demo-totem-basic-hom.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:0000000000000000",
} : {
  apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
  authDomain: "totem-park.firebaseapp.com",
  projectId: useFirebaseEmulators ? (import.meta.env.VITE_FIREBASE_EMULATOR_PROJECT_ID || "demo-totem-billing-ux") : "totem-park",
  storageBucket: "totem-park.firebasestorage.app",
  messagingSenderId: "442546117681",
  appId: "1:442546117681:web:10106346df8cd91d198910",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
if (useFirebaseEmulators) connectAuthEmulator(auth, `http://${emulatorHost}:9198`, { disableWarnings: true });
// Auth observers must not decide routing before durable browser persistence is ready.
// Keeping this promise exported also makes the boot order explicit for route guards.
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Nao foi possivel configurar a persistencia local do login:", error);
  throw error;
});
const nativePlatform = Capacitor.isNativePlatform();
const appMode = import.meta.env.VITE_APP_MODE;
const persistentFirestoreCache = shouldUsePersistentFirestoreCache({
  native: nativePlatform,
  mode: appMode,
  pathname: typeof window !== "undefined" ? window.location.pathname : "/",
});
const firestoreTabManager = getFirestoreTabMode({ native: nativePlatform, mode: appMode }) === "single"
  ? persistentSingleTabManager()
  : persistentMultipleTabManager();

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentFirestoreCache ? persistentLocalCache({
    tabManager: firestoreTabManager,
  }) : memoryLocalCache(),
});
if (useFirebaseEmulators) connectFirestoreEmulator(db, emulatorHost, 8189);
export const storage = getStorage(app);
if (isBasicHom) connectStorageEmulator(storage, emulatorHost, 9199);
export const functions = getFunctions(app, "us-central1");
if (useFirebaseEmulators) connectFunctionsEmulator(functions, emulatorHost, 5002);

export default app;
