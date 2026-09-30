# ROLLOUT CONTROLADO RC4 — DUAS TELAS

Data: 2026-09-22

## TV Android

| Campo | Registro |
|---|---|
| Cliente | Kimura AG |
| Tela | TV Teste — KEYFRK |
| Hardware | Semp 50\" Google TV |
| Versão | RC4 — `1.0.0-2a2-ab-link-loop-rc4` (`versionCode 8`) |
| Tempo observado | 20 minutos |
| Vínculo | Preservado; nenhuma tela de código |
| Playlist | 2 vídeos |
| Reprodução | Funcionou inicialmente, mas travou durante o primeiro vídeo às 10:16 |
| Problemas | Travamento no primeiro vídeo. A playlist estava configurada sem áudio. A reprodução somente retomou após atualização manual pelo controle remoto. |
| Status final | **BLOQUEADA PENDENTE DE DIAGNÓSTICO** |

## Tablet Android

| Campo | Registro |
|---|---|
| Cliente | Kimura AG |
| Tela | Teste 2 — V099ED |
| Hardware | Samsung Galaxy Tab A9+ 5G |
| Android | Android 16 / One UI 8.0 |
| Versão anterior | Player oficial anterior; aviso de falhas contínuas já ocorria nessa versão |
| Update RC4 | Instalado; RC4 em execução |
| Vínculo preservado | Sim; nenhuma nova solicitação de código durante a observação |
| Playlist | Carregada e reproduzida normalmente |
| Reprodução | Normal durante o período controlado informado |
| Problemas | Ao abrir o app, o Android exibiu “Totem Park Player apresenta falhas contínuas”. O mesmo aviso já aparecia antes do RC4. Não houve erro, fechamento, travamento ou falha de reprodução durante a observação. |
| Status final | **APROVADA COM RESSALVA PREEXISTENTE** |

## Resultado geral

| Dispositivo | Resultado |
|---|---|
| TV Android | **BLOQUEADA PENDENTE DE DIAGNÓSTICO** |
| Tablet Android | **APROVADA COM RESSALVA PREEXISTENTE** |

**INVESTIGAR ANTES DE AMPLIAR O ROLLOUT.**

O travamento da TV exigiu intervenção manual para recuperar a reprodução. Ainda não há evidência suficiente para determinar se foi uma ocorrência isolada, falha da mídia ou regressão do Player.

O aviso de falhas contínuas do tablet não foi classificado como regressão do RC4 porque foi observado tanto na versão anterior quanto após a atualização. Ele permanece registrado para investigação separada antes de qualquer ampliação relevante do rollout.

Nenhuma publicação geral, mudança de código, build, backend, Firebase ou playlist foi realizada durante esta observação.
