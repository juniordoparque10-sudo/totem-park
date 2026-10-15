# Templates V2 Dinâmicas — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Notícias Editorial Dinâmica e Mercado Premium no Portal e Player Web, com rotação limitada pela duração real da playlist, compatibilidade explícita de Player e um único Preview isolado.

**Architecture:** Adicionar dois tipos V2 novos (`news-editorial-dynamic` e `market-premium`) sobre um núcleo puro de rotação. O tipo legado `news-editorial` permanece intocado. Editor, biblioteca e Player Web compartilham os mesmos normalizadores e renderizadores; playlists fazem uma validação atômica de capacidade antes de qualquer gravação.

**Tech Stack:** React, Vite, JavaScript ES modules, Node test runner, Firebase/Firestore já existente, Open RSS loader existente, Vercel Preview.

**Spec:** `docs/superpowers/specs/2026-10-15-templates-v2-dinamicas-fase1-design.md`

## Global Constraints

- Não modificar APKs V51/V55, Android, Firebase Rules, Cloud Functions, Storage paths ou dados operacionais.
- Não converter automaticamente templates `news-editorial`, publicações ou playlists existentes.
- Não alterar layout global, sidebar, temas, Templates V1 ou Templates V2 existentes.
- A duração efetiva do item na playlist é o limite absoluto; rotação interna nunca prolonga a reprodução.
- Bloquear incompatibilidade antes de gravar playlist, inclusive em atualização/publicação de playlists já atribuídas.
- Um único Preview Web isolado ao final; nenhuma publicação em produção.

## Review Focus

- Ausência de migração implícita do legado `news-editorial`.
- Um único relógio/agendamento ativo por renderer e cleanup determinístico.
- Validação de capacidade baseada em declaração explícita, sem inferência por `versionCode` para os novos tipos.
- Nenhuma gravação parcial quando uma playlist atribuída é incompatível.
- Mesma configuração visual/dinâmica no editor, biblioteca e Player Web.
- Imagens de produto apenas por referência à Biblioteca de Recursos, sem duplicação.

---

## Etapa 1 — Núcleo compartilhado e compatibilidade

### Task 1: Criar o núcleo puro de rotação com limite absoluto

**Files:**
- Create: `src/templates-v2/dynamic-layout/rotation.js`
- Create: `src/templates-v2/dynamic-layout/useDynamicRotation.js`
- Create: `tests/template-v2-dynamic-rotation.test.js`

- [ ] Escrever testes falhando para normalização de `featuredSeconds`, `secondarySeconds`, transição e duração entre limites seguros.
- [ ] Cobrir quadros de destaque/secundários em cadências diferentes, sem repetir o destaque entre secundários.
- [ ] Cobrir `effectiveDurationMs`: antes do limite há quadro válido; no limite ou depois dele o núcleo retorna `expired: true` e não agenda outro ciclo.
- [ ] Cobrir preservação do item ativo quando a lista é atualizada e o mesmo `id` continua presente.
- [ ] Executar `node --test tests/template-v2-dynamic-rotation.test.js` e confirmar falha esperada.
- [ ] Implementar funções puras `normalizeDynamicRotation()` e `getDynamicRotationFrame()`.
- [ ] Implementar `useDynamicRotation()` com uma origem temporal por `playbackExecutionId` e no máximo um `setTimeout` para a próxima fronteira calculada; cancelar no cleanup.
- [ ] Executar o teste focado até passar e revisar ausência de `setInterval` ou timers paralelos.
- [ ] Commit: `feat(templates-v2): add bounded dynamic rotation core`.

**Deliverable:** núcleo reutilizável que alterna destaque e secundários sem ultrapassar a duração efetiva do item.

### Task 2: Propagar a duração efetiva pelo renderer compartilhado

**Files:**
- Modify: `src/templates-v2/TemplateV2Renderer.jsx`
- Modify: `src/templates-v2/editor/TemplateV2ScaledStage.jsx`
- Modify: `src/templates-v2/editor/TemplateV2PreviewPanel.jsx`
- Modify: `src/App.jsx`
- Modify: `tests/template-v2-playback-execution.test.js`
- Create: `tests/template-v2-effective-duration.test.js`

