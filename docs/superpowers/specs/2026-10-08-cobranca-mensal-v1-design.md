# Totem Park — Cobrança Mensal V1

## Desenho arquitetural

**Data:** 08/10/2026  
**Estado:** aprovado para planejamento  
**Escopo:** contratos, cobranças, dashboard do cliente, administração financeira, notificações, preparação de e-mail e preparação arquitetural para PIX futuro.

## 1. Objetivo

Implementar o controle de mensalidades do Totem Park separando vigência contratual de vencimento financeiro, sem interromper o comportamento dos clientes existentes e sem criar uma segunda lógica independente de restrição ou reativação.

A V1 deve:

- preservar integralmente clientes legados até classificação administrativa individual;
- permitir classificação com prévia obrigatória das consequências operacionais;
- representar contratos e cobranças individualmente;
- permitir quitação manual, correção auditável e reversão não destrutiva;
- preservar exatamente os marcos de inadimplência de 5, 10 e 15 dias;
- mostrar a próxima cobrança de forma clara no Dashboard do Cliente;
- persistir notificações idempotentes;
- preparar e-mail backend sem ativar provedor externo pago;
- preparar identificadores e metadados necessários para PIX futuro, sem implementar pagamentos externos;
- manter Player Android, cache, mídias, telas, playlists, templates, telemetria, autenticação e limites dos planos inalterados.

Migrações, deploys e publicações não fazem parte deste escopo sem aprovação expressa.

## 2. Diagnóstico do sistema atual

O documento `clients/{clientId}` possui `startDate`, `dueDate`, `billing`, `plan` e `status`. O campo `dueDate` exerce simultaneamente os papéis de vencimento do plano, referência de cobrança e origem do cálculo de restrições.

A função existente de acesso aplica estes marcos:

- 1 a 4 dias de atraso: vencido, sem bloqueio;
- 5 a 9 dias: restrição parcial, com bloqueio de criação;
- 10 a 14 dias: restrição forte, com bloqueio de criação e edição;
- 15 dias ou mais: suspensão;
- cancelamento ou suspensão administrativa explícita: suspensão independentemente do atraso;
- liberação temporária: exceção administrativa com prazo de 24 horas.

O sistema ainda não possui contratos persistidos separadamente, cobranças individualizadas, competência, histórico de pagamento, auditoria financeira, notificações de cobrança ou processamento de e-mail no backend. A renovação administrativa atual substitui `dueDate`, força o estado ativo e remove metadados de suspensão sem distinguir a causa.

As regras atuais do Firestore são excessivamente amplas para dados financeiros. A V1 deve introduzir regras específicas sem quebrar os acessos legítimos das demais subcoleções.

## 3. Princípios e invariantes

1. Nenhum cliente legado será convertido automaticamente.
2. Nenhuma data legada será reinterpretada ou alterada silenciosamente.
3. Enquanto `financialModelVersion` não for `1`, `dueDate` continuará sendo a única referência financeira e operacional.
4. A ativação financeira será atômica: ou contrato, primeira cobrança, auditoria e marcador de versão são gravados juntos, ou nada é ativado.
5. Nenhuma competência anterior à competência inicial escolhida será criada.
6. Cobranças anuais não gerarão mensalidades.
7. Os marcos de 5, 10 e 15 dias não serão alterados.
8. Quitação financeira não removerá cancelamento, suspensão administrativa, impedimento contratual nem outra pendência financeira.
9. Nenhum registro financeiro histórico será apagado para corrigir ou reverter operações.
10. Processamento de cobranças, notificações e e-mails será idempotente.
11. O backend será a autoridade de escrita financeira.
12. Nenhum serviço externo pago será contratado ou configurado nesta V1.

## 4. Modelo de dados

### 4.1 Resumo no cliente

O documento `clients/{clientId}` continuará contendo os campos legados. Os novos campos resumidos serão escritos somente pelo backend financeiro:

