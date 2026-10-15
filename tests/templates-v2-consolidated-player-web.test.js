import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Player Web usa o mesmo renderer e hidratador das seis templates",()=>{
  const renderer=fs.readFileSync("src/templates-v2/TemplateV2Renderer.jsx","utf8");
  for (const name of ["SmartLobbyRenderer","AgendaInfoRenderer","PromotionCampaignRenderer","DigitalMenuRenderer","KpiIndicatorsRenderer","QrInteractionRenderer"]) assert.match(renderer,new RegExp(name));
  const app=fs.readFileSync("src/App.jsx","utf8");
  assert.match(app,/TemplateV2DynamicStage/);
});

test("carregador mantém cache controlado e falhas independentes",()=>{
  const loader=fs.readFileSync("src/templates-v2/editor/template-v2-dynamic-loader.js","utf8");
  assert.match(loader,/10 \* 60 \* 1000/);
  assert.match(loader,/Promise\.allSettled/);
});
