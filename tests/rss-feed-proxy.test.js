import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRssPayload, isAllowedRssUrl, parseRssFeed } from "../src/rss-feed-parser.js";

test("parser converte RSS real em cards com imagem, resumo, fonte e data", () => {
  const xml = `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/"><channel><title>g1 &gt; RN</title><item><title><![CDATA[Manchete real]]></title><description><![CDATA[<p>Resumo da matéria</p><img src="https://cdn.example/noticia.jpg"/>]]></description><link>https://g1.globo.com/rn/noticia</link><pubDate>Tue, 20 Oct 2026 20:00:00 GMT</pubDate><media:content url="https://cdn.example/capa.jpg" /></item></channel></rss>`;
  assert.deepEqual(parseRssFeed(xml), [{
    title:"Manchete real",
    description:"Resumo da matéria",
    image:"https://cdn.example/capa.jpg",
    source:"g1 > RN",
    pubDate:"Tue, 20 Oct 2026 20:00:00 GMT",
    link:"https://g1.globo.com/rn/noticia",
  }]);
});

test("parser aceita Atom e preserva a imagem embutida no conteúdo", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Agência</title><entry><title>Atualização real</title><summary><![CDATA[Texto <img src="https://cdn.example/atom.png">]]></summary><link href="https://example.com/post"/><updated>2026-10-20T20:00:00Z</updated></entry></feed>`;
  assert.equal(parseRssFeed(xml)[0].image, "https://cdn.example/atom.png");
  assert.equal(parseRssFeed(xml)[0].link, "https://example.com/post");
});

test("proxy aceita somente HTTP público e bloqueia destinos locais", () => {
  assert.equal(isAllowedRssUrl("https://g1.globo.com/rss/g1/"), true);
  assert.equal(isAllowedRssUrl("http://localhost:8080/feed"), false);
  assert.equal(isAllowedRssUrl("http://127.0.0.1/feed"), false);
  assert.equal(isAllowedRssUrl("file:///etc/passwd"), false);
});

test("payload mantém o contrato feed.title consumido pelo Player", () => {
  const payload = createRssPayload(`<rss><channel><title>Fonte Real</title><item><title>Manchete</title></item></channel></rss>`);
  assert.equal(payload.status, "ok");
  assert.equal(payload.feed.title, "Fonte Real");
  assert.equal(payload.items[0].source, "Fonte Real");
});

test("rewrite SPA não intercepta a rota RSS server-side", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(config.rewrites[0].source, /\?!api\//);
});
