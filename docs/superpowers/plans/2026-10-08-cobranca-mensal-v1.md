# Totem Park — Cobrança Mensal V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar contratos e cobranças individualizadas com transição segura de clientes legados, quitação auditável, notificações persistentes e dashboard financeiro, sem deploy, migração ou publicação.

**Architecture:** O backend Firebase será a autoridade financeira e manterá contratos, cobranças, auditorias, notificações e entregas de e-mail em subcoleções do cliente. O frontend preservará integralmente o caminho legado e ativará a nova apresentação somente quando `financialModelVersion === 1` e `financialMode === "active"`; operações administrativas usarão callables transacionais com prévias vinculantes.

**Tech Stack:** React 19, Vite 8, Firebase Auth/Firestore/Functions v2, Node.js 22, Firestore Emulator, Node test runner e ESLint.

**Spec:** `docs/superpowers/specs/2026-10-08-cobranca-mensal-v1-design.md`

## Global Constraints

- Não converter automaticamente clientes existentes nem reinterpretar `dueDate`.
- Não criar competências anteriores à primeira competência confirmada.
- Preservar exatamente os marcos de atraso de 5, 10 e 15 dias.
- Não liberar cancelamento, suspensão administrativa ou impedimento não financeiro por quitação.
- Não alterar Player Android, cache, mídias, telas, playlists, templates ou telemetria.
- Não configurar provedor externo pago; e-mail inicia desativado.
- Não executar migrações, deploys ou publicações.
- Toda escrita financeira deve ocorrer no backend autenticado.
- Mudança operacional em ativação ou reversão exige confirmação destacada vinculada à prévia vigente.

## File Structure

### Backend

- Create: `functions/billing/domain.js` — calendário civil, competências, IDs, avaliação financeira e invariantes puras.
- Create: `functions/billing/preview-token.js` — assinatura, validade e verificação de prévias vinculantes.
- Create: `functions/billing/repository.js` — caminhos Firestore, transações, consultas e projeções financeiras.
- Create: `functions/billing/service.js` — classificação, quitação, correção, reversão e renovação.
- Create: `functions/billing/jobs.js` — geração antecipada, notificações, paginação e checkpoints.
- Create: `functions/billing/email.js` — estados e adaptador desativado de e-mail.
- Create: `functions/billing/callables.js` — endpoints administrativos autenticados.
- Modify: `functions/index.js` — exportar callables e função agendada.
- Modify: `functions/package.json` — scripts de teste financeiro.

### Portal

- Create: `src/financial-access.js` — fachada de compatibilidade entre acesso legado e resumo financeiro.
- Create: `src/financial-api.js` — clientes tipados para callables financeiros.
- Create: `src/FinancialClassificationPanel.jsx` — formulário, prévia e ativação.
- Create: `src/FinancialManagementPanel.jsx` — contrato, cobranças, quitação, correção e reversão.
- Create: `src/FinancialNotifications.jsx` — notificações persistentes do cliente.
- Create: `src/financial.css` — estilos isolados e responsivos.
- Modify: `src/firebase.js` — exportar instância de Functions.
- Modify: `src/App.jsx` — integrar a fachada, o card, as consultas autorizadas e os painéis administrativos.

### Segurança, configuração e testes

- Modify: `firestore.rules` — regras explícitas para todas as subcoleções financeiras e proteção dos campos-resumo.
- Modify: `firebase.json` — índices ou configuração somente se exigidos pelo emulador; não apontar para produção.
- Create: `firestore.indexes.json` — índices das consultas econômicas, se ainda não houver arquivo equivalente.
- Modify: `package.json` — scripts de teste financeiro e regras.
- Create: `tests/billing-domain.test.cjs` — domínio e calendário.
- Create: `tests/billing-service.test.cjs` — transações e idempotência com repositório controlado.
- Create: `tests/billing-functions.integration.test.mjs` — callables e transações reais nos emuladores Auth/Firestore/Functions.
- Create: `tests/billing-jobs.test.cjs` — geração, consultas, lotes e retomada.
- Create: `tests/billing-ui.test.mjs` — fachada, componentes e preservação do legado.
- Create: `tests/firestore-billing.rules.test.mjs` — isolamento e permissões no emulador.
- Modify: `tests/client-actions.mjs` — regressão dos marcos legados e integração da fachada.

