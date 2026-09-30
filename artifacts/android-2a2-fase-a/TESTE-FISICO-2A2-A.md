# TESTE FÍSICO — PLAYER LAB 2A.2-A

Status: **APROVADO COM OBSERVAÇÃO**

Dispositivo: TV Teste — `KEYFRK`  
Build: Totem Park Player LAB 2A.2-A  
Package: `br.com.parksolutions.totempark.player.lab`

## Teste A — mídia preparada

Playlist utilizada:

- 2 vídeos;
- 2 imagens;
- 2 templates.

### Primeira captura

- Sessão: `1b8655f9`
- Início: `2026-09-19T22:39:40.129Z`
- Downloads: 2
- Bytes: 9.752.988
- Hits/misses: 25/2
- Falhas/timeouts: 0/0
- Playback: 6 local / 1 remoto
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\12a.jpeg`

### Após repetições

- Downloads: 2 (`+0`)
- Bytes: 9.752.988 (`+0`)
- Hits/misses: 35/2 (`+10 hits`, `+0 misses`)
- Falhas/timeouts: 0/0
- Playback: 50 local / 1 remoto (`+44 local`, `+0 remoto`)
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\13b.jpeg`

### Resultado

**APROVADO.** Quatro mídias cacheáveis completaram 11 passagens adicionais exclusivamente locais. Não houve FileTransfer, miss, falha, timeout ou reprodução remota adicional. Os dois templates não entram no contador de mídia local/remota.

Critério exigido: FileTransfer adicional 0, Remote adicional 0, Local +10.  
Resultado obtido: FileTransfer adicional 0, Remote adicional 0, Local +44.

## Teste B — mídia nova

Mídia adicionada:

- Nome: `amigos`
- Tipo: imagem
- Tamanho informado: 1,03 MB

### Captura após inclusão

- Sessão: `1b8655f9` (mesma sessão)
- Downloads: 3 (`+1`)
- Bytes: 10.837.047 (`+1.084.059 bytes`)
- Hits/misses: 46/3 (`+11 hits`, `+1 miss`)
- Falhas/timeouts: 0/0
- Playback: 56 local / 1 remoto (`+6 local`, `+0 remoto`)
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\14b.jpeg`

### Resultado

**APROVADO.** A imagem nova gerou exatamente um miss e um download concluído. O acréscimo de 1.084.059 bytes é compatível com o tamanho informado de 1,03 MB. A contagem remota permaneceu estável, a origem registrada foi LOCAL e não houve falha ou timeout.

## Teste C — offline

Condição: TV desconectada da internet, mantendo o cache e a playlist do Teste B.

### Após 10 ciclos

- Sessão: `1b8655f9` (mesma sessão)
- Downloads: 3 (`+0`)
- Bytes: 10.837.047 (`+0`)
- Hits/misses: 58/3 (`+12 hits`, `+0 misses`)
- Falhas/timeouts: 0/0
- Playback: 108 local / 1 remoto (`+52 local`, `+0 remoto`)
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\15b.jpeg`

Observação operacional: o primeiro ciclo apresentou um adiantamento pontual. Os nove ciclos seguintes foram concluídos perfeitamente, segundo o operador.

### Resultado

**APROVADO COM OBSERVAÇÃO.** Durante a execução offline não houve novo download, tráfego de mídia registrado, miss, reprodução remota adicional, falha ou timeout. Houve um adiantamento somente no primeiro ciclo; o comportamento não se repetiu nos nove ciclos seguintes. A ocorrência permanece registrada para comparação nas próximas etapas.

## Teste D — reabrir aplicativo

Condição: saída normal para a tela inicial e reabertura do Player LAB, mantendo a TV offline e sem limpar cache ou dados.

### Após 3 ciclos

