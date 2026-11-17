# Totem Park Player Android — Etapa 1

**Auditoria, preservação e preparação da telemetria simples**

Data da auditoria: 2026-11-17
Escopo auditado: commit `5c818bd2fefb7bcacbee47f9386fea54adbaefa1`

## 1. Resumo executivo

A base indicada pelo solicitante foi confirmada como o artefato Android cujo flavor `playerRc` possui `versionCode 73`. Há, porém, uma inconsistência documental importante: o commit, o APK versionado e o `versionName` usam “V71”, enquanto o metadado instalável usa código 73. A Etapa 2 deve corrigir essa rastreabilidade sem usar strings do Portal como fonte da versão instalada.

Nenhuma funcionalidade foi removida, desativada ou alterada. Nenhum APK foi gerado. Não houve deploy, merge, push, acesso de escrita ao Firebase ou alteração do Portal publicado.

O Player atual combina no mesmo ciclo de heartbeat de 15 segundos: presença online, versão/capabilities, telemetria operacional, tráfego RX/TX, atividade, histórico e confirmação de vínculo. O listener do documento da tela também transporta comandos remotos. A simplificação segura deve manter o heartbeat e o listener, reduzindo o payload avançado e as coleções auxiliares, sem introduzir polling adicional.

## 2. Segurança, Git e referências recuperáveis

### Estado encontrado antes da preparação

| Item | Estado observado |
|---|---|
| Repositório | `C:/Users/centr/Desktop/totem-park` |
| Branch ativa original | `phase2-template-offline` |
| HEAD original | `40f1e7b1d69de3fa4920b48fa4d02deefc36ef71` |
| Estado original | fortemente sujo, com arquivos modificados, removidos e não rastreados |
| Base solicitada | `5c818bd2fefb7bcacbee47f9386fea54adbaefa1` |
| Mensagem da base | `build(player): package v71 traffic hotfix test` |
| Metadado Android efetivo | `playerRc.versionCode = 73`; `versionName = 1.0.0-v71-firestore-traffic-hotfix-test` |
| APK versionado no commit | `Totem-Park-Player-V71-Traffic-Hotfix-Test-v73-debug.apk` |

As alterações locais do checkout original não foram copiadas, escondidas, restauradas nem modificadas.

### Isolamento criado

| Finalidade | Referência |
|---|---|
| Worktree isolado | `C:/Users/centr/.codex/worktrees/player-v73-telemetria-simples-prep/totem-park` |
| Branch de preparação | `codex/player-v73-telemetria-simples-prep` |
| Base da branch | `5c818bd2fefb7bcacbee47f9386fea54adbaefa1` |
| Tag da base V73 | `archive/player-v73-base-5c818bd2` |
| Tag da telemetria avançada | `archive/player-v73-telemetria-avancada-5c818bd2` |

As tags são anotadas e apontam para o commit completo. Elas preservam código, testes, assets empacotados e APK histórico já existente. São referências locais; não foram enviadas a remoto.

## 3. Inventário funcional baseado no código

### 3.1 Reprodução

| Função existente | Implementação principal | Evidência no código |
|---|---|---|
| Vídeos e imagens | `PlayerPage`, `renderPlayerItem`, `resolveAndroidMediaSource` | `src/App.jsx`; elementos `<video>`/`<img>` com eventos de load, playing, ended e error |
| Loop contínuo | `goToNextMedia`, `restartSingleVideo`, timer de imagem/template | `src/App.jsx`, `src/single-item-loop.js` |
| Ordem e duração | índice estável, identidade por item, duração por item e fallback | `src/App.jsx`, `src/player-playlist-reorder.js` |
| Fullscreen Android TV | flags imersivas e kiosk/TV mode | `MainActivity.java` |
| 16:9 e 9:16 | normalização Paisagem/Retrato e `aspectRatio` | `src/App.jsx`, `src/templates-v2/orientation.js`, `schema.js` |
| Transição | Fade, transições configuráveis e ciclo de decoder | `src/App.jsx`, `src/decoder-lifecycle.js` |
| Recuperação de erro | fallback local→remoto, salto de mídia inválida, preservação do item pronto | `src/App.jsx`, `media-download-readiness.js`, `player-runtime-recovery.js` |
| Reordenação sem salto indevido | reconciliação por identidade estável | `src/player-playlist-boundary.js`, testes de reorder |
| Wake/resume | revisão de runtime e recálculo de timer restante | `src/player-runtime-recovery.js`, `src/App.jsx` |

