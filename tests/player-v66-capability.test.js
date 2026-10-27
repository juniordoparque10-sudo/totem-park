import test from "node:test";
import assert from "node:assert/strict";

import {
  getAndroidPlayerV2Capabilities,
  V58_EXPERIMENTAL_PACKAGE,
} from "../src/templates-v2/player-capability.js";
import {
  supportsDynamicTemplatesV2,
  V58_CANARY_CLIENT_ID,
  V58_CANARY_SCREEN_ID,
} from "../src/templates-v2/playlist-capability.js";

function boundCanary(versionCode) {
  const deviceId = "device-v66";
  return {
    id: V58_CANARY_SCREEN_ID,
    clientId: V58_CANARY_CLIENT_ID,
    connectedDeviceId: deviceId,
    templatesV2TestMode: true,
    capabilities: getAndroidPlayerV2Capabilities(deviceId, {
      packageName: V58_EXPERIMENTAL_PACKAGE,
      versionCode,
    }),
    playerBinding: {
      status: "ACTIVE",
      clientId: V58_CANARY_CLIENT_ID,
      screenId: V58_CANARY_SCREEN_ID,
      deviceId,
    },
  };
}

test("V66 experimental announces its real capabilities and passes the canary publication guard", () => {
  const player = boundCanary(66);

  assert.equal(player.capabilities?.versionCode, 66);
  assert.equal(supportsDynamicTemplatesV2(player), true);
});

test("consolidated V67 through V69 retain the rcsecurelink capability contract", () => {
  for (const versionCode of [67, 68, 69]) {
    const player = boundCanary(versionCode);
    assert.equal(player.capabilities?.versionCode, versionCode);
    assert.equal(supportsDynamicTemplatesV2(player), true);
  }
});

test("unknown V70 remains outside the experimental capability contract", () => {
  const player = boundCanary(70);
  assert.equal(player.capabilities, null);
  assert.equal(supportsDynamicTemplatesV2(player), false);
});
