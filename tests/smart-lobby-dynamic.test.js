import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeSmartLobbyConfig } from "../src/templates-v2/smart-lobby/config.js";
import { createTemplateV2Draft, SMART_LOBBY_TYPE } from "../src/templates-v2/schema.js";

test("Smart Lobby normaliza cards rotativos e preserva validade", () => {
  const config = normalizeSmartLobbyConfig({ layout:"B", secondarySlots:2, items:[{ id:"a",title:" Atendimento ",subtitle:"Recepção",active:true,startsAt:"2026-10-15T10:00:00Z" }] });
  assert.equal(config.layout,"B");
  assert.equal(config.secondarySlots,2);
  assert.equal(config.items[0].title,"Atendimento");
  assert.equal(config.items[0].source,"manual");
});

test("Smart Lobby persiste configuração e renderer usa orientação/rotação", () => {
  const draft = createTemplateV2Draft(SMART_LOBBY_TYPE,{ smartLobby:{ layout:"B",items:[{id:"a",title:"Aviso"}] } });
  assert.equal(draft.smartLobby.layout,"B");
  assert.equal(draft.smartLobby.items[0].title,"Aviso");
  const renderer = fs.readFileSync(new URL("../src/templates-v2/smart-lobby/SmartLobbyRenderer.jsx",import.meta.url),"utf8");
  const shared = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/CollectionRenderer.jsx",import.meta.url),"utf8");
  assert.match(renderer,/CollectionRenderer/);
  assert.match(shared,/useDynamicRotation/);
  assert.match(shared,/is-portrait/);
  assert.match(shared,/secondary/);
});

test("Smart Lobby expõe e persiste intervalo único entre 5 e 60 segundos", () => {
  assert.equal(normalizeSmartLobbyConfig({ rotation:{ intervalSeconds:2 } }).rotation.intervalSeconds, 5);
  assert.equal(normalizeSmartLobbyConfig({ rotation:{ intervalSeconds:90 } }).rotation.intervalSeconds, 60);
  const draft = createTemplateV2Draft(SMART_LOBBY_TYPE, { smartLobby:{ rotation:{ intervalSeconds:15 } } });
  assert.equal(draft.smartLobby.rotation.intervalSeconds, 15);
  const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
  assert.match(editor, /SMART_LOBBY_TYPE[^\n]*RotatingCardIntervalField[^\n]*Trocar card\/serviço a cada/);
});
