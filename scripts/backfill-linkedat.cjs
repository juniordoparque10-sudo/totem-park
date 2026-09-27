const firebaseTools = "C:/Users/centr/AppData/Roaming/npm/node_modules/firebase-tools/lib";
const auth = require(`${firebaseTools}/auth.js`);
const scopes = require(`${firebaseTools}/scopes.js`);
const project = "totem-park";
const root = `projects/${project}/databases/(default)/documents`;
const endpoint = `https://firestore.googleapis.com/v1/${root}`;
const apply = process.argv.includes("--apply");

function field(doc, name) {
  const value = doc?.fields?.[name];
  return value?.stringValue ?? value?.timestampValue ?? value?.booleanValue ?? null;
}

function close(a, b) {
  const left = Date.parse(a || "");
  const right = Date.parse(b || "");
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1000;
}

async function main() {
  const account = auth.getProjectDefaultAccount(process.cwd()) || auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("Firebase CLI login unavailable");
  const credentials = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  const token = credentials.access_token;
  if (!token) throw new Error("Firebase CLI access token unavailable");
  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers } });
    if (!response.ok) throw new Error(`${response.status} ${url.split("?")[0]}: ${(await response.text()).slice(0, 240)}`);
    return response.json();
  }
  let pageToken;
  const bindings = [];
  do {
    const url = `${endpoint}/playerDeviceBindings?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const page = await request(url);
    bindings.push(...(page.documents || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  const results = [];
  for (const binding of bindings.filter((item) => field(item, "status") === "ACTIVE" && !field(item, "linkedAt"))) {
    const uid = binding.name.split("/").at(-1);
    const clientId = field(binding, "clientId");
    const screenId = field(binding, "screenId");
    const screen = await request(`${endpoint}/clients/${encodeURIComponent(clientId)}/screens/${encodeURIComponent(screenId)}`);
    const pairedAt = field(binding, "pairedAt");
    const safe = field(binding, "uid") === uid
      && field(screen, "connectedAuthUid") === uid
      && field(screen, "connectedDeviceId") === field(binding, "deviceId")
      && !field(screen, "linkedAt")
      && close(pairedAt, field(binding, "createdAt"))
      && close(pairedAt, field(binding, "updatedAt"))
      && close(pairedAt, binding.createTime)
      && binding.createTime === binding.updateTime;
    results.push({ uid, clientId, screenId, candidate: safe, linkedAt: safe ? pairedAt : null });
    if (!safe || !apply) continue;
    const linkedAt = { timestampValue: pairedAt };
    await request(`${endpoint}:commit`, {
      method: "POST",
      body: JSON.stringify({ writes: [
        { update: { name: binding.name, fields: { linkedAt } }, updateMask: { fieldPaths: ["linkedAt"] }, currentDocument: { updateTime: binding.updateTime } },
        { update: { name: screen.name, fields: { linkedAt } }, updateMask: { fieldPaths: ["linkedAt"] }, currentDocument: { updateTime: screen.updateTime } },
      ] }),
    });
  }
  console.log(JSON.stringify({ mode: apply ? "APPLIED" : "DRY_RUN", activeWithoutLinkedAt: results.length, eligible: results.filter((item) => item.candidate).length, results }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
