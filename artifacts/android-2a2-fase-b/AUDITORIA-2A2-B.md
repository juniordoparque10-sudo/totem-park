# TOTEM PARK — Android 2A.2-B

## Diagnóstico do fluxo anterior

- O chamador configurava um timeout total fixo de **12 segundos em Smart TV** e 20 segundos nos demais Androids.
- `Promise.race` encerrava apenas a espera JavaScript; a API `@capacitor/file-transfer` não oferece cancelamento.
- Após esse timeout lógico, o código media e apagava o arquivo parcial enquanto a transferência nativa podia continuar.
- Uma execução posterior tentava a mesma mídia novamente desde zero. Não havia retomada, backoff nem proteção global contra transferências duplicadas.
- Evidência anterior: 6 timeouts e pelo menos 469.011.130 bytes parciais descartados em uma sessão real.

## Política implementada

- Removido o timeout total de 12/20 segundos.
- `connectTimeout` e `readTimeout` nativos definidos em 60.000 ms, valor padrão documentado pelo plugin. O `readTimeout` reinicia quando novos dados chegam, logo mede inatividade e permite arquivos grandes em conexões lentas.
- Progresso nativo ativado e telemetria local limitada por 1 MiB ou 5 segundos.
- Single-flight global por caminho + URL: chamadas concorrentes aguardam a mesma transferência.
- Arquivo final só é aceito com tamanho maior que zero e, quando o tamanho esperado existe, igualdade exata.
- Retry máximo de uma vez, com backoff de 2 segundos, somente quando **zero bytes** foram gravados e o erro não é HTTP 4xx.
- Se existe parcial com bytes, não há retry imediato, reduzindo o risco de baixar novamente um arquivo grande desde zero.
- A API instalada não oferece cancelamento nem resume/range. Nenhum resume foi simulado e `FILETRANSFER_CANCELLED` não é emitido sem um cancelamento real.

## Telemetria local

- `FILETRANSFER_START`
- `FILETRANSFER_PROGRESS`
- `FILETRANSFER_STALLED`
- `FILETRANSFER_TIMEOUT`
- `FILETRANSFER_COMPLETE`
- `FILETRANSFER_RETRY`
- `FILETRANSFER_PARTIAL_FILE_SIZE`

## Validação local

- 5 testes de política aprovados:
  - arquivo completo, vazio e tamanho divergente;
  - ausência de timeout total;
  - progresso lento;
  - retry controlado;
  - single-flight concorrente.
- Build Vite `playerPhaseB`: aprovada.
- Build Android `assemblePlayerPhaseBDebug`: aprovada.
- Package isolado: `br.com.parksolutions.totempark.player.phaseb`.
- APK: `Totem-Park-Player-2A2-B-AUDIT.apk` (6.410.817 bytes).
- SHA-256: `7F396CC4F931F9A370F36EED756FFE0FBF34C657AAD914C868337D89BE4CB22E`.
- Nenhuma instalação, publicação ou mudança em produção foi realizada.

## Próximo gate físico

Usar apenas TV piloto e mídia grande. Confirmar progresso por período superior a 12 segundos, conclusão, tamanho final, ausência de duplicidade e ausência de novo download após reabrir. Depois simular interrupção real de rede para observar timeout por inatividade e tamanho parcial, sem repetir homologações extensas da Fase A.

**Estado: PRONTO PARA TESTE FÍSICO CONTROLADO.**

## Resultado do teste físico — AUDIT R2

- TV Android real, cache inicialmente frio e playlist com dois vídeos.
- `vd 2.mp4`: 135.677.009 bytes, concluído em 18.997 ms, tamanho final exato.
- `vd teste.mp4`: 84.023.317 bytes, concluído em 18.111 ms, tamanho final exato.
- Ambos ultrapassaram o antigo limite de 12 segundos sem timeout prematuro.
- Totais: 4 FileTransfers iniciados, 4 concluídos, 0 falhas e 0 timeouts.
- Nenhum `DUPLICATE_FILETRANSFER`, `FILETRANSFER_RETRY`, `FILETRANSFER_STALLED` ou parcial registrado.
- Os vídeos tiveram uma transferência cada e passaram a ser reproduzidos localmente.
- O quarto FileTransfer observado foi o logotipo do cliente, de 28.438 bytes, e não uma repetição de vídeo. O logotipo foi transferido duas vezes em momentos diferentes; isso representa 28.438 bytes redundantes, sem concorrência.
- Reprodução registrada: 10 locais e 1 remota. A única remota ocorreu enquanto o primeiro vídeo ainda preparava o cache.
- Os eventos alternaram `vd 2` e `vd teste` aproximadamente a cada 41–42 segundos, sem `PLAYBACK_ERROR`. A percepção visual de possível corte não foi confirmada pela telemetria.
- O teste destrutivo de 60 segundos sem rede não foi executado, conforme permitido pelo protocolo quando não houver forma segura.

**Resultado físico: 2A.2-B APROVADA PARA PROMOÇÃO CONTROLADA, com observação futura sobre a identidade de cache do logotipo.**
