# Totem Park Player V73 — relatório da Etapa 2

Data: 2026-11-17  
Branch isolada: `codex/player-v73-telemetria-simples-prep`  
Base aprovada: `544b90c7`  
Escopo Android: flavor `playerRc` (V73)

## Resultado implementado

O Player RC passa a publicar um único envelope `telemetry` com `schemaVersion: 5` e `profile: BASIC`. O flavor histórico `playerTelemetry` continua contendo a implementação avançada recuperável, mas o RC não instancia coleta, histórico, tráfego, cache ou atividade avançados.

O envelope básico contém:

- pacote, `versionCode` e `versionName` lidos pelo plugin do pacote efetivamente instalado;
- `buildId` e `buildTimestamp` incorporados pelo Gradle no `BuildConfig`;
- `installationId` persistente e `installationEpoch` incrementado quando o fingerprint do APK muda, inclusive downgrade;
- `sessionId` novo a cada execução, início, sequência e último heartbeat;
- estado de conexão e instante da mudança;
- cliente, tela e dispositivo vinculados;
- estado de reprodução e playlist ou template ativo.

O fingerprint da instalação combina pacote, código/nome de versão, build e data. Assim, uma sessão antiga não pode representar um APK novo: a troca incrementa o epoch e uma nova execução sempre cria outra sessão. O documento BASIC é substituído como bloco completo, sem mesclar campos avançados legados.

## Comunicação definitiva

O listener Firestore de tela e os comandos remotos permanecem inalterados e em tempo real. Eles não dependem do intervalo do heartbeat.

O heartbeat de 15 segundos foi mantido nesta etapa porque também sustenta presença e o limite de expiração de 45 segundos. Alterá-lo sem mudar o contrato de presença criaria falsos estados offline. Cada ciclo faz uma única atualização atômica do documento de tela com presença e envelope BASIC completo; o coalescedor evita execuções concorrentes. A capacidade do Player conserva sua escrita deduplicada separada.

No RC foram interrompidos:

- consulta Android a `TrafficStats`;
- acumuladores RX/TX e origem LOCAL/REMOTA/HÍBRIDA;
- estatísticas detalhadas de cache;
- atividade remota, outbox e histórico avançado;
- listener de configuração da telemetria avançada.

Reprodução, cache, programação, templates, vínculo e listeners operacionais não foram reconstruídos nem simplificados.

## Arquivos alterados

- `android/app/build.gradle`
- `android/app/src/main/java/com/parksolutions/totempark/TotemDevicePlugin.java`
- `src/App.jsx`
- `src/basic-player-telemetry.js`
- `src/player-basic-heartbeat.js`
- `tests/basic-player-native-metadata.test.js`
- `tests/basic-player-telemetry.test.js`
- `tests/player-basic-telemetry-integration.test.js`
- `docs/superpowers/plans/2026-11-17-player-v73-telemetria-basica.md`
- este relatório

Não houve alteração em CSS, componentes visuais, regras publicadas, Firebase real ou APKs existentes. Nenhum APK foi gerado.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| Testes focados BASIC + heartbeat + compatibilidade avançada | 26/26 passaram |
| Identidade, vínculo local e telemetria operacional legada | 21/21 passaram |
| Regras de identidade no emulador Firestore | 19/19 passaram |
| Funções de vínculo nos emuladores Auth/Firestore/Functions | 3/3 passaram |
| Domínio financeiro não relacionado | 36/36 passaram |
| Integração financeira no emulador Firestore | 6/6 passaram |
| Cache offline de templates após `npm ci` | passou |
| Build Vite `playerRc` | passou (1967 módulos; apenas avisos de chunks) |
| Gradle `:app:generatePlayerRcDebugBuildConfig` com JDK 21 | passou; nenhum APK gerado |
| ESLint dos novos módulos e testes | passou |
| ESLint completo do repositório | interrompido: varre grandes bundles/artefatos versionados e já reporta dívida histórica em `App.jsx` |

A descoberta ampla de todos os arquivos `*.test.*` também foi executada. Ela confirmou os testes novos, mas terminou com contratos históricos não relacionados:

1. `src/telemetry-history.test.js`: normalização parcial espera preservar RX sem TX, enquanto a implementação avançada atual anula ambos. É lógica interna do Portal/telemetria avançada e requer aprovação antes de alteração.
2. `player-consolidated-packaging.test.js`: espera V70, mas a base aprovada contém V73.
3. `player-v56-release-contract.test.js`: espera metadado V56, mas o flavor experimental atual é V57.
4. `player-v56-template-logo.test.js`: expectativa antiga não corresponde ao componente atual.
5. `player-v59-visual-gate.test.js`: fixture/página de validação V59 ausente.
6. `player-binding-functions.test.mjs` falhou somente na descoberta sem emulador; executado pelo script correto com emuladores, passou 3/3.

Portanto, a Etapa 2 não recebe declaração de aprovação integral da suíte histórica. Os testes específicos e operacionais relevantes à mudança passaram; os bloqueios remanescentes estão explicitados acima.

## Compatibilidade e riscos pendentes

- Players antigos continuam escrevendo seus schemas atuais; nenhuma regra ou leitura foi removida.
- O RC substitui o campo `telemetry` inteiro, impedindo que métricas avançadas antigas dentro desse campo pareçam atuais.
- Leituras do Portal que recorram a campos avançados antigos fora de `telemetry`, sem validar `schemaVersion`, `profile`, sessão e epoch, ainda podem exibir dados obsoletos. Corrigir essa interpretação é alteração interna do Portal e não foi feita sem aprovação.
- O heartbeat permanece em 15 segundos. A próxima redução real de tráfego deve separar presença por mudança/TTL de uma eventual confirmação periódica, mantendo o listener de comandos independente.
- O ambiente de Functions avisou que o pacote `firebase-functions` está antigo e que a configuração pede Node 22 enquanto o host usou Node 24; os testes passaram apesar dos avisos.
- `npm ci` das Functions reportou vulnerabilidades de dependências existentes; não foi aplicado `audit fix` para evitar mudança fora de escopo.

## Recomendação para a Etapa 3

Antes de homologação em dispositivo, solicitar aprovação para uma adaptação exclusivamente lógica do Portal: considerar atuais apenas campos compatíveis com `schemaVersion/profile`, `sessionId`, `installationEpoch` e fingerprint do build, sem qualquer alteração visual. Depois disso, medir em TV/laboratório o tráfego inicial, o tráfego contínuo por pelo menos 24 horas, downloads de mídia separados e latência de comandos. A geração de APK de distribuição, instalação em clientes, deploy e publicação continuam fora desta etapa.