## Review Focus

- Datas civis próximas à meia-noite e mudanças de fuso não podem alterar competência, vencimento ou dias de atraso; coberto na Task 1.
- Confirmação baseada em prévia expirada ou em cliente alterado deve falhar sem escrita parcial; coberto na Task 4.
- Quitação concorrente e cobrança anterior ainda pendente não podem liberar o cliente; coberto na Task 5.
- Checkpoint interrompido entre efeito idempotente e avanço do cursor deve reprocessar sem duplicar; coberto na Task 7.
- Regras financeiras não podem quebrar leituras e escritas legítimas de telas, mídias, playlists e telemetria; coberto na Task 3 e na verificação final.

---

### Task 1: Domínio financeiro puro

**Files:**
- Create: `functions/billing/domain.js`
- Create: `tests/billing-domain.test.cjs`
- Modify: `functions/package.json`

**Interfaces:**
- Produces: `parseCivilDate(value)`, `formatCivilDate(parts)`, `daysInMonth(year, month)`, `clampAnchorDay(year, month, anchorDay)`, `nextDueDate(input)`, `normalizeCompetence(input)`, `nextCompetence(input)`, `invoiceId(contractId, competence)`, `daysOverdue(dueDate, today)`, `evaluateFinancialState(input)` e `combineOperationalAccess(input)`.
- Consumes: somente valores primitivos; nenhuma dependência do Firebase.

- [ ] **Step 1: Escrever testes falhos de calendário e competência**

Cobrir dias 28–31, fevereiro bissexto, retorno ao dia-base, mensal, anual, término de contrato, datas civis em fusos diferentes e IDs determinísticos.

- [ ] **Step 2: Executar os testes e confirmar falha**

Run: `node --test tests/billing-domain.test.cjs`

Expected: FAIL porque `functions/billing/domain.js` ainda não existe.

- [ ] **Step 3: Implementar calendário, competência e IDs**

Usar strings civis `YYYY-MM-DD` e inteiros; não usar horário local para aritmética de calendário.

- [ ] **Step 4: Escrever testes falhos dos estados financeiros**

Asserções exatas para 0, 1, 4, 5, 9, 10, 14 e 15 dias, cobrança vencida mais antiga, pendências múltiplas e precedência de cancelamento/suspensão administrativa.

- [ ] **Step 5: Implementar avaliação e combinação de acesso**

`evaluateFinancialState()` não grava estado; `combineOperationalAccess()` preserva impedimentos não financeiros.

- [ ] **Step 6: Verificar a task**

Run: `node --test tests/billing-domain.test.cjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add functions/billing/domain.js functions/package.json tests/billing-domain.test.cjs
git commit -m "feat: add billing domain rules"
```

### Task 2: Token vinculante de prévia

**Files:**
- Create: `functions/billing/preview-token.js`
- Modify: `tests/billing-domain.test.cjs`

**Interfaces:**
- Consumes: payload normalizado, versão do cliente, finalidade `activation|reversion`, horário e segredo injetado.
- Produces: `createPreviewToken(payload, options)` e `verifyPreviewToken(token, expected, options)`.

- [ ] **Step 1: Escrever testes falhos**

Cobrir validade curta, finalidade, hash de entrada, versão do cliente, adulteração, expiração e `requiresOperationalChangeConfirmation`.

- [ ] **Step 2: Executar os testes e confirmar falha**

Run: `node --test tests/billing-domain.test.cjs`

Expected: FAIL nos casos de token.

- [ ] **Step 3: Implementar token assinado e verificação constante**

Usar HMAC com segredo do backend; nunca persistir ou retornar o segredo.

- [ ] **Step 4: Verificar a task**

