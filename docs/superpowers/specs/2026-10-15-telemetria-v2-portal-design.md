# Telemetria V2 — Adequação visual do Portal

**Data:** 2026-10-15  
**Status:** especificação para revisão  
**Escopo:** Portal Web administrativo, somente área de Telemetria

## Objetivo

Adequar a Telemetria administrativa às duas referências aprovadas, mantendo a identidade, os temas, a navegação e os dados atuais do Portal. A interface deve aproveitar os dados operacionais existentes e deixar preparados estados honestos para a futura Telemetria V2-A, sem fabricar histórico, reprodução ou disponibilidade.

## Decisões de arquitetura

1. Evoluir incrementalmente `TelemetryDashboard.jsx`; não criar um dashboard paralelo.
2. Manter exatamente os listeners atuais de clientes, telas, bindings e configuração piloto.
3. Não criar coleções, índices, Functions, regras, gravações ou consultas históricas.
4. Isolar a nova apresentação em CSS de componente, importado pelo dashboard e prefixado por `.telemetry-v2`.
5. Implementar a transformação de eventos em helper puro, sem dependência de React ou Firebase.
6. Preservar o detalhe atual da tela, PDF, filtros existentes, ordenação estável e controle de acesso da página.

## Estrutura visual

### Cabeçalho e indicadores

- Preservar o cabeçalho real do Portal; não reproduzir o cabeçalho ilustrativo das referências.
- Manter os controles atuais de relatório, período e atualização.
- Organizar os cinco indicadores superiores na hierarquia da referência: telas online, internet utilizada, tráfego evitado, cache hit rate e falhas de mídia.
- Valores não instrumentados permanecem como `—` com explicação curta.

### Navegação interna

Preservar os seis destinos existentes na mesma página:

1. Visão Geral
2. Telas
3. Consumo de Mídia
4. Cache
5. Rede e Conexão
6. Eventos e Logs

Os controles apenas navegam entre seções existentes; não criam nova rota ou consulta.

### Visão Geral

- Manter o gráfico de origem apenas para telas online que atendem aos filtros.
- Manter o resumo de tráfego schema 4 e o gráfico de status.
- Preservar os cards de tempo ativo, downloads, itens em cache e versão reportada.
- Acrescentar estados discretos `Aguardando dados da Telemetria V2-A` para métricas futuras que não possuam fonte real.
- Não tratar heartbeat como reprodução e não apresentar uptime como tempo de conteúdo exibido.

### Telas

- Preservar colunas, filtros, seleção e detalhe existentes.
- Manter `screenId` como identidade estável da linha.
- Online permanece antes de offline; alterações de heartbeat atualizam dados sem reposicionar telas que continuam no mesmo estado.
- Offline permanece ordenado pelo último feedback conhecido, do mais recente para o mais antigo.
- Clientes e opções de clientes permanecem em ordem alfabética.

## Histórico de Atividade

### Apresentação

O histórico será incorporado à própria Telemetria, abaixo do resumo operacional, seguindo a segunda referência:

- cabeçalho recolhível;
- filtros de cliente, tela, período e data;
- resumo compacto;
- linha do tempo detalhada;
- cards de duração e marcos;
- tabela de períodos;
- resumo textual operacional.

Em telas menores, os filtros e cards quebram em linhas; a timeline pode usar rolagem horizontal interna, sem provocar overflow da página.

### Contrato de dados

O helper aceitará somente eventos persistidos e timestampados fornecidos pelo documento da tela no contrato futuro V2-A. Cada evento precisa conter:

- identificador ou posição determinística;
- timestamp válido;
- estado explícito reconhecido;
- `screenId` correspondente.

Estados inicialmente reconhecidos: `ACTIVE`, `OFFLINE`, `ATTENTION`, `IDLE`, `INTERRUPTED` e `RECOVERED`. Estados desconhecidos são ignorados na composição temporal e podem aparecer apenas na lista de eventos, quando houver descrição segura.

O adaptador não usará `lastSeenAt`, heartbeat atual, `sessionStartedAt` ou uptime para inventar início/fim de períodos. Eventos sem timestamp válido não geram segmentos.

### Formação dos períodos

