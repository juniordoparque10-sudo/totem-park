# AUDITORIA 2A.2 — RESULTADO

Data: 18/09/2026. Auditoria de leitura e laboratório isolado. Nenhuma implementação, publicação, APK, commit ou alteração de dados de clientes. Resultados numéricos novos: `measurement.json` e `MEDICOES.md`; evidências anteriores são identificadas como baseline, não como testes repetidos nesta auditoria.

## 1. Resumo executivo

Há duas rotas de consumo na primeira carga Web: o elemento recebe a URL remota antes de o efeito concluir a preparação; o preparador faz outro GET com `cache: "no-store"`. Reproduzimos os 55.312 bytes do vídeo de 27.656 bytes em Chromium isolado sem Service Worker, portanto o SW não é necessário para causar a duplicação. O alcance para arquivos grandes depende de Range, velocidade, interrupção e cache HTTP. A auditoria encontrou uma falha no laboratório com um vídeo WebM maior; ela deve ser resolvida ou delimitada antes de autorizar uma mudança arquitetural.

Recomendação conceitual: implementar em fases, começando pela resolução local antes de atribuir `src`, com fallback preservado. Não bloquear a exibição inicial à espera de toda a playlist. Telemetria deve observar operações existentes, sem novos downloads, sondagens ou contadores por frame. Esta recomendação não aprova implantação imediata; faltam gates do player completo e Android.

## 2. Baseline 2A.1 + FIX

Publicação registrada: `dpl_8fTZWFZXR7WZuswVbvUZeydrt1zW`, release 2A.1-FIX, bundle `index-BNJWtZvH.js`. Consultados os registros locais da publicação e do gate final, sem republicar ou alterar produção. A evidência anterior confirma 11 ciclos completos online/offline, avanço, imagem Blob pronta, reload/restart, hashes, preparação incremental, telas/clientes, ativação real do SW, template/agendamento e heartbeat/realtime no laboratório. O teste posterior utilizou o bundle baixado da produção, isolado dos serviços reais. Não houve teste de TV física.

A correção da imagem pronta, a retenção conservadora do cache Web e a lista explícita de caches antigos pertencentes ao app são invariantes. Não substituir o gate anterior por resultados de um simulador.

## 3. Fluxo da primeira carga

`applyPlayerMediaCache`, App.jsx:14879, consulta apenas `mediaCacheMap` em memória. Sem entrada, mantém URL remota. O render de vídeo atribui `preload="auto"`, autoplay e src. O efeito Web em App.jsx:15235 prepara `playerItems`, com concorrência 2 Web/1 Smart TV; somente após a conclusão do lote atualiza o mapa. O cache é consultado dentro do preparador, depois de a rota remota já poder começar. Mesmo no reload com CacheStorage pronto, o mapa React começa vazio: existe risco de GET remoto/revalidação antes da hidratação local.

## 4. Linha do tempo

`MEDICOES.md` apresenta timestamps relativos e requisições. T0/T1/T2/T4/T5/T6/T7/T8/T9/T10 são observados no harness; T3 usa ResourceTiming.startTime de initiator video/img, no mesmo relógio performance.now do documento. CDP e servidor também registram requisições, em relógios distintos: não subtrair CDP, epoch e performance.now sem alinhamento. T6 significa cabeçalhos disponíveis; T7 significa Cache.put concluído, não apenas início da resposta. O harness agenda preparação 20 ms após src remoto (execução real pode atrasar), não mede a latência do commit/useEffect do React real. Não atribuir seus tempos ao player de produção.

## 5. Vídeo pequeno

Arquivo real VP8: 27.656 bytes. Evidência do gate anterior: GET Range `bytes=0-`, 206, 27.656 bytes; GET do preparador sem Range, 200, 27.656 bytes; total 55.312. A reprodução nova sem SW confirmou o mesmo total em perfil HTTP frio. Depois da preparação, o módulo serve Blob e deixa de baixar o corpo novamente. Quantidades por condição constam em `MEDICOES.md`.

## 6. Vídeo grande