Run: `node --test tests/billing-domain.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/billing/preview-token.js tests/billing-domain.test.cjs
git commit -m "feat: add binding billing previews"
```

### Task 3: Regras financeiras do Firestore

**Files:**
- Modify: `firestore.rules`
- Create: `tests/firestore-billing.rules.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `isMaster()` e `isClientOwner(clientId)` existentes.
- Produces: leitura própria limitada; bloqueio de escrita financeira pelo cliente; proteção dos campos-resumo do cliente.

- [ ] **Step 1: Escrever testes falhos de regras**

Cobrir master, proprietário, outro cliente, anônimo e identidade de Player para `contracts`, `invoices`, `financialNotifications`, `financialAudit`, `financialEmailDeliveries` e campos-resumo em `clients/{clientId}`.

- [ ] **Step 2: Executar no emulador e confirmar falhas**

Run: `firebase emulators:exec --project demo-totem-billing --config firebase.test.json --only firestore "node --test tests/firestore-billing.rules.test.mjs"`

Expected: FAIL porque as subcoleções ainda herdam a regra genérica.

- [ ] **Step 3: Adicionar regras explícitas antes do wildcard**

Permitir ao cliente apenas as leituras previstas; auditoria e entregas de e-mail ficam restritas ao master. Impedir alteração dos campos `financial*` e `activeContractId` em updates do proprietário.

- [ ] **Step 4: Verificar regras financeiras e regressão existente**

Run: `firebase emulators:exec --project demo-totem-billing --config firebase.test.json --only firestore "node --test tests/firestore-billing.rules.test.mjs tests/firestore-player-identity.rules.test.mjs"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules package.json tests/firestore-billing.rules.test.mjs
git commit -m "security: isolate client financial records"
```

### Task 4: Classificação com prévia e ativação atômica

**Files:**
- Create: `functions/billing/repository.js`
- Create: `functions/billing/service.js`
- Create: `functions/billing/callables.js`
- Create: `tests/billing-service.test.cjs`
- Create: `tests/billing-functions.integration.test.mjs`
- Modify: `functions/index.js`

**Interfaces:**
- Produces: `previewFinancialActivation(context, input)` e `confirmFinancialActivation(context, input)`.
- Preview returns: `{ previewToken, normalizedContract, firstInvoice, projectedAccess, currentAccess, requiresOperationalChangeConfirmation, operationalChange }`.
- Confirmation consumes: `{ clientId, previewToken, idempotencyKey, operationalChangeConfirmed }`.

- [ ] **Step 1: Escrever testes falhos da prévia**

Cobrir validação, zero gravações, mensal/anual, primeira competência explícita, ausência de retroatividade e comparação operacional.

- [ ] **Step 2: Executar e confirmar falha**

Run: `node --test tests/billing-service.test.cjs`

Expected: FAIL porque o serviço ainda não existe.

- [ ] **Step 3: Implementar repositório e prévia somente leitura**

Centralizar caminhos, serialização e leitura da versão do cliente no repositório.

- [ ] **Step 4: Escrever testes falhos da confirmação**

Cobrir transação completa, falha sem escrita parcial, concorrência, repetição idempotente, token expirado, cliente alterado e confirmação destacada ausente.

- [ ] **Step 5: Implementar confirmação transacional**

Contrato, primeira cobrança, auditoria e projeções são escritos na mesma transação; `financialModelVersion: 1` só existe no resultado confirmado.

- [ ] **Step 6: Exportar callables autenticados**

Somente master pode chamar; validar payload no backend e não confiar em estado calculado pelo frontend.

- [ ] **Step 7: Verificar a task**

Run: `node --test tests/billing-domain.test.cjs tests/billing-service.test.cjs`

Expected: PASS.

- [ ] **Step 8: Verificar autenticação e atomicidade nos emuladores**

Run: `firebase emulators:exec --project demo-totem-billing --config firebase.test.json --only auth,firestore,functions "node --test tests/billing-functions.integration.test.mjs"`

Expected: PASS para master, rejeição de cliente comum, ativação completa e rollback integral após falha injetada.

- [ ] **Step 9: Commit**

```bash
git add functions/billing/repository.js functions/billing/service.js functions/billing/callables.js functions/index.js tests/billing-service.test.cjs tests/billing-functions.integration.test.mjs
git commit -m "feat: add atomic financial classification"
```

### Task 5: Quitação e correção auditáveis

**Files:**
- Modify: `functions/billing/service.js`
- Modify: `functions/billing/callables.js`
- Modify: `functions/index.js`
- Modify: `tests/billing-service.test.cjs`

**Interfaces:**
- Produces: `settleInvoice(context, input)` e `reverseSettlement(context, input)`.
- Consumes: `{ clientId, invoiceId, idempotencyKey, paidAt? }` e `{ clientId, invoiceId, idempotencyKey, reason }`.

- [ ] **Step 1: Escrever testes falhos de quitação**

Cobrir data/responsável, auditoria, notificação resolvida, repetição idempotente, corrida concorrente, outra pendência vencida e bloqueio não financeiro.

- [ ] **Step 2: Implementar quitação transacional**

Recalcular sempre a partir de todas as cobranças abertas relevantes; nunca forçar `status: "Ativo"`.

- [ ] **Step 3: Escrever testes falhos de correção**

Exigir motivo, preservar auditoria anterior, reabrir no estado derivado e recalcular restrição.

- [ ] **Step 4: Implementar correção e callables**

Uma correção não exclui documento nem evento anterior.

- [ ] **Step 5: Verificar a task**

Run: `node --test tests/billing-service.test.cjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/billing/service.js functions/billing/callables.js functions/index.js tests/billing-service.test.cjs
git commit -m "feat: add audited manual settlements"
```

### Task 6: Reversão segura e renovação explícita

**Files:**
- Modify: `functions/billing/service.js`
- Modify: `functions/billing/callables.js`
- Modify: `functions/index.js`
- Modify: `tests/billing-service.test.cjs`

**Interfaces:**
- Produces: `previewFinancialReversion`, `confirmFinancialReversion` e `renewFinancialContract`.
- Reversão usa a mesma semântica de token e confirmação operacional da ativação.

- [ ] **Step 1: Escrever testes falhos da prévia e confirmação de reversão**

Cobrir `dueDate` intacto, contrato `reverted`, histórico preservado, mudança operacional destacada, token vencido e nenhuma reativação implícita.

- [ ] **Step 2: Implementar reversão transacional**

Definir `financialMode: "reverted"`; não apagar `financialModelVersion`, cobranças, pagamentos ou auditorias.

- [ ] **Step 3: Escrever testes falhos da renovação**

Cobrir nova vigência explícita, auditoria, impedimento de geração depois do fim e retomada somente após autorização.

- [ ] **Step 4: Implementar renovação explícita**

Não reutilizar a ação legada que força o cliente para ativo.

- [ ] **Step 5: Verificar a task**

Run: `node --test tests/billing-service.test.cjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/billing/service.js functions/billing/callables.js functions/index.js tests/billing-service.test.cjs
git commit -m "feat: add safe billing reversion and renewal"
```

### Task 7: Geração econômica, notificações e retomada

**Files:**
- Create: `functions/billing/jobs.js`
- Create: `tests/billing-jobs.test.cjs`
- Modify: `functions/billing/repository.js`
- Modify: `functions/index.js`
- Create: `firestore.indexes.json`
- Modify: `firebase.json`

**Interfaces:**
- Produces: `generateEligibleInvoices`, `processEligibleInvoiceEvents`, `runBillingCycle` e export agendado `processBillingCycle`.
- Consumes: consultas indexadas por `status`, `dueDate`, `nextInvoiceDueDate`, cursor e limite.

- [ ] **Step 1: Escrever testes falhos de geração**

Cobrir janela de 35 dias, ID determinístico, mensal/anual, fim da vigência, contrato revertido, concorrência e preservação de pendências.

- [ ] **Step 2: Implementar consultas e geração paginada**

Consultar contratos elegíveis, não clientes; atualizar `nextInvoiceDueDate` na mesma confirmação da geração.

- [ ] **Step 3: Escrever testes falhos de eventos**

Cobrir −5, 0, atraso, 5, 10 e 15 dias, deduplicação e resolução após pagamento.

- [ ] **Step 4: Implementar notificações determinísticas**

Cada evento usa ID canônico por cobrança e tipo.

- [ ] **Step 5: Escrever testes falhos de checkpoint**

Simular interrupção antes e depois do avanço do cursor, checkpoint incompatível, item isolado com falha e nova tentativa.

- [ ] **Step 6: Implementar checkpoint e retomada**

Avançar cursor somente após lote confirmado; reprocessamento do último item deve ser inofensivo.

- [ ] **Step 7: Adicionar índices mínimos**

Registrar somente índices exigidos pelas consultas testadas; não criar combinações especulativas.

- [ ] **Step 8: Verificar a task**

Run: `node --test tests/billing-jobs.test.cjs tests/billing-domain.test.cjs`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add functions/billing/jobs.js functions/billing/repository.js functions/index.js firestore.indexes.json firebase.json tests/billing-jobs.test.cjs
git commit -m "feat: add resumable billing processing"
```

