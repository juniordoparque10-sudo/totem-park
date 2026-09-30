# TOTEM PARK — exportação pública do diagnóstico B v2

**Estado: EXPORTAÇÃO PÚBLICA DO DIAGNÓSTICO — PRONTA PARA TESTE.** Nenhuma instalação, publicação ou teste de 10 minutos foi iniciado nesta etapa.

## Escopo da mudança

O fluxo experimental de reprodução e liberação do decoder do B anterior não foi modificado. Foram alterados somente:

- `src/android-diagnostics.js`: ramo de exportação do build B, sem fallback para `Directory.Data`.
- `src/diagnostic-export.js`: nome único e identificação no topo do JSON.
- `src/App.jsx`: feedback da exportação pública e botão de compartilhar o arquivo recém-salvo no diagnóstico B.
- `android/app/src/playerDecoderExperiment/java/br/com/parksolutions/totempark/DiagnosticExportPlugin.java`: gravação/verificação/compartilhamento nativos.
- `android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java`: registro do plugin apenas quando o package é o do experimento B.
- `android/app/build.gradle`: versionCode 2 para atualização por cima do B anterior.
- `tests/diagnostic-export.test.js`: identificação, horário e nomes distintos.
- `android/app/src/playerDecoderExperiment/assets/public`: bundle atualizado exclusivamente do flavor B.

## Método e comportamento

O plugin usa **MediaStore** em Android 10+. Primeiro tenta `MediaStore.Files` com `RELATIVE_PATH=Documents/TotemPark/`. Se essa criação falhar, tenta `MediaStore.Downloads` com `RELATIVE_PATH=Download/TotemPark/` (diretório público Downloads). Não grava em `/data/user/0` como resultado final.

Após escrever os bytes UTF-8, o plugin remove `IS_PENDING`, relê a URI pública, confere tamanho maior que zero e igual ao conteúdo escrito, e verifica o nome consultando o MediaStore. Só então informa sucesso. Se a tentativa falhar, exclui a entrada incompleta; se as duas pastas falharem, a tela mostra `ERRO DE EXPORTAÇÃO`.

Nome: `totempark-decoder-experiment-YYYYMMDD-HHmmssSSS-<sessionId8>-<nonce>.json`. O topo contém `appVersion`, `packageName`, `buildType`, `sessionId` e `exportedAt`. O botão **Compartilhar JSON** usa a URI da última gravação pública validada, via `ACTION_SEND` e permissão de leitura; não cria outro JSON em memória.

## APK

- [Totem-Park-Player-DECODER-EXPERIMENT-B-EXPORT-v2.apk](./Totem-Park-Player-DECODER-EXPERIMENT-B-EXPORT-v2.apk)
- Package: `br.com.parksolutions.totempark.player.decoderexperiment`
- VersionCode: `2`
- VersionName Android: `1.0-player-decoder-experiment-export2`
- `appVersion` dentro do JSON: `1.0-player-decoder-experiment`
- Tamanho: `6.449.606` bytes
- SHA-256: `1FFB24E2A53A04EA89B87E8821297C4F23F743C6B7FF3E8F9781CA9876DA4F6C`

## Verificação local e limite

- Build Web B: passou.
- Build Android B: passou.
- 22 testes locais relevantes: passaram.
- ESLint dos arquivos JS de exportação: passou.
- `git diff --check`: sem erros de whitespace.
- Não havia TV ou emulador Android conectado por ADB. Portanto, a criação real em `Documents/TotemPark/`, o fallback em `Downloads/TotemPark/` e a abertura do chooser de compartilhamento **ainda não foram comprovados no dispositivo**.

## Primeiro teste físico

Atualizar somente o package experimental B com o APK v2, sem limpar seus dados/cache. Abrir **SALTO · Diagnóstico** e clicar uma vez em **Exportar diagnóstico JSON**. Confirmar o texto `DIAGNÓSTICO EXPORTADO`, nome novo, pasta pública, tamanho, sessão e versão. Abrir esse arquivo no gerenciador da TV e confirmar as cinco chaves de identificação. Fazer uma segunda exportação e conferir que o nome mudou. Testar **Compartilhar JSON** e confirmar que o nome compartilhado é o mesmo da exportação mais recente. Se qualquer etapa falhar, parar; não repetir o teste A/B de 10 minutos.
