# TESTE FÍSICO ANDROID 2A.2 — RESULTADO

Status: **CONCLUÍDO — PLAYER OFICIAL RESTAURADO E ONLINE**

Este relatório deve ser preenchido somente com dados observados no Totem Park Player LAB e no arquivo `totempark-android-diagnostic.json`. Não usar resultados do Player Web como substituto.

## Controle de segurança

- [x] Player oficial fechado
- [x] Forçar parada executada somente no Player oficial
- [x] Dados/cache do oficial preservados
- [x] Espera mínima de 60 segundos concluída
- [x] Ausência de atividade concorrente confirmada no painel
- [ ] LAB não definido como HOME/launcher padrão
- [ ] LAB não definido como administrador/Device Owner
- [ ] TV não será reiniciada nesta rodada

## 1. TV

- Modelo reportado pela WebView: `Smart TV`
- Android: `11`
- App LAB: Totem Park Player LAB 2A.2
- Package: `br.com.parksolutions.totempark.player.lab`
- Tela: TV Teste
- Código: `KEYFRK`

## 2. Sessão

- sessionId exibido: `713c9a07` (prefixo visível na interface)
- início: `2026-09-19T18:32:25.063Z`
- sessionId final após reabertura: `03e4d5d2-cc77-4312-8b2e-e9466cd357e1`
- início da sessão final: `2026-09-19T20:20:49.857Z`
- fim: `null` no JSON, pois o LAB permanecia aberto ao exportar
- clientId: `eCd1q9Dq1SMr9D5FlKN8`
- screenId: `emp3VDKfLzmz1sWJrnbx`

## 3. Estado inicial

- Downloads concluídos: 17
- Bytes: 87.295.672
- Hits: 51
- Misses: 17
- Falhas: 0
- Timeouts: 0
- Local: 0
- Remote: 20
- currentSource: `REMOTE`
- lastDownload inicial: não visível na captura
- lastError inicial: não visível na captura
- Captura: `C:\Users\centr\Downloads\WhatsApp Image 2026-09-19 at 15.36.32.jpeg`

Leitura preliminar: o número de misses corresponde ao número de downloads concluídos, sem falhas ou timeouts. Apesar dos arquivos preparados e de 51 hits, nenhuma reprodução local foi registrada; as 20 reproduções foram remotas e a origem atual permanece remota. Isso é evidência inicial compatível com cache preenchido sem uso pelo renderer, ainda sujeita à confirmação temporal e à inspeção dos eventos exportados.

### Após três ciclos naturais

- Downloads concluídos: 17 (`+0`)
- Bytes: 87.295.672 (`+0`)
- Hits: 85 (`+34`)
- Misses: 17 (`+0`)
- Falhas: 0 (`+0`)
- Timeouts: 0 (`+0`)
- Local playback: 0 (`+0`)
- Remote playback: 69 (`+49`)
- currentSource: `REMOTE`
- Captura: `C:\Users\centr\Downloads\2a.jpeg`

Conclusão da observação natural: não ocorreu novo FileTransfer nem novo cache miss, e os cache hits aumentaram, comprovando que arquivos locais foram encontrados. Mesmo assim, todas as novas reproduções foram remotas. O cache está preenchido/reconhecido, mas não está sendo escolhido como origem de reprodução pelo renderer nesta sessão.

## 4. Primeira mídia

- mediaId: `jCNQvpS9riBUH9oKbrgI`
- Nome: `vd teste`
- Tamanho informado: 80,1 MB
- Container: MP4
- Codec: `UNKNOWN`
- Resolução: `UNKNOWN`
- Duração: 41 segundos

## 5. Primeira preparação