### Task 8: Infraestrutura de e-mail desativada

**Files:**
- Create: `functions/billing/email.js`
- Modify: `functions/billing/jobs.js`
- Modify: `tests/billing-jobs.test.cjs`

**Interfaces:**
- Produces: `buildBillingEmail`, `processEmailDelivery` e `disabledEmailProvider`.
- States: `not_configured`, `pending`, `sent`, `failed`.

- [ ] **Step 1: Escrever testes falhos dos quatro estados**

Cobrir ausência de provedor sem tentativa, pendência real, confirmação do provedor, falha sanitizada, repetição idempotente e cobrança já paga.

- [ ] **Step 2: Implementar composição e adaptador desativado**

O adaptador desativado retorna `not_configured`; nunca `sent` ou `failed`.

- [ ] **Step 3: Integrar ao job sem afetar o financeiro**

Falha ou ausência de e-mail não interrompe geração, notificação, quitação ou acesso.

- [ ] **Step 4: Verificar a task**

Run: `node --test tests/billing-jobs.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/billing/email.js functions/billing/jobs.js tests/billing-jobs.test.cjs
git commit -m "feat: prepare disabled billing email delivery"
```

### Task 9: Fachada de acesso e API do portal

**Files:**
- Create: `src/financial-access.js`
- Create: `src/financial-api.js`
- Modify: `src/firebase.js`
- Create: `tests/billing-ui.test.mjs`
- Modify: `tests/client-actions.mjs`

