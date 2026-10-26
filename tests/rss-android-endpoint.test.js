import assert from "node:assert/strict";
import test from "node:test";

const endpointModule = await import("../src/rss-endpoint.js").catch(() => null);

test("Android usa o proxy RSS HTTPS permanente com a fonte configurada", () => {
  assert.equal(typeof endpointModule?.buildRssProxyUrl, "function");
  assert.equal(
    endpointModule.buildRssProxyUrl("https://g1.globo.com/rss/g1/", { native:true }),
    "https://totem-park-homologacao.vercel.app/api/rss?url=https%3A%2F%2Fg1.globo.com%2Frss%2Fg1%2F",
  );
});

test("Portal Web preserva a rota RSS relativa na mesma origem", () => {
  assert.equal(
    endpointModule.buildRssProxyUrl("https://www.cnnbrasil.com.br/feed/", { native:false }),
    "/api/rss?url=https%3A%2F%2Fwww.cnnbrasil.com.br%2Ffeed%2F",
  );
});

test("requisição RSS vazia não cria consulta ao proxy", () => {
  assert.equal(endpointModule.buildRssProxyUrl("  ", { native:true }), "");
});