Gerado um WebM real, sem padding, com frames variáveis em canvas 1280×720 e MediaRecorder VP8. Tamanho 28.947.112 bytes, superior a 5 MB. É um teste exigente de ruído/compressão, não uma amostra representativa de todos os anúncios comerciais. No perfil frio, a origem serviu 57.894.224 bytes, com ResourceTiming confirmando dois corpos integrais: reprodução206 e preparação200. A preparação falhou em Cache.put e novas tentativas transferiram28.947.112 bytes cada; não chamar isso cache cheio.

Diagnóstico independente, sem vídeo/SW/concorrência: arrayBuffer e stream recebem28.947.112 bytes; Response.blob falha; Cache.put de resposta sintética desse tamanho funciona, quota reportada10GiB. Disco C: tem aproximadamente1,9GB livres. Fora do sandbox a falha continuou. Limitação de Blob/recursos do laboratório é hipótese fundamentada, não causa raiz comprovada: [arquitetura Blob Chromium](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/storage/browser/blob/README.md). Registros brutos preservados. Sem preparação bem-sucedida não existe comparativo válido de cache cheio/restart/offline para esse arquivo; não é prova de falha em produção.

## 7. Imagem

PNG existente: 15.649 bytes. No gate anterior uma transferência inicial de 15.649; no novo harness com src remoto antecedendo o preparador por 20 ms, houve duas transferências completas, 31.298, sem SW. Logo a ausência de duplicação de imagem na execução anterior não é uma garantia: ordem, coalescência e cache HTTP variam. A imagem Blob deve continuar usando a correção de readiness aprovada.

## 8. Origem da duplicação

Origem demonstrada: elemento HTML remoto + GET independente do preparador. `response.clone()` não cria um terceiro GET: divide o consumo de uma resposta, mas pode aumentar buffering. O manifesto elimina duplicatas dentro de um lote; não oferece single-flight compartilhado entre chamadas sobrepostas, abas ou instâncias. `mediaCacheRunRef` ignora resultados antigos; não cancela automaticamente o GET já em andamento. Esses fatores são riscos estáticos, não multiplicadores medidos de produção.

## 9. Efeito de preload="auto"

É uma indicação ao navegador, não uma garantia de baixar exatamente o arquivo inteiro. Com autoplay ativo, a reprodução já exige dados. O vídeo pequeno foi recebido integralmente por Range; o grande recebeu requests Range de partes em tentativas com HTTP quente, e resposta integral em perfil frio. Mudar preload sozinho não coordena as duas rotas nem assegura economia. Preservar autoplay e a readiness Android.

## 10. Efeito de no-store

O preparador explicitamente evita consultar/atualizar o cache HTTP. Não impede `CacheStorage.put` explícito. Por isso bytes já obtidos pelo elemento não são necessariamente reaproveitados por esse fetch. Trocar para `force-cache` indiscriminadamente pode introduzir mídia desatualizada; primeiro validar identidade/versionamento e headers reais. Referência: [Request.cache](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache).

## 11. Cache HTTP / ETag

Nos fixtures: ETag SHA-256, `private, max-age=0`, suporte Range e 304. Um 304 tem corpo zero e ainda consome headers/requisição; encodedBodySize pode descrever corpo reutilizado. Nas tentativas com perfil já utilizado ocorreram 304 e Range parcial, diferentes do perfil frio. Não considerar CacheStorage vazio equivalente a cache HTTP vazio. Não consultamos URLs de mídias de clientes nem presumimos seus headers iguais aos fixtures. `transferSize=0` também pode ser restrição de exposição cross-origin: [Resource Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize).

## 12. Service Worker

O SW real consulta `caches.match(request)` e, sem resposta, faz fetch; não grava automaticamente mídia remota. As entradas persistentes de mídia usam URL sintética `https://totempark.local/cache/<key>`, diferente da URL remota. Portanto o SW atual não faz a mediação single-fetch que unificaria reprodução e download. O experimento sem SW já reproduz a duplicação. Testado novamente em VM: ativação exclui somente shells v1/v2 e preserva mídia/cache desconhecido. Teste real de ativação preservando hashes pertence ao gate anterior.

