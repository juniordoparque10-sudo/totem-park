# AUDITORIA ANDROID INSTRUMENTADA 2A.2 — RESULTADO

Este documento registra a implementação e a validação estática da ferramenta de auditoria. Os ensaios físicos permanecem pendentes porque, conforme a regra da tarefa, o APK não foi instalado nem executado em dispositivo nesta etapa.

## 1. Build LAB

- Nome: Totem Park Player LAB
- Package: `br.com.parksolutions.totempark.player.lab`
- Versão: `1.0-player-lab` (`versionCode 1`)
- Flavor: `playerLabDebug`
- APK: `Totem-Park-Player-LAB-2A2-debug.apk`
- Tamanho: 6.559.463 bytes
- SHA-256: `2DB3B104C67995FF43B40A7D73C51D924CFE8E60CA28ED91B27C6AD135C31BD4`
- Assinatura: APK Signature Scheme v2, certificado Android Debug
- Publicação/instalação: não realizada

O Player normal foi compilado como controle. O bundle ativo do APK LAB contém `/diagnostico-lab` e `FILETRANSFER_START`; o bundle ativo do APK `playerDebug` não contém nenhum dos dois marcadores.

## 2. Arquivos alterados

| Arquivo | Motivo |
| --- | --- |
| `.env.playerLab` | Ativar exclusivamente o modo LAB no build Vite. |
| `package.json` | Adicionar os comandos `dev:player-lab` e `build:player-lab`. |
| `android/app/build.gradle` | Criar o flavor `playerLab`, package separado, versão e nome visual LAB. |
| `android/app/src/playerLab/AndroidManifest.xml` | Declarar o nome e launcher de TV exclusivos do LAB. |
| `android/app/src/playerLab/assets/` | Isolar o bundle web instrumentado do diretório comum usado pelo Player. |
| `android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java` | Reconhecer o package LAB como variante Player, sem mudar o ramo do package de produção. |
| `android/app/src/main/java/br/com/parksolutions/totempark/BootReceiver.java` | Reconhecer o package LAB na inicialização de Player. |
| `android/app/src/main/java/br/com/parksolutions/totempark/PlayerBootService.java` | Permitir o serviço já existente no package LAB. |
| `src/android-diagnostics.js` | Centralizar eventos, totais, limite, mascaramento e exportação local. |
| `src/offline-player-cache.js` | Observar stat, cache, FileTransfer, timeout, arquivo final e arquivo parcial. |
| `src/App.jsx` | Observar a origem do `src`, playback e fornecer rota LAB. |
| `src/App.css` | Estilizar apenas a tela e o indicador LAB. |

O workspace já continha alterações anteriores em vários desses arquivos. Nenhuma alteração alheia foi revertida.

## 3. Instrumentação

Fluxo atual mapeado:

```text
playlist
↓
URL da mídia
↓
Filesystem.stat no caminho calculado em Directory.Data
↓
HIT: Capacitor.convertFileSrc(localPath)
MISS: FileTransfer.downloadFile(remoteUrl, localPath)
↓
Filesystem.stat do arquivo final
↓
mapa offline persistido em localStorage
↓
src local no player
```

Caminho alternativo observado:

```text
playlist
↓
URL remota
↓
renderer
```

Como a preparação do cache é assíncrona e o renderer pode receber antes a URL original, os dois caminhos podem se sobrepor. A build registra `POSSIBLE_PARALLEL_REMOTE_PLAYBACK` quando observa `FILETRANSFER_START` e origem remota na mesma janela, sem afirmar bytes duplicados.

Eventos implementados: `SESSION_START`, `APP_RESTART`, `MEDIA_RESOLVE_START`, `LOCAL_FILE_FOUND`, `LOCAL_FILE_NOT_FOUND`, `FILETRANSFER_START`, `FILETRANSFER_COMPLETE`, `FILETRANSFER_FAILED`, `FILETRANSFER_TIMEOUT`, `CACHE_ERROR`, `REMOTE_SRC_ASSIGNED`, `LOCAL_SRC_ASSIGNED`, `PLAYBACK_START`, `PLAYBACK_END`, `PLAYBACK_ERROR`, `NETWORK_OFFLINE`, `NETWORK_ONLINE`, `POSSIBLE_PARALLEL_REMOTE_PLAYBACK`, `DUPLICATE_FILETRANSFER`, `DIAGNOSTIC_EXPORTED` e `DIAGNOSTIC_EXPORT_FAILED`.

`FILETRANSFER_PROGRESS` não foi ativado porque a chamada atual usa `progress: false`; mudá-la contrariaria a exigência de instrumentação passiva. Início, término, duração e tamanho final são registrados. Bytes de reprodução remota ficam como `UNKNOWN`, sem request adicional.

