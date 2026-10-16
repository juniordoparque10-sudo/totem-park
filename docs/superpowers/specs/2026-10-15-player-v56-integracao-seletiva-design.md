# Totem Park Player V56 — Integração seletiva

**Data:** 2026-10-15  
**Status:** especificação para revisão  
**Base obrigatória:** `c49579bf1ec06f64dbb06e8b0165c2cb13ffab83`  
**Destino:** flavor Android `playerRcSecureLinkExperiment`, sem alterar V51 nem substituir a V55 instalada

## Objetivo

Preparar uma única evolução experimental do Player Android, preservando a base Web consolidada com Templates V2 e Telemetria V2 Portal. A V56 só poderá incorporar novas funcionalidades depois que a reconstrução seletiva demonstrar equivalência operacional com a V55 usada nos testes físicos.

O trabalho não parte da árvore local inteira. Cada componente Android recuperado precisa ter origem verificável, finalidade conhecida e teste correspondente. Alterações não relacionadas, artefatos compilados e arquivos gerados não serão usados como fonte de implementação.

## Escopo

Após o gate de equivalência V55, a V56 poderá incluir:

1. reprodução das oito Templates V2 consolidadas;
2. dimensionamento consistente dos logos nas áreas próprias das templates;
3. nova tela de manutenção navy aprovada;
4. Telemetria V2-A agregada, limitada e econômica;
5. geração de um Preview Web isolado e de uma única APK experimental denominada `Totem Park Player V56.apk`, caso todos os gates sejam aprovados.

Ficam fora do escopo: V51, publicação Web, deploy Firebase, novas Rules ou Functions, mudanças de permissões, migração destrutiva, limpeza de dados/cache, revogação de vínculos e instalação automática.

## Proveniência e isolamento

- A implementação ocorrerá em worktree e branch exclusivas derivadas de `c49579b`.
- A árvore principal suja será tratada apenas como fonte de evidências candidatas; nenhum diretório ou conjunto de mudanças será copiado em bloco.
- A base Web já consolidada será preservada. Toda divergência necessária deverá ser pequena, documentada e coberta por teste.
- Para cada arquivo recuperado da V55 será registrado: caminho de origem, hash ou diff, comportamento protegido e teste que comprova sua necessidade.
- Bundles em `android/**/assets/public`, APKs e outros gerados não constituem fonte de verdade. Eles poderão ser usados somente para comparação de conteúdo e metadados.

## Gate obrigatório de equivalência V55

Nenhuma funcionalidade nova será implementada antes da conclusão deste gate.

### Inventário do flavor

O inventário abrangerá exclusivamente `playerRcSecureLinkExperiment` e seus componentes compartilhados inevitáveis:

- `applicationId`, suffix, label, manifest e Activity efetiva;
- versionCode/versionName da APK instalada;
- certificado de assinatura;
- assets Web empacotados e script de preparação;
- bridge Android/Web, permissões e configuração de rede;
- persistência de identidade, vínculo e estado local;
- comandos remotos e modos especiais;
- mecanismos de cache, recuperação e reprodução offline.

### Metadados físicos antes da versão

Com o Chromecast autorizado conectado, serão coletados sem alteração do aparelho:

- `adb shell dumpsys package br.com.parksolutions.totempark.player.rcsecurelink`;
- caminho e versão do pacote instalado;
- Activity de entrada;
- versionCode e versionName;
- SHA-256 do certificado da APK instalada e da APK candidata.

O incremento final será definido apenas após essa coleta. Se a instalação confirmar versionCode 55, a candidata usará 56; qualquer divergência interrompe a definição da versão até reconciliação.

### Equivalência funcional exigida

A base reconstruída precisa preservar, por evidência automatizada e inspeção dirigida:

1. Secure Link: restauração do vínculo, conflito, revogação confirmada e proteção contra apropriação indevida;
2. correção `exitTv`: timestamps ISO, rejeição de comandos antigos/inválidos, idempotência e não limpeza por falha transitória;
3. Local First: leitura do estado persistido antes da rede e ausência de limpeza indiscriminada;
4. cache: integridade, reaproveitamento e fallback de mídia local;
5. reprodução offline: retomada da playlist válida sem depender de nova autenticação de rede;
6. recuperação: reinicialização de processo/WebView sem perder vínculo ou conteúdo válido;
7. controle remoto: manutenção, blackout, pausa, retomada, troca de mídia e saída legítima;
8. atualização in-place: mesmo package e assinatura, sem desinstalação e sem perda de dados.

