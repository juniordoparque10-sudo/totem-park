import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizePromotionCampaignConfig } from "../src/templates-v2/promotion-campaign/config.js";
import { createTemplateV2Draft, PROMOTION_CAMPAIGN_TYPE } from "../src/templates-v2/schema.js";

test("Campanha preserva CTA, selo, validade e recursos", () => {
  const image={mediaId:"media-1",url:"https://example.test/campaign.png"};
  const config=normalizePromotionCampaignConfig({items:[{id:"c1",title:"Oferta",subtitle:"Só hoje",badge:"20% OFF",ctaLabel:"Confira",ctaUrl:"https://example.test",image,endsAt:"2026-10-20T00:00:00Z"}]});
  assert.equal(config.items[0].badge,"20% OFF");
  assert.equal(config.items[0].ctaUrl,"https://example.test");
  assert.equal(config.items[0].image,image);
});

test("Campanha persiste e usa composição compartilhada",()=>{
  const draft=createTemplateV2Draft(PROMOTION_CAMPAIGN_TYPE,{campaign:{items:[{id:"c1",title:"Oferta"}]}});
  assert.equal(draft.campaign.items[0].title,"Oferta");
  const renderer=fs.readFileSync(new URL("../src/templates-v2/promotion-campaign/PromotionCampaignRenderer.jsx",import.meta.url),"utf8");
  assert.match(renderer,/CollectionRenderer/);
});
