# V16 — ECO Rede de Ensino, telemetria operacional

- Em 28/09/2026, o clientId `ztO8kkaCprpmydMashQh` foi acrescentado à allowlist `settings/telemetry2a2c.clientIds`. A configuração global permaneceu habilitada apenas por allowlist; TV Teste, Teste 2, TV Recepção AG/Kimura AG e cliente Flluxo foram preservados. `deviceIds` permaneceu vazio.
- ECO TV 1 (`dfSqFVamxAWpoqHfvxTg`) e ECO TV 2 (`LsYtitpeyB8sDukaSv8s`) receberam checkpoint operacional com `connectionStatus: ONLINE`, appVersion `1.0.0-v16-field-release-candidate`, `lastSignalAt`, `activeTimeMs`, `deviceId` e `linkedAt` presentes.
- Observação de campo: houve mudança ocasional de Origem para “Internet” durante templates dinâmicos. Uso de internet para dados dinâmicos é hipótese, não causa comprovada de mídia remota. Nenhuma correção foi feita.
- Observação de campo: o primeiro carregamento após atualização in-place para v16 voltou a demorar mais. Depois de carregar, a reprodução ficou normal. Startup não foi alterado nesta tarefa.
