# Totem Park Player V56 — Integração seletiva Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir seletivamente a V55 comprovada sobre `c49579b`, validar sua equivalência e somente então integrar oito Templates V2, logos, manutenção navy e Telemetria V2-A em uma APK experimental preservando package, assinatura, vínculo, dados e cache.

**Architecture:** O plano usa gates sequenciais: inventário físico e de origem, recuperação mínima da V55, equivalência operacional, funcionalidades V56 e empacotamento final. O Player continua sendo o Player Web compartilhado empacotado no flavor experimental; a Telemetria V2-A separa conectividade de reprodução comprovada, mantém journal local limitado e só sincroniza se as Rules atuais aceitarem o contrato sem alteração.

**Tech Stack:** React 19, Vite 8, JavaScript ESM, Node test runner, Capacitor 8, Android/Gradle, Firebase Auth/Firestore em emuladores, ADB, apksigner/apkanalyzer, Vercel Preview.

**Spec:** `docs/superpowers/specs/2026-10-15-player-v56-integracao-seletiva-design.md`

## Global Constraints

- Partir exatamente de `c49579bf1ec06f64dbb06e8b0165c2cb13ffab83` em worktree/branch isoladas.
- Não copiar a árvore local suja em bloco; cada recuperação V55 precisa de origem, diff/hash, comportamento e teste.
- Não alterar nem instalar sobre a V55 física, não modificar V51 e não limpar dados, cache, identidade ou vínculo.
- Não alterar Firebase Rules, Functions, Storage, permissões ou dados de produção.
- Não implementar etapa dependente de uma lacuna essencial da V55; registrar o bloqueio e parar essa cadeia, sem improviso.
- Não inferir reprodução por heartbeat, uptime ou conectividade: conexão e reprodução efetiva são dimensões independentes.
- Não publicar Web/Android em produção e não instalar APK automaticamente.
- Definir versionCode/versionName somente após confirmar os metadados da V55 instalada e seu certificado.
- O artefato final, se todos os gates passarem, será uma única APK chamada `Totem Park Player V56.apk`.

## Review Focus

- V55 instalada com versionCode, package ou certificado divergente deve bloquear versionamento/build final — coberto na Tarefa 1.
- Um evento `OFFLINE` de rede enquanto mídia local continua tocando não pode encerrar reprodução — coberto na Tarefa 7.
- Uma lacuna de origem em Secure Link, `exitTv`, Local First ou recuperação deve bloquear somente as etapas dependentes e impedir a APK — coberto nas Tarefas 2, 3 e 10.
- Falha de permissão ou rede na telemetria deve manter o lote local sem afetar vínculo, cache ou playback — coberto na Tarefa 8.
- Bundle Android obsoleto ou de outro flavor não pode entrar na APK — coberto nas Tarefas 4 e 10.

---

### Task 1: Inventário físico e manifesto de proveniência da V55

**Files:**
- Create: `docs/verification/player-v56-v55-provenance.md`
- Create: `scripts/verify-player-v56-metadata.ps1`
- Test: `tests/player-v56-metadata-script.test.js`
- Inspect only: `android/app/build.gradle`
- Inspect only: `android/app/src/playerRc/AndroidManifest.xml`
- Inspect only: `android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java`

**Interfaces:**
- Consumes: base Git `c49579b`, pacote físico `br.com.parksolutions.totempark.player.rcsecurelink`, ADB `192.168.31.251` quando disponível.
- Produces: manifesto com `installedPackage`, `activity`, `versionCode`, `versionName`, `certificateSha256`, candidatos V55 e decisão `PASS | BLOCKED`; script `verify-player-v56-metadata.ps1 -AdbSerial <serial> -PackageName <package>` que apenas lê metadados.

- [ ] **Step 1: Write the failing structural test**

