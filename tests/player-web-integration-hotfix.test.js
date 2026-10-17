import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getAdjacentPlaylistIndex } from "../src/player-playlist-navigation.js";

test("navegação do Player Web respeita ordem, loop, vazio e item único", () => {
  assert.equal(getAdjacentPlaylistIndex(0, 3, "next"), 1);
  assert.equal(getAdjacentPlaylistIndex(2, 3, "next"), 0);
  assert.equal(getAdjacentPlaylistIndex(0, 3, "previous"), 2);
  assert.equal(getAdjacentPlaylistIndex(1, 3, "previous"), 0);
  assert.equal(getAdjacentPlaylistIndex(0, 1, "next"), 0);
  assert.equal(getAdjacentPlaylistIndex(0, 0, "next"), -1);
});

test("Player Web preserva heartbeat permitido e mantém os handlers de anterior/próxima", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /"capabilities\.playlistItemNavigation": !isNativeApp\(\)/);
  assert.match(app, /remoteCommand\.type === "previousMedia"/);
  assert.match(app, /remoteCommand\.type === "nextMedia"/);
  assert.match(app, /goToPreviousMedia\("REMOTE_PREVIOUS"\)/);
  assert.match(app, /goToNextMedia\("REMOTE_NEXT"\)/);
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
