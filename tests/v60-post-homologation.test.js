import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("editor diferencia claramente intervalo interno da duração total", () => {
  const editor = read("../src/templates-v2/editor/TemplateV2Editor.jsx");
  const rotationControl = read("../src/templates-v2/editor/RotatingCardIntervalField.jsx");
  const newsFields = read("../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicEditorFields.jsx");
  const marketFields = read("../src/templates-v2/market-premium/MarketPremiumEditorFields.jsx");

  assert.match(editor, /Trocar notícia a cada/);
  assert.match(editor, /Trocar oferta a cada/);
  assert.match(rotationControl, /não altera a duração total da template na playlist/i);
  assert.doesNotMatch(newsFields, /Intervalo de troca das notícias/);
  assert.doesNotMatch(marketFields, /Intervalo de troca das ofertas/);
});

test("miniaturas RSS usam visibilidade sem iniciar um Player completo", () => {
  const libraryThumbnail = read("../src/templates-v2/editor/TemplateV2LibraryThumbnail.jsx");
  const editor = read("../src/templates-v2/editor/TemplateV2Editor.jsx");
  const css = read("../src/templates-v2/template-v2.css");

  assert.match(libraryThumbnail, /IntersectionObserver/);
  assert.match(libraryThumbnail, /hasTemplateV2NewsTicker/);
  assert.match(libraryThumbnail, /isVisible\s*&&\s*hasTicker/);
  assert.match(editor, /TemplateV2LibraryThumbnail/);
  assert.match(css, /tpv2-library-live-thumbnail\.is-visible[^{]*\.tpv2-ticker-track\s*\{[^}]*animation-play-state:running/);
});

test("wrapper de lazy loading não colapsa os cards da biblioteca V2", () => {
  const libraryThumbnail = read("../src/templates-v2/editor/TemplateV2LibraryThumbnail.jsx");
  const css = read("../src/templates-v2/template-v2.css");
  const editorCss = read("../src/templates-v2/editor/template-v2-editor.css");

  assert.match(libraryThumbnail, /closest\("article"\)/);
  assert.match(css, /\.tpv2-library-live-thumbnail\s*\{\s*display:contents\s*\}/);
  assert.doesNotMatch(css, /\.tpv2-library-live-thumbnail\s*\{[^}]*height:100%/);
  assert.match(editorCss, /\.tpv2-library-live-thumbnail>\.tpv2-created-thumbnail\s*\{[^}]*aspect-ratio:16\/9/);
  assert.match(editorCss, /article\.portrait \.tpv2-library-live-thumbnail>\.tpv2-created-thumbnail\s*\{[^}]*aspect-ratio:9\/16/);
});

test("manutenção cobre os elementos impressos antes de desenhar as animações únicas", () => {
  const component = read("../src/player/MaintenanceScreen.jsx");
  const css = read("../src/player/maintenance-screen.css");
  const splash = read("../src/player/PlayerStartupSplash.jsx");

  assert.match(component, /maintenance-screen__ring-cleanup/);
  assert.match(component, /maintenance-screen__progress-cleanup/);
  assert.match(css, /maintenance-screen__ring-cleanup/);
  assert.match(css, /maintenance-screen__progress-cleanup/);
  assert.match(css, /maintenance-ring-rotation/);
  assert.match(css, /maintenance-progress-fill/);
  assert.doesNotMatch(css, /@keyframes maintenance-gear/);
  assert.match(splash, /player-startup-splash__progress-fill/);
});
