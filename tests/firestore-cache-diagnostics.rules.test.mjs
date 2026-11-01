import fs from "node:fs/promises";
import test, { after, before } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-totem-cache-diagnostics";
const screenPath = "clients/client-a/screens/screen-a";
let env;

const cachePayload = (overrides = {}) => ({
  cacheStatus:"parcial",
  cacheUpdatedAt:new Date("2026-10-30T01:03:46.669Z"),
  cachedItems:0,
  totalCacheableItems:8,
  failedCacheItems:8,
  cacheDownloadedItems:0,
  cacheRemovedItems:0,
  cacheSizeBytes:0,
  activePlaylistWeightBytes:0,
  estimatedMonthlyTrafficBytes:0,
  cacheManifestKey:"",
  cacheManifestItems:0,
  cacheManifestSizeBytes:0,
  cacheFailureMode:"item",
  cacheFailureCount:8,
  cacheFailureCodes:["HTTP_403", "EMPTY_DOWNLOADED_FILE"],
  ...overrides,
});

const heartbeat = (deviceId = "device-a") => ({
  activeDeviceId:deviceId,
  connectedDeviceId:deviceId,
  lastConnection:"agora",
  lastSeenAt:new Date(),
  status:"online",
  telemetryUpdatedAt:new Date(),
  telemetry:{
    schemaVersion:4,
    session:{ clientId:"client-a", screenId:"screen-a", deviceId },
    player:{ state:"playing" },
    current:{ playerState:"playing" },
    cache:{ cacheStatus:"parcial" },
  },
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore:{ rules:await fs.readFile("firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "settings/masterAccess"), { emails:["master@example.com"] });
    await setDoc(doc(db, "clients/client-a"), { uid:"client-owner", accountStatus:"active" });
    await setDoc(doc(db, screenPath), { name:"A", status:"online", connectedDeviceId:"device-a" });
    await setDoc(doc(db, "playerDeviceBindings/player-a"), {
      uid:"player-a", clientId:"client-a", screenId:"screen-a", deviceId:"device-a", status:"ACTIVE",
    });
    await setDoc(doc(db, "playerDeviceBindings/player-wrong-device"), {
      uid:"player-wrong-device", clientId:"client-a", screenId:"screen-a", deviceId:"device-b", status:"ACTIVE",
    });
    await setDoc(doc(db, "playerDeviceBindings/player-other-screen"), {
      uid:"player-other-screen", clientId:"client-a", screenId:"screen-b", deviceId:"device-a", status:"ACTIVE",
    });
  });
});

after(async () => env?.cleanup());

test("binding ativo grava diagnósticos item, pipeline e none", async () => {
  const db = env.authenticatedContext("player-a", { email:"player-a@example.com" }).firestore();
  await assertSucceeds(updateDoc(doc(db, screenPath), cachePayload()));
  await assertSucceeds(updateDoc(doc(db, screenPath), cachePayload({
    cacheFailureMode:"pipeline",
    cacheFailureCodes:["FILESYSTEM_UNAVAILABLE_AT_RESOURCE"],
  })));
  await assertSucceeds(updateDoc(doc(db, screenPath), cachePayload({
    cacheStatus:"pronto",
    cachedItems:8,
    failedCacheItems:0,
    cacheFailureMode:"none",
    cacheFailureCount:0,
    cacheFailureCodes:[],
  })));
});

test("rejeita modos, contagens e códigos inválidos", async () => {
  const db = env.authenticatedContext("player-a", { email:"player-a@example.com" }).firestore();
  const invalid = [
    { cacheFailureMode:"other" },
    { cacheFailureCount:-1 },
    { cacheFailureCount:1.5 },
    { cacheFailureCount:9 },
    { cacheFailureMode:"none", cacheFailureCount:1 },
    { cacheFailureMode:"none", cacheFailureCodes:["HTTP_403"] },
    { cacheFailureCodes:[] },
    { cacheFailureCodes:["A", "B", "C", "D", "E", "F"] },
    { cacheFailureCodes:["lowercase"] },
    { cacheFailureCodes:["HAS SPACE"] },
    { cacheFailureCodes:["A".repeat(65)] },
    { cacheFailureCodes:[123] },
    { arbitraryDiagnostic:true },
  ];
  for (const overrides of invalid) {
    await assertFails(updateDoc(doc(db, screenPath), cachePayload(overrides)));
  }
});

test("sem binding, outra tela e outro dispositivo não alteram diagnósticos", async () => {
  await assertFails(updateDoc(doc(env.authenticatedContext("unbound", { email:"unbound@example.com" }).firestore(), screenPath), cachePayload()));
  await assertFails(updateDoc(doc(env.authenticatedContext("client-owner", { email:"owner@example.com" }).firestore(), screenPath), cachePayload()));
  await assertFails(updateDoc(doc(env.authenticatedContext("player-other-screen", { email:"other@example.com" }).firestore(), screenPath), cachePayload()));
  await assertFails(updateDoc(doc(env.authenticatedContext("player-wrong-device", { email:"wrong@example.com" }).firestore(), screenPath), cachePayload()));
});

test("player antigo continua atualizando cache sem campos diagnósticos", async () => {
  const db = env.authenticatedContext("unbound-legacy", { email:"legacy@example.com" }).firestore();
  const payload = cachePayload();
  delete payload.cacheFailureMode;
  delete payload.cacheFailureCount;
  delete payload.cacheFailureCodes;
  await assertSucceeds(updateDoc(doc(db, screenPath), payload));
});

test("heartbeat V70 permanece aceito com e sem campos diagnósticos existentes", async () => {
  const db = env.authenticatedContext("player-a", { email:"player-a@example.com" }).firestore();
  await assertSucceeds(updateDoc(doc(db, screenPath), heartbeat()));
  await assertSucceeds(updateDoc(doc(db, screenPath), cachePayload()));
  await assertSucceeds(updateDoc(doc(db, screenPath), heartbeat()));
});
