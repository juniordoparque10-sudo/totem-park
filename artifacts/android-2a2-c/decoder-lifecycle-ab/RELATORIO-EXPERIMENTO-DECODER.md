# TOTEM PARK — experimento A/B do lifecycle do decoder

**Estado: EXPERIMENTO PRONTO PARA TESTE FÍSICO.** Nenhuma alteração foi publicada, instalada na TV ou promovida ao RC4.

## Alteração experimental

O controle A continua sendo o JUMP DIAG existente, sem alteração de comportamento. O build B usa o package `br.com.parksolutions.totempark.player.decoderexperiment` e uma única abordagem: **liberar e desmontar o `<video>` anterior antes de montar o próximo** em transições vídeo → vídeo. O build B não reutiliza o elemento.

Na transição B, o Player cancela o timer de reprodução e o cleanup pendente, registra `DECODER_RELEASE_START`, chama `pause()`, remove o atributo `src`, chama `load()` e entra em uma renderização sem camadas de vídeo. O React desmonta o elemento e seus handlers. No layout effect posterior, o Player registra `DECODER_RELEASE_END` com a contagem de elementos restantes e só libera a montagem do próximo se essa contagem for zero. `VIDEO_UNMOUNT` e `VIDEO_MOUNT` continuam registrados pelo JUMP DIAG. Eventos atrasados `playing`/`error` do elemento em liberação são ignorados para não iniciar ou avançar um item que já está saindo.

O comportamento original permanece nos outros modos e nas passagens vídeo único → mesmo vídeo, imagem → vídeo e vídeo → imagem. Local First, cache, FileTransfer, download, timeout/retry, telemetria, backend, playlist e timer de duração não foram modificados.

## Lifecycle anterior e experimental

| Controle A | Experimental B |
|---|---|
| Vídeo anterior continua montado durante entrada do próximo | `pause` → remove `src` → `load` → `VIDEO_UNMOUNT` |
| Próximo `<video>` monta enquanto o anterior pode permanecer até cleanup | Montagem do próximo só ocorre após `DECODER_RELEASE_END` com zero vídeos |
| Cleanup da camada anterior ocorre depois da prontidão do novo item | Não há camada de vídeo anterior nas transições vídeo → vídeo |

## Arquivos alterados

- `src/App.jsx`: gate de dois commits somente no build B, eventos de liberação e interface de diagnóstico.
- `src/decoder-lifecycle.js`: detecção da transição vídeo → vídeo e liberação explícita.
- `src/jump-diagnostics.js` e `src/android-diagnostics.js`: instrumentação local no novo modo.
- `android/app/build.gradle`: flavor e package separados.
- `package.json` e `.env.playerDecoderExperiment`: modo de build.
- `tests/decoder-lifecycle.test.js`: verificação de escopo e da ordem de liberação.
- `android/app/src/playerDecoderExperiment/assets/public`: bundle Web exclusivo do flavor B.

## Testes locais

- `node --test tests/android-media-source.mjs tests/android-download-policy.test.js tests/single-item-loop.test.js tests/decoder-lifecycle.test.js`: **20/20 passaram**. Cobrem seleção de fonte local, política de download, loop de um vídeo, sequência de dois vídeos, exclusão dos casos com imagem do novo fluxo e ordem `pause` → remoção de `src` → `load`.
- `npm run build:player-decoder-experiment`: **passou**.
- `:app:assemblePlayerDecoderExperimentDebug`: **passou**.
- ESLint dos módulos de diagnóstico/helper/teste: **passou**. `git diff --check`: sem erros de whitespace.

Esses testes não reproduzem o decoder da TV. A passagem real com um vídeo, dois vídeos, imagem → vídeo e vídeo → imagem ainda precisa ser observada no hardware antes de qualquer conclusão de eficácia ou regressão visual.

## APK experimental

- [Totem-Park-Player-DECODER-EXPERIMENT-B.apk](./Totem-Park-Player-DECODER-EXPERIMENT-B.apk)
- Package: `br.com.parksolutions.totempark.player.decoderexperiment`
- VersionCode: `1`
- Tamanho: `6.829.653` bytes
- SHA-256: `0F460EF83856C9C64E0F9C234D2909D41DADAC1EEEBE3E83961C40F4AABDDC8F`

## Roteiro físico curto

1. Manter o JUMP DIAG A como controle já medido: 58 erros `MEDIA_ERR_DECODE` em A1 LOCAL nos ~10 minutos finais do diagnóstico anterior. Não alterar playlist nem RC4.
2. Fechar o JUMP DIAG na TV piloto e instalar o package B separado. Ele terá **armazenamento inicialmente frio**, pois Android isola dados/cache por package; não poderá compartilhar literalmente o cache do A. Vincular à mesma tela de teste sem deixar os dois Players concorrendo por ela.
3. Aguardar A1 e A2 concluir download e confirmar `LOCAL_SRC_ASSIGNED` para ambos. Descartar a primeira passagem como aquecimento. Manter telemetria OFF.
4. Observar A1 → A2 → A1 por ~10 minutos ou até o primeiro erro. Ao ocorrer erro, exportar SALTO · Diagnóstico antes de reload. Confirmar `DECODER_RELEASE_START` → `VIDEO_UNMOUNT` → `DECODER_RELEASE_END` com `remainingVideoCount: 0` → `VIDEO_MOUNT` do próximo. Contar `MEDIA_ERR_DECODE` em A1.
5. Ainda no B, observar uma passagem curta com vídeo único, imagem → vídeo e vídeo → imagem. Qualquer regressão encerra o ensaio.

## Interpretação e riscos

Se B tiver zero erros em A1 com transições completas e A continuar apresentando erros, isso será forte evidência a favor de lifecycle/concorrência de decoder, mas a diferença de package e cache exige cautela antes de atribuir causa absoluta. Se B também falhar, a hipótese específica de coexistência não estará confirmada. O novo fluxo pode causar uma lacuna visual curta entre vídeos; apenas a TV pode medir isso. O diagnóstico guarda os últimos 180 eventos detalhados, por isso exportar imediatamente após falha.

**Rollback:** fechar/desinstalar somente o package experimental B e voltar ao package de controle A; RC4 e produção permanecem intactos. Não instalar B por cima do RC4.
