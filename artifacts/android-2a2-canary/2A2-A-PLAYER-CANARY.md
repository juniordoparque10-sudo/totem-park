# 2A.2-A — PLAYER CANARY

Status: **CANARY APROVADO NO TESTE FÍSICO CONTROLADO**

## 1. Correção de contexto

O suposto problema de itens pulados foi descartado.

A TV de teste possuía várias instâncias/APKs antigos do Totem Park. Após a remoção dessas instâncias, instalação limpa do Player oficial mais recente, novo vínculo e vários ciclos completos, nenhum erro de sequência foi reproduzido.

Portanto, nenhuma alteração de sequência foi implementada. `activePlaylist.items`, `goToNextMedia`, índice, timers, `onEnded`, duração dos itens e realtime relacionado à sequência foram preservados.

## 2. Base oficial utilizada

- Commit registrado no workspace: `b23dea80ed7b676ebfd14c6597f02f4ccac9db27`
- Branch: `main`
- Estado: workspace com evolução não commitada anterior a esta etapa
- Package oficial: `br.com.parksolutions.totempark`
- Version name oficial: `1.0-player`
- Version code oficial: `1`
- APK oficial validado fisicamente: `android/app/build/outputs/apk/player/debug/app-player-debug.apk`
- SHA-256 do APK oficial: `54FBACE09A0551E307C5E5A1BCC7BBE69BEEB7FE05A8A49A1DA3FA00E9D22176`

Como o workspace contém mudanças acumuladas ainda não commitadas, o commit isolado não descreve integralmente o APK validado. O APK oficial e seu SHA-256 são a âncora exata do build físico de referência. Ele não foi regenerado ou substituído nesta etapa.

## 3. Mudanças promovidas do LAB

Somente Local First:

- reconhecer `file://`, `content://`, `capacitor://` e `https://localhost/_capacitor_file_/...` como fontes locais Android;
- priorizar fonte local válida mesmo com internet disponível;
- usar o resultado centralizado do resolver diretamente no renderer de imagem e vídeo;
- manter fallback remoto controlado quando não existe fonte local ou quando a fonte local falha;
- manter `Filesystem.stat` como verificação leve do arquivo em `Directory.Data`;
- preservar FileTransfer existente no cache miss;
- registrar telemetria local leve no CANARY.

Não foram promovidos nome, package ou rota LAB. O CANARY possui identificação, armazenamento diagnóstico, rota e exportação próprios.

## 4. Arquivos alterados

| Arquivo | Mudança | Motivo |
|---|---|---|
| `.env.playerCanary` | Modo `playerCanary`. | Isolar o bundle de homologação. |
| `package.json` | Scripts de desenvolvimento e build CANARY. | Gerar somente o bundle CANARY. |
| `android/app/build.gradle` | Flavor `playerCanary`. | Permitir coexistência com o oficial. |
| `android/app/src/playerCanary/AndroidManifest.xml` | Label e entrada HOME próprios. | Identificar e abrir o CANARY na TV. |
| `android/app/src/playerCanary/assets/public/` | Bundle Web CANARY isolado. | Não sobrescrever assets oficiais. |
| `src/android-media-source.js` | Resolver Local First centralizado. | Garantir `LOCAL VALID > REMOTE`. |
| `src/android-diagnostics.js` | Modo diagnóstico local CANARY. | Homologar sem enviar telemetria. |
| `src/App.jsx` | Reconhecimento do modo CANARY, renderer pelo resolver e fallback controlado. | Promover somente Local First e diagnóstico local. |
| `tests/android-media-source.mjs` | Oito cenários do resolver. | Verificar prioridade local sem sondagens de rede. |

## 5. Sequência

**ALTERADA? NÃO.**

Nenhuma mudança foi feita em `activePlaylist.items`, `goToNextMedia`, `mediaIndex`, timers, `onEnded`, durações, autoplay, ordem ou realtime de sequência.

O teste físico A/B/C/D deverá confirmar múltiplos ciclos na ordem `A, B, C, D` e playlist mista.

## 6. Backend

**ALTERADO? NÃO.**

Nenhuma função, regra, coleção, documento, Storage ou Firebase foi alterado ou publicado.

## 7. Web

**ALTERADA/PUBLICADA? NÃO.**

Nenhum deploy Web ou Service Worker foi realizado. Os assets foram copiados exclusivamente para o source set Android `playerCanary`.

## 8. Timeout/retry

**ALTERADO? NÃO.**

