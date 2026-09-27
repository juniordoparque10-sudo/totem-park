import { createObserver } from "./observer-core.js";

const events = new Map();
const makeVideo = (name) => ({
  tagName: "VIDEO",
  currentSrc: `http://localhost/_capacitor_file_/media/${name}.mp4`,
  currentTime: 0,
  readyState: 4,
  networkState: 1,
  addEventListener(type, callback) { events.set(`${name}:${type}`, callback); },
});
const videos = [makeVideo("A"), makeVideo("B")];
const documentRef = { documentElement: {}, querySelectorAll: () => videos };
const values = new Map();
const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
globalThis.MutationObserver = class { observe() {} disconnect() {} };
let timestamp = Date.now();
let snapshot;
const observer = createObserver({ documentRef, storage, now: () => timestamp, onCheckpoint: (item) => { snapshot = item.payload; } });
observer.start({ clientId: "eCd1q9Dq1SMr9D5FlKN8", screenId: "emp3VDKfLzmz1sWJrnbx", deviceId: "b148d1ab-5dd6-42b1-98d7-f2ca68024b59" });
observer.setEnabled(true);
for (let i = 0; i < 12; i += 1) {
  const name = i % 2 ? "B" : "A";
  events.get(`${name}:playing`)();
  timestamp += 10_000;
  events.get(`${name}:ended`)();
}
timestamp += 300_000;
events.get("A:playing")();
timestamp += 2_000;
observer.checkpoint();
observer.stop();
const checkpointBytes = Buffer.byteLength(JSON.stringify(snapshot));
const historyBytes = Buffer.byteLength(JSON.stringify({ ...snapshot, sequence: snapshot.session.sequence }));
console.log(JSON.stringify({
  checkpointBytes,
  historyBytes,
  checkpointsPerDay: 288,
  historiesPerDay: 96,
  estimatedPayloadBytesPerDay: checkpointBytes * 288 + historyBytes * 96,
  estimatedKiBPerDay: Math.round((checkpointBytes * 288 + historyBytes * 96) / 1024),
  estimatedMiBPer30Days: Math.round((checkpointBytes * 288 + historyBytes * 96) * 30 / 1048576 * 100) / 100,
  localBufferBytes: Buffer.byteLength([...values.values()][0]),
}, null, 2));
