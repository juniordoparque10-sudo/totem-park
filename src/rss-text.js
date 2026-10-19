const NAMED_ENTITIES = Object.freeze({
  amp:"&", apos:"'", quot:'"', lt:"<", gt:">", nbsp:" ",
  aacute:"á", eacute:"é", iacute:"í", oacute:"ó", uacute:"ú",
  agrave:"à", egrave:"è", igrave:"ì", ograve:"ò", ugrave:"ù",
  acirc:"â", ecirc:"ê", icirc:"î", ocirc:"ô", ucirc:"û",
  atilde:"ã", otilde:"õ", ntilde:"ñ", ccedil:"ç",
  Aacute:"Á", Eacute:"É", Iacute:"Í", Oacute:"Ó", Uacute:"Ú",
  Agrave:"À", Egrave:"È", Igrave:"Ì", Ograve:"Ò", Ugrave:"Ù",
  Acirc:"Â", Ecirc:"Ê", Icirc:"Î", Ocirc:"Ô", Ucirc:"Û",
  Atilde:"Ã", Otilde:"Õ", Ntilde:"Ñ", Ccedil:"Ç",
  laquo:"«", raquo:"»", ldquo:"“", rdquo:"”", lsquo:"‘", rsquo:"’",
  ndash:"–", mdash:"—", hellip:"…", bull:"•", middot:"·", euro:"€", pound:"£", copy:"©", reg:"®",
});

function decodeEntity(match, body) {
  if (body[0] === "#") {
    const hexadecimal = body[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(body.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
    try { return String.fromCodePoint(codePoint); } catch { return match; }
  }
  return Object.hasOwn(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : match;
}

export function normalizeRssText(value) {
  let text = String(value || "").replace(/<[^>]*>/g, " ");
  for (let pass = 0; pass < 2; pass += 1) text = text.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, decodeEntity);
  return text.replace(/\s+/g, " ").trim();
}
