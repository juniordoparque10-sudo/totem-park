import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("mode diagnóstico fica preso ao BASIC V5 e ao Firebase Emulator aprovado", () => {
  const env = read("../.env.playerBasicDiag");
  assert.match(env, /^VITE_APP_MODE=playerRc$/m);
  assert.match(env, /^VITE_BASIC_V5_DIAG=true$/m);
  assert.match(env, /^VITE_USE_FIREBASE_EMULATORS=true$/m);
  assert.match(env, /^VITE_EMULATOR_HOST=10\.0\.2\.2$/m);
  assert.match(env, /^VITE_EMULATOR_PROJECT_ID=demo-totem-basic-hom$/m);
});

test("flavor diagnóstico usa pacote próprio sem alterar flavors aprovados", () => {
  const gradle = read("../android/app/build.gradle");
  const manifest = read("../android/app/src/playerBasicDiag/AndroidManifest.xml");
  assert.match(gradle, /playerBasicDiag\s*\{[\s\S]*applicationIdSuffix "\.player\.basicv5diag"[\s\S]*versionName "1\.0\.0-basic-v5-diagnostic"/);
  assert.match(manifest, /android:name="\.BootReceiver"[\s\S]*tools:node="remove"/);
  assert.match(gradle, /playerRc\s*\{[\s\S]*versionCode 73/);
  assert.match(gradle, /playerBasicMedicao\s*\{[\s\S]*applicationIdSuffix "\.player\.basicmedicao"/);
});

test("Vite rejeita configuração diagnóstica fora do projeto e host aprovados", () => {
  const vite = read("../vite.config.js");
  assert.match(vite, /mode === ['"]playerBasicDiag['"]/);
  assert.match(vite, /VITE_BASIC_V5_DIAG/);
  assert.match(vite, /demo-totem-basic-hom/);
  assert.match(vite, /10\.0\.2\.2/);
});

test("heartbeat diagnóstico observa o gate e a mesma escrita sem escrita adicional", () => {
  const app = read("../src/App.jsx");
  const start = app.indexOf("async function sendHeartbeat()");
  const end = app.indexOf("const heartbeatController", start);
  const heartbeat = app.slice(start, end > start ? end : start + 12000);

  assert.match(app, /VITE_BASIC_V5_DIAG/);
  assert.match(heartbeat, /getBasicBindingConditions/);
  assert.match(heartbeat, /getHeartbeatKeySummary/);
  assert.match(heartbeat, /heartbeat_write_success/);
  assert.match(heartbeat, /heartbeat_write_error/);
  assert.equal((heartbeat.match(/updateDoc\(screenDocRef, heartbeatPayload\)/g) || []).length, 1);
});

test("scripts de build expõem somente a variante diagnóstica solicitada", () => {
  const pkg = JSON.parse(read("../package.json"));
  assert.equal(pkg.scripts["build:player-basic-diag"], "vite build --mode playerBasicDiag --outDir dist-player-basic-diag");
  assert.equal(pkg.scripts["prepare:player-basic-diag"], "node scripts/prepare-player-basic-diag-assets.mjs");
});
