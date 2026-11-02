import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildScheduleSnapshot,
  consumeScheduleNotice,
  getNextScheduleBoundaryDelay,
  getScheduleNotice,
  getScheduleOccurrenceKey,
  getScheduleTransition,
  resolveScheduledPlayback,
  selectActiveScheduledPlaylist,
  startScheduleRuntime,
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

test("entrega ao renderizador os itens agendados no intervalo real da Kimura", () => {
  const defaultPlaylist = { id:"default", items:[{ id:"default-video" }] };
  const kimuraSchedule = scheduled({
    id:"dia-das-criancas",
    name:"Dia das crianças",
    startDate:"2026-11-02",
    endDate:"2026-11-02",
    startTime:"13:02",
    endTime:"13:04",
    items:[
      { id:"hora-certa-v2", playerItemType:"template", duration:15 },
      { id:"petit-gourmet-tcl", playerItemType:"media", duration:10 },
    ],
  });

  const before = resolveScheduledPlayback({ playlists:[kimuraSchedule], defaultPlaylist, now:new Date(2026, 10, 2, 13, 1, 59), screenId:"screen-1" });
  const atStart = resolveScheduledPlayback({ playlists:[kimuraSchedule], defaultPlaylist, now:new Date(2026, 10, 2, 13, 2, 0), screenId:"screen-1" });
  const bootInside = resolveScheduledPlayback({ playlists:[kimuraSchedule], defaultPlaylist, now:new Date(2026, 10, 2, 13, 3, 0), screenId:"screen-1" });
  const atEnd = resolveScheduledPlayback({ playlists:[kimuraSchedule], defaultPlaylist, now:new Date(2026, 10, 2, 13, 4, 0), screenId:"screen-1" });

  assert.deepEqual(before.items.map((item) => item.id), ["default-video"]);
  assert.deepEqual(atStart.items.map((item) => item.id), ["hora-certa-v2", "petit-gourmet-tcl"]);
  assert.deepEqual(bootInside.items.map((item) => item.id), ["hora-certa-v2", "petit-gourmet-tcl"]);
  assert.equal(atStart.playlist.id, "dia-das-criancas");
  assert.deepEqual(atEnd.items.map((item) => item.id), ["default-video"]);
});

