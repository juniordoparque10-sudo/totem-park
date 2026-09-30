# RC1 2A.2-A — TESTE IN-PLACE

Update por cima: **APROVADO**

Vínculo preservado: **SIM**

Cache preservado: **SIM**

Local First: **SIM — 6 local / 0 remota**

3 ciclos online: **APROVADO**

Fechar/abrir: **APROVADO**

2 ciclos offline: **APROVADO**

Reconexão: **APROVADO**

Redownload desnecessário: **NÃO**

Rollback necessário: **NÃO**

## RESULTADO FINAL

**RC1 APROVADO PARA ROLLOUT CONTROLADO**

## Segunda TV física

- Hardware diferente da primeira TV piloto.
- Primeira TV desconectada durante o teste para evitar concorrência de vínculo.
- Cache: 12 hits / 0 misses.
- Playback: 11 local / 0 remota.
- Origem: LOCAL.
- Downloads: 0.
- Bytes: 0.
- Falhas/timeouts: 0/0.
- Reprodução visual: normal.

Veredito: **APROVADO.**

## Evidência inicial pós-update

- Android aceitou o RC1 como atualização, sem desinstalação.
- O aplicativo não pediu novo código.
- Tela, vínculo, playlist e reprodução foram preservados.
- Sessão RC: `10e3b7e1`
- Início: `2026-09-20T02:52:04.285Z`
- Downloads: 0
- Bytes: 0
- Cache: 12 hits / 0 misses
- Falhas/timeouts: 0/0
- Playback: 6 local / 0 remota
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\23d.jpeg`

## Três ciclos online

- Sessão: `10e3b7e1`
- Downloads: 0
- Bytes: 0
- Cache: 24 hits / 0 misses
- Falhas/timeouts: 0/0
- Playback: 12 local / 0 remota
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\24d.jpeg`
- Relato operacional: dois ciclos adicionais sem erros, completando o gate online rápido.

Veredito: **APROVADO.** Não houve FileTransfer, tráfego de mídia, miss, reprodução remota ou erro.

## Fechar e abrir

- Nova sessão: `a062770e`
- Início: `2026-09-20T03:00:26.242Z`
- Downloads: 0
- Bytes: 0
- Cache: 36 hits / 0 misses
- Falhas/timeouts: 0/0
- Playback: 17 local / 0 remota
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\25d.jpeg`
- Relato operacional: tudo normal.

Veredito: **APROVADO.** Vínculo e cache foram preservados após encerramento completo, sem redownload.

## Dois ciclos offline

- Sessão: `a062770e`
- Downloads: 0
- Bytes: 0
- Cache: 48 hits / 0 misses
- Falhas/timeouts: 0/0
- Playback: 23 local / 0 remota
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\26d.jpeg`
- Relato operacional: tudo normal.

Veredito: **APROVADO.** Vídeos e imagens locais funcionaram, a playlist avançou normalmente e não houve tela preta ou dependência remota.

## Reconexão

- Sessão: `a062770e`
- Downloads: 0
- Bytes: 0
- Cache: 60 hits / 0 misses
- Falhas/timeouts: 0/0
- Playback: 28 local / 0 remota
- Origem: LOCAL
- Evidência: `C:\Users\centr\Downloads\27d.jpeg`
- Relato operacional: tudo ok.

Veredito: **APROVADO.** A reprodução continuou local após a reconexão, sem redownload ou erro.
