# PUBLICAÇÃO CONTROLADA 2A.1 + FIX — RESULTADO

**PUBLICAÇÃO ESTÁVEL no escopo controlado verificado.** A publicação Web foi executada. Validação direta na origem de produção: página pública/login e atualização normal do SW em navegador exclusivo, com Cache Storage preexistente de fixtures locais. Reprodução validada com o bundle baixado da produção, servido em navegador de homologação com configuração Firebase temporária apenas em memória e acesso ao backend de produção bloqueado. Não havia TV física/tela de cliente sob controle disponível; nenhuma foi interrompida.

## 1. Versão anterior

Deployment: **dpl_AdMkvihNUgSQsWp6vBHohmY3f1Ty**.

URL: https://totem-park-l12hw1ajq-junior-pk-s-projects.vercel.app

Criado: 12/09/2026 15:56:40 America/Sao_Paulo. Commit informado pela Vercel: b23dea80ed7b676ebfd14c6597f02f4ccac9db27, com gitDirty=1; por isso a referência exata para rollback é o deployment imutável, não um checkout simples. Bundle anterior: index-BYVv7xHU.js.

## 2. Versão publicada

Release: **2A.1 + FIX**, metadado release=2A.1-FIX.

Deployment: **dpl_8fTZWFZXR7WZuswVbvUZeydrt1zW**, READY, target production.

URL imutável: https://totem-park-98id5ayfe-junior-pk-s-projects.vercel.app

Alias confirmado: **https://totempark.com.br** e www.totempark.com.br. Criado em 2026-09-16T14:53:46.364Z UTC. Bundle: index-BNJWtZvH.js. Nenhum commit novo criado.

## 3. Arquivos incluídos

Foram reconstruídos 61 arquivos de entrada a partir da versão anterior, com SHA-1 comparado aos uid dos arquivos da Vercel. **58 permaneceram idênticos; somente 3 arquivos de produto mudaram**:

| Arquivo | Alteração aprovada |
|---|---|
| public/sw.js | Delete somente de shells antigos explicitamente pertencentes ao app |
| src/offline-player-cache.js | Suspensão da limpeza automática insegura somente na Web |
| src/App.jsx | Dez linhas para reconhecer imagem Blob Web já carregada ao reativar camada |

Cache conserva exatamente o nome totempark-player-media-v1. Chaves, identidade, manifesto e formato não foram alterados. Diff validado por reconstrução reversa das três mudanças. Nenhum outro comportamento de produto foi incorporado.

Nenhum teste, artifact, perfil Chrome, Android, backup, mock ou arquivo de homologação foi enviado no pacote. A comparação dos arquivos efetivamente enviados e dos assets HTTP publicados confirma o escopo. Todos os 519 arquivos de produto do workspace aprovado permaneceram idênticos durante esta tarefa.

[Diff da release](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/release.patch>) · [Escopo verificado](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/deployment-scope-verification.json>)

## 4. Build

**PASSOU.** Comando final executado no pacote isolado: npm.cmd run build → vite build --mode web. Também aprovado pela Vercel. HTML, SW e todos os assets JS/CSS baixados de produção são byte a byte idênticos ao build local isolado aprovado.

Busca no bundle original não encontrou 127.0.0.1, demo-totem-homolog, homologacao-2a1, Playwright, TESTA1/TESTB1 ou observer.js. Não há imports de teste/homologação no build. Arquivos e configuração Firebase do produto permaneceram idênticos aos publicados anteriormente.

Warnings existentes registrados: bundle acima de 500 kB; npm audit na Vercel informou 10 vulnerabilidades nas dependências e avisos allow-scripts. npm install informou up to date. Não foi executado npm audit fix nem alteração de dependências. git diff --check passou; avisos LF/CRLF não foram corrigidos.

[Comparação HTTP dos assets](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/published-verification.json>)

## 5. Estratégia de rollout

**GLOBAL POR LIMITAÇÃO DA INFRAESTRUTURA.** O projeto Web atual tem um único deployment/aliases; não foi identificado release de código por cliente/tela. Nenhum mecanismo seletivo novo foi criado. O pacote isolado foi publicado somente nesse projeto. A validação controlada foi feita por navegador e homologação local, conforme solução para a ausência de TV de teste disponível. APKs e backend fora do escopo.

