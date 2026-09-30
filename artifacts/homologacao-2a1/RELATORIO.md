# HOMOLOGAÇÃO 2A.1 — RESULTADO

## 1. Estado do repositório

Status Git conferido antes e depois. As alterações de produto da 2A.1 permanecem exclusivamente em `public/sw.js` (propriedade explícita de caches antigos) e `src/offline-player-cache.js` (retenção conservadora Web), acompanhadas de `tests/web-cache-retention.mjs`. Nenhuma correção adicional no produto foi necessária nesta homologação.

Comparação com a captura anterior à 2A.1 verificou 526 arquivos existentes: somente esses dois arquivos de produto diferem. O módulo compartilhado é idêntico ao anterior quando se retira a proteção de cinco linhas. Isso inclui identidade das mídias, nome `totempark-player-media-v1` e funções nativas. `static-comparison.json` registra o resultado.

A pedido do usuário, foi criado um ambiente local reutilizável em `artifacts/homologacao-2a1`, com scripts, emuladores, fixtures e evidências. Aplicação real em http://127.0.0.1:5199/; bancada SW em http://127.0.0.1:5198/. O projeto `demo-totem-homolog` usa Auth, Firestore e Storage locais. A configuração é transformada somente em memória pelo servidor de teste, sem editar `src/firebase.js`. CSP bloqueia conexões externas. As regras locais são cópias, não publicações. Instruções no README.

Sem deploy, APK, commit, migração ou alteração em serviços/dados de produção. As escritas de clientes, telas, playlists e heartbeat ocorreram somente no emulador autorizado.

## 2. Service Worker real

Chromium 152 real, no navegador integrado. Servidos os bytes da versão anterior e da versão local atual do SW. A bancada usa o módulo real de cache e mídias WebM/PNG geradas localmente.

### Antes da ativação

- `totem-park-pwa-v2`
- `totem-park-pwa-v3`
- `totempark-player-media-v1`
- `cache-de-teste-nao-relacionado`

### Depois da ativação

- `totem-park-pwa-v3`
- `totempark-player-media-v1`
- `cache-de-teste-nao-relacionado`

Somente v2 foi removido. Os dois arquivos de mídia mantiveram as mesmas chaves e tamanhos. Foram observados `installing`, `installed` e `waiting: true`. Nesta execução, reload ainda deixou o novo SW esperando; fechar e reabrir a aba concluiu a ativação. Não foi modificado `skipWaiting` nem outro aspecto do ciclo de vida. O inventário após reabertura comprova a limpeza seletiva do novo SW.

## 3. Cache de mídias

Tamanhos são a soma dos corpos armazenados, sem overhead do navegador. MB decimal.

| Cenário | Arquivos | Bytes | MB aproximados |
|---|---:|---:|---:|
| Antes da atualização do SW | 2 | 43.305 | 0,0433 |
| Depois da ativação e reabertura | 2 | 43.305 | 0,0433 |
| Player real: três telas preparadas | 6 | 128.151 | 0,1282 |
| Após atualizar uma playlist com imagem nova | 7 | 144.529 | 0,1445 |

O retorno à playlist anterior preservou o conteúdo. A retenção maior é o comportamento defensivo esperado.

## 4. Teste com mídia real

Vídeos WebM decodificados e reproduzidos e imagens PNG com largura natural de 640 pixels. Não foram usados corpos falsos de texto como mídia. O player real exibiu as fixtures a partir de Blob URLs após a preparação, com eventos de reprodução registrados.

Foram usadas a inspeção visual, capturas de tela, console, Cache Storage real, Resource Timing e logs HTTP do servidor. As interfaces gráficas Application/Network do DevTools não estão expostas pelo navegador integrado; não foram usadas nem simuladas como evidência.

![Player real durante a homologação](player-real.png)

## 5. Teste duas telas

Cliente A: TESTA1 e TESTA2 abertos simultaneamente. Após atualização realtime de TESTA1, os arquivos de TESTA2 permaneceram no cache. A comparação confirmou que todas as seis entradas anteriores continuaram presentes ao passar para sete.

## 6. Teste dois clientes

Cliente B/TESTB1 aberto na mesma origem. Vídeo e imagem do cliente B permaneceram durante atualização de A, troca de playlist e limpeza explícita de A.

## 7. Troca de playlists

TESTA1 passou da playlist original para a playlist de TESTA2 e voltou à original. Reprodução visual e estado das telas no emulador confirmaram a troca. Não houve limpeza automática destrutiva.

Uma playlist agendada foi ativada para TESTA1, mostrou “Programação ativa: AGENDADA HOMOLOGACAO” e registrou `currentPlaylistMode: scheduled`; ao desativá-la, voltou à playlist padrão. Template de aviso também foi exibido no ciclo.

## 8. Reload / fechamento / reabertura

- Reload: preservação confirmada na bancada e no player real.
- Fechamento e reabertura de aba: preservação confirmada; não confundir com reinício de processo.
- Fechar todo o navegador e iniciar novamente: **não executado**. O controle disponível não oferece encerramento/reinício do Chromium integrado.

## 9. Teste offline

DevTools Offline/desconexão total: **não executado**, por indisponibilidade desse controle.

