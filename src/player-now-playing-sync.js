function fingerprint(payload) {
  const ordered = Object.keys(payload || {})
    .sort()
    .reduce((result, key) => {
      result[key] = payload[key];
      return result;
    }, {});
  return JSON.stringify(ordered);
}
export function createNowPlayingSyncGuard() {
  let confirmedKey = "";
  let pendingKey = "";

  const keyFor = (scope, payload) => `${String(scope || "")}:${fingerprint(payload)}`;

  return {
    shouldSync(scope, payload) {
      const key = keyFor(scope, payload);
      return Boolean(scope) && key !== confirmedKey && key !== pendingKey;
    },
    markAttempt(scope, payload) {
      pendingKey = keyFor(scope, payload);
    },
    markSuccess(scope, payload) {
      const key = keyFor(scope, payload);
      confirmedKey = key;
      if (pendingKey === key) pendingKey = "";
    },
    markFailure(scope, payload) {
      const key = keyFor(scope, payload);
      if (pendingKey === key) pendingKey = "";
    },
  };
}