- FileTransfer starts: pelo menos 2 tentativas inferidas pelos dois misses/timeouts; confirmar no JSON
- Complete: 0 adicional
- Failed: 2 adicionais
- Retries: pelo menos 1 repetição de preparação; confirmar por mídia no JSON
- Timeout: 2 adicionais
- Expected size: 84.023.317 bytes conforme metadado da mídia; o evento de conclusão perdeu esse vínculo e registrou `expectedSizeBytes: 0`
- Final size: 84.023.317 bytes
- Bytes concluídos: 84.023.317
- Remote src: sim
- Local src: não
- Sequência retida: `FILETRANSFER_START` → `FILETRANSFER_TIMEOUT` (parcial 80.721.240 bytes) → retry posterior → `FILETRANSFER_COMPLETE`; uma tentativa anterior saiu do buffer de 1.000 eventos

### Contadores depois da inclusão de `vd teste`

Comparação com o estado após três ciclos:

- Downloads concluídos: 17 (`+0`)
- Bytes concluídos: 87.295.672 (`+0`)
- Cache hits: 153 (`+68`)
- Cache misses: 19 (`+2`)
- Falhas: 2 (`+2`)
- Timeouts: 2 (`+2`)
- Local playback: 0 (`+0`)
- Remote playback: 192 (`+123`)
- currentSource: `REMOTE`
- Captura: `C:\Users\centr\Downloads\3a.jpeg`

Leitura: a mídia nova não produziu FileTransfer concluído nem bytes finais contabilizados. Houve duas preparações que terminaram em timeout/falha. A reprodução continuou remota; é necessário confirmar visualmente se `vd teste` chegou a tocar e observar se uma nova tentativa ocorre sem intervenção.

### Tentativa posterior sem intervenção

- `vd teste` reproduziu perfeitamente durante seus 41 segundos.
- Downloads concluídos: 18 (`+1` desde a captura anterior)
- Bytes concluídos: 171.318.989 (`+84.023.317` bytes)
- Cache hits: 188 (`+35`)
- Cache misses: 20 (`+1`)
- Falhas: 2 (`+0`)
- Timeouts: 2 (`+0`)
- Local playback: 0 (`+0`)
- Remote playback: 209 (`+17`)
- currentSource: `REMOTE`
- Captura: `C:\Users\centr\Downloads\4a.jpeg`

Conclusão: depois de duas tentativas encerradas por timeout, uma nova preparação concluiu 84.023.317 bytes. O vídeo tocou integralmente por origem remota; até esta captura, nenhuma reprodução local ocorreu. A soma registrada contabiliza apenas transferências concluídas, portanto não inclui necessariamente bytes consumidos pelas tentativas abortadas nem pela reprodução remota.

## 6. Houve concorrência reprodução/download?

**SIM.**

Critério: mesma mídia com `FILETRANSFER_START` e `REMOTE_SRC_ASSIGNED` na mesma janela. Registrar `POSSIBLE_PARALLEL_REMOTE_PLAYBACK` quando existir, sem converter isso em estimativa de bytes.

O JSON contém `POSSIBLE_PARALLEL_REMOTE_PLAYBACK` para `vd 2` em `2026-09-19T21:33:26.384Z`, no mesmo instante de um `FILETRANSFER_START`. `remotePlaybackBytes` permaneceu corretamente como `UNKNOWN`.

## 7. Dez reproduções

- Resultado visual: dez reproduções de `vd teste` concluídas sem travamento, tela preta ou interrupção
- Downloads adicionais: 0
- Bytes adicionais: 0
- Cache misses adicionais: 0
- Cache hits adicionais no período: 36
- Local playback adicional: 0
- Remote playback adicional no período completo da playlist: 150
- Contadores finais: 18 downloads; 171.318.989 bytes; 224 hits; 20 misses; 2 falhas; 2 timeouts; 0 local; 359 remota
- Origem final: `REMOTE`
- Captura: `C:\Users\centr\Downloads\5a.jpeg`

Conclusão: a reprodução permaneceu funcional e não iniciou novos FileTransfers, porém não migrou para a origem local. Os hits demonstram que o arquivo é encontrado no cache; o renderer ainda atribui origem remota.

