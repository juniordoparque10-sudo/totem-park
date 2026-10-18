import test from "node:test";
import assert from "node:assert/strict";
import { confirmTemplateImageForPaint, getTemplatePlaybackLayerKey, getTemplatePlaybackReadyKey, isCurrentPlaybackExecution, nextPlaybackExecutionId, shouldReleaseTemplateAfterPreload } from "../src/templates-v2/player-execution.js";

test("cada entrada V2 recebe uma identidade de execução diferente", () => {
  const first = 1;
  const second = nextPlaybackExecutionId(first);
  const third = nextPlaybackExecutionId(second);
  assert.deepEqual([first,second,third], [1,2,3]);
  assert.equal(new Set([first,second,third]).size, 3);
});

test("a key V2 pertence à execução e legacy preserva a key existente", () => {
  assert.equal(getTemplatePlaybackLayerKey("item",7,true), "item-execution-7");
  assert.equal(getTemplatePlaybackReadyKey("item",7,true), "item-execution-7");
  assert.equal(getTemplatePlaybackLayerKey("legacy",7,false), "legacy");
  assert.equal(getTemplatePlaybackReadyKey("legacy",7,false), "legacy");
});

test("previous preserva sua key enquanto a nova execução recebe outra", () => {
  const previousExecution = 4;
  const currentExecution = nextPlaybackExecutionId(previousExecution);
  const previousKey = getTemplatePlaybackLayerKey("template-x",previousExecution,true);
  assert.equal(previousKey, getTemplatePlaybackLayerKey("template-x",previousExecution,true));
  assert.notEqual(previousKey, getTemplatePlaybackLayerKey("template-x",currentExecution,true));
});

test("callback de execução antiga não corresponde à execução atual", () => {
  assert.equal(isCurrentPlaybackExecution(8,8), true);
  assert.equal(isCurrentPlaybackExecution(7,8), false);
});

test("elemento visual real confirma load, decode, duas molduras e ready nessa ordem", async () => {
  const events = [];
  const image = { decode: async () => events.push("decode-call") };
  await confirmTemplateImageForPaint(image, (event) => events.push(event), (callback) => { events.push("frame"); callback(); });
  assert.deepEqual(events, ["load","decode-call","decoded","frame","frame","ready"]);
});

test("preload V2 não libera a camada antes da imagem montada confirmar pintura", () => {
  assert.equal(shouldReleaseTemplateAfterPreload({ status:"ready", templateV2:true }), false);
  assert.equal(shouldReleaseTemplateAfterPreload({ status:"ready", templateV2:false }), true);
  assert.equal(shouldReleaseTemplateAfterPreload({ status:"no-background", templateV2:true }), true);
  assert.equal(shouldReleaseTemplateAfterPreload({ status:"failed", templateV2:true }), true);
});
