# Teste de regressão — imagem Blob no Player Web

Pré-requisito: emuladores locais `demo-totem-homolog` ativos, configurados por `../firebase.local.json` (Auth 9288, Firestore 8288, Storage 9388). O script recria somente dados fictícios nesses emuladores. Nenhum endpoint de produção é utilizado.

Na raiz do projeto:

```powershell
node tests/player-blob-image-readiness.mjs
node tests/web-cache-retention.mjs
node artifacts/homologacao-2a1/fix/verify-product.mjs
```

O primeiro comando usa o Chrome instalado e Playwright do runtime local, inicia servidores exclusivos em 5198/5199, usa um perfil exclusivo dentro de `chrome-profile-gate`, mede visibilidade real por dimensões/opacity/visibility, realiza dois encerramentos completos e testa agendamento e retenção entre clientes/telas. Encerra seus servidores e o Chrome de teste. Não gera APK e não publica.

Para reproduzir o comportamento anterior à correção visual:

```powershell
node tests/player-blob-image-readiness.mjs before-fix
```

A versão anterior é servida em memória usando `App.before.jsx`, sem sobrescrever o produto. O teste deve falhar na exigência de que todo intervalo completo de imagem tenha amostras visíveis.

Para validar as evidências já coletadas:

```powershell
node tests/player-blob-image-readiness.mjs --verify current
node tests/player-blob-image-readiness.mjs --verify before-2a1
node tests/player-blob-image-readiness.mjs --verify fixed
```

Os dois primeiros devem falhar (0/6 intervalos visíveis); o último deve passar. `current.json` representa o código com 2A.1 **antes** do FIX. `before-2a1.json` representa a reversão isolada das duas proteções da 2A.1. `fixed.json` representa o produto corrigido.

A CSP local é ignorada pelo Chrome de teste exclusivamente para permitir a inspeção `fetch(blobUrl)`; nenhuma CSP do produto é alterada. A comparação das versões usa o mesmo Chrome, viewport, política de autoplay, fixtures, playlist e método `context.setOffline(true)`.

`invalid-environment.json` e `before-2a1-first-attempt.json` são tentativas auxiliares, substituídas pelas execuções finais; não são usadas para aprovação. Nenhum perfil pessoal do Chrome é utilizado ou encerrado.
