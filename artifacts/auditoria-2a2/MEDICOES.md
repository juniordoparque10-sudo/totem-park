# Medições novas — 18/09/2026

Chromium real + módulo Web real; harness DOM, não React completo. Corpos servidos pela origem (sem headers/TLS), não bytes faturados nem bytes decodificados. Delay observado pelo harness: 20ms entre atribuição remota e início da preparação. O período com SW vem depois do período sem SW: HTTP cache está quente; não interpretar a diferença como economia causada pelo SW.

| Condição | Corpo servido (bytes) | Cache preparado | Falhas | Primeiro frame/load desde T0 (ms) |
|---|---:|---:|---:|---:|
| no-sw-small.webm-empty | 55312 | 1 | 0 | 61.2 |
| no-sw-small.webm-ready | 0 | 1 | 0 | 17.6 |
| no-sw-small.webm-reload | 0 | 1 | 0 | 5.3 |
| no-sw-image.png-empty | 31298 | 1 | 0 | 2.7 |
| no-sw-image.png-ready | 0 | 1 | 0 | 2.1 |
| no-sw-image.png-reload | 0 | 1 | 0 | 1.9 |
| no-sw-big.webm-empty | 57894224 | 0 | 1 | 101.5 |
| no-sw-big.webm-ready | 28947112 | 0 | 1 | 71.0 |
| no-sw-big.webm-reload | 28947112 | 0 | 1 | 61.9 |
| sw-small.webm-empty | 27656 | 1 | 0 | 18.5 |
| sw-small.webm-ready | 0 | 1 | 0 | 11.9 |
| sw-small.webm-reload | 0 | 1 | 0 | 7.4 |
| sw-image.png-empty | 15649 | 1 | 0 | 2.9 |
| sw-image.png-ready | 0 | 1 | 0 | 4.0 |
| sw-image.png-reload | 0 | 1 | 0 | 2.0 |
| sw-big.webm-empty | 28947112 | 0 | 1 | 78.9 |
| sw-big.webm-ready | 28947112 | 0 | 1 | 34.1 |
| sw-big.webm-reload | 28947112 | 0 | 1 | 79.4 |
| sw-image.png-restart | 0 | 1 | 0 | 5.5 |
| sw-image.png-offline | 0 | 1 | 0 | 1.8 |

Condições ready/reload do vídeo grande são **tentativas**, não cache cheio: failed=1. ready/reload dos itens pequenos resolvem cache antes do src; o React atual não foi instrumentado/repetido.

## Timeline por carga fria

### no-sw-small.webm-empty

| Evento | ms desde T0 |
|---|---:|
| T0-playlist | 0.00 |
| T1-selected | 0.20 |
| T2-src | 1.90 |
| T3-playback-request (ResourceTiming) | 51.00 |
| T4-prepare | 51.80 |
| T5-cache-fetch | 59.50 |
| T10-first-frame | 61.20 |
| T6-cache-response | 63.10 |
| T7-cache-stored | 68.80 |
| T8-blob | 69.80 |
| T9-map-updated | 70.70 |

| URL | Método | Status | Range | Content-Length | Corpo servido |
|---|---|---:|---|---:|---:|
| http://127.0.0.1:5204/media/small.webm | GET | 206 | bytes=0- | 27656 | 27656 |
| http://127.0.0.1:5204/media/small.webm | GET | 200 | ausente | 27656 | 27656 |

ResourceTiming, CDP initiators/headers e timestamps completos em measurement.json. T3 usa ResourceTiming.startTime, no mesmo relógio do documento; CDP/epoch completos permanecem nos registros brutos sem subtração entre relógios.

### no-sw-image.png-empty

| Evento | ms desde T0 |
|---|---:|
| T0-playlist | 0.00 |
| T1-selected | 0.00 |
| T2-src | 0.10 |
| T3-playback-request (ResourceTiming) | 0.20 |
| T10-image-loaded | 2.70 |
| T4-prepare | 20.80 |
| T5-cache-fetch | 21.60 |
| T6-cache-response | 23.50 |
| T7-cache-stored | 25.50 |
| T8-blob | 26.10 |
| T9-map-updated | 26.20 |
| T10-image-loaded | 27.20 |

| URL | Método | Status | Range | Content-Length | Corpo servido |
|---|---|---:|---|---:|---:|
| http://127.0.0.1:5204/media/image.png | GET | 200 | ausente | 15649 | 15649 |
| http://127.0.0.1:5204/media/image.png | GET | 200 | ausente | 15649 | 15649 |

ResourceTiming, CDP initiators/headers e timestamps completos em measurement.json. T3 usa ResourceTiming.startTime, no mesmo relógio do documento; CDP/epoch completos permanecem nos registros brutos sem subtração entre relógios.

### no-sw-big.webm-empty

| Evento | ms desde T0 |
|---|---:|
| T0-playlist | 0.00 |
| T1-selected | 0.00 |
| T2-src | 0.40 |
| T3-playback-request (ResourceTiming) | 0.70 |
| T4-prepare | 20.80 |
| T5-cache-fetch | 21.50 |
| T6-cache-response | 45.80 |
| T10-first-frame | 101.50 |
| T9-map-updated | 126.90 |
| cache-error | 126.90 |

| URL | Método | Status | Range | Content-Length | Corpo servido |
|---|---|---:|---|---:|---:|
| http://127.0.0.1:5204/media/big.webm | GET | 206 | bytes=0- | 28947112 | 28947112 |
| http://127.0.0.1:5204/media/big.webm | GET | 200 | ausente | 28947112 | 28947112 |

ResourceTiming, CDP initiators/headers e timestamps completos em measurement.json. T3 usa ResourceTiming.startTime, no mesmo relógio do documento; CDP/epoch completos permanecem nos registros brutos sem subtração entre relógios.

## Persistência / limites

Inventário ao fim: 27656 bytes, SHA256 5f5015fbb36a8379f70a8861a71efa490ab4a4945bef4460fd6a71be6a940013; 15649 bytes, SHA256 693d9b80d37e3cbb797ae1ae390d6bd9e5b7aff990231b8a58f67b64dccd72fd.

Restart em contexto persistente e offline: imagem carregou do Blob; teste complementar persistence.json confirma vídeo pequeno loadeddata e imagem loaded do cache após novo processo Chromium. Não foram calculados hashes adicionais no teste complementar, mas inventário SHA anterior foi persistido.

Diagnóstico grande: arrayBuffer e stream recebem28.947.112, Blob falha mesmo sem playback/SW; cache de resposta sintética28.947.112 funciona. Quota informada pelo navegador10GiB, disco real~1,9GB livres. Falha não depende de concorrência e não é quota simples do CacheStorage. Limitação de Blob/disk é hipótese fundamentada, não causa raiz comprovada. Execução fora do sandbox teve a mesma falha. Fonte de arquitetura: [Blob storage Chromium](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/storage/browser/blob/README.md).
