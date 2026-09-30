import { Capacitor } from "@capacitor/core";
import { usePersistentFirestoreCache } from "./firestore-cache-policy";
import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
  authDomain: "totem-park.firebaseapp.com",
  projectId: "totem-park",
  storageBucket: "totem-park.firebasestorage.app",
  messagingSenderId: "442546117681",
  appId: "1:442546117681:web:10106346df8cd91d198910",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: usePersistentFirestoreCache({
    native: Capacitor.isNativePlatform(),
    mode: import.meta.env.VITE_APP_MODE,
    pathname: typeof window !== "undefined" ? window.location.pathname : "/",
  }) ? persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }) : memoryLocalCache(),
});
export const storage = getStorage(app);

export default app;
