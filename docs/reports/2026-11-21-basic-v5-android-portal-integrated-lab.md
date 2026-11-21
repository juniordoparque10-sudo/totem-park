# BASIC V5 — Android + Portal integrado no LAB

Data: 2026-11-21  
Branch: `codex/player-v73-telemetria-simples-prep`  
Projeto permitido: `demo-totem-basic-hom`

## Checkpoints

- Homologação do Master LAB e aceite de “Acompanhar esta TV”: `5530d5024549f4ce6c525b57c6374d60f318bc43` (45 arquivos BASIC V5).
- Integração Android/Portal LAB: `911ca5ae9a06` (23 arquivos; sem push/deploy).
- Permanecem pendentes a homologação interativa em Android e as nove divergências históricas/inconclusivas registradas no relatório de consolidação.

## Variante Android

- Vite mode: `playerBasicIntegratedLab`.
- Flavor: `playerBasicIntegratedLab`.
- Pacote: `br.com.parksolutions.totempark.player.basicv5integrated`.
- Versão: `versionCode=1`, `versionName=1.0.0-basic-v5-integrated-lab`.
- Build ID embarcado: `911ca5ae9a06`.
- Autostart removido no manifest do flavor; instalação lado a lado; flags, assets e pacote exclusivos.
- Telemetria BASIC e watcher V2 ativados somente com Emulator, projeto exato e flags LAB.
- Heartbeat operacional preservado em 25 segundos.

APK gerado:

`C:\Users\centr\.codex\worktrees\player-v73-telemetria-simples-prep\totem-park\android\app\build\outputs\apk\playerBasicIntegratedLab\debug\app-playerBasicIntegratedLab-debug.apk`

SHA-256: `07C17794B16F8341D17C6E7599CB877AD72346BBC8850ADE36AD16CE57F06634`  
Tamanho: 10.190.726 bytes.

## Identidade e claims

O callable de vínculo existente continua sendo a autoridade. Depois de uma transação de vínculo válida, e somente quando `GCLOUD_PROJECT`/`FIREBASE_CONFIG.projectId` é exatamente `demo-totem-basic-hom`, o Auth Emulator recebe:

- `clientId`;
- `screenId`;
- `role=player`.

O Player força uma renovação do ID token antes de iniciar o listener. Revogação, liberação e substituição removem somente as claims LAB do Player. O teste real de callable no Auth/Firestore/Functions Emulator provou concessão e remoção.

## Portal LAB

Comandos, em terminais separados:

```powershell
npx.cmd --yes firebase-tools emulators:start --project demo-totem-basic-hom --config firebase.basic-v5-lab.json --only auth,firestore,functions,storage
npm.cmd run setup:basic-v5-integrated-lab
npm.cmd run dev:basic-v5-portal-lab
```

Endereço: `http://127.0.0.1:5195/`

Fixture sintética, exclusiva do Emulator:

- Portal: `basic-v5-lab@local.test`
- Senha: `BasicV5-LAB-2026!`
- Cliente: `basic-v5-lab-client`
- Tela: `basic-v5-lab-screen`
- Código de vínculo: `BASICV5LAB`

O script de setup recusa projeto diferente e hosts não locais. Não contém segredo de produção.

## Testes executados

- Contratos novos isolados: 14/14.
- BASIC V5 e watcher, execução sem wrapper: 47/47; o benchmark separado exige Emulator.
- Benchmark no Firestore Emulator: 1/1.
- Matriz final + ponta a ponta Portal→listener Player: 14/14; 17 negativas `permission-denied`; zero evaluation errors.
- Auth/Functions/Firestore Emulator: vínculo concedeu as três claims e revogação removeu as três: 1/1.
- Regressão de identidade, vínculo, heartbeat, telemetria e sessão de reprodução: 25/25.
- Build Web Player integrado: aprovado, 1.976 módulos.
- Build Web Portal LAB: aprovado, 1.976 módulos.
- Gradle `assemblePlayerBasicIntegratedLabDebug` com JDK 21: aprovado, 112 tarefas.
- Manifest do APK conferido por `aapt2`: pacote e versões corretos.
- `git diff --check`: aprovado antes do checkpoint.

Avisos não bloqueantes: chunks Vite históricos, APIs Android depreciadas já existentes e incompatibilidade do JBR 25 com o Gradle atual (build realizado com o JDK 21 instalado).

## Instalação e vínculo

No AVD Android padrão, com os Emulators já ativos:

```powershell
adb install -r "C:\Users\centr\.codex\worktrees\player-v73-telemetria-simples-prep\totem-park\android\app\build\outputs\apk\playerBasicIntegratedLab\debug\app-playerBasicIntegratedLab-debug.apk"
adb shell monkey -p br.com.parksolutions.totempark.player.basicv5integrated 1
```

No aplicativo, informar `BASICV5LAB`. No Portal LAB, entrar com a fixture acima, abrir a tela sintética e selecionar “Acompanhar esta TV”. Confirmar `status=online`, atualização de `lastSeenAt`, `telemetry.profile=BASIC`, blocos de instalação/sessão/conexão/reprodução e encerramento do watcher ao sair.

Para Android físico, este APK específico usa o alias de Emulator Android `10.0.2.2`. É necessário gerar o mesmo flavor com `VITE_EMULATOR_HOST` apontando para o IPv4 LAN da máquina e manter firewall/portas LAB acessíveis; essa recompilação física e a instalação em hardware não foram executadas nesta etapa.

## Preservação e pendências

- Nenhum arquivo do flavor V73, pacote aprovado BASIC, assets aprovados, Portal de produção ou CSS/layout foi alterado.
- Nenhum deploy, push, merge ou acesso a Firebase real foi realizado.
- Os artefatos/rascunhos que já existiam no worktree continuam preservados e fora dos checkpoints.
- Não havia AVD/dispositivo conectado ao `adb`; portanto o APK foi construído e inspecionado, mas não foi instalado nem homologado em hardware.
- A verificação visual conjunta do indicador, reprodução e fechamento no Android permanece pendente; os protocolos correspondentes passaram no Emulator.
