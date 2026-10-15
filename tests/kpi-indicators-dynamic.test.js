import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeKpiIndicatorsConfig } from "../src/templates-v2/kpi-indicators/config.js";
import { createTemplateV2Draft, KPI_INDICATORS_TYPE } from "../src/templates-v2/schema.js";

test("KPI administrado informa origem e não inventa valor ausente", () => {
  const config = normalizeKpiIndicatorsConfig({ items:[{ id:"sales",title:"Vendas",value:"120",source:"manual",updatedAt:"2026-10-15T10:00:00Z" },{ id:"missing",title:"Conversão",value:"",source:"integration" }] });
  assert.equal(config.items[0].sourceLabel,"Valor administrado");
  assert.equal(config.items[0].value,120);
  assert.equal(config.items[1].value,null);
  assert.equal(config.items[1].sourceLabel,"Dados indisponíveis");
});

test("KPI persiste no draft e usa renderer próprio", () => {
  const draft=createTemplateV2Draft(KPI_INDICATORS_TYPE,{kpi:{items:[{id:"a",title:"Meta",value:8,unit:"%",source:"manual"}]}});
  assert.equal(draft.kpi.items[0].unit,"%");
  assert.match(fs.readFileSync("src/templates-v2/TemplateV2Renderer.jsx","utf8"),/KpiIndicatorsRenderer/);
  assert.match(fs.readFileSync("src/templates-v2/kpi-indicators/KpiIndicatorsRenderer.jsx","utf8"),/collection=\{kpi\} items=\{items\}/);
});
