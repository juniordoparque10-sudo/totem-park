export function usePersistentFirestoreCache({ native = false, mode = 'web', pathname = '/' } = {}) {
  return native || mode === 'player' || mode === 'playerTest' || /^\/(tv|player|orientacao)(\/|$)/.test(pathname);
}
