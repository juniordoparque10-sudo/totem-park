TOTEM PARK — CHECKPOINT GERAL 2A.2 + RETOMADA DO TESTE FÍSICO ANDROID

Estamos retomando o desenvolvimento com uma TV Android novamente disponível.

Este documento deve servir também como CHECKPOINT do projeto para evitar que requisitos já definidos sejam esquecidos.

======================================================================
1. PRIORIDADE DO PRODUTO
======================================================================

A plataforma principal do Totem Park é:

ANDROID / ANDROID TV.

É nela que está a base atual de clientes.

O Player Web é importante, porém complementar e secundário.

Prioridades:

1. estabilidade Android;
2. redução máxima do tráfego de mídia;
3. cache/local playback;
4. funcionamento offline;
5. controle operacional;
6. telemetria;
7. Web posteriormente.

O custo de tráfego é um limitador direto da margem e da expansão do produto.

======================================================================
2. 2A.2-A — LOCAL FIRST
======================================================================

A Fase A está HOMOLOGADA.

Foi comprovado:

CACHE LOCAL VÁLIDO
→ PLAYER USA LOCAL

Validações realizadas:

- LAB;
- CANARY;
- RC1 oficial;
- atualização in-place;
- duas TVs físicas diferentes.

No segundo hardware físico foram observados:

- 12 cache hits;
- 0 misses;
- 11 reproduções locais;
- 0 reproduções remotas;
- origem LOCAL;
- 0 downloads adicionais;
- 0 bytes adicionais;
- 0 falhas;
- 0 timeouts no estado observado.

RC1 oficial também aprovou:

- update in-place;
- vínculo preservado;
- cache preservado;
- Local First;
- ciclos online;
- fechar/abrir;
- offline;
- reconexão;
- nenhum redownload desnecessário.

NÃO repetir a homologação completa da Fase A.

NÃO modificar Local First sem evidência de regressão.

======================================================================
3. FALSO PROBLEMA DE SEQUÊNCIA
======================================================================

O diagnóstico anterior de:

- itens pulados;
- avanços incorretos;
- possível erro de sequência;

foi INVALIDADO.

A TV possuía APKs/instâncias antigas.

Após limpeza e utilização do Player oficial mais recente:

- vários ciclos foram executados normalmente;
- ordem correta;
- nenhum problema de sequência.

Portanto:

NÃO alterar:

- currentIndex;
- advancePlayer;
- timers;
- onEnded;
- duração;
- ordem da playlist;

com base naquele diagnóstico antigo.

======================================================================
4. 2A.2-B — PROBLEMA REAL ENCONTRADO
======================================================================

Na auditoria Android anterior tivemos:

- 25 FileTransfers iniciados;
- 19 concluídos;
- 6 timeouts;
- grande quantidade de bytes parcialmente baixados e depois inutilizados.

Causa principal encontrada:

o Player possuía timeout lógico de apenas:

12 segundos

mesmo quando o download continuava recebendo dados.

Isso podia provocar:

download grande
→ 12 segundos
→ timeout lógico
→ tentativa considerada falha
→ arquivo parcial desperdiçado
→ download posterior começando novamente.

======================================================================
5. ALTERAÇÃO 2A.2-B JÁ IMPLEMENTADA
======================================================================

Existe uma variante isolada:

Package:

br.com.parksolutions.totempark.player.phaseb

APK:

Totem-Park-Player-2A2-B-AUDIT.apk

Implementações:

- timeout por 60 segundos DE INATIVIDADE;
- nenhum limite total arbitrário de duração do download;
- progresso real registrado localmente;
- proteção contra downloads simultâneos da mesma mídia;
- validação de arquivo vazio;
- validação de tamanho divergente;
- máximo de 1 retry com backoff quando ZERO bytes foram recebidos;
- não realizar retry imediato quando existe arquivo parcial;
- nenhuma implementação falsa de resume;
- nenhum cancelamento fictício.

Validações locais:

- 5/5 testes aprovados;
- ESLint aprovado;
- WebView build aprovado;
- Android build aprovado.

NADA publicado.

======================================================================
6. TESTE FÍSICO QUE VAMOS EXECUTAR AGORA
======================================================================

Uma TV Android está novamente disponível.

Vamos instalar:

Totem-Park-Player-2A2-B-AUDIT.apk

Como o package é separado:

considerar o cache inicialmente FRIO.

Os downloads iniciais são legítimos.

Antes de abrir Phase B:

- Force Stop em qualquer Player oficial/RC ativo;
- não limpar dados/cache do oficial;
- não executar dois Players simultaneamente;
- vincular somente o Phase B à tela de teste.

======================================================================
7. TESTE DEVE SER CURTO
======================================================================

NÃO repetir testes extensos já concluídos.

Queremos validar somente a 2A.2-B.

TESTE A — DOWNLOAD NORMAL

Usar mídia que leve mais de 12 segundos para baixar.

Esperado:

- passar dos 12 s normalmente;
- progresso continua;
- nenhum timeout prematuro;
- download conclui.

TESTE B — APÓS DOWNLOAD

