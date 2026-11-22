# Totem Park BASIC V5 Universal — relatório de entrega experimental

Data: 2026-11-22

## Resultado

Foi criada uma variante Android experimental isolada, conectada à configuração de produção e preparada para o fluxo normal de vínculo do Portal. Nenhum deploy, push, vínculo real ou escrita intencional em produção foi executado.

- Flavor: `playerBasicUniversal`
- Pacote: `br.com.parksolutions.totempark.player.basicv5`
- Version code: `5`
- Version name: `5.0.0-basic-v5-universal-test`
- Build ID: `3d07a423faa5`
- Build timestamp: `2026-11-22T12:46:55.714607200Z`
- Android mínimo: API 24
- Heartbeat BASIC ECO: 25 segundos
- APK: `artifacts/basic-v5-universal/TotemPark-BASIC-V5-Teste-Universal-Final.apk`
- SHA-256: `16E19E5F535B657D508F2105C7CE0D89E6ACDA14A7E1A6FCBF8056A593EAF345`

## Isolamento e proteção

O build usa source set, pacote, manifest, assets e configuração Vite próprios. O guard de compilação rejeita flags de Emulator/LAB e exige o modo BASIC de produção. O receiver histórico da V73 não foi ampliado; o manifest universal remove esse receiver e registra somente o receiver isolado do novo pacote. O APK usa assinatura de debug e não é artefato de distribuição.

Commits desta missão:

- `2deebff0e424d7a1c9b9ed0cbb01fbc6ac2406c3` — variante universal, autostart, configuração, assets e testes.
- `3d07a423faa529d3746d54c05db9c88a3954f0d5` — mensagem de saída coerente com o estado do autostart.

## Fluxo observado no AVD

No AVD `Television_1080p`, o pacote foi instalado lado a lado sem remover os aplicativos existentes. A primeira abertura apresentou a seleção de orientação e, em seguida, a tela normal `CONECTAR TV`, com entrada de código do Portal. Não foi usado um código legítimo nesta execução, para evitar alteração de produção; portanto o vínculo de ponta a ponta com uma tela real permanece pendente.

O menu nativo exibiu `Sair`, `Cancelar` e `Configurações`. A preferência de autostart é habilitada por padrão, sobreviveu à reinstalação com `adb install -r` e pode ser desabilitada na tela isolada de configurações.

Após reboot real com a preferência desabilitada, o launcher permaneceu em primeiro plano e a preferência continuou `false`. Após reabilitar e reiniciar, o Logcat registrou `TotemBasicUniversal: Tentativa unica de iniciar o BASIC V5 enviada.`. O aplicativo `player.basichom`, já existente no AVD e com autostart próprio, tomou depois o primeiro plano; ele não foi removido nem modificado.

## Testes e builds

- Suíte focada final: 77 testes aprovados, 0 falhas.
- Build Web universal: aprovado, 1.976 módulos, apenas avisos históricos do Vite.
- Preparação de assets: 53 arquivos verificados com manifesto SHA-256 e rename atômico.
- Build Android: `:app:assemblePlayerBasicUniversalDebug`, 112 tarefas, aprovado.
- Instalação final no AVD: `Success`.
- Metadados instalados confirmados por `dumpsys`: versionCode 5, versionName `5.0.0-basic-v5-universal-test`.

Uma tentativa de incluir `player-binding-functions.test.mjs` fora do Firestore Emulator falhou exclusivamente porque host/porta do Emulator não estavam definidos. A suíte focada independente de Emulator foi repetida e ficou verde. Nenhuma regra ou dado de produção foi usado para contornar essa limitação.

## Pendências para homologação

1. Vincular o APK com um código legítimo e autorizado do Portal e confirmar claims `clientId`, `screenId` e `role=player`.
2. Confirmar em sessão integrada a telemetria BASIC, comandos remotos, observador sob demanda e encerramento.
3. Validar reprodução real de imagem/vídeo, cache offline e reconexão em dispositivo físico.
4. Homologar autostart em cada fabricante, pois restrições de bateria e políticas OEM podem impedir a abertura após boot.
5. Repetir a matriz de regras com o Firestore Emulator explicitamente iniciado quando essa evidência for exigida para a promoção.

Não houve alteração do APK V73, de APK aprovado, do Portal publicado, do Firebase real ou de aplicativos instalados em clientes.
