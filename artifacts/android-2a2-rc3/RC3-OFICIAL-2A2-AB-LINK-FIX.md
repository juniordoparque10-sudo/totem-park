# RC3 OFICIAL — 2A.2-A+B+LINK-FIX

Base: **RC2 2A.2-A+B**

| Item | Estado |
|---|---|
| Local First | PRESERVADO |
| Timeout/retry | PRESERVADO |
| LINK-FIX | PROMOVIDO |
| Vínculo offline | PROTEGIDO |
| `screenId` | PERSISTIDO com compatibilidade legada |
| Sequência | NÃO ALTERADA |
| Backend | NÃO ALTERADO |
| Firebase/Firestore/schema/rules | NÃO ALTERADOS |
| Web/Service Worker | NÃO ALTERADOS |
| Clientes | NÃO ALTERADOS |

## Comparação RC2 versus RC3

As diferenças funcionais promovidas são somente as do LINK-FIX homologado:

- preservação de `totempark-tv-connection` em offline, erro, timeout, consulta inconclusiva e conflito isolado;
- persistência opcional de `screenId`;
- compatibilidade com vínculos antigos sem `screenId`;
- revalidação no evento `online`;
- separação entre mostrar tela de código e limpar vínculo;
- limpeza somente por ação explícita/confiável;
- telemetria local leve do ciclo de validação.

Os módulos de Local First e política de download não foram alterados durante a promoção. A sequência, índices, timers de reprodução, `onEnded`, templates e realtime funcional também não foram alterados.

## RC3

- Arquivo: `Totem-Park-Player-2A2-AB-LINK-RC3.apk`
- Package: `br.com.parksolutions.totempark`
- VersionCode: `6`
- VersionName: `1.0.0-2a2-ab-link-rc3`
- SHA-256: `918B59D0D708D7A0412AADFBDD4CF54E22643DABC8584E35DFC35DDD9F4FE7BC`
- Assinatura: APK Signature Scheme v2
- Certificado: `C=US, O=Android, CN=Android Debug`
- SHA-256 do certificado: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`

## Rollback

- Arquivo: `Totem-Park-Player-ROLLBACK-RC3-v7.apk`
- Estado restaurado: RC2 2A.2-A+B, sem LINK-FIX
- Package: `br.com.parksolutions.totempark`
- VersionCode: `7`
- VersionName: `1.0.0-2a2-ab-rollback-rc3`
- SHA-256: `72DAF030C7946ABE7EDA8E7C1EE21C9E5FFED02F43346203A1525C6FFA3DEB74`
- Assinatura: APK Signature Scheme v2
- Certificado: `C=US, O=Android, CN=Android Debug`
- SHA-256 do certificado: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`

O bundle principal do rollback é `index-CIK69pb3.js`. Seu SHA-256 é `B582BDD0CDA6D1E8F9CDA1282A74285AE91515D555FB91AFA6DB19713615BCFC`, idêntico ao bundle principal do APK RC2 oficial. Isso confirma que o rollback restaura A+B, sem reconstruir essas fases.

## Testes

- LINK-FIX: 8/8 aprovados.
- Local First: 8/8 aprovados.
- Timeout/retry/download: 5/5 aprovados.
- Total consolidado: **21/21 aprovados**.
- ESLint dos módulos alterados/testados: aprovado.
- Build Vite/WebView `playerRc`: aprovada.
- Builds Android RC3 e rollback: aprovadas após limpeza dos intermediários Gradle.
- Package, versões, bundles e certificados: verificados com Android Build Tools.

## Observações não bloqueantes

1. Piscada preta isolada observada apenas na primeira passagem de um vídeo.
2. Tela de diagnóstico da variante LINK-FIX retornou imediatamente à reprodução.
3. Logotipo pequeno foi baixado duas vezes em teste anterior.

Nenhum desses itens foi alterado nesta promoção.

## Resultado

**RC3 PRONTO PARA TESTE FÍSICO IN-PLACE.**

Os APKs não foram instalados, publicados ou distribuídos a clientes.