### 3.2 Playlists e programação

| Função existente | Implementação principal |
|---|---|
| Playlist padrão por tela | listener do documento ativo em `clients/{client}/playlists/{playlist}` |
| Mudança remota | `onSnapshot` do documento da tela e da playlist, com metadados de cache |
| Programação automática | `selectActiveScheduledPlaylist`, `resolveScheduledPlayback`, `startScheduleRuntime` |
| Datas, horários e telas-alvo | `getPlaylistScheduleWindow`; suporte a timezone IANA e legado Brasília |
| Janela atravessando meia-noite/DST | cálculo civil em `player-schedule-v62.js` |
| Avisos de criação/início/fim/alteração | `getScheduleNotice`, ledger de ocorrências |
| Persistência offline | Firestore cache + retenção autorizada por escopo |
| Reconexão | confirmação direta no servidor antes de declarar ausência |
| Proteção contra callback antigo | escopo `{clientId, screenId, playlistId, generation}` |
| Preservação do item ao reordenar | identidade estável de mídia/template |

### 3.3 Templates V1/legados

O Player mantém o renderizador legado e conteúdo dinâmico para Hora Certa, Clima/Previsão, Notícias/RSS, receitas, beleza, maré e esportes. Há rotação de cidade/local, ticker, relógio por segundo, cache do último conteúdo válido e reidratação offline de clima/notícias. Backgrounds, logo, uploads e imagens são resolvidos pelo pipeline de mídia e cache.

Arquivos centrais: `src/App.jsx`, `src/legacy-template-offline-rehydration.js`, `src/template-news-state.js`, `src/template-usage.js`.

### 3.4 Templates V2

O registro comercial contém 13 tipos:

1. Hero Business
2. Smart Lobby
3. Hora Certa Pro
4. Previsão do Tempo Premium
5. Notícias Editorial
6. Notícias Editorial Dinâmica
7. Mercado Premium
8. Agenda & Informações
9. Promoção / Campanha
10. Menu Digital
11. KPI / Indicadores
12. QR Code / Interação
13. Resultados Esportivos Premium V2

Recursos adicionais: publicação draft/published, controle de entitlement/capability, layouts Paisagem/Retrato, rotações internas, visibilidade de blocos, tipografia, cores, overlays, logos e assets por identidade. Integrações externas identificadas: Open-Meteo/geocodificação, RSS/WordPress, TheSportsDB e fontes configuráveis de notícias. O cache V2 cobre assets críticos, backgrounds e dados dinâmicos, com reidratação offline.

Arquivos centrais: `src/templates-v2/registry.js`, `schema.js`, `TemplateV2Renderer.jsx`, `offline-asset-cache.js`, `offline-data-cache.js`, `weather-offline-rehydration.js`, `news-offline-rehydration.js`, `sports-v2/`.

### 3.5 Cache e operação offline

| Recurso | Implementação |
|---|---|
| Download nativo | Capacitor FileTransfer/Filesystem em `offline-player-cache.js` |
| Download transacional | arquivo `.partial`, validação, promoção atômica |
| Identidade estável | `native-cache-identity.js`, versão de conteúdo e aliases |
| Journal persistente | `native-cache-journal.js`, estados de operação |
| Local-first | `android-media-source.js`, `player-local-first.js` |
| Cache web | Cache API e object URLs em `offline-player-cache.js` |
| Offline | restauração de mapa, Firestore cache e conteúdo retido autorizado |
| Fallback | arquivo local inválido/ausente retorna ao remoto e registra `FALLBACK` |
| Limpeza segura | remove não usados; comando remoto `clearCache` |
| Estado visível | vazio/preparando/pronto/parcial/erro e contadores |
| Assets de template | cache separado por escopo/identidade/conteúdo |
| Proteções | não sobrescrever final válido; não inferir alias inseguro; evitar download duplicado |

