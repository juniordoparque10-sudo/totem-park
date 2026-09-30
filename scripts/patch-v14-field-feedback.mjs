import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [inputJs, outputJs, inputCss, outputCss] = process.argv.slice(2);
if (![inputJs, outputJs, inputCss, outputCss].every(Boolean)) {
  throw new Error("Usage: node patch-v14-field-feedback.mjs <input-js> <output-js> <input-css> <output-css>");
}

const expected = {
  js: "0EF4A671B144589C5977F4985F9FE66579EE50E444F1F4E76B9C7D1F2B31F3BD",
  css: "77391472D6D3A2A464B24488322B6CBC09511D2E8FAE63229853234DB9594BD5",
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const originalJs = readFileSync(inputJs);
const originalCss = readFileSync(inputCss);
if (hash(originalJs) !== expected.js || hash(originalCss) !== expected.css) {
  throw new Error("Unexpected v14 Player asset SHA-256");
}

function replaceExact(source, before, after, count, label) {
  const matches = source.split(before).length - 1;
  if (matches !== count) throw new Error(`${label}: expected ${count} matches, found ${matches}`);
  return source.replaceAll(before, after);
}

let js = originalJs.toString("utf8");
js = replaceExact(
  js,
  "if(localStorage.getItem(a)===`true`){se(``);return}localStorage.setItem(a,`true`),se(`ready`),Me.current=setTimeout(()=>{se(``)},4e3)",
  "if(Number(t.downloaded||0)<=0){se(``);return}se(`ready`),Me.current=setTimeout(()=>{se(``)},3e3)",
  1,
  "Show completion only after a successful download in this cycle",
);
js = replaceExact(js, "`Conteúdo disponível offline`", "`Conteúdo atualizado ✓`", 2, "Completion label");

let css = originalCss.toString("utf8");
css = replaceExact(
  css,
  ".offline-cache-status.ready{color:#86efac}",
  ".offline-cache-status.ready{color:#86efac;background:#052e24e8;border-color:#34d39966;animation:tp-content-updated 3s ease-out forwards}@keyframes tp-content-updated{0%{opacity:0;transform:translateY(5px)}12%,80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(0)}}",
  1,
  "Green completion toast and fade",
);

writeFileSync(outputJs, js);
writeFileSync(outputCss, css);
process.stdout.write(JSON.stringify({
  inputJsSha256: expected.js,
  outputJsSha256: hash(Buffer.from(js)),
  inputCssSha256: expected.css,
  outputCssSha256: hash(Buffer.from(css)),
  changes: [
    "A successful cycle shows ready only when downloaded > 0; no green toast for warm cache or failed cycle",
    "Ready label becomes Conteúdo atualizado ✓ in both Player views",
    "Ready toast is green and fades within three seconds",
  ],
}, null, 2));
