const ALL_FOOTBALL_MODULES = Object.freeze(["results", "upcoming", "standings"]);

export function getSportsV2LayoutPolicy({ count = 1, type = "football", index = 0 } = {}) {
  const total = Math.max(1, Math.min(4, Number(count) || 1));
  const featured = type === "football" ? true : index === 0;
  if (total === 1) {
    return { density:"detailed", featured, visibleModules:[...ALL_FOOTBALL_MODULES], eventLimit:5, standingsLimit:8 };
  }
  const visibleModules = type === "football" && total === 4
    ? ["results", "upcoming"]
    : [...ALL_FOOTBALL_MODULES];
  return { density:"compact", featured, visibleModules, eventLimit:2, standingsLimit:type === "football" && total === 4 ? 0 : 4 };
}