Confirmar:

- arquivo válido;
- Player utiliza local;
- nenhum segundo download para a mesma mídia.

TESTE C — MÍDIA GRANDE

Preferencialmente vídeo 100–300 MB.

Esperado:

- pode levar minutos;
- enquanto houver progresso, NÃO ocorre timeout;
- apenas 60 s de inatividade devem caracterizar stall.

TESTE D — CONCORRÊNCIA

Confirmar:

uma mídia
→ no máximo um FileTransfer ativo.

TESTE E — FALHA REAL, somente se puder ser provocada com segurança

Se transferência realmente parar:

verificar comportamento após 60 s de inatividade.

Registrar:

- bytes já recebidos;
- tamanho parcial;
- retry;
- se houve desperdício.

Não precisamos executar teste destrutivo se não houver forma segura.

======================================================================
8. NÃO ALTERAR DURANTE TESTE
======================================================================

Durante o teste físico:

NÃO:

- alterar código;
- gerar nova build;
- publicar;
- corrigir ao vivo;
- alterar backend;
- alterar Firebase;
- alterar Web;
- alterar Local First.

Primeiro coletar resultado.

======================================================================
9. RESULTADO ESPERADO DA 2A.2-B
======================================================================

Queremos responder apenas:

1. download com progresso ultrapassa 12 s sem falha?
2. timeout agora representa INATIVIDADE real?
3. mídia grande completa normalmente?
4. existe FileTransfer duplicado?
5. retry causa ou não tráfego desnecessário?
6. arquivo parcial está sendo tratado de forma segura?

Resultado final:

2A.2-B APROVADA PARA PROMOÇÃO

ou

2A.2-B BLOQUEADA.

======================================================================
10. TELEMETRIA 2A.2 — REQUISITOS JÁ DEFINIDOS
======================================================================

IMPORTANTE:

Os itens abaixo NÃO devem ser implementados durante o teste físico da Fase B.

São requisitos já aprovados para as próximas etapas e precisam permanecer registrados.

A telemetria deve ser:

- passiva;
- de baixo consumo;
- player-first;
- preferencialmente agregada;
- não gerar tráfego relevante apenas para medir tráfego.

======================================================================
11. SEPARAÇÃO CONCEITUAL DA TELEMETRIA
======================================================================

NÃO misturar:

CONEXÃO DE REDE

com:

ORIGEM DA MÍDIA.

Precisamos ter campos distintos, conceitualmente equivalentes a:

connectionStatus

mediaSource

networkActivity

dynamicDataSource

operatingMode

Exemplo:

TV está ONLINE

mas:

mídia está sendo reproduzida LOCALMENTE.

Isso deve aparecer como:

Rede: ONLINE
Mídia: LOCAL

e não como "Online".

======================================================================
12. ORIGENS DE MÍDIA
======================================================================

Prever estados como:

CACHE_LOCAL
INTERNET_FALLBACK
DOWNLOADING_TO_CACHE
CACHE_PARTIAL
CACHE_UNAVAILABLE

HYBRID deve representar modo operacional, não simplesmente uma origem de arquivo.

======================================================================
13. MÉTRICAS DE CACHE E TRÁFEGO
======================================================================

Precisamos futuramente visualizar:

- bytes transferidos;
- última transferência;
- downloads;
- falhas;
- retries;
- timeout;
- cache hit;
- cache miss;
- cache hit rate;
- quantidade de arquivos;
- tamanho do cache;
- tráfego evitado pelo cache;
- tráfego efetivamente consumido;
- mídia reproduzida localmente;
- mídia reproduzida remotamente.

"Tráfego evitado" deve ser identificado como ESTIMATIVA quando não for diretamente mensurável.

======================================================================
14. NÃO CRIAR REQUEST PARA MEDIR
======================================================================

Telemetria NÃO deve criar:

- HEAD;
- fetch;
- download;
- ping por mídia;

somente para coletar métricas.

Usar:

- metadados existentes;
- tamanho do arquivo;
- Response já existente;
- FileTransfer;
- eventos do Player;
- informações locais.

======================================================================
15. TEMPO DE TELA / OPERAÇÃO
======================================================================

Também precisamos registrar:

- quando a sessão do Player começou;
- última ativação;
- última comunicação;
- tempo da sessão atual;
- tempo total de exibição;
- tempo de exibição por período;
- períodos online;
- períodos offline.

IMPORTANTE:

"Tempo ligada" significa:

PLAYER ATIVO / TELA EM EXIBIÇÃO.

Não afirmar que representa energia física da televisão se não houver essa informação.

======================================================================
16. SESSÕES
======================================================================

Estrutura conceitual:

sessionId
screenId
clientId
deviceId
startedAt
lastHeartbeatAt
sequence
cumulativeCounters

Reload/restart:

nova sessão quando apropriado.

Queda e recuperação de internet durante a mesma execução:

preferencialmente mesma sessão.

======================================================================
17. HEARTBEAT / CUSTO DE TELEMETRIA
======================================================================

O heartbeat atual já tem custo operacional.

Não transformar telemetria em escrita a cada poucos segundos com grande payload.