Criar `player-v56-metadata-script.test.js` exigindo que o script use somente `adb shell dumpsys package`, `adb shell pm path`, `adb pull` para arquivo temporário e inspeção por `apksigner`; rejeitar `install`, `uninstall`, `pm clear`, escrita remota ou `adb shell rm`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/player-v56-metadata-script.test.js`  
Expected: FAIL porque o script ainda não existe.

- [ ] **Step 3: Implement the read-only metadata collector**

O script deve retornar um objeto/JSON resumido e nunca imprimir tokens ou dados de outros pacotes. Não decidir o novo versionCode.

- [ ] **Step 4: Run the collector and fill the provenance manifest**

Run: `powershell -ExecutionPolicy Bypass -File scripts/verify-player-v56-metadata.ps1 -AdbSerial 192.168.31.251 -PackageName br.com.parksolutions.totempark.player.rcsecurelink`  
Expected: package, Activity, versionCode/versionName e certificado; se ADB ou pacote estiver indisponível, registrar `BLOCKED` sem mutação.

- [ ] **Step 5: Inventory candidate V55 sources**

Comparar somente arquivos candidatos da árvore principal/artefatos conhecidos com `c49579b`, registrando caminho de origem, hash, diff resumido, requisito protegido e teste. Marcar bundles/APKs como evidência, nunca como fonte.

- [ ] **Step 6: Verify and commit**

Run: `node --test tests/player-v56-metadata-script.test.js`  
Expected: PASS.

```bash
git add docs/verification/player-v56-v55-provenance.md scripts/verify-player-v56-metadata.ps1 tests/player-v56-metadata-script.test.js
git commit -m "test: inventory V55 provenance and installed metadata"
```

### Task 2: Recuperação seletiva do flavor e ciclo Secure Link V55

**Files:**
- Modify only when listed as proven in Task 1: `android/app/build.gradle`
- Modify only when proven: `android/app/src/playerRc/AndroidManifest.xml`
- Modify only when proven: `android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java`
- Modify only when proven: `src/App.jsx`
- Modify only when proven: `src/player-identity.js`
- Modify only when proven: `src/player-local-first.js`
- Create or recover only when proven: `scripts/prepare-player-rc-secure-link-assets.mjs`
- Test: `tests/player-v56-secure-link-equivalence.test.js`
- Test: existing `tests/player-binding-functions.test.mjs`
- Test: existing `tests/player-identity.test.js`
- Test: existing `tests/player-rebind.test.cjs`
- Test: existing `tests/offline-player-cache-identity.test.js`

**Interfaces:**
- Consumes: Task 1 provenance entries marked `PROVEN`.
- Produces: flavor experimental com package/label/Activity comprovados; ciclo Secure Link e `exitTv` equivalente à V55; qualquer entrada `BLOCKED` gera relatório e impede Tasks 3–10 dependentes.

- [ ] **Step 1: Write the failing equivalence tests**

Fixar: timestamp ISO válido; ausência/invalidez rejeitada; comando antigo e já processado rejeitado; comando recente autorizado aceito; falha transitória/`failed-precondition` não limpa vínculo; revogação confirmada e saída voluntária concluída limpam vínculo.

- [ ] **Step 2: Run the focused tests to establish the baseline**

Run: `node --test tests/player-v56-secure-link-equivalence.test.js tests/player-identity.test.js tests/player-rebind.test.cjs tests/offline-player-cache-identity.test.js`  
Expected: novos contratos falham; existentes permanecem verdes ou revelam lacuna documentada.

- [ ] **Step 3: Transfer only proven deltas**

Aplicar por arquivo o menor diff do manifesto. Para cada transferência, atualizar `player-v56-v55-provenance.md` com commit/origem e teste. Não editar Functions ou Rules.

- [ ] **Step 4: Verify Secure Link without production mutation**

Run: `node --test tests/player-v56-secure-link-equivalence.test.js tests/player-identity.test.js tests/player-rebind.test.cjs tests/offline-player-cache-identity.test.js`  
Expected: PASS.

- [ ] **Step 5: Verify callable behavior in emulators only**

Run: `npm run test:functions:identity`  
Expected: PASS sem acessar dados de produção.

- [ ] **Step 6: Commit or block**

Se qualquer comportamento essencial não tiver fonte comprovada, registrar `BLOCKED` e não commitar implementação presumida.

```bash
git add android/app/build.gradle android/app/src/playerRc/AndroidManifest.xml android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java src/App.jsx src/player-identity.js src/player-local-first.js scripts/prepare-player-rc-secure-link-assets.mjs tests/player-v56-secure-link-equivalence.test.js docs/verification/player-v56-v55-provenance.md
git commit -m "fix: restore proven V55 secure-link lifecycle"
```

### Task 3: Gate Local First, cache, offline, recuperação e controle remoto

**Files:**
- Modify only when proven: `src/offline-player-cache.js`
- Modify only when proven: `src/native-cache-identity.js`
- Modify only when proven: `src/native-cache-journal.js`
- Modify only when proven: `src/native-cache-transaction.js`
- Modify only when proven: `src/player-cache-state.js`
- Modify only when proven: `src/App.jsx`
- Test: `tests/player-v56-operational-equivalence.test.js`
- Test: existing `tests/player-cache-state.test.js`
- Test: existing `tests/template-offline-cache.test.js`
- Test: existing `tests/v40-cache-safety.test.js`
- Test: existing `tests/web-cache-retention.mjs`

**Interfaces:**
- Consumes: flavor e ciclo Secure Link aprovados na Task 2.
- Produces: `V55_OPERATIONAL_EQUIVALENCE=PASS` no manifesto, necessário para iniciar Task 4; vínculo, cache, offline, recuperação e controle remoto protegidos.

- [ ] **Step 1: Write the failing operational equivalence test**

Cobrir: estado local carregado antes da rede; playlist/cache válidos reproduzem offline; reinício de processo/WebView preserva identidade; falha de rede não apaga vínculo/cache; manutenção/blackout/pausa/retomada/troca/saída legítima mantêm semântica V55.

- [ ] **Step 2: Run the focused baseline**

Run: `node --test tests/player-v56-operational-equivalence.test.js tests/player-cache-state.test.js tests/template-offline-cache.test.js tests/v40-cache-safety.test.js tests/web-cache-retention.mjs`  
Expected: novos contratos falham até os deltas comprovados serem recuperados.

- [ ] **Step 3: Transfer only proven operational deltas**

Não reestruturar o Player. Recuperar apenas arquivos/trechos listados no manifesto e manter chaves de storage existentes.

- [ ] **Step 4: Run the focused gate**

Run: mesmo comando do Step 2.  
Expected: PASS, sem escrita externa.

- [ ] **Step 5: Record the gate result and commit**

Marcar `PASS` somente com todos os requisitos essenciais verdes; caso contrário marcar `BLOCKED`, listar a lacuna e parar Tasks 4–10.

```bash
git add src/offline-player-cache.js src/native-cache-identity.js src/native-cache-journal.js src/native-cache-transaction.js src/player-cache-state.js src/App.jsx tests/player-v56-operational-equivalence.test.js docs/verification/player-v56-v55-provenance.md
git commit -m "fix: restore proven V55 offline and recovery behavior"
```

### Task 4: Empacotamento determinístico do Player Web experimental

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create or Modify: `scripts/prepare-player-rc-secure-link-assets.mjs`
- Test: `tests/player-v56-bundle-isolation.test.js`
- Generated and never hand-edited: `android/app/src/playerRcSecureLinkExperiment/assets/public/**`

**Interfaces:**
- Consumes: `V55_OPERATIONAL_EQUIVALENCE=PASS`; `dist/` produzido por `npm run build:player-rc-secure-link`.
- Produces: comandos `build:player-rc-secure-link` e `prepare:player-rc-secure-link`; assets do flavor substituídos atomicamente apenas a partir do build atual.

- [ ] **Step 1: Write the failing bundle-isolation test**

Exigir diretório de destino exato, limpeza apenas desse destino, manifesto de hashes e rejeição de bundles dos flavors `web`, `playerRc`, `playerLab` ou builds anteriores.

- [ ] **Step 2: Run it to verify failure**

Run: `node --test tests/player-v56-bundle-isolation.test.js`  
Expected: FAIL enquanto os comandos/paths não existirem na base consolidada.

- [ ] **Step 3: Implement minimal build and preparation commands**

O script recebe explicitamente `distDir` e `targetDir`, valida `index.html` e assets referenciados, copia para temporário dentro do flavor e troca somente após validação.

- [ ] **Step 4: Verify the Player bundle**

Run: `npm run build:player-rc-secure-link`  
Run: `npm run prepare:player-rc-secure-link`  
Run: `node --test tests/player-v56-bundle-isolation.test.js`  
Expected: PASS e manifesto contendo apenas hashes do build corrente.

- [ ] **Step 5: Commit source and tests, excluding generated assets unless repository policy requires them**

```bash
git add package.json vite.config.js scripts/prepare-player-rc-secure-link-assets.mjs tests/player-v56-bundle-isolation.test.js
git commit -m "build: isolate V56 player web assets"
```

### Task 5: Oito Templates V2 e compatibilidade do Player

**Files:**
- Modify only if tests expose a gap: `src/templates-v2/registry.js`
- Modify only if tests expose a gap: `src/templates-v2/TemplateV2Renderer.jsx`
- Modify only if tests expose a gap: `src/templates-v2/player-capability.js`
- Modify only if tests expose a gap: `src/templates-v2/player-execution.js`
- Modify only if tests expose a gap: `src/templates-v2/offline-data-cache.js`
- Test: `tests/player-v56-eight-templates.test.js`
- Test: existing `tests/templates-v2-consolidated-player-web.test.js`
- Test: existing `tests/template-v2-dynamic-rotation.test.js`
- Test: existing `tests/template-v2-playback-execution.test.js`
- Test: existing `tests/template-offline-cache.test.js`

**Interfaces:**
- Consumes: Player bundle isolado da Task 4 e os oito tipos já registrados em `c49579b`.
- Produces: `getPlayerV2Capabilities()` anunciando somente tipos realmente suportados; todos os renderers usam duração efetiva do item como limite absoluto.

- [ ] **Step 1: Write the failing eight-template contract test**

Asserir os tipos `smart-lobby`, `agenda-info`, `promotion-campaign`, `digital-menu`, `kpi-indicators`, `qr-interaction`, `news-editorial-dynamic` e `market-premium`, em 16:9/9:16, sem conversão de documentos legados.

- [ ] **Step 2: Run focused template tests**

Run: `node --test tests/player-v56-eight-templates.test.js tests/templates-v2-consolidated-player-web.test.js tests/template-v2-dynamic-rotation.test.js tests/template-v2-playback-execution.test.js tests/template-offline-cache.test.js`  
Expected: identificar apenas lacunas reais do Player; não modificar código se já passar.

- [ ] **Step 3: Implement only proven compatibility gaps**

Manter um único renderer compartilhado, limpar timers ao trocar/encerrar item e nunca ultrapassar `effectiveDurationMs`.

- [ ] **Step 4: Re-run and commit only if files changed**

Expected: PASS.

```bash
git add src/templates-v2 tests/player-v56-eight-templates.test.js
git commit -m "feat: enable consolidated V2 templates in V56"
```

### Task 6: Contrato compartilhado de dimensionamento de logos

**Files:**
- Create: `src/templates-v2/TemplateLogo.jsx`
- Create: `src/templates-v2/template-logo.css`
- Modify: renderers dos oito tipos em `src/templates-v2/**/**Renderer.jsx` somente nos slots de logo
- Test: `tests/player-v56-template-logo.test.js`

**Interfaces:**
- Consumes: props `{ src, alt, className, maxWidth, maxHeight }` dos slots semânticos de logo.
- Produces: `TemplateLogo` com `object-fit: contain`, proporção preservada e ausência segura; não afeta backgrounds, produtos, notícias ou mídia principal.

- [ ] **Step 1: Write the failing logo contract test**

Cobrir logo horizontal, quadrado, muito grande e ausente; asserir que seletores/estilos não alcançam classes de produto/background/news image.

- [ ] **Step 2: Run it to verify failure**

Run: `node --test tests/player-v56-template-logo.test.js`  
Expected: FAIL porque o componente comum ainda não existe.

- [ ] **Step 3: Implement `TemplateLogo` and replace only logo slots**

Não alterar URLs, Storage ou dimensões dos demais elementos.

- [ ] **Step 4: Verify logos and template regressions**

Run: `node --test tests/player-v56-template-logo.test.js tests/templates-v2-dynamic-renderers.test.js tests/template-v2-web-assets-and-layout.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/templates-v2 tests/player-v56-template-logo.test.js
git commit -m "feat: normalize V2 template logo sizing"
```

### Task 7: Tela de manutenção navy aprovada

**Files:**
- Create: `src/player/MaintenanceScreen.jsx`
- Create: `src/player/maintenance-screen.css`
- Modify: `src/App.jsx`
- Reuse: `src/assets/logo.png`
- Test: `tests/player-v56-maintenance-screen.test.js`

**Interfaces:**
- Consumes: boolean/comando de manutenção existente e orientação do Player.
- Produces: `MaintenanceScreen({ orientation })`; não altera splash, pareamento, offline, blackout ou erro.

- [ ] **Step 1: Write the failing visual/behavior contract test**

Asserir logo original, título `MODO DE MANUTENÇÃO`, texto aprovado, rodapé, animação contínua sem percentual, classes portrait/landscape e montagem apenas no estado de manutenção.

- [ ] **Step 2: Run it to verify failure**

Run: `node --test tests/player-v56-maintenance-screen.test.js`  
Expected: FAIL porque o componente isolado não existe.

- [ ] **Step 3: Implement the component and route the existing state to it**

Usar CSS/code-native; não gerar ou redesenhar o logo e não adicionar temporizador de progresso.

- [ ] **Step 4: Verify maintenance and remote-command regression**

Run: `node --test tests/player-v56-maintenance-screen.test.js tests/player-v56-operational-equivalence.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/player/MaintenanceScreen.jsx src/player/maintenance-screen.css src/App.jsx tests/player-v56-maintenance-screen.test.js
git commit -m "feat: add approved navy maintenance screen"
```

### Task 8: Modelo Telemetria V2-A — conexão separada de reprodução

**Files:**
- Create: `src/player-activity-telemetry.js`
- Modify: `src/player-telemetry.js`
- Modify: `src/App.jsx`
- Test: `tests/player-activity-telemetry.test.js`
- Test: existing `tests/player-telemetry.test.js`
- Test: existing `tests/telemetry-activity-history.test.js`

**Interfaces:**
- Consumes: eventos reais do lifecycle do Player (`PLAYBACK_START`, `PLAYBACK_END`, `PLAYBACK_ERROR`, `INTERRUPTED`, `RECOVERED`) e mudanças independentes `ONLINE | OFFLINE`.
- Produces: `createPlayerActivityTelemetry({ storage, now, maxEvents = 200 })` com `setConnection(status)`, `startPlayback(item)`, `finishPlayback(reason)`, `interrupt(reason)`, `recover(item)`, `drainBatch(limit)`, `acknowledge(ids)` e `getState()`.

- [ ] **Step 1: Write failing domain tests**

Cobrir vídeo, imagem e template; `OFFLINE` com mídia local tocando mantém playback `ACTIVE`; heartbeat/uptime não cria evento; início/fim comprovados criam períodos; troca de item fecha/abre corretamente; duplicatas são ignoradas; limite é 200.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/player-activity-telemetry.test.js tests/player-telemetry.test.js tests/telemetry-activity-history.test.js`  
Expected: FAIL no novo módulo.

