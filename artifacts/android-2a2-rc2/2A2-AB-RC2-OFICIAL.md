# 2A.2-A+B — RC2 OFICIAL

Base: **RC1 2A.2-A**

| Item | Estado |
|---|---|
| Local First | PRESERVADO |
| Timeout por inatividade | IMPLEMENTADO — 60 segundos sem progresso |
| Limite total de download | REMOVIDO |
| Retry | IMPLEMENTADO — máximo 1, backoff de 2 s, somente com 0 bytes |
| Proteção contra duplicação | IMPLEMENTADA — single-flight por mídia |
| Validação do arquivo | IMPLEMENTADA — não vazio e tamanho exato quando conhecido |
| Backend/Firebase/Firestore | NÃO ALTERADOS |
| Web/Service Worker | NÃO ALTERADOS |
| Sequência/timers/onEnded | NÃO ALTERADOS |
| Clientes/produção | NÃO ALTERADOS |
| Logo duplicado | PENDÊNCIA FUTURA NÃO BLOQUEANTE |
| Possível corte visual | SEM EVIDÊNCIA SUFICIENTE PARA ALTERAÇÃO |

## Testes

- 13/13 testes aprovados: 8 de Local First e 5 da política 2A.2-B.
- ESLint aprovado nos módulos de cache, política, diagnóstico e testes envolvidos.
- Build WebView RC2 aprovada.
- Build Android RC2 aprovada.
- Build Android rollback aprovada.
- Package, versões e certificados verificados com Android Build Tools 37.0.0.

## RC2

- Arquivo: `Totem-Park-Player-2A2-AB-RC2.apk`
- Package: `br.com.parksolutions.totempark`
- VersionCode: `4`
- VersionName: `1.0.0-2a2-ab-rc2`
- SHA-256: `483257465FAD8D0D372809F494F4928288B923E46B67440C5F904AC7D6DFBBBF`

## Rollback in-place

- Arquivo: `Totem-Park-Player-2A2-A-ROLLBACK-RC2-v5.apk`
- Comportamento restaurado: RC1 2A.2-A, sem política 2A.2-B.
- Package: `br.com.parksolutions.totempark`
- VersionCode: `5`
- VersionName: `1.0.0-2a2-a-rollback-rc2`
- SHA-256: `8E49D11A06423B0602DEF97B5FA1C21B49A65E1A93CE2DAB54E631E600C5F9CE`

## Assinatura

- Esquema: APK Signature Scheme v2.
- Certificado dos RC1, RC2 e rollback: `C=US, O=Android, CN=Android Debug`.
- SHA-256 do certificado: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`.
- A identidade de assinatura é igual à do RC1 aprovado, permitindo atualização in-place neste canal de builds.

## Teste físico in-place — 21/09/2026

| Verificação | Resultado |
|---|---|
| Android aceitou a instalação por cima | APROVADO |
| Vínculo preservado | **NÃO — solicitou novo código** |
| Testes de mídia, cache e timeout | NÃO EXECUTADOS; gate interrompido |
| Rollback v5 in-place | INSTALADO; também solicitou código |
| Rollout | **BLOQUEADO** |

O operador não informou um novo código, não desinstalou o aplicativo e não limpou dados ou cache.

### Auditoria posterior, somente leitura

- RC1, RC2 e rollback têm o mesmo package e certificado.
- O `index.html` do RC1 e do RC2 referencia `assets/index-CIK69pb3.js`.
- Esse bundle principal é idêntico nos dois APKs: SHA-256 `B582BDD0CDA6D1E8F9CDA1282A74285AE91515D555FB91AFA6DB19713615BCFC`.
- Assim, não há diferença entre RC1 e RC2 no fluxo executado de recuperação do vínculo.
- O Player guarda o vínculo em `localStorage`, na chave `totempark-tv-connection`.
- O fluxo comum apaga essa chave ao retornar à tela de código. Isso pode ocorrer após tela não encontrada, erro de consulta/assinatura do Firebase ou detecção recente de outro `connectedDeviceId`.
- Depois que a chave foi apagada, instalar o rollback por cima preserva o estado já sem vínculo e não consegue reconstruí-lo.

Esses fatos não permitem distinguir retroativamente se a chave já estava ausente antes da instalação ou se o fluxo comum a removeu durante a primeira abertura. A causa exata exige telemetria anterior à remoção ou inspeção do armazenamento antes de uma nova execução controlada.

## Resultado

**RC2 BLOQUEADO.**

Nenhuma publicação ou distribuição a clientes foi realizada.
