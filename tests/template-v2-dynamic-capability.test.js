import test from "node:test";
import assert from "node:assert/strict";
import { getDynamicPlaylistCapability, supportsDynamicTemplatesV2 } from "../src/templates-v2/playlist-capability.js";

test("exige capacidade dinâmica explícita e não infere por versionCode", () => {
  assert.equal(supportsDynamicTemplatesV2({ versionCode: 999 }), false);
  assert.equal(supportsDynamicTemplatesV2({ runtime: "web" }), false);
  assert.equal(supportsDynamicTemplatesV2({ versionCode: 57, capabilities: { platform: "ANDROID", templatesV2: true } }), false);
  assert.equal(supportsDynamicTemplatesV2({ connectedDeviceId:"web-a", capabilities: { deviceId:"web-a", platform:"WEB", templatesV2DynamicPhase1: true } }), true);
  assert.equal(supportsDynamicTemplatesV2({ connectedDeviceId:"android-b", capabilities: { deviceId:"web-a", platform:"WEB", templatesV2DynamicPhase1: true } }), false);
});

test("reconhece somente Android V58/V59 legítimo na tela canário com binding ACTIVE", () => {
  const capability = {
    deviceId:"device-v58",
    platform:"ANDROID",
    packageName:"br.com.parksolutions.totempark.player.rcsecurelink",
    versionCode:58,
    playlistItemNavigation:true,
    templatesV2:true,
    templatesV2DynamicPhase1:true,
  };
  const binding = {
    status:"ACTIVE",
    clientId:"eCd1q9Dq1SMr9D5FlKN8",
    screenId:"wKJY9pGe2U4p2QtehHTW",
    deviceId:"device-v58",
  };
  const canary = {
    id:"wKJY9pGe2U4p2QtehHTW",
    clientId:"eCd1q9Dq1SMr9D5FlKN8",
    connectedDeviceId:"device-v58",
    templatesV2TestMode:true,
    capabilities:capability,
    playerBinding:binding,
  };

  assert.equal(supportsDynamicTemplatesV2(canary), true);
  assert.equal(supportsDynamicTemplatesV2({
    ...canary,
    capabilities:{ ...capability, versionCode:59 },
  }), true);
  assert.equal(supportsDynamicTemplatesV2({ ...canary, id:"other-screen", playerBinding:{ ...binding, screenId:"other-screen" } }), false);
  assert.equal(supportsDynamicTemplatesV2({ ...canary, templatesV2TestMode:false }), false);
  assert.equal(supportsDynamicTemplatesV2({ ...canary, playerBinding:{ ...binding, status:"REVOKED" } }), false);
  assert.equal(supportsDynamicTemplatesV2({ ...canary, capabilities:{ ...capability, versionCode:57 } }), false);
  assert.equal(supportsDynamicTemplatesV2({ ...canary, capabilities:{ ...capability, templatesV2:false } }), false);
});

test("bloqueia playlist dinâmica atribuída a qualquer tela incompatível", () => {
  const result = getDynamicPlaylistCapability([{ templateType: "market-premium" }], [{ id: "ok", connectedDeviceId:"web-a", capabilities: { deviceId:"web-a", platform:"WEB", templatesV2DynamicPhase1: true } }, { id: "v55", versionCode: 55 }]);
  assert.equal(result.allowed, false);
  assert.deepEqual(result.blockedScreens.map((screen) => screen.id), ["v55"]);
});

test("playlist sem tipos dinâmicos preserva compatibilidade atual", () => {
  assert.equal(getDynamicPlaylistCapability([{ templateType: "news-editorial" }], [{ id: "v51", versionCode: 51 }]).allowed, true);
});

test("conteúdo consolidado novo exige capacidade mas documento legado do mesmo tipo não",()=>{
  const screen={id:"v55",versionCode:55};
  assert.equal(getDynamicPlaylistCapability([{templateType:"smart-lobby"}], [screen]).allowed,true);
  const result=getDynamicPlaylistCapability([{templateType:"smart-lobby",published:{dynamicTemplate:true}}],[screen]);
  assert.equal(result.allowed,false);
  assert.equal(result.required,true);
});

test("revalidação é atômica para atualização de playlist atribuída",()=>{
  const result=getDynamicPlaylistCapability([{templateType:"digital-menu",dynamicTemplate:true}],[{id:"web",connectedDeviceId:"web-a",capabilities:{deviceId:"web-a",platform:"WEB",templatesV2DynamicPhase1:true}},{id:"old",versionCode:51}]);
  assert.deepEqual(result.blockedScreens.map((screen)=>screen.id),["old"]);
});
