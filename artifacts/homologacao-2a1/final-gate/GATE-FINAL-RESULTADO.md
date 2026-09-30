# GATE FINAL 2A.1 + FIX — RESULTADO

## 1. Estado do Git

Workspace não estava limpo: **35 arquivos rastreados modificados e 63 entradas não rastreadadas**, todos preexistentes no estado capturado. As alterações de produto desta fase permanecem as conhecidas em public/sw.js, src/offline-player-cache.js e src/App.jsx. Existem alterações anteriores em outros arquivos, incluindo Android; não foram atribuídas a esta fase nem modificadas.

Executados git status, git diff e git diff --check. Comparação SHA-256 dos **519 arquivos de produto antes/depois do gate: zero mudanças**. Nenhum código/teste existente foi editado; somente novos artefatos de execução/evidência foram criados, além da saída local do build.

[Status completo](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/git-status-full.txt>) · [Diff capturado](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/git-diff-before.patch>) · [Verificação consolidada](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/verification-final.json>)

## 2. Build

**PASSOU.** Comando: npm.cmd run build → vite build --mode web. Produção Web do projeto compilada sem erros. Warning existente: bundle JS de aproximadamente 1.073 kB, acima de 500 kB. Avisos de conversão LF/CRLF do Git não foram corrigidos; diff --check não encontrou erros. Build gerou somente dist local, sem publicação.

## 3. Primeira preparação

Perfil exclusivo novo: C:\Users\centr\Desktop\totem-park\artifacts\homologacao-2a1\chrome-profile-gate\final-1789569564205. Cache de mídia inicialmente **vazio**, confirmado antes de abrir o Player. Mesmo Chrome 152.0.7977.84, viewport 1280×720, autoplay liberado, servidores 5198/5199 e emuladores demo-totem-homolog.

Vídeo baixado: **55312 bytes** — duas transferências iniciais de 27.656 bytes (Range/206 do playback e GET/200 da preparação). Não foi ocultada a duplicação inicial, que ocorreu antes de o cache estar preparado.

Imagem baixada: **15649 bytes**, GET/200.

Cache preparado: **2 entradas, 43.305 bytes**, em totempark-player-media-v1.

| Mídia | Chave | Bytes |
|---|---|---:|
| video/webm | https://totempark.local/cache/aa0dc5a1 | 27656 |
| image/png | https://totempark.local/cache/3056c0fe | 15649 |

Contagem baseada no corpo efetivamente enviado pelo servidor, excluindo cabeçalhos e carga das fixtures pelo seed local antes da navegação. Hashes completos estão em evidence.json.

## 4. Dez ciclos online

**PASSOU: 11 ciclos completos da playlist**, além de intervalos parciais nas bordas. Todos os ciclos completos tiveram vídeo e imagem visíveis, avanço e origem Blob/local. Downloads adicionais de corpo remoto: vídeo **0 bytes**, imagem **0 bytes**. Erros de mídia: zero.

Observação: houve **1 amostra transitória** de imagem is-pending na primeira ocorrência, fora dos ciclos completos verificados, liberada na amostra seguinte (~100 ms). Não houve pending permanente. Também há amostras de opacity=0 no início da animação fade, com is-ready; elas não representam um intervalo inteiro de imagem invisível. Transições existentes foram preservadas.

## 5. Reload

**PASSOU.** Reload normal, 4 ciclos completos observados. Vídeo: **0 bytes adicionais**. Imagem: **0 bytes adicionais**. Requisição/revalidação 304 com corpo zero não foi tratada como redownload. Todos os intervalos completos de imagem observados foram visíveis.

## 6. Restart completo

**PASSOU.** Processo inicial do Chrome PID 10836 encerrado e término confirmado. Reabertura com exatamente o mesmo perfil; inventário consultado em documento estático /favicon.png, antes de executar o Player.

ANTES: 2 arquivos / 43.305 bytes.

DEPOIS: 2 arquivos / 43.305 bytes.

