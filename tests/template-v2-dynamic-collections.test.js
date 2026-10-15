import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDynamicCollection, selectActiveDynamicItems } from "../src/templates-v2/dynamic-collections/config.js";

test("normaliza coleção híbrida, origens, ordem e limites", () => {
  const items = Array.from({ length:45 }, (_,index)=>({ id:`item-${index}`, title:` Item ${index} `, order:45-index, active:true, source:index === 0 ? "invalid" : "manual" }));
  const result = normalizeDynamicCollection({ items, categories:Array.from({ length:14 },(_,index)=>`Categoria ${index}`), secondarySlots:9 });
  assert.equal(result.items.length,40);
  assert.equal(result.categories.length,12);
  assert.equal(result.items[0].title,"Item 0");
  assert.equal(result.items[0].source,"manual");
  assert.equal(result.secondarySlots,3);
});

test("seleciona somente itens ativos e vigentes em ordem determinística", () => {
  const now = new Date("2026-10-15T15:00:00.000Z");
  const items = [
    { id:"future",title:"Futuro",active:true,order:0,startsAt:"2026-10-16T00:00:00.000Z" },
    { id:"expired",title:"Encerrado",active:true,order:0,endsAt:"2026-10-14T00:00:00.000Z" },
    { id:"second",title:"Segundo",active:true,order:2 },
    { id:"first",title:"Primeiro",active:true,order:1 },
    { id:"off",title:"Inativo",active:false,order:0 },
  ];
  assert.deepEqual(selectActiveDynamicItems(items,now).map((item)=>item.id),["first","second"]);
});

test("limita a seleção operacional a 24 itens", () => {
  const items = Array.from({ length:30 },(_,index)=>({ id:`i-${index}`,title:`Item ${index}`,active:true,order:index }));
  assert.equal(selectActiveDynamicItems(items,new Date()).length,24);
});
