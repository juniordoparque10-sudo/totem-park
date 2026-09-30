# Homologação local do Totem Park — 2A.1

Ambiente criado a pedido do usuário. Não é produção e não publica nada.

- Aplicação real: http://127.0.0.1:5199/
- Bancada de atualização do Service Worker: http://127.0.0.1:5198/
- Projeto emulado: `demo-totem-homolog` (não existe projeto remoto associado).
- Conta fictícia: `homologacao@example.test` / `Homologacao-local-2026!`
- Códigos de tela: `TESTA1`, `TESTA2` (cliente A), `TESTB1` (cliente B).

`app-server.mjs` transforma SOMENTE a configuração Firebase servida em memória pelo servidor local, conectando Auth, Firestore e Storage aos emuladores. O arquivo `src/firebase.js` não é editado. A política CSP local bloqueia conexões externas, inclusive APIs de localização/clima. Essa limitação é intencional na bancada e não representa regressão do produto. `observer.js` só registra observações locais de DOM, Cache Storage e Resource Timing, sem alterar a reprodução.

As regras nesta pasta são cópias das regras existentes. Nenhuma regra é publicada. As mídias foram geradas localmente pelo Canvas/MediaRecorder; não contêm dados de clientes reais. O seed escreve exclusivamente em endereços fixos `127.0.0.1`, sob o projeto demo.

## Reiniciar o ambiente

Na raiz do repositório, abra três terminais:

1. `node artifacts/homologacao-2a1/server.mjs`
2. Entre em `artifacts/homologacao-2a1`, configure `JAVA_HOME` para o JBR do Android Studio e execute `npx.cmd --yes firebase-tools emulators:start --project demo-totem-homolog --config firebase.local.json --only auth,firestore,storage`.
3. `node artifacts/homologacao-2a1/app-server.mjs`

Depois de os emuladores estarem prontos, na raiz execute `node artifacts/homologacao-2a1/seed.mjs` e abra o endereço 5199. O seed repõe dados fictícios; não execute durante uma medição em andamento. Os dados do emulador são descartáveis e o seed recria o estado inicial.

## Repetir cenários

`node artifacts/homologacao-2a1/scenario.mjs <ação>` aceita `update`, `switch`, `restore`, `schedule`, `unschedule`, `template`, `clear` e `status`. Só altera o Firestore local.

Para repetir o ciclo SW anterior → novo na porta 5198, use uma sessão/origem de teste limpa: o servidor inicia oferecendo o SW anterior, que tem a exclusão destrutiva original. Não aponte esta bancada para uma origem de produção. O botão de preparação gera mídias novas; se usado, execute o seed novamente para atualizar os tamanhos das fixtures.

## Evidências

- `evidence.json`: eventos da bancada e do player real, inventários de cache e requisições HTTP do servidor local. `bodyBytes` mede corpo enviado pelo servidor, não tráfego total na interface de rede.
- `scenarios.jsonl`: comandos de teste e estado das telas no emulador.
- `verification.json`: resumo verificável das evidências e comparação estática.
- `gestor-local.png`, `player-real.png`, `player-servidor-indisponivel.png`: capturas do navegador real.
- `RELATORIO.md`: resultado da homologação, incluindo testes não executados.

Os testes em navegador usaram Chromium 152 integrado. Não há API disponível para encerrar/reabrir todo esse navegador ou alternar DevTools Offline. Fechamento de aba e indisponibilidade do servidor de mídias foram testados, sem confundi-los com esses cenários pendentes.

Sem deploy, APK, commit, migração ou alteração de produção.
