# 2A.2-C — Diff de regras antes do deploy

Data da captura: 2026-09-22  
Projeto: `totem-park`  
Release ativa: `projects/totem-park/releases/cloud.firestore`  
Ruleset ativo: `projects/totem-park/rulesets/49cb91dc-b61e-4d5d-9170-8bf3c5da0581`  
Criado em: `2026-06-12T13:34:24.463506Z`

## Backup integral

O conteúdo integral da regra publicada foi salvo em:

`artifacts/android-2a2-c/firestore-production-before-2026-09-22.rules`

## Alterações propostas localmente

```diff
@@ isAllowedPublicScreenUpdate()
         "totalCacheableItems"
+        ,"telemetry"
+        ,"telemetryUpdatedAt"

@@ /clients/{clientId}/screens/{screenId}
         allow update: if isMaster() || isClientOwner(clientId) || isAllowedPublicScreenUpdate();
+
+        match /telemetrySessions/{sessionId} {
+          allow read: if isMaster() || isClientOwner(clientId);
+          allow create, update: if request.resource.data.session.clientId == clientId
+            && request.resource.data.session.screenId == screenId
+            && request.resource.data.sequence is int;
+          allow delete: if isMaster();
+        }
```

## Coleções e documentos afetados

- Documento existente: `clients/{clientId}/screens/{screenId}`
  - novos campos graváveis publicamente: `telemetry` e `telemetryUpdatedAt`.
- Nova subcoleção: `clients/{clientId}/screens/{screenId}/telemetrySessions/{sessionId}`
  - leitura: master ou dono do cliente;
  - criação e atualização propostas sem autenticação obrigatória;
  - exclusão: somente master.

## Avaliação de segurança

O diff é pequeno em volume, mas **não é seguro nem estritamente aditivo em permissões**. Ele amplia a superfície de escrita pública:

1. Qualquer cliente não autenticado poderia escrever `telemetry` no documento de qualquer tela conhecida.
2. A nova subcoleção aceitaria `create` e `update` sem `request.auth`.
3. Comparar `session.clientId` e `session.screenId` com os segmentos do próprio caminho só valida valores declarados pelo remetente; não comprova vínculo, posse da tela ou identidade do dispositivo.
4. O `deviceId` atual é persistido localmente e não constitui credencial autenticada.

Conclusão do gate: **REPROVADO — NÃO PUBLICAR ESTA REGRA**.

## Alternativa segura exigida

Antes do piloto real, o Player deve receber uma identidade verificável e vinculada no servidor durante o pareamento. Duas opções compatíveis:

1. endpoint autenticado (Cloud Function/serviço) que valida credencial curta e vinculada à tela e grava a telemetria com Admin SDK; ou
2. Firebase Auth para o dispositivo, com vínculo `auth.uid → clientId/screenId/deviceId` criado exclusivamente pelo servidor no pareamento; as regras consultam esse vínculo e aceitam escrita apenas para a tela correspondente.

App Check pode complementar a proteção, mas sozinho não prova que o dispositivo possui aquela tela.