Preferir:

- dados agregados;
- checkpoint;
- envio periódico;
- piggyback quando seguro;
- cumulative counters.

Objetivo:

não gastar tráfego medindo a economia de tráfego.

======================================================================
18. BUFFER LOCAL / OUTBOX
======================================================================

Planejar:

Web:
IndexedDB ou equivalente.

Android:
storage leve apropriado.

Objetivo:

- guardar contadores;
- sobreviver offline;
- sincronizar depois;
- impedir perda;
- impedir duplicação.

Utilizar conceito de:

sessionId + sequence + cumulative counters

para idempotência.

Manter armazenamento local limitado.

======================================================================
19. DASHBOARD — NÍVEL GERAL
======================================================================

O dashboard administrativo deve possuir visão geral com:

- telas online;
- telas offline;
- telas em reprodução local;
- telas usando internet;
- telas híbridas;
- tráfego total;
- tráfego evitado;
- cache hit rate;
- downloads;
- erros;
- timeouts;
- tempo total de exibição.

======================================================================
20. SEGMENTAÇÃO POR CLIENTE E TELA
======================================================================

REQUISITO IMPORTANTE JÁ DEFINIDO:

Todos os dados devem poder ser segmentados por:

CLIENTE
e
TELA.

Fluxo:

PLATAFORMA
→ CLIENTE
→ TELAS
→ TELA INDIVIDUAL.

Filtros principais:

Período
Cliente
Tela
Status
Origem de reprodução.

======================================================================
21. VISÃO POR CLIENTE
======================================================================

Ao selecionar um cliente:

mostrar somente dados daquele cliente.

Exemplos:

- número de telas;
- telas online/offline;
- tempo total de exibição;
- tráfego;
- economia de cache;
- cache hit rate;
- downloads;
- falhas;
- timeouts;
- versões dos Players.

Também permitir comparar telas do mesmo cliente.

======================================================================
22. VISÃO POR TELA
======================================================================

Cada tela deverá possuir uma página/detalhe operacional.

Mostrar:

- nome;
- cliente;
- status;
- última comunicação;
- sessão atual;
- há quanto tempo está ativa;
- tempo total em exibição;
- origem atual;
- playlist;
- mídia atual;
- cache hit rate;
- tráfego;
- tráfego evitado;
- downloads;
- falhas;
- timeout;
- versão do aplicativo;
- histórico.

======================================================================
23. RELATÓRIOS
======================================================================

Relatórios devem permitir:

POR PERÍODO
POR CLIENTE
POR TELA.

Exemplos:

- tempo em exibição;
- tempo por sessão;
- tempo acumulado;
- disponibilidade;
- períodos offline;
- tráfego consumido;
- tráfego economizado;
- cache hit rate;
- downloads;
- erros;
- timeout;
- versão do aplicativo;
- última comunicação.

Exportação futura:

PDF
CSV.

======================================================================
24. HISTÓRICO / GRÁFICOS
======================================================================

Planejar gráficos de:

- tráfego ao longo do tempo;
- economia ao longo do tempo;
- uptime/player activity;
- cache hit rate;
- downloads;
- falhas.

Permitir filtro:

Hoje
7 dias
30 dias
período personalizado.

======================================================================
25. UI
======================================================================

Dashboard deve seguir identidade Totem Park:

- moderno;
- minimalista;
- profissional;
- dark;
- leitura rápida;
- sem excesso de informação simultânea.

Indicadores visuais:

LOCAL:
verde.

HÍBRIDO / preparando cache:
amarelo.

REMOTO:
vermelho.

Mas separar sempre:

STATUS DE REDE

de:

ORIGEM DE MÍDIA.

======================================================================
26. IMPLEMENTAÇÃO DA TELEMETRIA EM FASES
======================================================================

Manter roadmap:

2A.2-A
Local First
STATUS: HOMOLOGADA.

2A.2-B
Timeout / retry / downloads
STATUS: AGUARDANDO TESTE FÍSICO.

Depois:

2A.2-C
Telemetria passiva local.

2A.2-D
Sincronização agregada / idempotência.

2A.2-E
Dashboard administrativo e relatórios.

A nomenclatura pode ser adaptada, mas preservar a separação de responsabilidades.

======================================================================
27. NÃO COMEÇAR C/D/E AGORA
======================================================================

Durante o teste físico atual:

não implementar telemetria comercial.

A instrumentação AUDIT atual é apenas ferramenta de diagnóstico.

Primeiro concluir a 2A.2-B.

Depois decidiremos a próxima implementação.

======================================================================
28. CHECKPOINT
======================================================================

Registrar este documento nos artefatos do projeto como:

CHECKPOINT-2A2-ANDROID-E-TELEMETRIA.md

ou equivalente.

Ele deve servir como referência para que nenhuma das decisões e requisitos acima seja esquecida.

======================================================================
AÇÃO AGORA
======================================================================

A única tarefa operacional neste momento é:

TESTE FÍSICO CONTROLADO DA 2A.2-B.

Não fazer mudanças adicionais até receber os resultados da TV.