- [ ] **Step 3: Implement the local state machine and wire real lifecycle calls**

Conectividade atualiza somente `connectionStatus`. Reprodução só muda por confirmação do renderer/lifecycle; nunca por `navigator.onLine`, heartbeat ou uptime.

- [ ] **Step 4: Verify domain and Portal compatibility**

Run: mesmo comando do Step 2.  
Expected: PASS; helper do Portal aceita os eventos reais e não cria segmentos a partir de conexão.

- [ ] **Step 5: Commit**

```bash
git add src/player-activity-telemetry.js src/player-telemetry.js src/App.jsx tests/player-activity-telemetry.test.js tests/player-telemetry.test.js tests/telemetry-activity-history.test.js
git commit -m "feat: track real V2-A playback activity"
```

### Task 9: Journal, lote econômico e gate de permissões da Telemetria V2-A

**Files:**
- Modify: `src/player-activity-telemetry.js`
- Modify: `src/App.jsx`
- Test: `tests/player-activity-telemetry-sync.test.js`
- Test: `tests/firestore-player-activity.rules.test.mjs`
- Modify only if needed for emulator test wiring, not semantics: `firebase.test.json`

**Interfaces:**
- Consumes: `drainBatch(limit)` e `acknowledge(ids)` da Task 8, heartbeat existente e identidade vinculada válida.
- Produces: `syncPlayerActivityBatch({ screenRef, events, updateDoc }) -> { status: "synced" | "retry" | "blocked", acknowledgedIds: string[] }`; nenhuma Function nova.

