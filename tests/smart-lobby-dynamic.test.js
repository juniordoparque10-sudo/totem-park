import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getSmartLobbyOverlayAlpha, getSmartLobbyPanelAlpha, normalizeSmartLobbyConfig } from "../src/templates-v2/smart-lobby/config.js";
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

test("Smart Lobby interpreta transparência como inverso da opacidade dos cards", () => {
  assert.equal(getSmartLobbyPanelAlpha({ style:{ panelTransparency:0 } }), 1);
  assert.equal(getSmartLobbyPanelAlpha({ style:{ panelTransparency:75 } }), 0.25);
  assert.equal(getSmartLobbyPanelAlpha({ style:{ panelTransparency:100 } }), 0);
  const renderer = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/CollectionRenderer.jsx",import.meta.url),"utf8");
  assert.match(renderer, /--tpv2-panel-alpha/);
});

test("Smart Lobby mantém overlay da imagem independente da transparência dos cards", () => {
  assert.equal(getSmartLobbyOverlayAlpha({ style:{ overlayOpacity:0, panelTransparency:75 } }), 0);
  assert.equal(getSmartLobbyOverlayAlpha({ style:{ overlayOpacity:50, panelTransparency:75 } }), 0.5);
  assert.equal(getSmartLobbyOverlayAlpha({ style:{ overlayOpacity:100, panelTransparency:75 } }), 1);
  assert.equal(getSmartLobbyOverlayAlpha({ style:{ overlayOpacity:125 } }), 1);
});

test("Smart Lobby normaliza fontes independentes entre 80% e 140% sem alterar templates existentes", () => {
  assert.deepEqual(normalizeSmartLobbyConfig({}).typography, { titleScale:100, primaryTextScale:100, secondaryTextScale:100 });
  assert.deepEqual(normalizeSmartLobbyConfig({ typography:{ titleScale:77, primaryTextScale:143, secondaryTextScale:113 } }).typography, { titleScale:80, primaryTextScale:140, secondaryTextScale:115 });
  const draft = createTemplateV2Draft(SMART_LOBBY_TYPE, { smartLobby:{ typography:{ titleScale:125, primaryTextScale:90, secondaryTextScale:135 } } });
  assert.deepEqual(draft.smartLobby.typography, { titleScale:125, primaryTextScale:90, secondaryTextScale:135 });
});

test("Smart Lobby compartilha controles e escalas entre preview e Player sem acoplar transparência", () => {
  const editor = fs.readFileSync(new URL("../src/templates-v2/smart-lobby/SmartLobbyEditorFields.jsx",import.meta.url),"utf8");
  const renderer = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/CollectionRenderer.jsx",import.meta.url),"utf8");
  const css = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/collection-renderer.css",import.meta.url),"utf8");
  assert.match(editor, /min="80" max="140" step="5"/);
  assert.match(editor, /Títulos dos cards/);
  assert.match(editor, /Descrição principal/);
  assert.match(editor, /Textos secundários/);
  assert.match(renderer, /--smart-lobby-title-scale/);
  assert.match(css, /var\(--smart-lobby-h2-fluid,4\.4cqw\)/);
  assert.match(css, /var\(--smart-lobby-primary-fluid,1\.35cqw\)/);
  assert.match(css, /var\(--smart-lobby-secondary-fluid,\.9cqw\)/);
  assert.match(css, /background:rgba\(5,18,36,var\(--tpv2-panel-alpha,.86\)\)/);
});

test("Smart Lobby aplica a escala configurada também aos textos médios e longos", () => {
  const css = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/collection-renderer.css",import.meta.url),"utf8");
  const renderer = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/CollectionRenderer.jsx",import.meta.url),"utf8");
  assert.match(css, /featured p\.copy-medium\{font-size:var\(--smart-lobby-primary-medium-landscape\)/);
  assert.match(css, /featured p\.copy-long\{font-size:var\(--smart-lobby-primary-long-landscape\)/);
  assert.match(css, /secondary p\.copy-medium\{font-size:var\(--smart-lobby-secondary-medium-landscape\)/);
  assert.match(css, /secondary p\.copy-long\{font-size:var\(--smart-lobby-secondary-long-landscape\)/);
  assert.match(css, /is-portrait \.featured p\.copy-medium\{font-size:var\(--smart-lobby-primary-medium-portrait\)/);
  assert.match(css, /is-portrait \.secondary p\.copy-long\{font-size:var\(--smart-lobby-secondary-long-portrait\)/);
  assert.match(renderer, /--smart-lobby-primary-medium-landscape/);
  assert.match(renderer, /--smart-lobby-secondary-long-portrait/);
});

test("miniatura Smart Lobby preserva o mesmo palco lógico e tipografia da prévia", () => {
  const libraryThumbnail = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2LibraryThumbnail.jsx",import.meta.url),"utf8");
  const scaledV2Stage = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2ScaledStage.jsx",import.meta.url),"utf8");
  const scaledStage = fs.readFileSync(new URL("../src/TemplateScaledStage.jsx",import.meta.url),"utf8");
  assert.doesNotMatch(libraryThumbnail, /compositeBeforeScale/);
  assert.doesNotMatch(scaledV2Stage, /compositeBeforeScale/);
  assert.doesNotMatch(scaledStage, /\bzoom:/);
  assert.match(scaledStage, /transform:\s*`scale\(\$\{geometry\.scale\}\)`/);
});

test("catálogo não sobrescreve a transparência dos cards internos da Smart Lobby", () => {
  const editorCss = fs.readFileSync(new URL("../src/templates-v2/editor/template-v2-editor.css",import.meta.url),"utf8");
  assert.match(editorCss, /\.tpv2-published-strip \.tpv2-collection-smart-lobby article\{[^}]*background:rgba\(5,18,36,var\(--tpv2-panel-alpha,\.86\)\)/);
  assert.match(editorCss, /\.tpv2-published-strip \.tpv2-collection-smart-lobby article\{[^}]*border:1px solid color-mix\(in srgb,var\(--tpv2-primary\) 65%,transparent\)/);
});
