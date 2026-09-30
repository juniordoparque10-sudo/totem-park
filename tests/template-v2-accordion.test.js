import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");

test("V2 accordion state is independent from editorDraft", () => {
  assert.match(source, /const \[openSections, setOpenSections\] = useState\(/);
  assert.match(source, /setOpenSections\(\(current\) => \(\{ \.\.\.current, \[sectionId\]: !current\[sectionId\] \}\)\)/);
  assert.doesNotMatch(source, /function Section\([^)]*initialOpen/);
});

test("dynamic data section has a stable identity and controlled open state", () => {
  assert.match(source, /sectionId="dynamicData"/);
  assert.match(source, /title="Dados dinâmicos" open=\{openSections\.dynamicData\} onToggle=\{toggleSection\}/);
  assert.match(source, /<QRCodeConfigurator[^>]*onChange=\{\(value\) => draftState\.update\("modules\.qrCode", value\)\}/);
  assert.match(source, /<div hidden=\{!open\}>\{children\}<\/div>/);
});
