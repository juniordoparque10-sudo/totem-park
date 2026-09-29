import test from "node:test";
import assert from "node:assert/strict";
import { getTemplatesV2ScreenCapability, supportsTemplatesV2 } from "../src/templates-v2/player-capability.js";

test("V16 remains protected while V17 supports Templates V2", () => {
  assert.equal(supportsTemplatesV2({ telemetry:{ session:{ appVersion:"1.0.0-v16-field-release-candidate" } } }), false);
  assert.equal(supportsTemplatesV2({ telemetry:{ session:{ appVersion:"1.0.0-v17-templates-v2-rc1" } } }), true);
});

test("explicit capability takes precedence and unknown players stay protected", () => {
  assert.equal(supportsTemplatesV2({ capabilities:{ templatesV2:true }, versionCode:16 }), true);
  assert.equal(supportsTemplatesV2({}), false);
});

test("the master canary override is isolated to the selected screen", () => {
  assert.equal(supportsTemplatesV2({ id:"canary", templatesV2TestMode:true }), true);
  assert.equal(supportsTemplatesV2({ id:"production", versionCode:16 }), false);
  const result = getTemplatesV2ScreenCapability([
    { id:"canary", versionCode:16, templatesV2TestMode:true },
    { id:"production", versionCode:16 },
  ]);
  assert.deepEqual(result.blockedScreens.map((screen) => screen.id), ["production"]);
});

test("a mixed-screen playlist is blocked when any screen still lacks support", () => {
  const result = getTemplatesV2ScreenCapability([
    { id:"new", versionCode:17 },
    { id:"old", versionCode:16 },
  ]);
  assert.equal(result.allowed, false);
  assert.deepEqual(result.blockedScreens.map((screen) => screen.id), ["old"]);
});
