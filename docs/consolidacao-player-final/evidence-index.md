# Índice de evidências — consolidação final

## Autoridade

- Aprovação expressa do usuário em 26/10/2026: preservar templates existentes, Smart Lobby, telemetria, cache, reprodução, Player Android, RSS, dados dinâmicos, agendamentos, quatro selos, manutenção e Fade Suave; excluir integralmente Tempo V2.1, Hora Certa V2.1, TV ao Vivo e personalização experimental.
- Design aprovado: `C:/Users/centr/Desktop/totem-park/docs/superpowers/specs/2026-10-26-player-android-consolidacao-final-design.md`.
- Plano aprovado: `C:/Users/centr/Desktop/totem-park/docs/superpowers/plans/2026-10-26-player-android-consolidacao-final.md`.

## Evidências de homologação física e continuidade

- `artifacts/android-2a2-canary/TESTE-FISICO-CANARY-2A2-A.md`: Local First, cache persistente, ciclos online/offline, reconexão e telemetria aprovados na TV piloto.
- `artifacts/android-2a2-rc1/TESTE-IN-PLACE-RC1-2A2-A.md`: atualização in-place, vínculo, cache e reprodução offline aprovados.
- `artifacts/android-2a2-rc2/2A2-AB-RC2-OFICIAL.md`: assinatura igual ao canal aprovado e instalação por cima confirmada.
- `artifacts/android-2a2-rc3/RC3-OFICIAL-2A2-AB-LINK-FIX.md`: LINK-FIX, Local First e política de download consolidados.
- `docs/rebaseline-player-2a2-rc5.md` e `artifacts/rebaseline-rc5/RELATORIO.md`: RC5 fisicamente bloqueado; rollback v11/RC4 é a base operacional segura. Nenhum patch de decoder RC5 é promovido por inferência.
- `artifacts/telemetry-v1-migration/RELATORIO.md` e `artifacts/fast-track-telemetry-v1/RELATORIO.md`: telemetria com gate físico e continuidade do Player principal.

## Evidências de versões posteriores

- `docs/verification/player-v58-release.json`, `player-v59-release.json` e `player-v60-release.json`: manifestos de release e gates automatizados; servem como evidência técnica, não como aprovação física isolada.
- Specs/planos versionados para V62 e V66: contrato de publicação, previews, agenda/notícias e correções consolidadas de Smart Lobby/Esportes/RSS.
- Testes versionados ao lado de cada patch: evidência de comportamento e compatibilidade; não substituem homologação física.

## Baseline local em `ad8e6cd`

- Dependências raiz: 306 pacotes; `npm audit` informou 19 vulnerabilidades preexistentes (3 moderadas, 14 altas, 2 críticas). Não corrigidas para evitar mudança de escopo.
- Dependências Functions: 252 pacotes; engine declarada Node 22, runtime local Node 24.16.0; 10 vulnerabilidades preexistentes.
- Suite local sem emulador: 471 testes, 464 aprovados, 7 falhas preexistentes. Log: `.superpowers/sdd/2026-10-26-player-android-consolidacao-final/baseline-local-tests.log`.
- Suites `integration`/`*.rules.*` exigem emuladores; o comando genérico aguardou serviço externo e foi interrompido sem alterar produto.