### 3.6 Controle remoto Portal → Player

O Portal grava `remoteCommand` no documento da tela; o Player recebe pelo listener já usado para o estado da tela, acusa execução no mesmo documento e aplica o comando. Comandos encontrados:

- `previousMedia` e `nextMedia` (com capability gate)
- `pause` e `play`
- `refresh`
- `reload` (reinício da WebView/aplicação lógica)
- `clearCache`
- `maintenance`
- `blackout` com toggle
- `clear` (remove estados operacionais/overlays)
- `overlay` temporário
- `takeover` temporário
- `exitTv` com liberação segura do vínculo

Alterações de playlist e template também enviam `refresh`. O vínculo usa código, `deviceId`, `connectedDeviceId`, binding autenticado e validação contra conflito/rebind. Arquivos: `src/App.jsx`, `player-remote-command.js`, `player-remote-capability.js`, `player-identity.js`, `android-link-lifecycle.js`.

### 3.7 Inicialização e recuperação

- Boot Android por `BootReceiver` e `PlayerBootService`, com tentativas atrasadas.
- Fullscreen/kiosk e detecção de TV em `MainActivity`/`TotemDevicePlugin`.
- Splash, tela de manutenção e suspensão de plano.
- Persistência do vínculo local e validação tolerante a offline/timeout.
- Bootstrap de cliente e playlist usando cache, confirmação remota e gates de readiness.
- Reconexão por eventos `online`, visibilidade, listener Firestore e controlador de recuperação single-tab.
- Diagnósticos de runtime, transição e falha com sanitização de dados sensíveis.

## 4. Mapa da telemetria avançada e dependências

### 4.1 Componentes

| Componente | Responsabilidade | Persistência/publicação |
|---|---|---|
| `traffic-telemetry.js` | RX/TX por UID, bytes baixados, reúso local, hits, remoto/fallback, taxa de hit, deduplicação diária/sessão | localStorage; agregado ao heartbeat |
| `operational-telemetry.js` | schema, app real, estado do player, rede, item atual, origem e cache | snapshot compacto |
| `player-telemetry.js` | sessão, allowlist/config, outbox e heartbeat | localStorage; campos `telemetry.*` no documento da tela |
| `player-activity-telemetry.js` | eventos explícitos de conexão/playback/interrupção/recuperação | localStorage; array ou subcoleção em lotes |
| `telemetry-history.js` + sync | dias, sessões e eventos históricos | `telemetryDaily`, `telemetrySessions`, `telemetryEvents` |
| `TotemDevicePlugin.java` | `PackageManager` e `TrafficStats` por UID | ponte nativa, sem permissão extra |
| `TelemetryDashboard*` e card data | leitura e apresentação no Portal | somente leitura do documento/subcoleções |

### 4.2 Frequência e gravações

- Heartbeat operacional: a cada 15 s, mais boot, reconexão e retorno à visibilidade; execução coalescida impede concorrência.
- Documento da tela: `status`, `lastSeenAt`, dispositivo e, quando autorizado, campos `telemetry.*`.
- Capabilities: apenas quando o fingerprint muda ou após retry.
- Atividade: até 20 eventos drenados por ciclo, por arrayUnion/transaction ou documentos determinísticos em lote.
- Histórico: sincronização com backoff para três subcoleções.
- RX/TX: lido do `TrafficStats` a cada heartbeat; não cria listener próprio.
- Configuração: listener compartilhado em `settings/telemetry2a2c`.

### 4.3 Dependências críticas

| Domínio | Acoplamento | Regra para Etapa 2 |
|---|---|---|
| Reprodução | eventos start/end/error alimentam atividade e tráfego | remover apenas observadores; nunca timers, handlers ou fallback |
| Programação | item/playlist ativo alimenta snapshot | leitura passiva; não alterar seleção/agendamento |
| Controle remoto | mesmo listener/documento de tela do heartbeat | preservar listener e cadência de presença |
| Cache | callbacks de download e origem alimentam métricas | preservar download, journal, readiness e fonte efetiva |
| Identidade | telemetria só sincroniza com binding ACTIVE correspondente | manter gate e incluir identidade de instalação/sessão |
| Portal | cards aceitam legado e schema atual | novo schema deve coexistir, sem apagar campos antigos no primeiro contato |
| Offline | outboxes e histórico sobrevivem reinício | telemetria básica deve limitar fila e não ressuscitar sessão antiga |

