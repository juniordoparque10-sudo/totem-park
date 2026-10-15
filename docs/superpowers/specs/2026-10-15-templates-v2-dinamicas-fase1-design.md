# Totem Park — Templates V2 Dinâmicas, Fase 1

## Status

Especificação técnica para revisão. Nenhuma alteração funcional, publicação Web, mudança Firebase ou APK faz parte deste documento.

Base homologada: `1b4179d3fa6f80636bf34db7c986820e64b92f25`.

## Objetivo

Entregar duas Templates V2 dinâmicas no Portal e Player Web:

1. Notícias Editorial Dinâmica, priorizada na implementação.
2. Mercado Premium, visualmente fiel à referência aprovada `Ofertas da Semana no Supermercado.png`.

As duas templates reutilizam o editor V2, o contrato draft/publicado, a Biblioteca de Recursos, a seleção em playlists, o preview e o Player Web. Não será criado um segundo sistema de templates.

## Fora de escopo

- Templates V1 e as outras Templates V2.
- Vídeos internos em templates.
- Integração com estoque, preço, ERP ou catálogo externo.
- Alterações em Firebase Rules, Cloud Functions ou estrutura de Storage.
- APKs V51/V55.
- Publicação em produção.
- As outras seis templates dinâmicas futuras.

## Estratégia arquitetural

### Núcleo compartilhado

Criar um núcleo pequeno de composição e rotação, usado pelos renderizadores dedicados de Notícias e Mercado. O núcleo será responsável por:

- normalizar orientação e layout;
- selecionar o destaque principal e os itens secundários visíveis;
- calcular índices a partir do tempo transcorrido;
- alternar destaque principal e secundários em cadências independentes;
- limitar toda rotação à duração total do item na playlist;
- aplicar transição visual sem reiniciar o item;
- limpar timers ao trocar item, desmontar renderer ou mudar execução da playlist;
- preservar o índice quando apenas os dados válidos forem atualizados e o item ativo continuar existindo.

O núcleo não conhecerá RSS, produtos, Firestore nem estilos específicos. Notícias e Mercado terão normalizadores, editores e renderizadores próprios.

### Temporização

Cada configuração terá:

- `display.duration`: duração total do item na playlist;
- `rotation.featuredSeconds`: permanência do destaque principal;
- `rotation.secondarySeconds`: permanência do conjunto secundário;
- `rotation.transition`: inicialmente `fade` ou `slide-soft`.

O destaque principal também alterna automaticamente. Os cards secundários alternam em relógio independente. Os valores serão limitados a intervalos seguros no schema. O renderer usa uma única origem temporal por execução e calcula o quadro ativo por tempo decorrido, evitando vários intervalos concorrentes.

A duração total não será estendida pela rotação interna. Ao final do item, o Player mantém a transição normal para o próximo item da playlist. Atualizações RSS ou mudanças de cache não reiniciam a contagem da playlist.

## Notícias Editorial Dinâmica

### Dados

Evoluir o tipo existente `news-editorial` de forma retrocompatível. A configuração passa a incluir:

- uma ou várias fontes RSS;
- layout por orientação;
- quantidade de cards secundários suportada pelo layout;
- tempos principal e secundário;
- transição;
- opções de exibição de imagem, resumo, fonte e data.

Os itens serão normalizados para:

- `id` estável derivado de link ou título/data;
- título;
- resumo;
- imagem opcional;
- fonte;
- data válida opcional;
- link apenas para identidade e deduplicação.

Duplicados serão removidos por link canônico e, na ausência dele, por título normalizado. Itens sem título serão descartados.

### Carregamento e falhas

Reutilizar a integração RSS existente, adicionando um caminho estrito para Notícias Editorial que não converta falha em notícias ilustrativas. O comportamento será:

