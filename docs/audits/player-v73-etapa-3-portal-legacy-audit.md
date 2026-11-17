# Etapa 3 — auditoria somente leitura do Portal

Nenhum arquivo do Portal foi modificado.

## Predicado lógico proposto

```js
const schema = Number(telemetry?.schemaVersion);
const isBasic = schema === 5 && telemetry?.profile === "BASIC";
const isLegacyAdvanced = (schema === 3 || schema === 4) && !isBasic;
```

Para BASIC, são válidos apenas `installation`, `identity`, `session`, `connection` e `playback`. `installationEpoch` diferencia mudanças do APK, mas nunca autoriza reutilizar métricas de um epoch anterior.

Heartbeat BASIC confiável requer simultaneamente:

- schema 5 e perfil BASIC;
- `sessionId` e `lastHeartbeatAt` válidos;
- `identity.clientId/screenId/deviceId` iguais ao documento e dispositivo conectado;
- sessão/epoch atuais; uma sessão anterior não preenche campos ausentes da atual.

Schemas 3/4 continuam nos leitores legados atuais. Schema desconhecido usa apenas presença de topo; não infere tráfego, cache, origem ou uptime.

## Locais auditados e riscos

- `src/portal-status.js`: usa `schemaVersion >= 3`, `telemetry.current` e `session.uptimeSeconds`; schema 5 seria interpretado incorretamente como avançado.
- `src/operational-telemetry.js`: frescor aceita schema 5 como operacional e pode recorrer a `screen.currentMediaSource` residual.
- `src/telemetry-card-data.js`: versão não prioriza `installation`; tráfego aceita schema ≥4; cache/origem/uptime podem vir de campos de topo antigos.
- `src/TelemetryDashboard.jsx`: tabela, detalhe e PDF reutilizam cache, origem, now-playing, uptime e histórico avançado.
- `src/TelemetryDashboardV1.jsx`: leitores baseados em schema ≥3 tentam usar `session.appVersion`, counters e `current`.
- `src/App.jsx`: o heartbeat BASIC substitui `telemetry`, mas não apaga campos avançados antigos de topo; os cards atuais ainda os leem.
- `src/telemetry-history-reader.js`: histórico diário, sessões e eventos não têm corte automático quando a tela migra para BASIC.

## Correção lógica proposta para aprovação futura

Centralizar um classificador de perfil e uma função de validade de sessão. Quando BASIC:

- mapear versão de `installation.versionName/versionCode`;
- mapear online de presença fresca mais `connection.state` e identidade exata;
- mapear reprodução de `playback`;
- tratar traffic/cache/source/uptime/histórico avançado como indisponíveis;
- nunca recorrer a campos avançados de topo ou de sessão/epoch anterior.

Para preservar histórico anterior ao BASIC seria necessário um limite temporal persistido na migração. `installationEpoch` isolado não contém a data desse corte. Sem esse limite, a opção segura é não agregar histórico avançado para uma sessão BASIC atual.

