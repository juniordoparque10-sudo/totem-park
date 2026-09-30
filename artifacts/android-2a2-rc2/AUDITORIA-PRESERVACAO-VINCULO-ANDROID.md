# AUDITORIA DE PRESERVAÇÃO DO VÍNCULO ANDROID

Data: 21/09/2026  
Escopo: auditoria estática, somente leitura. Nenhum código, APK, dado local, Firebase, backend ou cache foi alterado.

## 1. Fonte de verdade local

A fonte de verdade local do vínculo é a chave `totempark-tv-connection` no `localStorage` da WebView do aplicativo. O valor é JSON com `clientId`, `code` e `deviceId`.

Não existe uso de Capacitor Preferences ou SharedPreferences para o vínculo. IndexedDB/Filesystem e arquivos nativos são usados pelo cache de mídia, não pelo vínculo da tela.

O `screenId` não é persistido localmente. Ele é resolvido a cada abertura pelo documento `tv_codes/{code}`; se necessário, há fallback por consulta à coleção `clients/{clientId}/screens` usando o campo `code`.

## 2. Chaves persistidas

| Chave/dado | Storage | Conteúdo/finalidade | Escrita | Leitura | Remoção |
|---|---|---|---|---|---|
| `totempark-tv-connection` | `localStorage` | `{ clientId, code, deviceId }` | `finishConnection` e `handleScreenData` | `PlayerOnlyApp`, `TVConnectPage`, `PlayerPage` | parse inválido, ações manuais e `goBackToTvCode` |
| `totempark-device-id` | `localStorage` | UUID do dispositivo | `getTotemDeviceId`, somente quando ausente | `getTotemDeviceId` | nenhuma remoção encontrada |
| `totempark-screen-rotation` | `localStorage` | orientação escolhida | fluxo de orientação | boot do Player | nenhuma remoção encontrada |
| `totempark-app-mode` | `localStorage` | modo gestor/TV do app híbrido | seleção de modo | app híbrido | logout, troca de modo e `goBackToTvCode` |
| `totempark-offline-assets-{clientId}-{code}` | `localStorage` | metadados de cache por tela | módulo de cache | Player/cache | limpeza de cache de mídia; não remove vínculo |
| `connectedDeviceId` | Firestore, documento da tela | proprietário remoto atual do vínculo | conexão e heartbeat | conexão, validação, liberação | comando `exitTv` ou liberação explícita |
| `activeDeviceId` | Firestore, legado | identificador legado | não é mantido pelo Player atual | status/compatibilidade | removido ao conectar, no heartbeat e ao liberar |

## 3. Fluxo de criação

1. O usuário informa o código.
2. `handleConnect` lê `tv_codes/{CODE}`.
3. Obtém `clientId` e `screenId`, além de metadados de nome.
4. Gera ou reutiliza `totempark-device-id`.
5. Lê `clients/{clientId}/screens/{screenId}` em transação.
6. Se houver outro `connectedDeviceId` visto nos últimos 60 segundos, interrompe e mostra tela em uso.
7. Caso contrário, grava remotamente `connectedDeviceId`, remove `activeDeviceId`, marca `status: online`, limpa comando remoto e atualiza `lastSeenAt`.
8. `finishConnection` persiste `{ clientId, code, deviceId }` em `totempark-tv-connection`.
9. Navega para `/player/{clientId}/{code}`.

O documento `tv_codes/{code}` contém `code`, `clientId`, `screenId`, `screenName`, `clientName` e `updatedAt`.

## 4. Fluxo de leitura

No boot, `PlayerOnlyApp` lê e interpreta `totempark-tv-connection`. Se houver `clientId` e `code`, navega diretamente para o Player. Se a chave não existir ou não tiver esses campos, abre a tela de código. JSON inválido provoca remoção imediata da chave.

No Player, o vínculo salvo é lido novamente para permitir recuperação quando o `connectedDeviceId` remoto coincide com o `deviceId` anteriormente persistido. Em seguida, o app tenta resolver o documento remoto pelo código e assina o documento da tela.

O aplicativo considera que não pode confirmar a tela quando ocorre qualquer uma destas situações:

- `tv_codes/{code}` não existe ou não contém `screenId` e a consulta alternativa retorna vazia;
- o documento da tela deixa de existir;
- a leitura inicial ou o listener retorna erro;
- existe `connectedDeviceId` diferente, com `lastSeenAt` de até 60 segundos, sem possibilidade de recuperar o vínculo salvo.

Todas essas situações agendam o mesmo retorno à tela de código em 10 segundos no app nativo.

