# Active playlist snapshot recovery plan

1. Add failing unit tests for the pure snapshot resolver and scope isolation.
2. Implement the minimal Firebase/React-independent resolver.
3. Add failing integration-contract tests for the active listener.
4. Integrate the resolver, metadata callbacks, diagnostics, and unavailable state.
5. Run focused tests, relevant Player regressions, build, and diff validation.
6. Commit only the specification, resolver, listener integration, and tests.
