import assert from 'node:assert/strict';

// Run only against the local emulator; never write test data to production.
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator required');
const project = 'demo-template-permissions';
const base = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents`;
function token(uid, email) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: uid, user_id: uid, email, aud: project, iss: `https://securetoken.google.com/${project}`, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, firebase: { sign_in_provider: 'password' } })}.`;
}
async function write(path, data, auth) {
  return fetch(`${base}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { stringValue: value }])) }),
  });
}
const owner = token('eco-owner', 'eco@example.test');
for (const [id, status] of [['legacy-eco', undefined], ['new-client', 'active'], ['pending', 'pending_commercial_validation']]) {
  const seed = await write(`clients/${id}`, { uid: 'eco-owner', email: 'eco@example.test', ...(status ? { accountStatus: status } : {}) }, 'owner');
  assert.equal(seed.status, 200, await seed.text());
  for (const [label, auth, expected] of [['owner', owner, status === 'pending_commercial_validation' ? 403 : 200], ['other-client', token('other', 'other@example.test'), 403], ['anonymous', null, 403]]) {
    const response = await write(`clients/${id}/templates/${label}`, { name: 'Regression test' }, auth);
    assert.equal(response.status, expected, `${id}/${label}: ${await response.text()}`);
    console.log(`PASS ${id}: ${label} (${expected})`);
  }
}
