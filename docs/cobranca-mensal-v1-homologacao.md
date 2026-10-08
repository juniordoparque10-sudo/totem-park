# Cobrança Mensal V1 — Relatório de homologação local

## Escopo entregue

- domínio financeiro civil com mensal e anual;
- prévias vinculantes para ativação e reversão;
- classificação atômica sem retroatividade;
- quitação manual e correção auditáveis;
- preservação de pendências e bloqueios não financeiros;
- geração antecipada idempotente e limitada à vigência;
- notificações persistentes e checkpoint de processamento;
- e-mail backend desativado com estados verdadeiros;
- fachada que preserva integralmente clientes legados;
- painel administrativo, card e notificações do cliente;
- regras financeiras isoladas no Firestore.

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
- Gerar prévia da reversão e confirmar que nenhum histórico será apagado.

## Restrições desta entrega

- Não houve migração de clientes.
- Não houve deploy ou publicação.
- Nenhum provedor externo de e-mail ou pagamento foi configurado.
- PIX permanece apenas preparado no modelo de cobrança.
- A execução agendada existe no código, mas não foi implantada.
