# IMPLEMENTAÇÃO 2A.2 ANDROID — FASE A

## 1. Causa raiz

O resultado `0 LOCAL / 546 REMOTE` foi causado principalmente pela classificação da telemetria, não pela escolha funcional do renderer.

`Capacitor.convertFileSrc(fileUri)` transforma um arquivo privado como:

```text
file:///data/user/0/br.com.parksolutions.totempark.player.lab/files/...
```

em uma URL servida internamente pela WebView:

```text
https://localhost/_capacitor_file_/data/user/0/br.com.parksolutions.totempark.player.lab/files/...
```

A instrumentação anterior classificava qualquer `http/https` como remoto. O JSON físico prova que dezenas de eventos rotulados `REMOTE_SRC_ASSIGNED` tinham `src=https://localhost/_capacitor_file_/...`. Portanto, cache hit já estava chegando ao renderer como arquivo local, mas era contado como remoto.

Havia ainda duas fragilidades reais:

1. a decisão de origem estava implícita e duplicada nos renderers de vídeo e imagem;
2. quando um source local falhava, o LAB pulava o item em vez de fazer fallback remoto controlado.

Os erros offline observados são compatíveis com falhas pontuais de reprodução de alguns arquivos locais, não com uma substituição global do source local pela URL Firebase. Timeout/retry de arquivos grandes continua sendo um problema separado da Fase B.

## 2. Fluxo anterior

```text
playlist
↓
collectOfflineAssetUrls
↓
Filesystem.stat em Directory.Data
↓
HIT → Capacitor.convertFileSrc(fileUri)
MISS → FileTransfer → stat → persistência do mapa
↓
applyOfflineAssetUrls substitui preview
↓
renderer recebe preview
↓
telemetria: qualquer http/https = REMOTE (classificação incorreta)
```

Quando o download terminava, `setOfflineAssetMap(result.urlMap)` causava novo render e `applyOfflineAssetUrls` passava a fornecer o proxy local do Capacitor. O fluxo funcional já favorecia esse `preview` local.

## 3. Fluxo novo

```text
playlist
↓
verificação/preparação existente
↓
arquivo válido no mapa local?
├─ SIM → convertFileSrc → resolveAndroidMediaSource → LOCAL → renderer
└─ NÃO → REMOTE_FALLBACK enquanto prepara/falha
                         ↓
                    download termina
                         ↓
                    mapa atualizado
                         ↓
                    próximo render usa LOCAL
```

`resolveAndroidMediaSource()` é a decisão única usada por vídeo e imagem. Ela reconhece `file://`, `content://`, `capacitor://` e qualquer URL cujo path comece com `/_capacitor_file_/` como local, mesmo que a URL use HTTPS e a TV esteja online.

Cada item continua independente; a playlist inteira não aguarda todos os downloads.

## 4. Arquivos alterados

| Arquivo | Mudança | Motivo | Risco |
| --- | --- | --- | --- |
| `src/android-media-source.js` | Função pura de classificação e resolução LOCAL/REMOTE_FALLBACK/PENDING_LOCAL/ERROR. | Centralizar a decisão e reconhecer o proxy local do Capacitor. | Baixo. |
| `src/App.jsx` | Vídeo e imagem usam a mesma resolução; status local correto; fallback remoto LAB quando source local gera erro. | Remover classificação duplicada e permitir recuperação controlada. | Médio, restrito ao APK LAB gerado. |
| `src/android-diagnostics.js` | Namespace novo 2A.2-A, versão nova e chave por URL para unir retries com/sem `mediaId`. | Medir o próximo teste sem contaminar os 546 eventos antigos e evitar fragmentação por mídia. | Baixo, somente LAB. |
| `tests/android-media-source.mjs` | Oito testes de local, remoto, online/offline, reconexão, imagem, vídeo e itens independentes. | Validar a decisão sem rede adicional. | Nenhum em runtime. |
| `android/app/build.gradle` | VersionName e label do flavor LAB atualizados. | Distinguir claramente o canary 2A.2-A. | Baixo. |
| `android/app/src/playerLab/AndroidManifest.xml` | Label `Totem Park Player LAB 2A.2-A`. | Identificação visual. | Baixo. |
| `android/app/src/playerLab/assets/` | Bundle LAB atualizado isoladamente. | Empacotar somente a variante de homologação. | Baixo. |

O workspace já continha alterações anteriores nesses arquivos. Nenhuma mudança alheia foi revertida.

## 5. Local First

Regra aplicada:

- source convertido pelo Capacitor é LOCAL, mesmo usando `https://localhost`;
- `remotePreview` permanece apenas como referência/fallback;
- internet online não muda uma decisão LOCAL;
- imagem e vídeo usam exatamente a mesma classificação;
- o mapa atualizado depois do download provoca novo render e futuras apresentações usam o caminho local.

Validação mínima do arquivo permanece no fluxo existente: `Filesystem.stat()` precisa ter sucesso e o caminho só entra no mapa após stat. A implementação não lê arquivos inteiros e não adiciona hash obrigatório.

## 6. Remote fallback

Pode ocorrer quando:

- não existe arquivo local no mapa;
- a primeira preparação ainda não terminou;
- o FileTransfer falhou/temporizou;
- um source local do LAB disparou erro de reprodução.