## 5. Fluxo de validação

Os identificadores locais `clientId` e `code` determinam o caminho remoto. A validação efetiva usa:

- existência de `tv_codes/{code}` e seu `screenId`;
- existência do documento `clients/{clientId}/screens/{screenId}`;
- `connectedDeviceId` remoto;
- `lastSeenAt`, com janela recente de 60 segundos;
- `totempark-device-id` local;
- `deviceId` salvo dentro de `totempark-tv-connection`.

O código não exige um evento remoto explícito de desvinculação antes de apagar o vínculo local.

## 6. Pontos que removem vínculo

| Arquivo | Função/local | Condição | Efeito |
|---|---|---|---|
| `src/App.jsx` | inicialização de `PlayerOnlyApp` | JSON salvo inválido | remove `totempark-tv-connection` |
| `src/App.jsx` | efeito de `TVConnectPage` | JSON salvo inválido | remove `totempark-tv-connection` |
| `src/App.jsx` | botão “Digitar outro código” | ação explícita do usuário | remove vínculo |
| `src/App.jsx` | voltar ao painel/trocar modo | ação explícita do usuário | remove vínculo e modo |
| `src/App.jsx` | `goBackToTvCode` | chamada direta ou retorno agendado | remove vínculo e modo; navega para `/tv` |
| `src/App.jsx` | `scheduleReturnToCodeScreen` | documento ausente, consulta vazia, erro de `getDoc`/`onSnapshot`, ou conflito recente de dispositivo | após 10 s chama `goBackToTvCode` e remove vínculo |
| `src/App.jsx` | comando remoto `exitTv` | comando recente e pendente | libera campos remotos e chama `goBackToTvCode` |
| `src/App.jsx` | botão “Sair da TV” | ação explícita do usuário | libera campos remotos e chama `goBackToTvCode` |

Há dois `removeItem` adicionais em um bloco antigo comentado; eles não são executáveis.

Não há `localStorage.clear`, `Preferences.clear`, `Preferences.remove`, limpeza de WebView ou limpeza de dados em `MainActivity`, `BootReceiver` ou `PlayerBootService`.

## 7. Firebase

Campos remotos envolvidos na identidade/continuidade:

- em `tv_codes`: `code`, `clientId`, `screenId`;
- no documento da tela: `code`, `connectedDeviceId`, `activeDeviceId`, `lastSeenAt`, `status`, `remoteCommand`, `commandStatus`;
- para operação do Player: `playlistId`, revisões e demais dados de conteúdo, sem decidir a preservação local do vínculo.

O documento remoto realmente excluído, uma consulta temporariamente vazia, erro de permissão, indisponibilidade e conflito de dispositivo convergem para o mesmo retorno destrutivo. O código não distingue esses estados de modo seguro.

## 8. `connectedDeviceId`

- É gravado na conexão inicial com o UUID de `totempark-device-id`.
- É regravado a cada heartbeat de 15 segundos e nos eventos `online`/visibilidade.
- É comparado ao UUID local durante o listener do documento da tela.
- Se for diferente e o `lastSeenAt` estiver dentro de 60 segundos, o Player agenda remoção local após 10 segundos.
- A recuperação especial só funciona quando o `deviceId` salvo no vínculo local é exatamente igual ao `connectedDeviceId` remoto.
- `exitTv` e `releaseCurrentScreen` removem `connectedDeviceId` e o campo legado `activeDeviceId`.

Um update in-place normal preserva tanto `totempark-device-id` quanto `totempark-tv-connection`. Porém, se o primeiro for perdido, regenerado ou estiver diferente do valor remoto, surge conflito. Também há race possível entre duas instâncias/TVs usando a mesma tela: um heartbeat recente de outro dispositivo faz a instância atual se retirar e apagar seu vínculo local.

## 9. Update in-place

Com mesmo package, mesma assinatura e `versionCode` maior, o Android atualiza o APK mantendo o diretório privado e os dados da WebView. A auditoria confirmou que RC1, RC2 e rollback usam `br.com.parksolutions.totempark` e o mesmo certificado.

Além disso, RC1 e RC2 referenciam o mesmo bundle principal `assets/index-CIK69pb3.js`, idêntico pelo SHA-256 `B582BDD0CDA6D1E8F9CDA1282A74285AE91515D555FB91AFA6DB19713615BCFC`.

Não foi encontrado código Android que limpe dados durante `MY_PACKAGE_REPLACED`. Esse evento apenas relança o Player várias vezes. Os relançamentos podem ampliar a exposição ao fluxo remoto destrutivo, mas não apagam storage diretamente.

