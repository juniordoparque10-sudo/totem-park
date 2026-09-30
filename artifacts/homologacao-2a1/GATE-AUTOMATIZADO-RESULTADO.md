# GATE AUTOMATIZADO 2A.1 — RESULTADO

## 1. Ferramenta utilizada

Playwright já disponível no runtime local + Google Chrome 152.0.7977.84, headless, com CDP para observação de rede. Nenhuma dependência adicionada ao produto. Não foi utilizada a ferramenta anterior de navegação.

Os servidores da homologação existente foram usados. Tentativas iniciais foram invalidadas porque o Vite monitorava arquivos bloqueados do perfil Chrome e encerrava com EBUSY. Foi corrigido exclusivamente o monitoramento dos dois servidores de teste em `artifacts/homologacao-2a1/`, ignorando `chrome-profile-gate`. Nenhum código do produto foi alterado.

## 2. Perfil persistente

`C:/Users/centr/Desktop/totem-park/artifacts/homologacao-2a1/chrome-profile-gate`

Perfil exclusivo dos testes, reutilizado entre processos. Nenhum perfil pessoal foi acessado, apagado ou modificado. Não houve clearCache.

## 3. Estado antes do encerramento

Cache: `totempark-player-media-v1`.

Entradas: **2**. Tamanho dos corpos: **43.305 bytes**, aproximadamente 0,0433 MB decimal.

| Mídia | Chave | Bytes |
|---|---|---:|
| Imagem | `https://totempark.local/cache/3056c0fe` | 15.649 |
| Vídeo | `https://totempark.local/cache/aa0dc5a1` | 27.656 |

Inventário obtido diretamente por Cache Storage, com SHA-256 dos corpos, não pelo estado React.

## 4. Encerramento real

Na execução confirmatória, o processo Chrome PID **23820** foi encerrado por fechamento do contexto persistente. Consulta ao PID confirmou que o processo deixou de existir. A nova instância teve PID **19824**. Esta também foi encerrada ao concluir a coleta.

Não houve limpeza de perfil, Cache Storage, Service Worker, IndexedDB ou localStorage entre as instâncias.

## 5. Estado após nova inicialização

Cache: `totempark-player-media-v1`.

Entradas: **2**. Tamanho: **43.305 bytes**.

Mesmas chaves, mesmos tamanhos e mesmos hashes:

- Imagem: `693d9b80d37e3cbb797ae1ae390d6bd9e5b7aff990231b8a58f67b64dccd72fd`.
- Vídeo: `5f5015fbb36a8379f70a8861a71efa490ab4a4945bef4460fd6a71be6a940013`.

A consulta ocorreu em documento de imagem da mesma origem (`/favicon.png`), antes de executar o player. Portanto, um novo download de campanha não mascarou o resultado.

### Resultado da persistência

**PASSOU.**

## 6. Network após reabertura

Origem de homologação: `http://127.0.0.1:5199`.

| Mídia / URL | Observação | Corpo transferido do servidor |
|---|---|---:|
| `/media/video01.webm` | Player emitiu Range. CDP mostrou 206 entregue via SW; servidor registrou validação condicional 304. Os 27.656 bytes decodificados vieram do conteúdo já disponível. Depois, reprodução em Blob URL. | **0 bytes** na validação |
| `/media/imagem01.png` | Sem nova requisição HTTP dessa imagem na janela monitorada; leitura do Cache Storage e Blob URL. | **0 bytes** observados |

Zero corpo não significa zero tráfego de cabeçalhos. O CDP da página não expõe sozinho todos os bytes de rede do SW: por isso, foi cruzado com o registro do servidor. Não foi observado redownload integral das duas mídias nessa janela.

## 7. Modo offline

Ativado por `context.setOffline(true)`. Comprovações independentes:

1. Fetch ao vídeo local com query inédita e `cache: no-store`: falhou.
2. Fetch ao endpoint do Firestore emulado: falhou.
3. Navegação de uma página adicional para `https://example.com`: falhou com `net::ERR_INTERNET_DISCONNECTED`.

Os servidores permaneceram ativos; o bloqueio foi do contexto do navegador. Não foi uma interrupção parcial somente do servidor de arquivos.

## 8. Reprodução offline

