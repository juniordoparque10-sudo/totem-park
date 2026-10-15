# Templates V2 — Consolidação Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar seis Templates V2 sobre o motor dinâmico existente, ocultar somente o Notícias legado da criação e entregar um Preview Web isolado sem alterar Firebase ou Android.

**Architecture:** Um contrato híbrido compartilhado normaliza cards manuais e dados reais já integrados; adaptadores por template mantêm semântica e layouts próprios. Renderers reutilizam rotação, recursos, draft/publicado, miniaturas versionadas e guarda de capacidade existentes.

**Tech Stack:** React, Vite, JavaScript ES modules, Node test runner, Firestore/Storage existentes, RSS/Open-Meteo existentes, Vercel Preview.

**Spec:** `docs/superpowers/specs/2026-10-15-templates-v2-consolidacao-final-design.md`

## Global Constraints

- Não alterar V51/V55, Firebase Rules, Functions, coleções, Storage paths, sidebar, temas ou produção.
- Não excluir nem migrar templates, publicações ou playlists existentes.
- Dados dinâmicos usam somente RSS, Open-Meteo e relógio já existentes.
- Rotação nunca ultrapassa a duração efetiva do item nem cria timers concorrentes.
- Miniaturas são estáticas e mudam somente com revisão salva; Player Web permanece dinâmico.
- Um único Preview Vercel isolado ao final; nenhuma APK nesta execução.

## Review Focus

- Instância `news-editorial` antiga continua abrindo apesar de o tipo não aparecer no catálogo.
- Datas inválidas, itens expirados e listas vazias não quebram a composição nem apagam cadastros.
- KPI manual é rotulado como administrado e dado sem origem nunca aparece como ao vivo.
- Falha simultânea de RSS/clima mantém cards manuais e não reinicia a playlist.
- Salvar draft atualiza apenas a miniatura do draft; publicar troca corretamente a versão ativa.

---

### Task 1: Catálogo criável e contrato híbrido compartilhado

**Files:**
- Create: `src/templates-v2/dynamic-collections/config.js`
- Create: `tests/template-v2-dynamic-collections.test.js`
- Modify: `src/templates-v2/registry.js`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Modify: `tests/template-v2-dynamic-types.test.js`

**Interfaces:**
- Produces: `normalizeDynamicCollection(config, options)`, `selectActiveDynamicItems(items, now)`, `listCreatableTemplateV2Definitions()`.

- [ ] Escrever testes falhando para ordenação, validade, limites 40/24/12, origem e seleção de um a três secundários.
- [ ] Escrever teste falhando: `news-editorial` não aparece na criação, mas `getTemplateV2Definition("news-editorial")` continua resolvendo.
- [ ] Executar `node --test tests/template-v2-dynamic-collections.test.js tests/template-v2-dynamic-types.test.js` e confirmar falhas esperadas.
- [ ] Implementar o normalizador puro e a listagem criável; não alterar documentos existentes.
- [ ] Repetir os testes até passarem.
- [ ] Commit: `feat(templates-v2): add shared hybrid collection contract`.

**Deliverable:** base reutilizável e legado oculto somente da criação.

### Task 2: Smart Lobby e Agenda & Informações