- [ ] **Step 1: Write failing sync and Rules tests**

Cobrir lote somente quando heartbeat existente já estiver sincronizando; nenhuma escrita em heartbeat sem evento; retry preserva outbox; permission-denied retorna `blocked`; troca de UID/screenId é negada; binding revogado é negado; falha não toca vínculo/cache/playback.

- [ ] **Step 2: Run unit tests to verify failure**

Run: `node --test tests/player-activity-telemetry-sync.test.js`  
Expected: FAIL porque o adaptador não existe.

- [ ] **Step 3: Implement the minimal sync adapter behind existing telemetry enablement**

Não aumentar frequência do heartbeat. Limitar payload e remover localmente apenas IDs confirmados.

- [ ] **Step 4: Prove current Rules compatibility in emulators**

Run: `firebase emulators:exec --project demo-totem-v56-telemetry --config firebase.test.json --only firestore "node --test tests/firestore-player-activity.rules.test.mjs"`  
Expected: PASS permite identidade vinculada e nega demais. Se falhar por necessidade de nova Rule/permissão, marcar sync `BLOCKED`, não alterar Rules e manter apenas journal local.

- [ ] **Step 5: Verify non-interference**

Run: `node --test tests/player-activity-telemetry.test.js tests/player-activity-telemetry-sync.test.js tests/player-v56-operational-equivalence.test.js`  
Expected: PASS.

