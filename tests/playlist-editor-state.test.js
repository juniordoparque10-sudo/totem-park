import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlaylistEditSnapshot,
  hasPlaylistEditChanges,
  isPlaylistEditSnapshotFor,
} from "../src/playlist-editor-state.js";

const form = {
  name: "Playlist Manhã",
  transition: "Fade suave",
  transitionSpeed: "Normal",
  orientation: "Paisagem",
  selectedMediaIds: ["media:a", "template:b"],
  scheduleEnabled: true,
  targetScreenIds: ["screen-a"],
  startDate: "2026-10-21",
  endDate: "2026-10-22",
  startTime: "08:00",
  endTime: "18:00",
};

test("detecta nome, conteúdo e ordem alterados na playlist em edição", () => {
  const baseline = createPlaylistEditSnapshot("playlist-a", form);

  assert.equal(hasPlaylistEditChanges(baseline, "playlist-a", form), false);
  assert.equal(hasPlaylistEditChanges(baseline, "playlist-a", { ...form, name: "Novo nome" }), true);
  assert.equal(hasPlaylistEditChanges(baseline, "playlist-a", {
    ...form,
    selectedMediaIds: ["template:b", "media:a"],
  }), true);
  assert.equal(hasPlaylistEditChanges(baseline, "playlist-a", {
    ...form,
    selectedMediaIds: ["media:a"],
  }), true);
});

test("detecta agendamento alterado e impede reutilizar o estado para outra playlist", () => {
  const baseline = createPlaylistEditSnapshot("playlist-a", form);

  assert.equal(hasPlaylistEditChanges(baseline, "playlist-a", {
    ...form,
    targetScreenIds: ["screen-a", "screen-b"],
  }), true);
  assert.equal(hasPlaylistEditChanges(baseline, "playlist-b", form), true);
  assert.equal(hasPlaylistEditChanges(null, "playlist-a", form), false);
  assert.equal(isPlaylistEditSnapshotFor(baseline, "playlist-a"), true);
  assert.equal(isPlaylistEditSnapshotFor(baseline, "playlist-b"), false);
  assert.equal(isPlaylistEditSnapshotFor("invalid", "playlist-a"), false);
});
