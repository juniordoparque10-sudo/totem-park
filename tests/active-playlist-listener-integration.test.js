import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

test("listener ativo solicita callbacks de mudanças apenas de metadados", () => {
  assert.match(app, /onSnapshot\(\s*playlistRef,\s*\{\s*includeMetadataChanges:\s*true\s*\}/);
});

test("listener interpreta todo callback pelo resolvedor puro", () => {
  assert.match(app, /resolvePlaylistSnapshot\(\{/);
  assert.match(app, /exists:result\.metadata\?\.exists/);
  assert.match(app, /fromCache:result\.metadata\?\.fromCache/);
  assert.match(app, /hasPendingWrites:result\.metadata\?\.hasPendingWrites/);
  assert.doesNotMatch(app, /source:"remote", found:playlistDoc\.exists\(\)/);
});

test("escopo inclui cliente tela playlist e geração para rejeitar callback antigo", () => {
  assert.match(app, /createPlaylistListenerScope\(\{[\s\S]{0,240}clientId[\s\S]{0,240}screenId:screen\.id[\s\S]{0,240}playlistId:activePlaylistId[\s\S]{0,240}generation/);
  assert.match(app, /activePlaylistListenerScopeRef\.current = listenerScope/);
  assert.match(app, /activeScope:activePlaylistListenerScopeRef\.current/);
});

test("cache validado alimenta retenção do mesmo escopo", () => {
  assert.match(app, /activePlaylistRetainedRef\.current = \{\s*scope:listenerScope,\s*playlist:cachedValue/);
});

test("erro do listener passa pelo resolvedor e expõe indisponibilidade sem declarar ausência", () => {
  assert.match(app, /resolvePlaylistListenerError\(\{/);
  assert.match(app, /setPlaylistAvailability\(result\.status\)/);
  assert.match(app, /playlistAvailability === "unavailable"/);
  assert.match(app, /Playlist temporariamente indisponível\. Aguardando reconexão\./);
});

test("seleção e agendamento homologados permanecem intocados pela integração", () => {
  assert.match(app, /const selected = chooseActivePlaylist\(\)/);
  assert.match(app, /buildScheduleSnapshot\(list, screen\?\.id, scheduleSnapshotRef\.current,/);
});
