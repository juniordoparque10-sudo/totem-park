import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRssPayload, decodeRssBytes, isAllowedRssUrl, parseRssFeed } from "../src/rss-feed-parser.js";

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

test("decodificação respeita ISO-8859-1 declarado sem introduzir caractere de substituição", () => {
  const bytes = Uint8Array.from(Buffer.from(`<?xml version="1.0" encoding="ISO-8859-1"?><rss><channel><title>Notícias</title><item><title>Ação em João Câmara</title></item></channel></rss>`, "latin1"));
  const xml = decodeRssBytes(bytes, "application/rss+xml; charset=ISO-8859-1");
  assert.match(xml, /Notícias/);
  assert.match(xml, /Ação em João Câmara/);
  assert.doesNotMatch(xml, /�/);
});

test("decodificação usa a declaração XML quando o servidor omite charset", () => {
  const beforeDash = Buffer.from(`<?xml version="1.0" encoding="windows-1252"?><rss><channel><title>Educação `, "latin1");
  const afterDash = Buffer.from(` RN</title></channel></rss>`, "latin1");
  const bytes = Uint8Array.from(Buffer.concat([beforeDash, Buffer.from([0x97]), afterDash]));
  assert.equal(decodeRssBytes(bytes), `<?xml version="1.0" encoding="windows-1252"?><rss><channel><title>Educação — RN</title></channel></rss>`);
});

test("rewrite SPA não intercepta a rota RSS server-side", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(config.rewrites[0].source, /\?!api\//);
});
