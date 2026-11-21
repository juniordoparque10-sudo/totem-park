# Diagnóstico BASIC V5 — 2026-11-21

## Resultado

A ausência de `telemetry` e `telemetryUpdatedAt` não é causada pelos metadados nativos nem pela montagem do envelope BASIC. O APK de medição retorna todos os metadados obrigatórios, mas a validação operacional do vínculo falha com `Screen is bound to another authenticated player.`. O efeito que executa `claimPlayerBinding` então define `playerBindingRef.current = null`. O heartbeat continua publicando presença (`status` e `lastSeenAt`), enquanto `canSyncBasicTelemetry` permanece falso e não acrescenta as duas chaves BASIC ao mesmo payload.

## Evidências locais

- Flavor diagnóstico: `APP_BUILD_MODE=playerRc`, `profile=BASIC`, `isNativeApp=true`.
- Metadados do APK diagnóstico: pacote `br.com.parksolutions.totempark.player.basicv5diag`, versionCode `1`, versionName `1.0.0-basic-v5-diagnostic`, buildId e buildTimestamp presentes.
- `app_info_validation`: `valid=true`, sem campos inválidos.
- Consulta somente leitura ao plugin do APK de medição: packageName, versionCode, versionName, buildId e buildTimestamp presentes.
- Armazenamento local do APK de medição: instalação BASIC presente, conexão local presente, screenId presente e deviceId local coerente com a conexão persistida.
- Log de bootstrap do APK de medição: estágio `PLAYER_IDENTITY_BINDING` falhou com `Screen is bound to another authenticated player.`.
- Após a falha, o código mantém `playerBindingRef.current` nulo. O predicado BASIC exige vínculo `ACTIVE` e correspondência de cliente, tela e dispositivo antes de incluir `telemetry` e `telemetryUpdatedAt`.

Nenhum token, UID, código de vínculo ou documento Firebase completo foi registrado neste relatório.

## Correção mínima recomendada — não aplicada

Reconciliar exclusivamente no laboratório a autenticação anônima atual do APK de medição com o único `playerDeviceBinding` ativo e com os campos de vínculo da tela. Antes de alterar qualquer documento, confirmar qual UID é o autorizado e por que a sessão autenticada atual divergiu. Não é necessário relaxar `canSyncBasicTelemetry`, mudar o heartbeat ou alterar a construção do payload.

## Limite da execução diagnóstica

O novo pacote foi mantido sem vínculo para não tomar a tela do APK de medição e não criar gravações adicionais no Firestore. Por isso, os eventos `basic_sync_conditions`, `heartbeat_payload_keys` e `heartbeat_write_*` do pacote novo não foram exercitados contra uma tela vinculada. A causa foi confirmada diretamente pelos metadados válidos e pelo erro de `claimPlayerBinding` do APK afetado, observado sem modificar o APK.

## APK final

- Arquivo: `D:\TotemPark-Homologacao\BASIC-V5-ONLINE\Diagnostico\TotemPark-BASIC-V5-DIAG-2026-11-21-final.apk`
- Pacote: `br.com.parksolutions.totempark.player.basicv5diag`
- SHA-256: `A75F280561887A8B4D51E8EDD11E63CC54B203DA3D75B30D695D689ED655402D`

## Testes

- Testes focados BASIC/diagnóstico/heartbeat: 26 aprovados, 0 falhas.
- Build Vite `playerBasicDiag`: aprovado.
- Build Gradle `assemblePlayerBasicDiagDebug`: aprovado com JDK 21.
- Suíte indiscriminada `node --test`: não aprovada integralmente. Ela inclui `scripts/test-v16-field-feedback.mjs`, que exige argumento de entrada e falha quando descoberto como teste, e a execução foi interrompida após permanecer pendente. Não foi declarada aprovação da suíte completa.

## Preservação

O pacote diagnóstico foi instalado lado a lado com `br.com.parksolutions.totempark.player.basicmedicao`. O pacote de medição não foi reinstalado, desinstalado nem sobrescrito. Nenhum dado foi limpo, nenhum deploy foi executado e nenhuma correção definitiva foi aplicada.
