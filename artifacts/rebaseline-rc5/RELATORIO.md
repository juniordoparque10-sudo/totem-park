# Totem Park RC5 — rebaseline 2A.2

**Estado final em 22/09/2026: RC5 BLOQUEADO no teste físico.** Não promover, publicar ou gerar RC6 agora. O rollback v11, baseado no RC4, foi aprovado fisicamente e é a base operacional segura da TV Teste.

## Rastreabilidade

| Item | Valor |
|---|---|
| Branch | `production-rebaseline-2a2` |
| Commit-fonte | `8a3ef18e76370d90fcfe76fa441e6b47c59a666d` |
| Tag | `totempark-player-2a2-rebaseline-rc5` |
| Preservação anterior | commit `f641738`, tag `pre-rebaseline-2a2-2026-09-22` |
| APK RC5 | `Totem-Park-Player-2A2-REBASELINE-RC5.apk` |
| Package/versão | `br.com.parksolutions.totempark`; VersionCode `10`; VersionName `1.0.0-2a2-rebaseline-rc5` |
| SHA-256 RC5 | `635D48D44C1919E182E8D331327FFCBBAEE69CD5E2A6535EF053502BAF84CFF6` |
| Bundle RC5 selecionado | `index-DmTcmuA7.js`, SHA-256 `506014D586104FB050A5569F65C357BF1ABBC836721D7DC7EB7DC42B7D8D52DB` |
| APK rollback | `Totem-Park-Player-ROLLBACK-RC5-v11.apk` |
| Rollback/versão | mesmo package; VersionCode `11`; VersionName `1.0.0-2a2-rc4-rollback-rc5` |
| SHA-256 rollback | `F67F7D8CA6523D23B263EE854CF3CE6F44EF80DC96C48C9E3B81CF7560B21AE9` |
| Bundle rollback selecionado | RC4 `index-C8VMWlD5.js`, SHA-256 `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB` |
| Certificado dos dois APKs e do RC4 | `C=US, O=Android, CN=Android Debug`; SHA-256 `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7` |

## Escopo

Preservados: Local First, cache persistente, offline, timeout/retry, download lock, LINK-FIX, loop de vídeo único, vínculo e playlist. A única mudança de reprodução é a liberação do elemento anterior antes de montar o próximo na transição VIDEO→VIDEO. A build oficial substitui telemetria, identidade piloto e JUMP DIAG por módulos inertes; o bundle selecionado não contém as rotas/strings do diagnóstico experimental nem o exportador B. O rollback seleciona byte a byte o bundle RC4.

Diferença frente ao RC4: esta é uma nova base-fonte, não uma reconstrução da fonte RC4 perdida. Não há alegação de igualdade integral do código. Não foi identificada diferença funcional inesperada nos caminhos auditados.

## Gates locais

- Build Vite `playerRc`: aprovado.
- 30 testes focados (Local First/offline, download/timeout/retry/lock, LINK-FIX, loop único e lifecycle): aprovados.
- Compilação Java dos flavors RC5 e rollback: aprovada.
- Builds Android RC5 e rollback: aprovados.
- Metadados, bundles selecionados e certificado: verificados nos APKs.
- Lint dos módulos novos: aprovado. `App.jsx` mantém 77 ocorrências preexistentes no lint amplo.

## Teste físico único

O RC5 apresentou engasgos e percepção de vídeo pulado; o teste físico não foi aprovado. Os dois conteúdos eram visualmente iguais. Por isso, **não está comprovado que o Player ficou preso em um único item**; essa afirmação é inconclusiva. Não atribuir um item específico ao salto com base nessa observação.

Após instalar o rollback v11, o vínculo foi preservado, a playlist alternou normalmente, não houve tela preta, travamento, pedido de novo código nem comportamento anormal perceptível. O rollback foi aprovado fisicamente.

Qualquer futura homologação de transição deverá usar vídeos A e B visualmente distintos, para permitir identificar o item ativo, o item pulado e a transição. A investigação Android está encerrada por enquanto. Não alterar rollback v11, RC4, Local First, cache, timeout/retry, LINK-FIX, playlist ou decoder/lifecycle.

O resultado físico observado prevalece sobre os gates locais. A produção permanece sem rollout RC5.
