import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRssText } from "../src/rss-text.js";
import { normalizeDynamicNewsItems } from "../src/templates-v2/news-editorial-dynamic/data.js";

test("normaliza entidades RSS nomeadas, decimais e hexadecimais como texto", () => {
  assert.equal(
    normalizeRssText("A&amp;B &quot;ação&quot; &#39;RN&#39; &#x1F4F0; &ccedil;"),
    "A&B \"ação\" 'RN' 📰 ç",
  );
});

test("remove marcação RSS sem produzir HTML executável", () => {
  assert.equal(normalizeRssText("<script>alert(1)</script><b>Notícia &amp; análise</b>"), "alert(1) Notícia & análise");
});

test("normalização dinâmica compartilha a correção de entidades", () => {
  const [item] = normalizeDynamicNewsItems([{ title:"Justi&ccedil;a &amp; cidadania", description:"Decis&#227;o &quot;final&quot;", source:"G1 &amp; RN" }]);
  assert.equal(item.title, "Justiça & cidadania");
  assert.equal(item.summary, "Decisão \"final\"");
  assert.equal(item.source, "G1 & RN");
});
