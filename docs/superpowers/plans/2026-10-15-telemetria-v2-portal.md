# Telemetria V2 Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adequar visualmente a Telemetria administrativa às duas referências aprovadas e adicionar o Histórico de Atividade baseado exclusivamente em eventos reais.

**Architecture:** Evoluir o dashboard atual sem criar rotas, listeners ou fontes de dados. Um helper puro normaliza eventos V2-A e calcula somente períodos comprovados; `TelemetryDashboard.jsx` consome esse contrato e o CSS novo permanece local, importado pelo componente e prefixado por `.telemetry-v2`.

**Tech Stack:** React 19, JavaScript, Firestore somente leitura existente, CSS local, Node test runner, Vite e Vercel Preview.

**Spec:** `docs/superpowers/specs/2026-10-15-telemetria-v2-portal-design.md`

## Global Constraints

- Usar obrigatoriamente `01-telemetria-visao-geral.png` e `02-telemetria-historico-detalhado.png` como referências de hierarquia e composição.
- Não modificar sidebar, cabeçalho, temas, tipografia global, Dashboard principal ou componentes externos à Telemetria.
- Não alterar Firebase, Rules, Functions, índices, coleções, heartbeat, Player Web ou Android.
- Não criar listeners, consultas ou gravações adicionais.
- Não inferir reprodução por heartbeat, sessão, uptime ou última comunicação.
- Exibir `Aguardando dados da Telemetria V2-A` quando faltarem eventos históricos reais.
- Preservar os cinco indicadores superiores, gráficos, cards, filtros, tabela, detalhe lateral, PDF e ordenação estável atuais.
- Todo CSS novo deve estar em `src/telemetry-v2.css` e ser descendente de `.telemetry-v2`.
- Gerar somente um Preview Vercel isolado e nunca publicar em produção.

## Review Focus

- Eventos fora de ordem ou com timestamps iguais devem produzir ordem determinística sem duração negativa — coberto na Task 1.
- Evento final sem sucessor não deve ser estendido até `now` — coberto na Task 1.
- Heartbeat, uptime e `lastSeenAt` isolados não podem produzir histórico — coberto na Task 1.
- Troca de filtros não pode desestabilizar a ordem das linhas nem misturar telas de clientes diferentes — coberto na Task 4.
- Timeline larga em celular deve rolar dentro do componente, sem overflow horizontal da página — coberto na Task 3.

---

### Task 1: Contrato puro do Histórico de Atividade

**Files:**
- Create: `src/telemetry-activity-history.js`
- Create: `tests/telemetry-activity-history.test.js`

**Interfaces:**
- Consumes: documento de tela já carregado e intervalo `{ startMs, endMs }`.
- Produces: `normalizeTelemetryActivityEvents(screen, range)`, `buildTelemetryActivityPeriods(events, range)` e `summarizeTelemetryActivity(periods)`.

- [ ] **Step 1: Escrever os testes falhando do contrato**

Cobrir eventos válidos `ACTIVE`, `OFFLINE`, `ATTENTION`, `IDLE`, `INTERRUPTED` e `RECOVERED`; rejeitar timestamp/estado inválido; ordenar por timestamp e identificador; limitar ao `screenId` e intervalo selecionados.

- [ ] **Step 2: Executar o teste e confirmar falha por módulo ausente**