1. consultar apenas as fontes configuradas;
2. combinar e deduplicar resultados;
3. manter no máximo 24 itens normalizados por atualização;
4. registrar o último conjunto válido no cache dinâmico já existente;
5. se uma fonte falhar, usar itens válidos das demais;
6. se todas falharem, manter o último conjunto válido dentro da política de cache;
7. sem dado válido anterior, exibir o estado indisponível existente.

O refresh dos dados será independente da animação. A identidade dos itens preservará o destaque atual sempre que ele continuar no conjunto atualizado.

### Layouts

Paisagem:

- A: destaque à esquerda, secundárias à direita;
- B: destaque à direita, secundárias à esquerda;
- C: destaque superior, secundárias na faixa inferior.

Retrato:

- A: destaque superior, cards empilhados abaixo;
- B: destaque ampliado, faixa vertical compacta de secundárias.

O mesmo renderer será usado no editor, preview ampliado, biblioteca e Player Web.

## Mercado Premium

### Identidade visual

A referência aprovada define a aparência, sem reutilizar a estética do Menu Digital:

- base navy escura;
- contornos finos em ciano e violeta;
- cabeçalho com logo, segmento, data e hora opcionais;
- preço promocional como elemento tipográfico dominante;
- destaque principal com imagem ampla e selo;
- secundárias em cards ou lista compacta;
- categorias representadas como filtros visuais, sem comportamento interativo no Player;
- contraste e escala adequados a TVs e totens.

Produtos, marcas e preços da referência não serão usados como conteúdo padrão.

### Catálogo

O catálogo será armazenado no draft/publicado da própria template, sem coleção ou listener adicional. Cada produto terá:

- `id` estável;
- nome;
- categoria;
- preço normal opcional;
- preço promocional;
- unidade;
- imagem referenciada na Biblioteca de Recursos;
- selo opcional;
- ordem;
- ativo/inativo.

Categorias serão configuráveis como texto normalizado. Valores monetários serão persistidos numericamente e formatados em `pt-BR` apenas na apresentação.

Limites da fase 1:

- até 40 produtos cadastrados por template;
- até 24 produtos ativos na rotação;
- até 12 categorias;
- textos limitados no editor para evitar estouro visual e documentos desnecessariamente grandes;
- imagens armazenadas somente como referências de mídia, nunca como dados embutidos.

Esses limites mantêm o documento muito abaixo do limite do Firestore, reduzem custo de serialização e preservam desempenho de renderização.

### Layouts

Paisagem:

- A: principal à esquerda, lista e secundárias à direita;
- B: principal à direita, lista e secundárias à esquerda;
- variação inferior com até três cards, quando selecionada no layout.

Retrato:

- A: principal no topo e grade de secundárias abaixo;
- B: principal ocupando aproximadamente metade da tela e lista vertical compacta inferior.

O destaque percorre os produtos ativos. Os secundários exibem produtos diferentes do destaque e avançam em cadência própria, sem duplicar o produto principal na mesma composição.

### Biblioteca de Recursos

Imagens selecionadas ou enviadas pelo editor usarão a Biblioteca de Recursos já publicada:

- upload de produto classificado como `libraryPurpose: template-resource` e `resourceType: product-image`;
- background e logo preservam suas classificações atuais;
- o mesmo recurso pode ser usado em várias templates do mesmo cliente;
- nenhuma cópia de arquivo será criada;
- referências antigas permanecem válidas;
- a verificação de uso incluirá imagens do catálogo antes de permitir exclusão manual.

Vídeos continuam bloqueados.

## Persistência e compatibilidade

Os campos novos serão aditivos dentro do schema V2 atual. O fluxo permanece:

`editorDraft → draft persistido → published → playlist → Player Web`.

Templates antigas sem os novos campos recebem defaults seguros durante a normalização, sem migração em massa. Publicar preserva a separação entre rascunho e versão ativa.

## Compatibilidade Android

Os APKs V51 e V55 contêm bundles anteriores e não possuem os novos renderizadores. Eles não serão modificados nesta fase.

