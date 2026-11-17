# Etapa 3 — evidências de regressão funcional

Data: 2026-11-17

Base validada: `fea33f2a`

## Resultado automatizado

A matriz principal foi dividida em três processos Node herméticos. Resultado agregado: **390/390 testes passaram**.

| Área | Resultado | Evidência principal |
| --- | ---: | --- |
| Reprodução, imagens, vídeos, transições e loop | passou | `player-transition-crossfade`, `player-web-integration-hotfix`, `media-download-readiness`, `player-playlist-reorder` |
| Playlists, ordem, duração e atualização | passou | `active-playlist-*`, `player-playlist-reorder`, `player-now-playing-sync`, `template-v2-preview-playback` |
| Agendamentos | passou | `player-schedule-v62`: Brasília/IANA, meia-noite, DST, início/fim e reconexão |
| Templates V1/V2 | passou | Clima e Hora Certa V1, Notícias/Clima/Hora Certa V2, Mercado e Sports |
| Cache local-first/offline/download/fallback | passou | download nativo, single-flight, aliases, journal, partial/final, cold boot, quota e reconexão |
| Comandos remotos | passou estruturalmente | handlers de todos os tipos e independência do listener em relação ao heartbeat |
| Vínculo, tela e manutenção | passou | identidade/rebind, conflito/revogação, snapshot de tela e manutenção |
| 16:9 e 9:16 | passou em lógica/layout | stages 1920×1080 e 1080×1920 sem crop, orientação publicada e canvas de manutenção rotacionável |

Testes adicionais da Etapa 3:

- preservação de `exitTv`, `reload`, `refresh`, `clearCache`, `pause`, `play`, anterior/próxima, `blackout`, `maintenance`, `clear`, `overlay` e `takeover`;
- listener de comandos separado do heartbeat BASIC;
- tamanho serializado do envelope BASIC e frequência preservada.

Emuladores locais, sem acesso a serviços reais:

- regras de identidade Firestore: **19/19**;
- funções de vínculo Auth/Firestore/Functions: **3/3**.

## Força e limites das evidências

Os testes de lógica pura e módulos de cache são comportamentais. Alguns contratos de integração em `App.jsx`, orientação e manutenção são estruturais: confirmam a presença e separação dos mecanismos, mas não substituem execução visual/decoder em Android.

Não foram executados nesta etapa:

- decoder e codecs reais em TV;
- FileTransfer/Filesystem real sob disco cheio ou encerramento forçado do processo;
- rotação física durante vídeo/template;
- screenshot/pixel diff em painéis 16:9 e 9:16;
- latência de provedores externos reais;
- medição de tráfego por UID Android.

Esses itens permanecem para homologação física; não são declarados aprovados integralmente.