Se uma correção essencial não puder ser vinculada com segurança a código-fonte verificável, teste ou comportamento observável da V55, o trabalho será interrompido antes das novas funcionalidades. Não haverá substituição por implementação presumida.

## Arquitetura da V56

### Base Web e empacotamento Android

O Player Android continuará executando o mesmo Player Web empacotado pelo fluxo existente do flavor experimental. O script de preparação deverá copiar somente o build Web final aprovado para os assets do flavor, removendo qualquer risco de mistura com bundles de outros flavors.

O código compartilhado do Portal não poderá introduzir rotas administrativas, dados privados ou dependências de produção no bundle do Player. O build Web e o build Android serão verificados separadamente.

### Oito Templates V2

As oito templates consolidadas permanecem implementadas pelo registro, normalizadores e renderizadores compartilhados existentes. A V56 consumirá exatamente os contratos publicados, sem criar renderizadores Android paralelos.

O Player deve suportar:

- Smart Lobby;
- Agenda & Informações;
- Promoção/Campanha;
- Menu Digital;
- KPI/Indicadores;
- QR Code/Interação;
- Notícias Editorial Dinâmica;
- Mercado Premium.

Persistem as garantias já aprovadas: orientação 16:9/9:16, rotação interna limitada pela duração efetiva do item, limpeza de timers, fontes dinâmicas independentes, cache dos dados permitidos e compatibilidade de documentos legados.

### Dimensionamento dos logos

O ajuste será aplicado somente aos slots semânticos de logo das Templates V2, por componente ou classe compartilhada. A regra padrão será `object-fit: contain`, área máxima limitada pelo layout e preservação de proporção. Imagens de produto, backgrounds, capas de notícias e mídias principais não serão afetadas.

Editor, preview, miniatura e Player Web deverão usar o mesmo contrato visual. Nenhuma alteração será feita nos logos armazenados.

### Tela de manutenção navy

A tela aprovada será implementada como composição nativa ao renderer Web, reutilizando o logo original existente e elementos CSS/code-native. A referência visual orienta:

- fundo navy com detalhes neon discretos;
- logo original centralizado e sem redesenho;
- engrenagem/animação de manutenção;
- título `MODO DE MANUTENÇÃO`;
- texto de apoio e indicador visual contínuo;
- rodapé `Desenvolvido por Park Solutions`.

A animação não simulará porcentagem nem bloqueará o thread principal. O modo continuará sendo acionado apenas pelo comando remoto existente, sem substituir splash, estado offline, tela de pareamento ou estados de erro.

## Telemetria V2-A

### Princípios

- Registrar transições reais, não derivadas de heartbeat ou uptime.
- Não enviar escrita a cada quadro, mídia ou passagem do ticker.
- Agregar localmente, deduplicar e enviar em lotes controlados.
- Manter a telemetria subordinada ao controle existente de habilitação/piloto.
- Uma falha de telemetria nunca interrompe vínculo, cache ou reprodução.

### Eventos mínimos

O produtor V2-A trabalhará com estados compatíveis com o Portal já consolidado: `ACTIVE`, `OFFLINE`, `ATTENTION`, `IDLE`, `INTERRUPTED` e `RECOVERED`. Cada evento terá identificador determinístico, `screenId`, timestamp válido, estado e descrição sanitizada. UID, token, URL assinada e conteúdo privado não serão incluídos.

Eventos serão emitidos somente em transições comprovadas, por exemplo início real de reprodução, interrupção, recuperação e encerramento confirmado. Eventos repetidos no mesmo estado serão ignorados.

### Buffer, retenção e envio

- journal local persistente e limitado;
- deduplicação por identificador e transição;
- lote enviado no heartbeat existente ou em ponto já disponível, sem aumentar sua frequência;
- limite alvo de 200 eventos recentes por tela, suficiente para o histórico operacional e abaixo do limite de leitura defensivo do Portal;
- backoff em falha e retenção local do lote não confirmado;
- nenhuma limpeza de vínculo ou cache em caso de erro.

Antes de qualquer gravação remota, os emuladores deverão provar que o caminho atual da tela autoriza o campo e formato sem nova Rule, Function ou permissão. Se a regra publicada/consolidada não comportar o contrato, apenas o journal local e o adaptador permanecerão preparados; a sincronização será bloqueada e reportada para autorização específica.

