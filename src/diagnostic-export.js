export const DECODER_EXPERIMENT_PACKAGE = "br.com.parksolutions.totempark.player.decoderexperiment";
export const DECODER_EXPERIMENT_VERSION = "1.0-player-decoder-experiment";

export function makeDecoderDiagnosticExport(report, jumpEvents, date = new Date(), nonce = "0000") {
  const sessionId = String(report?.session?.id || "");
  if (!sessionId) throw new Error("Sessão de diagnóstico ausente");
  const timestamp = date.toISOString().replace(/[-:]/g, "").replace("T", "-").replace(".", "").replace("Z", "");
  const shortSession = sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  const safeNonce = String(nonce).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "0000";
  const fileName = `totempark-decoder-experiment-${timestamp}-${shortSession}-${safeNonce}.json`;
  const payload = {
    appVersion: DECODER_EXPERIMENT_VERSION,
    packageName: DECODER_EXPERIMENT_PACKAGE,
    buildType: "DECODER_EXPERIMENT_B",
    sessionId,
    exportedAt: date.toISOString(),
    diagnostic: report,
    jumpEvents,
    operationalTelemetry: null,
  };
  return { fileName, data: JSON.stringify(payload, null, 2), payload };
}
