import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SPORTS_V2_SEMANTIC_COLOR_DEFAULTS, normalizeSportsV2Config } from "../src/templates-v2/sports-v2/config.js";

const cards = fs.readFileSync(new URL("../src/templates-v2/sports-v2/cards/SportsCards.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/templates-v2/sports-v2/sports-v2-semantic-colors.css", import.meta.url), "utf8");
const editor = fs.readFileSync(new URL("../src/templates-v2/sports-v2/SportsV2EditorFields.jsx", import.meta.url), "utf8");
const renderer = fs.readFileSync(new URL("../src/templates-v2/sports-v2/SportsPremiumRenderer.jsx", import.meta.url), "utf8");

test("placares finais recebem classe semântica sem alterar nomes das equipes", () => {
  assert.match(cards, /sports-v2-score-value/);
  assert.match(cards, /event\.status==="final"\?"sports-v2-score-value"/);
  assert.doesNotMatch(cards, /sports-v2-identity[^\n]*sports-v2-score-value/);
  assert.match(cards, /!featured\.startTime&&featured\.score\?\.summary\?"sports-v2-score-value"/);
});

test("classificação separa semanticamente jogos e pontos", () => {
  assert.match(cards, /className="sports-v2-games-played"[^>]*>\{row\.played\} jogos/);
  assert.match(cards, /className="sports-v2-points"[^>]*>\{row\.points\} pts/);
});

test("cores aprovadas ficam restritas às classes da template esportiva", () => {
  assert.match(css, /\.sports-v2-root \.sports-v2-score-value\{color:var\(--sports-v2-score-color\)\}/);
  assert.match(css, /\.sports-v2-root \.sports-v2-points\{color:var\(--sports-v2-points-color\)\}/);
  assert.match(css, /\.sports-v2-root \.sports-v2-games-played\{color:var\(--sports-v2-played-color\)\}/);
  assert.doesNotMatch(css, /\.sports-v2-standing>div>b\{[^}]*#(?:37DBFF|67E8B5|B9ACFF)/i);
  assert.ok(css.split("\n").filter(Boolean).every((rule) => rule.startsWith(".sports-v2-root ")));
});

test("templates antigas recebem as três cores semânticas padrão", () => {
  assert.deepEqual(SPORTS_V2_SEMANTIC_COLOR_DEFAULTS, {
    score: "#37DBFF",
    points: "#67E8B5",
    played: "#B9ACFF",
  });
  assert.deepEqual(normalizeSportsV2Config({}).semanticColors, SPORTS_V2_SEMANTIC_COLOR_DEFAULTS);
});

test("cores personalizadas permanecem independentes após normalização", () => {
  const custom = normalizeSportsV2Config({ semanticColors: { score: "#112233", points: "#445566", played: "#778899" } });
  assert.deepEqual(custom.semanticColors, { score: "#112233", points: "#445566", played: "#778899" });
});

test("editor oferece controles e restauração exclusivos das cores esportivas", () => {
  assert.match(editor, /Cores dos dados esportivos/);
  assert.match(editor, /Resultados e placares/);
  assert.match(editor, /Pontos da classificação/);
  assert.match(editor, /Jogos disputados/);
  assert.match(editor, /Restaurar cores padrão/);
  assert.match(editor, /SPORTS_V2_SEMANTIC_COLOR_DEFAULTS/);
});

test("renderer publica as três escolhas como variáveis locais", () => {
  assert.match(renderer, /--sports-v2-score-color/);
  assert.match(renderer, /--sports-v2-points-color/);
  assert.match(renderer, /--sports-v2-played-color/);
});
