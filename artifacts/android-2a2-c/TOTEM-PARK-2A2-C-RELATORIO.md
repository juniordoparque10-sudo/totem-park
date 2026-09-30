# TOTEM PARK — 2A.2-C

## 1. Auditoria inicial

- Player Android: `PlayerPage` em `src/App.jsx`, empacotado via Capacitor/Gradle.
- Heartbeat existente: atualização do documento `clients/{clientId}/screens/{screenId}` a cada 15 segundos.
- Local First: `src/offline-player-cache.js` e resolução em `src/android-media-source.js`.
- Diagnóstico existente: `src/android-diagnostics.js`, localStorage limitado a 1 MB.
- Backend: Firebase Auth, Firestore e Storage; regras em `firestore.rules`.
- Portal: React/Vite no mesmo `App.jsx`; master identificado por `settings/masterAccess`.
- Configuração remota existente: documentos públicos de leitura em `settings/*`.

## 2. Arquitetura adotada

Coleta passiva local → agregação/persistência → outbox cumulativa → checkpoint no heartbeat → snapshot de sessão → dashboard master.

## 3. Modelo de dados

Identidade: `clientId`, `screenId`, `deviceId`, `sessionId`, `appVersion`, `platform`. Estado separado em `connectionStatus`, `mediaSource`, `dynamicDataSource` e `operatingMode`.

## 4. Sessões

Uma sessão por execução completa do JavaScript/WebView. Queda temporária da rede não cria nova sessão. Outbox pendente é preservada entre reinícios.

## 5. Eventos coletados

`PLAYBACK_START`, `PLAYBACK_END`, `PLAYBACK_ERROR`, `MEDIA_CHANGE`, `playing`, `waiting`, `stalled`, `canplay`, `canplaythrough`, `pause`, `abort`, `emptied`, `ended` e `error`.

## 6. Cache metrics

`cacheHits`, `cacheMisses`, `localPlaybackCount`, `remotePlaybackCount`. Incremento de playback é lógico e deduplicado enquanto a mídia continua ativa.

## 7. Download metrics

`downloadStarts`, `downloadCompleted`, `downloadFailed`, `downloadRetries`, `downloadTimeouts`, `downloadStalls`, `bytesDownloaded` e `partialBytesObserved`, reaproveitando eventos do fluxo existente.

## 8. Traffic metrics

Bytes de mídia concluídos são medidos pelo FileTransfer. Bytes dinâmicos permanecem não mensurados. Bytes de telemetria são estimados pelo payload serializado.

## 9. Estimated Traffic Saved

Estimativa acumulada pelo tamanho conhecido da mídia a cada nova reprodução local. A UI identifica o valor como estimativa.

## 10. Player transition diagnostics

Transições guardam origem, destino, início, conclusão, duração, razão e resultado. A trilha HTML5 inclui `currentTime`, `duration`, `readyState`, `networkState`, `paused`, `ended` e código de erro.

## 11. Persistência local

`localStorage`, sem SQLite ou dependência adicional.

## 12. Limite de armazenamento

512 KB; 40 eventos, 20 transições e 12 snapshots na outbox. O payload remoto leva no máximo oito eventos e cinco transições.

## 13. Outbox

Cumulativa e persistente. Falha de rede não bloqueia Player. O snapshot mais recente contém todos os contadores acumulados relevantes.

## 14. Idempotência

Chave lógica `sessionId:sequence`; histórico usa um documento por sessão atualizado com sequência crescente.

## 15. Sincronização

- estado atual: checkpoint a cada 5 minutos, piggyback no heartbeat já existente;
- histórico da sessão: no máximo uma escrita adicional a cada 15 minutos;
- reconexão: heartbeat existente dispara nova tentativa;
- nenhum envio por evento.

## 16. Backend / collections

- atual: `clients/{clientId}/screens/{screenId}.telemetry`;
- histórico: `clients/{clientId}/screens/{screenId}/telemetrySessions/{sessionId}`;
- flag: `settings/telemetry2a2c`.

As regras foram validadas no emulador. Não foram publicadas na produção.

## 17. Custos estimados

Payload medido em cenário com eventos preenchidos:

- estado atual: 1.769 bytes;
- histórico: 2.855 bytes;
- checkpoints atuais: 288/dia/tela, dentro de writes de heartbeat que já existiam;
- histórico adicional: 96 writes/dia/tela;
- overhead aproximado: 783.552 bytes/dia/tela.

