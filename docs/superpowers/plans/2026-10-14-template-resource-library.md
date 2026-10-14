# Template Resource Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar logicamente a biblioteca do cliente em “Reprodução” e “Recursos das Templates”, sem mover, duplicar ou invalidar arquivos e referências existentes.

**Architecture:** Manter `clients/{clientId}/media` e os objetos atuais em `clients/{clientId}/media/*`. Acrescentar metadados opcionais de finalidade e tipo no documento de mídia; documentos legados sem finalidade continuam tratados como mídia de reprodução, preservando playlists. Uploads feitos pelo editor V2 passam a nascer como recursos e continuam reutilizáveis por qualquer template do mesmo cliente.

**Tech Stack:** React, Firebase Firestore, Firebase Storage/R2 via `storage-service.js`, Node test runner.

**Spec:** Solicitação “TOTEM PARK — COMPLEMENTO APROVADO | ORGANIZAÇÃO DA BIBLIOTECA”, recebida em 14/10/2026.

## Global Constraints

- Não mover, duplicar ou apagar automaticamente arquivos ou documentos existentes.
- Manter coleção, caminhos de Storage, URLs, IDs e referências legadas.
- Recursos de template não podem aparecer como itens selecionáveis diretamente em playlists.
- Upload do editor deve ser classificado automaticamente como recurso de template.
- Um recurso pode ser usado por várias templates do mesmo cliente.
- Excluir uma template nunca exclui o recurso compartilhado.
- Preservar isolamento por `clientId`, regras atuais, layout global, Player Android e identidade visual.
- Esta etapa antecede Notícias Editorial e Mercado Premium.

## Review Focus

- Documento legado sem `libraryPurpose`: permanece disponível em Reprodução e em playlists.
- Recurso usado por duas templates: excluir uma delas não modifica nem exclui o recurso.
- Recurso marcado como template: não aparece no seletor direto de mídia da playlist.
- Usuário de outro cliente: nunca consulta nem reutiliza recurso fora de `clients/{clientId}`.
- Arquivo com MIME ausente ou desconhecido: aparece em “Outros”, sem quebrar filtros ou referências.

---

## Estrutura existente confirmada

- `ClientMediaPage` em `src/App.jsx` lê e grava `clients/{clientId}/media` e usa `clients/{clientId}/media/*` no Storage.
- `ClientPlaylistsPage` em `src/App.jsx` lê a mesma coleção inteira para montar a biblioteca selecionável da playlist.
- `TemplateV2Editor` em `src/templates-v2/editor/TemplateV2Editor.jsx` lê a mesma coleção e seu upload cria um documento comum, hoje sem finalidade persistida.
- `TemplateV2MediaField` converte documentos de mídia existentes em assets da configuração da template; as configurações guardam referências/URLs, não posse exclusiva do arquivo.
- A exclusão de uma Template V2 já preserva as mídias da biblioteca; a exclusão manual de mídia, porém, só verifica uso em playlists.
- As regras atuais já isolam a coleção pelo caminho do cliente; nenhuma nova coleção ou permissão é necessária para a separação lógica.

## Modelo mínimo de dados

Campos opcionais no documento existente de mídia:

- `libraryPurpose: "playback" | "template-resource"`
- `resourceType: "background" | "logo" | "product-image" | "image" | "video" | "other"`
- `sourceContext: "media-page" | "template-v2-editor"`

Compatibilidade:

- ausência de `libraryPurpose` equivale a `playback`;
- URLs, `storagePath`, `contentVersion`, IDs e documentos existentes permanecem iguais;
- não há backfill ou migração em massa nesta etapa;
- referências antigas continuam resolvidas independentemente do novo metadado.

### Task 1: Política pura de classificação

**Files:**
- Create: `src/media-library-purpose.js`
- Create: `src/media-library-purpose.test.js`

**Interfaces:**
- Produces: `getMediaLibraryPurpose(media)`, `isPlaybackMedia(media)`, `isTemplateResource(media)`, `getTemplateResourceType(media)`, `classifyTemplateUpload({ targetPath, contentType })`.

- [ ] Escrever testes para legado sem campo, playback explícito, recurso explícito e MIME desconhecido.
- [ ] Executar `node --test src/media-library-purpose.test.js` e confirmar falha inicial.
- [ ] Implementar as funções puras com fallback legado para `playback` e tipo desconhecido para `other`.
- [ ] Reexecutar o teste e confirmar aprovação.
- [ ] Commitar somente helper e testes.

### Task 2: Classificação automática no editor V2

**Files:**
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Test: `tests/template-v2-resource-upload.test.js`

**Interfaces:**
- Consumes: `classifyTemplateUpload({ targetPath, contentType })` da Task 1.
- Produces: documentos do editor com `libraryPurpose: "template-resource"`, `resourceType` e `sourceContext: "template-v2-editor"`.

