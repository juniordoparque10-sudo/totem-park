# TOTEM PARK — diagnóstico direcionado do salto

**Estado:** diagnóstico pronto para teste físico. Piloto 2A.2-C.2 e rollout permanecem bloqueados. Nenhuma correção de reprodução foi implementada.

## Instrumentação adicionada

- Eventos HTML5 do vídeo: `play`, `playing`, `pause`, `waiting`, `stalled`, `canplay`, `canplaythrough`, `loadedmetadata`, `loadeddata`, `durationchange`, `ratechange`, `timeupdate` amostrado, `seeking`, `seeked`, `ended`, `emptied`, `abort`, `suspend` e `error`.
- Snapshot por evento: horário ISO, mídia, índice, instância do elemento, `src` e `currentSrc` sem query string, `currentTime`, duração, `readyState`, `networkState`, `paused`, `ended`, `seeking`, `playbackRate` e código de erro.
- `VIDEO_MOUNT` e `VIDEO_UNMOUNT` com identidade da instância e chave React. `REACT_KEY_CHANGE` quando muda a chave do item atual.
- `VIDEO_SRC_CHANGE` em `loadstart`, comparando a fonte anterior com a atual no mesmo elemento.
- `TIMER_CREATED`, `TIMER_CANCELLED`, `TIMER_FIRED` e `PLAYER_ADVANCE_REQUEST`, com prazo esperado, disparo real, mídia, índice e `currentTime` disponível.
- `CURRENTTIME_ASSIGNMENT` nos dois pontos existentes que atribuem `currentTime` (ambos são rotinas de preview; o vídeo normal da playlist não contém atribuição explícita).
- `UNEXPECTED_TIME_BACKWARD` para queda maior que 0,35 s; `UNEXPECTED_TIME_FORWARD` para avanço superior ao tempo real decorrido, ajustado pela taxa de reprodução, mais 0,75 s. Transições esperadas e `seeking` ativo são excluídos dessas duas classificações.

## Arquivos alterados

- `src/jump-diagnostics.js` (novo)
- `src/App.jsx`
- `src/android-diagnostics.js`
- `android/app/build.gradle`
- `package.json`
- `.env.playerJumpDiag` (novo)
- `android/app/src/playerJumpDiag/assets/public` (assets do flavor diagnóstico)

## Buffer e exportação

O modo `playerJumpDiag` guarda os últimos **180 eventos** em buffer circular local. `timeupdate` é amostrado no máximo uma vez por segundo por elemento. A gravação em `localStorage` é agrupada em até 1,5 s; eventos de anomalia solicitam gravação imediata. Não há endpoint de envio ou Firestore write nesse modo. URLs têm a query string removida.

Na tela **SALTO · Diagnóstico**, o usuário pode ver os eventos e tentar exportar, copiar ou compartilhar o JSON. A exportação tenta `Documents`; se o Android negar acesso, salva na pasta privada `Data` do app. O caminho é mostrado na tela. Copiar/compartilhar dependem do suporte do WebView/TV, portanto a visualização na tela permanece como alternativa.

## APK diagnóstico

- Arquivo: `Totem-Park-Player-JUMP-DIAG.apk`
- Package: `br.com.parksolutions.totempark.player.jumpdiag`
- VersionCode: `1`
- Tamanho: `6.828.315` bytes
- SHA-256: `EA780D87E65E6A52F848B401555D45301E5D88524CD6D62B94B44E83CB02EF1E`
- APK separado da instalação oficial e do piloto 2A.2-C.2. Seu armazenamento começa frio por ser outro package.

## Testes locais

- `npm run build:player-jump-diag`: aprovado.
- `:app:assemblePlayerJumpDiagDebug`: aprovado.
- 17 testes existentes de download, seleção da origem de mídia e loop: aprovados.
- Package e asset JS do APK confirmados por inspeção.
- Teste físico ainda pendente; nenhum salto foi capturado neste APK até agora.

## Impacto estimado

Instrumentação habilitada somente no flavor diagnóstico. Eventos de tempo são amostrados; o buffer é limitado e as gravações são agrupadas. O custo residual é processamento leve no WebView e escrita local periódica. Por isso, uma diferença entre o APK diagnóstico e o piloto não deve ser confundida com cura do problema. Nenhuma lógica de avanço, cache, Local First, timeout/retry ou playlist foi alterada.

## Procedimento físico

1. Na TV Teste, fechar o Player atualmente em uso e instalar o APK diagnóstico separado. Não desinstalar nem limpar dados do Player oficial/piloto.
2. Vincular o package diagnóstico à tela de teste. Considerar o cache inicialmente frio e aguardar a primeira preparação da mídia. Confirmar na tela **SALTO · Diagnóstico** que a fonte passou a `LOCAL` antes de observar o salto.
3. Usar o vídeo original `PSolutions V1` na playlist já testada. Rodar até ocorrer o salto ou completar 20 minutos. Não é necessário contar ciclos.
4. Se houver salto, anotar o horário local e abrir **SALTO · Diagnóstico** sem recarregar o app. Exportar, copiar ou compartilhar o JSON; se a exportação externa falhar, preservar o app e fotografar os eventos próximos ao horário.
5. Correlacionar a janela de ±10 segundos: `seeking`/`seeked`, `currentTime`, chave, mount/unmount, `src`, timer, `waiting`/`stalled`, `readyState`, `networkState` e erro.

## O que a captura pode provar

- **Seek real:** evento `seeking`/`seeked` e mudança do tempo na mesma instância.
- **Remontagem:** `VIDEO_UNMOUNT` seguido de `VIDEO_MOUNT`, com nova instância/chave.
- **Reset de source:** `VIDEO_SRC_CHANGE` e ciclo de carregamento.
- **Timer:** `TIMER_FIRED` e `PLAYER_ADVANCE_REQUEST` coincidentes com o salto.
- **WebView/decoder:** salto observado sem mudança lógica capturada nas proximidades. Essa categoria ainda será inferência, pois eventos internos do decoder não ficam expostos ao JavaScript.

Limite: a amostragem de `timeupdate` pode não registrar um salto que retrocede e se recupera dentro de menos de um segundo. Eventos `seeking`/`seeked`, mount, source e timer são registrados imediatamente.
