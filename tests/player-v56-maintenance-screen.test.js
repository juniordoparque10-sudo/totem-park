import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("maintenance screen implements the approved navy identity without fake progress", () => {
  const component = fs.readFileSync(new URL("../src/player/MaintenanceScreen.jsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/player/maintenance-screen.css", import.meta.url), "utf8");
  assert.match(component, /src=\{logo\}/);
  assert.match(component, /MODO DE <span>MANUTENÇÃO<\/span>/);
  assert.match(component, /Estamos aplicando ajustes e preparando sua experiência\./);
  assert.match(component, /Desenvolvido por Park Solutions/);
  assert.match(component, /maintenance-screen--\$\{orientation\}/);
  assert.doesNotMatch(component, /percent|percentage|%/i);
  assert.match(css, /@keyframes maintenance-progress/);
  assert.match(css, /linear-gradient/);
});

test("Player mounts the component only for the existing maintenance state", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /if \(maintenanceMode\) \{\s*return <MaintenanceScreen orientation=\{getPlayerOrientationClass\(\)\}/);
  assert.match(app, /if \(blackoutMode\)/);
  assert.match(app, /if \(takeoverMessage\)/);
});
