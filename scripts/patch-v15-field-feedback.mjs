import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [inputJs, outputJs] = process.argv.slice(2);
if (!inputJs || !outputJs) throw new Error("Usage: node patch-v15-field-feedback.mjs <input-js> <output-js>");
const expectedSha = "1C7529A82FA5831B408AAAD70295167E914166704416EE02216B1E14CB75E55D";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const original = readFileSync(inputJs);
if (hash(original) !== expectedSha) throw new Error("Unexpected v15 Player bundle SHA-256");

function replaceExact(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}

let js = original.toString("utf8");
js = replaceExact(js,
  "Me=(0,_.useRef)(null),Ne=(0,_.useRef)(Promise.resolve())",
  "Me=(0,_.useRef)(null),tpV16Feedback=(0,_.useRef)({pending:!1}),Ne=(0,_.useRef)(Promise.resolve())",
  "Visual completion ref");
js = replaceExact(js,
  ".then(t=>{if(!e)return;N(t.urlMap);let n=",
  ".then(t=>{if(!e){if(Number(t.failed||0)===0&&Number(t.downloaded||0)>0)tpV16Feedback.current.pending=!0;return}N(t.urlMap);let n=",
  "Preserve successful completion across effect replacement");
js = replaceExact(js,
  "t.failed>0){se(`partial`),Me.current=setTimeout(()=>{se(``)},5e3);return}if(Number(t.downloaded||0)<=0){se(``);return}se(`ready`),Me.current=setTimeout(()=>{se(``)},3e3)",
  "t.failed>0){tpV16Feedback.current.pending=!1,se(`partial`),Me.current=setTimeout(()=>{se(``)},5e3);return}if(Number(t.downloaded||0)<=0&&!tpV16Feedback.current.pending){se(``);return}tpV16Feedback.current.pending=!1,se(`ready`),Me.current=setTimeout(()=>{se(``)},3e3)",
  "Show success after current and queued downloads finish");
writeFileSync(outputJs, js);
process.stdout.write(JSON.stringify({ inputJsSha256: expectedSha, outputJsSha256: hash(Buffer.from(js)), changes: [
  "A completed download remains eligible for the visual success state when its effect is replaced",
  "The last queued cache pass shows success only after zero failures and no pending items",
  "Warm cache and failed cycles do not show success; existing three-second timer is retained",
] }, null, 2));