## 8. Reabrir LAB

- Resultado: LAB retomou normalmente o vínculo com `KEYFRK`, sem solicitar o código; reprodução perfeita, sem erro, travamento ou tela preta
- Nova sessão visível: `03e4d5d2`
- Início da nova sessão: `2026-09-19T20:20:49.857Z`
- Download novo: 0
- Bytes novos: 0
- Miss novo: 0
- Hits adicionais: 72
- Falhas/timeouts adicionais: 0/0
- Origem: `REMOTE`
- Local playback adicional: 0
- Remote playback adicional: 20
- `LOCAL_FILE_FOUND`: confirmado indiretamente pelos 72 hits; evento exato pendente no JSON
- Captura: `C:\Users\centr\Downloads\6a.jpeg`

Conclusão: vínculo, cache e histórico persistiram após forçar parada e reabrir o LAB. Apesar dos arquivos encontrados sem redownload, o renderer continuou usando URL remota.

## 9. Offline

- Cinco ciclos concluídos: sim, sem reiniciar a TV
- Vídeo: comportamento inconsistente; alguns vídeos passaram em determinados ciclos e não em outros
- Imagem: não isolada individualmente na observação; playlist continuou mudando
- Avanço: houve vários avanços e mudanças na ordem de reprodução
- Local playback adicional: 0
- Remote playback adicional: 69
- Cache hits adicionais: 36
- Cache misses adicionais: 0
- Download/bytes adicionais: 0/0
- Falhas/timeouts adicionais: 0/0
- Erros/tela preta: problemas pontuais em todos os cinco ciclos; nenhum ciclo foi integralmente estável
- Contadores finais offline: 18 downloads; 171.318.989 bytes; 332 hits; 20 misses; 2 falhas; 2 timeouts; 0 local; 448 remota
- Origem final: `REMOTE`
- Captura: `C:\Users\centr\Downloads\7a.jpeg`

Conclusão: o avanço parcial offline não comprova uso do cache nativo. Como todas as atribuições continuaram remotas e o comportamento variou entre ciclos, o resultado é compatível com recursos eventualmente disponíveis no cache HTTP/memória da WebView. O offline é instável e não determinístico; o cache nativo preparado não está sendo utilizado pelo renderer.

## 10. Reconexão

- Heartbeat/status: usuário informou que tudo voltou ao normal; confirmação individual do painel não registrada na captura
- Realtime: playlist voltou a operar normalmente
- Player: estável, sem travamentos, tela preta ou erros
- Cache hits adicionais: 36
- Cache misses adicionais: 0
- Download/bytes adicionais: 0/0
- Falhas/timeouts adicionais: 0/0
- Local playback adicional: 0
- Remote playback adicional: 35
- Redownload: não
- Origem final: `REMOTE`
- Contadores finais: 18 downloads; 171.318.989 bytes; 368 hits; 20 misses; 2 falhas; 2 timeouts; 0 local; 483 remota
- Captura: `C:\Users\centr\Downloads\8a.jpeg`

Conclusão: a conexão e a reprodução remota se recuperaram sem novo FileTransfer. O retorno da internet não causou redownload de arquivos já preparados, mas o renderer permaneceu remoto.

## 11. Segunda mídia

- Mídia nova: imagem `CAPA`, tamanho informado de 908 KB
- Mídia antiga — FileTransfer adicional: 0
- Mídia nova — FileTransfer: 1 miss e 1 conclusão
- Bytes adicionais: 930.061
- Cache hits adicionais no período: 73
- Falhas/timeouts adicionais: 0/0
- Local playback adicional: 0
- Remote playback adicional: 20
- Contadores finais: 19 downloads; 172.249.050 bytes; 441 hits; 21 misses; 2 falhas; 2 timeouts; 0 local; 503 remota
- Origem final: `REMOTE`
- Captura: `C:\Users\centr\Downloads\9a.jpeg`