- [ ] Criar teste que fixa logo como `logo`, fundo como `background`, vídeo como `video` e demais imagens como `image`.
- [ ] Confirmar falha antes da implementação.
- [ ] Incluir apenas os três metadados no `mediaDoc` já criado pelo editor; manter caminho, upload, URL e vínculo ao rascunho atuais.
- [ ] Confirmar que o mesmo documento pode ser escolhido por múltiplas templates sem cópia.
- [ ] Rodar testes do editor V2 e commit isolado.

### Task 3: Duas abas na biblioteca existente

**Files:**
- Modify: `src/App.jsx` (`ClientMediaPage`)
- Modify: `src/App.css` apenas com classes locais da biblioteca, reutilizando tokens atuais.
- Test: `tests/media-library-tabs.test.js`

**Interfaces:**
- Consumes: `isPlaybackMedia`, `isTemplateResource`, `getTemplateResourceType`.
- Produces: abas “Reprodução” e “Recursos das Templates”; filtros `Todos`, `Imagens`, `Vídeos`, `Logos`, `Fundos`, `Produtos`, `Outros` na segunda aba.

- [ ] Criar teste para distribuição de documentos entre abas e filtros por tipo.
- [ ] Confirmar falha inicial.
- [ ] Adicionar estado local de aba/filtro e derivar listas da assinatura Firestore já existente, sem nova consulta.
- [ ] Reutilizar cards, ações e grid existentes; não alterar sidebar nem CSS global.
- [ ] Fazer o upload da aba Reprodução gravar `libraryPurpose: "playback"` e `sourceContext: "media-page"`.
- [ ] Validar desktop/mobile e commit isolado.

### Task 4: Impedir recursos no seletor direto de playlists

**Files:**
- Modify: `src/App.jsx` (`ClientPlaylistsPage`)
- Test: `tests/playlist-media-purpose.test.js`

**Interfaces:**
- Consumes: `isPlaybackMedia(media)`.
- Produces: seletor de playlist contendo somente mídia de reprodução e documentos legados.

- [ ] Criar teste com playback, legado e template-resource.
- [ ] Confirmar que o teste falha no comportamento atual.
- [ ] Filtrar somente a lista oferecida para nova seleção; não remover itens já persistidos em playlists.
- [ ] Confirmar que referências antigas continuam carregando e salvando sem alteração.
- [ ] Executar testes de playlists e commit isolado.

### Task 5: Reutilização e exclusão segura de recursos

**Files:**
- Create: `src/template-resource-usage.js`
- Modify: `src/App.jsx` (`ClientMediaPage`)
- Modify: `src/templates-v2/editor/TemplateV2Editor.jsx`
- Modify: `src/templates-v2/editor/TemplateV2MediaField.jsx`
- Test: `tests/template-resource-usage.test.js`

**Interfaces:**
- Produces: `getTemplateResourceUsage(templates, media)` e seletor do editor que prioriza recursos, mantendo documentos legados acessíveis para não quebrar edição antiga.

- [ ] Testar uma mídia referenciada por zero, uma e várias templates, por ID e URL legada.
- [ ] Confirmar falha inicial.
- [ ] Exibir recursos reutilizáveis do mesmo cliente no campo de mídia do editor, sem upload duplicado.
- [ ] Antes da exclusão manual do arquivo, consultar as templates já assinadas e bloquear exclusão enquanto houver referência; não alterar exclusão da própria template.
- [ ] Confirmar que excluir uma template não chama exclusão de Storage nem do documento de mídia.
- [ ] Rodar testes de uso/exclusão e commit isolado.

### Task 6: Gate de regressão e Preview isolado

**Files:**
- Modify somente testes se uma lacuna comprovada for encontrada.

**Interfaces:**
- Consumes: entregas das Tasks 1–5.
- Produces: artefato Web de homologação; nenhuma publicação em produção.

- [ ] Executar testes focados de biblioteca, playlists, editor V2 e exclusão de templates.
- [ ] Executar `npm.cmd run build`.
- [ ] Auditar diff confirmando ausência de Rules, Functions, Android e CSS global não relacionado.
- [ ] Validar visualmente as duas abas e filtros em desktop/mobile.
- [ ] Gerar um único Preview Vercel isolado para homologação.
- [ ] Aguardar autorização específica antes de produção ou antes de iniciar Notícias Editorial/Mercado Premium.

## Sequência das Templates V2 Dinâmicas

1. Organização da Biblioteca — este plano.
2. Homologação e publicação controlada da biblioteca.
3. Notícias Editorial.
4. Mercado Premium.

## Fora desta etapa

- Migração automática ou reclassificação em massa de documentos antigos.
- Mudança de caminhos no Storage ou criação de uma segunda cópia do arquivo.
- Alteração de Firestore Rules/Functions.
- Garbage collection automática de recursos sem referência.
- Mudanças no Player Android ou no formato publicado das templates.
