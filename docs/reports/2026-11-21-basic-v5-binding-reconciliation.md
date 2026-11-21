# BASIC V5 — reconciliação controlada do vínculo

Data: 2026-11-21
Projeto: `demo-totem-basic-hom`
Escopo: somente a tela experimental `tv-basic-v5-medicao-5556`

## Divergência identificada

- Sessão anônima efetivamente usada pelo APK experimental: `vTOvlLE39z0QAKm6CzUFNyE8cn3v`.
- UID registrado na tela e no binding ativo anterior: `SjKboDQvStRMk4JXSI6ZJtsS9cfX`.
- Device ID local, da conexão persistida, da tela e do binding anterior: `eafad5c2-bf1b-4498-a21b-e0dfabed5780` em todos os locais.
- O binding antigo não recebia atualização desde `2026-11-21T12:32:44.492Z`.
- Não havia outro processo do Player de medição usando o UID antigo. A única sessão observada no processo atual usava o UID novo.
- Não existia binding para o UID novo nem autorização de rebind concorrente.

Conclusão: houve troca da identidade anônima local, sem troca do dispositivo. Não foi identificado outro dispositivo ou outra sessão legítima ativa competindo pela tela.

## Backup

O snapshot anterior à mudança foi congelado com o app de medição parado e salvo em:

`artifacts/basic-v5-binding-reconciliation/2026-11-21T14-41-37Z-pre-reconciliation.json`

O backup contém os valores anteriores completos da tela, binding antigo, ausência do binding novo, código sintético, ausência da autorização e metadados dos dois usuários do Auth Emulator. Nenhum usuário foi removido ou desabilitado.

## Reconciliação executada

1. Foi criada uma autorização única de rebind, com validade de dez minutos, somente no Emulator.
2. A criação foi condicionada transacionalmente ao snapshot auditado: mesmo UID antigo, mesmo deviceId, binding antigo `ACTIVE`, binding novo ausente e nenhuma autorização concorrente.
3. O APK experimental foi iniciado sem limpar dados.
4. O próprio callable existente `claimPlayerBinding` consumiu a autorização e realizou a troca atômica.

Registros resultantes:

- Binding `SjKboDQvStRMk4JXSI6ZJtsS9cfX`: `REVOKED`, motivo `ADMIN_REBIND`, substituído pelo UID atual.
- Binding `vTOvlLE39z0QAKm6CzUFNyE8cn3v`: `ACTIVE`, mesmo cliente, tela e deviceId, versão `1.0.0-basic-v5-medicao`.
- Tela: `connectedAuthUid` atualizado para o UID atual; `connectedDeviceId` preservado.
- Autorização da tela e documento de auditoria `emulator-reconcile-20261121-1441`: `CONSUMED`.

## Validação Firestore Emulator

- `status=online`.
- `lastSeenAt` avançou de `2026-11-21T14:45:37.247Z` para `2026-11-21T14:45:52.238Z`.
- `telemetryUpdatedAt=2026-11-21T14:45:52.238Z`.
- `telemetry.profile=BASIC`.
- `telemetry.schemaVersion=5`.
- `telemetry.installation` completo: packageName, versionCode, versionName, buildId, buildTimestamp, installationId e installationEpoch.
- `telemetry.session` presente, com sessionId e lastHeartbeatAt.
- `telemetry.connection.state=ONLINE`.
- `telemetry.playback.state=PLAYING` e playlist ativa `basic-v5-medicao-playlist-local`.
- Envelope BASIC contém somente: connection, identity, installation, playback, profile, schemaVersion e session.

## Reprodução

Os logs locais confirmaram ciclos repetidos completos:

- mídia 1: `MEDIA_READY`, índice 0;
- transição por `IMAGE_TIMER` para a mídia 2;
- mídia 2: `MEDIA_READY`, índice 1;
- retorno por `IMAGE_TIMER` à mídia 1.

A tela continuou informando `nowPlayingTotal=2`.

## Preservação

Nenhum código, APK, usuário, outra tela ou outro cliente foi modificado. Não houve deploy, alteração de produção, mudança de regras, relaxamento de segurança ou alteração do intervalo do heartbeat. Permaneceram apenas os registros de auditoria sintéticos da autorização consumida e o binding antigo revogado.
