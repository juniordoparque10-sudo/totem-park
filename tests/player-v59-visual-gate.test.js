import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url));
const text = (path) => read(path).toString("utf8");
const sha256 = (path) => crypto.createHash("sha256").update(read(path)).digest("hex").toUpperCase();
const exists = (path) => fs.existsSync(new URL(path, import.meta.url));

test("V59 preserva exatamente as duas referências visuais oficiais", () => {
  assert.ok(exists("../src/assets/player-v59/loading-reference.png"), "arte oficial de carregamento ausente");
  assert.ok(exists("../src/assets/player-v59/maintenance-reference.png"), "arte oficial de manutenção ausente");
  assert.ok(exists("../android/app/src/main/res/drawable-nodpi/player_splash_v59_art.png"), "arte nativa oficial ausente");
  assert.equal(sha256("../src/assets/player-v59/loading-reference.png"), "85315A9049ACB758BB9B38E9DFCE6F6A7D01FA8C46AC38E7C35D5A3C5546CEBF");
  assert.equal(sha256("../src/assets/player-v59/maintenance-reference.png"), "2BA411CC54E571FF8EF034CB8D851980AC8C324AF97769CFF5164B1F57EE760F");
  assert.equal(sha256("../android/app/src/main/res/drawable-nodpi/player_splash_v59_art.png"), "85315A9049ACB758BB9B38E9DFCE6F6A7D01FA8C46AC38E7C35D5A3C5546CEBF");
});

test("splash nativo usa a mesma arte oficial da transição React", () => {
  const nativeSplash = text("../android/app/src/main/res/drawable/player_splash_v59.xml");
  const styles = text("../android/app/src/main/res/values/styles.xml");
  assert.match(nativeSplash, /@drawable\/player_splash_v59_art/);
  assert.match(nativeSplash, /android:gravity="fill"/);
  assert.match(styles, /android:background">@drawable\/player_splash_v59/);
});

test("splash React usa a arte oficial sem alterar o fluxo de inicialização", () => {
  assert.ok(exists("../src/player/PlayerStartupSplash.jsx"), "componente de splash V59 ausente");
  const component = text("../src/player/PlayerStartupSplash.jsx");
  const app = text("../src/App.jsx");
  assert.match(component, /loading-reference\.png/);
  assert.match(component, /player-startup-splash__artwork/);
  assert.match(component, /player-startup-splash__progress-glow/);
  assert.match(app, /import PlayerStartupSplash from "\.\/player\/PlayerStartupSplash"/);
  assert.match(app, /<PlayerStartupSplash overlay=\{overlay\} \/>/);
  assert.doesNotMatch(app, /Preparando player da TV/);
});

test("manutenção usa a arte oficial e mantém o mesmo estado funcional", () => {
  const component = text("../src/player/MaintenanceScreen.jsx");
  const css = text("../src/player/maintenance-screen.css");
  assert.match(component, /maintenance-reference\.png/);
  assert.match(component, /maintenance-screen__artwork/);
  assert.match(component, /maintenance-screen__gear-glow/);
  assert.match(component, /maintenance-screen__progress-glow/);
  assert.match(css, /@keyframes maintenance-gear-glow/);
  assert.match(css, /@keyframes maintenance-progress-glow/);
});

test("gate visual renderiza os componentes reais sem atraso de produção", () => {
  assert.ok(exists("../visual-validation-v59.html"), "página de validação V59 ausente");
  assert.ok(exists("../src/player/visual-validation-v59.jsx"), "entrada de validação V59 ausente");
  const html = text("../visual-validation-v59.html");
  const entry = text("../src/player/visual-validation-v59.jsx");
  assert.match(html, /visual-validation-v59\.jsx/);
  assert.match(entry, /<PlayerStartupSplash/);
  assert.match(entry, /<MaintenanceScreen/);
  assert.doesNotMatch(entry, /setTimeout|delay|sleep/i);
});