Teste complementar: servidor de mídias indisponível por 21,582 segundos, mantendo o player aberto. Em TESTA1 foram registrados cinco eventos de início de vídeo e quatro términos por Blob URL, sem erro de mídia, com imagens disponíveis e seis entradas de cache estáveis (128.151 bytes). A conexão com o emulador permaneceu ativa. Esse resultado comprova reprodução local sem o servidor de arquivos, mas não equivale a offline completo ou inicialização offline.

## 10. Network

Na preparação inicial houve respostas integrais 200 e um Range `bytes=0-`, respondido como 206 com os 27.656 bytes do vídeo: um Range também pode transferir o arquivo inteiro.

No reload medido às 21:18:15 UTC, imagem e vídeo emitiram requisições condicionais. Ambas receberam 304 com zero bytes de corpo. O módulo informou zero novos downloads de cache. Isso não significa ausência de requisições ou de cabeçalhos transferidos.

O diagnóstico HTTP separado produziu 200, 304 e 206 de 100 bytes; essas requisições estão marcadas como diagnóstico, não reprodução. Depois da limpeza explícita, o reload transferiu novamente 27.656 bytes de vídeo e 15.649 bytes de imagem para preparação.

Resource Timing apresentou `transferSize: 0` em recursos intermediados pelo SW mesmo quando o servidor registrou transferência. Portanto, esse campo sozinho não foi usado para concluir ausência de bytes. Leituras de Cache Storage foram comprovadas pelas entradas existentes e pelo retorno de cache do módulo; memória/HTTP cache não foi confundida com Cache Storage. Não foi possível separar categoricamente memória e cache HTTP em disco. Não há medição de tráfego total na interface de rede.

## 11. clearCache

Comando real enviado somente ao emulador de TESTA1. O console registrou “Cache da tela limpo: 5 arquivo(s).”

- Antes: sete arquivos, 144.529 bytes.
- Depois: dois arquivos do cliente B, 40.910 bytes.
- Removeu arquivos de ambas as telas do cliente A, inclusive a imagem da playlist anterior.
- Manteve o cache app shell e o recipiente de cache de mídia; a função remove entradas e metadados do cliente, não todos os recipientes Cache Storage.
- TESTA1 passou para `preparando`/zero itens. A preparação não reiniciou sozinha no intervalo observado.
- Reload de TESTA1 baixou seus dois arquivos novamente: quatro arquivos totais, 84.215 bytes. Reload de TESTA2 recompôs seus arquivos.
- TESTA2 continuou reproduzindo com Blob URLs já carregadas e temporariamente ainda indicava cache pronto, apesar das entradas persistentes removidas.

Comportamento anterior documentado, sem alteração nesta etapa.

## 12. Regressões

Não foi identificada regressão atribuível à 2A.1 nos cenários executados: login, código da tela, carregamento, vídeo, imagem, avanço, duração, agendamento, template e realtime.

Exemplo de duração observada: vídeo terminou às 01:40:36.012 UTC e o próximo ciclo de vídeo iniciou às 01:40:39.028, intervalo de 3,016 segundos correspondente à imagem configurada para três segundos. Heartbeat continuou atualizando as três telas no emulador.

Durante a sessão prolongada com múltiplas abas, o console registrou erros do Firestore de aquisição de primary lease. Os players posteriormente continuaram atualizando heartbeat e realtime; a causa não foi isolada e não há evidência para atribuí-la à 2A.1. Nenhuma correção oportunista foi aplicada. Serviços externos de localização/clima foram bloqueados pela política intencional do ambiente; templates dependentes dessas APIs não foram homologados.

Testes `node tests/web-cache-retention.mjs`, `node artifacts/homologacao-2a1/verify-evidence.mjs` e `git diff --check` passaram.

## 13. Android

**SEM ALTERAÇÃO DE CÓDIGO NATIVO.**

Comparação estática preservou Capacitor Filesystem, FileTransfer, Directory.Data, caminhos, preparação, fila e timeout. App.jsx e arquivos Android não foram editados nesta homologação. O registro do SW não exclui WebView explicitamente: pode executar se houver suporte. Não foi alterado nem testado em dispositivo físico. Nenhum APK foi gerado.

## 14. Riscos

- Crescimento observado do cache devido à retenção conservadora.
- `clearCache` afeta outras telas do mesmo cliente e pode deixar indicação de cache desatualizada; exige nova preparação.
- Nova versão do SW permaneceu em espera até fechamento da aba nesta execução.
- Erros de primary lease do Firestore apareceram durante sessão prolongada; origem ainda não determinada.

## 15. CONCLUSÃO

### APROVADO COM RESSALVAS

As duas proteções de retenção da 2A.1 passaram em Chromium real e no player conectado ao ambiente emulado. A correção pode seguir isoladamente para revisão de publicação, considerando os comportamentos anteriores de clearCache e crescimento do cache.

A aprovação não certifica reinício completo do navegador, DevTools Offline ou Android físico; esses cenários não foram executados. Recomenda-se completar os dois primeiros antes de uma distribuição ampla que dependa dessas garantias. Não foi implementado cache-first nem a etapa 2A.2.

Nada foi publicado. O ambiente local permanece disponível para revisão humana.
