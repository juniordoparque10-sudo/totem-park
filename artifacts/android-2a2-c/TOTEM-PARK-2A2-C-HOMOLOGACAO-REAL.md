# TOTEM PARK — 2A.2-C HOMOLOGAÇÃO REAL CONTROLADA

Data: 2026-09-22  
Escopo: piloto único

## Estado dos gates

| Gate | Resultado | Evidência |
|---|---|---|
| Backup das regras publicadas | APROVADO | Ruleset ativo capturado integralmente antes de qualquer deploy |
| Diff legível produção × proposta | APROVADO | `FIRESTORE-RULES-DIFF-PREDEPLOY.md` |
| Regra estritamente aditiva e sem expansão indevida | FALHOU | A proposta adiciona escrita pública de telemetria |
| Identidade real do Player | FALHOU | O Player não autentica a posse de `clientId/screenId`; os valores são declarados pelo frontend |
| Deploy de regras | NÃO EXECUTADO | Bloqueado pelos gates de segurança |
| Flag global | DESATIVADA | Nenhum piloto ativado |
| Piloto físico | NÃO INICIADO | Não é seguro abrir a escrita para iniciá-lo |

## Diagnóstico

A regra de produção já permite atualizações públicas limitadas no documento da tela. A proposta 2A.2-C acrescentaria `telemetry` e `telemetryUpdatedAt` a essa lista e criaria `telemetrySessions` com escrita sem autenticação. O teste de igualdade entre os IDs no payload e no caminho não estabelece identidade: um remetente pode escolher ambos.

O identificador local retornado por `getTotemDeviceId()` ajuda na correlação operacional, mas pode ser criado ou alterado no cliente e não é uma prova criptográfica de vínculo. Portanto, uma allowlist de `screenId` no frontend também não satisfaz o gate.

## Dashboard

Por inspeção do código, o dashboard aparece somente após a resolução do usuário como `admin`; usuários `client` e `pending` retornam para painéis próprios antes do menu master. A leitura e alteração da configuração continuam protegidas nas regras por `isMaster()`. A validação física de login, logout, sessão expirada e acesso direto ficou pendente porque o gate de identidade do Player já bloqueia qualquer deploy ou piloto.

## Ação necessária para retomar

Implementar uma identidade de dispositivo vinculada no servidor durante o pareamento e reescrever as regras para exigir essa identidade. Depois disso, repetir apenas os gates prévios: emulador de regras, validação do dashboard master, novo backup/diff e aprovação explícita do deploy restrito.

## Resultado final

**2A.2-C — PILOTO BLOQUEADO**

Nenhuma regra foi publicada, nenhuma flag foi ativada e nenhuma tela recebeu a telemetria 2A.2-C.
