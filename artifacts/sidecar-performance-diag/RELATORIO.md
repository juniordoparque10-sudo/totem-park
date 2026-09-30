# 2A.2-C — SIDECAR PERFORMANCE DIAG

## Artefato

- APK: `Totem-Park-Player-2A2-C-SIDECAR-PERF-DIAG.apk`
- Package: `br.com.parksolutions.totempark.player.telemetryperfdiag`
- VersionCode: `1`
- VersionName: `1.0-player-2a2-c-sidecar-perf-diag`
- APK SHA-256: `344168134B0F70F0A2789C22EF5BA2B2CCDDDCA7FEB12B0CC629F083070EEA4F`
- Assinatura: Android Debug, certificado SHA-256 `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`

## Integridade do Player

O bundle principal `assets/public/assets/index-C8VMWlD5.js` foi extraído do APK final. SHA-256: `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB`, igual ao rollback v11. O Player não foi editado. O sidecar diagnóstico é `assets/public/telemetry-observer.js`, SHA-256 `C1ADAF118C046832DB4F320D76CC393C26A0A1A5E0A94D527D261231E0DC5CB1`.

## Instrumentação isolada

O sidecar registra em memória os últimos 100 eventos com relógio monotônico e horário ISO: ativação/desativação, agendamento de persistência, serialização, escrita local, montagem de checkpoint, operações Firestore de estado/histórico, eventos de mídia e long tasks quando a API existir. A origem de mídia é registrada sem query/token. O botão `Exportar PERF` salva manualmente um JSON via MediaStore em `Documents/TotemPark/`; não escreve cada evento em disco. O app não altera o Player, cache, Local First, timeout/retry ou playlist.

## Verificação local

- Testes focados do ring buffer e do modo OFF/ON: passaram.
- ESLint dos arquivos da variante: passou.
- `:app:assemblePlayerTelemetryPerfDebug`: passou.
- Package, VersionCode e VersionName: conferidos pelo `aapt`.
- Bundle do Player extraído do APK: SHA-256 conferido.
- Assinatura APK: verificada pelo `apksigner`.
- Instalação, exportação MediaStore e reprodução na TV ainda não foram testadas fisicamente.

## Teste físico único, pendente

O package novo tem vínculo e cache próprios. Instalar somente na TV Teste, validar o novo binding e esperar dois vídeos visualmente diferentes ficarem LOCAL. Confirmar configuração inicial `enabled: false`, `screenIds: []`, `clientIds: []`, `deviceIds: []`. Observar 1 minuto OFF; então habilitar somente o screenId real da TV piloto, sem clientId/deviceId. Parar no primeiro `MEDIA_ERR_DECODE` ou após 5 minutos. Exportar o JSON imediatamente, desabilitar novamente a telemetria e confirmar a configuração OFF salva. Não executar segunda rodada.

Nenhuma configuração remota foi alterada nesta etapa. Nenhum APK foi instalado ou publicado.