**Files:**
- Create: `src/templates-v2/smart-lobby/SmartLobbyEditorFields.jsx`
- Create: `src/templates-v2/smart-lobby/SmartLobbyRenderer.jsx`
- Create: `src/templates-v2/agenda-info/AgendaInfoEditorFields.jsx`
- Create: `src/templates-v2/agenda-info/AgendaInfoRenderer.jsx`
- Create: `src/templates-v2/smart-lobby/smart-lobby.css`
- Create: `src/templates-v2/agenda-info/agenda-info.css`
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/TemplateV2Renderer.jsx`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Test: `tests/smart-lobby-dynamic.test.js`
- Test: `tests/agenda-info-dynamic.test.js`

**Interfaces:**
- Consumes: `normalizeDynamicCollection`, rotação e módulos existentes de relógio/clima.
- Produces: configs `smartLobby.items[]` e `agenda.items[]`, editores e renderers V2.

- [ ] Escrever testes falhando para CRUD/ordem/validade dos cards Lobby e ordenação cronológica da Agenda.
- [ ] Cobrir layouts 16:9/9:16, zero/um/dois/três secundários, visibilidade e persistência.
- [ ] Implementar campos específicos e renderers usando o núcleo atual; Agenda não consulta calendário externo.
- [ ] Executar `node --test tests/smart-lobby-dynamic.test.js tests/agenda-info-dynamic.test.js tests/template-v2-dynamic-rotation.test.js`.
- [ ] Commit: `feat(templates-v2): consolidate lobby and agenda`.

**Deliverable:** Lobby e Agenda dinâmicos, com dados manuais e módulos reais adequados.

### Task 3: Promoção/Campanha e Menu Digital

**Files:**
- Create: `src/templates-v2/promotion-campaign/PromotionCampaignEditorFields.jsx`
- Create: `src/templates-v2/promotion-campaign/PromotionCampaignRenderer.jsx`
- Create: `src/templates-v2/digital-menu/DigitalMenuEditorFields.jsx`
- Create: `src/templates-v2/digital-menu/DigitalMenuRenderer.jsx`
- Create: `src/templates-v2/promotion-campaign/promotion-campaign.css`
- Create: `src/templates-v2/digital-menu/digital-menu.css`
- Modify: `src/templates-v2/market-premium/config.js`
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/TemplateV2Renderer.jsx`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Test: `tests/promotion-campaign-dynamic.test.js`
- Test: `tests/digital-menu-dynamic.test.js`

**Interfaces:**
- Consumes: normalização monetária, mídia de produto, validade e rotação do Mercado Premium.
- Produces: `campaign.items[]` e `digitalMenu.categories[]/products[]`.

- [ ] Escrever testes falhando para campanha válida/expirada, CTA, produtos, categorias, preço, disponibilidade e ordem.
- [ ] Cobrir reutilização de recursos sem duplicação e limites do documento.
- [ ] Implementar adaptadores compartilhados sem acoplar os dois catálogos.
- [ ] Validar paisagem/retrato, cards adaptáveis e persistência.
- [ ] Executar `node --test tests/promotion-campaign-dynamic.test.js tests/digital-menu-dynamic.test.js tests/market-premium-*.test.js`.
- [ ] Commit: `feat(templates-v2): consolidate campaign and digital menu`.

**Deliverable:** dois modelos comerciais dinâmicos sem nova coleção ou cadastro duplicado.

### Task 4: KPI/Indicadores, QR/Interação e Hero Business

**Files:**
- Create: `src/templates-v2/kpi-indicators/KpiIndicatorsEditorFields.jsx`
- Create: `src/templates-v2/kpi-indicators/KpiIndicatorsRenderer.jsx`
- Create: `src/templates-v2/qr-interaction/QrInteractionEditorFields.jsx`
- Create: `src/templates-v2/qr-interaction/QrInteractionRenderer.jsx`
- Create: `src/templates-v2/kpi-indicators/kpi-indicators.css`
- Create: `src/templates-v2/qr-interaction/qr-interaction.css`
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/TemplateV2Renderer.jsx`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Test: `tests/kpi-indicators-dynamic.test.js`
- Test: `tests/qr-interaction-dynamic.test.js`
- Test: `tests/hero-business-dynamic-modules.test.js`

**Interfaces:**
- Consumes: QR configurator, relógio/clima e coleção dinâmica existentes.
- Produces: `kpi.items[]` com `sourceLabel/updatedAt` e `interaction.items[]` com destino QR validado.

- [ ] Escrever testes falhando para KPI administrado identificado, dado real com origem/data e ausência sem número fictício.
- [ ] Escrever testes falhando para QR funcional, destinos existentes, cards alternados e links inválidos bloqueados.
- [ ] Cobrir Hero Business reutilizando apenas módulos atuais, sem RSS obrigatório ou novo tipo.
- [ ] Implementar editores/renderers e estados indisponíveis existentes.
- [ ] Executar `node --test tests/kpi-indicators-dynamic.test.js tests/qr-interaction-dynamic.test.js tests/hero-business-dynamic-modules.test.js`.
- [ ] Commit: `feat(templates-v2): consolidate kpi qr and hero modules`.

**Deliverable:** indicadores honestos, interação funcional e Hero institucional preservado.

### Task 5: Integração, recursos, compatibilidade e miniaturas

**Files:**
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/editor/template-v2-dynamic-loader.js`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Modify: `src/templates-v2/playlist-capability.js`
- Modify: `src/template-usage.js`
- Modify: `src/App.jsx`
- Test: `tests/templates-v2-consolidated-publish-flow.test.js`
- Test: `tests/templates-v2-consolidated-player-web.test.js`
- Modify: `tests/template-v2-dynamic-playlist-capability.test.js`
- Modify: `tests/template-usage.test.js`

