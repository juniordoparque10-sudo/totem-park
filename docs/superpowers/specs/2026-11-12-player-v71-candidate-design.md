# Player Android V71 Candidate — Design

## Intent

Preparar uma única APK candidata, derivada da árvore completa `5266a765`, que reproduza todas as configurações V2 aprovadas no Portal `8d489422` e preserve o comportamento operacional do Player V70/Local First 2A.2. A candidata será entregue somente para avaliação, sem instalação, publicação ou alteração de Firebase Rules.

## Goals

- Integrar seletivamente `forecastCardTransparency`, `showName`, independência de nome/logo e as quatro combinações possíveis.
- Preservar defaults, normalização, snapshots publicados e documentos anteriores.
- Preservar Notícias V2, RSS, cache, vínculo `ACTIVE`, `connectedDeviceId`, playlists, comandos e telemetria.
- Integrar as correções de agendamento/fuso de `57d75187`, `6a6b60e7` e `1fd714b8` sem importar interfaces administrativas.
- Corrigir manutenção 9:16, autoboot e `QuotaExceededError` na origem, sem limpeza indiscriminada.
- Reduzir persistência Firestore redundante sem aumentar heartbeat nem perder comandos, presença ou telemetria.
- Produzir uma APK candidata com package oficial e identificação inequívoca de candidato posterior à V70.

## Non-goals and anti-goals

- Não publicar, instalar ou promover a candidata.
- Não modificar Firebase Rules, Portal em produção, planos, cobrança ou interfaces administrativas.
- Não importar arquivos inteiros de outras branches nem adicionar Templates V2.1 canceladas.
- Não apagar automaticamente mídia, vínculo ou todo o storage para tratar quota.
- Não mascarar consumo aumentando heartbeat ou desligando recursos.

## Architecture and selected approach

A implementação ocorre em quatro blocos sequenciais, cada um fechado por testes e commit. Alterações de outras linhas serão reconstruídas seletivamente sobre `5266a765`; commits divergentes servem como referência e não serão aplicados cegamente. Lógica testável será mantida ou extraída em módulos pequenos; `App.jsx` receberá apenas a integração mínima.

1. Contrato visual V2: schema, normalização, render e estilos.
2. Notícias/capabilities/agendamento: preservar o motor existente e integrar somente runtime de schedule/timezone.
3. Android e storage: manutenção responsiva, autoboot defensivo e persistência tolerante a quota.
4. Eficiência Firestore: deduplicar gravações/assinaturas sem mudar semântica operacional.

## Compatibility contract

- Transparência afeta apenas o background dos cards; texto, logos e conteúdo permanecem opacos.
- `showLogo` e `showName` são booleanos independentes, com default `true` para documentos antigos.
- Retrato e paisagem preservam proporções, branding e manutenção aprovados.
- Vínculo só é válido com status `ACTIVE`, device correto e `connectedDeviceId` compatível.
- Falha de storage degrada apenas a escrita dispensável; dados já persistidos não são removidos.
- Heartbeat, comandos remotos, telemetria e histórico continuam funcionais.

## Verification and release gate

Os 156 testes de referência serão repetidos, novos testes serão executados em ciclo vermelho/verde e o build web/Android será validado antes de gerar uma única APK. O diff final será comparado com `5266a765` e inspecionado para exclusões, código administrativo, Rules e assets inesperados. Autoboot, rotação 9:16, armazenamento real, cold boot offline e reprodução em TV permanecem gates físicos; build aprovado não equivale a versão pronta.
