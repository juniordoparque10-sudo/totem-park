# BASIC V5 — consolidação do acompanhamento sob demanda

Data: 2026-11-21
Branch: `codex/player-v73-telemetria-simples-prep`
Commit inicial: `57bbbdcac7fff3dfaf3810dcdc923a692f707d9f`
Projeto: `demo-totem-basic-hom`

## Diagnóstico

Os oito erros de avaliação das regras eram causados pelas decisões negativas baseadas em `get()`/`exists()` de cliente e binding. O Firestore Emulator 1.21.0 rotula como `evaluation error` uma comparação documental que resulta falsa; os casos mínimos reproduziram o comportamento com `map.get`, acesso direto e documento ausente.

A inferência do proprietário pelo ID composto também fazia a negativa de leitura/exclusão de uma lease alheia depender de dados do documento. A correção segura foi tornar `ownerUid` e `tabId` segmentos do caminho e delimitar cliente, tela e papel por claims exclusivas do LAB. Nenhuma permissão foi ampliada.

Também foi comprovado que uma falha de escrita mantinha `isActive=true`. A sessão agora reporta o erro e volta ao estado inativo, ficando elegível a recuperação posterior sem criar escrita diagnóstica.

## Correções LAB

- `experiments/now-playing-demand-v2/firestore.binding-flat-integrated-lab-v5-guard-binding-owner.rules`
  - caminho: `clients/{clientId}/screens/{screenId}/nowPlayingWatchers/{ownerUid}/tabs/{tabId}`;
  - Portal limitado a `clientId` e papel `clientOwner`/`master` das claims;
  - Player somente leitura limitado a `clientId`, `screenId` e papel `player`;
  - validação integral de campos, identidade e lease;
  - leitura do Player por collection group com filtros obrigatórios.
- `experiments/now-playing-demand-v2/watcher-bridge-firestore.js`
  - gravação/exclusão no caminho independente por aba;
  - um listener `collectionGroup('tabs')` filtrado por cliente e tela.
- `experiments/now-playing-demand-v2/watcher-bridge-core.mjs`
  - falha de persistência invalida o estado ativo e continua sendo reportada.
- Testes finais e configuração `firebase.basic-v5-lab.json` atualizados somente para o LAB.

## Testes

- Suíte consolidada BASIC V5: **33/33 aprovados**.
- Matriz final de regras: **13/13 aprovados**, 17 negativas, **0 evaluation errors**.
- Ciclo de vida/concorrência/ponta a ponta: duas abas, renovação, ocultação, encerramento independente, expiração, corrida de stop, falha de escrita e isolamento do Player aprovados.
- Build: `npm run build:web`, **1.975 módulos**, aprovado; somente avisos Vite históricos de chunks/importação dinâmica.
- `git diff --check`: aprovado.
- Suíte local ampla, excluindo testes que exigem wrappers próprios de Emulator: **816/825 aprovados; 9 divergentes**.

Classificação das nove divergências amplas:

- quatro de `player-binding-functions.test.mjs`: inconclusivas nessa invocação, pois o teste exige host/porta fornecidos pelo wrapper específico de Emulators;
- duas de heartbeat/traffic: testes históricos que exigem literalmente o timer RC de 15 segundos, incompatível com o estado BASIC/ECO protegido;
- duas de empacotamento V70/V56: testes obsoletos diante dos metadados V73/V57 presentes;
- uma do dashboard de atividade: teste histórico procura helper renomeado/retirado e não foi causado pelo watcher.

Nenhum motor protegido foi alterado para satisfazer essas asserções históricas.

## Consumo

Benchmark sintético de 90 segundos (não representa cobrança real):

- zero abas: nenhuma escrita de watcher e nenhum listener de watcher;
- uma aba: quatro renovações de lease no cenário simulado; documento principal da TV permaneceu com quatro heartbeats, sem as quatro escritas transacionais adicionais do modelo antigo;
- duas abas: oito renovações independentes; encerrar uma não afeta a outra;
- cada aba ativa produz uma criação/renovação a cada 30 s e uma exclusão no encerramento; a lease vence em 75 s;
- o Player mantém um listener somente quando as flags LAB estão ativas e filtra expiração localmente sem gravação.

As contagens são chamadas e snapshots instrumentados no Emulator, não operações faturadas.

## Segurança e preservação

- Acesso externo, outra tela, Player inativo/sem claim, falsificação de UID/tab, prazo vencido/excessivo, escrita pelo Player e exclusão por colega foram negados sem erro de avaliação.
- Flags padrão continuam desligadas; nenhum modo aprovado foi ativado.
- Android V73, APKs, autostart, heartbeat ECO de 25 s, telemetria avançada, reprodução, templates, billing e visual do Portal não foram modificados nesta consolidação.
- Não houve deploy, publicação, commit, push ou acesso a projeto real.

## Pendência de homologação interativa

As regras finais exigem claims LAB (`clientId`, `role` e, para Player, `screenId`). Os testes usam identidades sintéticas com essas claims e passaram. A API somente leitura do Auth Emulator não permitiu enumerar as claims das identidades interativas existentes; portanto a execução visual no navegador permanece condicionada à confirmação/provisão controlada dessas claims no Emulator. Nenhum usuário foi alterado automaticamente.

O núcleo técnico e a matriz automatizada estão aprovados. O aceite visual/funcional interativo permanece pendente até a identidade LAB receber as claims esperadas.

## Aceite do Master LAB

O Master LAB homologou funcionalmente o botão **“Acompanhar esta TV”** no Portal experimental. Foram aceitos a criação do observador, a renovação enquanto a página permanece visível e o encerramento ao ocultar ou sair da tela acompanhada.

Este aceite não substitui a homologação integrada do Player Android. Permanecem abertas:

- a validação interativa do Player com claims LAB reais no Auth Emulator;
- a instalação e execução da variante Android experimental em hardware físico;
- as nove divergências históricas/inconclusivas da suíte geral já classificadas neste relatório.