**Interfaces:**
- Produces: `isFinancialModelActive(client)`, `getEffectivePlanAccess(client, legacyEvaluator)`, `getFinancialCardState(client, invoice)` e wrappers das callables.
- Consumes: projeções backend; não recalcula autoridade financeira no navegador.

- [ ] **Step 1: Escrever testes falhos de compatibilidade**

Assegurar igualdade integral do retorno legado quando versão não é 1, modo não é ativo ou cliente foi revertido.

- [ ] **Step 2: Implementar fachada**

O caminho ativo traduz a projeção financeira para o contrato já usado pelos componentes de permissão.

- [ ] **Step 3: Escrever testes falhos do card**

Cobrir mensal, anual, próximo, hoje, atrasado, suspenso e ausência controlada de cobrança.

- [ ] **Step 4: Implementar API e estado de apresentação**

Exportar `functions` em `src/firebase.js`; wrappers não aceitam dados financeiros derivados do cliente como autoridade.

- [ ] **Step 5: Verificar a task**

Run: `node --test tests/billing-ui.test.mjs && node tests/client-actions.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/financial-access.js src/financial-api.js src/firebase.js tests/billing-ui.test.mjs tests/client-actions.mjs
git commit -m "feat: add billing compatibility facade"
```

### Task 10: Administração financeira no painel existente

