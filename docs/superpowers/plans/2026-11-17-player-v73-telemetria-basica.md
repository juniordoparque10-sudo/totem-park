# Player V73 Telemetria Básica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir, apenas no novo Player RC, a publicação de telemetria avançada por um envelope atômico schema 5 BASIC, mantendo intactos reprodução, cache, programação, vínculo e comandos.

**Architecture:** Um produtor puro cria e persiste identidade de instalação/sessão e gera o snapshot BASIC. O plugin Android continua sendo a autoridade de metadados instalados e passa a expor buildId/buildTimestamp gerados pelo Gradle. O heartbeat existente continua responsável por presença e transporte, publicando um único campo `telemetry` e deixando de executar/coletar sinks avançados no flavor RC.

**Tech Stack:** React/Vite, JavaScript ESM, Capacitor Android/Java, Gradle, Firebase Firestore, Node test runner.

**Spec:** `docs/auditoria-player-v73-telemetria-simples-etapa-1.md`

## Global Constraints

- Trabalhar somente em `codex/player-v73-telemetria-simples-prep`.
- Nenhum deploy, Firebase real, APK de distribuição, merge, instalação em TV ou alteração visual.
- Não reconstruir reprodução, cache, playlists, programação, comandos, vínculo ou orientação.
- Portal permanece sem alterações; qualquer adaptação interna será apenas documentada para aprovação posterior.
- Metadados Android vêm do APK instalado via PackageManager/BuildConfig.

## Review Focus

- Upgrade e downgrade não podem misturar versão/sessão anterior com a atual.
- Documento legado schema 3/4 não pode contaminar o envelope schema 5.
- Heartbeats repetidos não podem publicar métricas avançadas nem subcoleções.
- O listener de comandos e o runtime de agendamento devem permanecer inalterados.
- Falha ao obter metadados nativos deve produzir identidade incompleta explícita, nunca string fixa do Portal.

---

### Task 1: Contrato BASIC e identidades

**Files:**
- Create: `src/basic-player-telemetry.js`
- Test: `tests/basic-player-telemetry.test.js`

**Interfaces:**
- Produces: `createBasicPlayerTelemetry({storage, now, randomId})`, `buildBasicTelemetryUpdate(snapshot)`.

- [ ] Escrever testes falhando para schema/profile, instalação persistente por identidade de build, nova sessão por processo, troca de versão/build, estado de conexão/playback e payload atômico sem campos avançados.
- [ ] Executar `node --test tests/basic-player-telemetry.test.js` e confirmar RED por módulo ausente.
- [ ] Implementar o produtor mínimo e armazenamento versionado.
- [ ] Executar o teste e confirmar GREEN.
- [ ] Commitar contrato e testes.

### Task 2: Metadados reais do APK e compilação

**Files:**
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/java/br/com/parksolutions/totempark/TotemDevicePlugin.java`
- Test: `tests/basic-player-native-metadata.test.js`

**Interfaces:**
- Consumes: campos `packageName`, `versionCode`, `versionName`, `buildId`, `buildTimestamp` esperados pelo Task 1.
- Produces: resposta nativa completa de `getAppInfo()`.

- [ ] Escrever teste falhando que valida PackageManager para versão e BuildConfig para buildId/timestamp, sem `VITE_APP_VERSION` como autoridade.
- [ ] Confirmar RED.
- [ ] Gerar BuildConfig fields a partir de ambiente/Git e timestamp de build; expor no plugin.
- [ ] Confirmar GREEN.
- [ ] Commitar metadados nativos.

### Task 3: Integração atômica no heartbeat RC

**Files:**
- Modify: `src/App.jsx`
- Test: `tests/player-basic-telemetry-integration.test.js`
- Test: `tests/player-heartbeat-coalescing.test.js`
- Test: `tests/player-schedule-v62.test.js`

**Interfaces:**
- Consumes: produtor BASIC e resposta `getAppInfo()`.
- Produces: `heartbeatPayload.telemetry` schema 5 completo no mesmo `updateDoc`; nenhum sink avançado no RC.

- [ ] Escrever testes falhando para publicação atômica, ausência de traffic/activity/history no RC, preservação do listener/comandos e intervalo existente.
- [ ] Confirmar RED.
- [ ] Integrar o produtor no Player RC, atualizar estado em memória por eventos existentes e congelar somente coleta/publicação avançada.
- [ ] Confirmar GREEN nos testes específicos e regressões de comandos/programação/cache.
- [ ] Commitar integração.

### Task 4: Ambiente, suíte completa e desenho definitivo

**Files:**
- Create: `docs/telemetria-basica-etapa-2-resultados.md`

**Interfaces:**
- Consumes: implementação e resultados das Tasks 1–3.
- Produces: evidência de testes, mapa final do heartbeat/listeners e riscos para Etapa 3.

- [ ] Executar `npm ci` apenas neste worktree para resolver `@capacitor/core`.
- [ ] Executar a suíte completa Node e registrar toda falha.
- [ ] Executar testes específicos de reprodução/cache/templates/comandos/programação.
- [ ] Documentar que o heartbeat de 15 s sustenta presença; comandos usam listener em tempo real independente da cadência; métricas não justificam writes adicionais.
- [ ] Confirmar ausência de mudanças em CSS/componentes visuais e ausência de artefatos APK.
- [ ] Commitar relatório final.
