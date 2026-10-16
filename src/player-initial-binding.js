const INITIAL_SECURE_BINDING_MODES = new Set(["playerRc", "playerTelemetry"]);
const TEMPORARY_CLAIM_ERROR_MARKERS = [
  "unavailable",
  "network",
  "deadline-exceeded",
  "resource-exhausted",
  "internal",
];

export function shouldClaimInitialPlayerBinding(appBuildMode) {
  return INITIAL_SECURE_BINDING_MODES.has(appBuildMode);
}

export async function attemptInitialSecureBinding({ appBuildMode, claimBinding }) {
  if (!shouldClaimInitialPlayerBinding(appBuildMode)) return null;
  try {
    return await claimBinding();
  } catch (error) {
    const code = String(error?.code || "").toLowerCase();
    const temporary = TEMPORARY_CLAIM_ERROR_MARKERS.some((marker) => code.includes(marker));
    if (appBuildMode === "playerRc" && temporary) return null;
    throw error;
  }
}
