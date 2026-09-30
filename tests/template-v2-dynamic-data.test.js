import test from "node:test";
import assert from "node:assert/strict";
import { getTemplateV2DynamicDataKey, hasTemplateV2DynamicModules } from "../src/templates-v2/dynamic-data.js";

test("weather cache key preserves city and five-day configuration", () => {
  const config = { modules:{ weather:{ enabled:true, city:"João Câmara/RN", forecastDays:5 }, news:{ enabled:false } } };
  assert.match(getTemplateV2DynamicDataKey(config), /João Câmara\/RN/);
  assert.match(getTemplateV2DynamicDataKey(config), /"days":5/);
  assert.equal(hasTemplateV2DynamicModules(config), true);
});

test("static templates do not start a dynamic-data request", () => {
  assert.equal(hasTemplateV2DynamicModules({ modules:{} }), false);
});
