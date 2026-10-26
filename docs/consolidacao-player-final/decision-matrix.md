# Matriz de decisão dos commits

Legenda: **A** aprovado e elegível; **E** experimental/proibido; **D** dependente do V2.1; **S** empacotamento/regras supersedidos, sem funcionalidade a importar; **P** patch misto, extrair somente a parte aprovada.

| Commits | Classe | Decisão e evidência |
|---|---|---|
| `657398b` | E | Exclusão expressa. Tempo/Hora V2.1 e infraestrutura associada não entram. |
| `2bce7ac`, `ce2b137`, `11bb3ea`, `2e5467b`, `3581a55`, `06d0cf9` | D | Série construída diretamente sobre APIs/testes `web-v2.1-hotfix`; aprovação específica não comprovada. Não importar. |
| `850194a`, `522c91e` | D | Exclusão/deleção de recursos acoplada a `template-resource-usage` e ao teste V2.1. Investigada, mas sem evidência positiva independente; não importar. |
| `16e8fd3`, `ba0438a` | A/P | Aparência/notícias aprovadas; aplicar sem hunks que dependam do editor V2.1. |
| `8950bf9`–`61bbb51` (exceto `11cdf29`) | A/P | Player Web, cache, vínculo, backgrounds, Smart Lobby e ticker cobertos pela autorização; extrair conflitos sem V2.1. |
| `11cdf29` | S | Consolidação de regra já implantada, sem necessidade no APK; Produção não será alterada. |
| `846b237` | P | Capabilities/startup V58 aprovadas; excluir APK, metadata de versão e alterações de allowlist. |
| `acfea88`, `161834f`, `b37620f`, `bc34e56`, `b8a8971` | A/P | Splash, gate das templates existentes, RSS e Esportes; aplicar código/testes, não rules de canary. |
| `e98c2fd` | P | Tela de manutenção/splash aprovados; excluir APK, versão/allowlist e artefatos visuais de release. |
| `ebf1f06`, `494abef`, `9dffef2` | A/P | Biblioteca/contratos aprovados; remover somente metadados experimentais. |
| `1a5222b` | P | Fade Suave aprovado; extrair código/testes, sem APK/metadata V60. |
| `6a55441` | A | RSS e rotação/dados dinâmicos aprovados. |
| `e726cf7`, `312cff9` | P | Integração RSS aprovada; importar endpoint/parser/testes, não APK/metadata/rules/deploy. |
| `f47c4a2`, `fe863b4` | A | Contrato Portal/publicação compatível com bindings ativos. |
| `c07652c` | P | Agendamentos e layout de notícias aprovados; importar runtime/testes, não APK/metadata. |
| `17b6fae` | S | Allowlist experimental V62 em regra; não necessária e não será publicada. |
| `dc7430c`, `f169726` | A | Contrato/publicação e previews dinâmicos aprovados. |
| `e2617f6` | P | Avisos de agenda, quatro selos/readiness de notícias aprovados; importar runtime/testes, não APK/metadata. |
| `ae90b9a`, `5b0035b` | A | Ações do Portal; evidência expressa para preservar Portal existente. |
| `e7a4b29`, `de37430`, `0abe05c`, `f31459c`, `3717898`, `b68987b`, `964c70a` | A | Recuperação/cache, RSS, transparência, agenda, rotação e diagnóstico passivo aprovados. |
| `68cb909`, `72c72c8` | S | Metadata/allowlist V65 experimentais supersedidos pela candidata; não importar. |
| `09c1ac3`, `61cd3ad`, `5df14ec`, `ffa8aa1`, `aec5e82` | A | Recuperação/bootstrap/telemetria/notícias/reordenação aprovados. |
| `7bfdf8d`, `f065870`, `7e27e34` | A | Correções consolidadas de Lobby/Esportes/RSS, UTC e copy aprovadas. |
| `29611e4` | P | Contrato de capabilities V66 aprovado; renomear metadata para candidata sem importar canary como versão final. |
| `3679876`, `ed0b1ba`, `5aa85a0`, `b7dd9ce` | A | Gate de publicação e fidelidade/transparência do Smart Lobby aprovados. |
| `6fccc71` | E | Fora do intervalo e exclusão expressa; personalização compartilhada proibida. |

## Gate de dependência

- Não foi encontrada correção **com aprovação positiva** inseparável do V2.1.
- A série de deleção/recuperação de recursos é tecnicamente inseparável na forma atual, porém sua aprovação positiva não foi comprovada após consulta a documentos, testes físicos e autorização expressa. Ela permanece visível nesta matriz e não é descartada silenciosamente.
- Os commits mistos posteriores possuem hunks independentes (runtime/testes/capabilities) que podem ser extraídos sem `editor-state.js`, sem o teste `web-v2.1-hotfix.test.js` e sem o editor de personalização.
- Qualquer conflito durante aplicação que contradiga esta conclusão reabre o gate e interrompe antes do build final.