## 13. Cache vazio x cheio

Separar CacheStorage, mapa de URLs Blob em memória e cache HTTP. O harness consegue resolver CacheStorage antes de atribuir src nas condições ready/reload/restart; esse é um teste do módulo e da hipótese Local First, não prova que o React atual já faz isso. O App atual pode expor remoto enquanto hidrata. Não limpar caches de uma TV para testar. Limpezas do harness ocorrem apenas em origem/perfil isolados criados para este teste.

## 14. Primeiro frame

Observado por requestVideoFrameCallback no harness; imagens por load e largura natural. App Web usa loadedmetadata/data/canplay para readiness, que não equivalem necessariamente a pixels já apresentados. Local First quente tende a eliminar rede mas exige leitura/blob; frio pode atrasar se esperar download integral. Tempos localhost não representam conexão de cliente; não calcular p95 com uma execução. Gate futuro deve comparar frio/quente em rede normal e limitada, hardware alvo e transições completas, mantendo camada anterior visível.

## 15. Atualização incremental

O manifesto inclui cliente, identidade, URL, tamanho e versão. CacheStorage hit evita GET de preparação. Evidência anterior: mídia nova de 16.044 bytes baixada, antigas com corpo zero; cenário posterior teve GET de ferramenta de fixture de 16.378 bytes, corretamente separado do tráfego do browser. Novo teste de retenção VM confirma hit de entrada v1 sem download e retenção entre telas/clientes. Não modificamos playlists/Firestore nesta auditoria para repetir realtime.

## 16. Playlist agendada

Web prepara `playerItems` da playlist ativa, escolhida pelo horário; não demonstrado pré-download Web de todas as playlists futuras. Android monta `playlistsForOffline` incluindo playlist padrão e agendadas que alcançam a tela, antes da ativação, e coleta URLs. Clock de seleção roda a cada 15 s: tolerância da troca deve considerar esse intervalo. Hora/timestamp local, calendário e modo offline são gates futuros; não alteramos agendamentos.

## 17. Android

Análise estática: `cacheOfflineAssets` usa Filesystem.stat e FileTransfer.downloadFile, fila local de preparação, timeout 12 s SmartTV/20 s demais no chamador, mapa de file URI convertido por Capacitor. Web CacheStorage e Blob não devem substituir isso. O renderer remoto e FileTransfer podem teoricamente competir antes da preparação, mas duplicação Android não foi medida. Native stat/size medem tamanho do arquivo, não bytes efetivos de rede/retry. Não houve APK, execução nativa ou modificação Android.

## 18. Classificação da duplicação

Separar impacto por evento e impacto recorrente. Pequeno frio: 100% de corpo extra, 27.656 bytes adicionais; pequeno absoluto, fator alto. Não há duplicação recorrente demonstrada após preparação da baseline. Vídeo grande exige diagnóstico adicional; não classificar a frota inteira com base nele. Escala proposta: A inexistente; B pequena em bytes e evento raro; C moderada por sessão; D alta em arquivos/frota; E crítica quando recorrente ou compromete offline. Resultado observado: B em bytes no fixture pequeno, risco D para downloads grandes, magnitude de produção não determinada. Sem limiares de negócio fornecidos, classificação não é SLA financeiro.

## 19. Impacto de tráfego

Cinco vídeos de 100 MB + dez imagens de 2 MB = 520 MB únicos por tela, usando MB decimal. Uma preparação necessária: 1 tela 520 MB; 10 5.200 MB; 50 26.000 MB; 100 52.000 MB. Se a reprodução remota acrescentar X bytes por tela, total = N×(520 MB + X). Exemplo condicional de duplicação integral de todos os itens: 1.040/10.400/52.000/104.000 MB; não é previsão medida. Somente vídeos integralmente duplicados: extra 500 MB/tela. Range interrompido pode reduzir extra; falhas/retries podem ampliar. Não assumir fator 2 da frota nem monetizar sem tarifa, região, recorrência e distribuição real de arquivos.