## 5. Proposta de telemetria básica

### 5.1 Alternativas consideradas

1. **Reutilizar `telemetry` com novo schema compacto (recomendado).** Mantém o listener e o documento conhecidos, preserva compatibilidade de leitura e permite feature detection por `schemaVersion`.
2. Criar um documento separado `presence`. Isola dados, mas adiciona listener/leitura no Portal e aumenta custo/complexidade.
3. Usar apenas campos legados de topo. É barato, porém não distingue sessão/instalação com segurança e perpetua ambiguidade de versão.

Recomendação: opção 1, com envelope mínimo `telemetry.basic`, sem histórico remoto e sem métricas de tráfego/cache na nova versão.

### 5.2 Contrato proposto

```text
telemetry.schemaVersion: 5
telemetry.profile: "BASIC"
telemetry.installation: {
  packageName, versionCode, versionName,
  buildId, buildTimestamp, installEpoch
}
telemetry.session: {
  sessionId, startedAt, lastHeartbeatAt, sequence
}
telemetry.connection: { state: "ONLINE" | "OFFLINE", changedAt }
telemetry.playback: {
  state: "LOADING" | "PLAYING" | "IDLE" | "ERROR",
  activeType: "PLAYLIST" | "TEMPLATE" | "NONE",
  activeId, activeName, itemId, updatedAt
}
```

Campos de versão vêm exclusivamente de `PackageManager` via `TotemDevice.getAppInfo()`. `buildId` deve ser gerado no build (por exemplo, hash Git + flavor) e incorporado como `BuildConfig`, lido pelo plugin junto com timestamp determinístico. Não usar `VITE_APP_VERSION`, nome do APK ou string salva no Portal como autoridade.

### 5.3 Sessão, atualização e downgrade

- Gerar novo `sessionId` a cada processo do app; não restaurá-lo do localStorage.
- Gerar `installEpoch` local persistente por combinação `packageName|versionCode|versionName|buildId`. Ao detectar combinação diferente, incrementar epoch e invalidar o envelope básico anterior local.
- Cada heartbeat inclui `sessionId`, `installEpoch`, `sequence` crescente e identidade completa do build.
- O Portal considera atual somente o registro cuja `lastHeartbeatAt` é recente e cuja identidade corresponde ao heartbeat mais recente. Nunca preencher dados ausentes com versão de uma sessão anterior.
- Em downgrade, o `versionCode` menor é aceito como realidade instalada, mas o novo `installEpoch` e `sessionId` impedem que campos da versão mais alta permaneçam “atuais”.
- Atualização atômica do envelope inteiro (`telemetry.basic`) evita mistura de subcampos entre versões.
- Não apagar imediatamente `telemetry` legado; o Portal faz feature detection. A limpeza/migração remota fica fora da primeira publicação.

### 5.4 Frequência e custo

- Manter listener em tempo real do documento da tela para comandos.
- Manter heartbeat de presença em 15 s enquanto o Portal depender do limiar atual de 45 s.
- Escrever um único payload compacto junto ao heartbeat, sem RX/TX e sem subcoleções.
- Capabilities continuam deduplicadas por fingerprint.
- Estado de playback só muda o snapshot em memória; não grava por evento. O próximo heartbeat publica o estado consolidado.
- Evento imediato permitido apenas para mudança crítica já existente (reconexão/visibilidade/comando), usando o runner coalescido.
- Etapa posterior pode medir 30 s/60 s, mas não deve alterar a cadência antes de adaptar os limiares internos do Portal.

## 6. Compatibilidade e riscos

