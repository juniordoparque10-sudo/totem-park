import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const templateCss = fs.readFileSync(new URL("../src/templates-v2/template-v2.css", import.meta.url), "utf8");

test("Player segura o ticker de Notícias na origem enquanto a camada ainda está pendente", () => {
  assert.match(
    templateCss,
    /\.player-transition-layer\.is-pending \.tpv2-news-dynamic \.tpv2-ticker-track\s*\{[^}]*animation-play-state:paused/,
  );
});

test("a pausa inicial fica restrita ao ticker dinâmico no Player", () => {
  assert.doesNotMatch(templateCss, /\.player-transition-layer\.is-pending\s+\.tpv2-ticker-track\s*\{/);
  assert.match(templateCss, /@keyframes tpv2-ticker-scroll\s*\{\s*from\s*\{\s*transform:translateX\(0\)/);
});
