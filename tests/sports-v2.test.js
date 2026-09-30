import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSportsV2Config, distributeSportsV2Timing, getSportsV2Timing, normalizeSportsV2Config, SPORTS_V2_TYPES } from "../src/templates-v2/sports-v2/config.js";
import { createTemplateV2Draft, SPORTS_PREMIUM_TYPE } from "../src/templates-v2/schema.js";

test("sports V2 provides six isolated expandable sport objects", () => {
  const config = createSportsV2Config();
  assert.deepEqual(Object.keys(config.items), SPORTS_V2_TYPES.map(([type])=>type));
  assert.notEqual(config.items.football, config.items.basketball);
  assert.equal(config.provider, "manual");
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
