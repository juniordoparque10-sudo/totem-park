import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getAndroidPlayerV2Capabilities } from "../src/templates-v2/player-capability.js";
import { shouldShowPlayerEmptyState } from "../src/player-startup-state.js";
import { getPlaylistNavigationCapability } from "../src/player-remote-capability.js";

const PACKAGE = "br.com.parksolutions.totempark.player.rcsecurelink";

test("V61 advertises Android capabilities while preserving the approved V58/V59/V60 contract", () => {
  const capabilities = getAndroidPlayerV2Capabilities("device-v61", {
    packageName: PACKAGE,
    versionCode: 61,
    versionName: "1.0.0-v61-experimental",
  });
  assert.deepEqual(capabilities, {
    deviceId:"device-v61",
    platform:"ANDROID",
    packageName:PACKAGE,
    versionCode:61,
    playlistItemNavigation:true,
    templatesV2:true,
    templatesV2DynamicPhase1:true,
  });
  assert.equal(getAndroidPlayerV2Capabilities("device-v58", {
    packageName: PACKAGE,
    versionCode: 58,
  })?.versionCode, 58);
  assert.equal(getAndroidPlayerV2Capabilities("device-v59", {
    packageName: PACKAGE,
    versionCode: 59,
  })?.versionCode, 59);
  assert.equal(getAndroidPlayerV2Capabilities("device-v60", {
    packageName: PACKAGE,
    versionCode: 60,
  })?.versionCode, 60);
  assert.equal(getAndroidPlayerV2Capabilities("device-v57", {
    packageName: PACKAGE,
    versionCode: 57,
    versionName: "1.0.0-v57-experimental",
  }), null);
  assert.equal(getAndroidPlayerV2Capabilities("device-other", {
    packageName: "br.com.parksolutions.totempark",
    versionCode: 58,
  }), null);
});

test("Portal enables playlist navigation for bound V58/V59/V60/V61 Android capability but not unauthorized clients", () => {
  const screen = {
    connectedDeviceId:"device-v58",
    capabilities:getAndroidPlayerV2Capabilities("device-v58", {
      packageName:PACKAGE,
      versionCode:58,
    }),
  };
  assert.equal(getPlaylistNavigationCapability(screen).supported, true);
  assert.equal(getPlaylistNavigationCapability({
    connectedDeviceId:"device-v59",
    capabilities:getAndroidPlayerV2Capabilities("device-v59", {
      packageName:PACKAGE,
      versionCode:59,
    }),
  }).supported, true);
  assert.equal(getPlaylistNavigationCapability({
    connectedDeviceId:"device-v61",
    capabilities:getAndroidPlayerV2Capabilities("device-v61", {
      packageName:PACKAGE,
      versionCode:61,
    }),
  }).supported, true);
  assert.equal(getPlaylistNavigationCapability({
    connectedDeviceId:"device-v60",
    capabilities:getAndroidPlayerV2Capabilities("device-v60", {
      packageName:PACKAGE,
      versionCode:60,
    }),
  }).supported, true);
  assert.equal(getPlaylistNavigationCapability({
    connectedDeviceId:"device-v57",
    capabilities:{ deviceId:"device-v57", platform:"ANDROID" },
  }).supported, false);
  assert.equal(getPlaylistNavigationCapability({
    connectedDeviceId:"device-v60",
    capabilities:{
      deviceId:"device-v60",
      platform:"ANDROID",
      packageName:PACKAGE,
      versionCode:60,
      playlistItemNavigation:true,
      templatesV2:true,
      templatesV2DynamicPhase1:false,
    },
  }).supported, false);
});

test("empty playlist message waits for cached playlist and template reconciliation", () => {
  const base = {
    loading:false,
    clientLoading:false,
    activePlaylist:null,
    screenTemplates:[],
  };
  assert.equal(shouldShowPlayerEmptyState({ ...base, playlistResolved:false, templatesResolved:true }), false);
  assert.equal(shouldShowPlayerEmptyState({ ...base, playlistResolved:true, templatesResolved:false }), false);
  assert.equal(shouldShowPlayerEmptyState({ ...base, playlistResolved:true, templatesResolved:true }), true);
  assert.equal(shouldShowPlayerEmptyState({
    ...base,
    playlistResolved:true,
    templatesResolved:true,
    activePlaylist:{ id:"cached", items:[{ id:"media" }] },
  }), false);
});

test("Secure Link experiment declares the V61 update-in-place metadata", async () => {
  const gradle = await readFile(new URL("../android/app/build.gradle", import.meta.url), "utf8");
  const environment = await readFile(new URL("../.env.playerRcSecureLinkExperiment", import.meta.url), "utf8");
  const flavor = gradle.match(/playerRcSecureLinkExperiment\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
  assert.match(flavor, /applicationIdSuffix\s+"\.player\.rcsecurelink"/);
  assert.match(flavor, /versionCode\s+61/);
  assert.match(flavor, /versionName\s+"1\.0\.0-v61-experimental"/);
  assert.match(flavor, /signingConfig\s+signingConfigs\.debug/);
  assert.match(environment, /^VITE_APP_VERSION=1\.0\.0-v61-experimental$/m);
});

test("capability announcement is isolated from the operational heartbeat payload", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /heartbeatPayload\.capabilities\s*=/);
  assert.match(app, /updateDoc\(screenDocRef, \{ capabilities \}\)/);
  assert.match(app, /PLAYER_CAPABILITY_RETRY_INTERVAL_MS/);
});

test("Secure Link V58 keeps the approved branded startup shell through reconciliation", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const splash = await readFile(new URL("../src/player/PlayerStartupSplash.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/player/player-startup-splash.css", import.meta.url), "utf8");

  assert.match(app, /function PlayerOnlySplash\(\{ overlay = false \}\)/);
  assert.match(app, /<PlayerStartupSplash overlay=\{overlay\} \/>/);
  assert.match(splash, /className="player-startup-splash__artwork"/);
  assert.match(css, /\.player-startup-splash__progress-track\s*\{/);
  assert.match(css, /\.player-startup-splash__progress-fill\s*\{/);
  assert.match(app, /useState\(true\)/);
  assert.doesNotMatch(app, /useState\(\(\) => !IS_SECURE_LINK_SPLASH_BUILD\)/);
  assert.doesNotMatch(app, /if \(IS_SECURE_LINK_SPLASH_BUILD\) return undefined;/);
  assert.doesNotMatch(app, /Carregando player\.\.\./);
  assert.match(app, /\{routes\}\s*\{showSplash && <PlayerOnlySplash overlay \/>\}/);
  assert.doesNotMatch(app, /showSplash \? <PlayerOnlySplash \/> : routes/);
  assert.match(css, /\.player-startup-splash\.is-overlay\s*\{/);

  const reconciliationReturns = app.match(/return <PlayerOnlySplash \/>;/g) || [];
  assert.equal(reconciliationReturns.length, 2);
});
