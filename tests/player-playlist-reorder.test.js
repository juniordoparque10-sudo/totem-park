import test from "node:test";
import assert from "node:assert/strict";

import {
  getStablePlayerItemIdentity,
  reconcilePlaylistPlaybackIdentity,
} from "../src/player-playlist-navigation.js";

const media = (mediaId, extra = {}) => ({
  playerItemType: "media",
  mediaId,
  ...extra,
});

test("reordenação [A,B,C] para [B,A,C] preserva B por mediaId", () => {
  const before = [media("A"), media("B"), media("C")];
  const after = [before[1], before[0], before[2]];

  const result = reconcilePlaylistPlaybackIdentity({
    items: after,
    currentIndex: 1,
    currentIdentity: getStablePlayerItemIdentity(before[1]),
  });

  assert.deepEqual(result, {
    index: 0,
    identity: "media|B",
    preserved: true,
  });
});

test("alterar caminho local não perde a mídia corrente com o mesmo mediaId", () => {
  const result = reconcilePlaylistPlaybackIdentity({
    items: [media("B", { storagePath: "cache/novo.mp4" }), media("A")],
    currentIndex: 1,
    currentIdentity: getStablePlayerItemIdentity(media("B", { storagePath: "cache/antigo.mp4" })),
  });

  assert.equal(result.index, 0);
  assert.equal(result.identity, "media|B");
  assert.equal(result.preserved, true);
});

test("vídeo, template, carregamento e transição usam a mesma identidade estável", () => {
  const cases = [
    media("video-1", { mediaType: "video", loading: true }),
    { playerItemType: "template", templateId: "template-1", loading: true },
    media("transition-1", { transitionState: "pending" }),
  ];

  for (const item of cases) {
    const identity = getStablePlayerItemIdentity(item);
    const result = reconcilePlaylistPlaybackIdentity({
      items: [{ playerItemType: "media", mediaId: "other" }, item],
      currentIndex: 0,
      currentIdentity: identity,
    });
    assert.equal(result.index, 1);
    assert.equal(result.identity, identity);
    assert.equal(result.preserved, true);
  }
});

test("item removido usa índice válido e atualiza a referência sem loop", () => {
  const result = reconcilePlaylistPlaybackIdentity({
    items: [media("A"), media("C")],
    currentIndex: 2,
    currentIdentity: "media|B",
  });

  assert.deepEqual(result, {
    index: 0,
    identity: "media|A",
    preserved: false,
  });
});

test("lista vazia não inventa mídia nem identidade", () => {
  assert.deepEqual(
    reconcilePlaylistPlaybackIdentity({
      items: [],
      currentIndex: 1,
      currentIdentity: "media|B",
    }),
    { index: -1, identity: "", preserved: false }
  );
});