Run: `node --test tests/telemetry-activity-history.test.js`  
Expected: FAIL com `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementar `normalizeTelemetryActivityEvents(screen, range)`**

Ler apenas `screen.telemetry.activity.events` quando for array. Retornar eventos imutáveis `{ id, screenId, state, atMs, description }`, ordenados por `atMs` e `id`; ignorar dados inválidos e limitar a 500 eventos no intervalo.

- [ ] **Step 4: Implementar períodos e resumo sem inferência**

`buildTelemetryActivityPeriods(events, range)` cria apenas pares consecutivos da mesma tela, nunca estende o último evento e preserva lacunas. `summarizeTelemetryActivity(periods)` devolve totais comprovados, contagem de períodos, primeira ativação e última desativação, usando `null` quando ausente.

- [ ] **Step 5: Adicionar testes de não inferência**

Asserções: tela contendo somente `lastSeenAt`, `sessionStartedAt`, `lastHeartbeatAt` e `uptimeSeconds` produz zero eventos e zero períodos; evento único produz zero períodos; timestamps iguais nunca geram duração negativa.

- [ ] **Step 6: Executar e registrar a Task 1**

Run: `node --test tests/telemetry-activity-history.test.js`  
Expected: todos PASS.

Commit: `feat(telemetry): add real activity history contract`

### Task 2: Histórico de Atividade na Telemetria existente

**Files:**
- Modify: `src/TelemetryDashboard.jsx`
- Create: `tests/telemetry-activity-dashboard.test.js`
- Modify: `tests/telemetry-dashboard-v30.test.js`

**Interfaces:**
- Consumes: helpers da Task 1 e os arrays `clients`/`enriched` já carregados.
- Produces: seção `.telemetry-v2-activity` com estado resumido e detalhado, sem consulta nova.

- [ ] **Step 1: Escrever os testes estruturais falhando**

Asserir filtros `Cliente`, `Tela`, `Período` e `Data`; controle `Ver timeline detalhada`; texto exato `Aguardando dados da Telemetria V2-A`; uso dos três helpers da Task 1; ausência de novo `onSnapshot`, `getDocs`, `collectionGroup` ou import Firebase.

- [ ] **Step 2: Executar o teste e confirmar falha pela seção ausente**

Run: `node --test tests/telemetry-activity-dashboard.test.js tests/telemetry-dashboard-v30.test.js`  
Expected: FAIL nas novas asserções de histórico.

- [ ] **Step 3: Adicionar estado e seletores locais ao dashboard**

Adicionar `activityExpanded`, `activityClientId`, `activityScreenId`, `activityPeriod` e `activityDate`. Derivar clientes alfabetizados de `clients`, telas da seleção e intervalo diário/semanal/mensal via `useMemo`.

- [ ] **Step 4: Montar o resumo recolhido**

Renderizar cabeçalho, orientação, quatro filtros, botão de expansão e cards de atividade. Sem períodos comprovados, todos os valores ficam `—` e o estado vazio V2-A permanece visível.

- [ ] **Step 5: Montar a timeline detalhada**

Quando expandida e houver períodos, renderizar legenda, segmentos proporcionais, cards de totais/marcos, tabela de períodos e resumo textual. Quando não houver, manter a mesma composição com estado vazio, sem barras artificiais.

- [ ] **Step 6: Preservar Visão Geral, Telas e detalhe**

Manter os cinco `MetricCard`, dois `Donut`, `TrafficComparison`, tabela, PDF, configuração piloto e detalhe lateral. Inserir o histórico sem remover ou renomear dados operacionais existentes.

- [ ] **Step 7: Executar e registrar a Task 2**

Run: `node --test tests/telemetry-activity-history.test.js tests/telemetry-activity-dashboard.test.js tests/telemetry-dashboard-v30.test.js src/telemetry-card-data.test.js`  
Expected: todos PASS.

Commit: `feat(telemetry): add real activity history interface`

### Task 3: Composição visual e responsividade isolada

**Files:**
- Create: `src/telemetry-v2.css`
- Modify: `src/TelemetryDashboard.jsx`
- Create: `tests/telemetry-v2-layout.test.js`

**Interfaces:**
- Consumes: classes semânticas produzidas na Task 2.
- Produces: composição responsiva equivalente às referências, limitada a `.telemetry-v2`.

- [ ] **Step 1: Escrever testes falhando de isolamento e estrutura**

Asserir import local `./telemetry-v2.css`; cinco cards superiores; seis botões de navegação; grade de três cards visuais; histórico recolhível/detalhado; todos os seletores do novo arquivo iniciando por `.telemetry-v2`; nenhuma alteração em `src/App.css`.

- [ ] **Step 2: Executar e confirmar falha pelo CSS ausente**

Run: `node --test tests/telemetry-v2-layout.test.js`  
Expected: FAIL por `telemetry-v2.css` ausente.

- [ ] **Step 3: Implementar a composição desktop**

Aplicar apenas os tokens já usados na Telemetria: cinco indicadores, navegação horizontal, grade `1fr 1.65fr 1fr`, cards secundários e histórico conforme as duas referências. Não copiar cabeçalho, logo ou usuário ilustrativos.

- [ ] **Step 4: Implementar tablet e celular**

Breakpoints locais em 1100px, 900px e 600px. Empilhar grids progressivamente; manter filtros acessíveis; limitar overflow da timeline ao wrapper `.telemetry-v2-activity-timeline-scroll`; tabela de detalhes com rolagem interna quando necessário.

- [ ] **Step 5: Validar contraste, estados vazios e temas existentes**

Usar variáveis/tokens atuais e evitar valores que sobrescrevam `body`, `.app`, sidebar ou tema. Estados futuros devem ser discretos e visualmente distintos de dados reais.

- [ ] **Step 6: Executar e registrar a Task 3**

Run: `node --test tests/telemetry-v2-layout.test.js tests/telemetry-activity-dashboard.test.js tests/telemetry-dashboard-v30.test.js`  
Expected: todos PASS.

Commit: `style(telemetry): match approved v2 references`

### Task 4: Regressão operacional e ordenação estável

**Files:**
- Modify: `tests/telemetry-dashboard-v30.test.js`
- Create: `tests/telemetry-screen-order.test.js`
- Verify: `src/portal-status.js`
- Verify: `src/TelemetryDashboard.jsx`
- Verify: `src/telemetry-pdf-report.js`

**Interfaces:**
- Consumes: `createPortalScreenOrderTracker`, `sortClientsAlphabetically` e fluxo atual de PDF.
- Produces: evidência de preservação sem mudança de backend ou Dashboard principal.

- [ ] **Step 1: Fixar testes de ordenação e filtros**

Asserir online estável enquanto o status não muda; retorno ao online entra após telas já online; offline é ordenado por último feedback decrescente; atualização de mídia/cache não altera posição; clientes permanecem alfabetizados.

- [ ] **Step 2: Fixar testes de isolamento operacional**

Asserir que `TelemetryDashboard.jsx` mantém somente os três listeners atuais, continua chamando `renderTelemetryPdfReport` e não importa módulos Android/Player. Asserir que `src/App.jsx` não foi alterado no diff da branch.

- [ ] **Step 3: Executar a regressão focada**

Run: `node --test tests/telemetry-activity-*.test.js tests/telemetry-v2-layout.test.js tests/telemetry-dashboard-v30.test.js tests/telemetry-screen-order.test.js src/telemetry-card-data.test.js src/telemetry-pdf-report.test.js tests/dashboard-cache-summary.test.mjs`  
Expected: todos PASS.

- [ ] **Step 4: Registrar a Task 4**

Commit somente se testes ou código precisarem mudar: `test(telemetry): preserve portal operations`

### Task 5: Gate final, homologação visual e único Preview

**Files:**
- Verify: `src/TelemetryDashboard.jsx`
- Verify: `src/telemetry-activity-history.js`
- Verify: `src/telemetry-v2.css`
- Verify: testes focados da Telemetria

**Interfaces:**
- Consumes: implementação completa das Tasks 1–4.
- Produces: commit final e único deployment Preview isolado.

- [ ] **Step 1: Executar a suíte focada completa**

Run: `node --test tests/telemetry-activity-*.test.js tests/telemetry-v2-layout.test.js tests/telemetry-dashboard-v30.test.js tests/telemetry-screen-order.test.js src/telemetry-card-data.test.js src/telemetry-pdf-report.test.js tests/dashboard-cache-summary.test.mjs`  
Expected: zero falhas.

- [ ] **Step 2: Executar ESLint somente nos arquivos alterados**

Run: `npx.cmd eslint src/TelemetryDashboard.jsx src/telemetry-activity-history.js tests/telemetry-activity-history.test.js tests/telemetry-activity-dashboard.test.js tests/telemetry-v2-layout.test.js tests/telemetry-screen-order.test.js`  
Expected: zero erros.

- [ ] **Step 3: Executar um único build Web final**

Run: `npm.cmd run build:web`  
Expected: exit code 0.

- [ ] **Step 4: Auditar o diff**

Executar `git diff --check` e comparar a branch com `b6b50998b31730db0026f922a8c945d382c03d81`. Confirmar alterações somente em Telemetria, testes e documentação; nenhum arquivo Android, Firebase, `src/App.jsx` ou `src/App.css`.

- [ ] **Step 5: Validar no navegador autenticado**

Conferir desktop, tablet e celular; estados recolhido/detalhado; filtros alfabetizados; estado vazio V2-A; tabela e detalhe; ausência de overflow da página; sidebar, cabeçalho e temas intactos.

- [ ] **Step 6: Criar um único Preview Vercel isolado**

Run: `npx.cmd --yes vercel`  
Expected: deployment `READY`, target Preview, nunca Production.

- [ ] **Step 7: Verificação final e entrega**

Confirmar URL HTTP 200 e registrar commit, deployment, testes, dados reais exibidos e indicadores ainda aguardando V2-A. Não promover para produção.
