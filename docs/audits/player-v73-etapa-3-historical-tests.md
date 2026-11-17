# Etapa 3 — classificação de testes históricos

Execução focada: **15 testes; 10 passaram e 5 falharam**. Nenhuma das cinco divergências foi introduzida pela telemetria BASIC.

| Teste divergente | Classificação | Evidência |
| --- | --- | --- |
| `player-consolidated-packaging` | teste parcialmente obsoleto | assert do oficial congela V70 em `2c39b2f5`; o oficial avançou deliberadamente em `5c818bd2`. O contrato do consolidado V70 e assets continua passando. |
| `player-v56-release-contract` | teste parcialmente obsoleto/arquival | V56 nasceu em `499ec7c7`; flavor mutável avançou a V57 em `fe21a29e` e sync mudou em `b237b72b`. Manifesto/APK arquivado V56 ainda passa. |
| `player-v56-template-logo` | requisito válido, assert de implementação obsoleto | `f3227e6f` adicionou nome/fallback; o regex antigo `if (!src) return null` deixou de representar ausência segura. CSS/aspect ratio continuam passando. |
| `player-v59-visual-gate` | fixture obsoleta | quatro contratos de produção passam. A página auxiliar criada em `0ce9ec7d` foi removida explicitamente em `bb76975e`. |
| `src/telemetry-history.test` | assert obsoleto | desde `768cac2e`, RX/TX incompletos viram `null` para não inventar cobertura; o teste preservou semântica anterior de `0f90f128`. |

Não se propõe alterar os motores nem restaurar fixtures históricas. Se esses testes forem saneados futuramente, devem separar contratos arquivais imutáveis de configurações mutáveis e validar comportamento, não uma linha exata da implementação.

