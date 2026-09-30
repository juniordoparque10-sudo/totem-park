# 2A.2-C.1 — IDENTIDADE SEGURA

Data: 2026-09-22  
Estado de produção: inalterado  
Feature flag 2A.2-C: documento ausente, equivalente a `enabled: false`; zero telas habilitadas

## Arquitetura atual encontrada

O painel usa Firebase Authentication com e-mail e senha. Após o login, o frontend consulta `settings/masterAccess` e os documentos de clientes para classificar o usuário como master, cliente ou pendente. As regras repetem essa autorização com `request.auth`.

O Player não possuía autenticação própria. Ele lia publicamente `tv_codes/{code}`, obtinha `clientId` e `screenId`, gerava um `deviceId` local e atualizava diretamente `clients/{clientId}/screens/{screenId}`. O `deviceId`, a URL, o código e o conteúdo do `localStorage` eram metadados controlados pelo cliente.

Não havia Cloud Functions ou outro backend confiável no projeto. O pareamento, a ocupação da tela, o heartbeat e a desvinculação eram executados pelo frontend.

## Firebase Auth existente

- Email/password está ativo em produção e é usado pelo painel.
- Anonymous Auth não aparece habilitado na configuração atual de produção.
- Nenhuma configuração de Auth foi alterada.
- A identidade anônima foi validada somente no Auth Emulator.

## Fluxo de pareamento atual

1. Player recebe o código digitado.
2. Lê `tv_codes/{code}`.
3. Obtém cliente e tela.
4. Compara o `connectedDeviceId` armazenado com o ID local.
5. Atualiza diretamente o documento da tela.
6. Persiste `clientId`, código, `screenId` e `deviceId` localmente.

O LINK-FIX mantém esse registro em falhas temporárias de rede e só o apaga em desvinculação explícita.

## Vulnerabilidade atual

O fluxo antigo não prova posse da tela. A proposta inicial da 2A.2-C também aceitava telemetria mediante IDs declarados pelo remetente. Qualquer remetente que conhecesse o caminho poderia construir valores coerentes e gravá-los sem identidade autenticada.

## Arquitetura proposta

Foi implementada localmente a alternativa **Rules + binding server-side**, com pareamento por Cloud Function callable:

1. O Player obtém um UID persistente via Firebase Anonymous Auth.
2. Envia à callable somente código, `deviceId` descritivo e versão.
3. A função exige `request.auth.uid`.
4. A função lê `tv_codes/{code}` e resolve cliente e tela no servidor.
5. Em transação, verifica tela, binding anterior e ocupação por outro UID.
6. O Admin SDK cria `playerDeviceBindings/{uid}` e registra `connectedAuthUid` na tela.
7. As regras autorizam telemetria apenas quando o binding ativo coincide com o caminho e com o `deviceId` registrado.

O Player não escolhe o cliente ou a tela no pedido de autorização. Esses campos são derivados do código pelo backend.

## Fluxo auth.uid → tela

```text
Firebase Auth uid
  → playerDeviceBindings/{uid}
    → status == ACTIVE
    → clientId
    → screenId
    → deviceId (metadado vinculado)
      → clients/{clientId}/screens/{screenId}
```

## Binding server-side

Estrutura implementada:

```text
playerDeviceBindings/{authUid}
  uid
  clientId
  screenId
  deviceId
  appVersion
  status: ACTIVE | REVOKED
  createdAt
  pairedAt
  updatedAt
  revokedAt
  revokeReason
```

A callable usa Admin SDK. O Player pode ler somente o próprio binding e não pode criar, editar, mover ou reativar bindings. Master pode administrar bindings pelas regras; o backend ignora as regras por usar Admin SDK.

## Firestore Rules propostas

- Telemetria sem autenticação: negada.
- UID sem binding: negado.
- Binding ativo para outra tela: negado.
- `clientId`, `screenId` ou `deviceId` divergente no payload: negado.
- Binding revogado: negado.
- Escrita de `telemetrySessions`: exige binding ativo, IDs exatos, session ID coerente e sequência monotônica.
- Campos `telemetry` e `telemetryUpdatedAt` foram removidos da lista de atualização pública.
- Binding: leitura do próprio documento; escrita somente master/backend.

As regras continuam locais e não foram publicadas.

## Testes de Rules

O Firestore Emulator executou 9 cenários, todos aprovados:

1. não autenticado negado;
2. UID sem binding negado;
3. binding A gravando tela A permitido;
4. binding A gravando tela B negado;
5. alteração de cliente, tela ou dispositivo negada;
6. binding revogado negado;
7. Player criando/editando binding negado;
8. master criando binding permitido e cliente proprietário editando-o negado;
9. regressão de sequência negada.

Auth + Functions + Firestore Emulator também confirmou o caminho completo: usuário anônimo autenticado chamou `claimPlayerBinding`, a função validou o código e o Admin SDK criou o binding correto.

## Desvinculação

`revokePlayerBinding` altera o binding para `REVOKED`, grava motivo/data e remove a ocupação da tela somente se `connectedAuthUid` ainda for o UID revogado. O próprio Player pode revogar o próprio vínculo; master pode revogar outro UID após validação de e-mail no servidor.

Após revogação, as regras bloqueiam imediatamente novas escritas de telemetria.

## Revinculação

- Mesma tela, mesmo UID: operação idempotente; binding permanece ativo.
- Mesmo UID, outra tela: recusado enquanto o vínculo anterior estiver ativo.
- Mesma tela, novo UID: recusado enquanto `connectedAuthUid` estiver ocupado.
- Reinstalação ou limpeza de dados: gera novo UID; requer revogação administrativa do UID antigo e novo pareamento.
- Atualização normal do APK: preserva o armazenamento do aplicativo e, portanto, o UID e o vínculo.
- Rollback in-place: preserva a identidade enquanto os dados do pacote forem mantidos; versão antiga ignora o binding.

