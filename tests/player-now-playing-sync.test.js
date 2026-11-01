import assert from "node:assert/strict";
import test from "node:test";

import { createNowPlayingSyncGuard } from "../src/player-now-playing-sync.js";

const basePayload = {
  nowPlayingTitle: "Notícia",
  nowPlayingType: "Template Notícias",
  nowPlayingDuration: 10,
  nowPlayingPreview: "preview",
  nowPlayingOrientation: "Paisagem",
  nowPlayingAspectRatio: "16:9",
  nowPlayingWidth: 1920,
  nowPlayingHeight: 1080,
  nowPlayingTemplateType: "news-v2",
  nowPlayingItemType: "template",
  nowPlayingSound: false,
  currentMediaSource: "local",
  nowPlayingIndex: 1,
  nowPlayingTotal: 3,
  currentPlaylistId: "playlist-a",
  currentPlaylistName: "Principal",
  currentPlaylistMode: "default",
};

test("payload idêntico confirmado não gera nova escrita", () => {
  const guard = createNowPlayingSyncGuard();
  const scope = "client-a/screen-a";

  assert.equal(guard.shouldSync(scope, basePayload), true);
  guard.markAttempt(scope, basePayload);
  guard.markSuccess(scope, basePayload);
  assert.equal(guard.shouldSync(scope, { ...basePayload }), false);
});
test("cada campo operacional relevante continua disparando atualização real", () => {
  for (const [field, value] of Object.entries({
    nowPlayingTitle: "Outra notícia",
    nowPlayingType: "Vídeo",
    nowPlayingDuration: 20,
    nowPlayingPreview: "preview-2",
    nowPlayingOrientation: "Retrato",
    nowPlayingAspectRatio: "9:16",
    nowPlayingWidth: 1080,
    nowPlayingHeight: 1920,
    nowPlayingTemplateType: "sports-v2",
    nowPlayingItemType: "media",
    nowPlayingSound: true,
    currentMediaSource: "remote",
    nowPlayingIndex: 2,
    nowPlayingTotal: 4,
    currentPlaylistId: "playlist-b",
    currentPlaylistName: "Alternativa",
    currentPlaylistMode: "scheduled",
  })) {
    const guard = createNowPlayingSyncGuard();
    const scope = "client-a/screen-a";
    guard.markSuccess(scope, basePayload);
    assert.equal(guard.shouldSync(scope, { ...basePayload, [field]: value }), true, field);
  }
});

test("falha não confirma o payload e permite retry", () => {
  const guard = createNowPlayingSyncGuard();
  const scope = "client-a/screen-a";

  guard.markAttempt(scope, basePayload);
  assert.equal(guard.shouldSync(scope, basePayload), false);
  guard.markFailure(scope, basePayload);
  assert.equal(guard.shouldSync(scope, basePayload), true);
});

test("mudança de tela não herda deduplicação da tela anterior", () => {
  const guard = createNowPlayingSyncGuard();
  guard.markSuccess("client-a/screen-a", basePayload);

  assert.equal(guard.shouldSync("client-a/screen-b", basePayload), true);
});