## 10. Rollback

O rollback v5 não contém rotina Android de limpeza e usa o mesmo package/certificado. Ele recebeu o estado privado existente naquele momento. Se o RC2 ou uma condição anterior já havia removido `totempark-tv-connection`, o rollback herdou a ausência da chave. Atualizar o APK não reconstrói um vínculo apagado.

Portanto, não há evidência de que o rollback tenha causado a perda.

## 11. Possíveis races

1. Após update, `MY_PACKAGE_REPLACED` dispara o receiver, o serviço e múltiplas tentativas de abertura (0, 3, 10, 25 e 45 segundos, além de alarmes).
2. Cada montagem do Player inicia resolução remota e listeners.
3. Uma falha inicial, permissão negada ou resultado vazio agenda remoção em 10 segundos.
4. Um snapshot válido posterior cancela apenas o timer daquela instância montada; múltiplas atividades/montagens ou callbacks antigos elevam a fragilidade, embora `singleTask` reduza a duplicação de Activity.
5. Outro dispositivo pode gravar `connectedDeviceId` e `lastSeenAt`; a TV atual interpreta isso como conflito e agenda a remoção local.
6. A leitura do vínculo local é síncrona; não foi encontrada race de “storage ainda não carregou”. O problema está na validação remota assíncrona e no tratamento uniforme de estados inconclusivos.

## 12. Comportamento offline

Se o Player já estiver aberto e com `screen` carregada, os erros de heartbeat são apenas registrados e o Local First pode continuar.

Se o aplicativo iniciar offline com vínculo local válido, ele navega inicialmente para o Player, mas `getDoc`/`onSnapshot` podem falhar. O `catch` chama `scheduleReturnToCodeScreen`; após 10 segundos, `goBackToTvCode` apaga permanentemente o vínculo local. Assim, o boot offline não preserva o vínculo com segurança.

Esse comportamento viola o princípio “erro transitório não é desvinculação”.

## 13. Causa provável

### Vulnerabilidade causal: CONFIRMADA

Falhas remotas transitórias e estados remotos inconclusivos podem apagar um vínculo local válido. O caminho destrutivo está explicitamente presente no código.

### Evento exato do teste RC2: INCONCLUSIVO

Sem log anterior à remoção ou inspeção do storage antes da primeira abertura, não é possível escolher com certeza entre:

- vínculo ausente antes da instalação;
- erro de Firebase durante a abertura após update;
- documento/índice temporariamente não resolvido;
- `connectedDeviceId` recente pertencente a outra TV/instância;
- JSON local corrompido.

O cenário de conflito com outro dispositivo e o cenário de falha transitória são tecnicamente compatíveis com o comportamento observado.

## 14. Risco atual

**CRÍTICO.**

Um Player de produção pode perder de forma persistente um vínculo válido durante boot offline, indisponibilidade/erro do Firebase, resposta vazia intermediária ou conflito temporário de `connectedDeviceId`. A recuperação exige novo pareamento manual.

## 15. Proposta de correção

Não implementada nesta auditoria.

1. Tornar `totempark-tv-connection` durável e nunca removê-la por erro, timeout, offline, permission denied ou snapshot vazio isolado.
2. Separar estados `validado`, `inconclusivo/offline`, `documento confirmado como excluído` e `desvinculação explícita`.
3. Remover vínculo somente por ação local explícita ou comando remoto de desvinculação autenticado, recente e destinado ao mesmo dispositivo.
4. Em conflito de `connectedDeviceId`, pausar heartbeat/mostrar estado de conflito e preservar a associação local até confirmação confiável; não apagar automaticamente.
5. Persistir `screenId` junto do vínculo para reduzir dependência de `tv_codes` no boot.
6. Registrar antes de qualquer decisão: motivo, código de erro Firebase, IDs local/remoto, estado de rede, origem do evento e geração da sessão.
7. Tornar o timer cancelável entre gerações/montagens e garantir que callbacks obsoletos não possam executar desvinculação.
8. Criar testes para boot offline, permission denied, snapshot vazio transitório, documento excluído, conflito de dispositivo, restart e `MY_PACKAGE_REPLACED`.

## 16. Gate para próxima etapa

**CAUSA IDENTIFICADA — PRONTO PARA CORREÇÃO CONTROLADA.**

O RC2 permanece bloqueado. A correção deve ser isolada da Fase A (Local First) e da Fase B (timeout/retry), seguida de um teste curto de preservação do vínculo antes de qualquer rollout.