| Risco | Impacto | Mitigação/aceite |
|---|---|---|
| V73 identificado como V71 em strings | diagnóstico e atualização incorretos | autoridade nativa + buildId; teste de APK instalado |
| Portal lê schema 3/4 | cards vazios ou versão obsoleta | feature detection schema 5; fallback somente para players antigos |
| Campos legados permanecem no Firestore | telemetria velha parece atual | envelope atômico + freshness + session/installEpoch |
| Remover listener compartilhado | comandos deixam de responder | listener de tela é intocável |
| Aumentar heartbeat | tela aparece offline | manter 15 s até adaptação interna aprovada |
| Remover callbacks de cache/reprodução incorretamente | regressão operacional | testes asseguram handlers e apenas retiram sinks avançados |
| Downgrade | versão maior residual | nova instalação lógica e payload completo a cada sessão |
| Player antigo sem schema 5 | incompatibilidade | Portal preserva caminho legado; sem escrita reversa obrigatória |
| Firestore Rules | nova forma rejeitada | testes em emulador antes de APK; sem tocar produção |
| Offline prolongado | último heartbeat parece atual | freshness obrigatória; estado offline local não substitui ausência de sinal remoto |

Regra visual absoluta: nenhuma mudança em JSX visual, CSS, layout, cores, cards, gráficos, menus ou responsividade do Portal. Eventual adaptação interna deve ficar em normalizadores/readers e testes de dados.

## 7. Matriz de regressão e critérios de aprovação

| Funcionalidade | Arquivo/função | Dependência de telemetria | Risco | Teste necessário | Evidência atual |
|---|---|---|---|---|---|
| Vídeo loop único | `single-item-loop.js` | eventos start/end | handler removido por engano | 3 ciclos locais sem rede/download | teste passou |
| Alternância de mídias | `PlayerPage` | atividade/tráfego | avanço quebrado | A-B-A-B e duração | testes passaram |
| Imagem por duração | timer em `App.jsx` | atividade/tráfego | timer alterado | expiração e loop | testes passaram |
| Erro e fallback | `fallbackToRemoteMedia` | origem/erro | skip/fallback perdido | local inválido→remoto; remoto inválido→próxima | testes de cache/readiness passaram |
| Transição/decoder | `decoder-lifecycle.js` | diagnóstico | nó liberado cedo/tarde | vídeo→vídeo e stale callback | testes passaram |
| Orientação/fullscreen | `MainActivity`, orientation | versão/capability | layout errado | TV 16:9 e 9:16 física | inspeção; teste em dispositivo pendente |
| Playlist remota | active playlist listener | mesmo Firestore | listener removido | update ao vivo | testes passaram |
| Offline/reconexão | snapshot/local-first | presença | estado apagado | cold boot offline + retorno | testes passaram; dispositivo pendente |
| Agendamento | `player-schedule-v62.js` | item ativo | seleção alterada | Brasília, IANA, meia-noite, DST | testes passaram |
| Templates V1 | legado/rehydration | playback state | cache dinâmico perdido | clima/hora/notícia online-offline | clima passou; suíte ampliada pendente |
| Templates V2 | renderer/schema | capability e item ativo | publicação/readiness | 13 tipos, duas orientações | schema/capability passaram |
| Assets V2 offline | offline asset/data cache | stats avançadas | cache removido junto | background/logo/dados cold boot | bloqueado: dependência não instalada |
| Cache nativo | offline-player-cache | métricas RX/TX | callback funcional removido | partial/final/journal/restart | testes passaram |
| Limpar cache | remote `clearCache` | status reportado | comando sem efeito | limpeza + redownload | inspeção; integração pendente |
| Comandos remotos | screen listener | canal compartilhado | latência/regressão | todos os 11 tipos + ack | inspeção; matriz E2E pendente |
| Vínculo/exitTv | identity/link lifecycle | gate de sync | tela liberada indevidamente | offline, conflito, rebind, exit fresco | testes passaram |
| Boot/recovery | BootReceiver/Service | heartbeat inicial | app não sobe | boot frio, crash, energia | dispositivo pendente |
| Presença | heartbeat runner | núcleo a preservar | online falso | 15 s, coalescência, limiar 45 s | testes passaram |
| Versão real | PackageManager | campo básico | string obsoleta | comparar dumpsys/package APK | teste de código passou; APK futuro pendente |
| Sessão/update/downgrade | contrato novo | núcleo novo | mistura de versões | upgrade/downgrade com epoch/session | Etapa 2 |
| Portal sem mudança visual | readers internos | schema dual | regressão visual | screenshots/diff CSS/DOM | Etapa 2; nenhuma alteração nesta etapa |

