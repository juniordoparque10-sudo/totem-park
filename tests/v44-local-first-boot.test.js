import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readCachedPlayerDocument } from "../src/player-local-first.js";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const receiver = fs.readFileSync(new URL("../android/app/src/main/java/br/com/parksolutions/totempark/BootReceiver.java", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");

function snapshot(id, data = {}) {
  return { id, exists: () => true, data: () => data };
}

test("screen/client cached válidos são restauráveis sem request remoto", async () => {
  let cacheReads = 0;
  let remoteReads = 0;
  const getFromCache = async () => {
    cacheReads += 1;
    return snapshot("screen-1", { connectedDeviceId: "device-1" });
  };
  const result = await readCachedPlayerDocument({ getFromCache, reference: {}, expectedId: "screen-1" });
  assert.equal(result.id, "screen-1");
  assert.equal(cacheReads, 1);
  assert.equal(remoteReads, 0);
});

test("cache miss ou identidade divergente preserva o fluxo remoto", async () => {
  assert.equal(await readCachedPlayerDocument({
    getFromCache: async () => { throw new Error("cache miss"); },
    reference: {},
    expectedId: "screen-1",
  }), null);
  assert.equal(await readCachedPlayerDocument({
    getFromCache: async () => snapshot("screen-2"),
    reference: {},
    expectedId: "screen-1",
  }), null);
  assert.match(app, /if \(cachedScreen\) handleScreenData\(cachedScreen, \{ source: "cache" \}\);\s*subscribeToScreenRef\(screenRef\)/);
});

test("falha de leitura do cache pode ser observada sem alterar o fallback nulo", async () => {
  const observed = [];
  const failure = new Error("indexeddb unavailable");
  const result = await readCachedPlayerDocument({
    getFromCache: async () => { throw failure; },
    reference: {},
    expectedId: "screen-1",
    onError: (error) => observed.push(error),
  });
  assert.equal(result, null);
  assert.deepEqual(observed, [failure]);
});

test("screen e client cached encerram seus loadings antes do listener remoto", () => {
  const cachedScreen = app.indexOf('handleScreenData(cachedScreen, { source: "cache" })');
  const screenListener = app.indexOf("subscribeToScreenRef(screenRef)", cachedScreen);
  const cachedClient = app.indexOf("if (cachedClient)");
  const clientLoading = app.indexOf("setClientLoading(false)", cachedClient);
  const clientListener = app.indexOf("unsubscribeClient = onSnapshot", cachedClient);
  assert.ok(cachedScreen >= 0 && screenListener > cachedScreen);
  assert.ok(clientLoading > cachedClient && clientListener > clientLoading);
});

test("listeners remotos continuam atualizando e erros não apagam estado restaurado", () => {
  assert.match(app, /unsubscribeScreen = onSnapshot\(screenRef, handleScreenData/);
  assert.match(app, /unsubscribeClient = onSnapshot\([\s\S]*resolveClientSnapshot\(\{ snapshot, currentClient \}\)/);
  assert.match(app, /if \(result\.replaceClient\)[\s\S]*setPlayerClient\(result\.client\)/);
  assert.doesNotMatch(app, /Erro ao acompanhar tela do player:[\s\S]{0,300}setScreen\(null\)/);
  assert.doesNotMatch(app, /Erro ao carregar cliente do player:[\s\S]{0,200}setPlayerClient\(null\)/);
  assert.match(app, /remoteCommand\.type === "exitTv"[\s\S]{0,300}clearTvConnectionAndShowCode\("remote-exit-command"\)/);
});

test("fast-path exige vínculo persistido do mesmo screen e mantém validação de device", () => {
  assert.match(app, /if \(savedTvConnection\?\.screenId\)/);
  assert.match(app, /expectedId: savedTvConnection\.screenId/);
  assert.match(app, /savedTvConnection\?\.clientId === clientId/);
  assert.match(app, /savedTvConnection\?\.deviceId === connectedDeviceId/);
});

test("BootReceiver não inicia FGS e preserva retries e broadcasts", () => {
  assert.doesNotMatch(receiver, /startForegroundService|startBootService|PlayerBootService/);
  for (const delay of ["3_000", "10_000", "25_000", "45_000"]) assert.match(receiver, new RegExp(delay));
  for (const action of ["ACTION_BOOT_COMPLETED", "ACTION_LOCKED_BOOT_COMPLETED", "ACTION_MY_PACKAGE_REPLACED", "ACTION_SCREEN_ON", "ACTION_USER_PRESENT", "ACTION_DREAMING_STOPPED", "QUICKBOOT_POWERON"]) {
    assert.match(receiver, new RegExp(action));
  }
});

test("Manifest não registra PlayerBootService nem permissão FGS", () => {
  assert.doesNotMatch(manifest, /PlayerBootService/);
  assert.doesNotMatch(manifest, /android\.permission\.FOREGROUND_SERVICE/);
});
