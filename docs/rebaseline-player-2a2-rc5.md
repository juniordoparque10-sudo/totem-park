# Player 2A.2 RC5 — inventário e rebaseline

## Preservação

- Fonte anterior preservada no commit `f641738` e tag `pre-rebaseline-2a2-2026-09-22`.
- Backup externo ao Git: `backups/pre-rebaseline-2a2-20260922-source.zip`, SHA-256 `42FB54C858D69C2E4F28907DCE0A6E3D928A6915C780AEBA9CBDC76ECCC34039`.
- Artefatos históricos e backups existentes permanecem no disco, fora do commit de fonte.

## Inventário

| Classe | Componentes | Destino na build oficial |
|---|---|---|
| Produção/necessário | Player, playlists, vínculo, arquivos Android, Firebase existente | Preservado |
| 2A.2 aprovado | Local First, cache persistente, offline, download lock, timeout/retry, LINK-FIX, loop de item único | Preservado |
| Telemetria | `player-telemetry.js`, `TelemetryDashboard.jsx`, identidade segura | Somente build piloto; substituído por módulo inerte no bundle RC5 |
| Diagnóstico temporário | `jump-diagnostics.js`, UI SALTO, buffers e exportador experimental | Somente builds de diagnóstico; substituído por módulo inerte no bundle RC5 |
| Experimento | `decoder-lifecycle.js`, flavor Decoder Experiment | Algoritmo VIDEO→VIDEO promovido ao RC5; flavor experimental não integra o APK oficial |
| Incerto | Diferenças internas não documentadas entre fonte atual e fonte RC4 perdida | Auditadas por invariantes funcionais, testes e comparação de strings/rotas do bundle RC4; sem alegação de equivalência binária |

## Mudança funcional intencional

Em VIDEO→VIDEO, o Player pausa o vídeo atual, remove `src`, chama `load()`, desmonta o elemento e confirma zero elementos antes de montar o próximo. O loop de vídeo único e transições com outros tipos seguem os fluxos existentes. A configuração remota de telemetria não é assinada no modo oficial.

## Auditoria com RC4

| Categoria | Resultado |
|---|---|
| Preservado | rotas do Player, chave de vínculo, resolução de fonte local, cache, política de download, LINK-FIX e loop único; testes focados passaram |
| Alterado intencionalmente | lifecycle VIDEO→VIDEO; versões Android; telemetria piloto e identidade segura substituídas por módulos inertes no bundle oficial |
| Diferença suspeita | nenhuma identificada nos caminhos auditados; a fonte exata RC4 não existe, então equivalência total não é demonstrável |

O bundle RC4 de referência tem SHA-256 `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB`. O bundle novo não contém as rotas e strings de JUMP DIAG, exportador experimental ou telemetria piloto. O bundle RC4 permanece preservado para rollback.

## Gates locais

- Build Vite do flavor `playerRc`: aprovado.
- 30 testes focados de Local First/offline, download/timeout/retry/lock, LINK-FIX, loop único e lifecycle: aprovados.
- Compilação Java Android dos flavors `playerRc` e `playerRollback`: aprovada.
- ESLint dos módulos novos e `vite.config.js`: aprovado. O lint de `App.jsx` registra 77 ocorrências preexistentes no arquivo amplo; não é usado como gate novo de regressão.
