import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getPlayerV2Capabilities } from "../src/templates-v2/player-capability.js";
import { getTemplateV2Definition } from "../src/templates-v2/registry.js";

const expectedTypes = [
  "smart-lobby",
  "agenda-info",
  "promotion-campaign",
  "digital-menu",
  "kpi-indicators",
  "qr-interaction",
  "news-editorial-dynamic",
  "market-premium",
];

test("V56 advertises exactly the eight consolidated dynamic template types", () => {
  const capabilities = getPlayerV2Capabilities();
  assert.deepEqual(capabilities.dynamicTemplateTypes, expectedTypes);
  for (const type of expectedTypes) {
    const definition = getTemplateV2Definition(type);
    assert.ok(definition, type);
    assert.deepEqual(definition.orientations, ["Paisagem", "Retrato"]);
  }
});

test("legacy News Editorial remains stored but is not silently converted or newly creatable", () => {
  assert.equal(getTemplateV2Definition("news-editorial")?.creatable, false);
  assert.equal(getTemplateV2Definition("news-editorial-dynamic")?.creatable, true);
});

test("all eight types share the Player renderer and receive the effective playlist duration", () => {
  const renderer = fs.readFileSync(new URL("../src/templates-v2/TemplateV2Renderer.jsx", import.meta.url), "utf8");
  for (const symbol of ["SMART_LOBBY_TYPE", "AGENDA_INFO_TYPE", "PROMOTION_CAMPAIGN_TYPE", "DIGITAL_MENU_TYPE", "KPI_INDICATORS_TYPE", "QR_INTERACTION_TYPE", "NEWS_EDITORIAL_DYNAMIC_TYPE", "MARKET_PREMIUM_TYPE"]) {
    assert.match(renderer, new RegExp(`type === ${symbol}`), symbol);
  }
  assert.match(renderer, /effectiveDurationSeconds/);
});
