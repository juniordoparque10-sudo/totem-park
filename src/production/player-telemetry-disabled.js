export const TELEMETRY_DEFAULT_CONFIG = Object.freeze({ enabled: false, clientIds: [], screenIds: [], deviceIds: [] });
export const readPlayerTelemetryReport = () => null;
export const createPlayerTelemetry = () => ({
  configure: () => false,
  isEnabled: () => false,
  updateIdentity: () => {},
  updateOperational: () => {},
  record: () => {},
  increment: () => {},
  setConnection: () => {},
  setOperatingMode: () => {},
  startTransition: () => '',
  completeTransition: () => {},
  heartbeat: () => null,
  acknowledge: () => {},
  getReport: () => ({ enabled: false, outbox: [] }),
});
