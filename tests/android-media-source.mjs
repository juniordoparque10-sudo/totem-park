import assert from "node:assert/strict";
import test from "node:test";
import {
  isAndroidLocalMediaSource,
  isRemoteMediaSource,
  resolveAndroidMediaSource,
} from "../src/android-media-source.js";

const remote = "https://firebasestorage.googleapis.com/media/video.mp4?token=abc";
const local = "https://localhost/_capacitor_file_/data/user/0/app/files/video.mp4";

test("recognizes Capacitor convertFileSrc URLs as local", () => {
  assert.equal(isAndroidLocalMediaSource(local), true);
  assert.equal(isRemoteMediaSource(local), false);
});

test("recognizes native file and content URIs as local", () => {
  assert.equal(isAndroidLocalMediaSource("file:///data/user/0/app/files/video.mp4"), true);
  assert.equal(isAndroidLocalMediaSource("content://media/external/video/1"), true);
});

test("prefers a verified local map entry while online", () => {
  assert.deepEqual(
    resolveAndroidMediaSource(
      { preview: remote },
      { offlineAssetMap: { [remote]: local } },
    ),
    { kind: "LOCAL", src: local, remoteUrl: remote },
  );
});

test("keeps a converted local preview ahead of remotePreview", () => {
  assert.deepEqual(
    resolveAndroidMediaSource({ preview: local, remotePreview: remote }),
    { kind: "LOCAL", src: local, remoteUrl: remote },
  );
});

test("keeps cached video and image local across offline and reconnection decisions", () => {
  for (const type of ["Vídeo", "Imagem"]) {
    const media = { type, preview: local, remotePreview: remote };
    assert.equal(resolveAndroidMediaSource(media, { online: false }).kind, "LOCAL");
    assert.equal(resolveAndroidMediaSource(media, { online: true }).kind, "LOCAL");
  }
});

test("resolves each playlist item independently", () => {
  const items = [
    { preview: local, remotePreview: remote },
    { preview: "https://cdn.example.com/new.jpg" },
  ].map((item) => resolveAndroidMediaSource(item));

  assert.deepEqual(items.map((item) => item.kind), ["LOCAL", "REMOTE_FALLBACK"]);
});

test("uses explicit remote fallback only when no local source exists", () => {
  assert.deepEqual(
    resolveAndroidMediaSource({ preview: remote }),
    { kind: "REMOTE_FALLBACK", src: remote, remoteUrl: remote },
  );
});

test("reports pending and invalid sources without network probes", () => {
  assert.equal(resolveAndroidMediaSource({}, { localPending: true }).kind, "PENDING_LOCAL");
  assert.equal(resolveAndroidMediaSource({}).kind, "ERROR");
});