No último caso, somente a entrada daquela mídia é removida do mapa em memória da sessão e o renderer tenta `remotePreview`. O arquivo não é apagado e pode ser tentado novamente após reabrir o app.

## 7. FileTransfer

Preservado sem reestruturação:

- mesma API `FileTransfer.downloadFile()`;
- mesma ordem mkdir/stat/getUri/download/stat;
- mesma persistência em `Directory.Data`;
- mesmo mapa em localStorage;
- mesma limpeza existente;
- sem HEAD, fetch, ping ou request de telemetria.

Não foi criado single-flight global ou novo download manager.

## 8. Timeout

**NÃO ALTERADO.** Permanecem 12 segundos em Smart TV e 20 segundos nos demais contextos. Os 6 timeouts e 469 MB de parciais observados continuam registrados como **2A.2 Android — Fase B**.

## 9. Backend

**NÃO ALTERADO.** Nenhuma API, Firebase, Firestore, Storage, regra, collection, migration, heartbeat ou estrutura de dados foi modificada.

## 10. Web

**NÃO ALTERADO operacionalmente.** Nenhum Player Web, Service Worker, deploy ou publicação foi realizado. A nova resolução preserva URLs HTTP remotas no mesmo fallback e foi empacotada somente nos assets do flavor LAB.

## 11. Clientes atuais

**FORAM AFETADOS? NÃO.**

- nenhum APK oficial foi recompilado, instalado ou substituído;
- nenhum deploy foi realizado;
- nenhum backend/configuração remota mudou;
- nenhuma TV ou cliente real foi alterado;
- o Player oficial permaneceu online após o teste anterior.

## 12. Build LAB

- Nome: `Totem Park Player LAB 2A.2-A`
- Arquivo: `Totem-Park-Player-LAB-2A2-A.apk`
- Package: `br.com.parksolutions.totempark.player.lab`
- VersionCode: `1`
- VersionName: `1.0-player-lab-2a2-a`
- Tamanho: 6.262.330 bytes
- SHA-256: `B563894478681443F1D97D899E2418CA33C6B229FB17658C87AA81FF22C5AC62`
- Assinatura: Android Debug, APK Signature Scheme v2 válida
- Instalação/publicação: não realizada

## 13. Testes

- Testes unitários da resolução: **8/8 passaram**.
- Casos cobertos: convertFileSrc HTTPS local, file/content URI, arquivo existente online, offline/reconexão, imagem/vídeo, playlist por item, fallback remoto, pending/error.
- Vite `build:player-lab`: **passou**; aviso não bloqueante de chunk acima de 500 kB.
- Gradle `assemblePlayerLabDebug`: **passou**.
- APK: package, label, versão, bundle ativo e assinatura v2 verificados.
- Bundle ativo contém resolver, namespace de telemetria 2A.2-A e rota `/diagnostico-lab`.
- `git diff --check`: **passou**, apenas avisos de futura normalização LF/CRLF.
- ESLint dos módulos novos/isolados: **passou**.
- ESLint incluindo `App.jsx`: **não está limpo**; retornou 72 problemas preexistentes no arquivo monolítico. Nenhum erro foi reportado nos dois módulos da Fase A. O build de produção LAB passou.

## 14. Riscos conhecidos

1. A conclusão anterior de 546 reproduções remotas estava inflada pela classificação incorreta; o próximo teste físico deve medir novamente do zero.
2. Alguns vídeos locais geraram `PLAYBACK_ERROR` no teste anterior. O fallback preserva disponibilidade online, mas offline esses arquivos ainda podem falhar por formato/codec ou comportamento da WebView.
3. Timeout/retry de vídeos de 80–300 MB não foi corrigido nesta fase.
4. O package LAB é o mesmo do LAB anterior; instalar este APK o atualiza e preserva cache/vínculo, enquanto a telemetria 2A.2-A começa em namespace novo.
5. A UI de diagnóstico ainda não rolou no dispositivo testado; exportação por foco/teclado funcionou.
6. A aprovação final depende dos testes físicos A–E solicitados.

## 15. Gate para teste físico

**PRONTO PARA INSTALAR SOMENTE NA TV DE HOMOLOGAÇÃO, COM AS MESMAS RESSALVAS DE ISOLAMENTO.**

O APK não foi instalado automaticamente. Antes do teste:

1. forçar parada do Player oficial;
2. aguardar 60 segundos;
3. atualizar somente o package LAB;
4. não definir LAB como HOME/administrador;
5. executar os testes A–E;
6. exportar o novo JSON;
7. restaurar o Player oficial ao terminar.

Critério de aprovação física principal: dez apresentações de mídia preparada devem resultar em FileTransfer adicional 0, Remote adicional 0 e Local +10. Como a telemetria agora reconhece corretamente `_capacitor_file_`, essa comparação será válida.

## Rollback

- Base Git observada antes da Fase A: `b23dea80ed7b676ebfd14c6597f02f4ccac9db27` (`main`).
- Não foi criado commit porque o workspace já possuía muitas alterações não relacionadas.
- Rollback operacional: não distribuir o APK.
- Rollback de código: reverter somente as alterações listadas na seção 4, preservando todas as mudanças anteriores do workspace.

