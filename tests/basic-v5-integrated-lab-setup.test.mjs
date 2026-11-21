import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLabSetupTarget, LAB_FIXTURE } from '../scripts/setup-basic-v5-integrated-lab.mjs';

test('setup refuses every target except the exact local Emulator tuple', () => {
  assert.doesNotThrow(() => assertLabSetupTarget({ projectId:'demo-totem-basic-hom', authHost:'127.0.0.1:9198', firestoreHost:'127.0.0.1:8189' }));
  assert.throws(() => assertLabSetupTarget({ projectId:'real-project', authHost:'127.0.0.1:9198', firestoreHost:'127.0.0.1:8189' }), /refused/i);
  assert.throws(() => assertLabSetupTarget({ projectId:'demo-totem-basic-hom', authHost:'auth.example.com', firestoreHost:'127.0.0.1:8189' }), /refused/i);
});

test('fixture contains deterministic synthetic identities and no production secret', () => {
  assert.equal(LAB_FIXTURE.portal.email, 'basic-v5-lab@local.test');
  assert.equal(LAB_FIXTURE.portal.claims.role, 'clientOwner');
  assert.equal(LAB_FIXTURE.portal.claims.clientId, LAB_FIXTURE.clientId);
  assert.match(LAB_FIXTURE.pairingCode, /^[A-Z0-9]{6,16}$/);
  assert.doesNotMatch(JSON.stringify(LAB_FIXTURE), /parksolutions\.com|firebaseapp\.com/i);
});
