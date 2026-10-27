import fs from "node:fs/promises";
import test, { after, before } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-totem-v56-telemetry";
let env;
const screenPath = (screen = "screen-a") => `clients/client-a/screens/${screen}`;
const activity = (screenId = "screen-a", atMs = 1) => ({ schemaVersion:1, events:[{ id:`${screenId}:${atMs}:1`, screenId, type:"PLAYBACK_START", state:"ACTIVE", atMs, mediaId:"m1", mediaType:"video", reason:"", domain:"playback" }] });
const telemetry = (screenId = "screen-a", deviceId = "device-a") => ({ schemaVersion:4, session:{ sessionId:"session-1", clientId:"client-a", screenId, deviceId }, activity:activity(screenId) });

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore:{ rules:await fs.readFile("firestore.rules", "utf8") } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, screenPath()), { name:"A", connectedDeviceId:"device-a", telemetry:telemetry() });
    await setDoc(doc(db, screenPath("screen-b")), { name:"B", connectedDeviceId:"device-b", telemetry:telemetry("screen-b", "device-b") });
    await setDoc(doc(db, "playerDeviceBindings/player-a"), { uid:"player-a", clientId:"client-a", screenId:"screen-a", deviceId:"device-a", status:"ACTIVE" });
    await setDoc(doc(db, "playerDeviceBindings/revoked"), { uid:"revoked", clientId:"client-a", screenId:"screen-a", deviceId:"device-r", status:"REVOKED" });
  });
});

after(async () => env?.cleanup());

test("active bound player can append its own activity batch", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  await assertSucceeds(updateDoc(doc(db, screenPath()), { "telemetry.activity":activity("screen-a", 2) }));
});

test("activity writes require the active binding for the exact screen", async () => {
  const unbound = env.authenticatedContext("unbound").firestore();
  const revoked = env.authenticatedContext("revoked").firestore();
  const bound = env.authenticatedContext("player-a").firestore();
  await assertFails(updateDoc(doc(unbound, screenPath()), { "telemetry.activity":activity("screen-a", 3) }));
  await assertFails(updateDoc(doc(revoked, screenPath()), { "telemetry.activity":activity("screen-a", 3) }));
  await assertFails(updateDoc(doc(bound, screenPath("screen-b")), { "telemetry.activity":activity("screen-b", 3) }));
});
