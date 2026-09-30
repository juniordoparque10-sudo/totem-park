# TESTE FÍSICO — PLAYER CANARY 2A.2-A

Status: **APROVADO**

Dispositivo: TV Teste — `KEYFRK`  
Build: Totem Park Player CANARY 2A.2-A  
Package: `br.com.parksolutions.totempark.player.canary`  
APK SHA-256: `6C591E75270E88797C43A9ED510201195B6648CFE33D7B0AF78A2033D630DA45`

## Regras da execução

- Player oficial e CANARY não podem executar simultaneamente.
- Nenhum código, build, backend, playlist ou cache será alterado durante a coleta, salvo a inclusão controlada de mídia no gate específico.
- O armazenamento inicial do CANARY é considerado frio por ser um package separado.
- Parar imediatamente diante de regressão de sequência, tela preta, travamento, crash, item ausente ou falha persistente.

## Gate 1 — primeira preparação

Condição: package CANARY com armazenamento inicialmente frio.

### Resultado após 10 ciclos

- Sessão: `19bf5d6c`
- Início: `2026-09-20T00:42:35.485Z`
- FileTransfers concluídos: 6
- Bytes baixados: 19.964.621
- Cache: 6 hits / 6 misses
- Falhas/timeouts: 0/0
- Playback: 46 local / 1 remoto
- Origem final: LOCAL
- Evidência: `C:\Users\centr\Downloads\18c.jpeg`
- Relato operacional: 10 ciclos sem qualquer erro.

### Veredito

**APROVADO.** A preparação inicial concluiu todos os seis downloads sem falha ou timeout. O único playback remoto é compatível com o fallback permitido durante a primeira preparação. As reproduções seguintes foram locais e os dez ciclos foram concluídos sem regressão funcional ou de sequência.

## Gate 2 — cache quente

**APROVADO.** A mesma execução de dez ciclos demonstrou reutilização do cache: 46 playbacks locais, somente um remoto inicial, seis misses correspondentes aos seis downloads iniciais e zero falhas/timeouts. Não há evidência de FileTransfer repetido para as mídias preparadas.

## Gate 3 — reabertura

Condição: CANARY forçado a parar, espera de 15 segundos e nova abertura online.

### Resultado após 1 ciclo

- Nova sessão: `2f6fd1a2`
- Início: `2026-09-20T01:03:04.523Z`
- FileTransfers concluídos: 6 (`+0`)
- Bytes baixados: 19.964.621 (`+0`)
- Cache: 18 hits / 6 misses (`+12 hits`, `+0 misses`)
- Falhas/timeouts: 0/0
- Playback: 51 local / 1 remoto (`+5 local`, `+0 remoto`)
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\19c.jpeg`
- Relato operacional: tudo normal.

### Veredito

**APROVADO.** A nova sessão reutilizou os arquivos persistentes, não iniciou novo FileTransfer, não aumentou bytes, misses ou playback remoto e completou o ciclo local sem erro.

## Gate 4 — offline, 10 ciclos

Protocolo reduzido para três ciclos após os dez ciclos iniciais perfeitos.

### Resultado após 3 ciclos offline

- Sessão: `2f6fd1a2`
- FileTransfers concluídos: 6 (`+0`)
- Bytes baixados: 19.964.621 (`+0`)
- Cache: 30 hits / 6 misses (`+12 hits`, `+0 misses`)
- Falhas/timeouts: 0/0
- Playback: 69 local / 1 remoto (`+18 local`, `+0 remoto`)
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\20c.jpeg`
- Relato operacional: três ciclos sem erro.

### Veredito

**APROVADO.** As seis mídias cacheáveis completaram três ciclos offline, totalizando 18 reproduções locais adicionais. Não houve download, aumento de bytes, miss, playback remoto, falha ou timeout.

## Gate 5 — reconexão

Condição: rede restaurada com o CANARY aberto após o teste offline.

### Resultado após 3 ciclos

