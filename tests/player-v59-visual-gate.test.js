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
  assert.equal(sha256("../src/assets/player-v59/loading-reference.png"), "EFE7AFCD57392EBA65CF2F8814DC472C00498620FFB08CDE34662AEBCAE518A5");
  assert.equal(sha256("../src/assets/player-v59/maintenance-reference.png"), "A11A219E03025F80312F8461E4D5CD15D1350307C72D0B42930F1E5E9F184683");
  assert.equal(sha256("../android/app/src/main/res/drawable-nodpi/player_splash_v59_art.png"), "EFE7AFCD57392EBA65CF2F8814DC472C00498620FFB08CDE34662AEBCAE518A5");
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
  assert.match(component, /player-startup-splash__progress-track/);
  assert.match(component, /player-startup-splash__progress-fill/);
  const css = text("../src/player/player-startup-splash.css");
  assert.match(css, /animation:player-startup-progress-fill/);
  assert.match(css, /transform:scaleX\(0\)/);
  assert.match(css, /transform:scaleX\(1\)/);
  assert.doesNotMatch(component, /progress-glow/);
  assert.match(app, /import PlayerStartupSplash from "\.\/player\/PlayerStartupSplash"/);
  assert.match(app, /<PlayerStartupSplash overlay=\{overlay\} \/>/);
  assert.doesNotMatch(app, /Preparando player da TV/);
});

test("manutenção usa a arte oficial e mantém o mesmo estado funcional", () => {
  const component = text("../src/player/MaintenanceScreen.jsx");
  const css = text("../src/player/maintenance-screen.css");
  assert.match(component, /maintenance-reference\.png/);
  assert.match(component, /maintenance-screen__artwork/);
  assert.match(component, /maintenance-screen__ring/);
  assert.match(component, /maintenance-screen__gear/);
  assert.match(component, /maintenance-screen__progress-fill/);
  assert.match(css, /@keyframes maintenance-ring-rotation/);
  assert.match(css, /@keyframes maintenance-progress-fill/);
  assert.doesNotMatch(css, /@keyframes maintenance-gear/);
  assert.doesNotMatch(component, /gear-glow|progress-glow/);
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
