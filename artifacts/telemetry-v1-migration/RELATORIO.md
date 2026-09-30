# TOTEM PARK — Telemetria V1: migração de estado/outbox

## Diagnóstico e mudança

O primeiro checkpoint após a atualização in-place v2→v3 trouxe `appVersion` antigo e `INTERNET_FALLBACK`. A implementação anterior **permitia** que um payload antigo de outbox virasse o estado atual: `createObserver.start()` criava uma sessão nova, mas copiava sem validar `previous.outbox`; `sync()` escolhia o último item dessa fila sem exigir o sessionId atual. Esse é um mecanismo compatível com o ocorrido, mas o checkpoint isolado não prova qual processo/APK o enviou nem que o Player atual usava origem remota.

A v4 introduz `TELEMETRY_SCHEMA_VERSION = 2` e um marcador de versão (`schema:appVersion`). Na mudança de versão, remove apenas as chaves locais de estado/outbox, histórico de sincronização e último checkpoint atual da **telemetria**. As chaves de vínculo, Auth, deviceId, cache de mídia e configuração operacional não são removidas. O observador só importa outbox compatível com schema, versão e identidade atuais. `sync()` só pode gravar `screen.telemetry` com um item da sessão em execução; uma outbox anterior do mesmo build não vira estado atual. Histórico já gravado no backend permanece intacto.

O checkpoint usa `APP_VERSION = 1.0-player-2a2-c-telemetry-v1-migration`, igual ao `versionName` conferido no APK, e recalcula `mediaSource` a partir do `currentSrc` presente no elemento de mídia no momento do checkpoint. O `currentSrc` é incluído no payload com query e fragmento removidos. O JavaScript e o CSS do Player v11 não foram alterados. `index.html` usa URL versionada do sidecar e `sw.js` usa novo cache de shell, sem apagar cache de mídia.

## Validação local

- Testes focados da telemetria: 6/6 passaram, incluindo migração seletiva, descarte de outbox antiga, nova sessão, versão atual e origem calculada por `currentSrc` alterado sem novo evento.
- ESLint dos arquivos alterados: passou.
- Build Android `:app:assemblePlayerTelemetryDebug`: passou.
- Comparação dos 56 assets `assets/public` entre APK v3 e v4: diferenças apenas em `index.html`, `sw.js` e `telemetry-observer.js`.
- Bundle JS do Player: SHA-256 `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB`, igual ao v11/v3.
- CSS do Player: SHA-256 `77391472D6D3A2A464B24488322B6CBC09511D2E8FAE63229853234DB9594BD5`, igual ao v11/v3.
- Package: `br.com.parksolutions.totempark.player.telemetry`.
- VersionCode: `4`; VersionName: `1.0-player-2a2-c-telemetry-v1-migration`.
- Certificado SHA-256: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`, igual ao piloto v3.
- APK: `Totem-Park-Player-2A2-C-Telemetry-V1-Migration-v4.apk`.
- APK SHA-256: `DCC12C369F9DE8190254DA012FCFD24BE68EDD51FA08CA7E6A157D72F93EB82A`.
- Sidecar SHA-256: `B28C1DC044B58DA0A55B18FCF83CED50844D11035EE5032DDB9E44B90C3D2B26`.

## Resultado físico e primeiro checkpoint

O usuário confirmou v4 instalado por atualização in-place, vínculo preservado e gate OFF aprovado: dois vídeos LOCAL alternando normalmente por aproximadamente três minutos. A telemetria foi ativada exclusivamente para `emp3VDKfLzmz1sWJrnbx` às `2026-09-27T01:47:05.034904Z` (`clientIds` e `deviceIds` vazios).

O primeiro checkpoint novo chegou às `2026-09-27T01:52:14.239Z`. Ele confirmou a migração da versão: `schemaVersion: 2`, `appVersion: 1.0-player-2a2-c-telemetry-v1-migration`, nova sessão `5615b03d-dc32-4e77-b0eb-5b1a371a7869`, sequência 1. Não foi um payload antigo da v3. Nenhuma outra tela tinha telemetria atualizada após a ativação.

Porém, o mesmo checkpoint apresentou `mediaSource: INTERNET_FALLBACK`, `currentSrc` em Firebase Storage, `localPlaybackCount: 0`, `remotePlaybackCount: 30`, um `MEDIA_ERR_DECODE` registrado às `2026-09-27T01:48:31.793Z`, e `waitingCount: 31`. Como `currentSrc` era remoto no instante do checkpoint, a classificação de origem estava **coerente com a fonte observada**; ela não confirma reprodução LOCAL naquele instante. A causa do erro e da fonte remota não foi determinada. O relato visual do gate OFF não estabelece o estado da fonte após ativação.

Pelo critério de parada do piloto, a telemetria foi desativada imediatamente. Leitura de volta da configuração às `2026-09-27T01:55:19.837184Z`: `enabled: false`, `screenIds: []`, `clientIds: []`, `deviceIds: []`. **Telemetria V1: bloqueada para rollout; não expandir.** Player oficial/v11 não foi alterado. Nenhuma nova investigação, correção ou build foi iniciada após esse checkpoint.
