# TOTEM PARK — FAST TRACK TELEMETRY V1

## Classificação

- **PLAYER PRINCIPAL: APTO PARA PRODUÇÃO** como base operacional v11 já aprovada fisicamente. Nenhum rollout geral foi feito nesta etapa.
- **TELEMETRIA ESSENCIAL V1: PRONTA PARA PILOTO** no código e no APK, aguardando instalação e teste físico controlado. Nenhuma tela foi ativada.
- **PORTAL WEB DE TELEMETRIA: PRONTO PARA HOMOLOGAÇÃO** local, ainda não publicado.

## Player de produção

O APK V1 reutiliza os assets selados do rollback v11. Dentro do APK final, o bundle `assets/public/assets/index-C8VMWlD5.js` tem SHA-256 `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB`; o CSS `assets/public/assets/index-GA5ypR-T.css` tem SHA-256 `77391472D6D3A2A464B24488322B6CBC09511D2E8FAE63229853234DB9594BD5`. Ambos correspondem aos hashes exigidos. Nenhum código de reprodução foi recompilado para este APK. Local First, cache, offline, timeout/retry, LINK-FIX, playlist e single-item loop permanecem na base v11.

## Telemetria essencial V1

O sidecar mantém `screenId`, `clientId`, `deviceId`, `appVersion`, `sessionId`, início da sessão e contadores de playing, waiting, stalled, erros, reproduções locais/remotas e tempo observado de exibição. Observa `playing`, `waiting`, `stalled`, `ended` e `error` e informa origem `CACHE_LOCAL`, `INTERNET_FALLBACK` ou `UNKNOWN`, exibida no Portal como LOCAL, REMOTE ou UNKNOWN. `MEDIA_ERR_DECODE` é identificado pelo código 3 do elemento de mídia.

Handlers de mídia atualizam somente memória. O buffer local guarda no máximo 20 eventos relevantes; a classificação de origem é reutilizada enquanto o `src` não muda. Não há `JSON.stringify`, `localStorage.setItem`, autenticação, Firestore ou checkpoint por evento. Na passagem OFF→ON o sidecar inicia apenas a contagem; espera pelo menos 60 segundos e não gera checkpoint antes de cinco minutos. Checkpoints são adiados até `playing`/`load` estável por dois segundos. A outbox é limitada, preserva sessão/sequence, e a chave do último envio de estado é guardada para evitar reenvio após reabertura. Histórico só é escrito após o primeiro checkpoint e no máximo uma vez a cada 15 minutos. Persistência local ocorre no checkpoint, no reconhecimento da outbox ou nas pequenas configurações agendadas em idle/timer.

## Vínculo

`claimPlayerBinding` agora cria `linkedAt` com `FieldValue.serverTimestamp()` tanto no binding quanto na tela. A mesma vinculação ativa preserva a data, incluindo validação e reabertura; revogação seguida de pareamento ou troca real do deviceId cria nova data. `createdAt` continua como data de criação do registro. Bindings ACTIVE existentes não exigem pareamento novo. O Portal usa apenas `linkedAt` do binding ACTIVE correspondente: `pairedAt` e `createdAt` podem pertencer a um vínculo anterior e não são promovidos automaticamente. Sem timestamp comprovado, “Vinculada desde” mostra `—`. Histórico completo de trocas de vínculo foi adiado porque exige estrutura adicional.

O fluxo continua com Firebase Anonymous Auth e as Functions existentes `claimPlayerBinding`, `validatePlayerBinding` e `revokePlayerBinding`. As Firestore Rules não foram afrouxadas. Teste em emulador confirmou que o Player não consegue editar binding nem `linkedAt` na tela. A Function alterada **não foi implantada**.

## Portal Web

O novo painel V1 mostra separadamente status da tela (ONLINE, ATENÇÃO, OFFLINE) e status da telemetria (TELEMETRIA DESATIVADA, AGUARDANDO PRIMEIRO SINAL, ATIVA, DADOS DESATUALIZADOS, TELA OFFLINE). Erro de leitura e ausência de dados no período têm estados explícitos. Documentos antigos e campos ausentes mostram `—` ou “Não instrumentado”, sem zeros inventados. O detalhe da tela reúne identificação, vínculo atual, comunicação, sessão, reprodução, erros, checkpoint e a seção reservada para métricas V2.

