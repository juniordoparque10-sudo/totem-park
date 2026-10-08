# Cobrança Mensal V1 — Relatório de homologação local

## Escopo entregue

- domínio financeiro civil com mensal e anual;
- prévias vinculantes para ativação e reversão;
- classificação atômica sem retroatividade;
- quitação manual e correção auditáveis;
- preservação de pendências e bloqueios não financeiros;
- geração antecipada idempotente e limitada à vigência;
- notificações persistentes, projeção financeira reconciliada e checkpoint serializável com retomada paginada;
- renovação administrativa explícita, sem cobrança retroativa;
- e-mail backend desativado com estados verdadeiros;
- fachada que preserva integralmente clientes legados;
- painel administrativo, card e notificações do cliente;
- regras financeiras isoladas no Firestore.

## Revisão independente e correções

A revisão independente encontrou riscos de concorrência, cursor não serializável, projeção temporal congelada e autoridade excessiva do SDK cliente. A rodada corretiva passou a:

- validar prévias, quitações e correções dentro das transações;
- impedir que duas quitações concorrentes substituam responsável, data ou chave;
- recalcular os marcos operacionais de 5, 10 e 15 dias pelo job;
- revalidar cliente, contrato e cobrança antes de gerar avisos ou novas competências;
- usar a data civil de `America/Sao_Paulo`;
- preservar liberações temporárias e bloqueios administrativos;
- negar escrita financeira direta inclusive ao usuário master no SDK cliente;
- exigir confirmação real e referência do provedor antes de registrar e-mail como enviado.

## Evidências da verificação final

- domínio, serviços, jobs e UI: 21 testes aprovados;
- integração Firestore: 6 testes aprovados, incluindo concorrência real e regras;
- identidade, vínculo e telemetria do Player: 18 testes aprovados;
- regressão das ações do portal: aprovada;
- build web de produção: aprovado, com apenas o aviso preexistente de tamanho do bundle;
- lint direcionado aos arquivos da Cobrança V1: aprovado.

## Como validar localmente

1. Executar `npm.cmd run test:billing`.
2. Executar as regras com o JDK 21 e o emulador Firestore usando `firebase.test.json`.
3. Executar `node tests/client-actions.mjs`.
4. Executar `npm.cmd run build`.
5. Iniciar `npm.cmd run dev -- --host 127.0.0.1` e abrir o portal local.

## Roteiro visual

- Abrir cliente legado e confirmar card e restrições baseados em `dueDate`.
- No modo administrador, abrir “Classificar cliente”, preencher contrato/cobrança e gerar prévia.
- Confirmar mudança operacional destacada, quando indicada.
- Em cliente classificado, visualizar contrato e competências.
- Marcar competência como paga e confirmar atualização do card e encerramento do aviso.
- Corrigir quitação com motivo e conferir reavaliação financeira.
- Renovar a vigência e confirmar que competências anteriores não são criadas.
- Conferir o histórico financeiro e o responsável por cada ação.
- Gerar prévia da reversão e confirmar que nenhum histórico será apagado.

## Restrições desta entrega

- Não houve migração de clientes.
- Não houve deploy ou publicação.
- Nenhum provedor externo de e-mail ou pagamento foi configurado.
- PIX permanece apenas preparado no modelo de cobrança.
- A execução agendada existe no código, mas não foi implantada.
