# Relatório de build Web e assets Android

- Data: 2026-10-26 (America/Sao_Paulo)
- Commit-fonte do build: `8b2cd3762dd044e0740c570f5911b6f0543d5f80`
- Node: `v24.16.0`
- npm: `11.13.0`
- Vite: `8.0.16`
- Java usado no build Gradle: Eclipse Adoptium `21.0.12`
- Modo Vite: `playerConsolidatedExperimental`
- Saída Web: `dist-player-consolidated`
- Source set isolado: `android/app/src/playerConsolidatedExperimental/assets/public`

## Reprodutibilidade

`npm.cmd run build:player-consolidated` foi executado duas vezes, sempre com saída limpa gerenciada pelo Vite. As duas listas ordenadas de 53 caminhos e SHA-256 foram idênticas (`Compare-Object` sem diferenças).

O segundo resultado está registrado em `web-build-hashes.sha256`. O script `prepare-player-consolidated-assets.mjs` substituiu atomicamente o source set isolado e gerou `bundle-manifest.json`; a comparação de todos os 53 arquivos do Web build com os 53 arquivos correspondentes do source set Android não apresentou diferenças. O resultado está em `android-assets-hashes.sha256`.

## Exclusões e avisos

A busca nos dois diretórios finais não encontrou identificadores de Tempo V2.1, Hora Certa V2.1, TV ao Vivo, `web-v2.1-hotfix` ou `dynamic-collections/editor-state`.

O Vite emitiu apenas avisos não impeditivos já conhecidos: dois módulos esportivos são importados tanto estática quanto dinamicamente, e o chunk principal excede 500 kB. Nenhuma otimização/refatoração foi feita, conforme a restrição de preservar comportamentos aprovados.

Nenhum comando de deploy, Firebase, Vercel ou ADB install foi executado. As consultas ADB usadas para obter as identidades instaladas foram somente leitura; o `pull` da V66 copiou sua APK apenas para comparação local de package, versão e certificado.

Após a correção do alvo para `br.com.parksolutions.totempark.player.rcsecurelink`, os dois builds Web foram repetidos e continuaram reproduzíveis (53/53 hashes). O source set foi substituído e conferido (53/53); a APK corrigida contém 54/54 arquivos idênticos, incluindo `bundle-manifest.json`. A V66 instalada e a candidata V67 possuem o mesmo fingerprint de certificado.

O JBR 25 do Android Studio foi rejeitado pelo Gradle 8.14.3 (`Unsupported class file major version 69`). O build foi repetido sem alteração de produto com o JDK 21 já instalado e terminou com sucesso (190 tarefas). Arquivos Gradle derivados do Capacitor foram regenerados/restaurados localmente a partir das mesmas dependências; eles são ignorados pelo Git e não fazem parte do artefato Web selado.