Observação de 22 segundos, com 220 amostras de DOM/mídia a cada aproximadamente 100 ms, eventos e captura visual.

### Vídeo

Reproduziu por Blob URL, terminou **5 vezes** e repetiu. Foram 74 amostras visíveis de 75 amostras de vídeo; a amostra restante coincidiu com transição. Sem evento de erro de mídia.

### Imagem

**Falhou visualmente.** Possuía Blob URL e largura natural de 640 pixels, portanto estava carregada/decodificada. Entretanto, sua camada ficou `is-current is-pending`, com opacidade zero: **0 amostras visíveis em 145 amostras de imagem**.

### Avanço

O índice continuou alternando vídeo/imagem. Os períodos completos da imagem duraram aproximadamente três segundos, porém sem exibição efetiva: apareceu tela preta.

### Duas voltas completas

O sequenciamento percorreu mais de duas voltas; **a exibição completa não passou**, porque a imagem ficou invisível nas voltas observadas.

### Erros

Não houve erro de decodificação ou perda de arquivo no Cache Storage. Houve falha visual de prontidão/exibição. Mensagens de rede do Firestore durante offline são esperadas. A captura confirma tela preta no intervalo da imagem.

![Tela preta durante o intervalo da imagem](gate-offline.png)

### Resultado offline

**FALHOU.**

A primeira versão do teste verificava eventos, duração e Blob URLs, mas não exigia visibilidade da camada. Sua aprovação preliminar foi invalidada pela revisão das capturas. O teste foi reforçado exclusivamente no arquivo de automação, repetido, e reproduziu a falha. O registro preliminar em `gate-attempt-dom-only.json` não é a decisão final.

## 9. Inicialização do zero offline

**PARCIAL — diagnóstico da execução anterior.** Foi iniciada uma terceira instância, com o mesmo perfil e offline configurado antes da navegação. O player abriu e exibiu mídia na captura, mas não foi validado um ciclo visual completo nesse diagnóstico. A classificação automática anterior baseada somente na presença do elemento não constitui aprovação do ciclo.

Esse resultado não foi utilizado para reprovar a 2A.1.

## 10. Service Worker

Registrado e `activated` antes e depois do encerramento. Mantidos `totem-park-pwa-v3` e `totempark-player-media-v1`. Nenhuma mudança em install, waiting, activate ou estratégia de cache foi realizada.

## 11. Firestore primary lease

Não ocorreu mensagem de primary lease na execução confirmatória de uma aba. Na execução diagnóstica anterior, duas abas foram observadas por 12 segundos sem essa mensagem. Isso não exclui o problema em sessões longas. Nenhuma configuração Firestore foi alterada.

## 12. Regressões

Falha real observada e reproduzida: imagem local decodificada permanece invisível durante o loop offline, com tela preta entre vídeos.

Não foi executada comparação A/B com o código anterior à 2A.1. Portanto, **não está demonstrado que a 2A.1 introduziu a falha**. A reprovação segue o critério solicitado: uma das duas evidências obrigatórias falhou por comportamento observado no player, não por limitação externa da ferramenta.

Nenhuma correção foi aplicada. Crescimento conservador do cache e alcance do clearCache continuam como riscos conhecidos, sem exercício do comando neste gate.

## 13. Estado final do Git

`git status` e `git diff --check` executados. Comparação SHA-256 de **519 arquivos preexistentes fora de tests/artifacts**: nenhuma alteração. O repositório mantém as modificações anteriores, sem reset ou commit.

**NENHUM ARQUIVO DO PRODUTO FOI ALTERADO DURANTE O GATE.**

Arquivos de automação, configuração local de teste, perfil exclusivo, capturas e evidências ficaram em `artifacts/homologacao-2a1/`. Sem deploy, APK, novas dependências do produto ou acesso a dados de produção.

# NÃO APROVADO PARA PUBLICAÇÃO DA 2A.1

Persistência: **PASSOU**. Reprodução offline completa: **FALHOU**, pois a imagem fica invisível entre vídeos apesar de permanecer íntegra no cache.

As evidências finais estão em `automated-gate.json`, `gate-offline.png` e `gate-product-comparison.json`. O script reproduzível é `automated-gate.mjs`.
