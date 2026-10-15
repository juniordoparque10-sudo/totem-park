# Totem Park — Consolidação Final das Templates V2

## Status e base

Especificação técnica para aprovação. Nenhuma implementação, publicação Web, alteração Firebase ou APK faz parte deste documento.

Base funcional considerada: Notícias Editorial Dinâmica, Mercado Premium, Biblioteca de Recursos, rotação compartilhada, compatibilidade declarada de Player, previews V2 e separação draft/publicado já existentes no branch atual.

## Objetivo

Consolidar seis modelos V2 existentes — Smart Lobby, Agenda & Informações, Promoção/Campanha, Menu Digital, KPI/Indicadores e QR Code/Interação — usando uma arquitetura híbrida de dados e o núcleo dinâmico já homologado. O Portal, a biblioteca e o Player Web devem compartilhar configuração e renderização, com layouts próprios para 16:9 e 9:16, sem alterar V51/V55.

Também será ocultado do catálogo de novas criações o modelo legado `news-editorial`. Documentos, publicações, playlists, edição e reprodução legadas permanecem válidos e não serão migrados.

## Princípios

- Reutilizar rotação, temporização, preview, persistência, recursos e validação de compatibilidade existentes.
- Usar fontes reais já integradas — RSS, Open-Meteo e relógio — somente onde forem semanticamente adequadas.
- Manter dados próprios do cliente no documento da template: produtos, campanhas, eventos, links, serviços e valores administrados.
- Não criar coleções, serviços externos, fontes pagas, números fictícios nem listeners recorrentes adicionais.
- Toda rotação é limitada pela duração efetiva do item da playlist e usa o mesmo ciclo/cleanup do núcleo atual.
- Modos editor e thumbnail mostram quadro estático; o Player Web mantém a dinâmica real.

## Catálogo e legado

`news-editorial` continua registrado para resolução, edição e reprodução, mas recebe `creatable: false`. A listagem de criação usa apenas definições criáveis; a abertura de uma instância existente continua consultando o registro completo. `news-editorial-dynamic` passa a ser a opção editorial para novas criações.

Antes de ocultar qualquer outro tipo, testes devem comprovar equivalência funcional completa. Nesta fase, nenhum outro modelo será ocultado.

## Contrato híbrido compartilhado

As seis templates reutilizam um contrato pequeno de coleção dinâmica:

- itens com `id`, `title`, `subtitle`, `image`, `order`, `active`, janela opcional `startsAt`/`endsAt` e metadados próprios do tipo;
- origem declarada como `manual`, `rss`, `weather`, `clock` ou `configured-value`;
- normalização pura, ordenação determinística e filtro por validade;
- seleção de destaque e até três secundários pelo núcleo de rotação existente;
- persistência no fluxo `editorDraft → draft → published → playlist → Player Web`;
- imagens como referências da Biblioteca de Recursos, sem cópia de arquivo.

RSS, clima e relógio continuam carregados pelo mecanismo dinâmico existente, com cache de 10 minutos e falhas isoladas. Dados manuais não geram consultas externas. Atualizações de dados não reiniciam a duração da playlist.

## Templates

### Smart Lobby

Cards configuráveis de serviços, avisos e informações, com título, texto, imagem/ícone opcional, validade e ordem. Pode exibir relógio e clima existentes. A rotação usa somente cards ativos e vigentes. Layouts: destaque + secundários em paisagem; destaque superior + pilha vertical em retrato.

### Agenda & Informações

Eventos manuais com título, data, horário, local, descrição e prioridade. A ordenação padrão é cronológica; itens encerrados deixam a rotação sem serem apagados. Relógio e clima são opcionais. Não haverá integração com calendário nesta fase.

### Promoção / Campanha

Campanhas manuais com título, texto, imagem, CTA/link, validade, selo e destaque. Reutiliza composição comercial, seleção de mídia e janela de validade do Mercado Premium, sem compartilhar catálogo de produtos por referência implícita.

### Menu Digital

Categorias e produtos manuais com nome, descrição, preço, imagem, ordem, disponibilidade e destaque. Reutiliza normalização monetária, imagens e seleção principal/secundária do Mercado Premium. Os produtos ficam no documento da própria template; não será criada coleção de catálogo.

### KPI / Indicadores

Cards com nome, valor, unidade, meta, tendência, origem e `updatedAt`. Origens suportadas nesta fase:

