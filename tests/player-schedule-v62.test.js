import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextScheduleBoundaryDelay,
  getScheduleTransition,
  selectActiveScheduledPlaylist,
} from "../src/player-schedule-v62.js";

const scheduled = (overrides = {}) => ({
  id:"scheduled-1",
  name:"Jornal da manhã",
  scheduleEnabled:true,
  startDate:"2026-10-21",
  endDate:"2026-10-21",
  startTime:"10:00",
  endTime:"10:01",
  targetScreenIds:["screen-1"],
  ...overrides,
});

test("inicia no segundo zero e encerra antes do primeiro segundo do minuto final", () => {
  assert.equal(selectActiveScheduledPlaylist([scheduled()], new Date(2026, 9, 21, 9, 59, 59), "screen-1"), null);
  assert.equal(selectActiveScheduledPlaylist([scheduled()], new Date(2026, 9, 21, 10, 0, 0), "screen-1")?.id, "scheduled-1");
  assert.equal(selectActiveScheduledPlaylist([scheduled()], new Date(2026, 9, 21, 10, 0, 59), "screen-1")?.id, "scheduled-1");
  assert.equal(selectActiveScheduledPlaylist([scheduled()], new Date(2026, 9, 21, 10, 1, 0), "screen-1"), null);
});

test("respeita tela alvo, datas completas e prioridade mais recente", () => {
  const now = new Date(2026, 9, 21, 10, 0, 30);
  assert.equal(selectActiveScheduledPlaylist([scheduled()], now, "other"), null);
  assert.equal(selectActiveScheduledPlaylist([scheduled({ startDate:"2026-10-22" })], now, "screen-1"), null);
  const latest = scheduled({ id:"latest", startTime:"10:00:15" });
  assert.equal(selectActiveScheduledPlaylist([scheduled(), latest], now, "screen-1")?.id, "latest");
});

test("atravessa meia-noite sem ampliar a data final", () => {
  const playlist = scheduled({ startDate:"2026-10-21", endDate:"2026-10-22", startTime:"23:59:30", endTime:"00:00:30" });
  assert.equal(selectActiveScheduledPlaylist([playlist], new Date(2026, 9, 21, 23, 59, 45), "screen-1")?.id, "scheduled-1");
  assert.equal(selectActiveScheduledPlaylist([playlist], new Date(2026, 9, 22, 0, 0, 29), "screen-1")?.id, "scheduled-1");
  assert.equal(selectActiveScheduledPlaylist([playlist], new Date(2026, 9, 22, 0, 0, 30), "screen-1"), null);
});

test("agenda o próximo limite no milissegundo correto", () => {
  const playlists = [scheduled()];
  assert.equal(getNextScheduleBoundaryDelay(playlists, new Date(2026, 9, 21, 9, 59, 58, 750), "screen-1"), 1250);
  assert.equal(getNextScheduleBoundaryDelay(playlists, new Date(2026, 9, 21, 10, 0, 58, 900), "screen-1"), 1100);
});

test("avisos são emitidos somente nas transições previstas", () => {
  const playlist = scheduled();
  assert.deepEqual(getScheduleTransition({ previous:null, current:null, changed:playlist }), { type:"scheduled", message:"✓ Playlist programada: Jornal da manhã", durationMs:3500 });
  assert.deepEqual(getScheduleTransition({ previous:null, current:playlist }), { type:"started", message:"✓ Programação ativa: Jornal da manhã", durationMs:4000 });
  assert.deepEqual(getScheduleTransition({ previous:playlist, current:playlist, endingSoon:true }), { type:"ending", message:"Programação encerrando: Jornal da manhã", durationMs:2500 });
  assert.equal(getScheduleTransition({ previous:playlist, current:null }), null);
  assert.equal(getScheduleTransition({ previous:playlist, current:playlist }), null);
});

test("reconexão durante janela ativa não fabrica aviso de início", () => {
  const playlist = scheduled();
  assert.equal(getScheduleTransition({ previous:null, current:playlist, bootstrapping:true }), null);
});
