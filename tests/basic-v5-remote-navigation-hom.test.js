import test from "node:test";
import assert from "node:assert/strict";
import {
  BASIC_V5_HOM_PACKAGE,
  BASIC_V5_HOM_VERSION_CODE,
  getAndroidPlayerV2Capabilities,
  isApprovedAndroidNavigationPlayer,
} from "../src/templates-v2/player-capability.js";
import {
  getPlaylistNavigationCapability,
  getPlaylistNavigationCommand,
} from "../src/player-remote-capability.js";

test("BASIC V5 homologado anuncia navegacao", () => {
  const capabilities = getAndroidPlayerV2Capabilities("device-basic", {
    packageName: BASIC_V5_HOM_PACKAGE,
    versionCode: BASIC_V5_HOM_VERSION_CODE,
  });
  assert.ok(capabilities);
  assert.equal(capabilities.playlistItemNavigation, true);
  const screen = { connectedDeviceId: "device-basic", capabilities };
  assert.equal(getPlaylistNavigationCapability(screen).supported, true);
  assert.deepEqual(getPlaylistNavigationCommand("next", screen), { type: "nextMedia" });
  assert.deepEqual(getPlaylistNavigationCommand("previous", screen), { type: "previousMedia" });
});

test("bloqueia dispositivo diferente", () => {
  const capabilities = getAndroidPlayerV2Capabilities("device-basic", {
    packageName: BASIC_V5_HOM_PACKAGE,
    versionCode: BASIC_V5_HOM_VERSION_CODE,
  });
  assert.equal(getPlaylistNavigationCapability({
    connectedDeviceId: "outro-device",
    capabilities,
  }).supported, false);
});

test("bloqueia versao BASIC nao homologada", () => {
  assert.equal(isApprovedAndroidNavigationPlayer(
    BASIC_V5_HOM_PACKAGE,
    BASIC_V5_HOM_VERSION_CODE + 1,
  ), false);
});

test("preserva bloqueio da V73", () => {
  assert.equal(isApprovedAndroidNavigationPlayer(
    "br.com.parksolutions.totempark",
    73,
  ), false);
});

test("preserva suporte legado aprovado", () => {
  assert.equal(isApprovedAndroidNavigationPlayer(
    "br.com.parksolutions.totempark.player.rcsecurelink",
    70,
  ), true);
});