O card “Telas em tempo real” preserva os campos anteriores e acrescenta última comunicação, “Vinculada desde”, versão quando observada e status da telemetria. O card abre o detalhe da mesma tela. Clientes são ordenados alfabeticamente no Dashboard, na lista de Clientes e nos filtros de telemetria. A versão exibida vem da sessão observada; uma versão antiga de pareamento não é apresentada como versão atual do app.

## Métricas avançadas adiadas para V2

Cache hit/miss exato, bytes reais de mídia, tráfego evitado, FileTransfer detalhado, retry, download lock, cache parcial, falhas de cache e economia financeira. O Portal reserva espaço e marca essas métricas como “Não instrumentado”.

## Overhead modelado

Uma simulação local com 12 alternâncias A/B gerou **1.012 bytes por checkpoint** e **1.025 bytes por documento de histórico**. A cadência máxima nominal é de 288 checkpoints e 96 históricos por dia: **389.856 bytes, cerca de 381 KiB/dia/tela ou 11,15 MiB em 30 dias/tela**. Esta é soma dos JSONs de aplicação; não inclui protocolo Firestore, Auth, listeners ou retransmissões e **não é tráfego real medido na TV**. Tráfego de mídia é outra categoria e não foi estimado com esses números.

## Builds e APK

- Build Web: passou localmente; não foi publicado.
- Build Android `:app:assemblePlayerTelemetryDebug`: passou em estágio isolado.
- Package piloto existente: `br.com.parksolutions.totempark.player.telemetry`.
- VersionCode: `3`; VersionName: `1.0-player-2a2-c-telemetry-v1`.
- APK: `Totem-Park-Player-2A2-C-Telemetry-V1-Pilot.apk`.
- APK SHA-256: `817171C7A88738E32BCF8D00A9B7166D8E196BD0A9CEFE815A04EADBC141116E`.
- Sidecar no APK SHA-256: `CEE2186846E25A6E22AFC07083638A9FBC8810FE061E25CFE33F2414C82CB45C`.
- Certificado Android Debug SHA-256: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`, igual ao APK Binary Sealed anterior do mesmo package.

## Arquivos relevantes

- `functions/index.js`: linkedAt server-side.
- `sealed-telemetry/observer-core.js`, `telemetry-observer.js`, `estimate.mjs`: sidecar V1 e medição local.
- `src/TelemetryDashboardV1.jsx`, `src/telemetry-v1.js`: Portal V1 e leitura defensiva.
- `src/App.jsx`, `src/App.css`: card, navegação e ordenação de clientes.
- `tests/player-binding-functions.test.mjs`, `tests/firestore-player-identity.rules.test.mjs`, `sealed-telemetry/observer-core.test.js`, `src/telemetry-v1.test.js`: testes focados.
- `artifacts/fast-track-telemetry-v1/stage/android`: estágio isolado do APK.

## Testes e limites

Passaram: testes do observador/estados, testes das Functions com Auth/Firestore/Functions Emulator, regras Firestore, lint dos arquivos novos e do sidecar, build Web, build Android, inspeção de package/version e hashes dos assets empacotados. O lint global de `src/App.jsx` possui numerosos problemas preexistentes; o build Web valida a sintaxe deste arquivo. Não houve teste físico, publicação do Portal ou deploy da Function nesta etapa. A flag remota e allowlists não foram alteradas, e o APK não foi instalado.

Próxima homologação, sob autorização separada: aplicar a Function e o Portal preparados, instalar somente este APK sobre o package piloto existente, confirmar A/B visualmente diferentes e LOCAL, observar primeiro com telemetria OFF e depois ON por curto período numa única tela. Se ocorrer `MEDIA_ERR_DECODE`, parar e preservar evidências.

## Deploy controlado e gate físico — 26/09/2026

- `claimPlayerBinding` foi implantada isoladamente em `totem-park` e verificada ACTIVE (`us-central1`, hash `62e9e2b9271edd92e10f2d99e002c413f64b83d4`). `validatePlayerBinding` e `revokePlayerBinding` continuaram ACTIVE e sem mudança. O CLI terminou com aviso sobre política de limpeza de imagens após confirmar a atualização da Function; nenhuma política foi alterada.
- Rules de produção permaneceram no ruleset `2c178771-fcdf-476d-b477-daa12237d258`, idênticas ao arquivo local. Testes de Rules (9/9), Function (1/1), estado do Portal (3/3) e build Web passaram.
- Auditoria dos bindings ACTIVE existentes sem `linkedAt`: apenas um, da TV piloto. `pairedAt`, `createdAt` e `updatedAt` eram `2026-09-26T03:52:03.796Z`; metadados Firestore mostravam criação em `2026-09-26T03:52:03.816299Z` e nenhuma atualização do documento desde então. UID, clientId, screenId e deviceId coincidiam com a tela. Backfill atômico de `linkedAt` foi aplicado ao binding e à tela com precondições de `updateTime`; releitura confirmou ambos e preservação do vínculo ACTIVE. Nenhuma data incerta foi inventada.
- Portal publicado em produção: deployment `dpl_CrNjxc8KTPpfGf55WpJLSFvTcUTU`, domínio `https://totempark.com.br`, HTTP 200. O HTML serviu os assets novos e o bundle publicado contém Telemetry V1, “Vinculada desde” e estados não instrumentados. A validação visual autenticada de todas as telas do Portal não foi concluída.
- APK piloto v3 existente conferido novamente por SHA-256: `817171C7A88738E32BCF8D00A9B7166D8E196BD0A9CEFE815A04EADBC141116E`. Nenhum novo APK foi gerado.
- Gate físico OFF na TV Teste: houve demora inicial em “Carregando player”, mas o usuário corrigiu o relato e informou que o Player carregou e a reprodução passou a ocorrer normalmente. A versão instalada ainda precisa ser confirmada pelo package/versionName na TV; os três minutos de observação, A/B LOCAL e o resultado formal do gate OFF permanecem pendentes. A etapa ON não foi iniciada. Releitura de `settings/telemetry2a2c` confirmou `enabled:false` e três allowlists vazias; binding piloto permaneceu ACTIVE.

