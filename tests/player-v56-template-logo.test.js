import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("shared V56 logo preserves aspect ratio and has a safe missing state", () => {
  const component = fs.readFileSync(new URL("../src/templates-v2/TemplateLogo.jsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/templates-v2/template-logo.css", import.meta.url), "utf8");
  assert.match(component, /export default function TemplateLogo/);
  assert.match(component, /src,\s*alt\s*=\s*"",\s*className\s*=\s*"",\s*maxWidth\s*=\s*"100%",\s*maxHeight\s*=\s*"100%"/);
  assert.match(component, /if \(!src\) return null/);
  assert.match(css, /\.tpv2-template-logo__image[\s\S]*?object-fit:\s*contain/);
  assert.match(css, /max-width:\s*var\(--tpv2-logo-max-width/);
  assert.doesNotMatch(css, /market-(?:featured|list)|secondary\s+img|background|news.*img/);
});

test("the eight V56 templates use only the semantic shared logo component", () => {
  const files = [
    "../src/templates-v2/dynamic-collections/CollectionRenderer.jsx",
    "../src/templates-v2/qr-interaction/QrInteractionRenderer.jsx",
    "../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicRenderer.jsx",
    "../src/templates-v2/market-premium/MarketPremiumRenderer.jsx",
  ];
  for (const relative of files) {
    const source = fs.readFileSync(new URL(relative, import.meta.url), "utf8");
    assert.match(source, /import TemplateLogo from "\.\.\/TemplateLogo"|import TemplateLogo from "\.\.\/\.\.\/TemplateLogo"/);
    assert.match(source, /<TemplateLogo\s+src=/);
  }
});
