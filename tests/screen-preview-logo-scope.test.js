import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const portalCss=readFileSync(new URL("../src/App.css",import.meta.url),"utf8");
const v2Css=readFileSync(new URL("../src/templates-v2/template-v2.css",import.meta.url),"utf8");

test("screen preview sizing targets only direct preview media",()=>{
  assert.doesNotMatch(portalCss,/\.screen-live-preview\s+(?:img|video)\s*[,\{]/);
  assert.doesNotMatch(portalCss,/\.media-preview\.screen-preview\s+(?:img|video)\s*[,\{]/);
  assert.match(portalCss,/\.screen-live-preview\s*>\s*\.screen-universal-preview\s*>\s*img/);
});
test("V2 logos retain proportional containment",()=>{
  assert.match(v2Css,/\.tpv2-brand img\s*\{[^}]*width:auto;[^}]*max-width:150px;[^}]*height:48px;[^}]*object-fit:contain;/s);
});