Resultado: sincronização incremental correta quanto ao FileTransfer — apenas a mídia nova foi baixada. O renderer continuou utilizando a URL remota inclusive para a nova imagem.

## 12. Vídeo grande

- Nome: `vd 2`
- Tamanho informado: 129 MB
- Duração: 41 segundos
- Situação inicial: nenhum FileTransfer concluído e nenhum byte final adicional
- Cache misses adicionais: 2
- Falhas adicionais: 2
- Timeouts adicionais: 2
- Cache hits adicionais no período: 76
- Local playback adicional: 0
- Remote playback adicional: 23
- Origem: `REMOTE`
- Contadores: 19 downloads; 172.249.050 bytes; 517 hits; 23 misses; 4 falhas; 4 timeouts; 0 local; 526 remota
- Captura: `C:\Users\centr\Downloads\10a.jpeg`
- FileTransfer/final file size: nenhuma conclusão para `vd 2`; reprodução remota completa

Leitura preliminar: o vídeo de 129 MB ultrapassou novamente a janela de timeout da Smart TV. O padrão inicial repete o vídeo de 80,1 MB: duas tentativas temporizadas e reprodução ainda remota, sem tamanho final contabilizado.

### Tentativa posterior de `vd 2`

- Reprodução: completa durante 41 segundos, sem erros
- Downloads/bytes adicionais: 0/0
- Cache hits adicionais: 38
- Cache misses adicionais: 2
- Falhas adicionais: 2
- Timeouts adicionais: 2
- Local playback adicional: 0
- Remote playback adicional: 20
- Contadores: 19 downloads; 172.249.050 bytes; 555 hits; 25 misses; 6 falhas; 6 timeouts; 0 local; 546 remota
- Captura: `C:\Users\centr\Downloads\11a.jpeg`

Conclusão: `vd 2` acumulou pelo menos quatro tentativas encerradas por timeout e ainda não produziu arquivo final contabilizado. A reprodução remota completa mascara a falha persistente do cache. Cada tentativa pode ter transferido bytes parciais não incluídos em `bytesDownloaded`, elevando o risco de tráfego extra.

## 13. Timeout / retry

- Resultado: dois timeouts novos após adicionar `vd teste` de 80,1 MB
- `FILETRANSFER_TIMEOUT`: 2 adicionais
- Download continuou: UNKNOWN
- Novo FileTransfer: sim; uma preparação posterior concluiu o arquivo
- Retries: pelo menos 2 tentativas posteriores à primeira preparação; total exato por mídia pendente no JSON

Efeito observado: dois timeouts foram seguidos por uma conclusão de 84.023.317 bytes. Os bytes parciais das tentativas anteriores e os bytes da reprodução remota permanecem desconhecidos, criando risco real de tráfego extra.

Para `vd 2` de 129 MB, quatro tentativas observadas terminaram em timeout sem conclusão. O vídeo continuou funcionando integralmente pela URL remota.

Totais finais: 25 FileTransfers iniciados, 19 concluídos, 6 falhos e 6 timeouts. O limite dos últimos 1.000 eventos preservou detalhes de cinco timeouts; os totais acumulados preservaram os seis.

## 14. Arquivo parcial

- Resultado: arquivos parciais existiam nos cinco timeouts detalhados presentes no JSON
- `partialFileExists`: `true`
- `vd teste`: 80.721.240 bytes
- `vd 2`: 101.531.648, 82.247.680, 100.073.472 e 104.437.090 bytes
- Soma observável dos parciais: 469.011.130 bytes
- Sexto timeout: tamanho parcial indisponível porque o evento saiu do buffer de 1.000 eventos
- `downloadStillRunning`: `UNKNOWN`

Os parciais foram medidos antes da exclusão existente. Cada retry reiniciou o arquivo, sem reaproveitar o progresso anterior.

## 15. FileTransfer duplicado

