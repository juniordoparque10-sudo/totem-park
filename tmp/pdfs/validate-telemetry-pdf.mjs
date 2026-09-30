import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { renderTelemetryPdfReport } from "../../src/telemetry-pdf-report.js";
import { formatRelativeCommunication, getPortalScreenStatus, getTelemetryVisualState, timestampMs } from "../../src/portal-status.js";

const require = createRequire(import.meta.url);
const firebaseTools = "C:/Users/centr/AppData/Roaming/npm/node_modules/firebase-tools/lib";
const auth = require(`${firebaseTools}/auth.js`);
const scopes = require(`${firebaseTools}/scopes.js`);
const account = auth.getProjectDefaultAccount(process.cwd()) || auth.getGlobalDefaultAccount();
const credentials = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
const headers = { Authorization: `Bearer ${credentials.access_token}` };
const base = "https://firestore.googleapis.com/v1/projects/totem-park/databases/(default)/documents";
const read = async (path) => {
  const response = await fetch(`${base}/${path}`, { headers });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return response.json();
};
const unpack = (field) => {
  if (!field) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("timestampValue" in field) return field.timestampValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("arrayValue" in field) return (field.arrayValue.values || []).map(unpack);
  if ("mapValue" in field) return Object.fromEntries(Object.entries(field.mapValue.fields || {}).map(([key, value]) => [key, unpack(value)]));
  return null;
};
const data = (document) => Object.fromEntries(Object.entries(document.fields || {}).map(([key, field]) => [key, unpack(field)]));
const clientId = "ztO8kkaCprpmydMashQh";
const client = data(await read(`clients/${clientId}`));
const flag = data(await read("settings/telemetry2a2c"));
const now = Date.now();
const rows = [];
for (const id of ["dfSqFVamxAWpoqHfvxTg", "LsYtitpeyB8sDukaSv8s"]) {
  const screen = { id, clientId, clientName: client.name, ...data(await read(`clients/${clientId}/screens/${id}`)) };
  const lastCommunication = [screen.lastSeenAt, screen.lastCommandExecutedAt, screen.lastMediaUpdateAt].reduce((latest, value) => timestampMs(value) > timestampMs(latest) ? value : latest, null);
  const telemetryState = getTelemetryVisualState({ config: flag, screen, now });
  const rawSource = screen.currentMediaSource;
  const origin = ["CACHE_LOCAL", "cache", "local"].includes(rawSource) ? "Local" : ["INTERNET_FALLBACK", "remote", "internet"].includes(rawSource) ? "Internet" : "Não medido";
  const cache = ["pronto", "preparando", "parcial", "erro"].includes(screen.cacheStatus) ? `Cache ${screen.cacheStatus} ${screen.cachedItems ?? "—"}/${screen.totalCacheableItems ?? "—"}` : "Cache não informado";
  rows.push({ name: screen.name || screen.code || id, clientName: client.name, status: getPortalScreenStatus(screen, now), lastCommunication: formatRelativeCommunication(lastCommunication, now), telemetry: ({ ACTIVE: "Ativa", STALE: "Dados desatualizados", DISABLED: "Telemetria Off", WAITING_FIRST_SIGNAL: "Aguardando primeiro sinal" })[telemetryState] || telemetryState, cache, version: screen.telemetry?.session?.appVersion || screen.appVersion || screen.playerAppVersion || "—", origin, activeTimeMs: screen.telemetry?.schemaVersion >= 3 ? screen.telemetry?.counters?.activeTimeMs : null });
}
for (const size of [2, 5, 12]) {
  const outputRows = Array.from({ length: size }, (_, index) => ({ ...rows[index % 2], name: size === 2 ? rows[index].name : `${rows[index % 2].name} — ${index + 1}` }));
  const html = renderTelemetryPdfReport({ rows: outputRows, clientName: client.name, clientLogoUrl: client.logoUrl, totemLogoUrl: "http://127.0.0.1:5175/logo.png", totemIconUrl: "http://127.0.0.1:5175/icon.png", generatedAt: now });
  writeFileSync(new URL(`./eco-${size}.html`, import.meta.url), html);
}
console.log(JSON.stringify({ client: client.name, clientLogoPresent: Boolean(client.logoUrl), rows }, null, 2));
