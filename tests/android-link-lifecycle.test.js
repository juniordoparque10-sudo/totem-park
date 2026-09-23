import test from "node:test";
import assert from "node:assert/strict";
import {
  LINK_STATES,
  TV_CONNECTION_STORAGE_KEY,
  classifyLinkValidation,
  clearTvConnection,
  normalizeTvConnection,
  persistTvConnection,
  readTvConnection,
  updateTvConnectionScreenId,
} from "../src/android-link-lifecycle.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const legacy = { clientId: "client-a", code: "abc123", deviceId: "device-a" };

test("local link + Firebase OK keeps link", () => {
  assert.deepEqual(classifyLinkValidation(), { state: LINK_STATES.VALIDATED, clear: false });
});

test("offline boot keeps local link", () => {
  assert.equal(classifyLinkValidation({ online: false }).clear, false);
});

test("Firebase timeout keeps local link", () => {
  assert.equal(classifyLinkValidation({ timedOut: true }).clear, false);
});

test("Firebase unavailable keeps local link", () => {
  assert.equal(classifyLinkValidation({ error: { code: "unavailable" } }).clear, false);
});

test("different connectedDeviceId does not clear automatically", () => {
  const result = classifyLinkValidation({
    connectedDeviceId: "device-b",
    localDeviceId: "device-a",
    recentlyOnline: true,
  });
  assert.deepEqual(result, { state: LINK_STATES.DEVICE_CONFLICT, clear: false });
});

test("explicit unlink clears link", () => {
  const storage = memoryStorage();
  persistTvConnection(legacy, storage);
  assert.equal(clearTvConnection({ explicit: true, reason: "operator" }, storage), true);
  assert.equal(storage.getItem(TV_CONNECTION_STORAGE_KEY), null);
});

test("legacy record without screenId remains valid", () => {
  assert.deepEqual(normalizeTvConnection(legacy), { ...legacy, code: "ABC123" });
});

test("record with screenId reuses and preserves screenId", () => {
  const storage = memoryStorage();
  persistTvConnection(legacy, storage);
  updateTvConnectionScreenId("screen-1", storage);
  assert.equal(readTvConnection(storage).screenId, "screen-1");
});
