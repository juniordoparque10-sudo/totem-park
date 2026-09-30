# TOTEM PARK — isolamento do vídeo 2

Status: **piloto 2A.2-C.2 bloqueado**. Produto, telemetria, cache, Local First e APK não foram alterados.

## Arquivos preservados

- Original analisado: `video2-evidence.mp4`
- SHA-256 original: `E0FBDFF75216AB3432368AAC47AE5F3B6B09DA6D6F59B0C09C68325E1F4E70D1`
- Cópia de teste: `PSolutions-V1-recodificado-teste.mp4`
- SHA-256 da cópia: `20CA68564493EB5C33BCD60C5E8F0A44B7FBB4BFDE3D79A57E267FC5AEAC9FD7`

## 1. Análise técnica do original

| Campo | Resultado |
|---|---|
| Container | MP4 (`mov,mp4,m4a,3gp,3g2,mj2`) |
| Vídeo | H.264/AVC, profile High, level 3.0 |
| Resolução | 848 × 478 |
| Pixel format | yuv420p, BT.709, progressivo |
| FPS nominal/real | 24/1 e 24/1 |
| CFR/VFR | CFR: 240 frames em 10,000 s |
| Timebase | 1/90000 |
| Bitrate médio de vídeo | 1.328.830 bps |
| Pico aproximado em janela de 1 s | 1.511.496 bps |
| Duração do container | 10,005333 s |
| B-frames | 0 |
| Reference frames | 1 |
| Keyframes/GOP | apenas 1 keyframe, em 0,000 s; GOP cobre praticamente os 10 s completos |
| Áudio | AAC-LC, estéreo, 48 kHz, 128.174 bps; duração 10,005333 s |
| Timestamps | início 0; PTS e DTS monotônicos nos 240 pacotes de vídeo |
| Teste de decode | concluído integralmente com exit code 0, sem warning/erro detectado |

Fato relevante: o GOP de praticamente 10 segundos é incomum para uma mídia destinada a reprodução repetitiva em Android TV/WebView. Isso é uma hipótese de compatibilidade, não uma causa comprovada.

## 2. Região temporal do problema

- Pequeno salto: descrito visualmente no meio do vídeo 2; o instante exato não foi capturado.
- Tela preta anterior: `MEDIA_ERR_DECODE` no vídeo 2 em `currentTime = 0,641028 s`.

## 3. Parâmetros da cópia recodificada

Comando equivalente utilizado:

```text
ffmpeg -fflags +genpts -i ORIGINAL -map 0:v:0 \
  -vf fps=24,format=yuv420p -an \
  -c:v libx264 -profile:v baseline -level:v 3.0 \
  -preset medium -crf 20 -g 48 -keyint_min 48 -sc_threshold 0 \
  -movflags +faststart -video_track_timescale 90000 COPIA.mp4
```

A trilha de áudio foi removida somente da cópia de teste. Não houve filtro visual, redimensionamento ou substituição do original.

## 4. Validação técnica da cópia

| Campo | Resultado |
|---|---|
| Container | MP4 |
| Vídeo | H.264/AVC, Constrained Baseline, level 3.0 |
| Resolução | 848 × 478 |
| Pixel format | yuv420p |
| FPS | CFR 24 fps |
| Frames/duração | 240 frames / 10,000 s |
| Timebase | 1/90000 |
| Bitrate médio de vídeo | 1.196.928 bps |
| Pico aproximado em janela de 1 s | 1.767.232 bps |
| B-frames | 0 |
| Keyframes | 0, 2, 4, 6 e 8 segundos |
| Áudio | ausente |
| Timestamps | PTS e DTS monotônicos |
| Teste de decode | concluído integralmente com exit code 0, sem warning/erro detectado |

## 5. Matriz comparativa

| Cenário | Salto | Decode error | Tela preta | Estado |
|---|---:|---:|---:|---|
| A — Original fora do Totem Park | NÃO em 3 passagens | NÃO | NÃO | normal |
| B — Recodificado fora do Totem Park | NÃO em 3 passagens | NÃO | NÃO | normal |
| C — Original no Totem Park | **SIM** | **SIM**, ocorrência anterior | **SIM**, ocorrência anterior | comprovado |
| D — Recodificado no Totem Park | **SIM**, uma vez em mais de 10 ciclos, às 15:29 de 22/09/2026 | não observado nessa rodada | NÃO nessa rodada | mesmo APK, TV, fluxo e telemetria OFF |

## 6. Auditoria do pipeline de upload pelo App

### Comparação de bytes

| Etapa | Tamanho | SHA-256 | MD5 |
|---|---:|---|---|
| Fonte `Downloads/PSolutions V1.mp4` | 1.825.834 bytes | `E0FBDFF75216AB3432368AAC47AE5F3B6B09DA6D6F59B0C09C68325E1F4E70D1` | `04DE0EEE414E9AE595E4FDFA401419B2` |
| Objeto baixado do Firebase Storage | 1.825.834 bytes | `E0FBDFF75216AB3432368AAC47AE5F3B6B09DA6D6F59B0C09C68325E1F4E70D1` | `04DE0EEE414E9AE595E4FDFA401419B2` |
| Cache Android | 1.825.834 bytes segundo validação de tamanho | indisponível sem ADB/acesso ao arquivo privado | indisponível |

O metadata remoto confirma:

