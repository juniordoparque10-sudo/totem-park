# Player V56 — proveniência e gate da V55

**Base:** `c49579bf1ec06f64dbb06e8b0165c2cb13ffab83`  
**Coleta:** 2026-10-15  
**Pacote esperado:** `br.com.parksolutions.totempark.player.rcsecurelink`  
**Dispositivo autorizado:** `192.168.31.251:5555`  
**Decisão do gate:** `BLOCKED`

## Evidência física

Comando de conexão somente leitura:

```text
adb connect 192.168.31.251
```

Resultado observado:

```text
cannot connect to 192.168.31.251:5555: ... host conectado não respondeu. (10060)
List of devices attached
adb.exe: device '192.168.31.251:5555' not found
```

O coletor `scripts/verify-player-v56-metadata.ps1` não conseguiu executar `dumpsys package` porque nenhum dispositivo estava disponível. Portanto, estes valores continuam não confirmados:

- package efetivamente instalado;
- Activity efetiva;
- versionCode e versionName;
- caminho da APK instalada;
- SHA-256 do certificado da APK instalada.

Sem o certificado físico não é permitido presumir que uma chave Debug local seja compatível. O versionCode da candidata também não será definido.

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

O gate físico da Task 1 está bloqueado. Conforme a especificação e o plano aprovados:

- Tasks 2–10 não podem iniciar;
- nenhuma recuperação V55 será copiada;
- nenhuma funcionalidade V56 será implementada;
- nenhum Preview ou APK será gerado;
- nenhum arquivo Firebase, V51, V55 física ou produção será alterado.

## Condição objetiva para retomada

Disponibilizar novamente o Chromecast em `192.168.31.251:5555`, com depuração ADB acessível e a V55 instalada. A retomada começa repetindo somente o coletor de metadados; se package, versão e certificado forem obtidos, o inventário seletivo prossegue.

