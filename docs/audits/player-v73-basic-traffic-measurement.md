# Etapa 3 — medição de comunicações e consumo

## Medição local disponível

O teste `tests/player-basic-traffic-budget.test.js` serializou um heartbeat representativo do campo `telemetry` BASIC:

- envelope JSON: **867 bytes**;
- intervalo mantido: **15 segundos**;
- frequência: **4 por minuto, 240 por hora**;
- projeção matemática apenas do JSON do envelope: 208.080 bytes/hora e 4.993.920 bytes/dia.

Essa projeção **não é consumo de internet**. Ela não inclui o restante do documento de presença, protobuf/gRPC do Firestore, índices, TLS, keepalive, autenticação, retransmissões ou tráfego de listeners. Também não mede a versão V73 avançada. Portanto, nenhuma redução foi afirmada.

O listener de comandos continua em tempo real e independente do heartbeat. O heartbeat permanece em 15 segundos para respeitar a validade atual de presença de 45 segundos.

## Protocolo comparativo V73 versus BASIC

Executar somente após autorização para build/homologação física:

1. Usar a mesma TV, rede, tela, conta, playlist e janela de 24 horas para cada versão.
2. Zerar contadores do roteador/VLAN ou capturar por IP/UID imediatamente antes de cada rodada.
3. Rodar três cenários separados:
   - cold start com cache vazio;
   - warm start com cache completo e mídia local;
   - operação contínua por 24 horas sem alteração de playlist.
4. Repetir com templates estáticos, Clima Premium, Notícias e Hora Certa, registrando cada endpoint externo.
5. Injetar separadamente uma nova mídia de tamanho conhecido para isolar download.
6. Registrar comandos remotos a cada cinco minutos e medir latência p50/p95, sem misturar seus bytes com mídia.

## Categorias obrigatórias

| Categoria | Método de separação |
| --- | --- |
| Download inicial | diferença até cache ficar pronto, confirmada pelo tamanho dos arquivos |
| Tráfego contínuo | janela warm de 24 h sem downloads de mídia |
| Mídia local | playback com rede bloqueada depois do cache pronto |
| Templates dinâmicos | filtro por hosts de clima/RSS/esportes e comparação com template estático |
| Firestore operacional | hosts Firestore/Auth/Functions, separando reads/listeners de writes |
| Comandos | timestamps de envio/ack e bytes durante janelas sem mídia nova |

Relatar bytes recebidos/enviados, total, média horária, p95 de latência de comando e variação entre repetições. Só afirmar economia se as rodadas forem equivalentes e a diferença superar a variação observada.

