# Telemetria Histórica — Etapa 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir dias, sessões e eventos de telemetria com fila Local First e gravações idempotentes.

**Architecture:** Um agregador local consome os snapshots e eventos existentes, produz documentos absolutos por dia e uma outbox persistente. Um sincronizador Firestore reutiliza o ciclo de heartbeat, mas só grava em checkpoint econômico ou transição pendente.

**Tech Stack:** JavaScript ESM, React, Firebase Web SDK, Firestore Rules, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-28-telemetria-historica-etapa-1-design.md`

## Global Constraints

- Não publicar, instalar, gerar APK, migrar dados ou alterar Firebase remoto.
- Não alterar dashboard, PDF, CSS, layouts, cache ou reprodução.
- Manter Players antigos compatíveis.
- Não inferir reprodução pela ausência de heartbeat.

## Review Focus

- Reboot com reprodução aberta deve registrar interrupção desconhecida, não duração inventada.
- Virada UTC deve dividir intervalos e não misturar contadores entre dias.
- Retry do mesmo checkpoint/evento deve ser idempotente.
- Reset/indisponibilidade do contador Android não pode reduzir totais.
- Player antigo sem campos históricos deve continuar autorizado no contrato existente.

---

### Task 1: Agregador Local First

**Files:**
- Create: `src/telemetry-history.js`
- Create: `tests/telemetry-history.test.js`

**Interfaces:**
- Consumes: `trafficDaily`, snapshot operacional e eventos V2-A.
- Produces: `createTelemetryHistory()`, `checkpoint()`, `recordEvents()`, `pending()`, `acknowledge()`.

- [ ] Escrever testes falhos para reinício, UTC, eventos comprovados, falhas e compatibilidade.
- [ ] Executar os testes e confirmar RED.
- [ ] Implementar armazenamento diário e outbox mínimos.
- [ ] Executar os testes e confirmar GREEN.

### Task 2: Sincronização Firestore econômica

**Files:**
- Create: `src/telemetry-history-sync.js`
- Create: `tests/telemetry-history-sync.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: documentos pendentes da Task 1.
- Produces: gravações idempotentes em `telemetryDaily`, `telemetrySessions` e `telemetryEvents`.

- [ ] Escrever testes falhos para retry, reconexão, limite de 15 minutos e integração sem escrita por heartbeat.
- [ ] Confirmar RED.
- [ ] Implementar sincronizador e ligar ao heartbeat existente.
- [ ] Confirmar GREEN.

### Task 3: Rules locais e contrato

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/firestore-player-identity.rules.test.mjs`

**Interfaces:**
- Consumes: documentos produzidos nas Tasks 1 e 2.
- Produces: autorização isolada por binding para dias/eventos e monotonicidade.

- [ ] Escrever testes falhos de binding, identidade, imutabilidade/idempotência e regressão legada.
- [ ] Confirmar RED no emulador.
- [ ] Implementar Rules mínimas.
- [ ] Confirmar GREEN.

### Task 4: Verificação integrada

- [ ] Rodar testes focados e regressão de telemetria/cache.
- [ ] Rodar lint e build Web apenas para validação local, sem publicar.
- [ ] Revisar diff e documentar custo estimado e pendências da Etapa 2.
