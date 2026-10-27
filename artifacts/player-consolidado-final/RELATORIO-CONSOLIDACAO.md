# Relatório final — Player Android consolidado experimental

## Identidade da candidata

- Arquivo: `Totem-Park-Player-Consolidado-Experimental.apk`
- SHA-256: `36AF5F2159CD1A96B0CB8FB43E9FF038192507C03FFE41F4C398A3D7E827786D`
- Package: `br.com.parksolutions.totempark`
- versionCode: `67`
- versionName: `1.0.0-v67-consolidated-experimental`
- minSdk / targetSdk / compileSdk: `24 / 36 / 36`
- Label: `Totem Park Player CONSOLIDADO EXP`
- Certificado SHA-256: `72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7`
- Certificado: `C=US, O=Android, CN=Android Debug`, assinatura APK Signature Scheme v2

## Compatibilidade com a V51 instalada

A referência foi obtida do Chromecast por `adb shell dumpsys package`, `pm path` e `adb pull`, todos somente leitura. Não houve instalação, remoção, limpeza de dados ou execução de teste físico.

- V51 instalada: package `br.com.parksolutions.totempark`, versionCode `51`, versionName `1.0.0-v51-b1-b2-rc`.
- Fingerprint V51: `72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7`.
- Resultado: package idêntico, certificado idêntico e versionCode crescente (`67 > 51`); a candidata é compatível com atualização in-place, preservando o armazenamento do aplicativo.

## Base e reconstrução

- Base limpa: `ad8e6cd045d3afddc1a4dc890fb141c15c4cb261`.
- Commit-fonte selado da APK: `967771b9c777877e328a939ecf8aed98087349e4`.
- 64 commits reconstruídos locais entre a base e o commit-fonte.
- Inventário completo, evidências e decisão por commit: `docs/consolidacao-player-final/commit-inventory.md`, `evidence-index.md` e `decision-matrix.md`.
- Matriz funcional: `docs/consolidacao-player-final/functional-traceability.md`.

`657398b` e `6fccc71` não são ancestrais da candidata. Previsão do Tempo V2.1, Hora Certa V2.1, TV ao Vivo e o motor experimental de personalização não estão no registro/capabilities nem nos assets empacotados.

## Testes e builds

- Grupo seletivo dos patches reaplicados: 251/251 testes aprovados.
- Gates finais de exclusão, contrato e empacotamento: aprovados.
- Suíte Node local ampla: 630 testes, 624 aprovados e 6 falhas não relacionadas à candidata: quatro resultados do arquivo de integração `player-binding-functions.test.mjs` sem emulador Firestore, além de dois gates históricos (`V56` e página visual `V59`) deliberadamente não importados. Os testes direcionados atuais equivalentes estão verdes.
- Build Web executado duas vezes: 53/53 arquivos com caminhos e SHA-256 idênticos.
- Source set Android: 53/53 arquivos Web idênticos; `bundle-manifest.json` adicional registra o selo.
- Gradle: `:app:assemblePlayerConsolidatedExperimentalRelease`, 190 tarefas, `BUILD SUCCESSFUL`.
- APK: 54/54 arquivos em `assets/public/**` idênticos ao source set Android.
- Busca de código proibido no Web build, source set e APK extraída: zero ocorrências dos identificadores controlados.

## Riscos e pendências objetivas

- A homologação física desta nova candidata ainda não foi executada, por definição: é a próxima etapa manual no Chromecast/TV Samsung.
- O Vite mantém avisos não impeditivos já existentes sobre chunk principal acima de 500 kB e módulos esportivos importados estática e dinamicamente. Não houve refatoração.
- Testes que exigem emuladores Firebase permanecem fora da execução local sem serviço; isso não altera os contratos/rules e nenhuma publicação Firebase foi realizada.
- A assinatura compatível é o certificado debug historicamente usado pela V51 instalada. A compatibilidade foi comprovada por fingerprint; o risco operacional inerente dessa política preexistente não foi ampliado nesta consolidação.

## Garantias de escopo

Foi produzida uma única APK na pasta de entrega. Nenhum `adb install`, deploy, publicação em Produção/Homologação, alteração de Firebase ou modificação da V51 oficial foi executado.