- Sessão: `2f6fd1a2`
- FileTransfers concluídos: 6 (`+0`)
- Bytes baixados: 19.964.621 (`+0`)
- Cache: 42 hits / 6 misses (`+12 hits`, `+0 misses`)
- Falhas/timeouts: 0/0
- Playback: 79 local / 1 remoto (`+10 local`, `+0 remoto`)
- Origem: LOCAL
- Status da tela: voltou a aparecer online
- Evidência: `C:\Users\centr\Downloads\21c.jpeg`
- Relato operacional: três ciclos normais.

### Veredito

**APROVADO.** Heartbeat/status online retornou, a reprodução permaneceu local e não houve redownload, aumento de bytes, miss, playback remoto, falha ou timeout. O operador confirmou visualmente três ciclos normais; a telemetria registrou dez novos inícios de playback local no intervalo.

## Gate 6 — long run, 1 hora

Baseline:

- sessão `2f6fd1a2`;
- 6 downloads;
- 19.964.621 bytes;
- 42 hits / 6 misses;
- 79 local / 1 remoto;
- 0 falhas / 0 timeouts.

### Resultado final

- Sessão completa: `2f6fd1a2-39ab-45f2-8158-d0567fe30864`
- Build: `1.0-player-canary-2a2-a`
- Duração registrada da sessão: 76,48 minutos
- FileTransfers: 6 iniciados / 6 concluídos (`+0` no long run)
- Bytes baixados: 19.964.621 (`+0` no long run)
- Cache: 54 hits / 6 misses (`+12 hits`, `+0 misses` desde o baseline)
- Playback: 276 local / 1 remoto (`+197 local`, `+0 remoto` desde o baseline)
- Falhas/timeouts: 0/0
- Eventos de erro: 0
- Origem final: LOCAL
- Evidência visual: `C:\Users\centr\Downloads\22c.jpeg`
- Relato operacional: tudo normal.

### Evidência JSON

- Arquivo original: `C:\Users\centr\Downloads\totempark-android-canary-diagnostic.json`
- Arquivo arquivado: `C:\Users\centr\Desktop\totem-park\artifacts\android-2a2-canary\evidencias\totempark-android-canary-diagnostic-final.json`
- SHA-256: `1E6A3ED5F817744727CBA4359E1B781B016977C0787A9894F785602F604D86D6`
- Eventos registrados: 363
- Eventos de erro: 0

### Veredito

**APROVADO.** A sessão superou uma hora, acrescentou 197 reproduções locais sem qualquer reprodução remota adicional, FileTransfer, byte baixado, miss, falha, timeout ou evento de erro.

## Conclusão do gate físico

**PLAYER CANARY 2A.2-A APROVADO NA TV PILOTO.**

Todos os gates foram aprovados:

- primeira preparação;
- cache quente;
- reabertura com reutilização persistente;
- três ciclos offline;
- reconexão com retorno do status online;
- long run superior a uma hora.

A única reprodução remota ocorreu durante a preparação inicial com cache frio. Depois da preparação, o contador remoto permaneceu estável em 1 enquanto o contador local chegou a 276. Não houve regressão de sequência, tela preta, travamento, item ausente, redownload, falha, timeout ou erro de playback relatado.

## Restauração pós-teste

Após a homologação:

- o CANARY foi encerrado;
- o Player oficial foi reaberto;
- a tela voltou a aparecer online;
- a reprodução oficial permaneceu normal.

Estado final da TV piloto: **PLAYER OFICIAL ONLINE E REPRODUZINDO NORMALMENTE**.

## Ajuste de protocolo

Após dez ciclos perfeitos no início, o operador solicitou reduzir repetições manuais por fadiga. Os gates restantes serão executados com:

- reabertura: 1 ciclo completo;
- offline: 3 ciclos completos;
- reconexão: 3 ciclos completos;
- long run: 1 hora sem necessidade de observação contínua, com captura inicial e final.
