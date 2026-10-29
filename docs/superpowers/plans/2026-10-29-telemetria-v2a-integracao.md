# Telemetria V2-A Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar a telemetria histórica V2-A do Player V70 ao Firebase e ao Portal, com métricas verificáveis, ausência explícita e relatórios por tela.

**Architecture:** Manter os coletores, outbox e coleções existentes. Separar o gate operacional do gate histórico, enriquecer os resumos existentes com cobertura/origem e conectar leitores do Portal às coleções `telemetryDaily`, `telemetrySessions` e `telemetryEvents`, preservando os campos legados como fallback.

**Tech Stack:** React/Vite, Capacitor Android/Gradle, Firebase Firestore, Node test runner.

**Spec:** Solicitação “TOTEM PARK — CORREÇÃO DA INTEGRAÇÃO V2-A” de 2026-10-29.

## Global Constraints

- Não alterar o Player oficial, Local First, cache, backoff, layouts ou CSS.
- Não publicar Firebase Rules, Portal, Player ou produção.
- Não gerar nem instalar APK.
- Não remover contratos legados.

## Review Focus

- Ausência de medição não pode virar zero.
- Escritas históricas exigem binding ACTIVE e identidade exata mesmo sem telemetria operacional.
- Eventos remotos devem prevalecer sem duplicar o fallback legado.
- Sessões repetidas em vários resumos diários contam uma vez.
- Delta que atravessa 00:00 UTC deve ficar explicitamente não atribuído, nunca perdido nem lançado em um dia arbitrário.

---

### Task 1: Contrato V70 e gate histórico

**Files:** `.env.playerConsolidatedExperimental`, `android/app/build.gradle`, `src/App.jsx`, testes de configuração/sincronização.

- [ ] Escrever testes que fixem flavor, versão 70 e telemetria V70, além do gate histórico por binding/identidade.
- [ ] Executar os testes e confirmar falha.
- [ ] Atualizar apenas o flavor consolidado e separar `canSyncTelemetryHistory` de `canSyncTelemetry`.
- [ ] Executar os testes e confirmar aprovação.

### Task 2: Medição diária, cobertura e sessões únicas

**Files:** `src/traffic-telemetry.js`, `src/telemetry-history.js`, `src/telemetry-history-dashboard.js`, `firestore.rules`, testes correspondentes.

- [ ] Escrever testes para virada UTC, campos não medidos, cobertura, origem e IDs únicos de sessão.
- [ ] Executar os testes e confirmar falha.
- [ ] Persistir metadados mínimos e delta de fronteira não atribuído; agregar apenas métricas realmente presentes e deduplicar sessões.
- [ ] Ajustar somente a candidata local das Rules para aceitar/validar esses campos.
- [ ] Executar testes unitários e do emulador.

### Task 3: Timeline histórica e fallback legado

**Files:** `src/telemetry-history-reader.js`, `src/TelemetryDashboard.jsx`, testes do leitor/atividade.

- [ ] Escrever testes de isolamento por cliente/tela/período, deduplicação e fallback legado.
- [ ] Implementar leitura de `telemetryEvents` e `telemetrySessions` nas subcoleções existentes.
- [ ] Conectar a timeline sem mudar sua estrutura visual.
- [ ] Executar testes direcionados.

### Task 4: Cards e PDF confiáveis

**Files:** `src/telemetry-card-data.js`, `src/telemetry-pdf-report.js`, `src/TelemetryDashboard.jsx`, testes correspondentes.

- [ ] Escrever testes para RX+TX, “Não medido”, cobertura/última medição e histórico por tela no PDF.
- [ ] Corrigir os cálculos e preencher as células existentes sem alterar CSS/layout.
- [ ] Executar testes direcionados.

### Task 5: Verificação integral local

**Files:** somente os arquivos alterados nas tarefas anteriores.

- [ ] Executar suíte direcionada de integração, offline/reconexão, isolamento, tráfego, timeline e PDF.
- [ ] Executar ESLint e build Web/Player V70 sem gerar APK.
- [ ] Executar validação das Rules no emulador local.
- [ ] Revisar diff para confirmar preservação dos hotfixes V70 e ausência de deploy/publicação.
