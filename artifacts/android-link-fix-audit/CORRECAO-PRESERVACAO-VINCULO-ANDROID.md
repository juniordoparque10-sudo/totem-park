# CORREÇÃO DE PRESERVAÇÃO DE VÍNCULO ANDROID

Data: 21/09/2026

## Causa

O vínculo local `totempark-tv-connection` era apagado por `goBackToTvCode` depois de um timer de 10 segundos. O timer era armado tanto para desvinculação real quanto para erro Firebase, consulta vazia, documento momentaneamente indisponível e conflito de `connectedDeviceId`.

## Fluxo anterior

Vínculo local → validação remota → estado ausente/erro/conflito → timer de 10 s → `goBackToTvCode` → remoção local → tela de código.

## Fluxo novo

Vínculo local → entrada imediata no Player → validação assíncrona → estado validado, offline, erro, timeout ou conflito. Os estados inconclusivos preservam a chave local e aguardam nova validação. O evento `online` reinicia a validação.

## Pontos onde vínculo podia ser apagado

- JSON inválido durante boot ou entrada na tela de código.
- documento da tela ausente;
- consulta por código vazia;
- erro de `getDoc` ou `onSnapshot`;
- `connectedDeviceId` diferente e recente;
- comando remoto `exitTv`;
- ações explícitas de saída/troca de código.

Os cinco primeiros não removem mais o vínculo. Comando remoto de saída e ações explícitas continuam removendo.

## Regra de preservação

Offline, erro, timeout, resultado vazio e conflito de dispositivo produzem estado diagnóstico local e nunca executam limpeza automática.

Eventos locais adicionados:

- `LINK_LOCAL_FOUND`
- `LINK_LOCAL_MISSING`
- `LINK_VALIDATION_START`
- `LINK_VALIDATED`
- `LINK_VALIDATION_ERROR`
- `LINK_VALIDATION_TIMEOUT`
- `LINK_OFFLINE`
- `LINK_DEVICE_CONFLICT`
- `LINK_EXPLICITLY_REVOKED`
- `LINK_CLEARED`

## Regra de remoção explícita

`clearTvConnection` exige `explicit: true`. A limpeza permanece apenas em escolha de outro código, troca/saída de modo, botão “Sair da TV” e comando remoto recente `exitTv`.

Navegar para a tela de código e apagar o vínculo agora são operações separadas.

## Tratamento offline

Boot offline preserva o vínculo, permanece na rota do Player e mostra estado de vínculo preservado. A cache persistente do Firestore e o Local First existentes continuam disponíveis. Ao receber `online`, o Player revalida em background.

## Tratamento Firebase error

Erros de resolução e listeners mudam o estado para `LINK_VALIDATION_ERROR`, encerram o loading e preservam o vínculo. Resultado vazio arma somente timeout diagnóstico, sem navegação e sem limpeza.

## `connectedDeviceId`

Mismatch recente produz `LINK_DEVICE_CONFLICT`, interrompe a aceitação daquele snapshot e preserva o vínculo local. O Player não toma posse nem apaga a associação por uma comparação isolada.

## Persistência de `screenId`

**IMPLEMENTADO.**

O `screenId` é salvo após resolução/conexão bem-sucedida e reutilizado no boot seguinte. Isso evita depender de `tv_codes` para localizar uma tela já conhecida. Registros sem `screenId` continuam resolvendo pelo código e são atualizados quando a resolução funciona.

## Compatibilidade com vínculo antigo

Mantida. `{ clientId, code, deviceId }` continua válido; `screenId` é opcional.

## Arquivos alterados

- `src/android-link-lifecycle.js`
- `src/App.jsx`
- `tests/android-link-lifecycle.test.js`
- `package.json`
- `.env.playerLinkFix`
- `android/app/build.gradle`
- `android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java`
- `android/app/src/main/java/br/com/parksolutions/totempark/BootReceiver.java`
- `android/app/src/main/java/br/com/parksolutions/totempark/PlayerBootService.java`
- `android/app/src/playerLinkFix/assets/public/` (bundle isolado gerado)

## Testes

- 8/8 testes obrigatórios do vínculo aprovados.
- 8/8 testes existentes de resolução Local First aprovados.
- 5/5 testes existentes de timeout/retry/download 2A.2-B aprovados.
- Total: **21/21 aprovados**.
- ESLint dos módulos novos: aprovado.
- Build Vite `playerLinkFix`: aprovada.
- Build Gradle `assemblePlayerLinkFixDebug`: aprovada.

O lint completo de `App.jsx` mantém pendências preexistentes fora do escopo; a build de produção do bundle concluiu sem erro.

## Build

- APK: `Totem-Park-Player-LINK-FIX-AUDIT.apk`
- Package: `br.com.parksolutions.totempark.player.linkfix`
- VersionCode: `1`
- VersionName: `1.0-player-link-fix-audit`
- SHA-256: `0E221C4DC8928729583A5887E663783A4F989DBDC35E75346827F73AAA8DF8B8`
- Instalação: **NÃO EXECUTADA**
- Publicação: **NÃO EXECUTADA**

## Riscos restantes

- O sistema ainda não possui sinal remoto específico de revogação; exclusão do documento isoladamente é tratada como inconclusiva.
- O conflito de dispositivo fica preservado e exige decisão administrativa futura.
- A reprodução offline completa depende de dados previamente presentes na cache persistente do Firestore e das mídias locais; a correção não altera a arquitetura de playlists.
- A correção precisa de teste físico de boot/restart offline e reconexão no package isolado antes de promoção.

## Gate

**LINK-FIX PRONTO PARA TESTE FÍSICO.**

O RC2 oficial permanece bloqueado. O APK de auditoria não foi promovido nem instalado.

## Teste físico curto — 21/09/2026

| Gate | Resultado |
|---|---|
| Vínculo inicial | APROVADO |
| Playlist carregada e reprodução iniciada | APROVADO |
| Reabertura online após parada forçada | APROVADO |
| Boot/reabertura offline após parada forçada | APROVADO |
| Reprodução offline | APROVADO |
| Retorno da internet e revalidação | APROVADO |
| Ciclo final da playlist | APROVADO |
| Novo código solicitado depois do vínculo inicial | NÃO |
| Vínculo apagado | NÃO |

Observações:

- O primeiro vídeo apresentou uma única piscada preta no meio da primeira passagem; o evento não se repetiu durante o teste curto e não afetou o vínculo.
- A tentativa de abrir a tela de diagnóstico retornou imediatamente à reprodução. Essa limitação não impediu a validação física do ciclo de vida do vínculo e deve permanecer registrada como pendência da variante de auditoria.

### Resultado físico

**LINK-FIX APROVADO PARA PROMOÇÃO.**

Esta aprovação cobre exclusivamente a preservação do vínculo Android. Nenhuma promoção, publicação ou atualização de cliente foi executada.
