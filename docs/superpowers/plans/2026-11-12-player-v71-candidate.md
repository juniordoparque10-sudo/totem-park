# Player Android V71 Candidate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar uma única APK candidata baseada integralmente em `5266a765`, com o contrato V2 aprovado e correções operacionais pendentes, sem publicação ou instalação.

**Architecture:** Quatro blocos sequenciais e independentes, implementados seletivamente sobre a base e fechados por testes/commit. Lógica nova será testada em módulos focados e conectada minimamente ao runtime existente; nenhum arquivo de outra branch será substituído integralmente.

**Tech Stack:** React/Vite, Node test runner, Firebase/Firestore, Capacitor Android, Java, Gradle.

**Spec:** `docs/superpowers/specs/2026-11-12-player-v71-candidate-design.md`

## Global Constraints

- Base exata e completa: `5266a765`; referência instalada: `28e4d610`; Portal comparativo: `8d489422`.
- Preservar Local First 2A.2, cache, vínculo, playlists, comandos remotos, telemetria e todos os motores V2 atuais.
- Não modificar Firebase Rules, Portal publicado, interfaces administrativas, planos ou cobrança.
- Não instalar nem publicar; gerar somente uma APK candidata inequivocamente versionada.
- Não limpar indiscriminadamente cache, mídia ou vínculo e não aumentar o intervalo de heartbeat.
- Cada bloco exige RED, GREEN, suíte direcionada e commit antes do bloco seguinte.

## Review Focus

- Documento antigo sem `showLogo`, `showName` ou transparência deve normalizar todos como visíveis/default 58 sem perder campos desconhecidos.
- Quota durante uma gravação opcional não pode apagar nem invalidar cache, mídia ou vínculo já existentes.
- Mudança de fuso/DST e virada de meia-noite deve selecionar a playlist correta sem relógio/render redundante.
- Reconexão após cold boot offline deve manter RSS/cache e retomar listeners/comandos sem duplicá-los.
- Broadcast de boot bloqueado pelo fabricante deve falhar de forma segura e continuar permitindo abertura manual.

---

### Task 1: Contrato visual Templates V2

**Files:**
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/registry.js`
- Modify: `src/templates-v2/TemplateLogo.jsx`
- Modify: `src/templates-v2/TemplateV2Renderer.jsx`
- Modify: estilos V2 estritamente necessários em `src/templates-v2/*.css`
- Test: `tests/templates-v2-visual-contract.test.js`
- Test: testes existentes de schema/render V2

**Interfaces:**
- Consumes: documentos V2 draft/published existentes.
- Produces: `showLogo:boolean`, `showName:boolean`, `forecastCardTransparency:number` normalizados; renderer independente de branding e variável alpha restrita aos cards.

- [ ] Escrever testes falhos para defaults legados, persistência de campos desconhecidos, quatro combinações de nome/logo e alpha 0/58/100 aplicado apenas ao fundo.
- [ ] Executar os testes e confirmar falhas causadas pela ausência do contrato novo.
- [ ] Implementar o contrato mínimo a partir dos diffs funcionais da Rodada 1, sem importar editor/admin do Portal.
- [ ] Executar testes novos e toda a suíte V2 direcionada; revisar diff contra `5266a765`.
- [ ] Commitar o bloco visual isoladamente.

### Task 2: Notícias V2, capabilities e playlists agendadas

**Files:**
- Modify apenas os módulos runtime identificados pelos commits `57d75187`, `6a6b60e7`, `1fd714b8`
- Modify, se necessário: `src/player-playlist-schedule.js` ou módulo equivalente existente
- Test: testes existentes de Notícias/capabilities/cache
- Test: testes de agendamento e timezone

**Interfaces:**
- Consumes: snapshots publicados, vínculo `ACTIVE`, capabilities V70 e timezone da playlist.
- Produces: seleção determinística da playlist vigente com atualização de relógio sem renders redundantes.

- [ ] Escrever/portar testes falhos para ativação agendada, timezone explícito, DST/virada de dia e ausência de intervalos/render redundantes.
- [ ] Confirmar RED na base após o Bloco 1.
- [ ] Reconstruir seletivamente a lógica dos três commits, preservando Notícias V2/RSS/cache de `5266a765`.
- [ ] Executar testes de schedule, capabilities, vínculo, Notícias V2 e cold boot; revisar diff.
- [ ] Commitar o bloco de reprodução/agendamento isoladamente.

### Task 3: Android, manutenção 9:16, autoboot e quota

**Files:**
- Modify: `src/App.css` somente nas regras de manutenção portrait necessárias
- Modify: `android/app/src/main/AndroidManifest.xml` se comprovadamente necessário
- Modify: `android/app/src/main/java/br/com/parksolutions/totempark/BootReceiver.java` se comprovadamente necessário
- Create/Modify: módulo pequeno de escrita segura de storage no runtime web
- Modify: integrações pontuais no cache/vínculo que usam esse módulo
- Test: testes de manutenção portrait, contrato de boot e storage quota

**Interfaces:**
- Consumes: storage WebView, cache de mídia, vínculo persistido e broadcasts Android.
- Produces: escrita classificada como obrigatória/opcional; falha `QuotaExceededError` sem limpeza; manutenção 16:9/9:16 estável; boot idempotente e seguro.

- [ ] Escrever testes falhos reproduzindo quota com dados existentes, orientação 9:16 e intents de boot duplicadas/indisponíveis.
- [ ] Confirmar RED para cada falha real antes de editar produção.
- [ ] Implementar escrita segura sem remoção global e os ajustes mínimos comprovados de CSS/Android.
- [ ] Executar testes novos, cache/offline/link e testes Android de contrato; revisar diff.
- [ ] Commitar o bloco Android/storage isoladamente.

### Task 4: Eficiência Firestore e candidata Android

**Files:**
- Modify: módulos de sync/heartbeat/listeners estritamente necessários
- Modify: `src/App.jsx` somente nos pontos de integração comprovados
- Modify: `android/app/build.gradle` para identificação candidata inequívoca
- Test: testes de now-playing, heartbeat, telemetria, histórico e lifecycle de listeners

**Interfaces:**
- Consumes: estado operacional do Player e snapshots Firestore.
- Produces: deduplicação de gravações idênticas e listeners com cleanup, sem reduzir frequência funcional nem perder eventos.

- [ ] Escrever testes falhos para gravações idênticas, listener órfão/reconexão e preservação de comando/telemetria/histórico.
- [ ] Confirmar RED e estabelecer contagens antes/depois nos testes controlados.
- [ ] Implementar somente deduplicação/cleanup comprovados; não alterar heartbeat funcional.
- [ ] Reexecutar os 156 testes de referência e todos os novos testes; executar lint direcionado e build web.
- [ ] Comparar `git diff 5266a765...HEAD`, confirmar ausência de Rules/admin/exclusões inesperadas e revisar todas as Templates V2.
- [ ] Definir versão candidata posterior à V70 sem colisão com produção e gerar uma única APK pelo variant oficial de Player.
- [ ] Inspecionar manifest, package, versionCode/versionName, SHA-256 e conteúdo do APK; não instalar nem publicar.
- [ ] Commitar metadados/eficiência e registrar a matriz final, mantendo gates físicos explícitos.
