import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeAgendaInfoConfig, selectAgendaEvents } from "../src/templates-v2/agenda-info/config.js";
import { AGENDA_INFO_TYPE, createTemplateV2Draft } from "../src/templates-v2/schema.js";

test("Agenda ordena eventos futuros cronologicamente sem apagá-los", () => {
  const config = normalizeAgendaInfoConfig({ items:[
    {id:"late",title:"Tarde",eventAt:"2026-10-16T16:00:00Z"},
    {id:"past",title:"Passado",eventAt:"2026-10-14T10:00:00Z"},
    {id:"early",title:"Manhã",eventAt:"2026-10-16T09:00:00Z"},
  ] });
  assert.equal(config.items.length,3);
  assert.deepEqual(selectAgendaEvents(config.items,new Date("2026-10-15T00:00:00Z")).map((item)=>item.id),["early","late"]);
});

test("Agenda persiste dados manuais e não cria integração de calendário", () => {
  const draft = createTemplateV2Draft(AGENDA_INFO_TYPE,{ agenda:{ items:[{id:"event",title:"Reunião",eventAt:"2026-10-16T09:00:00Z",location:"Sala 1"}] } });
  assert.equal(draft.agenda.items[0].location,"Sala 1");
  const renderer = fs.readFileSync(new URL("../src/templates-v2/agenda-info/AgendaInfoRenderer.jsx",import.meta.url),"utf8");
  const shared = fs.readFileSync(new URL("../src/templates-v2/dynamic-collections/CollectionRenderer.jsx",import.meta.url),"utf8");
  assert.doesNotMatch(renderer,/google|calendar|outlook/i);
  assert.match(renderer,/CollectionRenderer/);
  assert.match(shared,/useDynamicRotation/);
});
