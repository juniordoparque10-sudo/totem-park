function stableNewsId(item = {}) {
  const link = String(item.link || item.url || "").trim().toLowerCase();
  if (link) return link.replace(/[#?].*$/, "");
  return `${String(item.title || "").trim().toLowerCase()}|${String(item.date || item.publishedAt || "")}`;
}

export function normalizeDynamicNewsItems(items = []) {
  const seen = new Set();
  const normalized = [];
  for (const item of items.flat()) {
    const title = String(item?.title || "").trim();
    if (!title) continue;
    const id = stableNewsId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push({ id, title, summary: String(item.summary || item.description || "").trim(), image: item.image || item.imageUrl || "", source: String(item.source || item.sourceName || "").trim(), date: item.date || item.publishedAt || item.pubDate || null, link: item.link || item.url || "" });
    if (normalized.length === 24) break;
  }
  return normalized;
}

export async function loadDynamicNews(sources = [], fetchSource) {
  const results = await Promise.allSettled(sources.filter(Boolean).map((source) => fetchSource(source)));
  return normalizeDynamicNewsItems(results.filter((result) => result.status === "fulfilled").flatMap((result) => result.value || []));
}
