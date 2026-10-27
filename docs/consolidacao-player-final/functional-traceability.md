# Matriz de rastreabilidade funcional — Player Android consolidado

Base limpa: `ad8e6cd045d3afddc1a4dc890fb141c15c4cb261`

Branch candidata: `codex/player-android-consolidacao-final`

Esta matriz registra o estado reconstruído. “Integrado” significa que o código independente reaplicado possui prova automatizada local; não significa nova homologação física. A instalação no Chromecast permanece como etapa posterior.

| Requisito | Estado | Evidência de implementação | Prova automatizada / observação |
|---|---|---|---|
| Templates V2 existentes e renderizadores | Integrado | `src/templates-v2/registry.js`, `TemplateV2Renderer.jsx` e renderizadores específicos | `templates-v2-dynamic-renderers.test.js`, `templates-v2-consolidated-player-web.test.js`, `template-v2-player-capability.test.js` |
| Layout, transparência e dimensionamento de logos | Integrado | `src/App.css`, renderizadores V2 e estilos de Smart Lobby/notícias | `template-v2-web-assets-and-layout.test.js`, `smart-lobby-dynamic.test.js`, `news-editorial-background-smart-lobby-text.test.js` |
| Smart Lobby e correções homologadas | Integrado | `src/templates-v2/smart-lobby/**`, preview/editor no Portal | `smart-lobby-dynamic.test.js`, fixtures de fidelidade de thumbnail; patches reconstruídos até `a1f0f66` |
| Hora Certa existente | Integrado | template oficial preexistente em `src/App.jsx`; contrato preservado | cobertura dos contratos consolidados. **Hora Certa V2.1 excluída** |
| Previsão do Tempo existente | Integrado | templates oficiais `clima`/`clima_premium_v2` preexistentes; contrato preservado | `portal-hotfix-dashboard-weather-session.test.js`. **Previsão do Tempo V2.1 excluída** |
| Esportes | Integrado | template/resultados esportivos e readiness reconstruídos | `sports-v2-readiness.test.js`, `sports-v2-semantic-colors.test.js` |
| Notícias | Integrado | `src/templates-v2/news-editorial-dynamic/**`, estado e feed dinâmico | `news-editorial-dynamic-feed.test.js`, `news-editorial-background-smart-lobby-text.test.js` |
| Mercado Premium | Integrado | `src/templates-v2/market-premium/**` | testes de renderizadores e dados dinâmicos V2 |
| RSS, atualização de dados e rotação interna | Integrado | `src/rss-endpoint.js`, loaders e `dynamic-layout/rotation.js` | `rss-*.test.js`, `template-v2-dynamic-data.test.js`, `template-v2-dynamic-rotation.test.js` |
| Tela de manutenção aprovada | Integrado | apresentação de manutenção em `src/App.jsx`/`App.css` | `player-v59-visual-gate.test.js`; artefatos APK históricos não foram incorporados |
| Agendamentos e quatro selos | Integrado | `src/player-schedule-v62.js`, `PlayerScheduleNotice.jsx`, apresentação do Portal | `player-schedule-v62.test.js`, `portal-schedule-presentation.test.js` |
| Reprodução, transições e Fade Suave | Integrado | runtime Web/Player e estilos de transição reconstruídos | `template-v2-preview-playback.test.js`, `single-item-loop.test.js`, testes de playlist/reordenação |
| Local First, cache e recuperação Firestore Full/Lite | Integrado | `offline-player-cache.js`, `player-cache-state.js`, `firestore-cache-policy.js`, cache/journal nativo | `offline-player-cache-identity.test.js`, `player-cache-state.test.js`, `firestore-cache-policy.mjs`, `v39-native-cache-forensics.test.js` |
| Telemetria V2-A: coleta local, sincronização, versão e Portal | Integrado | `player-telemetry.js`, `player-activity-telemetry.js`, `operational-telemetry.js`, dashboards | `player-telemetry.test.js`, `player-activity-telemetry*.test.js`, `operational-telemetry.test.js`, `telemetry-v2-layout.test.js`; versão/capability V66 preservada para posterior incremento da candidata |
| Contrato de publicação Portal → Player | Integrado | gates de capability, schema/registry V2, guardas de publicação e leitura tolerante | `template-v2-player-capability.test.js`, `template-permissions.mjs`, `templates-v2-consolidated-player-web.test.js`; testes finais de contrato serão adicionados na Task 3 |
| TV ao Vivo | Ausente por requisito | nenhum patch da funcionalidade foi reaplicado | bloqueio negativo final na Task 3 |
| Motor experimental de personalização compartilhada | Ausente por requisito | `dynamic-collections/editor-state.js` e seu teste V2.1 não existem na candidata | ancestralidade e bloqueio negativo final na Task 3 |

## Isolamento comprovado

- `git merge-base --is-ancestor 657398b HEAD` retornou `1`.
- `git merge-base --is-ancestor 6fccc71 HEAD` retornou `1`.
- `src/templates-v2/dynamic-collections/editor-state.js` está ausente.
- `tests/web-v2.1-hotfix.test.js` está ausente.
- Os 42 arquivos de teste alterados pelos patches reaplicados executaram 251 testes: 251 aprovados, 0 falhas.

## Pendência deliberada

A homologação física nesta candidata não é repetida nesta fase: o usuário determinou que a próxima etapa será a instalação manual no Chromecast e conferência na TV. Logo, a matriz comprova integração e regressão automatizada, não substitui a validação física futura.
