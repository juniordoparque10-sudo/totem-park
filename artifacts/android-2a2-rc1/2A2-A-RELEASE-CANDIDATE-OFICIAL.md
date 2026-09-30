# 2A.2-A — RELEASE CANDIDATE OFICIAL

Status: **HOMOLOGAÇÃO TÉCNICA 2A.2-A APROVADA — SEM ROLLOUT GERAL**

## 1. Base oficial

- Branch: `main`
- Commit registrado no workspace: `b23dea80ed7b676ebfd14c6597f02f4ccac9db27`
- Estado: workspace com evolução não commitada anterior à etapa
- Package: `br.com.parksolutions.totempark`
- VersionCode atual: `1`
- VersionName atual: `1.0-player`
- APK: `Totem-Park-Player-OFFICIAL-BEFORE-RC.apk`
- SHA-256: `54FBACE09A0551E307C5E5A1BCC7BBE69BEEB7FE05A8A49A1DA3FA00E9D22176`
- Assinatura: APK Signature Scheme v2
- Certificado SHA-256: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`

O APK oficial e seu hash são a âncora exata do build validado na TV. O commit isolado não descreve integralmente a evolução acumulada ainda não commitada no workspace.

## 2. RC

- Package: `br.com.parksolutions.totempark`
- VersionCode: `2`
- VersionName: `1.0.0-2a2-a-rc1`
- APK: `Totem-Park-Player-2A2-A-RC1.apk`
- Tamanho: 6.338.170 bytes
- SHA-256: `E8F8AF0A9F62DB12325C3AC8856CC2A93D8631B7CA03319F12609C25CFB02D35`
- Assinatura: APK Signature Scheme v2 válida
- Certificado SHA-256: `72E6E078AA690A678E8ED2854B348C402762F9D980EC1CDF7E1261BB5F7409A7`

## 3. Assinatura compatível

**SIM.** O APK oficial atual, o RC e o rollback usam exatamente o mesmo certificado SHA-256.

## 4. Atualização in-place possível

**SIM, pela configuração binária.** O RC mantém o mesmo package, usa a mesma assinatura e aumenta o VersionCode de 1 para 2.

A comprovação definitiva depende da instalação física por cima do aplicativo existente, sem desinstalação.

## 5. Arquivos alterados

| Arquivo | Mudança | Motivo |
|---|---|---|
| `.env.playerRc` | Modo `playerRc`. | Isolar o bundle RC. |
| `package.json` | Scripts RC. | Gerar o bundle correto. |
| `android/app/build.gradle` | Flavors `playerRc` v2 e `playerRollback` v3. | Atualização e rollback in-place. |
| `android/app/src/playerRc/` | Manifest e assets RC. | Empacotar o RC no package oficial. |
| `android/app/src/playerRollback/` | Manifest e assets oficiais anteriores. | Permitir rollback sem desinstalar. |
| `src/App.jsx` | Modo RC, Local First e diagnóstico local mínimo. | Promover somente a Fase A homologada. |
| `src/android-media-source.js` | Resolver Local First. | Priorizar arquivo local válido. |
| `src/android-diagnostics.js` | Armazenamento/exportação local RC. | Medir o teste sem tráfego remoto. |
| `tests/android-media-source.mjs` | Oito cenários do resolver. | Validar prioridade local. |

## 6. Backend

**ALTERADO? NÃO.** Nenhuma função, Firebase, Firestore, Storage, regra, schema ou migration foi alterado.

## 7. Web

**ALTERADA/PUBLICADA? NÃO.** Nenhum deploy Web ou Service Worker foi realizado. O bundle está isolado no source set Android RC.

## 8. Sequência

**ALTERADA? NÃO.** Índice, avanço, timers, `onEnded`, durações, ordem, templates e realtime foram preservados.

## 9. Timeout/retry

**ALTERADO? NÃO.** Permanece reservado para a Fase B.

## 10. Dados antes do update

**PENDENTE DE REGISTRO FÍSICO.** Registrar na TV piloto: tela `KEYFRK`, versão instalada, vínculo, playlist, status online e funcionamento normal. Não limpar nada.

## 11. Instalação por cima

**PENDENTE DE AUTORIZAÇÃO E TESTE FÍSICO.** O RC não foi instalado.

## 12. Vínculo

Preservado? **PENDENTE.** Gate obrigatório: o RC deve abrir diretamente na tela vinculada, sem pedir código.

## 13. Cache

Preservado? **PENDENTE.** Gate obrigatório: mídias existentes devem produzir fonte local sem novo FileTransfer desnecessário.

## 14. Local First

Implementação: **APROVADA NO CANARY.** Comportamento in-place no package oficial: **PENDENTE**.

## 15. Dez ciclos cache quente

**PENDENTE.** Critério: ordem correta, FileTransfer adicional 0 para mídia existente, Remote 0 quando local válida e Local maior que 0.

## 16. Mídia nova

**PENDENTE.** Critério: um miss, um download principal e reproduções seguintes locais.

## 17. Reabertura

**PENDENTE.** Vínculo/cache preservados e nenhum redownload.

## 18. Restart físico

**PENDENTE.** Autostart, vínculo, playlist, cache e Local First devem ser preservados.

## 19. Offline

**PENDENTE.** Dez ciclos planejados; protocolo poderá ser reduzido somente mediante decisão registrada após evidência suficiente.

## 20. Restart offline

**PENDENTE.** Aplicativo, vínculo, cache e playlist local devem retornar sem internet.

## 21. Reconexão

**PENDENTE.** Heartbeat/realtime devem retornar sem redownload.

## 22. Long run

- Duração: pendente
- Ciclos: pendente
- Local: pendente
- Remote: pendente
- Downloads: pendente
- Errors: pendente

## 23. Rollback

Artefato preparado:

- APK: `Totem-Park-Player-ROLLBACK-RC1-v3.apk`
- Package: `br.com.parksolutions.totempark`
- VersionCode: `3`
- VersionName: `1.0-player-rollback-rc1`
- SHA-256: `AD3BA899C87B52C82116ED34A24C2F6D3BFC1B7DE979D37EE66365A6F14A3963`
- Certificado: igual ao oficial e ao RC
- Bundle Web: 45/45 arquivos idênticos byte a byte ao APK oficial anterior

Procedimento de rollback:

1. interromper o teste e manter os dados intactos;
2. não desinstalar e não limpar dados/cache;
3. instalar `Totem-Park-Player-ROLLBACK-RC1-v3.apk` diretamente por cima do RC;
4. se o Android não apresentar a operação como atualização, cancelar e parar;
5. abrir o Player e validar vínculo, playlist, cache e status online;
6. não usar o APK oficial v1 diretamente sobre o RC v2, pois isso seria downgrade.

## 24. Comparação binária/config

| Propriedade | Oficial atual | RC | Rollback |
|---|---|---|---|
| Package | `br.com.parksolutions.totempark` | igual | igual |
| VersionCode | 1 | 2 | 3 |
| Certificado | `72E6…09A7` | igual | igual |
| Assinatura v2 | válida | válida | válida |
| Bundle Web | oficial anterior | Fase A + diagnóstico RC | 45/45 assets iguais ao oficial anterior |

As diferenças funcionais do RC ficam restritas ao Local First e à instrumentação local mínima. Nenhuma solicitação HEAD, fetch, ping ou API foi adicionada para medição.

## 25. Validações técnicas

- Resolver Local First: 8/8 testes aprovados.
- ESLint dos módulos alterados: aprovado.
- Vite `build:player-rc`: aprovado; aviso não bloqueante de bundle acima de 500 kB.
- Gradle `assemblePlayerRcDebug`: aprovado.
- Gradle `assemblePlayerRollbackDebug`: aprovado.
- Package, VersionCode, VersionName, assinatura e certificado: aprovados.
- Bundle RC contém `/diagnostico-rc` e não contém rotas LAB/CANARY.
- Rollback contém exatamente os assets do APK oficial anterior.
- Nenhuma instalação ou publicação foi realizada.

## 26. Clientes atuais

**FORAM AFETADOS? NÃO.** Nenhum cliente ou TV foi atualizado.

## 27. CONCLUSÃO

**RC OFICIAL APROVADO PARA ROLLOUT CONTROLADO.**

O teste rápido comprovou atualização por cima sem desinstalar, preservação de vínculo, cache e Local First, reabertura, offline curto e reconexão sem redownload. O rollback não foi necessário. Nenhuma publicação ou atualização de clientes foi realizada.

## 28. Validação em segunda TV física

O RC1 também foi validado em uma segunda TV, com hardware diferente. A primeira TV foi previamente desconectada para evitar concorrência de vínculo na mesma tela/playlist.

Resultado observado:

- cache: 12 hits / 0 misses;
- reprodução: 11 local / 0 remota;
- origem: LOCAL;
- downloads concluídos: 0;
- bytes baixados: 0;
- falhas: 0;
- timeouts: 0;
- reprodução visual normal.

Veredito: **APROVADO.** A segunda TV confirmou novamente `CACHE LOCAL VÁLIDO → PLAYER USA LOCAL → SEM NOVO DOWNLOAD DE MÍDIA`.

## 29. Encerramento da Fase A

A correção Android 2A.2-A Local First está validada em LAB, CANARY, RC1 oficial com atualização in-place e duas TVs físicas com hardware diferente.

**2A.2-A — LOCAL FIRST: HOMOLOGAÇÃO TÉCNICA APROVADA.**

A produção permanece sem rollout geral. A Fase B, timeout/retry, backend, Web e clientes não foram alterados. Nova homologação extensa da Fase A somente deverá ocorrer diante de mudança material ou regressão comprovada.
