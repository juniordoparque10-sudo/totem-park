# V71 Firestore Quota Hotfix — Design

## Intent

Eliminar o `QuotaExceededError` em `firestore_mutations_firestore/...` no Player Android e restaurar heartbeats/estado ONLINE sem alterar reprodução, Portal ou Firebase Rules.

## Root cause

O Player nativo inicializa `persistentLocalCache()` com `persistentMultipleTabManager()`. No Firebase 12.14.0, o modo multiaba usa `WebStorageSharedClientState` e grava metadados de mutações em `localStorage` com prefixo `firestore_mutations_`. Uma WebView Player possui uma única aba e não precisa dessa coordenação.

## Approved approach

- Usar `persistentSingleTabManager()` exclusivamente no Player Android; Web/Portal mantém `persistentMultipleTabManager()`.
- Manter as mutações e documentos no IndexedDB.
- Após `waitForPendingWrites()` confirmar a drenagem das escritas anteriores, remover somente chaves `firestore_*` reconhecidas como metadados de coordenação multiaba da base `firestore/[DEFAULT]/totem-park/main`.
- Se a confirmação falhar ou permanecer pendente/offline, não remover nada, não bloquear a reprodução e tentar novamente em evento online/heartbeat posterior.
- Depois da recuperação confirmada, solicitar um heartbeat imediato; falhas continuam visíveis e não são mascaradas.

## Non-goals

Nenhuma alteração em templates, UI, Portal, Rules, mídia, vínculo, playlists, telemetria, comandos ou conteúdo IndexedDB. Nenhuma instalação ou publicação.

## Verification

Testes reproduzem cota cheia na chave real, comprovam ausência de limpeza antes da confirmação, preservação de chaves Totem Park e retomada do heartbeat. Somente depois são gerados bundle e APK separados de hotfix.
