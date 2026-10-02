const JOURNAL_SUFFIX = "-journal-v1";
const JOURNAL_STATES = new Set(["pending","downloading","downloaded","validated","committed"]);

export function getNativeCacheJournalStorageKey(storageKey) {
  return `${storageKey}${JOURNAL_SUFFIX}`;
}

export function getNativeCacheJournalEntryKey(cacheIdentity, contentVersion = "") {
  return `${cacheIdentity}|${contentVersion || "stable"}`;
}

export function readNativeCacheJournal(storageKey, storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(getNativeCacheJournalStorageKey(storageKey)) || "{}");
  } catch {
    return {};
  }
}

export function writeNativeCacheJournal(storageKey, journal, storage = globalThis.localStorage) {
  storage.setItem(getNativeCacheJournalStorageKey(storageKey),JSON.stringify(journal));
  return journal;
}

export function updateNativeCacheJournal(storageKey, entry, storage = globalThis.localStorage) {
  if (!entry?.cacheIdentity || !JOURNAL_STATES.has(entry.state)) throw new Error("Estado de journal de cache inválido");
  const journal = readNativeCacheJournal(storageKey,storage);
  const key = getNativeCacheJournalEntryKey(entry.cacheIdentity,entry.contentVersion);
  journal[key] = { ...(journal[key] || {}), ...entry, updatedAt:Date.now() };
  writeNativeCacheJournal(storageKey,journal,storage);
  return journal[key];
}

export function getNativeCacheJournalEntry(storageKey, cacheIdentity, contentVersion = "", storage = globalThis.localStorage) {
  return readNativeCacheJournal(storageKey,storage)[getNativeCacheJournalEntryKey(cacheIdentity,contentVersion)] || null;
}