- [ ] Escrever testes falhando para o contrato `effectiveDurationSeconds` em Player Web, preview ampliado e editor.
- [ ] Confirmar que o item da playlist fornece sua duração real ao renderer e que `config.display.duration` é usado apenas como fallback fora da playlist.
- [ ] Executar os dois testes e registrar a falha esperada.
- [ ] Adicionar o prop sem alterar os renderers legados; calcular `effectiveDurationMs` uma vez na fronteira do renderer dinâmico.
- [ ] Garantir que alteração de dados RSS/produtos não troca `playbackExecutionId` nem reinicia o relógio.
- [ ] Executar `node --test tests/template-v2-playback-execution.test.js tests/template-v2-effective-duration.test.js`.
- [ ] Commit: `feat(templates-v2): bind rotation to playlist item duration`.

**Deliverable:** a playlist continua sendo a autoridade temporal e nenhuma rotação interna estende o item.

### Task 3: Adicionar capacidade dinâmica e guarda atômica de playlist

**Files:**
- Modify: `src/templates-v2/player-capability.js`
- Create: `src/templates-v2/playlist-capability.js`
- Modify: `src/App.jsx`
- Modify: `tests/template-v2-player-capability.test.js`
- Create: `tests/template-v2-dynamic-playlist-capability.test.js`

- [ ] Escrever testes falhando para `templatesV2DynamicPhase1 === true`, rejeitando V51/V55 e qualquer inferência exclusiva por versão.
- [ ] Cobrir seleção inicial, edição de playlist já atribuída, publicação/atualização e destinos de agendamento atuais e anteriores.
- [ ] Cobrir que Player Web declara suporte no runtime Web.
- [ ] Cobrir que uma operação bloqueada termina antes de `setDoc`, `updateDoc`, comandos de tela ou alteração de vínculo.
- [ ] Implementar `isDynamicTemplateV2Type()`, `supportsDynamicTemplatesV2()` e `getDynamicPlaylistCapability()`.
- [ ] Usar a mesma guarda no seletor e no início de `handleSavePlaylist()`, recalculando telas vinculadas no momento do salvamento.
- [ ] Exibir o aviso existente com nomes das telas incompatíveis, sem criar novo padrão visual.
- [ ] Executar `node --test tests/template-v2-player-capability.test.js tests/template-v2-dynamic-playlist-capability.test.js tests/template-v2-playlist-compat.test.js`.
- [ ] Commit: `feat(templates-v2): guard dynamic playlists by declared capability`.

**Deliverable:** incompatibilidades são bloqueadas antes de qualquer efeito operacional, inclusive em playlists já atribuídas.

---

## Etapa 2 — Notícias Editorial Dinâmica

### Task 4: Registrar um tipo novo sem tocar no Notícias legado