test("tick local recupera a ativação mesmo quando o timeout exato é perdido", () => {
  const defaultPlaylist = { id:"default", items:[{ id:"default-video" }] };
  const kimuraSchedule = scheduled({
    id:"dia-das-criancas",
    startDate:"2026-11-02",
    endDate:"2026-11-02",
    startTime:"13:02",
    endTime:"13:04",
    items:[{ id:"hora-certa-v2" }, { id:"petit-gourmet-tcl" }],
  });
  let currentNow = new Date(2026, 10, 2, 13, 1, 59, 500);
  let boundaryCallback = null;
  let fallbackCallback = null;
  let clearedTimeout = false;
  let clearedInterval = false;
  const renderedItemIds = [];

  const cleanup = startScheduleRuntime({
    playlists:[kimuraSchedule],
    screenId:"screen-1",
    nowFn:() => currentNow,
    onTick:(tickNow) => renderedItemIds.push(resolveScheduledPlayback({
      playlists:[kimuraSchedule], defaultPlaylist, now:tickNow, screenId:"screen-1",
    }).items.map((item) => item.id)),
    setTimeoutFn:(callback) => { boundaryCallback = callback; return 11; },
    clearTimeoutFn:(id) => { assert.equal(id, 11); clearedTimeout = true; },
    setIntervalFn:(callback, delay) => { assert.equal(delay, 1000); fallbackCallback = callback; return 22; },
    clearIntervalFn:(id) => { assert.equal(id, 22); clearedInterval = true; },
  });

  assert.equal(typeof boundaryCallback, "function");
  currentNow = new Date(2026, 10, 2, 13, 2, 0, 500);
  fallbackCallback();
  assert.deepEqual(renderedItemIds, [["hora-certa-v2", "petit-gourmet-tcl"]]);

  cleanup();
  assert.equal(clearedTimeout, true);
  assert.equal(clearedInterval, true);
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

test("os quatro avisos usam o contrato visual e textual aprovado", () => {
  const playlist = scheduled();
  assert.deepEqual(getScheduleNotice("created", playlist), {
    type:"created",
    title:"Programação agendada criada",
    description:'Playlist "Jornal da manhã" adicionada com sucesso.',
    durationMs:3500,
  });
  assert.deepEqual(getScheduleNotice("active", playlist), {
    type:"active",
    title:"Programação ativa",
    description:'Iniciando playlist agendada: "Jornal da manhã".',
    durationMs:4000,
  });
  assert.deepEqual(getScheduleNotice("ended", playlist), {
    type:"ended",
    title:"Programação encerrada",
    description:"Retornando à programação normal.",
    durationMs:2500,
  });
  assert.deepEqual(getScheduleNotice("updated", playlist), {
    type:"updated",
    title:"Programação agendada atualizada",
    description:"Alterações aplicadas com sucesso.",
    durationMs:3500,
  });
});

test("o selo mantém a identidade aprovada em escala visual compacta", () => {
  const css = fs.readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
  assert.match(css, /width:\s*clamp\(160px,\s*10vw,\s*200px\)/);
  assert.match(css, /min-height:\s*42px/);
  assert.match(css, /grid-template-columns:\s*30px minmax\(0,\s*1fr\)/);
});

test("snapshot separa criação de atualização sem inventar evento no bootstrap", () => {
  const initial = buildScheduleSnapshot([scheduled()], "screen-1");
  assert.deepEqual(initial.notice, null);

  const created = buildScheduleSnapshot([scheduled(), scheduled({ id:"scheduled-2", name:"Jornal da tarde" })], "screen-1", initial.snapshot);
  assert.equal(created.notice?.type, "created");
  assert.equal(created.notice?.playlist.id, "scheduled-2");

  const updated = buildScheduleSnapshot([
    scheduled({ endTime:"10:02" }),
    scheduled({ id:"scheduled-2", name:"Jornal da tarde" }),
  ], "screen-1", created.snapshot);
  assert.equal(updated.notice?.type, "updated");
  assert.equal(updated.notice?.playlist.id, "scheduled-1");
});

test("bootstrap ignora snapshot persistido vazio e só avisa em mudança remota posterior", () => {
  const boot = buildScheduleSnapshot([scheduled()], "screen-1", {}, { bootstrapping:true });
  assert.equal(boot.notice, null);
  assert.equal(boot.snapshot["scheduled-1"], "true|Jornal da manhã|2026-10-21|2026-10-21|10:00|10:01|screen-1");

  const createdLater = buildScheduleSnapshot([
    scheduled(),
    scheduled({ id:"scheduled-2", name:"Jornal da tarde" }),
  ], "screen-1", boot.snapshot);
  assert.equal(createdLater.notice?.type, "created");
  assert.equal(createdLater.notice?.playlist.id, "scheduled-2");
});

test("ledger persistente consome cada alteração e cada ocorrência uma única vez", () => {
  const playlist = scheduled({ startTime:"10:00:15", endTime:"10:01:20" });
  const occurrenceKey = getScheduleOccurrenceKey(playlist, new Date(2026, 9, 21, 10, 0, 30), "screen-1");
  assert.equal(occurrenceKey, "scheduled-1|2026-10-21T10:00:15.000");

  const first = consumeScheduleNotice([], `active|${occurrenceKey}`);
  assert.equal(first.shouldShow, true);
  const reconnect = consumeScheduleNotice(first.seenKeys, `active|${occurrenceKey}`);
  assert.equal(reconnect.shouldShow, false);
  const ended = consumeScheduleNotice(reconnect.seenKeys, `ended|${occurrenceKey}`);
  assert.equal(ended.shouldShow, true);
});
