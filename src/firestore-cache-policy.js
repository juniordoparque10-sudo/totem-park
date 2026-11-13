export function shouldUsePersistentFirestoreCache({ native = false, mode = 'web', pathname = '/' } = {}) {
  return native || mode === 'player' || mode === 'playerTest' || /^\/(tv|player|orientacao)(\/|$)/.test(pathname);
}

export function getFirestoreTabMode({ native = false, mode = 'web' } = {}) {
  return native && /^player/i.test(String(mode || '')) ? 'single' : 'multiple';
}