**Files:**
- Create: `src/templates-v2/news-editorial-dynamic/config.js`
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/registry.js`
- Modify: `tests/template-v2-schema.test.js`
- Create: `tests/news-editorial-dynamic-config.test.js`
- Create: `tests/news-editorial-legacy-compat.test.js`

- [ ] Escrever testes falhando para o novo tipo `news-editorial-dynamic`, layouts A/B/C em 16:9 e A/B em 9:16, limites e defaults.
- [ ] Fixar em teste um fixture de `news-editorial` legado e comprovar que normalização, tipo e saída publicada permanecem iguais.
- [ ] Implementar normalizador, validador e preset do tipo novo; não adicionar campos dinâmicos ao tipo legado.
- [ ] Registrar o novo tipo e manter os IDs/aliases existentes inalterados.
- [ ] Executar `node --test tests/news-editorial-dynamic-config.test.js tests/news-editorial-legacy-compat.test.js tests/template-v2-schema.test.js`.
- [ ] Commit: `feat(templates-v2): register dynamic editorial news type`.

**Deliverable:** novo Notícias dinâmico criado explicitamente, sem migração ou mudança nas publicações antigas.

### Task 5: Implementar carregamento RSS estrito e cache válido

**Files:**
- Create: `src/templates-v2/news-editorial-dynamic/data.js`
- Modify: `src/templates-v2/editor/template-v2-dynamic-loader.js`
- Modify: `src/templates-v2/editor/useTemplateV2DynamicData.js`
- Modify: `src/App.jsx`
- Create: `tests/news-editorial-dynamic-data.test.js`
- Modify: `tests/template-v2-dynamic-data.test.js`

- [ ] Escrever testes falhando para múltiplas fontes, deduplicação por link/título, descarte sem título e limite de 24 itens.
- [ ] Cobrir falha parcial, falha total com último cache válido e estado indisponível sem cache.
- [ ] Cobrir explicitamente que o caminho novo nunca retorna `DEFAULT_NEWS_ITEMS`, preservando o fallback legado para `news-editorial`.
- [ ] Implementar `normalizeDynamicNewsItems()` e um loader estrito que reutiliza transporte/cache existentes.
- [ ] Separar refresh de dados do relógio de rotação, mantendo IDs estáveis.
- [ ] Executar `node --test tests/news-editorial-dynamic-data.test.js tests/template-v2-dynamic-data.test.js`.
- [ ] Commit: `feat(templates-v2): add strict dynamic news data flow`.

**Deliverable:** notícias reais e resilientes, sem conteúdo fictício no novo tipo e sem regressão no legado.

### Task 6: Implementar editor e renderer compartilhado de Notícias

**Files:**
- Create: `src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicRenderer.jsx`
- Create: `src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicEditorFields.jsx`
- Create: `src/templates-v2/news-editorial-dynamic/news-editorial-dynamic.css`
- Modify: `src/templates-v2/TemplateV2Renderer.jsx`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Modify: `src/templates-v2/editor/TemplateV2DynamicStage.jsx`
- Create: `tests/news-editorial-dynamic-renderer.test.js`
- Create: `tests/news-editorial-dynamic-editor.test.js`

- [ ] Escrever testes falhando para layouts por orientação, atualização imediata, persistência de fontes/tempos/opções e quadro estável em thumbnail.
- [ ] Cobrir alternância da notícia principal e secundárias dentro do limite efetivo.
- [ ] Implementar campos específicos usando controles/padrões existentes e o mesmo renderer no editor, biblioteca e Player Web.
- [ ] Implementar fallback textual para notícia sem imagem e estado indisponível existente.
- [ ] Verificar que reabrir draft/publicado preserva configuração e que `news-editorial` não roteia ao novo renderer.
- [ ] Executar `node --test tests/news-editorial-dynamic-renderer.test.js tests/news-editorial-dynamic-editor.test.js tests/news-editorial-legacy-compat.test.js`.
- [ ] Commit: `feat(templates-v2): implement dynamic editorial news`.

**Deliverable:** Notícias Editorial Dinâmica funcional nas duas orientações e em todos os pontos Web.

---

## Etapa 3 — Mercado Premium

### Task 7: Modelar catálogo, layouts e validações do Mercado

**Files:**
- Create: `src/templates-v2/market-premium/config.js`
- Create: `src/templates-v2/market-premium/catalog.js`
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/registry.js`
- Create: `tests/market-premium-config.test.js`
- Create: `tests/market-premium-catalog.test.js`

- [ ] Escrever testes falhando para layouts A/B em 16:9 e 9:16, preços numéricos, unidade, selo, ordem e ativo/inativo.
- [ ] Cobrir limites de 40 produtos, 24 ativos, 12 categorias e textos máximos.
- [ ] Cobrir rejeição de catálogo sem produto ativo e seleção principal/secundárias sem duplicação.
- [ ] Implementar normalização e validação sem coleção/listener Firebase adicional.
- [ ] Registrar `market-premium` com capacidade dinâmica obrigatória.
- [ ] Executar `node --test tests/market-premium-config.test.js tests/market-premium-catalog.test.js tests/template-v2-schema.test.js`.
- [ ] Commit: `feat(templates-v2): add market premium catalog contract`.

