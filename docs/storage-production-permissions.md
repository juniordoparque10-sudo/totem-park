# Verificação pós-publicação do Storage

As regras de storage.rules consultam settings/masterAccess e clients/{clientId} no Firestore.

Além de publicar as regras, o serviço abaixo precisa da função IAM roles/firebaserules.firestoreServiceAgent no projeto totem-park:

service-442546117681@gcp-sa-firebasestorage.iam.gserviceaccount.com

Essa função estava ausente e foi atribuída em 12/09/2026. Sua ausência pode recusar administradores e proprietários legítimos, mesmo quando os testes do emulador passam.

Após alterações nas regras:
1. Execute tests/client-crud-permissions.mjs nos emuladores de Firestore e Storage.
2. Confira no IAM de produção a função acima, incluindo concessões fornecidas pelo Google.
3. Faça um upload pequeno com uma sessão real de administrador e com uma sessão real de cliente. Uma chamada com credenciais administrativas da API não substitui o teste do SDK autenticado.
4. Confirme que contas diferentes continuam sem autorização para escrever no cliente alheio.

Correção exclusivamente no servidor; não exige novo APK ou mudança no upload. Nenhuma mídia existente foi alterada durante o diagnóstico.

Documentação: https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service_cloud_storage_security_rules
