import fs from 'node:fs';import path from 'node:path';
const dir=path.resolve('artifacts/homologacao-2a1/fix'),r=JSON.parse(fs.readFileSync(path.join(dir,'fixed.json'))),a=JSON.parse(fs.readFileSync(path.join(dir,'current.json'))),b=JSON.parse(fs.readFileSync(path.join(dir,'before-2a1.json')));
const bodyRows=r.network.filter(x=>x.at>r.cachedAt&&x.encodedBodyBytes!==undefined&&/video01|imagem01/.test(x.url));
const network={cachedAt:new Date(r.cachedAt).toISOString(),videoAdditionalBodyBytes:bodyRows.filter(x=>x.url.includes('video01')).reduce((s,x)=>s+x.encodedBodyBytes,0),imageAdditionalBodyBytes:bodyRows.filter(x=>x.url.includes('imagem01')).reduce((s,x)=>s+x.encodedBodyBytes,0),cdpRequests:bodyRows,serverRequests:r.fixtureRequests.filter(x=>Date.parse(x.at)>r.cachedAt&&/video01|imagem01/.test(x.path)),scope:'Media payload bytes, excluding HTTP headers; preparation and isolated decode matrix excluded'};fs.writeFileSync(path.join(dir,'network-summary.json'),JSON.stringify(network,null,2));
const phases=Object.entries(r.phases).map(([name,p])=>`| ${name} | ${p.fullImageIntervals} | ${p.visibleImageIntervals} | ${p.videoEnded} | ${p.samples.filter(x=>x.tag==='IMG'&&x.classes.includes('is-pending')).length} | ${p.events.filter(x=>x.event==='error').length} |`).join('\n');
const oldRows=[a,b].map(x=>`| ${x.variant} | ${x.phases.online.fullImageIntervals} / ${x.phases.online.visibleImageIntervals} | ${x.phases.offline.fullImageIntervals} / ${x.phases.offline.visibleImageIntervals} |`).join('\n');
const matrix=[...r.decodeOnline,...r.decodeOffline].map(x=>`| ${x.online?'Online':'Offline'} | ${x.type} | ${x.load} | ${x.error} | ${x.complete} | ${x.naturalWidth} × ${x.naturalHeight} | ${x.decoded} |`).join('\n');
const report=`# 2A.1-FIX — RESULTADO

## 1. A falha existia antes da 2A.1?

**SIM — problema preexistente.**

Comparação real antes de editar o produto: Chrome ${r.chrome}, mesmo viewport 1280×720, mesmo tipo de perfil persistente exclusivo, imagem PNG 15.649 bytes (640×360), vídeo WebM 27.656 bytes (~1,6 s), playlist A/TESTA1 e offline por context.setOffline(true). Cada execução encerrou o processo do navegador e reutilizou seu próprio perfil.

| Versão | Online: intervalos completos / visíveis | Offline: intervalos completos / visíveis |
|---|---:|---:|
${oldRows}

A versão B foi reconstruída isoladamente em memória revertendo somente as duas mudanças conhecidas da 2A.1: filtro de exclusão do SW e retorno conservador de removeUnusedCachedMedia na Web. O App usado em A e B era idêntico e está preservado em App.before.jsx. Não se usou HEAD como equivalente à etapa anterior, pois o workspace contém mudanças anteriores não commitadas. Nenhum reset ou checkout destrutivo foi realizado.

Evidências: [A com 2A.1 antes do FIX](current.json), [B anterior à 2A.1](before-2a1.json), [teste rejeitando ambas as versões](regression-negative.json).

## 2. Causa raiz

A imagem é reutilizada como o mesmo elemento DOM entre ciclos. Quando o vídeo termina (~1,6 s), a imagem anterior ainda existe, pois a remoção da camada anterior espera 1,8 s. React preserva a camada pela chave estável. A imagem já carregada volta a ser atual sem mudar src e sem um novo evento load.

goToNextMedia zera readyMediaKey. Antes do FIX, somente onLoad da imagem chamava markCurrentMediaReady. Assim, complete=true e naturalWidth=640 coexistiam com is-current is-pending. CSS aplicava opacity:0 e visibility:hidden. O temporizador avançava mesmo sem a imagem pronta.

Não foi um handler registrado tarde: a captura observou load e react-image-load aceitos na primeira exibição. O mesmo id DOM da imagem continuou nos ciclos seguintes, sem outro load, enquanto react-reset acontecia a cada avanço. O Blob isolado decodificou corretamente. A primeira divergência ocorre na volta da camada já carregada ao estado atual, depois de zerar readyMediaKey.

Arquivos/funções: src/App.jsx — getPlayerItemKey (~15389), goToNextMedia (~15402), markCurrentMediaReady (~15435), efeito do temporizador (~16126), visibleLayers (~16364), renderPlayerItem (~16386); src/App.css — is-previous/is-pending/is-ready (~6624–6641).

Respostas sobre prontidão:

1. Antes, dependia exclusivamente de onLoad para imagem comum.
2. Não havia preloader de imagem liberando esse estado.
3. Antes, naturalWidth não participava da liberação; agora participa apenas no tratamento Web Blob já carregado.
4. O produto não utiliza decode para liberar essa imagem; nenhuma chamada foi adicionada.
5. readyMediaKey é um estado React compartilhado da instância do Player; a confirmação precisa corresponder ao item atual.
6. Não depende da disponibilidade da URL remota para sair de pending.
7. Blob segue o mesmo onLoad, mas um elemento já carregado e retido não dispara outro evento ao trocar a classe da camada.
8. Não há uma condição offline específica na prontidão antiga. O caso também falhava online.
9. Não havia timeout de prontidão de imagem. Há duração de reprodução e limpeza de camada em 1,8 s, preservadas.
10. A retenção da camada anterior interfere ao impedir a remontagem e o novo load da imagem.

## 3. Fluxo que falhava


playlist → URL remota → Cache Storage v1
→ response.blob() → URL.createObjectURL()
→ mediaCacheMap → applyPlayerMediaCache → preview Blob
→ camada React com chave estável → img carregada → primeiro onLoad → pronta
→ imagem fica como camada anterior durante vídeo curto
→ mesma img volta a ser atual → readyMediaKey é zerado
→ sem mudança de src e sem novo onLoad
→ is-pending → opacity 0 / visibility hidden → avanço sem imagem visível


Cache e Blob estavam corretos. responseToObjectUrl/getCachedMediaUrl ficam em src/offline-player-cache.js (~163/171); applyPlayerMediaCache em src/App.jsx (~14879). Nenhum desses caminhos foi modificado.

Comparação de decodificação em teste, incluindo URL remota previamente preparada no cache HTTP:

| Rede | URL | onLoad | onError | complete | Dimensões | decode |
|---|---|---|---|---|---|---|
${matrix}

O sucesso da URL remota offline nessa matriz depende do cache HTTP previamente preparado; não comprova acesso remoto disponível. O bloqueio externo foi confirmado separadamente com ERR_INTERNET_DISCONNECTED. Os src completos, classes, opacity, visibility, display, z-index, ids DOM e eventos estão nos JSONs.

Blob offline do Player: MIME image/png, tamanho 15.649 bytes, fetch(blobUrl) local funcionou, decode da imagem do Player e de Image isolada funcionou, dimensões 640×360. A existência/validade do arquivo não era a falha.

## 4. Correção aplicada

Adicionado ref à img, exclusivamente quando !isNativeApp() e preview começa com blob:. Quando a imagem é atual, já está complete e tem naturalWidth/naturalHeight positivos, e sua chave ainda não está pronta, chama a função existente markCurrentMediaReady.

Imagens ainda não carregadas continuam aguardando onLoad/onError. O ref não aplica prontidão a dimensões inválidas, camada anterior, URL remota ou Android. A mesma validação da chave atual permanece em markCurrentMediaReady.

Nenhuma alteração de duração, playlists, agendamentos, CSS, transição, download, Cache Storage, Blob URLs, fallback remoto, upload ou backend. ClearCache permanece como dívida técnica separada, sem correção nesta etapa.

## 5. Arquivos alterados

| Arquivo | Função/trecho | Motivo | Linhas aproximadas |
|---|---|---|---|
| src/App.jsx | renderPlayerItem, ref da imagem | Reconhecer Blob Web já carregado ao reativar camada | 16448–16457; **10 linhas adicionadas** |
| artifacts/homologacao-2a1/app-server.mjs | plugin de homologação | Servir versões anteriores em memória e observar estado React somente em teste | plugin local; cerca de 30 linhas adicionais |
| artifacts/homologacao-2a1/fix-diagnostic.mjs | execução Playwright/CDP | Comparação, Blob, ciclos, restart, network, agendamento e retenção | script de teste |
| tests/player-blob-image-readiness.mjs | verificação de intervalos completos | Rejeitar imagem apenas existente/decodificada, sem visibilidade | teste novo |
| artifacts/homologacao-2a1/fix/ | evidências, README e auxiliares de verificação | Preservar comparação, status, hashes, capturas e relatório | somente artefatos locais |

A comparação SHA-256 dos 519 arquivos de produto encontrou apenas src/App.jsx alterado. Removendo o novo ref, App.jsx é idêntico ao arquivo anterior ao FIX. [Comparação](product-comparison.json).

## 6. Impacto Android

**SEM ALTERAÇÃO DE COMPORTAMENTO NATIVO.**

A expressão ref retorna undefined em Native, preservando os handlers existentes. Verificação direta da expressão real do código confirmou Native sem callback, Web Blob completo aceito e camada anterior/dimensões inválidas/URL remota rejeitadas. Todos os arquivos Android e toda lógica anterior de App.jsx permaneceram idênticos à baseline.

Filesystem, Directory.Data, FileTransfer, convertFileSrc, mapa/preparação nativos, timeout Android, BootReceiver e PlayerBootService não foram alterados. Nenhum APK foi gerado; não houve execução em dispositivo Android nesta etapa.

## 7. Teste online

**PASSOU.** Rede disponível para os emuladores locais, vídeo e imagem visíveis em pelo menos cinco ciclos completos. Agendamento ativou a playlist AGENDADA HOMOLOGACAO e também completou pelo menos cinco intervalos visíveis de imagem e cinco vídeos. Agendamento foi desativado ao concluir o teste local.

| Fase | Intervalos completos de imagem | Intervalos visíveis | Vídeos concluídos | Amostras de imagem pending | Erros de mídia |
|---|---:|---:|---:|---:|---:|
${phases}

Build Web passou. Os testes de retenção da 2A.1 passaram.

## 8. Teste offline

**PASSOU.** context.setOffline(true); navegação externa rejeitada com ERR_INTERNET_DISCONNECTED. A medição usa dimensões, opacity e visibility da camada atual a cada 100 ms; não aceita apenas onLoad ou presença no DOM.

Ciclos: ${r.phases.offline.fullImageIntervals} intervalos completos de imagem, todos visíveis; ${r.phases.offline.videoEnded} vídeos concluídos. Pending de imagem: ${r.phases.offline.samples.filter(x=>x.tag==='IMG'&&x.classes.includes('is-pending')).length} amostras. Erros de mídia: zero. Nenhum intervalo completo de imagem invisível/tela preta encontrado nas execuções corrigidas.

[Captura offline corrigida](fixed-offline.png), [dados completos](fixed.json). A validação cobre o cenário local definido, sem afirmar ausência de toda falha possível em produção.

## 9. Persistência após restart

**PASSOU.** ${r.closures.length} processos do Chrome de teste foram encerrados, todos confirmados como inexistentes antes de continuar. As duas entradas originais, tamanhos, MIME e hashes permaneceram idênticos na primeira e segunda reabertura, antes de executar o Player.

O segundo restart também reproduziu offline ${r.phases['offline-second-restart'].fullImageIntervals} intervalos completos de imagem visíveis e ${r.phases['offline-second-restart'].videoEnded} vídeos concluídos. A correção não depende da primeira sessão.

## 10. Network

Bytes adicionais de corpo de vídeo original depois da preparação: **${network.videoAdditionalBodyBytes}**.

Bytes adicionais de corpo de imagem original depois da preparação: **${network.imageAdditionalBodyBytes}**.

O novo ref não faz fetch, não recria Blob e não inicia download. CDP mede corpo codificado e o servidor registra bodyBytes. Respostas lógicas de vídeo 206 podem ser servidas pelo SW/cache HTTP com revalidação 304 e corpo remoto zero; não foram classificadas como redownload integral. Cabeçalhos HTTP não são incluídos na contagem de corpo.

Preparação inicial, matriz isolada de decode e arquivos novos da playlist agendada/clientes de teste foram excluídos da contagem das mídias originais já preparadas. [Resumo de network](network-summary.json).

## 11. Regressões da 2A.1

**PASSOU.** Cache Storage v1 sobreviveu aos encerramentos completos e às ativações observadas do SW. Teste isolado do activate também confirmou exclusão somente dos shells aposentados e preservação de caches de mídia/desconhecidos.

Preparação de A/tela01, B/tela01 e A/tela02 preservou todas as entradas e hashes anteriores: ${r.ownership.before.length} → ${r.ownership.withB.length} → ${r.ownership.after.length} entradas. Operações de A não apagaram B, e tela02 não apagou tela01. Testes de limpeza concorrente e listas vazias também passaram.

O teste de visibilidade falha com as evidências antigas A e B (0 de 6 intervalos visíveis) e passa executando o produto corrigido. ClearCache não foi exercitado como solução e continua fora do escopo.

## 12. Git

Workspace continua com mudanças preexistentes, preservadas. A mudança de produto desta etapa é somente o ref da imagem em src/App.jsx. git diff --check passou. [Status completo](git-status.txt), [baseline de 519 arquivos](product-comparison.json).

Sem commit, deploy, publicação, APK, mudança de produção ou início da 2A.2. Dados fictícios e agendamentos foram preparados exclusivamente nos emuladores demo-totem-homolog; nenhum Firestore/Storage de produção foi acessado. O build gerou apenas saída local em dist.

## 13. CONCLUSÃO

### APROVADO PARA NOVO GATE

A causa preexistente foi comprovada antes da correção. O FIX mínimo liberou imagens Blob Web já carregadas sem mudar o comportamento nativo e passou nos testes online, offline, reinício, agendamento, network e retenção da 2A.1. A aprovação é para um novo gate; nenhuma publicação foi realizada.
`;
fs.writeFileSync(path.join(dir,'2A.1-FIX-RESULTADO.md'),report);console.log(network.videoAdditionalBodyBytes,network.imageAdditionalBodyBytes, 'report written');