**Deliverable:** contrato pequeno, determinístico e eficiente para o catálogo configurável.

### Task 8: Implementar o editor do catálogo e recursos reutilizáveis

**Files:**
- Create: `src/templates-v2/market-premium/MarketPremiumEditorFields.jsx`
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Modify: `src/templates-v2/editor/TemplateV2MediaField.jsx`
- Modify: `src/media-library-purpose.js`
- Modify: `src/media-library-purpose.test.js`
- Create: `tests/market-premium-editor.test.js`

- [ ] Escrever testes falhando para criar, editar, ordenar, ativar/desativar produtos e escolher categoria/imagem.
- [ ] Cobrir upload de produto como `libraryPurpose: template-resource` e `resourceType: product-image`.
- [ ] Cobrir reutilização no mesmo cliente, isolamento entre clientes e ausência de duplicação do arquivo.
- [ ] Implementar o editor usando campos, botões e seletores atuais; vídeos permanecem indisponíveis.
- [ ] Validar limites antes de salvar/publicar e preservar draft/publicado.
- [ ] Executar `node --test tests/market-premium-editor.test.js src/media-library-purpose.test.js tests/media-library-integration.test.js`.
- [ ] Commit: `feat(templates-v2): add market premium editor`.

**Deliverable:** catálogo administrável com imagens reutilizadas da Biblioteca de Recursos.

### Task 9: Implementar renderer fiel à referência aprovada

**Files:**
- Create: `src/templates-v2/market-premium/MarketPremiumRenderer.jsx`
- Create: `src/templates-v2/market-premium/market-premium.css`
- Modify: `src/templates-v2/TemplateV2Renderer.jsx`
- Create: `tests/market-premium-renderer.test.js`
- Create: `tests/market-premium-visual-contract.test.js`

- [ ] Escrever testes falhando para hierarquia de oferta principal, lista/cards secundários, preço promocional, unidade, selo, logo e categorias.
- [ ] Cobrir layouts A/B em paisagem e retrato e a alternância tanto da principal quanto das secundárias.
- [ ] Cobrir que o produto principal nunca aparece simultaneamente nas secundárias e que o quadro expira na duração efetiva.
- [ ] Implementar o renderer com base navy, contornos ciano/violeta e composição da referência, sem copiar produtos ou marcas ilustrativas.
- [ ] Usar `object-fit`, limites tipográficos e grades próprios às duas orientações, sem mudar CSS global.
- [ ] Executar `node --test tests/market-premium-renderer.test.js tests/market-premium-visual-contract.test.js tests/template-v2-dynamic-rotation.test.js`.
- [ ] Commit: `feat(templates-v2): implement market premium renderer`.

**Deliverable:** Mercado Premium visualmente fiel à referência, responsivo e com rotação limitada.

---

## Etapa 4 — Integração e testes focados

### Task 10: Integrar assets, preload e proteção de exclusão

**Files:**
- Modify: `src/templates-v2/schema.js`
- Modify: `src/templates-v2/player-preload.js`
- Modify: `src/templates-v2/offline-preload.js`
- Modify: `src/template-usage.js`
- Modify: `tests/template-v2-preload.test.js`
- Modify: `tests/template-offline-cache.test.js`
- Modify: `tests/template-usage.test.js`

- [ ] Escrever testes falhando para `getTemplateV2Assets()` incluindo todas as imagens ativas do catálogo, sem duplicar URLs.
- [ ] Cobrir preload Web/offline e bloqueio de exclusão que liste as templates Mercado que usam cada recurso.
- [ ] Implementar travessia aditiva de `catalog.products[].image`, preservando logo/background e referências legadas.
- [ ] Confirmar que excluir uma template não apaga recursos compartilhados.
- [ ] Executar `node --test tests/template-v2-preload.test.js tests/template-offline-cache.test.js tests/template-usage.test.js`.
- [ ] Commit: `feat(templates-v2): integrate dynamic assets and usage protection`.

