# V11 Binary Hotfix — candidata v12

**Status:** candidata compilada e verificada localmente; teste físico pendente. Não distribuir nem promover.

## Base e rastreabilidade

- Baseline operacional: `Totem-Park-Player-ROLLBACK-RC5-v11.apk`, SHA-256 `F67F7D8CA6523D23B263EE854CF3CE6F44EF80DC96C48C9E3B81CF7560B21AE9`.
- Bundle de entrada: `index-C8VMWlD5.js`, SHA-256 `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB`.
- Script reproduzível: `scripts/patch-v11-hotfix.mjs`; recusa qualquer hash de entrada diferente e exige um match exato para cada uma das 10 substituições. O relatório detalhado está em `patch-report.json`.
- Bundle de saída: `index-C8VMWlD5-hotfix.js`, SHA-256 `709BA00A7DC29932AB917EA4617829D9C2E6548BA9232490A5173CE373CF95C0`.
- Script de build isolado: `scripts/build-v11-binary-hotfix.ps1`. Extrai assets do APK v11 original para a pasta stage e aplica o patch ao bundle extraído, sem compilar o source RC5.
- APK candidata: `Totem-Park-Player-V11-BINARY-HOTFIX-CANDIDATE-v12.apk`, SHA-256 `8C01E52C4CEE6A4DE0E6B93C8A1A0DA3896AA1EEA31C0096F89C38B3CE1898BB`.
- Package: `br.com.parksolutions.totempark`; VersionCode `12`; VersionName `1.0.0-v11-binary-hotfix-candidate`.
- Certificado SHA-256: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`, igual ao v11.

## Mudanças cirúrgicas

1. **Startup:** após uma sessão validada, guarda localmente a tela, cliente e playlist já conhecidos. Na abertura seguinte, só usa esse estado se o vínculo local, deviceId, screenId e playlistId coincidirem e cada arquivo local passar por `Filesystem.stat` e validação de tamanho. O Firestore continua ativo em segundo plano. Remoção da tela confirmada pelo servidor e conflito de dispositivo param a reprodução local.
2. **Transição vídeo→vídeo:** pausa o vídeo anterior, remove `src`, chama `load()`, desmonta a camada anterior e só monta o próximo após verificar zero elementos de vídeo remanescentes. Ignora eventos tardios do elemento liberado. As demais transições e o loop de vídeo único seguem o fluxo v11.
3. **Congelamento:** monitora somente o vídeo ativo. Após 30 segundos sem avanço de `currentTime`, tenta `load()`/`play()`. Se não houver progresso após mais 30 segundos, recarrega a página uma única vez, com cooldown persistente de uma hora. Não age com app em segundo plano, pausa, fim, seek ou troca de item.

## Validação local

- Sintaxe do bundle: passou no parser JavaScript.
- Entrada alterada: script recusou por SHA-256, sem gerar saída.
- 10 padrões: todos encontrados exatamente uma vez.
- Gradle `:app:assemblePlayerRollbackDebug`: passou.
- `aapt`: package e versões corretos.
- `apksigner`: assinatura válida e mesmo certificado v11.
- Comparação interna APK v11×v12: 53 assets Web idênticos; diferenças em `index.html` e `sw.js` para carregar o bundle novo; bundle original v11 também permanece byte a byte no APK. Nenhum sidecar de telemetria foi incluído.

## Único teste físico pendente

Na TV Teste, manter dois vídeos visualmente distintos e ambos LOCAL. Instalar v12 por cima do v11 oficial, sem desinstalar nem limpar dados/cache. A primeira abertura da v12 estabelece o snapshot local de tela/playlist após validação normal. Então fazer **um** force stop e abrir, cronometrando até o primeiro frame. Observar A→B→A e eventuais congelamentos; se ocorrer, verificar recuperação automática. Registrar tempo, vídeo ativo, saltos, tela preta, congelamento, redownload e vínculo. Não promover nem ampliar o teste sem esse resultado.
