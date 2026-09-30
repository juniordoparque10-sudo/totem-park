# 2A.2-C — Binary Sealed Telemetry Pilot

## Baseline e integridade

- APK baseline: `artifacts/rebaseline-rc5/Totem-Park-Player-ROLLBACK-RC5-v11.apk`
- SHA-256 baseline: `F67F7D8CA6523D23B263EE854CF3CE6F44EF80DC96C48C9E3B81CF7560B21AE9`
- Bundle principal v11: `assets/public/assets/index-C8VMWlD5.js`
- SHA-256 do bundle, v11 e piloto: `E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB`
- CSS ativo, v11 e piloto: `assets/public/assets/index-GA5ypR-T.css`
- SHA-256 do CSS, v11 e piloto: `77391472D6D3A2A464B24488322B6CBC09511D2E8FAE63229853234DB9594BD5`
- Outros 53 assets originais: SHA-256 idêntico dentro do APK final.
- Diferenças intencionais nos assets: `index.html` carrega o sidecar; `sw.js` versiona o cache do app shell e inclui o sidecar para reabertura offline; `telemetry-observer.js` é novo.
- O build não recompila `App.jsx` nem altera o bundle minificado de reprodução.

## Piloto

- APK: `artifacts/binary-sealed-telemetry/Totem-Park-Player-2A2-C-BINARY-SEALED-PILOT.apk`
- Package: `br.com.parksolutions.totempark.player.telemetry`
- VersionCode: `2`
- VersionName: `1.0-player-2a2-c-binary-sealed-pilot`
- SHA-256: `D199E8F2D82B1FD3658F0B9F61748811F0937E60B3310E6F04FEBA3B2383143E`
- Certificado debug SHA-256: `72e6e078aa690a678e8ed2854b348c402762f9d980ec1cdf7e1261bb5f7409a7`, igual ao piloto anterior deste package.

## Observação e dados

- Sidecar separado: `sealed-telemetry/telemetry-observer.js` e `sealed-telemetry/observer-core.js`.
- Observa `video` e `img` por listeners passivos e `MutationObserver` de nós adicionados. Não escreve no DOM, não chama `play`/`pause`, não atribui `src` ou `currentTime`, não intercepta requisições de mídia e não registra `timeupdate`.
- Origem é inferida do `currentSrc`: arquivo/rota Capacitor conhecido = `CACHE_LOCAL`; HTTP(S) comum = `INTERNET_FALLBACK`; demais = `UNKNOWN`.
- Coleta eventos de vídeo `play`, `playing`, `pause`, `waiting`, `stalled`, `canplay`, `ended`, `error`, `emptied`, `abort`; imagem `load`, `error`, `abort`. Erro código 3 é rotulado `MEDIA_ERR_DECODE`.
- Cache hits/misses internos, FileTransfer, bytes de mídia, retries e download lock **não são instrumentados**. O dashboard mostra `—` para métricas ausentes no source local; essa alteração Web não foi publicada.
- Identidade: Firebase Anonymous Auth e Functions existentes; envio exige binding ACTIVE, IDs correspondentes e flag atual obtida do servidor. O UID anterior só será reutilizado se a atualização in-place preservar os dados do package; isso requer validação física posterior.
- Flag de produção permaneceu `enabled: false`, com allowlists vazias. Não houve envio ou ativação nesta etapa.
- Buffer local limitado a 512 KB, 40 eventos, 20 transições, 12 snapshots na outbox; checkpoint de 5 minutos e histórico de no máximo uma gravação por 15 minutos. Histórico usa documento por sessão e sequência crescente.

## Estimativa de payload

Cenário sintético reproduzível com `node sealed-telemetry/estimate.mjs`, alternando dois vídeos locais:

- Checkpoint: 1.866 bytes.
- Histórico: 1.879 bytes.
- 288 checkpoints e 96 históricos/dia: **717.792 bytes/dia/tela ≈ 701 KiB/dia/tela**, sem overhead de protocolo, Auth, listeners ou compressão. A medição real é gate do teste físico.

## Validação local

- 4 testes focados do observer aprovados.
- ESLint do dashboard e sidecar aprovado.
- Build Web local aprovado, sem deploy.
- Build Android isolado `assemblePlayerTelemetryDebug` aprovado.
- Smoke test local no navegador: app v11 renderizou a tela de orientação; inventário de recursos confirmou carregamento do bundle principal e do `telemetry-observer.js`; sem erros de console observados. Não substitui o teste na TV.
- Package, VersionCode, assinatura e conteúdo do APK verificados.
- Sem instalação, publicação, mudança de allowlist ou alteração da flag.

## Riscos para a homologação

- O sidecar adiciona cerca de 446,5 KB de JavaScript ao APK (121,7 KB comprimidos). Seu custo real de CPU/memória em Google TV ainda exige teste físico.
- O package tem armazenamento de mídia próprio; cache quente do v11 oficial não é compartilhado.
- Se Auth local do antigo piloto tiver sido perdido, o binding existente pode impedir novo pareamento até resolução controlada. Não presumir reutilização do UID.
- O bundle Web de reprodução está selado, mas o wrapper Android foi recompilado e o service worker do app shell foi versionado para carregar o sidecar offline. A equivalência física do conjunto ainda depende de homologação.

**Classificação: BINARY SEALED PILOT — PRONTO PARA HOMOLOGAÇÃO.** Não aprovado para rollout.
