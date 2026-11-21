export async function refreshIntegratedLabIdToken({ enabled = false, user } = {}) {
  if (!enabled) return false;
  if (!user || typeof user.getIdToken !== 'function') throw new Error('Authenticated Player required for BASIC V5 LAB claims');
  await user.getIdToken(true);
  return true;
}
