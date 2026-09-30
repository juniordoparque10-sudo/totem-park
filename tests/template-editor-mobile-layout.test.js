import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");

test("template page does not create an accidental scroll container", () => {
  assert.match(
    css,
    /\.content:has\(\.templates-library-tabs\)\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible;/s,
  );
});

test("legacy and V2 mobile previews remain sticky below navigation", () => {
  assert.match(
    css,
    /@media \(max-width:\s*760px\)[\s\S]*?\.templates-library-tabs ~ \.templates-builder-grid > \.templates-preview-panel,[\s\S]*?\.tpv2-preview-panel\s*\{[^}]*top:\s*62px;/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*1200px\)[\s\S]*?\.templates-library-tabs ~ \.templates-builder-grid > \.templates-preview-panel,[\s\S]*?\.tpv2-preview-panel\s*\{[^}]*position:\s*sticky;/,
  );
});

test("portrait preview receives a taller orientation-specific mobile frame", () => {
  assert.match(
    css,
    /\.template-scaled-preview-stage\.portrait,[\s\S]*?\.tpv2-preview-viewport\.portrait\s*\{[^}]*height:\s*clamp\(330px,\s*42vh,\s*460px\);/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*430px\)[\s\S]*?\.template-scaled-preview-stage\.portrait,[\s\S]*?\.tpv2-preview-viewport\.portrait\s*\{[^}]*height:\s*clamp\(320px,\s*41vh,\s*430px\);/,
  );
});
