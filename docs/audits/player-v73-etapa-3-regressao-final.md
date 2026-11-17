# Totem Park Player V73 BASIC — relatório final da Etapa 3

Data: 2026-11-17

Branch: `codex/player-v73-telemetria-simples-prep`

Base da etapa: `fea33f2a`

## Conclusão

A regressão automatizada disponível não encontrou falha operacional introduzida pela telemetria BASIC. A regressão operacional recebe aprovação **condicional**, porque decoder, rede, armazenamento e orientação físicos não podem ser comprovados sem APK/dispositivo, ambos proibidos nesta etapa.

A compatibilidade com o Portal atual está **reprovada e bloqueada** para homologação: há caminhos concretos que continuam lendo `currentMediaSource`, cache e now-playing antigos de topo sem validar o perfil BASIC. A correção lógica depende de autorização futura e não foi implementada nesta etapa.

Nenhum motor operacional, arquivo do Portal, CSS, componente visual, regra publicada ou serviço real foi alterado. Nenhum APK foi gerado.

## Resultados

- matriz operacional principal: 394/394 testes passaram;
- testes focados BASIC/heartbeat/comandos: passaram;
- regras Firestore no emulador: 19/19;
- funções de vínculo em emuladores: 3/3;
- build Vite `playerRc`: passou como verificação de compilação web, sem APK;
- geração isolada do `BuildConfig`: passou com JDK 21 e validou metadados Android sem montar APK;
- históricos: 10/15 passaram; cinco asserts/fixtures foram classificados como obsoletos, não como regressões BASIC.

## BASIC e comunicação

Foram validados o contrato estrutural de leitura via `PackageManager`, a geração do `BuildConfig`, instalação lógica, nova sessão, upgrade/downgrade, publicação atômica, substituição de documento legado, ausência de métricas avançadas e separação do listener de comandos. A leitura efetiva de um APK instalado pelo `PackageManager` permanece pendente para homologação física.

O heartbeat continua em 15 segundos: quatro escritas por minuto e 240 por hora. O envelope `telemetry` representativo mede 867 bytes em JSON. Esse número não inclui overhead Firestore/rede e não é usado para afirmar economia.

## Riscos

1. O Portal atual possui leitores `schemaVersion >= 3/4` que interpretam indevidamente schema 5 BASIC como avançado em caminhos identificados pela auditoria.
2. Campos avançados antigos de topo sobrevivem à substituição apenas do envelope `telemetry` e podem reaparecer em cards/PDF/detalhes; este é um bloqueio conhecido de compatibilidade.
3. Histórico avançado não possui limite temporal automático na migração para BASIC.
4. Testes automatizados não substituem codecs, GPU, filesystem, rede e rotação reais.
5. O repositório não possui um único script hermético para toda a matriz; a seleção foi executada por grupos explícitos.

## Correção futura do Portal, ainda não autorizada

Centralizar a classificação `schemaVersion === 5 && profile === "BASIC"`, validar identidade/sessão/epoch atuais e, nesse perfil, ler somente `installation`, `identity`, `session`, `connection` e `playback`. Não usar fallbacks avançados de topo. Schemas 3/4 continuam inalterados.

## Homologação física proposta

Executar em bancada, nunca em cliente, após autorização específica:

1. Instalar builds de homologação V73 e BASIC em dispositivos equivalentes, sem substituir produção.
2. Testar 1920×1080 e 1080×1920 com imagem, vídeo curto/longo, playlist mista, loop, reorder e troca de duração.
3. Validar agendamento normal, virada de meia-noite, reconexão e mudança remota durante reprodução.
4. Testar V1/V2, Clima, Notícias e Hora Certa online, offline, cold boot e retorno da rede.
5. Preencher cache, cortar rede, reiniciar processo/dispositivo e confirmar reprodução local-first.
6. Executar todos os comandos, incluindo duplicação e comandos concorrentes, medindo envio/ack e efeito visual.
7. Capturar tráfego por 24 horas conforme `player-v73-basic-traffic-measurement.md`.
8. Registrar vídeo/fotos, logs, hashes de mídia, contadores de bytes e latências p50/p95.

Critério de avanço: nenhuma perda funcional, nenhum campo avançado antigo apresentado como atual, comandos dentro da latência de referência da V73 e medição comparativa reproduzível. Não há autorização implícita para build, instalação, deploy, Portal ou produção.
