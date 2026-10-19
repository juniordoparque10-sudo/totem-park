import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const cards = fs.readFileSync(new URL("../src/templates-v2/sports-v2/cards/SportsCards.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/templates-v2/sports-v2/sports-v2-semantic-colors.css", import.meta.url), "utf8");

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
  assert.match(css, /\.sports-v2-root \.sports-v2-score-value\{color:#37DBFF\}/);
  assert.match(css, /\.sports-v2-root \.sports-v2-points\{color:#67E8B5\}/);
  assert.match(css, /\.sports-v2-root \.sports-v2-games-played\{color:#B9ACFF\}/);
  assert.doesNotMatch(css, /\.sports-v2-standing>div>b\{[^}]*#(?:37DBFF|67E8B5|B9ACFF)/i);
});
