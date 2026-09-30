# LOOP DE PLAYLIST COM 1 MÍDIA

## Causa

`goToNextMedia()` encerrava imediatamente quando `playerItems.length <= 1`. Assim, o `onEnded` do único vídeo não reiniciava o elemento, enquanto o timer da única imagem chegava ao fim sem iniciar outro ciclo.

## Correção

- Para um único vídeo, `onEnded` mantém o mesmo elemento e a mesma origem, define `currentTime = 0` e chama `play()` novamente.
- Para uma única imagem, o fim da duração incrementa somente um contador de ciclo e rearma a mesma duração, sem transição artificial.
- Templates únicos não foram alterados.
- Playlists com dois ou mais itens continuam usando o fluxo anterior de `goToNextMedia()`.
- A resolução da origem e o download manager não são chamados novamente pelo replay do vídeo.

## Arquivos alterados

- `src/single-item-loop.js`
- `src/App.jsx`
- `tests/single-item-loop.test.js`
- `package.json`
- `.env.playerLoopAudit`
- `android/app/build.gradle`
- `android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java`
- `android/app/src/main/java/br/com/parksolutions/totempark/BootReceiver.java`
- `android/app/src/main/java/br/com/parksolutions/totempark/PlayerBootService.java`
- `android/app/src/playerLoopAudit/assets/public/`

## Testes

| Caso | Resultado |
|---|---|
| 1 vídeo reinicia continuamente | APROVADO |
| 1 vídeo local, 3 repetições, sem novo FileTransfer/fallback | APROVADO |
| 2 vídeos mantêm A → B → A → B | APROVADO |
| 1 imagem continua ativa após a duração | APROVADO |

As suítes preservadas também passaram:

- Local First: 8/8.
- Timeout/retry: 5/5.
- LINK-FIX: 8/8.
- Total consolidado: 25/25.
- ESLint do módulo e teste novos: aprovado.
- Build Vite/WebView isolada: aprovada.
- Build Android isolada: aprovada.

## Preservação de escopo

- Local First: PRESERVADO.
- Timeout/retry: PRESERVADO.
- LINK-FIX: PRESERVADO.
- Fluxo de playlists com 2+ itens: PRESERVADO.
- Templates: NÃO ALTERADOS.
- Backend/Firebase: NÃO ALTERADOS.
- Web e Service Worker: NÃO PUBLICADOS/NÃO ALTERADOS como artefatos de produção.

## Build

- APK: `Totem-Park-Player-SINGLE-ITEM-LOOP-AUDIT.apk`
- Package: `br.com.parksolutions.totempark.player.loopaudit`
- VersionCode: `1`
- VersionName: `1.0-player-single-loop-audit`
- SHA-256: `67BDE33DA385B78D512C566AD93F004C8A794E2882E14F18E4BE2DB00B3B91B3`
- Instalação: NÃO EXECUTADA.
- Publicação: NÃO EXECUTADA.

## Resultado

**PRONTO PARA TESTE FÍSICO.**
