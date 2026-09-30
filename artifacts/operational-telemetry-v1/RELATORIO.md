# TOTEM PARK — Telemetria Operacional V1, candidata v5

## Decisão implementada

O sidecar da V1 não observa reprodução. Nenhum listener de `video`/`img`, `MutationObserver`, leitura de `currentSrc`, classificação LOCAL/REMOTE, ou processamento de `playing`, `waiting`, `stalled`, `ended` e erros de mídia permanece no código operacional. O checkpoint contém somente identidade, versão, sessão, conectividade, último sinal e tempo ativo. A troca de schema 2→3 remove apenas estado/outbox antigo da telemetria; vínculo, Auth e cache de mídia são preservados.

O Portal Web foi adaptado para exibir status ONLINE/ATENÇÃO/OFFLINE a partir do heartbeat operacional da V1. Mostra também vínculo válido, `linkedAt`, versão instalada, sessão, tempo ativo e último sinal. Origem, erros de mídia, waiting/stalled, cache e tráfego aparecem como **Não instrumentado**, inclusive quando o banco ainda contém registros de versões anteriores. A telemetria de mídia fica adiada para V1.1/V2, fora do caminho de reprodução.

## Artefato

- APK: `Totem-Park-Player-2A2-C-Operational-Telemetry-V1-v5.apk`
- Package: `br.com.parksolutions.totempark.player.telemetry`
- VersionCode: `5`
- VersionName: `1.0-player-2a2-c-operational-telemetry-v1`
- SHA-256 APK: `326CC2CF798E2D0E3E0C82058BE3AE49B4C129507F4598D5C0E3C1BA5A048C6F`
- Certificado SHA-256: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7` (mesmo do piloto v4)
- Player JS SHA-256: `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB` (idêntico ao v11)
- Player CSS SHA-256: `77391472D6D3A2A464B24488322B6CBC09511D2E8FAE63229853234DB9594BD5` (idêntico ao v11)
- Comparação de `assets/public` v4→v5: somente `index.html`, `sw.js`, `telemetry-observer.js` mudaram.

## Validação e estado

- Testes focados do sidecar e utilitários do Portal: passaram.
- ESLint dos arquivos do sidecar/Portal alterados: passou.
- Build Web local: passou.
- Build Android `:app:assemblePlayerTelemetryDebug`: passou.
- Assinatura APK verificada com `apksigner`.
- Homologação física v5: **aprovada no piloto único**. O usuário instalou in-place, relatou 3 minutos de reprodução normal com telemetria OFF e continuidade normal após ON.
- Primeiro checkpoint ON: `2026-09-27T02:26:23.753Z`, schema 3, versão v5, sessão nova `ec3ac165-4a5a-4707-99b5-17f7ceb94f44`, sequência 1, conectividade ONLINE, somente dados operacionais.
- Segundo heartbeat: `2026-09-27T02:27:54.426Z`, mesma sessão, sequência 2, tempo ativo atualizado. Nenhuma outra tela atualizada após ativação.
- Configuração remota ao fim: `enabled:true`, `screenIds:["emp3VDKfLzmz1sWJrnbx"]`, `clientIds:[]`, `deviceIds:[]`. Não houve expansão de rollout.
- Portal Web: publicado em `https://totempark.com.br` no deployment `dpl_941jsDvpG7MNEs7mCm2Yj8PXp7zf`. O domínio respondeu HTTP 200 servindo o bundle novo `index-CHl3mpi4.js`. O documento da TV piloto recebeu os dois checkpoints operacionais reais no Firestore; a renderização autenticada do Portal não foi inspecionada nesta sessão.

## Homologação curta recomendada

Instalar v5 in-place sobre v4 no mesmo package piloto, sem limpar dados/cache. Com telemetria OFF, confirmar vínculo e dois vídeos diferentes alternando LOCAL por três minutos. Se passar, ativar exclusivamente `emp3VDKfLzmz1sWJrnbx` e verificar o primeiro checkpoint de schema 3: versão v5, sessão nova, identidade correta, conectividade e último sinal. Observar brevemente se a reprodução continua estável. Em qualquer `MEDIA_ERR_DECODE`, fallback remoto inesperado, tela preta ou travamento, voltar imediatamente a OFF e bloquear a candidata. Não expandir a allowlist.

**PLAYER: APTO** (v11 preservado). **TELEMETRIA OPERACIONAL: APTA NO PILOTO ÚNICO; SEM ROLLOUT GERAL.** **TELEMETRIA DE MÍDIA: ADIADA PARA V1.1/V2.**