- `financialModelVersion`: ausente ou `1`;
- `activeContractId`: contrato financeiro vigente;
- `financialStatus`: resumo calculado do estado financeiro;
- `financialRestriction`: `none`, `warning`, `partial`, `strong` ou `suspended`;
- `financialDaysOverdue`: quantidade de dias da pendência vencida mais antiga;
- `financialReferenceInvoiceId`: cobrança que determina o estado financeiro;
- `financialUpdatedAt`: data da última avaliação;
- `financialMode`: `legacy`, `active` ou `reverted`.

Esses campos são projeções para leitura eficiente. Contratos, cobranças e auditorias são as fontes históricas.

### 4.2 Contratos

Caminho: `clients/{clientId}/contracts/{contractId}`.

Campos essenciais:

- `id`, `clientId` e `schemaVersion`;
- `planKey` e nome apresentado do plano;
- `startDate` e `endDate`;
- `status`: `active`, `ended`, `canceled` ou `reverted`;
- `billingPeriod`: `monthly` ou `annual`;
- `billingAnchorDay`: dia original contratado;
- `firstCompetence`;
- `defaultAmountCents` e `currency: "BRL"`;
- `activatedAt`, `activatedByUid` e `activatedByEmail`;
- `endedAt`, `endedReason` e metadados de reversão, quando aplicáveis;
- `createdAt` e `updatedAt`.

Valores monetários serão armazenados em centavos inteiros.

### 4.3 Cobranças

Caminho: `clients/{clientId}/invoices/{invoiceId}`.

O ID será determinístico por contrato e competência. Tentativas repetidas de geração produzirão a mesma cobrança.

Campos essenciais:

- `id`, `clientId`, `contractId` e `schemaVersion`;
- `competence`: `AAAA-MM` para mensal ou `AAAA` para anual;
- `billingPeriod`;
- `amountCents` e `currency: "BRL"`;
- `dueDate`;
- `status`: `pending`, `paid`, `overdue` ou `canceled`;
- `paymentOrigin`: `manual_admin` ou valor futuro compatível;
- `externalReference`: opcional e inicialmente nula;
- `paidAt`, `confirmedAt`, `confirmedByUid` e `confirmedByEmail`;
- `reversedAt`, `reversedByUid`, `reversedByEmail` e `reversalReason`, quando aplicável;
- `notificationState` resumido;
- `createdAt` e `updatedAt`.

Uma correção de quitação volta a cobrança para o estado derivado apropriado e preserva os metadados históricos por meio da auditoria. Não haverá exclusão do pagamento anterior.

### 4.4 Auditoria financeira

Caminho: `clients/{clientId}/financialAudit/{auditId}`.

Eventos previstos:

- prévia de classificação confirmada;
- ativação financeira;
- geração de cobrança;
- quitação manual;
- correção ou estorno administrativo;
- mudança de situação financeira;
- reversão para legado;
- reativação posterior do modelo financeiro;
- falha operacional relevante.

Cada evento registrará tipo, cliente, contrato, cobrança quando aplicável, valores anteriores e posteriores necessários, motivo, administrador, data/hora e chave idempotente.

### 4.5 Notificações

Caminho: `clients/{clientId}/financialNotifications/{notificationId}`.

O ID será determinístico por cobrança e evento. Campos essenciais:

- `clientId`, `contractId`, `invoiceId` e `competence`;
- `eventType`: `due_soon_5d`, `due_today`, `overdue`, `restriction_5d`, `restriction_10d`, `suspension_15d`, `paid` ou equivalente;
- `title`, `message` e `severity`;
- `status`: `active`, `resolved` ou `archived`;
- `createdAt`, `updatedAt` e `resolvedAt`;
- `deduplicationKey`;
- permissões e visibilidade aplicáveis.

### 4.6 Registro de e-mail

Caminho: `clients/{clientId}/financialEmailDeliveries/{deliveryId}`.

Estados distintos e obrigatórios:

- `not_configured`: não existe provedor habilitado; nenhum envio foi tentado;
- `pending`: envio autorizado e aguardando tentativa ou confirmação;
- `sent`: o provedor confirmou efetivamente o aceite ou envio, com referência registrada;
- `failed`: uma tentativa real falhou, com erro sanitizado e possibilidade de nova tentativa controlada.

