import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeDigitalMenuConfig } from "../src/templates-v2/digital-menu/config.js";
import { createTemplateV2Draft, DIGITAL_MENU_TYPE } from "../src/templates-v2/schema.js";

test("Menu normaliza produtos, categorias, preço e disponibilidade",()=>{
  const config=normalizeDigitalMenuConfig({categories:["Lanches","Bebidas"],products:[{id:"p1",name:"Combo",description:"Completo",category:"Lanches",price:"29.9",available:true,featured:true}]});
  assert.deepEqual(config.categories,["Lanches","Bebidas"]);
  assert.equal(config.products[0].price,29.9);
  assert.equal(config.products[0].available,true);
});

test("Menu persiste sem compartilhar cadastro com Mercado Premium",()=>{
  const draft=createTemplateV2Draft(DIGITAL_MENU_TYPE,{digitalMenu:{products:[{id:"p1",name:"Café",price:8}]}});
  assert.equal(draft.digitalMenu.products[0].name,"Café");
  assert.equal(draft.market,undefined);
  const renderer=fs.readFileSync(new URL("../src/templates-v2/digital-menu/DigitalMenuRenderer.jsx",import.meta.url),"utf8");
  assert.match(renderer,/CollectionRenderer/);
});