**Files:**
- Create: `src/FinancialClassificationPanel.jsx`
- Create: `src/FinancialManagementPanel.jsx`
- Create: `src/financial.css`
- Modify: `src/App.jsx`
- Modify: `tests/billing-ui.test.mjs`

**Interfaces:**
- Classification panel consumes client and callable wrappers; emits refresh only after confirmação.
- Management panel consumes contract, invoices and access summary; invokes settlement, correction, reversion and renewal callables.

- [ ] **Step 1: Escrever testes falhos de fluxo administrativo**

Cobrir cliente legado, formulário mensal/anual, prévia sem gravação, confirmação comum, confirmação operacional destacada e estado de erro.

- [ ] **Step 2: Implementar painel de classificação**

Exibir antes/depois, primeira cobrança, calendário demonstrativo e aviso de ausência de retroatividade.

- [ ] **Step 3: Escrever testes falhos de gestão**

Cobrir histórico, quitação, correção com motivo, outra pendência, reversão com prévia e renovação explícita.

- [ ] **Step 4: Implementar painel de gestão**

Desabilitar a renovação legada quando o modelo financeiro estiver ativo; nenhuma ação deve escrever diretamente em campos financeiros.

- [ ] **Step 5: Implementar estilos responsivos isolados**

Preservar componentes, identidade visual e navegação atuais.

- [ ] **Step 6: Verificar lint e testes**

Run: `node --test tests/billing-ui.test.mjs && npm.cmd run lint`

Expected: PASS sem novos erros.

- [ ] **Step 7: Commit**

```bash
git add src/FinancialClassificationPanel.jsx src/FinancialManagementPanel.jsx src/financial.css src/App.jsx tests/billing-ui.test.mjs
git commit -m "feat: add admin billing controls"
```

### Task 11: Card e notificações do cliente

**Files:**
- Create: `src/FinancialNotifications.jsx`
- Modify: `src/App.jsx`
- Modify: `src/financial.css`
- Modify: `tests/billing-ui.test.mjs`

**Interfaces:**
- Consumes: cobrança atual e `financialNotifications` do próprio cliente.
- Produces: card estável e lista discreta, sem escrita financeira ou pop-up.

- [ ] **Step 1: Escrever testes falhos do dashboard**

Cobrir preservação exata do cliente legado, substituição de somente um card no cliente ativo, estados verde/amarelo/laranja/vermelho e suspensão.

- [ ] **Step 2: Implementar assinatura autorizada dos dados financeiros**

Consultar somente subcoleções do cliente autenticado; remover listeners na desmontagem.

- [ ] **Step 3: Implementar card estável e notificações**

Mostrar plano, vigência, periodicidade, competência, valor e vencimento sem remover outros cards.

- [ ] **Step 4: Verificar responsividade e testes**

Run: `node --test tests/billing-ui.test.mjs && npm.cmd run build`

Expected: PASS e build concluído.

- [ ] **Step 5: Commit**

```bash
git add src/FinancialNotifications.jsx src/App.jsx src/financial.css tests/billing-ui.test.mjs
git commit -m "feat: show client billing status"
```

