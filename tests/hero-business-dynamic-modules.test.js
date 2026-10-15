import test from "node:test";
import assert from "node:assert/strict";
import { createTemplateV2Draft, HERO_BUSINESS_TYPE } from "../src/templates-v2/schema.js";

test("Hero Business preserva módulos atuais sem exigir RSS", () => {
  const draft=createTemplateV2Draft(HERO_BUSINESS_TYPE,{modules:{clock:{enabled:true},weather:{enabled:true,city:"Natal"},qrCode:{enabled:true,type:"text",text:"Contato"}}});
  assert.equal(draft.modules.clock.enabled,true);
  assert.equal(draft.modules.weather.city,"Natal");
  assert.equal(draft.modules.qrCode.enabled,true);
  assert.equal(draft.modules.news.enabled,false);
  assert.equal(draft.dynamicTemplate,undefined);
});