- Sessão: `1b8655f9` (mantida pelo processo Android)
- Downloads: 3 (`+0`)
- Bytes: 10.837.047 (`+0`)
- Hits/misses: 70/3 (`+12 hits`, `+0 misses`)
- Falhas/timeouts: 0/0
- Playback: 124 local / 1 remoto (`+16 local`, `+0 remoto`)
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\16b.jpeg`

Relato operacional: três ciclos perfeitos, sem novo adiantamento.

### Resultado

**APROVADO.** O aplicativo retomou offline, preservou o vínculo e o cache e reproduziu três ciclos sem novo download, miss, reprodução remota adicional, falha ou timeout. A sessão permaneceu igual, evidenciando retomada da instância preservada pelo Android nesta reabertura normal.

## Teste E — reconexão

Condição: rede restabelecida com o Player LAB aberto, sem alteração da playlist ou do cache.

### Após 3 ciclos

- Sessão: `1b8655f9`
- Downloads: 3 (`+0`)
- Bytes: 10.837.047 (`+0`)
- Hits/misses: 82/3 (`+12 hits`, `+0 misses`)
- Falhas/timeouts: 0/0
- Playback: 139 local / 1 remoto (`+15 local`, `+0 remoto`)
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\17b.jpeg`

Relato operacional: três ciclos perfeitos após a reconexão.

### Resultado

**APROVADO.** A reconexão não provocou novo download, miss, reprodução remota adicional, falha ou timeout. As cinco mídias cacheáveis completaram três ciclos locais, totalizando mais 15 reproduções locais.

## Conclusão provisória do gate físico

Os Testes A, B, D e E foram aprovados. O Teste C foi aprovado com a observação de um adiantamento no primeiro ciclo offline, sem repetição nos nove ciclos offline seguintes, nos três ciclos após a reabertura e nos três ciclos após a reconexão.

O gate físico demonstra que o Player LAB 2A.2-A:

- reutiliza mídias preparadas sem novo FileTransfer;
- baixa uma mídia nova uma única vez e passa a reproduzi-la localmente;
- mantém a reprodução local sem internet;
- preserva vínculo e cache durante reabertura normal offline;
- não baixa novamente as mídias ao restabelecer a rede;
- permaneceu com zero falhas e zero timeouts durante esta sessão.

## Exportação final da telemetria

- Arquivo original: `C:\Users\centr\Downloads\totempark-android-diagnostic_2.json`
- Evidência arquivada: `C:\Users\centr\Desktop\totem-park\artifacts\android-2a2-fase-a\evidencias\totempark-android-diagnostic-2a2-a.json`
- SHA-256: `5C80FF32429051B1457FD5548DC565DFAD62D979045F9E6C04561B3A7BB507F1`
- Schema: 2
- Sessão completa: `1b8655f9-149a-4c6c-98a0-03781cfcc133`
- Build: `1.0-player-lab-2a2-a`
- Início: `2026-09-19T22:39:40.129Z`
- Exportação: `2026-09-19T23:39:17.719Z`
- Eventos: 317
- FileTransfer: 3 iniciados, 3 concluídos, 0 falhas e 0 timeouts
- Cache: 82 hits e 3 misses
- Reprodução: 139 local e 1 remota
- Eventos de erro: 0

O JSON corresponde à sessão das capturas físicas e reproduz exatamente os totais exibidos na evidência final. O último evento registrado é `DIAGNOSTIC_EXPORTED`.

## Veredito final

**FASE A APROVADA COM OBSERVAÇÃO.** O Local First real foi demonstrado na TV piloto. A única ressalva é o adiantamento pontual no primeiro ciclo offline, sem recorrência nos nove ciclos offline seguintes, nos três ciclos após reabertura e nos três ciclos após reconexão. A telemetria final não contém falhas, timeouts ou eventos de erro.

## Verificação posterior — Player oficial restaurado

Após encerrar o LAB, o Player oficial foi restaurado e ficou online. O operador observou ordens de reprodução diferentes entre vários ciclos.

A inspeção do código não encontrou lógica de embaralhamento no Player. A sequência é construída diretamente a partir de `activePlaylist.items`; portanto, a variação observada é compatível com avanços ou itens pulados no Player oficial atual, e não com uma ordem aleatória configurada.

Esse comportamento residual do Player oficial não altera a aprovação do LAB 2A.2-A. Ele reforça a diferença observada no teste: o LAB completou os ciclos controlados com cache local e sem recorrência do avanço, enquanto o oficial ainda não contém a correção validada exclusivamente no build LAB.
