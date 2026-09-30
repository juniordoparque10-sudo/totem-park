import test from "node:test";
import assert from "node:assert/strict";
import { getTemplatePlaylistUsage } from "../src/template-usage.js";

test("finds every playlist that references a template instance", () => {
  const playlists = [
    { id:"a", name:"Recepção", items:[{ playerItemType:"template", templateId:"tpl" }] },
    { id:"b", name:"Canário", items:[{ sourceTemplateId:"tpl" }] },
    { id:"c", name:"Outra", items:[{ mediaId:"tpl" }] },
  ];
  assert.deepEqual(getTemplatePlaylistUsage(playlists,"tpl").map((item) => item.id), ["a","b"]);
});
