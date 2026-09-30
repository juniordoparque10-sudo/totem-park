# JUMP DIAG — análise do teste físico de 22/09/2026

Fonte preservada: `totempark-jump-diagnostic-20260922.json`, SHA-256 `27313CEF13EC68F21CD2CE9AE931574AA40EEC8489BA2A4E0E95214FB9A63279`. Os horários abaixo são UTC; subtrair 3 horas para o horário local de São Paulo.

## Achado principal

O índice da playlist **volta ao item 0**, mas o elemento local de `Park Solutions vídeo` (`enfiqiz94zS2wy4oAaKe`) emite erro HTMLMediaElement código **3 — MEDIA_ERR_DECODE** em `currentTime=0`. O handler `onError` chama `skipFailedMedia()`, que solicita `goToNextMedia("ERROR")`, levando imediatamente ao item 1 (`PSolutions V1`, `AVwGDQ73WNhEnKaMZj7I`). Isso explica por que a sequência visível parece repetir somente o vídeo 2.

O erro ocorreu oito vezes no relatório: `18:49:28.692`, `18:49:38.930`, `18:49:49.248`, `18:49:59.484`, `18:50:09.697`, `18:50:19.900`, `18:50:30.114` e `18:50:40.319Z`. Após a primeira ocorrência, os intervalos ficaram entre **10,203 e 10,318 s**, aproximadamente uma tentativa de retornar ao item 0 por reprodução do vídeo 2.

## Janela detalhada — 18:49:59Z

| Horário UTC | Evento | Evidência |
|---|---|---|
| 18:49:59.373 | `TIMER_FIRED` no índice 1 | `currentTime=10,005333`, duração `10,005333`, disparo 1 ms após o esperado |
| 18:49:59.373 | `PLAYER_ADVANCE_REQUEST`, razão `VIDEO_TIMER` | solicitação do índice 1 para o próximo item |
| 18:49:59.383–.400 | `VIDEO_MOUNT`, `REACT_KEY_CHANGE`, `VIDEO_SRC_CHANGE` | item 0 montado como nova instância 6 com arquivo local `13527073.mp4` |
| 18:49:59.407–.446 | `play`, `waiting`, `loadedmetadata` | item 0 em `currentTime=0`, duração `10,005`, `readyState=1`, `networkState=1` após carregar metadados |
| **18:49:59.482** | **`VIDEO_ERROR` no item 0** | **código 3, `currentTime=0`, `readyState=1`, `networkState=1`** |
| 18:49:59.487 | `PLAYER_ADVANCE_REQUEST`, razão `ERROR` | o Player pula o item 0 |
| 18:49:59.513 | `REACT_KEY_CHANGE` para índice 1 | retorno ao vídeo 2; revisão da playlist permaneceu igual |
| 18:49:59.522–.564 | `VIDEO_SEEKING` → `VIDEO_SEEKED` | instância 2 do vídeo 2 vai do fim para aproximadamente 0 s |
| 18:49:59.571 | `VIDEO_PLAYING` no índice 1 | reprodução do vídeo 2 retomada com `readyState=4`, `networkState=1` |

O mesmo padrão aparece nas janelas ±10 s de `18:50:09.697`, `18:50:19.900`, `18:50:30.114` e `18:50:40.319Z`: timer do vídeo 2 próximo de seu fim, tentativa real do índice 0, erro de decode imediato no índice 0 e avanço por `ERROR` ao índice 1. O elemento do índice 0 é desmontado após a transição. O elemento do vídeo 2 conserva a mesma instância (`instanceId=2`) e reinicia por `seeking`/`seeked` quando volta a ser atual.

## Verificações pedidas

- **Seek programático:** nenhum `CURRENTTIME_ASSIGNMENT` no buffer. Os cinco `seeking`/`seeked` preservados ocorrem no vídeo 2 ao voltar do item 0 com erro, entre `currentTime≈10 s` e `≈0 s`. Não há evidência de atribuição explícita de `currentTime` no Player.
- **Salto inesperado do relógio:** nenhum `UNEXPECTED_TIME_BACKWARD` ou `UNEXPECTED_TIME_FORWARD` registrado. Isso não descarta um evento visual inferior a 1 segundo, pois `timeupdate` foi amostrado.
- **Mount/React key:** o índice 0 é montado em nova instância a cada tentativa. A chave muda por troca de índice; a parcela de revisão da playlist é constante. O vídeo 2 permanece na instância 2 no trecho retido.
- **Src/currentSrc:** o item 0 recebe o mesmo caminho local em cada montagem; o vídeo 2 não mostra troca de `src` no trecho retido. Os caminhos não incluem query sensível.
- **Timer:** cinco disparos preservados no item 1 ocorreram de 1 a 8 ms após o previsto, com `currentTime` de `9,980683` a `10,005333 s` para duração `10,005333 s`. Não há evidência de disparo prematuro nesses ciclos.
- **Ended:** não há `VIDEO_ENDED` no buffer dos cinco ciclos finais, porque o timer avançou no limiar do fim. O diagnóstico geral registra um `PLAYBACK_END` do vídeo 2 em `18:49:38.828Z`, anterior à janela circular.
- **Media change/índice:** o JSON local não contém evento com o nome `MEDIA_CHANGE`; `PLAYER_ADVANCE_REQUEST` e `REACT_KEY_CHANGE` mostram `1 → 0 → 1` repetidamente. A ausência de retorno visual ao índice 0 é consequência do erro de decode imediato, não de índice preso em 1.
- **Erro, waiting e estados:** o item 0 passa por `waiting` e `loadedmetadata`, depois erro código 3 em `currentTime=0`, `readyState=1`, `networkState=1`. Há `VIDEO_PAUSE` após o erro. O vídeo 2 chega a `readyState=4` e volta a `playing`. Não foi registrado `stalled` no buffer.
- **Downloads/cache:** duas transferências concluídas, 4.389.944 bytes, zero falhas e zero timeouts. Ambos os vídeos constam como encontrados localmente após a preparação. A igualdade por hash dos arquivos privados Android ainda não foi medida.

## Limites da evidência

O buffer circular de 180 eventos preserva apenas `18:49:54.113` a `18:50:50.319Z`. Assim, o primeiro salto visual relatado e seus ±10 s completos não estão no `jumpEvents`; o diagnóstico geral retém início de reprodução e o primeiro erro às `18:49:28.692Z`, mas não `currentTime`, timer ou montagem naquele instante. O relato de vários saltos dentro do vídeo 2 também não recebeu horário individual. A captura prova a falha repetida de retorno ao item 0; não prova que todos os saltos visuais foram causados pelo mesmo mecanismo.

## Classificação e próximo foco

**Ponto exato da divergência confirmado:** `VIDEO_ERROR` código 3 ao iniciar o vídeo 1 local, seguido do avanço por `ERROR` do índice 0 para 1. Categoria **E — avanço/índice como efeito da rotina de erro**, com **F — decoder/WebView** como origem observada do evento que dispara a rotina. A causa interna do erro de decode ainda não está determinada; integridade do cache local do vídeo 1, WebView/decoder e ciclo de montagem permanecem hipóteses.

Nenhuma correção de Player foi aplicada. O piloto e o rollout permanecem bloqueados.