## Offline

Falha de Auth, rede ou callable é classificada como `TEMPORARILY_UNVERIFIED`. Ela não apaga `totempark-tv-connection`, não chama `goBackToTvCode` e não impede Local First. A telemetria continua na outbox local. Ao voltar a internet, o Player tenta restabelecer o binding e só então sincroniza.

Uma resposta explícita de permissão/binding inválido é classificada separadamente como `REVOKED`.

## LINK-FIX

Os sete testes existentes do ciclo de vínculo continuam aprovados, incluindo boot offline, timeout e indisponibilidade do Firebase. A implementação não limpa o vínculo por falha temporária de identidade.

## Comparação

| Alternativa | Segurança | Custo por checkpoint | Revogação | Complexidade/manutenção |
|---|---|---:|---|---|
| Rules + binding | Alta; caminho e payload presos ao UID | 1 leitura dependente por escrita protegida | Imediata após binding `REVOKED` | Moderada; regras e callables pequenas |
| Custom claims | Alta enquanto token estiver atual | Sem leitura dependente | Pode atrasar até renovação do token; exige refresh forçado | Alta em troca de tela, reinstalação e revogação |
| Ingestão por backend | Alta; nenhuma escrita direta do Player | 1 invocação, validação e escrita | Imediata | Maior custo operacional, latência e superfície de backend |

Custom claims não foram implementadas. Para este produto, o binding em documento oferece revogação simples e auditável sem depender da renovação do ID token.

## Custos estimados

Premissas por tela: checkpoint a cada 5 minutos (288/dia), histórico no máximo a cada 15 minutos (96/dia), total de 384 escritas protegidas/dia. A implementação atual separa telemetria do heartbeat legado para impedir que os campos públicos contornem o gate.

| Telas | Escritas de telemetria/dia | Leituras de binding pelas Rules/dia | Invocações/dia se toda ingestão fosse backend | Tráfego estimado/dia* |
|---:|---:|---:|---:|---:|
| 10 | 3.840 | 3.840 | 2.880 | 7,65 MB |
| 50 | 19.200 | 19.200 | 14.400 | 38,25 MB |
| 100 | 38.400 | 38.400 | 28.800 | 76,5 MB |
| 500 | 192.000 | 192.000 | 144.000 | 382,5 MB |
| 1.000 | 384.000 | 384.000 | 288.000 | 765 MB |

\* Baseado na medição anterior de aproximadamente 765 KB por tela/dia, sem overhead de protocolo. O binding adiciona leitura faturável, mas praticamente nenhum tráfego de payload para o Player porque a avaliação ocorre no Firestore.

## Impacto no tráfego

O conteúdo da telemetria e seus limites não mudaram. A identidade adiciona chamadas pequenas durante pareamento, revalidação e revogação. Não existe chamada de função por evento de reprodução. A validação `get()` das Rules ocorre no serviço e não transfere o documento de binding ao Player durante cada escrita.

## Arquivos alterados

- `src/player-identity.js`
- `src/App.jsx`
- `firestore.rules`
- `firebase.json`
- `firebase.test.json`
- `functions/index.js`
- `functions/package.json`
- `functions/package-lock.json`
- `tests/firestore-player-identity.rules.test.mjs`
- `tests/player-binding-functions.test.mjs`
- `tests/player-identity.test.js`
- `package.json`
- `package-lock.json`

## Testes executados

- Identidade, LINK-FIX e telemetria: 15/15 aprovados.
- Firestore Rules Emulator: 9/9 aprovados.
- Auth + Functions + Firestore Emulator: 1/1 aprovado.
- Build `playerTelemetry`: aprovado.
- Sintaxe de Functions: aprovada.
- ESLint dos novos módulos/testes: aprovado.
- `git diff --check`: aprovado; somente avisos de conversão LF/CRLF do workspace.

## Riscos

1. Anonymous Auth precisa ser habilitado antes de um piloto; ainda está desligado em produção.
2. App Check apareceu como ausente no emulador. Ele é defesa complementar contra abuso das callables, embora não substitua o binding.
3. O código atual da tela é duradouro. Um terceiro que o conheça pode tentar ocupar uma tela ainda sem `connectedAuthUid`. Recomenda-se evoluir para desafio curto/expirável ou confirmação pelo gestor antes de rollout amplo.
4. Reinstalação exige fluxo administrativo de revogação porque o UID muda.
5. O projeto já possui dependências com alertas do `npm audit`; nenhuma correção automática foi aplicada para evitar mudanças fora do escopo.

## Rollback

Nenhuma mudança foi publicada. O rollback atual consiste em não implantar Functions/regras e não habilitar Anonymous Auth. Em deploy futuro, rollback controlado deve desligar a flag 2A.2-C primeiro, manter os bindings para auditoria e restaurar o ruleset preservado `49cb91dc-b61e-4d5d-9170-8bf3c5da0581` se necessário.

## Recomendação

A arquitetura está adequada para deploy controlado após revisão do diff e autorização explícita. Antes do primeiro piloto, habilitar Anonymous Auth, publicar as três callables, publicar as regras testadas e manter a flag global OFF. Em seguida, ativar somente um `screenId`.

## Classificação

**2A.2-C.1 — IDENTIDADE SEGURA PRONTA PARA DEPLOY CONTROLADO**

Nenhum deploy, publicação, ativação de Auth ou piloto foi realizado.