## 6. Service Worker

**PASSOU na origem real de produção.** O navegador exclusivo abriu a versão anterior, aguardou o SW ativo e preparou duas fixtures locais no Cache Storage com o mesmo nome/formato/chaves já utilizados no gate. Após publicação foi solicitado update normal do mesmo /sw.js, seguido de reload; nenhum unregister, clearCache ou exclusão de Cache Storage foi utilizado.

Estados: **installing → installed → activating → activated**. Nova instância ativa confirmada. SW HTTP publicado corresponde ao SHA-256 do arquivo aprovado.

Cache antes: **2 arquivos / 43305 bytes**.

Cache depois: **2 arquivos / 43305 bytes**.

Entradas e hashes idênticos. Esses números são do navegador controlado com fixtures, não de uma TV física ou de um cliente real.

[Evidência direta do SW](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/controlled-sw.json>)

## 7. Mídias

**PASSOU no bundle publicado em homologação controlada.**

| Cenário | Intervalos completos de imagem | Visíveis | Vídeos concluídos |
|---|---:|---:|---:|
| online | 6 | 6 | 7 |
| offline | 11 | 11 | 12 |
| scheduled | 3 | 3 | 4 |
| template | 1 | 1 | 1 |

Vídeo e imagem visíveis; avanço funcionando; imagem local completa com dimensões 640×360. Nenhum intervalo de imagem permaneceu pending ou preto. Duração e transições existentes preservadas: imagem de 3 s, vídeo terminando pelo ended do arquivo de ~1,6 s. Playlist normal, agendamento e template de aviso visível também foram executados.

A configuração temporária de teste é descrita em lab-isolation.json: projeto/host Firestore direcionados exclusivamente a demo-totem-homolog/127.0.0.1:8288, com alteração de apiKey Auth para valor fictício. Essa resposta JS existe somente em memória no servidor de teste; os arquivos originais baixados e publicados permanecem inalterados. Nenhum acesso do Player ao backend Firebase de produção ocorreu nessa homologação.

[Evidências do Player](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/compiled-player.json>) · [Isolamento do laboratório](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/lab-isolation.json>)

## 8. Cache

Origem HTTPS real, navegador controlado com fixtures: **2 → 2 entradas**, **43.305 → 43.305 bytes**, SHA-256 preservados durante a atualização normal do SW e reload da página pública.

Homologação do bundle publicado reutilizou o perfil do gate anterior, que já possuía mídias: **7 → 7 entradas**, **144529 → 144529 bytes** após reprodução online/offline, agendamento, template e realtime. Todas as chaves e hashes preservados; não se preparou novamente um cache vazio para mascarar reutilização.

Cache de mídia observado: 0,043305 MB decimal na origem real controlada e 0.144529 MB no perfil local (corpos, sem shell/metadata). Não foi observada expansão nessas mídias já preparadas. Nenhuma quota/limpeza implementada.

## 9. Network

Somente observações verificadas:

Na origem de produção, HTML/SW/assets JS/CSS foram consultados para smoke e comparação. Não havia uma playlist de cliente real conectada nesse navegador, portanto **não há medição de vídeo/imagem de TV real**.

Na homologação do bundle publicado, todas as mídias da playlist normal, agendada e imagem atualizada já existiam no cache. Corpo remoto efetivamente enviado ao Player: **vídeo 0 bytes; imagem 0 bytes**. Houve requisições Range de vídeo, revalidação 304 com corpo zero e uso de Blob/Cache Storage. Requisição não foi tratada como transferência integral.

O helper local scenario.mjs baixou **16.378 bytes de imagemNova.png** para calcular o tamanho da fixture antes da atualização realtime. Esse GET ocorreu fora do navegador: nenhuma requisição do Player para essa imagem aparece na lista de requests. A asserção final do harness inicialmente contou esse tráfego de fixture e ficou FALHOU; arquivo bruto foi preservado. A verificação consolidada distingue as fontes, sem correção de produto ou tentativa de corrigir produção.

