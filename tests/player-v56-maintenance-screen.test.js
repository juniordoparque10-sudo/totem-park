import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("maintenance screen renders the approved official artwork without fake progress", () => {
  const component = fs.readFileSync(new URL("../src/player/MaintenanceScreen.jsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/player/maintenance-screen.css", import.meta.url), "utf8");
  assert.match(component, /src=\{maintenanceArtwork\}/);
  assert.match(component, /MODO DE MANUTENÇÃO/);
  assert.match(component, /Estamos aplicando ajustes e preparando sua experiência\./);
  assert.match(component, /Desenvolvido por Park Solutions/);
  assert.match(component, /maintenance-screen--\$\{orientation\}/);
  assert.doesNotMatch(component, /percent|percentage|%/i);
  assert.match(css, /@keyframes maintenance-progress-fill/);
  assert.match(css, /@keyframes maintenance-ring-rotation/);
  assert.doesNotMatch(css, /@keyframes maintenance-gear/);
  assert.match(css, /object-fit:\s*cover/);
});

test("Player mounts the component only for the existing maintenance state", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /if \(maintenanceMode\) \{\s*return <MaintenanceScreen orientation=\{getPlayerOrientationClass\(\)\}/);
  assert.match(app, /if \(blackoutMode\)/);
  assert.match(app, /if \(takeoverMessage\)/);
});

test("maintenance uses one rotatable canvas so 9:16 preserves the approved 16:9 composition", () => {
  const component = fs.readFileSync(new URL("../src/player/MaintenanceScreen.jsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/player/maintenance-screen.css", import.meta.url), "utf8");
  assert.match(component, /maintenance-screen__canvas/);
  assert.match(css, /\.maintenance-screen__canvas\{[^}]*position:absolute[^}]*width:100%[^}]*height:100%/);
  assert.match(css, /\.maintenance-screen--portrait-mode \.maintenance-screen__canvas\{[^}]*width:100vh[^}]*height:100vw[^}]*rotate\(90deg\)/);
  assert.match(css, /\.maintenance-screen--landscape-mode \.maintenance-screen__canvas/);
});