- [ ] **Step 6: Commit the authorized result**

Se o gate de Rules bloquear, o commit inclui journal + sync desativado e o relatório do bloqueio; nunca inclui alteração de Rules.

```bash
git add src/player-activity-telemetry.js src/App.jsx tests/player-activity-telemetry-sync.test.js tests/firestore-player-activity.rules.test.mjs firebase.test.json docs/verification/player-v56-v55-provenance.md
git commit -m "feat: add gated V2-A telemetry batching"
```

### Task 10: Verificação integrada, Preview e APK experimental

**Files:**
- Modify only after Task 1 confirms installed metadata: `android/app/build.gradle`
- Create: `scripts/verify-player-v56-apk.ps1`
- Test: `tests/player-v56-release-contract.test.js`
- Generated: `dist/**`
- Generated: `android/app/build/outputs/apk/playerRcSecureLinkExperiment/debug/*.apk`
- Output: `artifacts/Totem Park Player V56.apk`

**Interfaces:**
- Consumes: todos os gates anteriores; versionCode/versionName e certificado da Task 1; bundle isolado da Task 4.
- Produces: um Preview Vercel isolado, uma APK somente se todos os gates estiverem `PASS`, relatório final com checksum, package, Activity, versões e assinatura.

- [ ] **Step 1: Write the failing release-contract test**