Critérios de aprovação da Etapa 2: todos os testes locais; emulador de Rules; zero mudança visual; comandos dentro da latência atual; reprodução/cache/agendamento equivalentes; versão instalada comprovada; upgrade e downgrade sem campo residual; tráfego contínuo menor que a base avançada e sem aumento de downloads.

## 8. Plano de medição de internet

### Cenários

1. **Inicial limpo:** app recém-instalado, cache vazio, playlist conhecida.
2. **Inicial quente:** reinício com cache completo.
3. **Contínuo ocioso:** 60 minutos com playlist/template estável, sem downloads.
4. **Contínuo ativo:** 60 minutos com comandos e mudanças controladas.
5. **Download:** uma mídia de tamanho conhecido por vez e lote completo.
6. **Offline/reconexão:** 30 minutos offline e retorno.

### Coleta

- Zerar/registrar baseline do UID antes de cada cenário (`TrafficStats`/`dumpsys netstats` ou ferramenta equivalente).
- Capturar RX/TX total do UID, bytes das mídias, contagem/tamanho de writes e reads Firestore e duração.
- Separar: handshake/boot; dados Firestore/telemetria contínua; integrações de template; downloads de mídia.
- Repetir no mínimo 3 vezes por versão no mesmo dispositivo/rede e usar mediana.
- Comparar V73 avançada congelada versus candidata básica com playlist e cache idênticos.

### Relatório de resultado

| Métrica | Unidade |
|---|---|
| Tráfego inicial sem mídia | KB por boot |
| Tráfego contínuo RX/TX | KB/h |
| Overhead por heartbeat | bytes/ciclo |
| Firestore writes | writes/h |
| Comando remoto | bytes e latência p50/p95 |
| Download | bytes de rede / bytes do arquivo |
| Reúso local | bytes de rede por ciclo (esperado próximo de zero) |
| Reconexão | KB até estabilizar |

Downloads devem ser reportados separadamente; não podem mascarar o custo contínuo da telemetria.

## 9. Resultado da regressão desta etapa

Comando local Node, sem Firebase real e sem build Android: 232 testes executados, 231 aprovados e 1 não iniciado por ausência de `@capacitor/core` no worktree limpo. A falha foi `tests/template-offline-cache.test.js` e não apresentou assertion funcional. Dependências não foram instaladas para manter esta etapa sem preparação de build.

## 10. Plano da Etapa 2 — não executado

1. Aprovar este desenho e escolher formalmente a alternativa de schema compacto.
2. Preparar ambiente de dependências somente no worktree isolado e repetir baseline completo.
3. Escrever primeiro os testes do contrato básico: metadados nativos, buildId, sessão, epoch, upgrade/downgrade, freshness e compatibilidade legada.
4. Extrair o produtor básico sem tocar no listener, heartbeat runner, reprodução, cache ou agendamento.
5. Desconectar os sinks avançados por composição/configuração, preservando os arquivos e a tag de recuperação.
6. Adaptar somente readers/normalizadores internos do Portal, sem alterações visuais.
7. Executar testes locais, Rules em emulador, E2E de comandos e matriz em dispositivo.
8. Medir tráfego V73 versus candidata básica conforme a seção 8.
9. Submeter evidências e relatório para nova aprovação.
10. Somente em etapa posterior e com autorização explícita: gerar APK candidato. Deploy, merge, push e produção continuam proibidos.

## 11. Decisão pendente para aprovação

Recomenda-se o envelope `telemetry.schemaVersion = 5`, `profile = BASIC`, no documento existente da tela, com heartbeat de 15 s, sem RX/TX, atividade remota ou subcoleções de histórico. Esta escolha preserva comandos e compatibilidade com Players antigos ao menor custo de mudança.
