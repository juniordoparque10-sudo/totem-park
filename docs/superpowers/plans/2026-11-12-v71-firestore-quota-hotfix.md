# V71 Firestore Quota Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recuperar o Firestore da V71 quando metadados multiaba esgotam o localStorage e restaurar o heartbeat ONLINE.

**Architecture:** Seleção de tab manager por plataforma e um recuperador isolado que aguarda `waitForPendingWrites`, limpa somente metadados multiaba reconhecidos e solicita heartbeat posterior. Falha/offline mantém todos os dados e agenda nova tentativa.

**Tech Stack:** Firebase 12.14.0, React, Capacitor Android, Node test runner, Gradle.

**Spec:** `docs/superpowers/specs/2026-11-12-v71-firestore-quota-hotfix-design.md`

## Global Constraints

- Single-tab somente no Player Android; Portal permanece multi-tab.
- Nunca remover IndexedDB, vínculo, mídia, playlists, telemetria ou comandos.
- Nunca limpar antes de `waitForPendingWrites()` resolver.
- Falha/offline não bloqueia reprodução.
- Não instalar nem publicar.

## Review Focus

- Cota já cheia antes do boot: Firestore deve inicializar sem nova escrita multiaba.
- `waitForPendingWrites` rejeita: nenhuma chave é removida.
- Confirmação pendente: nenhuma limpeza antecipada.
- Chaves não-Firestore e de outro banco: preservadas.
- Recuperação concluída: heartbeat imediato é solicitado e erros permanecem observáveis.

---

### Task 1: Política single-tab nativa

**Files:** `src/firestore-cache-policy.js`, `src/firebase.js`, `tests/firestore-cache-policy.test.js`

- [ ] Escrever teste RED para Android Player => single-tab; Portal => multi-tab.
- [ ] Implementar seleção mínima do tab manager.
- [ ] Executar teste GREEN e commit.

### Task 2: Recuperação segura e heartbeat

**Files:** `src/firestore-multitab-recovery.js`, `src/App.jsx`, `tests/firestore-multitab-recovery.test.js`

- [ ] Escrever testes RED com `QuotaExceededError`, confirmação, falha, pendência e preservação.
- [ ] Implementar classificação/limpeza direcionada somente após confirmação.
- [ ] Integrar retry não bloqueante e heartbeat imediato após recuperação.
- [ ] Executar testes GREEN e regressões operacionais.

### Task 3: APK hotfix separada

**Files:** `android/app/build.gradle`, assets `playerRc`, `artifacts/player-v71-firestore-quota-hotfix/`

- [ ] Definir identificação inequívoca posterior à V71 candidata.
- [ ] Executar suíte, lint direcionado e build `playerRc`.
- [ ] Gerar uma APK sem instalar/publicar; validar package, versão, assinatura e SHA-256.
