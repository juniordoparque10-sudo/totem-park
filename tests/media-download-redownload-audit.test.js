import test from "node:test";
import assert from "node:assert/strict";
import { getPlaylistMediaPreparation } from "../src/media-download-readiness.js";

const preview = "https://cdn.example/media-a-preview.mp4";
const remotePreview = "https://storage.example/media-a-original.mp4";

test("AUDIT: mídia baixada por remotePreview deve permanecer pronta quando o lookup seguinte contém só preview", () => {
  const firstRepresentation = { mediaId:"A", type:"Vídeo", preview, remotePreview };
  const firstRun = getPlaylistMediaPreparation([firstRepresentation], {});
  assert.deepEqual(firstRun, { total:1, cached:0, pendingUrls:[remotePreview] });

  const persistedOfflineAssetMap = { [remotePreview]:"file:///data/media-a.mp4", "identity:A":"file:///data/media-a.mp4" };
  const nextRepresentation = { mediaId:"A", type:"Vídeo", preview };
  const reconciliation = getPlaylistMediaPreparation([nextRepresentation], persistedOfflineAssetMap);

  assert.deepEqual(reconciliation, { total:1, cached:1, pendingUrls:[] });
});

test("AUDIT: restart não deve recolocar alias da mesma mídia na fila", () => {
  const persistedOfflineAssetMap = { [remotePreview]:"file:///data/media-a.mp4", "identity:A":"file:///data/media-a.mp4" };
  const restoredPlaylistItem = { mediaId:"A", type:"Vídeo", preview };

  for (let cycle = 0; cycle < 3; cycle += 1) {
    assert.deepEqual(
      getPlaylistMediaPreparation([restoredPlaylistItem], persistedOfflineAssetMap),
      { total:1, cached:1, pendingUrls:[] },
    );
  }
});

test("AUDIT: alternar URL1, URL2 e URL1 mantém uma única mídia pronta", () => {
  const persistedOfflineAssetMap = {
    [preview]:"file:///data/media-a.mp4",
    [remotePreview]:"file:///data/media-a.mp4",
    "identity:A":"file:///data/media-a.mp4",
  };
  const representations = [
    { mediaId:"A", type:"Vídeo", preview },
    { mediaId:"A", type:"Vídeo", remotePreview },
    { mediaId:"A", type:"Vídeo", preview },
  ];
  representations.forEach((item) => {
    assert.deepEqual(getPlaylistMediaPreparation([item],persistedOfflineAssetMap), { total:1, cached:1, pendingUrls:[] });
  });
});