Chaves e SHA-256 idênticos. Processo da sessão reaberta PID 9224 também encerrado e término confirmado ao concluir os testes.

## 7. Reprodução após restart

**PASSOU: 6 ciclos completos.** Vídeo visível, imagem visível, Blobs válidos, avanço funcionando. Nenhuma imagem permaneceu em pending; nenhum intervalo completo de imagem ficou invisível. Corpo adicional de vídeo/imagem: **0 / 0 bytes**. [Captura após restart](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/final-gate-restart-five.png>)

## 8. Dez ciclos offline

**PASSOU: 11 ciclos completos.** context.setOffline(true). Antes da observação, navegação externa para example.com falhou com **ERR_INTERNET_DISCONNECTED**.

Todos os ciclos completos tiveram vídeo e imagem visíveis, avanço, complete=true, naturalWidth>0, origem Blob/local, zero amostras pending no intervalo de imagem e zero erros de mídia. A validação usa amostragem DOM/visual a cada 100 ms, dimensões, opacity e visibility; não apenas onLoad ou existência no DOM.

| Ciclo | Vídeo visível | Imagem visível | Avanço | is-pending | Erro |
|---:|---|---|---|---|---|
| 1 | true | true | true | false | false |
| 2 | true | true | true | false | false |
| 3 | true | true | true | false | false |
| 4 | true | true | true | false | false |
| 5 | true | true | true | false | false |
| 6 | true | true | true | false | false |
| 7 | true | true | true | false | false |
| 8 | true | true | true | false | false |
| 9 | true | true | true | false | false |
| 10 | true | true | true | false | false |
| 11 | true | true | true | false | false |

[Captura offline](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/final-gate-offline-ten.png>) · [Amostras completas](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/evidence.json>)

## 9. Tráfego offline

Vídeo: Blob/local, **0 bytes remotos**. Imagem: Blob/local, **0 bytes remotos**. Nenhuma requisição de mídia original chegou ao servidor nesse intervalo. fetch(blobUrl) e decode local funcionaram; imagem PNG de 15.649 bytes, 640×360.

## 10. Playlist alterada

**PASSOU.** Volta online e adição somente de imagem02 à playlist A/tela01: video01 + imagem01 + imagem02. Listener realtime atualizou o Player sem reload. Duas imagens Blob distintas foram observadas no DOM e o cache passou a 3 entradas.

Conteúdo novo transferido: imagem02 **16044 bytes**. Vídeo01 e imagem01: **0 bytes adicionais**. A atualização não provocou redownload integral das mídias estáveis.

## 11. Segunda tela

**PASSOU.** A/tela02 preparada com video02 + imagem02. Depois a playlist de A/tela01 foi atualizada novamente, acrescentando uma fixture distinta imagemNova. Todas as entradas e hashes usadas pela tela02 permaneceram presentes no Cache Storage. Inventários completos: secondScreenBefore e ownershipAfter em evidence.json.

## 12. Segundo cliente

**PASSOU.** B/tela01 preparado com vídeo e imagem próprios. Nova operação da playlist de A preservou todas as entradas e hashes de B. Cache com 6 entradas antes da operação passou a 7 pela nova imagem, sem exclusão de entradas anteriores.

## 13. Service Worker

**PASSOU na ativação real.** A tentativa inicial de update por query string não ativou uma nova instância e ficou **INCONCLUSIVA**; a asserção correspondente está preservada em verification.json. Não foi interpretada como prova de falha do código de limpeza.

Foi executada uma verificação adicional em documento estático do mesmo perfil: unregister somente do registro local do navegador, fechamento da página controlada e registro do **mesmo /sw.js inalterado**. Nenhum clearCache ou exclusão manual de mídia foi realizado.

Estados observados: **installing → installed → activating → activated**. A ativação preservou as 7 mídias, bytes e hashes, preservou gate-unknown-cache e seu marcador, preservou totem-park-pwa-v3 e removeu somente totem-park-pwa-v1/v2.

