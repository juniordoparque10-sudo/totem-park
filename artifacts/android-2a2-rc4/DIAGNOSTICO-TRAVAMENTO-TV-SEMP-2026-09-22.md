# OCORRÊNCIA RC4 — TV SEMP 50"

Data: 2026-09-22  
Horário informado: 10:16  
Tela: TV Teste — KEYFRK  
Hardware: Semp 50" Google TV

## Evidência disponível

- O travamento ocorreu no primeiro vídeo da playlist de dois vídeos.
- A playlist estava configurada sem áudio.
- A reprodução voltou somente após atualização manual pelo controle remoto.
- Foi observada uma ocorrência.
- Não existe exportação diagnóstica do RC4 posterior ao evento. O JSON mais recente disponível foi exportado em 2026-09-21 e pertence à auditoria 2A.2-B; portanto, não cobre 10:16 de 2026-09-22.
- O RC4 registra atribuição de fonte, início, fim e erro de reprodução. Os callbacks `waiting` e `stalled` estão vazios e não há registro de `pause`, `suspend`, `abort`, `emptied`, `canplay` ou `canplaythrough`.

## Mídia

O nome exato da mídia travada não pode ser confirmado sem a telemetria da sessão atual. A playlist usada anteriormente nessa TV continha:

| Mídia | mediaId | Container | Tamanho validado | Duração observada anteriormente | Fonte anterior |
|---|---|---:|---:|---:|---|
| `vd 2.mp4` | `OxF3BTa2yiqWBc3vnETv` | MP4 | 135.677.009 bytes | cerca de 41 s | LOCAL |
| `vd teste.mp4` | `WRUfV6KMnneH0gT5t8zV` | MP4 | 84.023.317 bytes | cerca de 41 s | LOCAL |

Codec e resolução não constam nos diagnósticos disponíveis. Também não há evidência suficiente para confirmar qual das duas mídias ocupava a primeira posição às 10:16.

## Cache e download

O diagnóstico físico anterior da mesma combinação de mídias registrou:

- os dois arquivos com tamanho final exato;
- fonte `LOCAL` para ambos;
- quatro FileTransfers concluídos, zero falhas e zero timeouts;
- alternância entre os vídeos sem `PLAYBACK_ERROR`.

Isso torna **cache quente/local** compatível com o estado esperado, mas não comprova o estado exato às 10:16. Não há evidência de FileTransfer ativo, download recém-concluído ou troca de fonte no momento do travamento.

## Estado lógico do Player

Não foi possível confirmar no instante da falha:

- mudança de `currentItem` ou `currentIndex`;
- continuidade de timer;
- ocorrência de `onEnded`;
- mudança de source;
- remontagem do elemento;
- evento de erro do elemento de vídeo.

O código só avança a playlist após `onEnded`. Se o WebView/decoder deixou de emitir esse evento, o Player permaneceria no mesmo item, compatível com o sintoma observado, mas isso é apenas uma hipótese.

## Efeito da atualização manual

O comando de atualização executa `window.location.reload()`. Essa ação reinicializa conjuntamente:

- documento e WebView da página;
- árvore React e seus estados (`mediaIndex`, estado pending e transição);
- elemento `<video>`;
- resolução e atribuição da source;
- inscrições da playlist;
- mapa de cache em memória, posteriormente reconstruído a partir da persistência.

Como várias camadas foram reiniciadas ao mesmo tempo, a recuperação não identifica isoladamente se a falha estava no elemento de vídeo, decoder, evento `ended`, estado React ou source.

## Relatório curto

| Campo | Resultado |
|---|---|
| Mídia | Primeiro vídeo; nome exato não confirmado |
| Origem | Provavelmente LOCAL, sem confirmação da sessão atual |
| Cache | Provavelmente quente, sem confirmação às 10:16 |
| Download ativo | Não comprovado |
| Eventos antes do travamento | Indisponíveis para a sessão atual |
| Eventos depois | Atualização manual e retomada normal |
| Erro registrado | Nenhum registro atual disponível |
| Player avançou | Não; permaneceu travado no primeiro vídeo até a atualização |
| Recuperação | `window.location.reload()` acionado pelo controle remoto |

## Classificação

**Causa: INCONCLUSIVA**  
**Classificação: D — EVENTO ISOLADO SEM CAUSA COMPROVADA**

Não existe evidência suficiente para classificar como bug do Player, falha da mídia ou problema de decoder/hardware. A falta de eventos de buffering/stall na instrumentação impede distinguir essas hipóteses retrospectivamente.

## Recomendação

**MANTER OBSERVAÇÃO**, com o rollout ampliado pausado. Preservar RC4 sem alterações. Se o travamento se repetir, registrar horário, mídia e posição e exportar o diagnóstico RC imediatamente após a ocorrência, antes de atualizar novamente, caso a tela de diagnóstico permaneça acessível.

Nenhuma correção, build, publicação, limpeza ou rollback foi executado nesta etapa.
