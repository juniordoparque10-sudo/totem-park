function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
}
export function fingerprintPlayerCapabilities(capabilities) {
  if (!capabilities || typeof capabilities !== "object") return "";
  return JSON.stringify(stableValue(capabilities));
}

export function createPlayerCapabilitySyncState({ retryIntervalMs = 5 * 60 * 1000 } = {}) {
  let desiredFingerprint = "";
  let confirmedFingerprint = "";
  let remoteFingerprint = "";
  let retryAt = 0;
  let inFlightFingerprint = "";

  const reconcile = () => {
    if (!desiredFingerprint) return;
    if (remoteFingerprint === desiredFingerprint) {
      confirmedFingerprint = desiredFingerprint;
      retryAt = 0;
      return;
    }
    if (confirmedFingerprint === desiredFingerprint && remoteFingerprint) {
      confirmedFingerprint = "";
      retryAt = 0;
    }
  };

  return {
    setDesired(capabilities) {
      const nextFingerprint = fingerprintPlayerCapabilities(capabilities);
      if (nextFingerprint !== desiredFingerprint) {
        desiredFingerprint = nextFingerprint;
        confirmedFingerprint = "";
        retryAt = 0;
        inFlightFingerprint = "";
      }
      reconcile();
      return desiredFingerprint;
    },
    observeRemote(capabilities) {
      remoteFingerprint = fingerprintPlayerCapabilities(capabilities);
      reconcile();
    },
    shouldSync(capabilities, now = Date.now()) {
      const fingerprint = this.setDesired(capabilities);
      return Boolean(fingerprint)
        && confirmedFingerprint !== fingerprint
        && inFlightFingerprint !== fingerprint
        && Number(now) >= retryAt;
    },
    markAttempt(capabilities) {
      inFlightFingerprint = this.setDesired(capabilities);
    },
    markSuccess(capabilities) {
      const fingerprint = this.setDesired(capabilities);
      confirmedFingerprint = fingerprint;
      remoteFingerprint = fingerprint;
      inFlightFingerprint = "";
      retryAt = 0;
    },
    markFailure(capabilities, now = Date.now()) {
      const fingerprint = this.setDesired(capabilities);
      if (confirmedFingerprint === fingerprint) confirmedFingerprint = "";
      inFlightFingerprint = "";
      retryAt = Number(now) + Math.max(0, Number(retryIntervalMs) || 0);
    },
    onReconnect() {
      if (desiredFingerprint && confirmedFingerprint !== desiredFingerprint) retryAt = 0;
    },
  };
}
