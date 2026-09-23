import assert from 'node:assert/strict';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Local emulator required');
assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 'Local storage emulator required');
const project = 'demo-template-permissions';
const base = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents`;
const storageBase = `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${project}.appspot.com/o`;
let passed = 0;
const failures = [];
function token(uid, email) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: uid, user_id: uid, email, aud: project, iss: `https://securetoken.google.com/${project}`, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, firebase: { sign_in_provider: 'password' } })}.`;
}
function value(v) {
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  if (v && typeof v === 'object') return { mapValue: { fields: fields(v) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: String(v) };
}
const fields = data => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));
async function request(path, method, data, auth) {
  return fetch(`${base}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(data ? { body: JSON.stringify({ fields: fields(data) }) } : {}) });
}
async function check(label, response, allowed) {
  const body = await response.text();
  if (allowed ? response.ok : [401, 403].includes(response.status)) passed++;
  else failures.push(`${label}: expected ${allowed ? 'allowed' : 'denied'}, got ${response.status}: ${body.slice(0, 180)}`);
}
const owner = token('owner-uid', 'owner@example.test');
const other = token('other-uid', 'other@example.test');
const master = token('master-uid', 'configured-master@example.test');
await check('seed master', await request('settings/masterAccess', 'PATCH', { emails: ['configured-master@example.test'] }, 'owner'), true);
for (const [clientId, status] of [['legacy', undefined], ['active', 'active'], ['pending', 'pending_commercial_validation']]) {
  await check('seed client', await request(`clients/${clientId}`, 'PATCH', { uid: 'owner-uid', email: 'owner@example.test', ...(status ? { accountStatus: status } : {}) }, 'owner'), true);
  for (const collection of ['screens', 'media', 'playlists', 'templates', 'marketing']) {
    for (const [role, auth] of [['owner', owner], ['master', master], ['other', other], ['anonymous', null]]) {
      const allowed = role === 'master' || (role === 'owner' && clientId !== 'pending');
      const path = `clients/${clientId}/${collection}/${role}`;
      const data = { name: 'Original', clientId, uploadedByUid: role === 'other' ? 'other-uid' : 'owner-uid', storagePath: `clients/${clientId}/media/test.png`, items: ['item-a', 'item-b'] };
      await check(`${clientId}/${collection}/${role}/create`, await request(path, 'PATCH', data, auth), allowed);
      await check('seed update', await request(path, 'PATCH', data, 'owner'), true);
      await check(`${clientId}/${collection}/${role}/edit`, await request(path, 'PATCH', { ...data, name: 'Edited' }, auth), allowed);
      await check(`${clientId}/${collection}/${role}/delete`, await request(path, 'DELETE', null, auth), allowed);
    }
  }
  for (const folder of ['media/test.png', 'templates/draft/background/test.png', 'marketing/images/test.png', 'profile/logo']) {
    for (const [role, auth] of [['owner', owner], ['master', master], ['other', other], ['anonymous', null]]) {
      const allowed = role === 'master' || (role === 'owner' && clientId !== 'pending');
      const name = `clients/${clientId}/${role}/${folder}`;
      // Keep the real folder immediately after clientId for the media-specific rule.
      const storagePath = name.replace(`/${role}/`, '/').replace('test.png', `${role}.png`).replace(/\/logo$/, `/logo-${role}`);
      const headers = auth ? { Authorization: `Bearer ${auth}` } : {};
      const upload = () => fetch(`${storageBase}?uploadType=media&name=${encodeURIComponent(storagePath)}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'image/png' }, body: new Uint8Array([137, 80, 78, 71]) });
      await check(`${clientId}/${folder}/${role}/upload`, await upload(), allowed);
      if (allowed) {
        await check(`${clientId}/${folder}/${role}/replace`, await upload(), true);
        await check(`${clientId}/${folder}/${role}/delete`, await fetch(`${storageBase}/${encodeURIComponent(storagePath)}`, { method: 'DELETE', headers }), true);
      }
    }
  }
}
for (const [label, path, data] of [
  ['legacy media delete', 'clients/legacy/media/old-media', { title: 'Old file' }],
  ['playlist cleanup', 'clients/legacy/playlists/cleanup', { items: ['keep', 'remove'] }],
]) {
  await request(path, 'PATCH', data, 'owner');
  await check(`cross-account ${label}`, await request(path, label.includes('delete') ? 'DELETE' : 'PATCH', label.includes('delete') ? null : { items: [] }, other), false);
}
console.log(`${passed} checks passed; ${failures.length} failures`);
for (const failure of failures) console.error(failure);
assert.equal(failures.length, 0, 'Client CRUD permissions must pass');
