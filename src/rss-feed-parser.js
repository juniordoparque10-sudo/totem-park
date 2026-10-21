const decodeXml = (value = "") => String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&gt;/g, ">")
  .replace(/&lt;/g, "<")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&amp;/g, "&");

const firstTag = (xml, names) => {
  for (const name of names) {
    const match = String(xml).match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1]).trim();
  }
  return "";
};

const attribute = (xml, tagNames, name) => {
  for (const tagName of tagNames) {
    const match = String(xml).match(new RegExp(`<${tagName}\\b[^>]*\\b${name}=["']([^"']+)["'][^>]*>`, "i"));
    if (match) return decodeXml(match[1]).trim();
  }
  return "";
};

const stripMarkup = (value = "") => decodeXml(value)
  .replace(/<img\b[^>]*>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function imageFrom(value = "") {
  return attribute(value, ["media:content", "media:thumbnail", "enclosure"], "url")
    || attribute(value, ["img"], "src");
}

export function parseRssFeed(xml = "") {
  const source = stripMarkup(firstTag(xml, ["title"])) || "Notícias";
  const blocks = String(xml).match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return blocks.slice(0, 12).map((block) => {
    const descriptionHtml = firstTag(block, ["description", "content:encoded", "content", "summary"]);
    return {
      title:stripMarkup(firstTag(block, ["title"])),
      description:stripMarkup(descriptionHtml).slice(0, 160),
      image:imageFrom(block) || imageFrom(descriptionHtml),
      source,
      pubDate:stripMarkup(firstTag(block, ["pubDate", "published", "updated"])),
      link:stripMarkup(firstTag(block, ["link"])) || attribute(block, ["link"], "href"),
    };
  }).filter((item) => item.title);
}

export function createRssPayload(xml = "") {
  const items = parseRssFeed(xml);
  return { status:"ok", feed:{ title:items[0]?.source || "Notícias" }, items };
}

export function isAllowedRssUrl(value = "") {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "::1" || host.endsWith(".local")) return false;
    if (/^(?:127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)) return false;
    const private172 = host.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}