- Ordenar eventos reais por timestamp, com desempate determinístico.
- Limitar os eventos ao intervalo selecionado.
- Iniciar um período somente em evento explícito.
- Encerrar um período no próximo evento explícito da mesma tela.
- Não estender automaticamente o último período até o horário atual.
- Não preencher lacunas sem eventos.
- Durações, primeira ativação e última desativação são calculadas somente a partir de períodos fechados.
- O resumo textual descreve apenas períodos comprovados.

Enquanto o contrato V2-A não existir ou não houver amostra suficiente, o componente mantém integralmente sua composição e mostra `Aguardando dados da Telemetria V2-A`, sem barras ou totais fictícios.

## Fluxo de dados

1. Os listeners atuais alimentam `clients`, `screens`, `bindings` e a configuração piloto.
2. O dashboard enriquece as telas usando os helpers operacionais existentes.
3. Filtros gerais continuam alimentando cards, gráficos, tabela e PDF.
4. O Histórico usa seleção própria e passa apenas eventos reais ao helper puro.
5. O helper devolve eventos válidos, períodos fechados, totais comprovados e motivo de estado vazio.
6. A camada visual renderiza timeline e resumos ou o estado de espera.

Nenhuma etapa grava dados ou abre um listener adicional.

## Segurança, desempenho e custos

- O acesso continua condicionado à rota administrativa já existente.
- Não ampliar permissões nem retornar dados novos ao Player.
- Reutilizar os snapshots já carregados pela tela.
- Agregações serão memorizadas por tela, data e período.
- Limitar o conjunto processado no cliente ao intervalo selecionado e ao limite do contrato futuro.
- Não modificar frequência de heartbeat, Firebase, Storage, Rules ou Functions.

## Responsividade e identidade visual

- Reutilizar os tokens visuais existentes da Telemetria.
- Não alterar `App.css`, temas, sidebar, cabeçalho ou componentes externos.
- Novos seletores serão descendentes de `.telemetry-v2` em arquivo local.
- Desktop reproduz a hierarquia das referências; tablet e celular reorganizam a mesma informação sem remover dados essenciais.
- Não copiar logo, usuário, menu ou outros elementos ilustrativos das imagens.

## Compatibilidade e preservação

- O Dashboard principal e seu card `Telas em tempo real` permanecem inalterados.
- O PDF continua usando o fluxo e a estrutura atuais.
- O detalhe lateral de tela continua acessível.
- Dados atuais de status, comunicação, cliente, versão, playlist, mídia, origem, cache, tráfego e sessão permanecem disponíveis.
- Android V51/V55, Player Web, Secure Link, Local First e Templates V2 ficam fora do escopo.

## Validação

Testes focados devem cobrir:

1. normalização e ordenação determinística de eventos reais;
2. rejeição de eventos sem timestamp ou estado válido;
3. ausência de inferência por heartbeat, sessão ou uptime;
4. períodos fechados e lacunas preservadas;
5. estado vazio V2-A;
6. clientes em ordem alfabética;
7. estabilidade das linhas por `screenId`;
8. preservação dos cards, tabela, detalhe e PDF atuais;
9. estrutura visual da Visão Geral e do Histórico;
10. responsividade desktop, tablet e celular;
11. ausência de alterações em Dashboard principal, Firebase e Android.

Depois dos testes focados, executar ESLint apenas nos arquivos alterados, um build Web final e gerar um único Preview Vercel isolado.

## Arquivos previstos

- Modificar `src/TelemetryDashboard.jsx`.
- Criar `src/telemetry-activity-history.js`.
- Criar `src/telemetry-v2.css`.
- Criar testes unitários do histórico.
- Atualizar somente testes estruturais já existentes da Telemetria quando necessário.

Não estão previstos ajustes em `src/App.jsx`, `src/App.css`, Firebase, Android ou backend.

## Critérios de aceite

- Organização e hierarquia equivalentes às duas referências dentro do Portal atual.
- Todos os recursos atuais de Telemetria preservados.
- Histórico exibindo somente eventos reais ou o estado de espera V2-A.
- Nenhuma inferência enganosa de reprodução ou disponibilidade.
- Cards e linhas estáveis; clientes alfabetizados.
- CSS totalmente local e prefixado.
- Testes focados e build Web aprovados.
- Preview isolado entregue sem publicação em produção.
