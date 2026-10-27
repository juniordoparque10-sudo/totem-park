# Hotfix V67 — regressão no splash

## Causa raiz

A proteção de bootstrap posterior à V66 passou a tratar um snapshot negativo vindo somente do cache como `status: waiting`, corretamente sem apagar o cliente nem liberar `clientLoading`. Porém, a integração em `PlayerPage` chamava a confirmação direta (`getDocFromServer`) apenas para `status: confirming`, produzido por negativo remoto. No cenário físico sem cliente em cache, o primeiro evento `exists:false/fromCache:true` podia ser o único callback do listener; assim, nenhuma confirmação remota era iniciada e o gate permanecia fechado indefinidamente.

A V66 liberava o gate no primeiro snapshot, inclusive negativo de cache. O hotfix não restaura esse comportamento inseguro: mantém o gate fechado e solicita uma confirmação remota single-flight. Somente a confirmação positiva popula o cliente e libera o gate. Não há timeout arbitrário nem bypass da validação de vínculo.

## Alterações

- `src/player-bootstrap-client.js`: o resultado de cache miss sem escrita pendente e sem cliente retido sinaliza `needsServerConfirmation`.
- `src/App.jsx`: a confirmação direta é acionada por esse sinal, reutilizando o coordenador existente e suas proteções de escopo/stale callback.
- `tests/player-bootstrap-client.test.js`: regressão cache negativo inicial → confirmação remota positiva → cliente resolvido.
- `android/app/build.gradle` e `.env.playerConsolidatedExperimental`: hotfix atualizável com versionCode 68/versionName `1.0.0-v67.1-splash-hotfix-experimental`.
- `src/templates-v2/player-capability.js`, `src/templates-v2/playlist-capability.js` e testes: V67/V68 preservam o contrato `rcsecurelink`; V69 desconhecida continua bloqueada.

Nenhuma alteração foi feita no vínculo, persistência, cache de mídia, playlist, telemetria, reprodução offline, Portal, templates, Firebase ou package ID.

## Testes e empacotamento

- Teste novo observado em RED antes da correção e depois em GREEN.
- Regressões direcionadas de bootstrap, Local First, playlist, cache offline, contratos e empacotamento: 52/52 aprovadas.
- Suíte Node local aplicável: 621/621 aprovadas. Foram excluídos somente testes dependentes de emuladores e os dois gates históricos V56/V59 já documentados.
- Build Gradle: `BUILD SUCCESSFUL`, variante `playerConsolidatedExperimentalRelease`.
- Build Web reproduzível: 53/53 arquivos idênticos em duas execuções.
- Web → source set Android: 53/53 hashes idênticos.
- Source set Android → APK: 54/54 hashes idênticos, incluindo `bundle-manifest.json`.

## APK

- Arquivo: `Totem-Park-Player-Consolidado-Experimental.apk`
- Package: `br.com.parksolutions.totempark.player.rcsecurelink`
- versionCode: `68`
- versionName: `1.0.0-v67.1-splash-hotfix-experimental`
- SHA-256: `144265925A2363401351D9857755D04977E5C0B6F214D68329155DCE2D4D74AC`
- Certificado SHA-256: `72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7`

O package e o certificado são os mesmos da V66/V67 experimental, e `68 > 67`; portanto, a APK é compatível com atualização in-place sem desinstalação. Nenhuma instalação ou publicação foi executada.
