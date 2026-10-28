# Telemetria Histórica — Etapa 1

## Intenção

Persistir histórico diário, sessões e eventos comprovados sem substituir os motores atuais de tráfego, atividade, cache ou heartbeat. A base deve operar Local First e permanecer compatível com Players antigos.

## Decisões

- Manter o snapshot atual da tela e `telemetrySessions/{sessionId}`.
- Criar `telemetryDaily/{YYYY-MM-DD}` com valores absolutos monotônicos derivados de `dailySnapshot()` e de eventos V2-A confirmados.
- Criar `telemetryEvents/{eventId}` para eventos detalhados, com IDs determinísticos e campo `expiresAt` para futura retenção de 180 dias.
- Manter uma fila local persistente. Somente confirmar localmente depois de uma gravação aceita.
- Sincronizar em checkpoints de 15 minutos e em transições relevantes; nunca criar uma escrita adicional por heartbeat.
- Um encerramento só é `CONFIRMED` quando há evento explícito. Reinício com estado aberto é `UNKNOWN_INTERRUPTION`; ausência de heartbeat não aumenta reprodução comprovada.
- Usar datas UTC e dividir intervalos comprovados que cruzem a meia-noite.

## Não objetivos

- Dashboard histórico, relatório PDF, migração de dados antigos, publicação, APK ou alteração remota de Firebase.
- Mudar cache, reprodução, layouts ou CSS.

## Compatibilidade e segurança

Novas coleções são opcionais e não alteram o contrato do snapshot existente. Rules locais exigem binding ativo e identidade exata de cliente/tela/dispositivo. Nenhuma Rule será aplicada remotamente nesta etapa.

## Alternativas consideradas

1. Incrementos Firestore por evento: rejeitada por custo e risco de duplicação.
2. Recalcular tudo no servidor: rejeitada porque duplica motores e perde o comportamento offline.
3. Checkpoints absolutos monotônicos com outbox local: escolhida por ser econômica, idempotente e compatível com os acumuladores atuais.