### Task 12: Verificação integrada e pacote de homologação

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/plans/2026-10-08-cobranca-mensal-v1.md` somente para marcar resultados durante execução
- Create: `docs/cobranca-mensal-v1-homologacao.md`

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: evidências reproduzíveis, inventário de arquivos e roteiro de demonstração.

- [ ] **Step 1: Adicionar script agregador sem deploy**

Criar `test:billing` para unidade/UI e documentar separadamente o comando de emulador de regras/functions.

- [ ] **Step 2: Executar suíte financeira**

Run: `npm.cmd run test:billing`

Expected: PASS.

- [ ] **Step 3: Executar regras no emulador**

Run: `firebase emulators:exec --project demo-totem-billing --config firebase.test.json --only firestore "node --test tests/firestore-billing.rules.test.mjs tests/firestore-player-identity.rules.test.mjs"`

Expected: PASS.

- [ ] **Step 4: Executar regressões selecionadas**

Run: `node tests/client-actions.mjs && node tests/client-crud-permissions.mjs && node tests/template-permissions.mjs`

Expected: PASS.

- [ ] **Step 5: Executar integração das Functions**

Run: `firebase emulators:exec --project demo-totem-billing --config firebase.test.json --only auth,firestore,functions "node --test tests/billing-functions.integration.test.mjs"`

Expected: PASS.

- [ ] **Step 6: Executar lint e build web**

Run: `npm.cmd run lint`

Expected: PASS sem novos erros atribuíveis à V1.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: Fazer inspeção visual local web/mobile**

Demonstrar cliente legado, classificação com mudança e sem mudança operacional, mensal, anual, atraso, quitação, outra pendência, bloqueio administrativo, correção e reversão. Não publicar a prévia.

- [ ] **Step 8: Documentar homologação**

Registrar comandos, resultados, arquivos alterados, riscos residuais, infraestrutura PIX preparada e confirmação explícita de nenhum deploy/migração.

- [ ] **Step 9: Revisão de branch**

Usar `superpowers:requesting-code-review` e corrigir achados antes de declarar a V1 pronta para homologação.

- [ ] **Step 10: Commit**

```bash
git add package.json docs/cobranca-mensal-v1-homologacao.md docs/superpowers/plans/2026-10-08-cobranca-mensal-v1.md
git commit -m "test: verify monthly billing v1"
```

## Dependency Order

1. Task 1 é base para todas as operações financeiras.
2. Task 2 depende da normalização da Task 1.
3. Task 3 é independente do backend, mas deve terminar antes de expor dados à interface.
4. Tasks 4–6 dependem das Tasks 1 e 2 e compartilham repositório/serviço.
5. Tasks 7–8 dependem do domínio e do repositório consolidados.
6. Task 9 depende das projeções e contratos de interface definidos no backend.
7. Tasks 10–11 dependem das Tasks 3, 4, 5, 6 e 9.
8. Task 12 depende de todas as anteriores.

## Risks and Controls

- **Worktree já contém alterações não relacionadas:** limitar cada commit aos arquivos listados e revisar `git diff --cached` antes de confirmar.
- **`App.jsx` é extenso e central:** extrair novos componentes; restringir alterações a pontos de integração e executar build após cada integração visual.
- **Regras atuais são amplas:** adicionar casos de negação antes de endurecer regras; executar regressão de Player e subcoleções existentes.
- **Cloud Functions compartilham um arquivo de entrada:** manter domínio e serviços em módulos separados e alterar `functions/index.js` apenas para exports.
- **Custo de Firestore:** usar consultas indexadas, janelas limitadas, paginação e checkpoint; testes devem afirmar quantidade de itens lidos pelo repositório simulado.
- **Estados mistos legado/financeiro:** a fachada deve selecionar exatamente um modo; nenhum fallback silencioso para `dueDate` quando modelo ativo estiver inconsistente.
- **Sem provedor de e-mail:** exibir `not_configured` com veracidade e não bloquear fluxos financeiros.

## Homologation Approval Criteria

- Nenhum cliente legado sofre mudança de acesso, data ou apresentação financeira indevida.
- Ativação e reversão são atômicas, precedidas por prévia e confirmação destacada quando necessário.
- Mensal e anual geram competências corretas, sem retroatividade, duplicação ou geração após o contrato.
- Quitação e correção preservam histórico, outras pendências e bloqueios não financeiros.
- Marcos 5, 10 e 15 permanecem idênticos aos atuais.
- Job consulta somente documentos elegíveis, retoma com segurança e não duplica efeitos.
- Cliente não escreve dados financeiros nem lê dados de outro cliente.
- Card e notificações funcionam em web e mobile sem deslocar os demais cards.
- E-mail distingue `not_configured`, `pending`, `sent` e `failed` sem falso sucesso.
- Lint, build, testes financeiros, regras e regressões selecionadas passam.
- Relatório confirma ausência de migração, deploy e publicação.
