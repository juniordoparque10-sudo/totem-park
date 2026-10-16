# Player V56 — proveniência e gate da V55

**Base:** `c49579bf1ec06f64dbb06e8b0165c2cb13ffab83`  
**Coleta:** 2026-10-15  
**Pacote esperado:** `br.com.parksolutions.totempark.player.rcsecurelink`  
**Dispositivo autorizado:** `adb-1C281HFDD4RZPM-E95Um9._adb-tls-connect._tcp` (`sabrina`, IP informado `192.168.31.253`)
**Decisão do gate físico:** `PASS`

## Evidência física

Coleta somente leitura concluída em `2026-10-16T02:33:27.4962153+00:00`:

```text
scripts/verify-player-v56-metadata.ps1 -AdbSerial adb-1C281HFDD4RZPM-E95Um9._adb-tls-connect._tcp
```

Resultado observado:

```text
installedPackage: br.com.parksolutions.totempark.player.rcsecurelink
activity: br.com.parksolutions.totempark.MainActivity
versionCode: 55
versionName: 1.0.0-v55-stability-recovery-experimental
certificateSha256: 72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7
```

O gate físico confirma que a candidata deverá manter o package e o certificado acima. O próximo versionCode permitido é `56`; a APK final ainda depende dos gates operacionais e da comparação do certificado da candidata.

## Base consolidada

O commit `c49579b` contém o flavor legado `playerRc`, com versionCode 40 e versionName `1.0.0-v40-cache-safety-hotfix-rc`. Esses valores não demonstram equivalência com a V55 física e não podem ser usados para nomear ou assinar a V56.

## Candidatos locais não comprovados

Os itens abaixo existem apenas na árvore principal suja. Seus hashes servem para identificação futura, não para autorização de cópia.

| Arquivo candidato | SHA-256 | Situação |
| --- | --- | --- |
| `android/app/build.gradle` | `4DD66970ED129208C89361AF3ED081670AC58B6F943B45BF5561A56E0B581742` | modificado, origem ainda não conciliada |
| `android/app/src/playerRc/AndroidManifest.xml` | `36DAC8882BE586334C37D247CCF9624B488EB9BBDC2A7E744BF18CFEC60B873A` | modificado, origem ainda não conciliada |
| `scripts/prepare-player-rc-secure-link-assets.mjs` | `6F8F14B6DC9026A238402FE9B78E31F83ECF883106548AC3A6316FA1814B628A` | não versionado, candidato apenas |
| `tests/player-rc-secure-link-experiment.test.js` | `903B8D5D417AAEA58D3A5BA455E3C5618EB0E943DFEF0CB08429792113CB9CDF` | não versionado, evidência candidata |
| `tests/player-secure-link-pairing.test.js` | `A2519D27F6C0082DDC4164078BCE77C7025369F6C6569F71BFBE2D112D2BBA95` | não versionado, evidência candidata |
| `src/App.jsx` | `176EE61AEDD234A85C6612089827138C4B9B5A9BD102C1CCD8B39DC7A8F171AF` | modificado e mistura outros escopos |
| `src/App.css` | `081D1010AB1D31A24B4820315C23E24B0A503F0DE627E3725430B1A58CB7DBC2` | modificado e mistura outros escopos |
| `src/player-identity.js` | `2250AB539EC24A91C22423B72F8DA794EB30C906B0CE4CDE5638305420B4DEC1` | modificado, requer rastreio por teste/diff |
| `src/offline-player-cache.js` | `0900CF0ED1AA850E2F89ACFE82566ADAEAF43256E62664BFAAEB54212B9E22C8` | modificado, requer rastreio por teste/diff |

O diretório não versionado `android/app/src/playerRcSecureLinkExperiment/` e os assets compilados de `playerRc` também não são fontes de verdade.

## Consequência

O gate físico da Task 1 está aprovado. Os candidatos locais continuam sem autorização automática: a Task 2 deve provar cada delta de Secure Link/`exitTv`, e a Task 3 deve provar Local First/cache/reprodução offline/recuperação antes de qualquer funcionalidade V56.

## Gate Task 2 — Secure Link e `exitTv`

**Decisão:** `PASS`

Foram recuperados seletivamente, sem copiar a árvore suja em bloco:

| Delta provado | Arquivos | Evidência |
| --- | --- | --- |
| flavor/package experimental e launch theme navy | `android/app/build.gradle`, `.env.playerRcSecureLinkExperiment`, `android/app/src/playerRcSecureLinkExperiment/**` | pacote/versão física da Task 1 e teste estrutural do flavor |
| claim inicial seguro, conflito amigável e sem bypass de ocupação | `src/player-initial-binding.js`, `src/player-identity.js`, `src/App.jsx` | `player-v56-secure-link-equivalence`, `player-identity`, `player-rebind` e emulador Functions |
| timestamp ISO e rejeição de `exitTv` antigo/inválido | `src/android-link-lifecycle.js`, `src/App.jsx` | teste focado aceita comando recente e rejeita ausente, inválido e anterior à sessão |
| vínculo local preservado em falha transitória/`failed-precondition` | `src/android-link-lifecycle.js`, `src/App.jsx` | limpeza local depende de liberação remota confirmada |
| identidade visual aprovada da tela ocupada | `src/App.jsx`, `src/App.css` | logo original, estado desconhecido sem dado inventado e responsividade retrato/paisagem |

Resultados: `18/18` testes focados aprovados e `2/2` testes de identidade da Function aprovados no emulador Firebase `demo-*`, sem acesso ou mutação de produção.

## Gate Task 3 — equivalência operacional V55

**V55_OPERATIONAL_EQUIVALENCE:** `PASS`

- estado de playlist válido é restaurado do cache antes da assinatura remota;
- heartbeat da tela não recria o listener da playlist;
- retomada de processo/WebView reconcilia o tempo restante sem zerar identidade ou reprodução;
- flavor estrito não transforma a biblioteca de templates em playlist implícita;
- download nativo obsoleto é interrompido por identidade de execução, sem apagar cache válido;
- perda de rede não aciona limpeza de vínculo, cache ou playback;
- manutenção, blackout, pausa/retomada e saída confirmada preservam os estados já previstos.

O gate focado aprovou `51/51` cenários. O teste legado de retenção Web recebeu somente compatibilidade de harness para o service worker versionado e imports ESM atuais; não houve mudança na política de cache Web.

## Condição para a APK candidata

A APK só poderá ser nomeada V56 quando declarar versionCode `56`, versionName compatível, package idêntico e o mesmo certificado SHA-256 `72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7`.

