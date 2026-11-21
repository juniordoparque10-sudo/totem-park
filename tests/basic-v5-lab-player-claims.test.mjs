import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPlayerLabClaims, isBasicV5LabProject, stripPlayerLabClaims } from '../functions/basic-v5-lab-claims.js';

test('claims are allowed only for the exact BASIC V5 Emulator project', () => {
  assert.equal(isBasicV5LabProject('demo-totem-basic-hom'), true);
  for (const id of ['', 'totem-basic-hom', 'demo-totem-basic-hom-prod', 'demo-totem-basic']) {
    assert.equal(isBasicV5LabProject(id), false);
  }
});

test('player claims preserve unrelated claims and bind exact identity', () => {
  assert.deepEqual(buildPlayerLabClaims({ admin:true }, { clientId:'client-lab', screenId:'screen-lab' }), {
    admin:true, clientId:'client-lab', screenId:'screen-lab', role:'player',
  });
});

test('release removes only player binding claims', () => {
  assert.deepEqual(stripPlayerLabClaims({ admin:true, clientId:'c', screenId:'s', role:'player' }), { admin:true });
  assert.deepEqual(stripPlayerLabClaims({ role:'master', clientId:'c' }), { role:'master', clientId:'c' });
});

test('invalid claim identity is rejected', () => {
  assert.throws(() => buildPlayerLabClaims({}, { clientId:'', screenId:'s' }), /identity/i);
  assert.throws(() => buildPlayerLabClaims({}, { clientId:'c', screenId:'bad/path' }), /identity/i);
});

test('rebind and revoke cannot leave stale Player claims behind', () => {
  const source = fs.readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
  assert.match(source, /let replacedUid = isUidConflict \? previousConnectedUid : "";/);
  assert.match(source, /await clearPlayerLabClaims\(requestedUid\);\s*return result;/);
});