Exigir: base `c49579b` ancestral; manifesto sem `BLOCKED`; versionCode exatamente instalado + 1; package e certificado iguais; output único; nenhum arquivo V51; nenhum deploy Firebase/produção.

- [ ] **Step 2: Run it before versioning**

Run: `node --test tests/player-v56-release-contract.test.js`  
Expected: FAIL enquanto metadados/build/artefato não estiverem completos.

- [ ] **Step 3: Set version only from confirmed installed metadata**

Se a instalada for versionCode 55, usar 56 e versionName V56; se divergir, parar sem gerar APK.

- [ ] **Step 4: Run focused tests and lint**

Run: `node --test tests/player-v56-*.test.js tests/player-activity-telemetry*.test.js tests/templates-v2-consolidated-player-web.test.js tests/template-v2-dynamic-rotation.test.js tests/template-v2-playback-execution.test.js tests/template-offline-cache.test.js tests/player-identity.test.js tests/player-rebind.test.cjs tests/player-cache-state.test.js tests/telemetry-activity-history.test.js`  
Run: `npx eslint src/player-activity-telemetry.js src/player-telemetry.js src/player/MaintenanceScreen.jsx src/templates-v2 scripts/prepare-player-rc-secure-link-assets.mjs tests/player-v56-*.test.js tests/player-activity-telemetry*.test.js`  
Expected: PASS/zero errors.

