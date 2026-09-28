import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node patch-v13-field-overlay.mjs <input> <output>");

const expectedHash = "709BA00A7DC29932AB917EA4617829D9C2E6548BA9232490A5173CE373CF95C0";
const hash = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const original = readFileSync(input);
if (hash(original) !== expectedHash) throw new Error("Unexpected v13 Player bundle SHA-256");

const needle = ",(0,I.jsx)(`button`,{className:`player-lab-badge`,onClick:()=>n(`/diagnostico-rc`),children:`RC · Diagnóstico`})";
const text = original.toString("utf8");
if (text.split(needle).length !== 2) throw new Error("Expected exactly one RC overlay button");
const patched = text.replace(needle, "");
if (patched.includes("player-lab-badge")) throw new Error("RC overlay remains in bundle");
writeFileSync(output, patched);
process.stdout.write(JSON.stringify({ inputSha256: hash(original), outputSha256: hash(Buffer.from(patched)), changes: [{ description: "Remove RC diagnostic overlay button", matches: 1 }] }, null, 2));