- `configured-value`: valor administrado no Portal, explicitamente identificado como “Valor administrado”;
- fontes reais já disponíveis no Portal quando houver adaptador comprovado e sem nova infraestrutura.

Sem valor válido, o card mostra estado indisponível; nunca simula dado ao vivo. Gráficos são derivados apenas da série real informada/configurada e não inventam histórico.

### QR Code / Interação

Cards manuais com chamada, texto, imagem, QR funcional e destino validado. Reutiliza o gerador de QR atual e a rotação compartilhada. Links, WhatsApp, texto e campanhas seguem os tipos já suportados, sem encurtador ou serviço externo novo.

### Hero Business

Permanece institucional. Reutiliza apenas módulos já adequados — relógio, clima, cards de serviços e QR — sem transformá-lo em feed RSS genérico nem criar novo tipo.

## Editor, visual e miniaturas

Cada tipo recebe somente campos aplicáveis. Controles genéricos sem elemento correspondente ficam ocultos. Layout, visibilidade, cores, mídia e composição atualizam o preview imediatamente e persistem no draft/publicado.

O mesmo renderer é usado no editor, preview ampliado, miniatura e Player Web. Miniaturas permanecem estáticas e versionadas por revisão salva; não acompanham continuamente alterações de RSS/clima. O Player Web continua carregando dados reais dinamicamente.

Cards se adaptam à quantidade válida: nenhum painel vazio com apenas um item; um, dois ou três secundários ocupam o espaço disponível, com `object-fit: cover`, limites tipográficos e sem overflow. Paisagem e retrato possuem composições próprias, não apenas escala diferente.

## Compatibilidade e playlists

As templates consolidadas exigem a capacidade dinâmica já usada na Fase 1. A guarda é aplicada ao inserir, salvar, atualizar ou publicar conteúdo de playlist atribuída. V51/V55 continuam inalteradas e não são consideradas compatíveis sem declaração explícita. Operações incompatíveis são bloqueadas antes de gravações, sem alterar vínculos ou playlists existentes.

## Dados, custos e segurança

- Nenhuma nova coleção ou regra Firebase.
- Catálogos e cards ficam dentro do documento V2, com limites: 40 itens cadastrados, 24 ativos e 12 categorias por template quando aplicável.
- Nenhuma escrita periódica para rotação, relógio, RSS ou clima.
- Cache dinâmico existente é reutilizado; falha de uma fonte não bloqueia dados manuais válidos.
- Recursos permanecem isolados por cliente e protegidos contra exclusão enquanto referenciados.

## Tela de manutenção Android futura

Referência aprovada: `Tela de Manutenção Neon Totem Park.png`.

Na futura build experimental baseada na V55, a tela de manutenção deverá ser um componente funcional: fundo navy, logo original sem recriação, título “MODO DE MANUTENÇÃO”, engrenagem com animação contínua, indicador indeterminado sem porcentagem e rodapé “Desenvolvido por Park Solutions”. Deve adaptar-se à TV, preservar o comando remoto e não bloquear recuperação.

Ela não substitui splash, estado offline ou ausência de playlist. Package, assinatura, vínculo, identidade, Local First e cache serão preservados. Nenhum código Android ou APK integra esta fase Web.

## Tratamento de falhas

- Fonte dinâmica indisponível: manter dados manuais válidos e último cache válido; sem cache, usar o estado indisponível existente.
- Item inválido ou expirado: excluir somente da composição, sem apagar o cadastro.
- Recurso ausente: composição textual ou estado visual neutro, sem conteúdo fictício.
- KPI sem origem/atualização: identificar como administrado ou indisponível, nunca “ao vivo”.
- Player incompatível: bloquear antes da escrita e listar as telas afetadas.

## Aceite

- `news-editorial` ausente na criação e íntegro em instâncias antigas.
- Seis templates com edição, layouts 16:9/9:16, cards adaptáveis, rotação limitada, visibilidade e persistência.
- Fontes híbridas corretas e independentes; nenhuma informação fictícia.
- Editor, biblioteca, publicação e Player Web equivalentes.
- Miniaturas estáticas atualizadas por revisão salva.
- Playlists incompatíveis bloqueadas sem efeitos parciais.
- Testes focados, build Web e um único Preview isolado; produção, Firebase e Android intocados.