As novas templates declararão uma capacidade específica, por exemplo `templatesV2DynamicPhase1`. O Portal só permitirá atribuí-las a telas que declarem explicitamente essa capacidade. Como V51 e V55 atuais não a declaram:

- a atribuição a essas telas ficará bloqueada;
- o Portal exibirá aviso com os nomes das telas incompatíveis;
- playlists e telas existentes não serão alteradas;
- não será inferida compatibilidade apenas por `versionCode`;
- Player Web será marcado como compatível pelo próprio runtime Web.

Uma futura versão Android poderá declarar a capacidade depois de incorporar e homologar os renderizadores.

## Modelo de renderização e continuidade

- Timers pertencem à instância do renderer e são cancelados no cleanup.
- O identificador de execução da playlist participa da fronteira de reinicialização.
- Alterações de dados dinâmicos não recriam o relógio de execução.
- Mudança real de item ou de publicação reinicia a composição de forma determinística.
- Modos `thumbnail` e editor usam um quadro estável, sem animação contínua desnecessária.
- O Player Web anima apenas no modo de reprodução ou preview ampliado quando apropriado.
- Imagens críticas seguem o preload e cache já usados pelas Templates V2.

## Editor

O editor atual será estendido apenas para os dois tipos:

- seletor de layout dependente da orientação;
- controles de rotação e duração;
- campos editoriais de Notícias;
- gerenciador ordenável de produtos e categorias;
- seletor de imagens da Biblioteca de Recursos;
- preview usando exatamente o mesmo renderer da reprodução;
- validação antes de salvar e publicar.

Os controles genéricos de logo, fundo, cores, overlay e transparência permanecem os atuais quando aplicáveis.

## Tratamento de erros

- RSS sem itens válidos: último cache válido ou estado indisponível.
- Imagem remota de notícia ausente: card textual com composição preservada.
- Imagem de produto ausente: placeholder neutro, sem inventar produto.
- Tempos inválidos: normalização no carregamento e bloqueio de publicação no editor.
- Catálogo sem produtos ativos: estado de configuração incompleta no editor e bloqueio de publicação.
- Tela incompatível: bloqueio antes da alteração da playlist, com aviso explícito.

## Testes de aceite

### Núcleo

- alternância do destaque e dos secundários;
- cadências independentes;
- respeito à duração total;
- cleanup de timers;
- atualização de dados sem reinício indevido;
- quadro estável em thumbnails.

### Notícias

- múltiplas fontes e deduplicação;
- conteúdo real com título, resumo, imagem, fonte e data quando presentes;
- falha parcial e total;
- último dado válido;
- layouts A/B/C em Paisagem e A/B em Retrato;
- persistência após salvar, publicar e reabrir.

### Mercado

- cadastro, edição, ordenação, ativação e categorias;
- preço normal opcional e promocional;
- destaque e secundários sem duplicação;
- rotação dos dois níveis;
- limites de catálogo;
- reutilização e proteção de imagens;
- layouts A/B nas duas orientações;
- persistência após salvar, publicar e reabrir.

### Integração

- editor, biblioteca e Player Web equivalentes;
- seleção em playlist compatível;
- bloqueio de V51/V55 sem capacidade declarada;
- continuidade da playlist;
- regressão focada das Templates V2 existentes;
- build Web e Preview isolado.

## Ordem de implementação

1. Núcleo compartilhado e contrato de capacidade.
2. Notícias Editorial completa.
3. Mercado Premium usando o núcleo.
4. Integração com Biblioteca e proteção de recursos.
5. Compatibilidade de playlists/telas.
6. Testes focados, build Web e um único Preview Vercel.

## Limitações conhecidas

- RSS pode omitir imagem, resumo ou data e pode sofrer indisponibilidade externa.
- Imagens remotas de notícias podem deixar de existir na origem.
- V51/V55 atuais permanecerão incompatíveis até uma futura build que declare a nova capacidade.
- Mercado Premium não possui integração automática com estoque ou preços nesta fase.

