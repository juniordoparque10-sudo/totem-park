export const RSS_PROXY_ORIGIN = "https://totem-park-homologacao.vercel.app";

export function buildRssProxyUrl(feedUrl, { native = false } = {}) {
  const normalizedFeedUrl = String(feedUrl || "").trim();
  if (!normalizedFeedUrl) return "";
  const endpoint = native ? `${RSS_PROXY_ORIGIN}/api/rss` : "/api/rss";
  return `${endpoint}?url=${encodeURIComponent(normalizedFeedUrl)}`;
}