- `contentType: video/mp4`;
- `contentEncoding: identity`;
- `size: 1825834`;
- `md5Hash: BN4O7kFOmuWV5P36QBQZsg==`, equivalente ao MD5 hexadecimal acima;
- `originalName: PSolutions V1.mp4`.

Conclusão comprovada: **fonte e objeto armazenado são byte a byte idênticos**. Não houve transformação, recompressão ou transcodificação no upload desse arquivo.

### App versus Portal Web

Ambos usam a mesma função `uploadStorageAsset`, o mesmo `uploadBytesResumable` do Firebase e os mesmos metadados de conteúdo. O caminho nativo possui somente uma diferença: se a primeira tentativa resumível falhar, o App lê `file.arrayBuffer()`, cria um novo `Blob` com os mesmos bytes e repete o envio. Essa estabilização não codifica nem comprime o vídeo.

Não existe no pipeline analisado:

- FFmpeg/transcodificação;
- compressão de vídeo;
- alteração de resolução, FPS, GOP ou áudio;
- conversão de container;
- processamento server-side após upload.

O chunking é responsabilidade do SDK resumível do Firebase e serve apenas para transporte. O objeto final comprovadamente preservou os bytes.

O download Android usa `FileTransfer.downloadFile` diretamente para o arquivo de destino. Após o download, o código valida o tamanho final contra os 1.825.834 bytes esperados. Não há transformação do conteúdo nesse caminho. Porém, a implementação atual não calcula hash do cache; sem ADB conectado, a igualdade criptográfica do arquivo privado da TV permanece **não comprovada**, embora o tamanho corresponda.

## 7. Fatos comprovados

- O salto do original ocorreu dentro do Totem Park com telemetria desligada.
- Uma ocorrência anterior gerou `MEDIA_ERR_DECODE` e recuperação incompleta do Player.
- Não havia download/FileTransfer coincidente.
- O original decodifica integralmente no FFmpeg, mas possui somente um keyframe em dez segundos.
- A cópia é CFR, tem GOP regular de dois segundos e também decodifica integralmente.
- Original e recodificado funcionaram fora do Totem Park em três passagens cada.
- O original local e o objeto do Storage são idênticos em tamanho, SHA-256 e MD5.
- O upload pelo App não alterou o arquivo armazenado.
- A cópia recodificada também apresentou um salto dentro do Totem Park. A recodificação não eliminou o sintoma.

## 8. Correlação da ocorrência de 15:29

O horário informado é 15:29 BRT (`2026-09-22T18:29:00Z`, aproximadamente). A mídia de teste era a cópia recodificada colocada na posição do vídeo 2. Não foi fornecido o segundo exato dentro da mídia. A telemetria estava OFF e não há log local exportado desse instante. Os snapshots remotos preservados são anteriores ao teste; por isso não permitem determinar `currentTime`, `waiting`, `stalled`, `pause`, `playing`, `readyState`, `networkState`, troca de `src`, remontagem do elemento ou reset de `currentTime` em 15:29.

A versão atual registra alguns eventos HTML5 quando a telemetria está ativa, porém não possui handlers para `seeking` e `seeked` no vídeo do Player. O diagnóstico local registra origem e início/fim de reprodução, mas não uma linha do tempo de `currentTime` ou identidade do elemento. Portanto, o salto visual **não pode ser classificado como seek, troca de source, remontagem ou avanço de item** com a evidência disponível.

Revisão estática do código, sem modificação:

- O vídeo usa `src` resolvido a cada render e fica dentro de uma camada com chave que inclui item e revisão da playlist. Uma alteração dessa chave pode remontar o elemento. Não há prova de que isso ocorreu às 15:29.
- O Player possui um timer de duração para avançar itens, além de `onEnded`. Em Android TV o timer aguarda o estado de vídeo pronto, mas é independente do relógio `currentTime` do elemento. Não há prova de disparo prematuro às 15:29.
- `onLoadedMetadata`, `onLoadedData` e `onCanPlay` podem chamar `play()`. Não há prova de que alguma dessas chamadas reiniciou o vídeo no instante observado.
- O código mostrado não atribui `currentTime` ao vídeo normal da playlist; atribuições encontradas em outras rotinas pertencem à captura de preview. Isso não exclui um seek interno do WebView/decoder.

## 9. Hipóteses restantes

- caminho HTMLVideoElement/WebView do Player, agora prioridade principal;
- sincronização do timer do Player com o tempo real do vídeo;
- recriação do elemento por mudança de chave, revisão ou estado da playlist;
- comportamento do decoder da TV acionado pelo caminho WebView, ainda possível;
- integridade do cache Android, cujo hash ainda não foi obtido.

O GOP longo do original não explica sozinho o salto: a cópia com GOP regular também falhou dentro do Totem Park. A qualidade superior do original permanece requisito; Constrained Baseline não foi aprovado como formato definitivo.

## 10. Próxima decisão

Classificação: **PROBLEMA ASSOCIADO AO PLAYER/WEBVIEW**, como direção de investigação, não como causa específica confirmada. Manter o piloto bloqueado. Antes de qualquer correção, uma captura direcionada precisará registrar `currentTime`, eventos de seek, identidade/montagem do elemento, chave React, `src`, timer e eventos HTML5 em uma nova ocorrência. Nenhuma mudança no produto foi feita nesta etapa.
