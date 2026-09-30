# RC4 OFICIAL — SINGLE-ITEM LOOP

Base: **RC3 aprovado**

| Item | Estado |
|---|---|
| Local First | PRESERVADO |
| Timeout/retry | PRESERVADO |
| LINK-FIX | PRESERVADO |
| Single-item loop | PROMOVIDO |
| Backend/Firebase/Firestore | NÃO ALTERADOS |
| Web/Service Worker | NÃO PUBLICADOS/NÃO ALTERADOS como artefatos de produção |
| Sequência com 2+ itens | NÃO ALTERADA |
| Templates | NÃO ALTERADOS |

## Comparação RC3 x RC4

A única mudança funcional nova é o SINGLE-ITEM LOOP:

- vídeo único reinicia o mesmo elemento com `currentTime = 0` e `play()`;
- a mesma source permanece atribuída;
- não há nova resolução, FileTransfer ou fallback provocados pelo loop;
- imagem única rearma sua duração;
- playlists com dois ou mais itens permanecem no fluxo anterior.

Não foram encontradas diferenças funcionais inesperadas na promoção.

## Testes

| Caso | Resultado |
|---|---|
| 1 vídeo em loop contínuo | APROVADO |
| 1 vídeo local, 3 repetições, mesma source e nenhum novo FileTransfer | APROVADO |
| 2 vídeos: A → B → A → B | APROVADO |
| 1 imagem mantém ciclos | APROVADO |
| Local First | 8/8 APROVADOS |
| Timeout/retry | 5/5 APROVADOS |
| LINK-FIX | 8/8 APROVADOS |

Total consolidado: **25/25 testes aprovados**.

- ESLint dos módulos alterados/testados: aprovado.
- Build Vite/WebView RC4: aprovada.
- Builds Android RC4 e rollback: aprovadas após limpeza dos intermediários.

## RC4

- Arquivo: `Totem-Park-Player-2A2-AB-LINK-LOOP-RC4.apk`
- Package: `br.com.parksolutions.totempark`
- VersionCode: `8`
- VersionName: `1.0.0-2a2-ab-link-loop-rc4`
- SHA-256: `FF7105AA364F119806201CB4B86BA5DB483804D84040272AFBCCF8AB44ED73B0`
- Assinatura: APK Signature Scheme v2
- Certificado: `C=US, O=Android, CN=Android Debug`
- SHA-256 do certificado: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`

## Rollback

- Arquivo: `Totem-Park-Player-ROLLBACK-RC4-v9.apk`
- Estado restaurado: RC3 aprovado, sem SINGLE-ITEM LOOP
- Package: `br.com.parksolutions.totempark`
- VersionCode: `9`
- VersionName: `1.0.0-2a2-ab-link-rollback-rc4`
- SHA-256: `0B0A93377B56AE2E1B0049CF780F6A56F3D4B0178B13A5311255F2D7647C03D5`
- Assinatura: APK Signature Scheme v2
- Certificado: `C=US, O=Android, CN=Android Debug`
- SHA-256 do certificado: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`

O bundle principal do rollback (`index-CLCDqjjM.js`) possui SHA-256 `4D6D31E7204C6BCEA879E373CB4E90D270355B7CEEF30ED2CCA74B2151C7E7CB`, idêntico ao bundle principal do RC3 oficial.

## Observações não bloqueantes

- Piscada preta isolada observada anteriormente na primeira passagem.
- Logotipo pequeno baixado duas vezes em teste anterior.

Nenhum desses itens foi alterado nesta promoção.

## Teste físico mínimo in-place

| Verificação | Resultado |
|---|---|
| Atualização do Player existente, sem desinstalar ou limpar dados/cache | APROVADO |
| Vínculo e playlist preservados | SIM |
| Nova tela de código solicitada | NÃO |
| Playlist com 1 vídeo, 3 repetições consecutivas | APROVADO |
| Tela preta ou travamento no loop de vídeo único | NÃO |
| Playlist com 2 vídeos, sequência A → B | APROVADO |
| Repetição indevida do vídeo A | NÃO |
| Parada forçada e reabertura | APROVADO |
| Reprodução retomada normalmente após reabertura | SIM |

## Resultado

**RC4 APROVADO PARA ROLLOUT CONTROLADO.**

O rollback não foi necessário. Nenhuma publicação ou distribuição a clientes foi realizada automaticamente.
