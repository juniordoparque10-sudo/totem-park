import test from "node:test";
import assert from "node:assert/strict";
import { getTemplatePlaylistUsage,removeTemplateReferences } from "../src/template-usage.js";

const target="template-v2-1";
const keep={id:"media-1",playerItemType:"media",title:"Imagem"};
const references=[{templateId:target,title:"A"},{sourceTemplateId:target,title:"B"},{id:target,playerItemType:"template",title:"C"}];

test("finds every playlist representation of a template",()=>{const playlists=[{id:"one",items:[keep,references[0]]},{id:"two",items:[references[1]]},{id:"three",items:[keep]}];assert.deepEqual(getTemplatePlaylistUsage(playlists,target).map((item)=>item.id),["one","two"]);});
test("removes only target references and preserves relative order",()=>{const other={templateId:"other",title:"Outro"};const items=[keep,references[0],other,references[1],references[2]];assert.deepEqual(removeTemplateReferences(items,target),[keep,other]);});
test("playlist removal never mutates the source array",()=>{const items=[keep,references[0]];removeTemplateReferences(items,target);assert.equal(items.length,2);});