Classificação provisória desta rodada: **BACKEND LINKEDAT APROVADO**; **PORTAL WEB pendente de homologação autenticada** (publicado); **TELEMETRIA V1 pendente de confirmação da instalação e do gate físico OFF**. **PLAYER PRINCIPAL permanece APTO PARA PRODUÇÃO**; não houve nova evidência contra o v11.

### Gate físico OFF e primeira ativação — correção do registro

O usuário confirmou posteriormente que “Carregando player” demorou, mas carregou; relatou a versão exibida esperada e aproximadamente três minutos de alternância A↔B normal, ambos LOCAL. Assim, o gate OFF foi reportado como aprovado. Não houve motivo para classificar a demora inicial como falha.

Às `2026-09-27T01:15:22.237195Z`, após esse relato, a flag foi salva como `enabled:true`, `screenIds:["emp3VDKfLzmz1sWJrnbx"]`, `clientIds:[]`, `deviceIds:[]`. Consulta às `01:17Z` encontrou checkpoint novo da tela piloto (`telemetryUpdatedAt: 2026-09-27T01:15:35.313Z`, sessão iniciada às `01:05:35.603Z`, sequence 1). O payload identificava `appVersion: 1.0-player-2a2-c-binary-sealed-pilot` e `current.mediaSource: INTERNET_FALLBACK`, com `currentSrc` Firebase Storage. Contadores dessa sessão: 0 local, 1 remoto, 2 waiting, 0 stalled, 0 playbackErrors; `lastError:null`. Nenhuma outra das 9 telas consultadas teve `telemetryUpdatedAt` posterior à ativação. O histórico também continha dados antigos do piloto anterior, que não foram confundidos com o checkpoint atual.

A divergência entre a versão/origem informada no checkpoint e a versão/LOCAL relatados na TV impede aprovar a V1. O checkpoint não prova sozinho qual APK estava instalado nem a causa da origem remota. A flag foi revertida imediatamente às `2026-09-27T01:18:09.614810Z`; releitura confirmou `enabled:false` e todas as allowlists vazias. A etapa ON foi encerrada antes dos cinco minutos. Nenhuma reinstalação, novo APK ou investigação do Player foi iniciada.

Classificação final desta rodada: **BACKEND LINKEDAT APROVADO**; **PORTAL WEB BLOQUEADO para homologação final** (deploy concluído, validação visual autenticada incompleta); **TELEMETRIA V1 BLOQUEADA** (checkpoint com versão anterior e origem REMOTE inesperada). **PLAYER PRINCIPAL permanece APTO PARA PRODUÇÃO**.