Os registros incluem, quando disponíveis, mídia, nome, URL mascarada, caminho local, arquivo, tamanho, playlist, tela, tentativa, duração, arquivo parcial e concorrência. A sessão inclui versão do app e modelo/Android extraídos passivamente do user-agent da WebView; valores não reconhecíveis ficam como `UNKNOWN`.

## 4. Overhead

- CPU: serialização de eventos pontuais; não há evento por frame nem por segundo.
- Memória: mapas pequenos da sessão para resoluções, origens e downloads ativos.
- Storage: `localStorage`, limitado aos últimos 1.000 eventos e a aproximadamente 1 MB.
- Rede adicional: **0 bytes esperados**, pois não há endpoint, analytics, HEAD ou fetch de medição.
- Exportação: arquivo local `totempark-android-diagnostic.json` em `Directory.Documents`.

## 5. Mídia teste 1

PENDENTE EM DISPOSITIVO. Tamanho, FileTransfer, bytes, origem remota/local e retries devem ser preenchidos pelo JSON exportado após a primeira execução controlada.

## 6. Dez reproduções

PENDENTE EM DISPOSITIVO. O relatório possui contadores separados de `fileTransferStarts`, `remotePlaybackCount` e `localPlaybackCount` por mídia.

## 7. Restart app

PENDENTE EM DISPOSITIVO. A nova sessão registra `APP_RESTART` e preserva o histórico local limitado.

## 8. Restart TV

PENDENTE EM DISPOSITIVO. Requer reinício físico do dispositivo de teste.

## 9. Offline

PENDENTE EM DISPOSITIVO. Transições de rede são registradas localmente como `NETWORK_OFFLINE` e `NETWORK_ONLINE`.

## 10. Restart offline

PENDENTE EM DISPOSITIVO. Deve validar separadamente início do app, disponibilidade da playlist e uso do arquivo local.

## 11. Reconexão

PENDENTE EM DISPOSITIVO. O ensaio deve verificar heartbeat/realtime e ausência de novo FileTransfer para arquivo válido.

## 12. Nova mídia

PENDENTE EM DISPOSITIVO. Os contadores por `mediaId`/URL permitem separar a mídia antiga da nova.

## 13. Vídeo grande

PENDENTE EM DISPOSITIVO. Usar uma mídia de 100–300 MB somente no dispositivo controlado e observar duração, timeout, retry e tamanho final.

## 14. Timeout

PENDENTE EM DISPOSITIVO. A instrumentação preservou os limites atuais de 12 s em Smart TV e 20 s nos demais contextos. Registra timeout, duração, arquivo parcial e `downloadStillRunning: UNKNOWN`, pois a API atual não confirma passivamente o estado após a rejeição do timeout.

## 15. Arquivos parciais

PENDENTE EM DISPOSITIVO. Em falha, a build executa `Filesystem.stat()` antes da limpeza já existente e registra `partialFileExists` e `partialFileSize`; a política original não foi alterada.

## 16. Concorrência

PENDENTE EM DISPOSITIVO. `activeDownloadCount > 1` para a mesma chave gera `DUPLICATE_FILETRANSFER`.

## 17. Diagnóstico principal

**PENDENTE — nenhum diagnóstico principal foi escolhido sem medição real.** A análise estática encontrou uma possibilidade de **ANDROID POSSUI REPRODUÇÃO REMOTA + DOWNLOAD PARA CACHE**, mas isso é hipótese instrumentada, não resultado. A classificação final depende da execução LAB.

## 18. Impacto de tráfego

PENDENTE. Não há base legítima para estimar tráfego Android real antes dos testes. O JSON fornecerá bytes concluídos pelo FileTransfer; bytes remotos não observáveis continuarão `UNKNOWN` e não serão inventados.

## 19. Recomendação para 2A.2 Android

- Instalar somente este APK LAB em um dispositivo de teste controlado, lado a lado com o package de produção.
- Executar na ordem: primeira mídia, dez repetições, restart do app, restart da TV, offline, restart offline, reconexão, nova mídia, vídeo grande e cenário de timeout.
- Exportar o JSON após cada marco ou ao final, preservando o arquivo bruto.
- Manter cache, timeout, retry, renderer, backend e app de produção sem alterações até os resultados reais.
- Prioridade posterior: primeiro tratar qualquer FileTransfer duplicado; depois sobreposição remota; depois retry/timeout e parciais. Só aplicar uma otimização quando o evento e os bytes demonstrarem o problema.
- Risco atual: contagens de playback dependem dos eventos reais da WebView; bytes exatos de reprodução remota não estão disponíveis passivamente.

Validações concluídas: ESLint do módulo de diagnóstico, builds Vite `playerLab` e `player`, sincronização Capacitor, Gradle `assemblePlayerLabDebug` e `assemblePlayerDebug`, assinatura v2, metadados do APK, inspeção dos bundles ativos e `git diff --check`. O aviso de bundle Vite acima de 500 kB permanece não bloqueante. O lint completo do projeto não foi usado como gate porque já contém débitos anteriores fora do escopo.
