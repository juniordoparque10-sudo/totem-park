# AUDITORIA DE ISOLAMENTO — PLAYER LAB

Escopo: análise somente leitura do APK LAB já gerado, do APK local `playerDebug`, dos manifests mesclados, código e dependências presentes no workspace. Nenhum código, APK, dispositivo, backend ou configuração foi alterado. O APK oficial publicado nos clientes não está disponível no workspace; por isso, a assinatura aqui comparada é a do APK local de controle `playerDebug`, e não uma certificação criptográfica do binário instalado nos clientes.

## 1. Package oficial

`br.com.parksolutions.totempark`

APK auditado: `android/app/build/outputs/apk/player/debug/app-player-debug.apk`.

## 2. Package LAB

`br.com.parksolutions.totempark.player.lab`

Resultado: `oficial != lab`. O LAB é uma instalação Android distinta e não é interpretado como atualização do Player oficial.

## 3. Assinaturas

| APK | Certificado | SHA-256 do certificado | Schemes |
| --- | --- | --- | --- |
| Player local de controle | `C=US, O=Android, CN=Android Debug` | `72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7` | v2: sim; v1/v3/v4: não |
| Player LAB | `C=US, O=Android, CN=Android Debug` | `72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7` | v2: sim; v1/v3/v4: não |

Os dois artefatos locais usam a mesma chave debug. Isso não impede coexistência porque os packages são diferentes. Também não concede acesso automático aos dados privados do outro app: não existe `sharedUserId` e o sandbox continua definido pelo UID atribuído a cada package. A assinatura do APK oficial efetivamente publicado não foi fornecida para comparação.

## 4. Versionamento

| App | versionCode | versionName |
| --- | ---: | --- |
| Player oficial local | 1 | `1.0-player` |
| Player LAB | 1 | `1.0-player-lab` |

O Android só compara versionamento dentro do mesmo package. O versionCode igual não transforma o LAB em atualização do oficial.

## 5. SharedUserId

**NÃO EXISTE.** Não foi encontrado `android:sharedUserId`, `sharedUserId`, UID compartilhado nem mecanismo equivalente nos manifests fonte/mesclados, Gradle ou código auditado.

## 6. Internal storage

Os packages recebem UIDs e diretórios privados separados:

- Oficial: `/data/user/0/br.com.parksolutions.totempark/` (alias histórico possível: `/data/data/br.com.parksolutions.totempark/`).
- LAB: `/data/user/0/br.com.parksolutions.totempark.player.lab/` (alias histórico possível: `/data/data/br.com.parksolutions.totempark.player.lab/`).

`files`, `cache`, bancos, SharedPreferences e dados internos permanecem dentro do sandbox correspondente. Um app comum não acessa o diretório privado do outro.

## 7. Directory.Data

O plugin `@capacitor/filesystem` resolve `Directory.Data` para `Context.filesDir` no Android.

- Oficial esperado: `/data/user/0/br.com.parksolutions.totempark/files/totem-park/offline/{scope}/...`
- LAB esperado: `/data/user/0/br.com.parksolutions.totempark.player.lab/files/totem-park/offline/{scope}/...`

Portanto, `LAB Directory.Data != Player oficial Directory.Data`. O nome relativo igual não causa colisão porque a raiz privada muda com o package.

## 8. External/shared storage

O cache de mídias usa exclusivamente `Directory.Data`, portanto fica privado por app. Não foram encontrados caminhos de cache hardcoded para `/sdcard`, `/storage/emulated/0` ou `/Android/data`.

A única escrita pública identificada é a exportação manual LAB de `totempark-android-diagnostic.json` em `Directory.Documents`. No Android, Documents é armazenamento público/compartilhado conforme a versão e permissões do sistema. O nome é fixo, mas o Player oficial não cria esse relatório; o risco é sobrescrever uma exportação LAB anterior, não o cache ou dados do Player oficial.

## 9. WebView/localStorage/IndexedDB

O motor Android System WebView é compartilhado como componente do sistema, mas os dados da WebView pertencem ao sandbox/processo de cada package. Não há `setDataDirectorySuffix`; ele não é necessário entre aplicações com UIDs diferentes.

Ficam separados por package:

- `localStorage`, incluindo `totempark-device-id` e vínculo da TV;
- IndexedDB e persistência local do Firestore;
- cookies e SharedPreferences do WebView;
- Cache Storage;
- mapa de arquivos offline.

Os dois `capacitor.config.json` contêm o mesmo `appId` lógico, mas o APK LAB tem `applicationId` Android efetivo distinto. O isolamento nativo e da WebView é determinado pelo package/UID instalado.

## 10. Firebase/backend

