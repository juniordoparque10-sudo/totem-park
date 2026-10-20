function realItems(value) {
  return (Array.isArray(value) ? value : []).filter((item) => String(item?.title || "").trim());
}

export function selectRealNewsState({ cached = [], fetched } = {}) {
  const next = realItems(fetched);
  if (next.length) return next;
  return realItems(cached);
}
