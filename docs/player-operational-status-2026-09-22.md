# Estado operacional do Player — 22/09/2026

- **RC5 rebaseline: BLOQUEADO.** Não promover, publicar, gerar RC6 ou corrigir o Player agora.
- **Rollback v11 baseado no RC4: APROVADO FISICAMENTE E ESTÁVEL.** É a base operacional segura da TV Teste neste momento.
- Após rollback: vínculo preservado; playlist alternando; sem tela preta, travamento, novo código ou comportamento anormal perceptível.
- No RC5, houve engasgos e percepção de vídeo pulado. O teste físico não passou. Como os dois conteúdos eram visualmente iguais, a hipótese de que ficou preso em um único vídeo é **inconclusiva**.
- Em futura homologação de transições, usar vídeos A e B visualmente diferentes para identificar com segurança item ativo, salto e transição.
- Investigação Android encerrada por enquanto. Preservar rollback v11, RC4, Local First, cache, timeout/retry, LINK-FIX, playlist e decoder/lifecycle. Próximas tarefas: Portal Web.
