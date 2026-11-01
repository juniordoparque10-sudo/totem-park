export function createPlayerScreenSnapshotStore() {
  let activeScope = "";
  let snapshot = null;

  return {
    activate(scope) {
      const nextScope = String(scope || "");
      if (nextScope === activeScope) return;
      activeScope = nextScope;
      snapshot = null;
    },
    observe(scope, data, { authoritative = false } = {}) {
      if (!activeScope || String(scope || "") !== activeScope) return false;
      snapshot = {
        authoritative: authoritative === true,
        data: data && typeof data === "object" ? data : {},
      };
      return true;
    },
    read(scope) {
      if (!snapshot || String(scope || "") !== activeScope) return null;
      return snapshot;
    },
    readAuthoritative(scope) {
      const current = this.read(scope);
      return current?.authoritative ? current.data : null;
    },
    clear(scope) {
      if (scope && String(scope) !== activeScope) return;
      activeScope = "";
      snapshot = null;
    },
  };
}

export function getPlayerScreenScopeKey(clientId, screenId) {
  return `${String(clientId || "")}/${String(screenId || "")}`;
}
