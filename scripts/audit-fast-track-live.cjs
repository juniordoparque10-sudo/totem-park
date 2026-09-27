const firebaseTools = "C:/Users/centr/AppData/Roaming/npm/node_modules/firebase-tools/lib";
const auth = require(`${firebaseTools}/auth.js`);
const scopes = require(`${firebaseTools}/scopes.js`);

const project = "totem-park";
const pilotScreenId = "emp3VDKfLzmz1sWJrnbx";
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;

function unpack(field) {
  if (!field) return undefined;
  if ("stringValue" in field) return field.stringValue;
  if ("booleanValue" in field) return field.booleanValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("timestampValue" in field) return field.timestampValue;
  if ("nullValue" in field) return null;
  if ("arrayValue" in field) return (field.arrayValue.values || []).map(unpack);
  if ("mapValue" in field) return Object.fromEntries(Object.entries(field.mapValue.fields || {}).map(([key, value]) => [key, unpack(value)]));
  return undefined;
}

function document(json) {
  if (!json?.fields) return null;
  return { id: json.name?.split("/").at(-1), ...Object.fromEntries(Object.entries(json.fields).map(([key, value]) => [key, unpack(value)])) };
}

async function main() {
  const account = auth.getProjectDefaultAccount(process.cwd()) || auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("Firebase CLI has no signed-in account");
  const credential = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  const token = credential.access_token;
  if (!token) throw new Error("Firebase CLI access token unavailable");
  async function get(url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`${response.status} ${url.split("?")[0]}: ${(await response.text()).slice(0, 240)}`);
    return response.json();
  }
  const flag = document(await get(`${base}/settings/telemetry2a2c`));
  const query = await fetch(`${base}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "screens", allDescendants: true }] } }),
  });
  if (!query.ok) throw new Error(`screens query: ${query.status} ${(await query.text()).slice(0, 240)}`);
  const screens = (await query.json()).map((row) => ({ path: row.document?.name, data: document(row.document) })).filter((row) => row.data);
  const pilot = screens.find((row) => row.data.id === pilotScreenId);
  const clientId = pilot?.path?.split("/").at(-3);
  const uid = pilot?.data.connectedAuthUid;
  const rawBinding = uid ? await get(`${base}/playerDeviceBindings/${encodeURIComponent(uid)}`) : null;
  const binding = document(rawBinding);
  const pilotSessionsPage = clientId ? await get(`${base}/clients/${encodeURIComponent(clientId)}/screens/${pilotScreenId}/telemetrySessions?pageSize=100`) : null;
  const pilotSessions = (pilotSessionsPage?.documents || []).map(document).filter(Boolean);
  const ruleRelease = await get(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
  const source = ruleRelease?.rulesetName ? await get(`https://firebaserules.googleapis.com/v1/${ruleRelease.rulesetName}`) : null;
  const localRules = require("node:fs").readFileSync("firestore.rules", "utf8").replace(/\r\n/g, "\n").trim();
  const deployedRules = source?.source?.files?.map((file) => file.content).join("\n").replace(/\r\n/g, "\n").trim();
  console.log(JSON.stringify({
    flag: flag && { enabled: flag.enabled, screenIds: flag.screenIds || [], clientIds: flag.clientIds || [], deviceIds: flag.deviceIds || [] },
    screenCount: screens.length,
    pilot: pilot && { clientId, screenId: pilotScreenId, connectedAuthUid: uid || null, connectedDeviceId: pilot.data.connectedDeviceId || null, linkedAt: pilot.data.linkedAt || null, telemetryUpdatedAt: pilot.data.telemetryUpdatedAt || null },
    pilotTelemetry: pilot?.data.telemetry || null,
    pilotHistory: { count: pilotSessions.length, latest: pilotSessions.sort((a, b) => Date.parse(b.updatedAt || b.timestamp || 0) - Date.parse(a.updatedAt || a.timestamp || 0))[0] || null },
    otherScreenTelemetryAfterActivation: screens.filter((row) => row.data.id !== pilotScreenId && Date.parse(row.data.telemetryUpdatedAt || 0) >= Date.parse("2026-09-27T01:15:22.237195Z")).map((row) => row.data.id),
    binding: binding && { uid: binding.uid, status: binding.status, clientId: binding.clientId, screenId: binding.screenId, deviceId: binding.deviceId, linkedAt: binding.linkedAt || null, pairedAt: binding.pairedAt || null, createdAt: binding.createdAt || null, updatedAt: binding.updatedAt || null, firestoreCreateTime: rawBinding.createTime, firestoreUpdateTime: rawBinding.updateTime },
    rules: { release: ruleRelease?.name || null, deployedRuleset: ruleRelease?.rulesetName || null, matchesLocal: deployedRules ? deployedRules === localRules : null },
  }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
