import test from "node:test";
import assert from "node:assert/strict";
import { getMarketPremiumAppearance } from "../src/templates-v2/market-premium/config.js";

test("Mercado Premium converte transparencia do painel em alpha visivel", () => {
  assert.deepEqual(getMarketPremiumAppearance({ style:{ overlayOpacity:23, panelTransparency:0 } }), {
    overlayAlpha:0.23,
    panelAlpha:1,
  });
  assert.deepEqual(getMarketPremiumAppearance({ style:{ overlayOpacity:23, panelTransparency:50 } }), {
    overlayAlpha:0.23,
    panelAlpha:0.5,
  });
  assert.deepEqual(getMarketPremiumAppearance({ style:{ overlayOpacity:23, panelTransparency:100 } }), {
    overlayAlpha:0.23,
    panelAlpha:0,
  });
});