## 20. Estratégia recomendada

| Estratégia | Tráfego / primeiro frame | Offline / risco / manutenção |
|---|---|---|
| Cache First puro, aguardando arquivo inteiro | mínimo duplicado; frio pode atrasar muito | simples mas risco de tela sem conteúdo durante preparação |
| Local First com fallback remoto | ótimo quente; preserva início frio | recomendada primeira fase; precisa resolver cache antes de src e tratar timeout/erro |
| Single Fetch compartilhado | pode eliminar segunda transferência fria | HTMLVideo não consome qualquer Promise/stream como src; requer solução adicional; risco de memória |
| SW mediador | pode coordenar Web e ranges | exige respostas206 corretas, CORS, cancelamento, versão; complexo e sem equivalência direta nativa |
| Híbrida local+fallback+single-flight de preparação | ganho incremental, início preservado | recomendada evolução; duplicação fria restante pode ser tradeoff explícito |

Começar pela leitura local quente antes do src; preservar remote fallback. Single-flight por chave limita preparações concorrentes, mas sozinho não unifica o fetch do elemento. Não recomendar SW mediador sem evidência de economia adicional e gates Range.

## 21. Riscos da estratégia

Download integral pode atrasar primeiro frame; buffers Blob grandes consomem memória; clone pode acumular corpo no consumidor mais lento; revogar URL ainda utilizada quebra camada anterior; efeitos antigos podem finalizar após nova playlist; cache sem propriedade por tela não pode ser purgado globalmente; versão incorreta retorna arquivo velho. Há ainda quota/eviction, URLs de token, CORS, Range, timeout e fallback em loop. Referência sobre clone: [Response.clone](https://developer.mozilla.org/en-US/docs/Web/API/Response/clone). A telemetria não deve introduzir clone extra.

## 22. Origem real da mídia

Futuro MediaSourceTracker deve registrar resolução e src efetivamente associado ao item atual pronto, incluindo fallback e erro. Blob com proveniência CacheStorage = CACHE_LOCAL; URI nativa com arquivo validado = CACHE_LOCAL; URL remota = INTERNET_FALLBACK quanto à rota, sem afirmar que o browser transferiu corpo (pode ser HTTP cache). DOWNLOADING_TO_CACHE pertence à preparação simultânea; CACHE_PARTIAL à cobertura da playlist; HYBRID ao conjunto de atividades/media+dados; CACHE_UNAVAILABLE a ausência/erro de suporte. Não inferir origem somente por navigator.onLine, cachedItems ou download anterior.

## 23. Conexão / origem / modo híbrido

Campos separados: connectionStatus (sinal de conectividade com grau de confiança), mediaSource (item atual), networkActivity (nenhuma/mídia/sync/dados), dynamicDataSource (API/local/stale/indisponível), operatingMode (local/remoto/híbrido). Online reproduzindo Blob é local; offline com Blob não é erro; template com fundo local e RSS remoto é híbrido. Hora Certa local usa relógio, mas previsão/localização pode consultar ipapi/Open-Meteo; notícias usam feeds/rss2json/WordPress e imagens; maré e esporte têm APIs próprias. Refresh de live content é 10 min, esporte 3 min; templates próximos são pré-carregados. Separar bytes de imagens de template dos vídeos/imagens da playlist e de JSON/RSS. Não garantir funcionamento dinâmico offline com apenas cache de mídia pronto.

## 24. Cache hit/miss

Contar uma resolução lógica por item/chave/generation ao escolher fonte, não cada render/effect/Cache.match incidental. Hit = entrada válida e utilizável; miss = ausente; erro/quota/corrompido separados; fallback após hit não fica como hit bem-sucedido. hitRate = hits/(hits+misses), com denominador zero exibido desconhecido. Excluir heartbeat, Firestore, API, RSS, favicon e polling. Preparação e exibição têm métricas distintas. Global deve usar soma dos numeradores/denominadores; não média simples de percentuais.

## 25. Bytes baixados

Blob.size, Content-Length e `downloadedBytes` atuais são tamanhos de payloads armazenados, não prova de tráfego total. Servidor fixture registra corpo servido; CDP permite correlacionar, mas SW/cache/ranges exigem cuidado. ResourceTiming inclui headers em transferSize, depende de TAO e pode representar reutilização. Telemetria passiva futura deve separar payloadPreparedBytes exato, networkMediaBytes observado quando disponível e estimate/unknown; contabilizar retries apenas se observados. Não HEAD adicional, re-fetch, clonar resposta ou ler arquivos só para contar. Não somar múltiplas fontes que descrevem o mesmo GET.

## 26. Bytes locais

Tamanho de arquivo servido ao criar Blob é exato para a leitura lógica integral; não equivale a bytes decodificados pelo player nem a quantos bytes ele realmente consumiu. `size×plays` é potencial de conteúdo apresentado e deve ser rotulado estimativa. Cache.match hit já fornece a resposta que o fluxo precisa; aproveitar a leitura existente. Vídeo local pode ler Range nativo sem transferir arquivo integral a cada play. Não decodificar/duplicar corpo para medir.

## 27. Tráfego evitado

Comparar com contrafactual explicitamente definido. Tamanho×resoluções locais pressupõe rede integral por resolução e ignora cache HTTP, preload parcial, interrupção e múltiplas exibições da mesma mídia. Pode inflar economia; não chamar de bytes faturados evitados. Mostrar estimativa, metodologia e cobertura; preferir redução de corpos servidos num A/B controlado. Não fazer download de referência para medir economia.

## 28. Sessões

SessionManager futuro: sessionId aleatório, deviceId pseudônimo, client/screen, app/platform/version, startedAt UTC, timeOrigin, sequence, cumulative counters, checkpoints e endedReason opcional. Reload/restart gera nova sessão e fecha a anterior como término inferido; troca de tela fecha sessão antiga; offline/recovery mantém sessão; ativação SW sozinha não cria sessão, reload cria. Uma falha abrupta deixa sessão aberta com último checkpoint, não uptime até o próximo login. Não depender exclusivamente de beforeunload.

## 29. Uptime

Medir evidência de processo/player ativo com relógio monotônico para intervalos; wall clock só para correlação. Não afirmar TV física ligada. Uptime confirmado até último checkpoint e encerramento conhecido; depois, estado desconhecido. Heartbeat de 15 s permite tolerância operacional sugerida 45–60 s mais latência conhecida, não prova retrospectiva de atividade no intervalo sem evidência. Abas ocultas/throttling e crash invalidam extrapolação. Distinguir tempo de sessão, tempo ativo e display time.

## 30. Display time

Acumular duração entre eventos de entrada/ready/playing/pausa/ocultação/bloqueio/erro/troca. Vídeo: ready+playing, descontar waiting/stalled/paused; imagem: decoded/naturalWidth positiva e camada visível; template: DOM pronto e conteúdo disponível, distinguindo placeholder. Descontar NO_CONTENT, oculto, blackout, manutenção e takeover conforme política definida. Não usar apenas duração configurada nem timer atual como prova de exibição. performance.now, timestamps em eventos existentes e checkpoint esparso; sem loop por frame/segundo. Transição pode somar visibilidade de duas camadas, mas não duplicar tempo total da tela.

## 31. Estado operacional

DISPLAYING é atividade visual; SYNCING/DOWNLOADING podem coexistir com ela; OFFLINE é conectividade, não ausência de exibição. NO_CONTENT para playlist vazia; BLOCKED para condição autorizativa/operacional; ERROR para falha impeditiva. Recomenda-se estado primário + flags paralelos com prioridades de apresentação definidas, sem sobrescrever DISPLAYING só porque há download em fundo. Pause e takeover exigem motivos específicos. Bloqueios continuam decididos pelas regras e lógica existentes, nunca pela telemetria.

## 32. Player health

Registrar lastItemChangedAt, lastPlaybackEvidenceAt, lastPlaybackErrorAt/code, lastDownloadAt/bytes, lastSyncAt e cache readiness. Heartbeat recente com item antigo pode ser playlist de item único, vídeo longo, pausa ou bloqueio; não diagnosticar congelamento automaticamente. Eventos playing/waiting/stalled/error e readiness são sinais leves; limiar depende da duração e modo. Relógio de template não é prova de vídeo renderizado. Watchdog pesado, screenshots periódicos e consulta de frame a cada segundo ficam fora do escopo recomendado.

## 33. Persistência local da telemetria

IndexedDB Web para poucos snapshots/outbox estruturados; armazenamento nativo pequeno dedicado via adaptador; localStorage apenas identificador/config/checkpoint compacto, evitando gravação síncrona frequente. CacheStorage mantém mídia, não uma fila de eventos. Proposta: agregado em memória, persistência coalescida em checkpoint/heartbeat, orçamento inicial ≤256 KiB por dispositivo e janela curta de sessões/dias pendentes, limite rígido e descarte documentado. Falha/quota da telemetria nunca bloqueia exibição; não roubar espaço reservado à mídia nem remover mídia para salvar métricas.

## 34. Offline → online

Acumular agregado local, sem uma fila por frame/item. Recuperação envia último snapshot cumulativo por sessão com sequence; não reexecuta downloads. Reusar eventos online/heartbeat existentes; evitar listener/ping novo. Outbox limitada por sessão/dia, compactável; reconhecer ACK antes de descartar checkpoint. Firestore também pode manter writes offline pendentes: duas filas sem política comum podem duplicar snapshots; definir único responsável e uma escrita em voo, coalescendo a próxima.

## 35. Idempotência

Chave sessionId+sequence, snapshot cumulativo e aplicação monotônica. Repetição do mesmo snapshot não soma novamente; sequência velha ignorada. Para total diário, delta somente sobre snapshot já reconhecido, ou recomputação de agregados por sessão de IDs determinísticos. `increment` indiscriminado no retry não é idempotente. ACK persistido, reboot, múltiplas abas e mudança de dia devem ser testados. Uma transaction/processor futura precisa avaliar custo; nada implementado.

## 36. Heartbeat existente

App.jsx:15653: imediato, a cada 15 s, retorno online e visibility visible; efeito também reinicia quando modos operacionais mudam. Executa getDoc da tela, verifica existência/comando exit e updateDoc: connectedDeviceId, delete activeDeviceId, status online, lastConnection string, lastSeenAt serverTimestamp. Até 5.760 ticks/dia por instância, fora gatilhos extras. getDoc pode usar SDK/cache conforme conectividade; não equiparar todo tick a leitura faturada sem observar. Firestore transporta payload com protocolo: JSON lógico não mede wire.

Payload lógico ilustrativo:184 bytes de JSON UTF-8 usando deviceId UUID36 caracteres e placeholders para deleteField/serverTimestamp. Não é captura de wire nem tamanho protobuf: transforms, caminhos/documento, getDoc, headers e SDK ampliam o transporte. Aproximadamente1,06MB/dia dessa representação para5.760ticks, antes de leituras/respostas e gatilhos extras.

Não há eleição de heartbeat primário neste efeito; persistentMultipleTabManager coordena cache/SDK, não suprime timers de outras abas do aplicativo. Uma lease futura por tela/dispositivo e fencing para telemetria exige prova de segurança; não alterar vínculo nem comando remoto. Offline writes/retries são responsabilidade atual do SDK. reportCacheStatus também escreve separado, deduplica assinatura, informa progresso em ~3 s/final: não é apenas heartbeat. Agregar telemetria ao heartbeat evita endpoint novo, mas pode aumentar fan-out dos listeners da tela. Referências: [offline Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline), [billing](https://firebase.google.com/docs/firestore/pricing).

## 37. Overhead estimado

Orçamento proposto, não medido: snapshot adicional ≤512 bytes de JSON UTF-8 por envio; 5.760 envios/dia = 2.949.120 bytes/tela/dia. Para 1/10/50/100 telas: 2,949/29,491/147,456/294,912 MB/dia. Snapshot de 256 bytes reduz à metade. Headers, protobuf/WebChannel, TLS, ACK e listeners não incluídos; medir payload real no gate. Anexar a cada quarto heartbeat (1 min) reduz 512 bytes para 0,737 MB/tela/dia, preservando heartbeat15s. Sem nova requisição ou escrita se incluído no update existente; campos extras podem gerar tráfego de leitura/fan-out. Não garantir custo financeiro zero.

Limites futuros: contador O(1) por evento existente, zero novos timers por frame/segundo, nenhum corpo extra, listener novo zero nesta fase, uma escrita em voo, fila limitada, nenhuma atualização React global por incremento. CPU/memória ainda não medidas em dispositivo alvo; não inventar percentuais.

## 38. Histórico

Proposta futura: resumo de sessão e agregado diário por tela, retenção explícita, timestamps/versão/metodologia/cobertura. Não guardar cada play/evento no Firestore. Um documento diário atualizado a cada heartbeat continua gerando 5.760 writes/tela/dia; consolidar raramente e usar IDs determinísticos. Histórico incompleto de sessões abruptas deve ser marcado inferido. Admin consulta intervalo/limite/paginação, não listener de todo histórico.

## 39. Backend / Firestore

Local First e telemetria local não precisam backend novo. Piggyback em documento da tela depende de regras/allowlists/schema e privacidade já existentes; não presumir autorização para campos novos. Histórico central precisa decidir regras de escrita por dispositivo/cliente, validação de tamanhos/sequence, retenção, índices e eventual consolidação confiável. Não criar coleção, endpoint, índice ou regra agora. Writes em documentos monitorados geram leituras dos listeners, e reconexão pode reabrir custos: [billing Firestore](https://firebase.google.com/docs/firestore/pricing). Estimar custos somente depois de região/edição/consumo real.

## 40. Web x Android

Interface comum candidata: PlayerTelemetry, SessionManager, MediaSourceTracker e TelemetryStorage; Web adapta CacheStorage/Blob/ResourceTiming/IndexedDB; Android adapta Filesystem/FileTransfer/URI/lifecycle. Identidade de conteúdo, eventos de sessão e snapshots podem ser comuns. Contagem de rede/ranges, pausas de background, shutdown e quota precisam adaptações. Web `blob:` não demonstra estado nativo; FileTransfer downloadFile não fornece sozinho bytes de reprodução remota. Executar gates Android antes de qualquer rollout Android, sem mexer no upload.

## 41. Interface administrativa futura

Campos candidatos: última evidência e idade, conexão, fonte atual, atividade de rede, cobertura de cache, item e estado/motivo, display/uptime confirmado, bytes preparados/observados/estimados, hitRate com denominador e sessões. Mostrar desconhecido/stale/sem amostra; não preencher zero quando dado ausente. Totais globais somam contadores compatíveis de mesma janela/versão; excluir duplicadas e indicar cobertura N/M. Nenhum dashboard ou alteração de layout criado nesta auditoria.

## 42. Testes realizados

Novos: módulo Web real instrumentado somente em memória; Chromium real/perfil isolado; vídeo pequeno, imagem, vídeo28,9MB; condições frio/ready/reload, com/sem SW; restart e offline conforme resultado bruto; servidor com Range/ETag; CDP initiator/status/headers e ResourceTiming; proteção SHA dos arquivos-chave; VM retenção entre clientes/telas/concorrência, hitv1, shells e guarda nativa; git diff --check. Harness não acessa Firebase nem URLs de cliente. Falhas e tentativas preservadas.

Revisados, não repetidos: ciclos completos do React publicado, readiness/transição, agendamento, template, heartbeat/realtime, retenção com7entradas/hash e ativação real do SW do gate de16/09. Não modificar Firestore/playlists para repetir estes testes foi uma restrição explícita. Não executado: aparelho Android/TV físico e cenários de produção autenticada. Resultado do módulo não equivale a esses gates.

| Cenário conceitual de telemetria | Resultado esperado / validação futura |
|---|---|
| Online e mídia local | DISPLAYING+LOCAL, rede de dados separada |
| Offline e mídia local | display acumula, sync não, sem erro por offline |
| Nova mídia | miss/download único observado, depois hit |
| Atualização incremental | antigas intactas, delta apenas novo conteúdo |
| Template híbrido | mídia/dados/fonte separados |
| Perda de rede | outbox compacta, local continua |
| Recuperação | snapshot cumulativo/ACK sem duplicação |
| Desligamento abrupto | sessão incompleta até último checkpoint |
| Reprodução travada | heartbeat não prova display; evidência stale contextual |
| Bloqueio | display descontado, acesso continua independente |

São critérios de projeto, não cenários de telemetria executados: a telemetria não existe e sua implementação foi proibida.

## 43. Regressões

Nenhuma alteração de produto feita; hashes-chave antes/depois constam nos artefatos. Nenhuma regressão provocada por patch/deploy desta auditoria. Isso não significa ausência universal de bugs: erro do vídeo grande e lacunas de integração permanecem abertos. Não rodar build que escreva dist fora da área autorizada apenas para reafirmar build anterior; baseline já tem build aprovado.

## 44. Riscos restantes

Erro Cache.put do fixture grande, representatividade de vídeo de ruído, apenas uma execução por condição, timings localhost, HTTP/CORS/header de produção não medidos, readiness React no reload remoto, preparações concorrentes entre abas, native não executado, quota/eviction/memória não garantidas, clock/schedule, sessões crash e segurança de métricas. Não usar relatório para alegar homologação total da futura2A.2.

## 45. O que não deve ser alterado

Upload e metadados existentes (`sizeBytes`, identidade/versionamento), Gestor, regras/acesso/isolamento, backend, dados/clientes/telas/playlists, agendamento, correção Blob image, retençãoSW/media, Android/Capacitor, autoplay/transições/offlinebaseline. Durante esta auditoria nenhum deles foi modificado. Nenhuma mídia de cliente foi enviada/baixada como teste; nenhum clearCache remoto.

## 46. Escopo recomendado da implementação

2A.2-A: diagnóstico grande concluído; resolver cache persistente antes de src quente, fallback e single-flight de preparação com ownership seguro, sem novo purging. Validar cold/hot/range/reload/restart/offline/incremental, template/schedule/realtime, bloqueios e native. Aceitação: arquivo válido em cache não transfere corpo remoto; miss no máximo uma preparação por chave/instância; hashes/readiness/avanço preservados; sem atraso quente perceptível; p95 primeiroframe ≤baseline+10% ou100ms (o maior), com amostra/rede/hardware definidos; zero pending permanente e zero tela preta indevida.

2A.2-B: eventos/counters/sessões locais passivos e armazenamento limitado. Aceitação: zero novos GET/HEAD/ping, zero clone extra, nenhuma alteração de comportamento de upload/player, counters auditáveis por evidência e denominadores; memória/CPU dentro de orçamento medido em dispositivoalvo, falha de telemetria não impede reprodução.

2A.2-C: schema/segurança/ACK/idempotência, agregado no fluxo existente e histórico esparso. Aceitação: retry/reboot não duplica, sequência antiga não reduz contador, outbox limitada, sem novo endpoint/listener, payload≤512B e heartbeat15s preservado; writes adicionais de histórico quantificadas antes de rollout.

2A.2-D: admin exibe fonte/estado/freshness/cobertura/estimativas com dados reais, sem zeros fictícios ou média errada. Só depois de dados confiáveis. Ordem de prioridade: reprodução → offline → bloqueios/segurança → tráfego → consistência → telemetria → UI.

## 47. Recomendação final

**IMPLEMENTAR 2A.2 EM FASES**, como recomendação para uma próxima autorização, não ação nesta auditoria. Priorizar Local First quente e preservar fallback frio; não trocar arquitetura de SW/native por ganho inferido. Não liberar2A.2-A enquanto a preparação do vídeo maior não tiver resultado explicado e enquanto gates React/native relevantes não passarem. A baseline2A.1+FIX permanece intacta. Telemetria/UI não compensam risco de regressão no offline ou na exibição.
