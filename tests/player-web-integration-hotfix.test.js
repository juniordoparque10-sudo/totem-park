import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getAdjacentPlaylistIndex } from "../src/player-playlist-navigation.js";
import { executePlaylistNavigationCommand } from "../src/player-remote-command.js";
import { getBlackoutToggleCommand } from "../src/player-remote-capability.js";

test("navegação do Player Web respeita ordem, loop, vazio e item único", () => {
  assert.equal(getAdjacentPlaylistIndex(0, 3, "next"), 1);
  assert.equal(getAdjacentPlaylistIndex(2, 3, "next"), 0);
  assert.equal(getAdjacentPlaylistIndex(0, 3, "previous"), 2);
  assert.equal(getAdjacentPlaylistIndex(1, 3, "previous"), 0);
  assert.equal(getAdjacentPlaylistIndex(0, 1, "next"), 0);
  assert.equal(getAdjacentPlaylistIndex(0, 0, "next"), -1);
});

test("listener remoto usa os handlers mais recentes da playlist", () => {
  const calls = [];
  const navigationRef = { current:{
    previous:() => calls.push("previous-old"),
    next:() => calls.push("next-old"),
  } };
  const dispatch = (command) => executePlaylistNavigationCommand(command, navigationRef.current);

  navigationRef.current = {
    previous:() => calls.push("previous-current"),
    next:() => calls.push("next-current"),
  };

  assert.equal(dispatch({ type:"previousMedia" }), true);
  assert.equal(dispatch({ type:"nextMedia" }), true);
  assert.equal(dispatch({ type:"pause" }), false);
  assert.deepEqual(calls, ["previous-current", "next-current"]);
});

test("tela preta alterna com estado explícito somente no Player Web conectado", () => {
  const webScreen = {
    connectedDeviceId:"web-device",
    capabilities:{ platform:"WEB", deviceId:"web-device", playlistItemNavigation:true },
  };
  assert.deepEqual(getBlackoutToggleCommand(webScreen), { type:"blackout", enabled:true });
  assert.deepEqual(getBlackoutToggleCommand({ ...webScreen, lastCommandExecuted:"blackout" }), { type:"blackout", enabled:false });

  const androidScreen = { connectedDeviceId:"android-device", lastCommandExecuted:"blackout", capabilities:{ platform:"ANDROID", deviceId:"android-device" } };
  assert.deepEqual(getBlackoutToggleCommand(androidScreen), { type:"clear" });
});

test("Player Web anuncia capacidade vinculada e mantém os handlers de anterior/próxima", async () => {
  const [app, commandHandler] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/player-remote-command.js", import.meta.url), "utf8"),
  ]);
  assert.match(app, /getWebPlayerV2Capabilities\(localDeviceId\)/);
  assert.match(app, /getAndroidPlayerV2Capabilities\(localDeviceId, operationalAppInfo\)/);
  assert.match(app, /updateDoc\(screenDocRef, \{ capabilities \}\)/);
  assert.match(commandHandler, /command\?\.type === "previousMedia"/);
  assert.match(commandHandler, /command\?\.type === "nextMedia"/);
  assert.match(app, /previous:\(\) => goToPreviousMedia\("REMOTE_PREVIOUS"\)/);
  assert.match(app, /next:\(\) => goToNextMedia\("REMOTE_NEXT"\)/);
});

test("saída da TV usa modal próprio e mantém o comando original somente na confirmação", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const remoteSection = app.slice(app.indexOf("function ClientScreensPage"), app.indexOf("function getMarketingVisibility"));
  assert.doesNotMatch(remoteSection, /window\.confirm\([\s\S]*?Deseja tirar esta tela do modo TV/);
  assert.match(app, /function ExitTvConfirmationModal/);
  assert.match(app, /Deseja sair da TV\?/);
  assert.match(app, /Ao confirmar, esta tela sairá do modo TV e voltará para a seleção de modo\./);
  assert.match(app, /Confirmar saída/);
  assert.match(remoteSection, /<ExitTvConfirmationModal/);
  assert.match(remoteSection, /sendRemoteCommand\(exitTvTarget\.id, \{ type: "exitTv" \}\)/);
});

test("Conectar TV usa folha local e preserva campo funcional", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/tv-connect.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /import "\.\/tv-connect\.css"/);
  assert.match(app, /className="[^"]*tv-connect-shell[^"]*"/);
  assert.match(app, /value=\{screenCode\}/);
  assert.match(app, /autoFocus/);
  assert.match(css, /\.tv-connect-shell/);
  assert.match(css, /@media \(max-height:/);
  assert.match(css, /\.tv-connect-shell \.tv-connect-premium-card\s*\{[^}]*width:\s*min\(100%,\s*500px\)/s);
});

test("modal de saída permanece compacto e usa a ação destrutiva vermelha do Portal", async () => {
  const css = await readFile(new URL("../src/remote-control.css", import.meta.url), "utf8");
  assert.match(css, /\.remote-exit-modal\s*\{[^}]*width:\s*min\(100%,\s*440px\)/s);
  assert.match(css, /\.remote-exit-modal-actions \.confirm\s*\{[^}]*background:\s*#[a-f\d]{6}/is);
  assert.doesNotMatch(css, /\.remote-exit-modal-actions \.confirm\s*\{[^}]*linear-gradient/s);
});
