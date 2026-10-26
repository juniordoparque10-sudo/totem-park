import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { TEMPLATE_V2_REGISTRY } from "../src/templates-v2/registry.js";
import { getPlayerV2Capabilities } from "../src/templates-v2/player-capability.js";

const prohibitedTypeFragments = ["v2.1", "v2-1", "live-tv", "tv-live", "personalization"];

test("the published template registry does not expose prohibited experiments", () => {
  const registeredTypes = Object.keys(TEMPLATE_V2_REGISTRY);
  for (const fragment of prohibitedTypeFragments) {
    assert.equal(registeredTypes.some((type) => type.toLowerCase().includes(fragment)), false, fragment);
  }
});

test("player capabilities do not announce prohibited experiments", () => {
  const capabilities = JSON.stringify(getPlayerV2Capabilities()).toLowerCase();
  for (const fragment of prohibitedTypeFragments) assert.equal(capabilities.includes(fragment), false, fragment);
});

test("exclusive V2.1 shared-personalization files remain absent", () => {
  assert.equal(existsSync(new URL("../src/templates-v2/dynamic-collections/editor-state.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("./web-v2.1-hotfix.test.js", import.meta.url)), false);
});