**Deliverable:** imagens prontas para reprodução e protegidas contra exclusão acidental.

### Task 11: Fechar equivalência editor → publicação → playlist → Player Web

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/templates-v2/editor/useTemplateV2Draft.js`
- Modify: `src/templates-v2/TemplateV2Modules.jsx`
- Create: `tests/templates-v2-dynamic-publish-flow.test.js`
- Create: `tests/templates-v2-dynamic-player-web.test.js`

- [ ] Escrever testes falhando para salvar draft, publicar, reabrir, inserir em playlist compatível e hidratar no Player Web.
- [ ] Cobrir equivalência dos campos renderizados entre editor, biblioteca e Player Web para os dois tipos.
- [ ] Cobrir atualização de playlist já atribuída: compatível salva; incompatível não faz nenhuma gravação.
- [ ] Integrar os dois tipos aos pontos existentes sem criar rotas, listeners ou documentos paralelos.
- [ ] Executar `node --test tests/templates-v2-dynamic-publish-flow.test.js tests/templates-v2-dynamic-player-web.test.js tests/template-v2-dynamic-playlist-capability.test.js`.
- [ ] Commit: `feat(templates-v2): complete dynamic publish and web playback flow`.

**Deliverable:** fluxo completo e consistente, com compatibilidade revalidada no último momento seguro.

### Task 12: Regressão focada e revisão do escopo

**Files:**
- Verify only: `src/App.jsx`, `src/templates-v2/**`, `src/media-library-purpose.js`, `src/template-usage.js`, `tests/**dynamic**`, `tests/**template-v2**`, `tests/market-premium-*.test.js`, `tests/news-editorial-*.test.js`

- [ ] Executar todos os testes novos e os regressivos: `node --test tests/template-v2-*.test.js tests/news-editorial-*.test.js tests/market-premium-*.test.js tests/templates-v2-dynamic-*.test.js tests/media-library-integration.test.js tests/template-usage.test.js src/media-library-purpose.test.js`.
- [ ] Executar `npm.cmd run build:web` uma única vez após os testes.
- [ ] Executar `git diff --check` e revisar `git diff --stat`/`git diff --name-only`.
- [ ] Confirmar por busca que Android, Firebase Rules, Functions, Templates V1 e CSS global não entraram no diff.
- [ ] Confirmar que não há migração de `news-editorial`, escrita recorrente ou timer concorrente.
- [ ] Commit: `test(templates-v2): verify dynamic phase one integration` somente se houver ajustes de teste/documentação finais.

**Deliverable:** build Web aprovado e diff estritamente restrito à Fase 1.

---

## Etapa 5 — Preview Web isolado

### Task 13: Gerar e validar um único Preview

**Files:**
- No source changes expected.

- [ ] Confirmar worktree limpa e registrar commit final da implementação.
- [ ] Gerar exatamente um Preview com `npx.cmd --yes vercel` sem `--prod`.
- [ ] Validar no Preview: criação/edição/publicação dos dois tipos, layouts 16:9/9:16, rotação principal/secundária, duração da playlist e bloqueio de Player incompatível.
- [ ] Confirmar que `news-editorial` legado abre e reproduz sem conversão.
- [ ] Confirmar equivalência visual entre editor, biblioteca e `/player` e ausência de regressão no Portal.
- [ ] Registrar URL, deployment, commit, assets JS/CSS e resultados; não promover para produção.

**Deliverable:** um único Preview isolado pronto para homologação do usuário.

## Critério de conclusão

- Notícias Editorial Dinâmica funcional primeiro, seguida de Mercado Premium.
- Principal e secundárias alternam nos tempos configurados sem exceder a duração efetiva da playlist.
- V51/V55 permanecem intactas e bloqueadas para os tipos não suportados.
- Legado `news-editorial` permanece inalterado e sem migração automática.
- Editor, biblioteca e Player Web usam o mesmo renderer/configuração.
- Testes focados e build Web passam; somente um Preview é entregue e produção permanece intocada.
