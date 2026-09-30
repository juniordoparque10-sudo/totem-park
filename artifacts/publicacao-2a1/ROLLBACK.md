# Publicação 2A.1 + FIX — plano de rollback

VERSÃO ANTERIOR:
Deployment: dpl_AdMkvihNUgSQsWp6vBHohmY3f1Ty
URL: https://totem-park-l12hw1ajq-junior-pk-s-projects.vercel.app
Criado: 12/09/2026 15:56:40 America/Sao_Paulo
Commit informado: b23dea80ed7b676ebfd14c6597f02f4ccac9db27
O deploy anterior foi realizado com gitDirty=1. Portanto, a referência exata é o deployment imutável, e não um checkout simples desse commit.
Bundle anterior: /assets/index-BYVv7xHU.js

VERSÃO NOVA:
Release: 2A.1 + FIX
Pacote isolado: artifacts/publicacao-2a1/release
Bundle local aprovado: /assets/index-BNJWtZvH.js
Diff de produto: public/sw.js, src/offline-player-cache.js, src/App.jsx
Deployment novo: será registrado após publicação.

ROLLBACK:
Na pasta isolada release:

npx.cmd --yes vercel rollback dpl_AdMkvihNUgSQsWp6vBHohmY3f1Ty --yes --scope junior-pk-s-projects

Depois confirmar o alias totempark.com.br com vercel inspect e comparar o bundle anterior.
Não executar preventivamente. Usar somente em regressão atribuível à release. Nenhum rollback foi executado na preparação.
O rollback restaura também o comportamento antigo do SW; não acrescentar correções ao build anterior e não usar clearCache.

ROLLOUT:
Global para o código Web do projeto, por limitação da hospedagem atual. Não foi encontrado mecanismo existente de código por cliente/tela. Não será criado mecanismo novo. APKs e backend fora do escopo.
