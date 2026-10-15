import test from "node:test";
import assert from "node:assert/strict";
import { getDynamicPlaylistCapability, supportsDynamicTemplatesV2 } from "../src/templates-v2/playlist-capability.js";

test("exige capacidade dinâmica explícita e não infere por versionCode", () => {
  assert.equal(supportsDynamicTemplatesV2({ versionCode: 999 }), false);
  assert.equal(supportsDynamicTemplatesV2({ capabilities: { templatesV2DynamicPhase1: true } }), true);
});

test("bloqueia playlist dinâmica atribuída a qualquer tela incompatível", () => {
  const result = getDynamicPlaylistCapability([{ templateType: "market-premium" }], [{ id: "ok", capabilities: { templatesV2DynamicPhase1: true } }, { id: "v55", versionCode: 55 }]);
  assert.equal(result.allowed, false);
  assert.deepEqual(result.blockedScreens.map((screen) => screen.id), ["v55"]);
});

test("playlist sem tipos dinâmicos preserva compatibilidade atual", () => {
  assert.equal(getDynamicPlaylistCapability([{ templateType: "news-editorial" }], [{ id: "v51", versionCode: 51 }]).allowed, true);
});