**Interfaces:**
- Consumes: os seis contratos e renderers anteriores.
- Produces: fluxo completo editor → draft → published → playlist → Player Web.

- [ ] Escrever testes falhando para equivalência de configuração, miniatura por revisão e hidratação do Player Web.
- [ ] Cobrir falha de RSS/clima preservando cards manuais e cache de 10 minutos.
- [ ] Cobrir recursos referenciados, exclusão protegida e ausência de duplicação.
- [ ] Cobrir bloqueio atômico em V51/V55 ao inserir e ao atualizar playlist atribuída.
- [ ] Integrar somente nos pontos existentes e repetir os testes afetados.
- [ ] Executar `node --test tests/templates-v2-consolidated-*.test.js tests/template-v2-dynamic-playlist-capability.test.js tests/template-usage.test.js tests/news-editorial-dynamic-*.test.js tests/market-premium-*.test.js`.
- [ ] Commit: `feat(templates-v2): integrate consolidated web flow`.

**Deliverable:** seis tipos consistentes no Portal, biblioteca, playlists e Player Web.

### Task 6: Gate final e único Preview isolado

**Files:**
- Verify only: `src/templates-v2/**`, `src/App.jsx`, `src/template-usage.js`, testes focados.

- [ ] Executar testes focados das seis templates, Fase 1, visibilidade, miniaturas, duração e compatibilidade.
- [ ] Executar ESLint somente nos arquivos alterados.
- [ ] Executar `npm.cmd run build:web` uma única vez após os testes.
- [ ] Executar `git diff --check`, revisar arquivos e confirmar ausência de Android/Firebase/CSS global.
- [ ] Validar no navegador autenticado criação, edição, save/publish/reopen, 16:9/9:16, biblioteca e `/player`.
- [ ] Gerar exatamente um Preview com `npx.cmd --yes vercel`, sem `--prod`.
- [ ] Registrar commit, deployment, URL, testes e limitações; não promover.

**Deliverable:** Preview isolado pronto para homologação, sem produção ou APK.

## Preparação Android posterior

Após a homologação Web, criar um plano separado para a build experimental baseada na V55. Esse plano deverá incluir renderizadores compatíveis e a tela de manutenção descrita na especificação, preservando package, assinatura, vínculo, Local First, cache e recuperação. Nenhum passo Android é executado neste plano.

## Critério de conclusão

- Seis templates consolidadas sem duplicar núcleo, fontes ou armazenamento.
- Notícias legado oculto apenas da criação e totalmente preservado em uso existente.
- Dados reais e manuais claramente identificados, sem integrações ou números fictícios.
- Layouts, controles, miniaturas, persistência e Player Web equivalentes.
- Testes focados e build aprovados; um único Preview entregue; produção, Firebase e Android intactos.
