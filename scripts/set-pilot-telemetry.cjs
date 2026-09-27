const firebaseTools = "C:/Users/centr/AppData/Roaming/npm/node_modules/firebase-tools/lib";
const auth = require(`${firebaseTools}/auth.js`);
const scopes = require(`${firebaseTools}/scopes.js`);
const project = "totem-park";
const screenId = "emp3VDKfLzmz1sWJrnbx";
const mode = process.argv[2];
if (mode !== "on" && mode !== "off") throw new Error("Usage: node scripts/set-pilot-telemetry.cjs on|off");

function values(field) { return (field?.arrayValue?.values || []).map((item) => item.stringValue); }
async function main() {
  const account = auth.getProjectDefaultAccount(process.cwd()) || auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("Firebase CLI login unavailable");
  const credentials = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  const token = credentials.access_token;
  const root = `projects/${project}/databases/(default)/documents`;
  const url = `https://firestore.googleapis.com/v1/${root}/settings/telemetry2a2c`;
  async function request(target, options = {}) {
    const response = await fetch(target, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (!response.ok) throw new Error(`${response.status}: ${(await response.text()).slice(0, 300)}`);
    return response.json();
  }
  const current = await request(url);
  const enabled = current.fields?.enabled?.booleanValue === true;
  const currentScreenIds = values(current.fields?.screenIds);
  const clientIds = values(current.fields?.clientIds);
  const deviceIds = values(current.fields?.deviceIds);
  if (clientIds.length || deviceIds.length || currentScreenIds.some((id) => id !== screenId)) {
    throw new Error("Unexpected allowlist contents; no change made");
  }
  if (mode === "on" && (enabled || currentScreenIds.length)) throw new Error("Expected OFF/empty initial state; no change made");
  if (mode === "off" && (!enabled || currentScreenIds.length !== 1 || currentScreenIds[0] !== screenId)) {
    throw new Error("Expected single-screen ON state; no change made");
  }
  const wanted = mode === "on";
  const name = `${root}/settings/telemetry2a2c`;
  await request(`https://firestore.googleapis.com/v1/${root}:commit`, {
    method: "POST",
    body: JSON.stringify({ writes: [{
      update: { name, fields: {
        enabled: { booleanValue: wanted },
        screenIds: { arrayValue: { values: wanted ? [{ stringValue: screenId }] : [] } },
        clientIds: { arrayValue: { values: [] } },
        deviceIds: { arrayValue: { values: [] } },
      } },
      updateMask: { fieldPaths: ["enabled", "screenIds", "clientIds", "deviceIds"] },
      currentDocument: { updateTime: current.updateTime },
    }] }),
  });
  const saved = await request(url);
  const result = {
    enabled: saved.fields?.enabled?.booleanValue === true,
    screenIds: values(saved.fields?.screenIds),
    clientIds: values(saved.fields?.clientIds),
    deviceIds: values(saved.fields?.deviceIds),
    updateTime: saved.updateTime,
  };
  if (result.enabled !== wanted || result.screenIds.join() !== (wanted ? screenId : "") || result.clientIds.length || result.deviceIds.length) {
    throw new Error(`Saved state differs: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
