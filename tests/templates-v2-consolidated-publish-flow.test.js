import test from "node:test";
import assert from "node:assert/strict";
import { createTemplateV2Document, createTemplateV2Draft, getTemplateV2Assets, SMART_LOBBY_TYPE, AGENDA_INFO_TYPE, PROMOTION_CAMPAIGN_TYPE, DIGITAL_MENU_TYPE, KPI_INDICATORS_TYPE, QR_INTERACTION_TYPE } from "../src/templates-v2/schema.js";

test("seis modelos consolidados preservam configuração entre draft e publicação",()=>{
  for (const type of [SMART_LOBBY_TYPE,AGENDA_INFO_TYPE,PROMOTION_CAMPAIGN_TYPE,DIGITAL_MENU_TYPE,KPI_INDICATORS_TYPE,QR_INTERACTION_TYPE]) {
    const draft=createTemplateV2Draft(type);
    const doc=createTemplateV2Document({name:type,type,draft});
    const published=structuredClone(doc.draft);
    assert.equal(published.dynamicTemplate,true,type);
    assert.deepEqual(published,doc.draft,type);
  }
});

test("assets compartilhados das coleções são deduplicados",()=>{
  const image={mediaId:"shared",url:"https://cdn.example/shared.png"};
  const assets=getTemplateV2Assets({smartLobby:{items:[{id:"l",image}]},agenda:{items:[{id:"a",image}]},campaign:{items:[{id:"c",image}]},digitalMenu:{products:[{id:"p",image}]}});
  assert.equal(assets.length,1);
});