| Telas | Tráfego/dia | Writes históricos/dia |
|---:|---:|---:|
| 10 | 7,47 MB | 960 |
| 50 | 37,36 MB | 4.800 |
| 100 | 74,73 MB | 9.600 |
| 500 | 373,63 MB | 48.000 |
| 1.000 | 747,25 MB | 96.000 |

Leituras: uma leitura/listener da flag por execução; dashboard usa uma consulta de clientes e um listener de telas por cliente visível. Projeções devem ser reavaliadas antes de sair dos pilotos.

## 18. Feature flag

Flag remota desligada por padrão. Requer `enabled: true` e correspondência em `clientIds`, `screenIds` ou `deviceIds`. Falha/ausência desativa coleta.

## 19. Dispositivos piloto

Nenhum dispositivo foi ativado automaticamente. A UI master permite cadastrar `screenIds` sem nova build.

## 20. Dashboard Web

Nova aba master **Telemetria**, protegida pelo login e perfil já existentes.

## 21. Cards

Online/offline, tráfego, economia estimada, cache hit rate, tempo de exibição, downloads, erros e timeouts.

## 22. Filtros

Período, cliente, tela, status, origem e versão. O período está preparado visualmente; agregação histórica avançada continua pendente.

## 23. Cliente

Filtro por cliente agrega apenas as telas correspondentes.

## 24. Tela individual

Painel lateral com status, origem, modo, comunicação, mídia, playlist, waiting/stalled, último erro e eventos recentes.

## 25. Mobile/App

Cards, filtros, tabela reduzida e detalhe responsivos em 1000 px e 600 px.

## 26. Screenshots

Pendente de acesso master no preview. A rota administrativa não expõe o dashboard sem autenticação e nenhum mock foi enviado ao preview.

## 27. Arquivos alterados

- `src/player-telemetry.js`
- `src/TelemetryDashboard.jsx`
- `src/App.jsx`
- `src/App.css`
- `src/android-diagnostics.js`
- `tests/player-telemetry.test.js`
- `firestore.rules`
- `package.json`
- `.env.playerTelemetry`
- `.vercelignore`
- `android/app/build.gradle`

## 28. Testes executados

- 22/22 focados aprovados: telemetria, download/retry, LINK-FIX e single-item loop.
- ESLint dos arquivos novos: aprovado.
- Regras Firestore: compiladas no emulador `demo-totem-homolog`.
- Lint global: bloqueado por 58 erros preexistentes em `App.jsx`; não introduzidos pelos arquivos novos.

## 29. Builds

- Web: aprovado.
- Player telemetry Vite: aprovado.
- Android `assemblePlayerTelemetryDebug`: aprovado.
- APK: `Totem-Park-Player-2A2-C-TELEMETRY-PILOT.apk`.
- Package: `br.com.parksolutions.totempark.player.telemetry`.
- SHA-256: `462832143821836845639B9237486AEE47256A63D00D9D3A58B46D6ECAE81D8D`.

## 30. Riscos encontrados

- 96 writes históricos/dia/tela ainda exigem gate de custo real antes de escala.
- Dashboard de período ainda usa o snapshot cumulativo disponível; séries de 7/30 dias precisam da leitura histórica.
- APK piloto tem package separado e cache/vínculo próprios; valida instrumentação sem substituir RC4.
- Regras novas ainda não estão publicadas.

## 31. Pendências

- publicar regras apenas em ambiente autorizado;
- autenticar como master no preview e capturar screenshots;
- cadastrar screenIds piloto e ativar a flag;
- executar gate físico ON → OFF → ON;
- confirmar idempotência e overhead reais no dashboard;
- decidir se o histórico de 15 minutos deve ser reduzido antes de escala.

## 32. URL de homologação/preview

`https://totem-park-9gegofs8q-junior-pk-s-projects.vercel.app`

Preview Vercel, sem promoção para produção.

## 33. Overhead da telemetria

Estimativa medida: aproximadamente 765 KB/dia/tela com payload preenchido. Não inclui overhead de protocolo/TLS/Firestore. Eventos permanecem locais e agregados.

## 34. Recomendação para próxima etapa

Autorizar um backend de homologação ou publicação controlada das regras, entrar no preview como master, ativar somente um `screenId` piloto e executar o gate curto online/offline/reconexão. Parar antes de qualquer expansão.

## Classificação

**2A.2-C — BLOQUEADA PARA HOMOLOGAÇÃO REAL**, porque regras e allowlist não foram publicadas/ativadas. A implementação, preview e APK piloto estão preparados; produção geral permanece intacta.
