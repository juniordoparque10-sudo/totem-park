import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSportsV2Config, distributeSportsV2Timing, getSportsV2Timing, normalizeSportsV2Config, SPORTS_V2_TYPES } from "../src/templates-v2/sports-v2/config.js";
import * as sportsConfig from "../src/templates-v2/sports-v2/config.js";
import { createTemplateV2Draft, SPORTS_PREMIUM_TYPE } from "../src/templates-v2/schema.js";
import { formatSportsEventTime, normalizeSportsProviderTimestamp } from "../src/templates-v2/sports-v2/event-time.js";

test("sports V2 provides six isolated expandable sport objects", () => {
  const config = createSportsV2Config();
  assert.deepEqual(Object.keys(config.items), SPORTS_V2_TYPES.map(([type])=>type));
  assert.notEqual(config.items.football, config.items.basketball);
  assert.equal(config.provider, "thesportsdb");
});

test("sports V2 converte timestamp absoluto para o fuso configurado", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  assert.equal(formatSportsEventTime("2026-10-24T21:30:00Z", { timeZone:"America/Fortaleza", now }), "HOJE ÀS 18h30");
  assert.equal(formatSportsEventTime("2026-10-25T02:30:00Z", { timeZone:"America/Fortaleza", now }), "HOJE ÀS 23h30");
  assert.equal(formatSportsEventTime("", { timeZone:"America/Fortaleza", now }), "HORÁRIO A DEFINIR");
});

test("sports V2 trata timestamp sem offset da TheSportsDB como UTC sem converter duas vezes", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  assert.equal(normalizeSportsProviderTimestamp("2026-10-24T22:30:00"), "2026-10-24T22:30:00Z");
  assert.equal(normalizeSportsProviderTimestamp("2026-10-24T22:30:00-03:00"), "2026-10-24T22:30:00-03:00");
  assert.equal(formatSportsEventTime("2026-10-24T22:30:00", { timeZone:"America/Fortaleza", now }), "HOJE ÀS 19h30");
  assert.equal(formatSportsEventTime("2026-10-25T14:00:00", { timeZone:"America/Fortaleza", now }), "AMANHÃ ÀS 11h00");
  assert.equal(formatSportsEventTime("2026-10-27T14:00:00", { timeZone:"America/Fortaleza", now }), "27/10 ÀS 11h00");
});

test("sports V2 preserva fuso padrão e renderer não corta a string de horário", () => {
  assert.equal(normalizeSportsV2Config({}).timeZone, "America/Fortaleza");
  assert.equal(normalizeSportsV2Config({ timeZone:"America/Sao_Paulo" }).timeZone, "America/Sao_Paulo");
  const cards=readFileSync(new URL("../src/templates-v2/sports-v2/cards/SportsCards.jsx",import.meta.url),"utf8");
  assert.match(cards,/formatSportsEventTime/);
  assert.doesNotMatch(cards,/split\("T"\)/);
  const functions=readFileSync(new URL("../functions/index.js",import.meta.url),"utf8");
  assert.match(functions,/event\.strTimestamp/);
});

test("rotation timing distributes the full template duration", () => {
  const config = normalizeSportsV2Config({ mode:"rotation", selectedSports:["football","basketball","volleyball"] });
  const distributed = distributeSportsV2Timing(config,30);
  assert.deepEqual(distributed.selectedSports.map((type)=>distributed.items[type].duration),[10,10,10]);
  assert.deepEqual(getSportsV2Timing(distributed,30),{total:30,used:30,remaining:0,valid:true});
});

test("rotation timing reports excess and remaining time", () => {
  const config = normalizeSportsV2Config({ mode:"rotation", selectedSports:["football","basketball"], items:{football:{duration:15},basketball:{duration:10}} });
  assert.equal(getSportsV2Timing(config,30).remaining,5);
  config.items.basketball.duration=20;
  assert.equal(getSportsV2Timing(config,30).remaining,-5);
});

test("sports V2 is registered in schema, registry, renderer and editor", () => {
  const draft=createTemplateV2Draft(SPORTS_PREMIUM_TYPE);
  assert.equal(draft.sports.mode,"single");
  const registry=readFileSync(new URL("../src/templates-v2/registry.js",import.meta.url),"utf8");
  const renderer=readFileSync(new URL("../src/templates-v2/TemplateV2Renderer.jsx",import.meta.url),"utf8");
  const editor=readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx",import.meta.url),"utf8");
  assert.match(registry,/Resultados Esportivos Premium V2/);
  assert.match(renderer,/SportsPremiumRenderer/);
  assert.match(editor,/SportsV2EditorFields/);
});

test("sports appearance resolves one published visual contract for editor library and player", () => {
  assert.equal(typeof sportsConfig.getSportsV2Appearance, "function");
  const config = {
    style: { overlayOpacity: 24, panelTransparency: 68 },
    sports: { visualPreset: "stadium" },
  };
  const portrait = sportsConfig.getSportsV2Appearance?.(config, "Retrato");
  const landscape = sportsConfig.getSportsV2Appearance?.(config, "Paisagem");
  assert.deepEqual(portrait, landscape);
  assert.equal(portrait?.overlayAlpha, 0.24);
  assert.equal(portrait?.panelAlpha, 0.32);
  assert.match(portrait?.panelBackground || "", /rgba\(3, 46, 31, 0\.32\)/);
});