[Evidência da ativação real](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/sw-activation.json>) · [Testes isolados de retenção](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/cache-retention-test.log>)

## 14. Regressão específica da imagem

**PASSOU.** Mesma imagem e mesmo id DOM reutilizados repetidamente. Nos 11 ciclos offline completos: complete=true, naturalWidth>0, is-pending=false e amostras visíveis em cada ocorrência. Nenhum intervalo de imagem permaneceu escondido. A primeira confirmação de onLoad não foi usada como único critério.

## 15. Android — somente análise

**SEM ALTERAÇÃO DE COMPORTAMENTO NATIVO.** A expressão ref adicionada ao App.jsx retorna undefined quando isNativeApp() é verdadeiro. Verificação direta dessa expressão e comparação com App.before.jsx confirmam que somente o ref Web Blob foi adicionado na correção anterior; todo o restante permanece idêntico. Filesystem, Directory.Data, FileTransfer, convertFileSrc, fila, timeout e caminhos nativos intactos. Os arquivos Android não mudaram durante o gate. Nenhum APK foi gerado; não houve teste em dispositivo nesta etapa.

## 16. ClearCache

Não executado nos testes principais nem usado como solução. Dívida técnica conhecida: clearCache ainda pode remover arquivos de outras telas do mesmo cliente; a preparação pode não reiniciar imediatamente. Nenhuma correção realizada; etapa separada.

## 17. Crescimento do cache

Cache de **mídia**, somente corpos armazenados: início **0 bytes / 0 MB**; após preparação **43.305 bytes / 0,043305 MB**; final **144529 bytes / 0.144529 MB**, 7 entradas. MB decimal (1.000.000 bytes). Shell, cabeçalhos, metadata e marcador desconhecido não entram nessa medição. Nenhuma quota ou limpeza implementada.

## 18. Firestore

Primary lease: **0 erros observados**. Logs locais também foram preservados para o contexto de múltiplas abas. Heartbeat avançou entre início, reprodução online e fim; valores em verification-final.json. Realtime confirmado pela alteração da playlist sem reload e carregamento somente das novas imagens.

Foram observados 20 avisos de transporte Firestore no bloqueio/reconexão offline, esperados com context.setOffline(true). Nenhuma configuração foi alterada. Dados fictícios e alterações de playlist ocorreram **exclusivamente nos emuladores demo-totem-homolog**, necessários aos cenários solicitados. Nenhum Firebase/Firestore/Storage de produção foi acessado ou alterado.

## 19. Critérios e conclusão

**APROVADO NO GATE FINAL LOCAL 2A.1 + FIX.**

| Verificação | Resultado |
|---|---|
| Runner completed | PASSOU |
| Fresh media cache | PASSOU |
| First preparation stored both files | PASSOU |
| online-ten | PASSOU |
| restart-five | PASSOU |
| offline-ten | PASSOU |
| Complete process exit and persistence | PASSOU |
| Offline remote request rejected | PASSOU |
| online-ten stable media payload zero | PASSOU |
| reload stable media payload zero | PASSOU |
| restartPlayback stable media payload zero | PASSOU |
| offline-ten stable media payload zero | PASSOU |
| changed stable media payload zero | PASSOU |
| ownershipUpdate stable media payload zero | PASSOU |
| Playlist addition only new image | PASSOU |
| Second screen preserved | PASSOU |
| Second client preserved | PASSOU |
| All 519 product files unchanged during gate | PASSOU |
| Heartbeat observed | PASSOU |
| Real SW installation/activation on static page | PASSOU |
| Production Web build | PASSOU |
| Native behavior analysis | PASSOU |

Nenhuma regressão foi observada nos cenários deste gate. A tentativa inicial sem nova ativação do SW permanece documentada, e a instalação/ativação real posterior passou usando código inalterado. A aprovação cobre o escopo local testado; não é uma validação universal de produção.

**Sem deploy, APK, commit, publicação, correção de código ou início da 2A.2.** [Resultado consolidado](<C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/final-gate/verification-final.json>)
