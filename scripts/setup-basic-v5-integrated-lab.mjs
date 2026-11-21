import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LAB_FIXTURE = Object.freeze({
  projectId:'demo-totem-basic-hom',
  clientId:'basic-v5-lab-client',
  screenId:'basic-v5-lab-screen',
  pairingCode:'BASICV5LAB',
  portal:Object.freeze({
    email:'basic-v5-lab@local.test',
    password:'BasicV5-LAB-2026!',
    claims:Object.freeze({ clientId:'basic-v5-lab-client', role:'clientOwner' }),
  }),
});

export function assertLabSetupTarget({ projectId, authHost, firestoreHost }) {
  const local = host => /^(127\.0\.0\.1|localhost):\d+$/.test(String(host || ''));
  if (projectId !== LAB_FIXTURE.projectId || !local(authHost) || !local(firestoreHost)) {
    throw new Error('BASIC V5 LAB setup refused: exact local Emulator target required');
  }
}

export async function setupBasicV5IntegratedLab({
  projectId=LAB_FIXTURE.projectId,
  authHost='127.0.0.1:9198',
  firestoreHost='127.0.0.1:8189',
} = {}) {
  assertLabSetupTarget({ projectId, authHost, firestoreHost });
  process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
  process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
  const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
  const { initializeApp, deleteApp } = requireFunctions('firebase-admin/app');
  const { getAuth } = requireFunctions('firebase-admin/auth');
  const { getFirestore } = requireFunctions('firebase-admin/firestore');
  const app = initializeApp({ projectId }, `basic-v5-integrated-setup-${Date.now()}`);
  try {
    const adminAuth = getAuth(app);
    let user;
    try { user = await adminAuth.getUserByEmail(LAB_FIXTURE.portal.email); }
    catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      user = await adminAuth.createUser({ email:LAB_FIXTURE.portal.email, password:LAB_FIXTURE.portal.password, emailVerified:true });
    }
    await adminAuth.updateUser(user.uid, { password:LAB_FIXTURE.portal.password, emailVerified:true });
    await adminAuth.setCustomUserClaims(user.uid, LAB_FIXTURE.portal.claims);
    const db = getFirestore(app);
    const now = new Date();
    await db.doc(`clients/${LAB_FIXTURE.clientId}`).set({
      name:'Cliente sintético BASIC V5 LAB', email:LAB_FIXTURE.portal.email, uid:user.uid,
      accountStatus:'active', lifecycleStatus:'active', updatedAt:now,
    }, { merge:true });
    await db.doc(`clients/${LAB_FIXTURE.clientId}/screens/${LAB_FIXTURE.screenId}`).set({
      name:'Tela sintética BASIC V5 LAB', code:LAB_FIXTURE.pairingCode,
      status:'offline', clientId:LAB_FIXTURE.clientId, updatedAt:now,
    }, { merge:true });
    await db.doc(`tv_codes/${LAB_FIXTURE.pairingCode}`).set({
      clientId:LAB_FIXTURE.clientId, screenId:LAB_FIXTURE.screenId, active:true, updatedAt:now,
    }, { merge:true });
    return { uid:user.uid, ...LAB_FIXTURE };
  } finally { await deleteApp(app); }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const result = await setupBasicV5IntegratedLab();
  console.log(JSON.stringify({
    projectId:result.projectId, clientId:result.clientId, screenId:result.screenId,
    pairingCode:result.pairingCode, portalEmail:result.portal.email, portalPassword:result.portal.password,
  }, null, 2));
}