Timeout, retry, arquivos parciais e download manager permanecem como estavam. Esse trabalho continua reservado para a Fase B.

## 9. CANARY

- Nome: Totem Park Player CANARY 2A.2-A
- Package: `br.com.parksolutions.totempark.player.canary`
- Version name: `1.0-player-canary-2a2-a`
- Version code: `1`
- APK: `Totem-Park-Player-CANARY-2A2-A.apk`
- Tamanho: 6.338.218 bytes
- SHA-256: `6C591E75270E88797C43A9ED510201195B6648CFE33D7B0AF78A2033D630DA45`
- Assinatura: APK Signature Scheme v2 válida
- Certificado: Android Debug, SHA-256 `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`
- Instalação: não realizada
- Publicação: não realizada

## 10. Teste cache quente

**APROVADO.** Dez ciclos sem erro após a preparação inicial. O contador remoto permaneceu em 1 e não houve FileTransfer repetido, falha ou timeout.

## 11. Teste mídia nova

**APROVADO PELA PREPARAÇÃO A FRIO.** Como o package CANARY possuía armazenamento próprio inicialmente vazio, seis mídias produziram seis misses e seis downloads concluídos. Houve um fallback remoto inicial; as reproduções posteriores foram locais, sem repetição dos downloads.

## 12. Teste de sequência

**APROVADO.** Nenhum fluxo de sequência foi alterado e os ciclos físicos foram concluídos sem regressão de ordem, item pulado ou repetição indevida relatada.

## 13. Playlist mista

**APROVADO.** A playlist mista foi reproduzida normalmente durante preparação, cache quente, offline, reconexão e long run.

## 14. Reabrir app

**APROVADO.** Nova sessão `2f6fd1a2`; downloads, bytes, misses e remote permaneceram estáveis. Os arquivos persistentes foram reutilizados localmente.

## 15. Offline

**APROVADO PELO PROTOCOLO REDUZIDO.** Três ciclos offline, 18 reproduções locais adicionais, zero redownload, erro, timeout ou tela preta. A redução foi autorizada após dez ciclos iniciais perfeitos.

## 16. Reconexão

**APROVADO.** O status online retornou, três ciclos foram normais, as mídias permaneceram locais e não houve redownload.

## 17. Long run

- Duração registrada da sessão: 76,48 minutos
- Local: 276
- Remote: 1, somente durante preparação inicial
- Downloads: 6, todos da preparação inicial
- Bytes: 19.964.621
- Falhas/timeouts: 0/0
- Eventos de erro: 0
- Resultado: aprovado

## 18. Clientes atuais

**FORAM AFETADOS? NÃO.**

Nenhum APK oficial foi substituído, nenhum cliente foi atualizado e nenhum serviço remoto foi modificado.

## 19. Validações técnicas

- Testes do resolver: 8/8 aprovados.
- ESLint dos módulos `android-media-source.js` e `android-diagnostics.js`: aprovado.
- Vite `build:player-canary`: aprovado; aviso não bloqueante de chunk acima de 500 kB.
- Gradle `assemblePlayerCanaryDebug`: aprovado.
- Package, label, versões e assinatura: aprovados.
- Bundle CANARY contém `/diagnostico-canary` e não contém `/diagnostico-lab`.
- APK oficial permaneceu com SHA-256 `54FBACE09A0551E307C5E5A1BCC7BBE69BEEB7FE05A8A49A1DA3FA00E9D22176`.
- Nenhuma chamada HEAD, fetch, ping ou API foi adicionada para medição.

## 20. Riscos conhecidos

- A primeira reprodução de uma mídia nova pode usar fallback remoto enquanto o FileTransfer prepara o arquivo local.
- Timeout/retry e descarte de downloads parciais permanecem inalterados e serão tratados na Fase B.
- O APK usa assinatura de debug e serve exclusivamente para homologação.
- Timeout/retry e downloads parciais continuam reservados para a Fase B, apesar de não terem apresentado falha nesta homologação.
- Player oficial e CANARY não devem executar simultaneamente contra a mesma tela.

## 21. CONCLUSÃO

**CANARY APROVADO NO TESTE FÍSICO CONTROLADO.**

O APK foi criado e homologado na TV piloto sem publicação ou substituição do Player oficial. A única mudança funcional promovida é:

`CACHE LOCAL VÁLIDO → PLAYER USA LOCAL`.

Após o teste, o CANARY foi encerrado e o Player oficial foi restaurado. A tela piloto ficou online e reproduzindo normalmente.
