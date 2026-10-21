import { createRssPayload, isAllowedRssUrl } from "../src/rss-feed-parser.js";

export default async function handler(request, response) {
  const feedUrl = Array.isArray(request.query?.url) ? request.query.url[0] : request.query?.url;
  if (!isAllowedRssUrl(feedUrl)) return response.status(400).json({ status:"error", message:"Feed inválido" });
  try {
    const upstream = await fetch(feedUrl, { headers:{ "user-agent":"TotemPark-RSS/1.0" }, signal:AbortSignal.timeout(8000) });
    if (!upstream.ok) return response.status(502).json({ status:"error", message:`RSS HTTP ${upstream.status}` });
    const xml = await upstream.text();
    const payload = createRssPayload(xml);
    if (!payload.items.length) return response.status(502).json({ status:"error", message:"RSS sem notícias válidas" });
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return response.status(200).json(payload);
  } catch {
    return response.status(502).json({ status:"error", message:"RSS temporariamente indisponível" });
  }
}