O sistema nunca registrará `sent` por apenas criar uma fila, montar uma mensagem ou não possuir provedor. A chave determinística combinará cobrança e evento para impedir duplicação.

## 5. Compatibilidade legada

Clientes sem `financialModelVersion: 1` continuarão usando o caminho atual baseado em `dueDate`, inclusive dashboard, restrições, suspensão e liberação temporária.

O novo avaliador de acesso funcionará como fachada:

- modo legado: delega integralmente ao cálculo atual;
- modo financeiro ativo: usa a cobrança vencida aberta mais antiga;
- modo revertido: usa o estado legado resultante aprovado na prévia de reversão.

Não haverá backfill automático nem escrita em contratos ou cobranças apenas por abrir o cliente.

## 6. Classificação administrativa

### 6.1 Entrada

O administrador informará:

- início e término do contrato;
- plano contratado;
- periodicidade mensal ou anual;
- dia-base de vencimento;
- primeira competência;
- primeiro vencimento;
- valor;
- situação inicial permitida.

### 6.2 Prévia obrigatória

Antes de confirmar, uma função backend somente de cálculo validará os dados e retornará:

- contrato normalizado;
- primeira cobrança que será criada;
- calendário dos próximos vencimentos apenas para demonstração, sem persistência;
- estado financeiro resultante;
- comparação entre acesso legado atual e acesso após ativação;
- aviso explícito caso a ativação introduza ou remova aviso, restrição ou suspensão;
- token ou hash de prévia com validade curta e revisão dos dados usados.

A prévia não modifica dados. A confirmação recalcula e rejeita dados divergentes ou cliente alterado desde a prévia.

### 6.3 Confirmação atômica

Uma única transação:

1. confirma que o cliente continua elegível e não foi classificado;
2. valida o token e recalcula a prévia;
3. grava o contrato;
4. grava a primeira cobrança;
5. grava a auditoria;
6. atualiza o resumo financeiro;
7. grava `financialModelVersion: 1` e `financialMode: "active"` na mesma confirmação atômica.

Embora o marcador seja conceitualmente a última etapa, nenhuma gravação parcial fica visível porque todas as operações pertencem à mesma transação.

## 7. Calendário de cobranças

O dia-base original será preservado. O vencimento de cada competência usará:

`min(dia-base, último dia do mês-alvo)`.

Assim, um contrato com dia-base 31 vence em 28 ou 29 de fevereiro, 30 de abril e retorna ao dia 31 no mês seguinte que o possuir. O cálculo será feito com datas civis explícitas, evitando alterações por horário de verão ou fuso do servidor.

Cobrança mensal avança por mês de calendário. Cobrança anual avança por ano e preserva mês e dia contratados, ajustando 29 de fevereiro ao último dia válido quando necessário.

Uma nova cobrança não liquida, substitui nem cancela competências anteriores. A cobrança aberta vencida mais antiga determina a contagem de atraso.

## 8. Avaliação financeira e restrições

O avaliador financeiro produzirá um resultado comum consumido pelo portal:

- em dia: nenhuma cobrança aberta vencida;
- vencido: 1 a 4 dias;
- restrição parcial: 5 a 9 dias;
- restrição forte: 10 a 14 dias;
- suspensão financeira: 15 dias ou mais.

A decisão operacional combinará estado financeiro e impedimentos não financeiros. Cancelamento, suspensão administrativa e impedimento contratual terão precedência e causa explícita.

Uma quitação somente poderá remover o componente financeiro da restrição. Se houver outra cobrança vencida, ela passa a ser a referência. Se houver bloqueio não financeiro, o acesso permanece bloqueado.

## 9. Quitação manual e correção

A quitação será uma função backend autenticada e transacional. Ela:

1. verifica autoridade administrativa;
2. lê a cobrança e rejeita estados incompatíveis;
3. registra pagamento, data e responsável;
4. grava auditoria;
5. resolve notificações daquela competência;
6. recalcula todas as pendências abertas;
7. atualiza o resumo financeiro;
8. reutiliza o avaliador comum para determinar acesso.