- [ ] **Step 5: Build Web and publish one isolated Preview**

Run: `npm run build`  
Run: `npx vercel`  
Expected: build aprovado e URL Preview; não usar `--prod`.

- [ ] **Step 6: Prepare current Player assets and build one flavor**

Run: `npm run build:player-rc-secure-link`  
Run: `npm run prepare:player-rc-secure-link`  
Run from `android`: `./gradlew.bat :app:assemblePlayerRcSecureLinkExperimentDebug`  
Expected: uma APK do flavor experimental; nenhuma tarefa V51.

- [ ] **Step 7: Verify and copy the APK without installing**

O script deve comparar package, Activity, versionCode/versionName, SHA-256 do certificado e checksum. Só então copiar para `artifacts/Totem Park Player V56.apk`.

Run: `powershell -ExecutionPolicy Bypass -File scripts/verify-player-v56-apk.ps1 -InstalledMetadata docs/verification/player-v56-v55-provenance.md -ApkPath <generated-apk>`  
Expected: `PASS` e um único output; não executar `adb install`.

- [ ] **Step 8: Run release contract and inspect Git scope**

Run: `node --test tests/player-v56-release-contract.test.js`  
Run: `git diff --check c49579b...HEAD`  
Run: `git status --short`  
Expected: PASS; somente fontes, testes, documentação e artefatos autorizados.

- [ ] **Step 9: Commit release preparation**

```bash
git add android/app/build.gradle scripts/verify-player-v56-apk.ps1 tests/player-v56-release-contract.test.js docs/verification/player-v56-v55-provenance.md
git commit -m "build: prepare verified V56 experimental artifact"
```

## Stop conditions

Interromper imediatamente a cadeia afetada e reportar, sem correção presumida, quando ocorrer qualquer uma destas condições:

- componente essencial V55 sem origem verificável;
- package, Activity, versionCode ou certificado da instalação não conciliável;
- teste de Secure Link, `exitTv`, Local First, cache, offline, recuperação ou controle remoto sem equivalência;
- Telemetria V2-A exigindo Rule, Function ou permissão nova;
- necessidade de limpar dados, revogar vínculo ou desinstalar a V55;
- build incluindo flavor/bundle diferente do experimental aprovado;
- alteração necessária em V51 ou produção.

## Entregáveis finais previstos

- manifesto de proveniência e gates V55;
- commits isolados por tarefa aprovada;
- oito Templates V2 e logos validados no Player;
- manutenção navy validada;
- Telemetria V2-A com conexão e reprodução independentes;
- um Preview Vercel isolado;
- `Totem Park Player V56.apk`, somente se todos os gates permitirem;
- relatório objetivo de testes, package, versão, assinatura, checksum e eventuais bloqueios.
