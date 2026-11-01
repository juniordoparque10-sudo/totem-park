import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getPlaylistNavigationCapability,
  getPlaylistNavigationCommand,
} from "../src/player-remote-capability.js";

test("playlist navigation stays disabled unless the Player reports explicit support", () => {
  assert.deepEqual(getPlaylistNavigationCapability({ versionCode:57 }), {
    supported:false,
    reason:"Requer atualização do Player",
  });
  assert.equal(getPlaylistNavigationCommand("previous", { versionCode:57 }), null);
  const webScreen = {
    connectedDeviceId:"web-device",
    capabilities:{ playlistItemNavigation:true, deviceId:"web-device", platform:"WEB" },
  };
  assert.deepEqual(
    getPlaylistNavigationCommand("next", webScreen),
    { type:"nextMedia" }
  );
  assert.equal(getPlaylistNavigationCommand("next", {
    ...webScreen,
    connectedDeviceId:"android-device",
  }), null);
  assert.equal(getPlaylistNavigationCommand("next", {
    ...webScreen,
    capabilities:{ ...webScreen.capabilities, platform:"ANDROID" },
  }), null);
  const androidV69 = {
    connectedDeviceId:"android-device",
    capabilities:{ platform:"ANDROID", packageName:"br.com.parksolutions.totempark.player.rcsecurelink", versionCode:69, deviceId:"android-device", playlistItemNavigation:true, templatesV2:true, templatesV2DynamicPhase1:true },
  };
  assert.deepEqual(getPlaylistNavigationCommand("previous", androidV69), { type:"previousMedia" });
  assert.deepEqual(getPlaylistNavigationCommand("next", {
    ...androidV69,
    capabilities:{ ...androidV69.capabilities, versionCode:70 },
  }), { type:"nextMedia" });
  assert.deepEqual(getPlaylistNavigationCommand("next", {
    ...androidV69,
    capabilities:{ ...androidV69.capabilities, packageName:"br.com.parksolutions.totempark", versionCode:70 },
  }), { type:"nextMedia" });
});

test("Mercado and shared collections constrain logo slots and keep background behind content", async () => {
  const [market, marketCss, collection, collectionCss] = await Promise.all([
    readFile(new URL("../src/templates-v2/market-premium/MarketPremiumRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/templates-v2/market-premium/market-premium.css", import.meta.url), "utf8"),
    readFile(new URL("../src/templates-v2/dynamic-collections/CollectionRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/templates-v2/dynamic-collections/collection-renderer.css", import.meta.url), "utf8"),
  ]);

  assert.match(market, /className="market-logo"/);
  assert.match(collection, /className="collection-logo"/);
  assert.match(marketCss, /\.market-background>(?:img|video)[^}]*width:100%[^}]*height:100%/);
  assert.match(marketCss, /\.market-background\{[^}]*z-index:0/);
  assert.match(marketCss, /\.market-background>i\{[^}]*z-index:1/);
  assert.match(marketCss, /\.tpv2-market-premium>header[^}]*z-index:2/);
  assert.match(collectionCss, /\.collection-logo\s*\{[^}]*max-width:/);
});

test("remote control uses the approved playback row and never sends unsupported navigation", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/remote-control.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /remote-playback-row/);
  assert.match(app, /Mídia anterior/);
  assert.match(app, /Mídia próxima/);
  assert.match(app, /Requer atualização do Player/);
  assert.match(app, /getPlaylistNavigationCommand/);
  assert.match(css, /\.remote-control-panel-inline \.remote-playback-row\s*\{[^}]*grid-template-columns:\s*repeat\(4/);
  assert.match(css, /@media[^}]*max-width:\s*760px[\s\S]*?\.remote-control-panel-inline \.remote-playback-row\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
});