Uma repetição com a mesma chave idempotente retorna o resultado já confirmado. Uma segunda quitação incompatível é rejeitada.

A correção exige motivo administrativo. Ela registra evento de reversão do pagamento, mantém todo o histórico e recalcula o estado. Não remove registros anteriores.

## 10. Reversão não destrutiva

A reversão também exige prévia backend obrigatória. A prévia mostra:

- estado operacional financeiro atual;
- estado legado que resultará da volta a `dueDate`;
- mudanças de acesso, avisos, restrições ou suspensão;
- contrato que será encerrado como revertido;
- confirmação de que cobranças e auditorias permanecerão preservadas.

A reversão é rejeitada caso os dados mudem após a prévia. Na confirmação transacional:

- grava-se auditoria de reversão;
- o contrato ativo recebe estado `reverted`;
- o cliente recebe `financialMode: "reverted"` e deixa de usar o contrato para acesso;
- `dueDate` não é alterado;
- nenhuma cobrança ou pagamento é apagado;
- nenhum bloqueio é removido automaticamente.

O resultado operacional deve coincidir com a prévia confirmada. Uma reativação futura exigirá nova prévia e confirmação explícita. Contratos revertidos não gerarão novas cobranças, notificações ou e-mails.

## 11. Notificações e processamento agendado

Uma função agendada no backend avaliará cobranças ativas nos eventos de cinco dias antes, dia do vencimento e após o vencimento, incluindo os marcos de 5, 10 e 15 dias.

Cada evento possuirá chave idempotente. A função poderá ser executada repetidamente sem criar notificações ou envios duplicados. Quitação resolve lembretes daquela competência e cria atualização apropriada sem apagar o histórico.

As notificações persistidas continuam disponíveis quando o cliente retorna ao portal e respeitam o isolamento por cliente.

## 12. Infraestrutura de e-mail

O backend possuirá uma interface de provedor, composição de mensagem e registro de entrega. O provedor real ficará desativado até configuração e aprovação específicas.

Com o provedor desativado, o processamento cria ou atualiza registro como `not_configured`; não simula tentativa, falha ou sucesso. Quando um provedor for futuramente habilitado, o fluxo usará `pending`, tentará o envio e passará para `sent` somente após confirmação real do provedor, ou para `failed` após falha real.

Credenciais serão exclusivamente secrets ou configuração segura do backend. Nenhuma credencial ou chamada de provedor ficará no dashboard.

## 13. Dashboard do Cliente

Para clientes classificados, o card atual de vencimento será substituído visualmente por “Próxima mensalidade” ou “Próxima cobrança” conforme a periodicidade. O card manterá posição e dimensões estáveis e mostrará:

- vencimento;
- valor;
- situação;
- contagem de dias;
- plano;
- vigência contratual;
- periodicidade.

Estados visuais:

- verde: em dia;
- amarelo: próximo do vencimento;
- laranja: vence hoje;
- vermelho: atrasado;
- destaque de suspensão quando aplicável.

Clientes legados continuam vendo os cards atuais. Uma área discreta exibirá notificações financeiras persistentes sem pop-ups repetitivos. Nenhum outro card será removido.

## 14. Administração

O painel existente do cliente receberá módulos focados para:

- classificação financeira;
- prévia e confirmação;
- visualização do contrato;
- lista de cobranças por competência;
- quitação manual;
- correção auditável;
- prévia e confirmação de reversão;
- histórico de auditoria.

Não será criada uma página financeira ampla nesta versão. A renovação atual não poderá sobrescrever silenciosamente dados do modelo financeiro ativo.

## 15. Segurança do Firestore

As subcoleções financeiras receberão regras explícitas antes da regra genérica de subcoleções:

- administrador master pode consultar dados necessários;
- proprietário autenticado pode ler somente os próprios dados autorizados;
- cliente não pode criar, alterar ou excluir contrato, cobrança, auditoria, notificação, entrega de e-mail ou resumo financeiro;
- gravações financeiras acontecem pelo Admin SDK no backend;
- outro cliente não pode listar nem ler dados financeiros alheios;
- auditorias e registros de entrega não serão expostos além do necessário ao cliente.

A alteração das regras será mínima e acompanhada de testes no emulador para clientes, administradores, usuários não autenticados e identidades do Player. Os testes existentes de telas, mídias, playlists, templates e telemetria continuarão sendo executados para demonstrar que os acessos legítimos foram preservados.

## 16. Preparação para PIX V2

Cada cobrança já conterá os campos necessários para integração futura: ID próprio, cliente, contrato, competência, valor, vencimento, estado, origem, referência externa opcional e confirmação.

A V1 não implementará gateway, QR Code, PIX Copia e Cola, webhook, débito automático, cobrança por API nem desbloqueio por pagamento externo.

## 17. Tratamento de erros e concorrência

- Operações financeiras usam transações e chaves idempotentes.
- Prévia expirada ou cliente modificado exige nova prévia.
- Duas confirmações concorrentes não podem criar contratos ou cobranças duplicados.
- Duas quitações concorrentes produzem no máximo um pagamento efetivo.
- Falha de e-mail nunca impede quitação nem altera o acesso financeiro.
- Falha de processamento agendado pode ser repetida com segurança.
- Datas, valores e competência inválidos são rejeitados no backend.
- Falha parcial não ativa o modelo financeiro.

## 18. Estratégia de testes

### Unidade

- calendário mensal nos dias 28, 29, 30 e 31;
- anos bissextos;
- periodicidade anual;
- competência e IDs determinísticos;
- estados de pagamento;
- marcos exatos de 5, 10 e 15 dias;
- precedência de bloqueios não financeiros;
- idempotência de notificações e e-mails;
- diferenciação dos quatro estados de e-mail.

### Backend e integração

- prévia sem gravação;
- ativação atômica;
- rejeição por mudança após prévia;
- ausência de retroatividade;
- quitação e correção auditáveis;
- preservação de outras pendências;
- reversão com prévia e sem exclusão;
- falha concorrente e repetição segura;
- falha de e-mail sem impacto financeiro.

### Regras do Firestore

- cliente lê apenas os próprios dados autorizados;
- cliente não escreve dados financeiros;
- isolamento entre clientes;
- usuário não autenticado é rejeitado;
- administrador mantém acesso;
- Player e funcionalidades existentes mantêm seus acessos legítimos.

### Interface e regressão

- cliente legado sem mudança visual ou operacional indevida;
- cliente mensal e anual classificados;
- card em todos os estados visuais;
- classificação e prévia em desktop e mobile;
- quitação, correção e reversão administrativas;
- nenhuma regressão em telas, Player Android, cache, mídias, playlists, templates, telemetria, autenticação e limites.

## 19. Homologação e critérios de aprovação

A V1 estará apta para homologação quando:

- todos os testes financeiros, de regras e regressão selecionados passarem;
- clientes legados permanecerem no comportamento atual;
- classificação, reversão e respectivas prévias forem demonstradas;
- contrato mensal e anual forem demonstrados;
- quitação e correção preservarem histórico;
- bloqueios não financeiros forem preservados;
- notificações não duplicarem;
- estados de e-mail forem verdadeiros e distinguíveis;
- o Dashboard do Cliente estiver estável em web e mobile;
- os arquivos alterados e a lógica forem documentados;
- uma prévia local ou de homologação for disponibilizada sem publicação em produção.

Qualquer migração, deploy ou publicação exigirá nova aprovação expressa.

## 20. Fora de escopo

- conversão automática de clientes existentes;
- alteração silenciosa de `dueDate`;
- cobrança retroativa;
- provedor de e-mail pago ou credenciais de produção;
- gateway, PIX, QR Code, webhook ou débito automático;
- nova página financeira completa;
- mudanças no Player Android ou na infraestrutura de reprodução;
- publicação em produção.