LAB e oficial apontam para o mesmo projeto Firebase:

- Project ID: `totem-park`
- Auth domain: `totem-park.firebaseapp.com`
- Storage bucket: `totem-park.firebasestorage.app`

O armazenamento local é separado, mas Firestore, Auth e Storage remotos são os mesmos. Ambos podem escrever heartbeat, `connectedDeviceId`, `lastSeenAt`, status, localização, comandos, cache status e now playing. Essa é a principal superfície de interferência lógica.

## 11. Device ID

O `deviceId` é um UUID aleatório criado por `getTotemDeviceId()` e armazenado em `localStorage` sob `totempark-device-id`. Não é derivado do hardware.

Como o `localStorage` é separado, o oficial e o LAB recebem IDs distintos, mesmo na mesma TV. Eles aparecem para o backend como dispositivos diferentes.

## 12. Vínculo da tela

Se ambos forem vinculados simultaneamente à `KEYFRK`, haverá disputa lógica:

- cada app tem `deviceId` diferente;
- o vínculo inicial rejeita outro dispositivo quando o heartbeat anterior tem até 60 segundos;
- cada heartbeat ocorre a cada 15 segundos e grava `connectedDeviceId`, status e `lastSeenAt`;
- os listeners podem devolver um app à tela de código quando detectarem o outro ID;
- now playing, localização, status, comandos e liberação do vínculo podem alternar ou ser recusados;
- comandos remotos podem ser consumidos pelo app que estiver ativo e vinculado.

**Não executar oficial e LAB simultaneamente e não vincular ambos à mesma tela.**

## 13. Boot/auto start

Ambos declaram:

- activity e alias com `HOME`;
- `LAUNCHER` e `LEANBACK_LAUNCHER`;
- `BootReceiver` habilitado;
- `BOOT_COMPLETED`, `LOCKED_BOOT_COMPLETED`, `QUICKBOOT_POWERON`, `SCREEN_ON`, `USER_PRESENT`, `DREAMING_STOPPED` e `MY_PACKAGE_REPLACED`;
- `PlayerBootService`.

Assim, os dois podem tentar iniciar no boot, ao acender a tela ou ao sair do modo de descanso. Também podem aparecer como candidatos a launcher HOME. Isso é **risco operacional alto**, ainda que não exista corrupção de storage.

Se o oficial for Device Owner, somente ele deve conseguir estabelecer o modo kiosk persistente. O operador não deve tornar o LAB administrador do dispositivo, Device Owner ou launcher padrão.

## 14. Providers/authorities

Não existe FileProvider. O único provider mesclado é `androidx.startup.InitializationProvider`:

- Oficial: `br.com.parksolutions.totempark.androidx-startup`
- LAB: `br.com.parksolutions.totempark.player.lab.androidx-startup`

As authorities são únicas. A permissão dinâmica gerada também usa o applicationId de cada APK:

