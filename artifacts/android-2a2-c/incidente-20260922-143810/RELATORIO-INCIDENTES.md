# 2A.2-C.2 — Diagnóstico dos incidentes do piloto

## Estado preservado

- Sessão operacional: `efa5d675-8ead-47db-b14e-d43b1b289c7a`
- Sessão RC Diagnóstico: `77979386…`
- Player permaneceu online e respondendo ao heartbeat.
- Cache preparado: 2 hits / 2 misses.
- Downloads concluídos: 2, total de 4.389.944 bytes, exatamente o tamanho somado das duas mídias.
- Falhas de download: 0.
- Timeouts: 0.
- Reprodução observada no diagnóstico: 442 local / 1 remota.
- Estado local preservado na tela: 40 eventos / 20 transições.
- Exportação local falhou por `EACCES` ao escrever em `Documents`; os dados permaneceram no localStorage.

## 13:23

Foi relatado pequeno retrocesso/avanço visual no vídeo 2. O backend retém somente o snapshot remoto mais recente e sobrescreve o documento da sessão; os eventos detalhados desse horário já não estavam disponíveis quando a coleta ocorreu. Não há evidência preservada de `seeking`, `seeked`, erro, download ou troca de source nesse instante.

Não houve checkpoint exatamente às 13:23. Os checkpoints próximos eram aproximadamente 13:21 e 13:26.

## 13:35

O mesmo comportamento foi relatado no vídeo 2, aproximadamente no mesmo ponto. Os eventos detalhados já haviam saído da janela remota preservada. Não há prova de seek real, stall ou erro nesse horário.

O checkpoint previsto mais próximo era aproximadamente 13:36; não existe coincidência exata registrada.

## 14:18

O salto visual foi novamente relatado no vídeo 2. Os eventos detalhados não estavam mais presentes no snapshot remoto. O checkpoint anterior era aproximadamente 14:16 e o seguinte 14:21.

## 14:27 — tela preta

Há evidência objetiva preservada:

1. `Park Solutions vídeo` (`enfiqiz94zS2wy4oAaKe`) terminou.
2. A transição `VIDEO_ENDED` para o vídeo 2 foi concluída com sucesso em 221 ms.
3. O vídeo 2, `PSolutions V1` (`AVwGDQ73WNhEnKaMZj7I`), iniciou como `CACHE_LOCAL`.
4. Em `currentTime = 0,641028 s`, o elemento gerou erro código 3, equivalente a `MEDIA_ERR_DECODE`.
5. O Player iniciou uma transição de recuperação com motivo `ERROR` para o vídeo 1.
6. Essa transição permaneceu incompleta.
7. O vídeo 1 ficou em `waiting`, `readyState = 1`, `networkState = 1`, `currentTime = 0`.
8. `playbackActive` permaneceu `false`, compatível com a tela preta.

Não houve download, retry, timeout, source remoto ou erro de FileTransfer coincidente. O checkpoint mais próximo ocorreu cerca de 73 segundos antes; não há coincidência temporal exata com a escrita de telemetria.

## Vídeo 2

- Nome: `PSolutions V1.mp4`
- Media ID: `AVwGDQ73WNhEnKaMZj7I`
- Tamanho: 1.825.834 bytes
- Resolução declarada: 848 × 478
- Duração: 10 s
- Container: MP4
- Tags de codec encontradas: `avc1` (H.264/AVC) e `mp4a` (AAC)
- Origem nos incidentes: cache local

## Seek real

Não comprovado. A telemetria desta versão não captura eventos `seeking` e `seeked`, portanto os três pequenos saltos não podem ser classificados como seek real apenas pelos dados disponíveis.

## Waiting e stalled

- `waiting`: 418 ocorrências acumuladas, 85.493 ms no total.
- `stalled`: 0.
- No evento de tela preta houve `waiting` após o erro de decode.

## Relação com telemetria

O teste comparativo manteve o mesmo APK, TV, playlist, cache, vínculo e mídia, mas desativou a telemetria. Em três passagens, o salto do vídeo 2 reapareceu uma vez. O heartbeat normal continuou e os checkpoints de telemetria cessaram.

Fato: a telemetria ativa não é condição necessária para reproduzir o salto. Isso enfraquece a hipótese de que serialização, checkpoint, histórico ou flush da outbox causem o problema.

## Causa e hipóteses

### Causa comprovada para a tela preta

Falha de decode do elemento de vídeo (`MEDIA_ERR_DECODE`) durante o vídeo 2, seguida por recuperação incompleta e espera no vídeo 1.

### Hipóteses ainda abertas para os pequenos saltos

1. característica ou irregularidade do arquivo `PSolutions V1.mp4` em ponto específico;
2. comportamento do decoder/WebView da TV Semp ao decodificar esse arquivo local;
3. recriação ou sincronização do elemento de vídeo não capturada pelos eventos atuais.

Não há evidência de download, Local First, Firestore ou telemetria como causa direta.

## Recomendação

Manter o rollout bloqueado e a telemetria desligada. O próximo teste deve isolar o arquivo: reproduzir o mesmo `PSolutions V1.mp4` fora do Totem Park na mesma TV e, em paralelo, testar no Player outra codificação do mesmo conteúdo, sem substituir o original antes de preservar seu hash e parâmetros completos. Somente depois decidir entre problema de mídia/encode e recuperação do Player após erro de decoder.

## Classificação

**2A.2-C.2 — PILOTO REAL BLOQUEADO**
