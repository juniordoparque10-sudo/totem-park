import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const playbackModule = await import("../src/templates-v2/editor/preview-playback-session.js").catch(() => ({}));
const editorSource = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
const dataHookSource = fs.readFileSync(new URL("../src/templates-v2/editor/useTemplateV2DynamicData.js", import.meta.url), "utf8");

test("sessão de preview pausa, retoma e reinicia sem perder o relógio compartilhado", () => {
  assert.equal(typeof playbackModule.createPreviewPlaybackSession, "function");

  let now = 1_000;
  let scheduled = null;
  let cleared = 0;
  const session = playbackModule.createPreviewPlaybackSession({
    now: () => now,
    setIntervalFn: (callback) => { scheduled = callback; return 7; },
    clearIntervalFn: (id) => { assert.equal(id, 7); cleared += 1; },
  });

  const revisions = [];
  const unsubscribe = session.subscribe(() => revisions.push(session.getSnapshot()));
  session.start();
  now = 2_250;
  scheduled();
  assert.equal(session.getSnapshot().elapsedMs, 1_250);

  session.pause();
  now = 5_000;
  assert.equal(session.getSnapshot().elapsedMs, 1_250);
  assert.equal(session.getSnapshot().paused, true);

  session.resume();
  now = 5_750;
  scheduled();
  assert.equal(session.getSnapshot().elapsedMs, 2_000);
  assert.equal(session.getSnapshot().paused, false);

  const previousExecutionId = session.getSnapshot().executionId;
  session.restart();
  assert.equal(session.getSnapshot().elapsedMs, 0);
  assert.notEqual(session.getSnapshot().executionId, previousExecutionId);

  unsubscribe();
  session.destroy();
  assert.equal(cleared, 1);
  assert.ok(revisions.length >= 5);
});

test("sessão destruída encerra o timer e ignora atualizações posteriores", () => {
  assert.equal(typeof playbackModule.createPreviewPlaybackSession, "function");

  let callback = null;
  let clearCount = 0;
  const session = playbackModule.createPreviewPlaybackSession({
    now: () => 100,
    setIntervalFn: (next) => { callback = next; return 9; },
    clearIntervalFn: () => { clearCount += 1; },
  });
  let notifications = 0;
  session.subscribe(() => { notifications += 1; });
  session.start();
  const notificationsBeforeDestroy = notifications;
  session.destroy();
  callback();

  assert.equal(clearCount, 1);
  assert.equal(notifications, notificationsBeforeDestroy);
});

test("editor compartilha uma única sessão e uma única carga dinâmica entre as duas prévias", () => {
  assert.equal((editorSource.match(/useTemplateV2PreviewPlayback\(/g) || []).length, 1);
  assert.equal((editorSource.match(/useTemplateV2DynamicData\(/g) || []).length, 1);
  assert.match(dataHookSource, /setState\(\(current\)\s*=>\s*\(\{\s*\.\.\.current,\s*loading:true\s*\}\)\)/);
  assert.doesNotMatch(dataHookSource, /\[config,\s*key,/);
});