- `br.com.parksolutions.totempark.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
- `br.com.parksolutions.totempark.player.lab.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`

Não foi encontrado conflito de provider, authority ou permissão customizada. Ambos usam a mesma configuração de rede por app (`usesCleartextTraffic=true`); isso não altera configuração global do Android.

## 15. Cache de mídias

### O Player LAB consegue ver arquivos já baixados pelo Player oficial?

**NÃO**, no funcionamento normal auditado.

Os arquivos nativos ficam em `Context.filesDir` de packages diferentes. Cache Storage, localStorage e mapa offline também são separados pela WebView de cada app. O caminho relativo `totem-park/offline/{scope}` é igual, mas sua raiz física é diferente.

## 16. ClearCache

**NÃO afeta o Player oficial.**

O comando remoto `clearCache` encontrado manipula o Cache Storage e os metadados da WebView do app que o executa; ele não percorre o sandbox do oficial. As rotinas de preparação e descarte de arquivos nativos, quando executadas, usam `Directory.Data` do próprio package. O LAB não possui caminho ou permissão para limpar o sandbox do oficial.

Ressalva: como o backend é compartilhado, um comando remoto dirigido à mesma tela pode ser observado pelo app vinculado naquele momento. O efeito local continua restrito ao app que o processar.

## 17. Desinstalação do LAB

Desinstalar `br.com.parksolutions.totempark.player.lab` remove dados privados, files, cache, preferences, WebView e vínculo local do LAB. O package e os dados privados do Player oficial permanecem intactos.

O arquivo exportado manualmente para Documents pode permanecer por ser público. Se o LAB tiver sido escolhido como HOME, o Android poderá solicitar nova seleção de launcher após a remoção. Não ativar administração do dispositivo para o LAB evita restrições adicionais à desinstalação.

## 18. Atualização futura do Player oficial

O LAB não participa da atualização do package `br.com.parksolutions.totempark`. Package, versionCode, assinatura e dados do LAB são independentes. Não há authority fixa concorrente nem shared UID.

Resposta: **não deve impedir nem alterar futuras atualizações do Player oficial**. A assinatura do APK oficial publicado ainda precisa continuar compatível com a própria versão anterior, uma condição independente do LAB.

## 19. Atualização futura do LAB

Builds futuras com package `br.com.parksolutions.totempark.player.lab` atualizarão o LAB se tiverem versionCode aceito e forem assinadas com a mesma chave. Este APK usa chave debug; perder ou trocar essa chave exigirá desinstalar o LAB antes de instalar uma build incompatível. Isso não afeta o oficial.

## 20. Coexistência

| Situação | Seguro? | Risco |
| --- | --- | --- |
| Oficial instalado + LAB instalado, apenas oficial aberto | Sim, com ressalvas | LAB ainda possui receivers de boot/tela; manter forçado a parar. |
| Oficial instalado + LAB instalado, apenas LAB aberto | Sim, em TV controlada | Fechar/forçar parada do oficial e não usar a mesma tela ativa. |
| Oficial + LAB rodando simultaneamente | Não | Disputa de foreground, HOME, heartbeat e vínculo remoto. |
| Reinício da TV com ambos instalados | Não recomendado | Ambos podem iniciar automaticamente e competir. |
| Desinstalar LAB | Sim | Dados privados do oficial permanecem; launcher pode pedir seleção se LAB foi HOME. |
| Atualizar oficial | Sim | Package independente; exige apenas assinatura compatível do próprio oficial. |
| Atualizar LAB | Sim, com chave compatível | Mesma regra normal de assinatura/versionCode do package LAB. |

## 21. Riscos

Classificação geral: **ALTO operacional / BAIXO para corrupção de dados locais**.

Riscos principais:

1. boot e eventos de tela podem iniciar ambos;
2. ambos são candidatos a HOME/launcher;
3. o backend Firebase é compartilhado;
4. IDs distintos disputam a mesma tela se o código for reutilizado;
5. o APK oficial publicado não estava disponível para comparar sua assinatura real;
6. `allowBackup=true` existe em ambos, embora backups continuem associados aos packages distintos;
7. o relatório LAB exportado para Documents é público e pode permanecer após desinstalação.

Não foram encontrados riscos críticos de instalação, authority, shared UID, cache compartilhado ou limpeza cruzada.

## 22. CONCLUSÃO

### SEGURO COM RESSALVAS

O LAB é realmente isolado do oficial quanto a package, UID, armazenamento interno, WebView, cache de mídia, providers e atualizações. Ele pode ser instalado lado a lado sem substituir o Player oficial.

O isolamento não existe no backend e na operação de launcher/boot. Portanto, ele só é seguro em TV de teste controlada, com execução exclusiva e sem reutilizar uma tela que esteja ativa no Player oficial. Não é seguro manter os dois rodando simultaneamente nem reiniciar a TV com ambos liberados para auto start.

## 23. REGRAS DE USO

1. Usar somente uma TV de teste sob controle direto.
2. Antes de abrir o LAB, entrar nas configurações Android e **Forçar parada** no Player oficial.
3. Não desinstalar nem limpar dados/cache do Player oficial.
4. Não definir o LAB como launcher HOME padrão.
5. Não conceder ao LAB administração do dispositivo, Device Owner ou modo kiosk.
6. Não vincular o LAB à `KEYFRK` enquanto o Player oficial dessa tela estiver aberto ou com heartbeat recente.
7. Preferir uma tela/código de teste exclusivo. Se isso não existir, manter o oficial forçado a parar durante todo o ensaio e aguardar pelo menos 60 segundos antes de vincular o LAB.
8. Não abrir os dois apps simultaneamente.
9. Não reiniciar, suspender ou desligar/ligar a TV durante o teste, exceto quando o roteiro exigir explicitamente o teste de boot; antes desse teste, impedir manualmente a execução do oficial.
10. Durante restart/boot controlado, observar qual app assume o foreground e interromper o ensaio se ambos abrirem.
11. Ao terminar, liberar/desvincular a tela dentro do LAB quando possível, fechar e **Forçar parada** no LAB.
12. Reabrir manualmente o Player oficial e confirmar seu vínculo/heartbeat antes de devolver a TV ao uso normal.
13. Desinstalar o LAB ao concluir a auditoria se não houver novo teste imediato.
14. Se um arquivo de diagnóstico tiver sido exportado, removê-lo manualmente de Documents quando não for mais necessário.