Baseline conhecida da primeira carga do gate anterior: arquivo vídeo 27.656 bytes, transferência 55.312 bytes (~2×); imagem 15.649 bytes. Duplicação inicial não foi corrigida nesta publicação e permanece dívida para a futura 2A.2.

[Verificação consolidada e transferências](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/post-publication-verification.json>)

## 10. Offline controlado

**PASSOU.** Bundle publicado executado no navegador local controlado, context.setOffline(true), acesso externo rejeitado com ERR_INTERNET_DISCONNECTED. **11 intervalos completos de imagem visíveis e 12 vídeos concluídos**, avanço normal, zero pending de imagem e zero amostras de tela inteira preta nos períodos de imagem. Blobs locais válidos. Conexão restaurada ao concluir.

Nenhuma TV de cliente foi desconectada, nenhum dado de navegador real foi limpo. [Captura offline](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/compiled-offline.png>)

## 11. Heartbeat / realtime

**PASSOU nos emuladores da homologação controlada.** Heartbeat do Player observado em lastSeenAt: {"timestampValue":"2026-09-16T14:59:58.507Z"}. Alteração realtime da playlist atualizou a imagem para NOVA IMAGEM REALTIME sem reload. Agendamento ativou a playlist de teste e foi desativado ao concluir; template de aviso foi exibido.

Primary lease: 0 erros observados. Avisos de transporte durante offline não foram tratados como regressão. Nenhuma configuração/collection/documento, Auth, rule ou Storage de produção foi modificado. Os heartbeat/fixtures/playlist writes do teste foram somente nos emuladores locais. Não há observação direta de heartbeat/realtime em uma TV física de produção nesta tarefa.

## 12. Android

**NENHUMA ATUALIZAÇÃO DE APK REALIZADA.** Sem alteração de versionCode, versionName, Capacitor Android, Filesystem, FileTransfer, Directory.Data, BootReceiver ou PlayerBootService. Native retorna ref undefined no novo tratamento de imagem. Os arquivos Android do workspace permaneceram intactos; alterações anteriores não foram incluídas no pacote.

## 13. Problemas encontrados

Nenhuma regressão de produto atribuível à release foi observada no escopo controlado.

Limitações e artefatos preservados: ausência de TV física sob controle; startup inicial do harness não iniciou por uma asserção sobre duas ocorrências da configuração Firebase, ajustada somente no servidor de teste; asserção final de tráfego incluiu o GET do helper de fixture, distinguido por fonte na consolidação. Não houve correções de produto após a publicação.

Dívidas conhecidas: clearCache pode remover arquivos de outras telas do mesmo cliente e a preparação pode não reiniciar imediatamente; duplicação inicial do vídeo (~2×). clearCache não foi executado, testado em cliente real ou corrigido. 2A.2 não iniciada.

## 14. Rollback

**NÃO NECESSÁRIO.** Nenhuma regressão atribuível à 2A.1 + FIX observada.

Deployment anterior disponível: dpl_AdMkvihNUgSQsWp6vBHohmY3f1Ty.

Procedimento previamente documentado: npx.cmd --yes vercel rollback dpl_AdMkvihNUgSQsWp6vBHohmY3f1Ty --yes --scope junior-pk-s-projects, a partir da pasta release. Não executado.

[Plano completo de rollback](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/ROLLBACK.md>)

## 15. CONCLUSÃO

### PUBLICAÇÃO ESTÁVEL

Conclusão limitada às verificações realizadas: versão e assets corretos online, SW atualizado normalmente preservando cache na origem real, bundle publicado aprovado em reprodução online/offline, agendamento, template, heartbeat e realtime na homologação isolada. Não há validação em TV física de cliente porque nenhuma estava disponível sob controle.

Sem APK, migração, alteração de backend/produção, limpeza de cache, commit ou início automático da 2A.2. Nenhuma outra evolução foi publicada.

[Resultado consolidado](<C:/Users/centr/Desktop/totem-park/artifacts/publicacao-2a1/post-publication-verification.json>)
