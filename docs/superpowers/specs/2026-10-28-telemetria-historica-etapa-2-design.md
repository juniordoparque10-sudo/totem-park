# Telemetria histórica — Etapa 2

## Escopo

Adicionar leitura e apresentação local do histórico criado na Etapa 1, sem alterar Player, Rules, Functions ou dados remotos. A tela atual permanece como fonte da sessão corrente; `telemetryDaily` é a fonte do histórico.

## Arquitetura

- Consultar `clients/{clientId}/screens/{screenId}/telemetryDaily/{YYYY-MM-DD}` por tela e intervalo UTC.
- Agregar documentos diários em funções puras, tolerando documentos parciais e versões antigas.
- Nunca completar dias ausentes com zero: eles são identificados como períodos sem dados.
- Exibir a seção “Histórico do período” separada dos cards “Sessão atual”.
- Carregar sessões e eventos somente em uma evolução futura de detalhamento; contagens do dashboard e PDF vêm dos resumos diários, reduzindo leituras.
- O PDF recebe totais históricos e dias ausentes, distinguindo bytes medidos de economia estimada do cache.

## Estados

`loading`, `ready`, `empty` e `permission-denied`. Falhas de uma tela não apagam resultados válidos de outras telas; erros de permissão são apresentados explicitamente.

## Custo

Uma atualização lê no máximo um documento por tela por dia selecionado. Hoje: S; 7 dias: 7S; 30 dias: 30S; período personalizado: D×S, onde S é a quantidade de telas filtradas e D os dias do intervalo.
