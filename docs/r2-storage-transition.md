# Transição de Storage do Totem Park

Este projeto agora tem uma camada central de upload/exclusão em `src/storage-service.js`.
Por padrão, ela mantém o Firebase Storage ativo para não alterar o comportamento atual.

## Estado atual seguro

- Firestore continua guardando metadados.
- URLs antigas do Firebase continuam funcionando.
- Uploads novos continuam indo para Firebase enquanto `VITE_STORAGE_PROVIDER` não for alterado.
- O cache offline do Player usa manifesto versionado e só baixa arquivos novos ou alterados.

## Como ativar R2 depois de testar

No frontend:

```env
VITE_STORAGE_PROVIDER=r2
VITE_STORAGE_API_URL=https://storage.seu-worker.com
```

No Worker Cloudflare:

```env
FIREBASE_PROJECT_ID=totem-park
R2_PUBLIC_BASE_URL=https://media.totempark.com.br
MASTER_EMAILS=admin@parksolutions.com,juniordoparque10@gmail.com
```

Também é necessário vincular um bucket R2 com o binding:

```txt
MEDIA_BUCKET
```

## Segurança

O Worker em `workers/r2-storage-worker.js` valida o token Firebase e só aceita caminhos em:

- `clients/{clientId}/media/`
- `clients/{clientId}/marketing/`
- `clients/{clientId}/templates/`
- `clients/{clientId}/profile/`

Para liberar clientes não master no R2, use uma destas opções no token Firebase:

- `clientId`
- `clientIds`

Sem isso, apenas emails listados em `MASTER_EMAILS` conseguem usar o Worker.

## Plano de migração recomendado

1. Publicar o Worker em ambiente de teste.
2. Testar upload, preview, playlist e Player com um cliente pequeno.
3. Confirmar que o `publicUrl` do R2 abre nas Smart TVs.
4. Ativar `VITE_STORAGE_PROVIDER=r2` só depois dos testes.
5. Manter mídias antigas no Firebase até serem substituídas naturalmente.

## Cache inteligente

O Player agora registra manifesto com identidade estável do arquivo:

- `storagePath`
- `fileVersion`, `fileHash` ou `etag`, quando existirem
- `sizeBytes`
- URL como fallback

Quando uma playlist muda, o Player baixa apenas arquivos novos ou alterados. Arquivos removidos da playlist podem ser limpos do cache local sem baixar tudo novamente.