### Compatibilidade com o Portal

O Portal continuará lendo eventos reais do contrato `screen.telemetry.activity.events`, rejeitando registros inválidos e limitando a leitura. A V56 não alterará os listeners, o PDF, os filtros ou a interface já aprovada da Telemetria V2 Portal.

## Persistência, segurança e custos

- Nenhuma identidade será recriada durante atualização.
- O binding local e a identidade Firebase permanecem nos armazenamentos atuais.
- O cache Local First continua sendo a fonte de fallback offline.
- A Telemetria V2-A usa apenas dados operacionais mínimos e sanitizados.
- Dados dinâmicos das templates reutilizam caches e intervalos existentes.
- Não haverá listener, consulta ou gravação recorrente nova fora do lote de telemetria comprovadamente autorizado.
- Nenhuma alteração de Rules, Functions, Storage ou dados de produção faz parte desta entrega.

## Compatibilidade e versionamento

- V51 permanece intacta.
- V55 instalada não será sobrescrita durante desenvolvimento ou homologação sem autorização separada.
- Package name e certificado precisam ser idênticos aos da V55 experimental.
- A APK candidata deve aceitar instalação com `adb install -r` sem `-t` ou desinstalação, preservando dados.
- O nome de entrega será exatamente `Totem Park Player V56.apk` somente se o metadado instalado confirmar a sequência e todos os gates passarem.

## Estratégia de testes

### Gate V55

- testes focados de Secure Link e `exitTv`;
- persistência do vínculo em reinicialização;
- cache íntegro e reprodução offline;
- recuperação de processo/WebView;
- comandos remotos legítimos;
- comparação de package, Activity e assinatura.

### Templates e logos

- oito tipos resolvidos e reproduzidos pelo Player;
- orientação paisagem/retrato;
- rotação limitada à duração do item;
- cache e fallback dos dados dinâmicos;
- logo pequeno, grande, quadrado, horizontal e ausente;
- imagens que não são logos preservadas.

### Manutenção

- entrada e saída pelo comando existente;
- composição 16:9 e 9:16;
- animação contínua sem progresso falso;
- ausência de interferência em splash, pareamento e offline.

### Telemetria V2-A

- somente transições reais;
- deduplicação, limite e retenção;
- lote no ciclo existente sem aumento de frequência;
- backoff e retomada;
- falha de permissão/rede sem impacto operacional;
- consumo correto pelo helper do Portal;
- emuladores confirmando compatibilidade das Rules atuais antes de ativar sincronização.

### Verificação final

- testes focados dos arquivos alterados;
- ESLint somente no escopo modificado;
- build Web essencial;
- Preview Vercel isolado;
- build único do flavor experimental;
- inspeção de APK com `aapt`/`apkanalyzer` e `apksigner`;
- comparação de checksum e registro do caminho completo;
- nenhuma instalação automática.

## Sequência e gates de entrega

1. Congelar a base `c49579b` em worktree isolada.
2. Inventariar V55 e metadados da instalação física, sem alterar o Chromecast.
3. Reconstruir seletivamente e provar equivalência V55.
4. Interromper se houver lacuna essencial não rastreável.
5. Integrar oito Templates V2 e logos.
6. Integrar a tela de manutenção navy.
7. Preparar Telemetria V2-A e ativar sincronização somente se compatível com as permissões existentes.
8. Executar testes, Preview e build experimental.
9. Entregar artefatos e evidências; não instalar ou publicar.

## Rollback e preservação

O rollback de desenvolvimento é o retorno ao commit base `c49579b`. A V55 física permanece o rollback operacional e não será removida. Como não haverá deploy, qualquer falha na V56 candidata será resolvida descartando a APK e a branch, sem ação em produção, Firebase ou dispositivos.

## Critérios de aceite

- origem de cada correção V55 recuperada é verificável;
- equivalência operacional V55 comprovada antes das funcionalidades novas;
- oito Templates V2 e logos consistentes no Player;
- manutenção fiel à referência, sem alterar outros estados;
- Telemetria V2-A econômica, real e não bloqueante;
- nenhuma necessidade não autorizada de Firebase ocultada;
- package, assinatura, dados, cache e vínculo preservados;
- Preview e APK únicos, isolados e não publicados;
- V51 e V55 permanecem intactas.