- Resultado: nenhum `DUPLICATE_FILETRANSFER` no buffer exportado
- Maior `activeDownloadCount` observado: 1
- Conclusão: nenhuma duplicação simultânea foi comprovada. Houve retries sequenciais e reprodução remota paralela ao FileTransfer.
- Limitação: detalhes anteriores aos últimos 1.000 eventos já haviam sido descartados.

## 16. Diagnóstico

### COMPORTAMENTO MISTO

1. O Android baixa e persiste arquivos em `Directory.Data` e os encontra após reabrir o app.
2. O renderer nunca utilizou origem local: 0 reproduções locais e 546 remotas.
3. Existe reprodução remota paralela ao FileTransfer, confirmada para `vd 2`.
4. O offline é instável porque o renderer continua usando URLs remotas.
5. O timeout fixo provoca retries completos e descarte de grandes arquivos parciais.
6. A sincronização incremental funciona para mídia pequena e não baixa novamente arquivos antigos.
7. Não foi comprovado FileTransfer simultâneo duplicado; foram observados retries sequenciais.

## 17. Impacto de tráfego

- FileTransfers concluídos: 172.249.050 bytes
- Parciais observados em cinco timeouts: 469.011.130 bytes
- Tráfego FileTransfer mínimo observável: **641.260.180 bytes**
- Parcial do sexto timeout: `UNKNOWN`
- Bytes das 546 reproduções remotas: `UNKNOWN`
- Iniciados/concluídos/falhos: 25/19/6

O mínimo observável equivale a aproximadamente 3,72 vezes os bytes que terminaram em arquivos válidos. Ao menos 469.011.130 bytes foram escritos em tentativas descartadas. O consumo real é maior porque não inclui o sexto parcial, overhead de protocolo nem reprodução remota.

## 18. Próxima ação recomendada

### IMPLEMENTAR 2A.2 ANDROID

Escopo recomendado para uma etapa posterior:

1. Fazer o renderer trocar efetivamente para `Capacitor.convertFileSrc(fileUri)` assim que o arquivo estiver disponível, inclusive após preparação assíncrona.
2. Controlar o fallback remoto para impedir reprodução remota paralela desnecessária sem comprometer disponibilidade.
3. Substituir o timeout fixo de 12 segundos por timeout compatível com tamanho/velocidade ou por inatividade, com cancelamento real da transferência.
4. Evitar apagar e reiniciar integralmente arquivos grandes; avaliar resume/cancelamento suportado pela API.
5. Preservar sincronização incremental, vínculo persistente e ausência de redownload para arquivos encontrados.
6. Corrigir a associação diagnóstica: tentativas posteriores sem `mediaId` criaram entradas separadas pela URL. Os totais permanecem válidos, mas o resumo individual fica fragmentado.
7. Revalidar offline, restart e arquivos de 80–300 MB em nova build LAB antes de produção.

Prioridade: **ALTA**. Esta auditoria não autoriza alterar código, gerar APK ou publicar.

## Evidências a preservar

- Captura do estado inicial de `/diagnostico-lab`.
- Captura após três ciclos naturais.
- Captura após a primeira preparação.
- Captura após dez reproduções.
- Captura após reabrir o LAB.
- Captura dos cinco ciclos offline.
- Captura depois da reconexão.
- `totempark-android-diagnostic.json` final preservado em `artifacts/auditoria-android-2a2/evidencias/` (726.191 bytes; SHA-256 `D611FE538AEBD35428237D31DB771A24A250A436C0FCB97E9FD531BDB70735DC`).
- Se existir, `totempark-android-diagnostic.txt`.

## Restauração obrigatória

- [x] Diagnóstico exportado e preservado
- [x] LAB fechado
- [x] Forçar parada executada somente no LAB
- [x] Espera mínima de 60 segundos concluída
- [x] Player oficial aberto manualmente
- [x] Funcionamento, vínculo e heartbeat do oficial confirmados

Restauração confirmada pelo operador: **oficial restaurado e online**.
