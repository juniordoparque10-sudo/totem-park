import assert from "node:assert/strict";
import test from "node:test";

const parserModule = await import("../services/rss-proxy/src/rss-feed-parser.js").catch(() => null);
const handlerModule = await import("../services/rss-proxy/api/rss.js").catch(() => null);

test("serviço isolado preserva o contrato RSS aprovado", () => {
  assert.equal(typeof parserModule?.createRssPayload, "function");
  const xml = `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Fonte Real</title><item><title>Manchete real</title><description><![CDATA[Resumo <img src="https://cdn.example/noticia.jpg">]]></description><link>https://example.com/noticia</link><pubDate>Wed, 21 Oct 2026 12:00:00 GMT</pubDate><media:content url="https://cdn.example/capa.jpg" /></item></channel></rss>`;
  assert.deepEqual(parserModule.createRssPayload(xml), {
    status:"ok",
    feed:{ title:"Fonte Real" },
    items:[{
      title:"Manchete real",
      description:"Resumo",
      image:"https://cdn.example/capa.jpg",
      source:"Fonte Real",
      pubDate:"Wed, 21 Oct 2026 12:00:00 GMT",
      link:"https://example.com/noticia",
    }],
  });
});

test("serviço isolado preserva a proteção SSRF", () => {
  assert.equal(parserModule.isAllowedRssUrl("https://g1.globo.com/rss/g1/"), true);
  assert.equal(parserModule.isAllowedRssUrl("http://localhost/feed"), false);
  assert.equal(parserModule.isAllowedRssUrl("http://127.0.0.1/feed"), false);
  assert.equal(parserModule.isAllowedRssUrl("http://169.254.169.254/latest/meta-data"), false);
  assert.equal(parserModule.isAllowedRssUrl("file:///etc/passwd"), false);
});

test("handler isolado entrega JSON cacheável sem autenticação própria", async () => {
  assert.equal(typeof handlerModule?.default, "function");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok:true,
    text:async () => `<rss><channel><title>Fonte</title><item><title>Notícia</title><enclosure url="https://cdn.example/image.jpg" /></item></channel></rss>`,
  });
  const result = { statusCode:null, headers:{}, payload:null };
  const response = {
    setHeader(name, value) { result.headers[name] = value; },
    status(code) { result.statusCode = code; return this; },
    json(payload) { result.payload = payload; return this; },
  };
  try {
    await handlerModule.default({ query:{ url:"https://example.com/feed.xml" } }, response);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(result.statusCode, 200);
  assert.equal(result.headers["Cache-Control"], "public, s-maxage=300, stale-while-revalidate=600");
  assert.equal(result.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(result.payload.status, "ok");
  assert.equal(result.payload.items[0].image, "https://cdn.example/image.jpg");
});
