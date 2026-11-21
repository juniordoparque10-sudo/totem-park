import test, {before, after} from "node:test";
import fs from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";
import {doc, setDoc, updateDoc} from "firebase/firestore";

let env;
const screenPath = "clients/basic-v5-client/screens/basic-v5-screen";

function basic(deviceId = "device-v5", screenId = "basic-v5-screen") {
  return {
    schemaVersion: 5,
    profile: "BASIC",
    identity: {
      clientId: "basic-v5-client",
      screenId,
      deviceId
    },
    session: {
      sessionId: "session-v5",
      sequence: 1
    },
    installation: {
      packageName: "br.com.parksolutions.totempark.player.basichom",
      versionCode: 1,
      versionName: "1.0.0-basic-v5-hom"
    },
    connection: {state: "ONLINE"},
    playback: {
      state: "PLAYING",
      activeType: "PLAYLIST"
    }
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-totem-basic-v5-rules",
    firestore: {
      rules: await fs.readFile("firestore.rules", "utf8")
    }
  });

  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();

    await setDoc(doc(db, "settings/masterAccess"), {
      emails: ["master@example.com"]
    });

    await setDoc(doc(db, "clients/basic-v5-client"), {
      uid: "client-owner",
      accountStatus: "active"
    });

    await setDoc(doc(db, screenPath), {
      status: "online",
      name: "TV BASIC V5",
      connectedDeviceId: "device-v5"
    });

    await setDoc(doc(db, "playerDeviceBindings/player-v5"), {
      uid: "player-v5",
      clientId: "basic-v5-client",
      screenId: "basic-v5-screen",
      deviceId: "device-v5",
      status: "ACTIVE"
    });

    await setDoc(doc(db, "playerDeviceBindings/revoked-v5"), {
      uid: "revoked-v5",
      clientId: "basic-v5-client",
      screenId: "basic-v5-screen",
      deviceId: "device-v5",
      status: "REVOKED"
    });
  });
});

after(async () => {
  await env?.cleanup();
});

test("BASIC V5 vinculado pode enviar heartbeat", async () => {
  const db = env.authenticatedContext("player-v5").firestore();

  await assertSucceeds(updateDoc(doc(db, screenPath), {
    telemetry: basic(),
    telemetryUpdatedAt: new Date(),
    connectedDeviceId: "device-v5",
    status: "online",
    lastConnection: "teste",
    lastSeenAt: new Date()
  }));
});

test("usuario anonimo sem vinculo e bloqueado", async () => {
  const db = env.authenticatedContext("unbound-v5").firestore();

  await assertFails(updateDoc(doc(db, screenPath), {
    telemetry: basic(),
    telemetryUpdatedAt: new Date()
  }));
});

test("vinculo revogado e bloqueado", async () => {
  const db = env.authenticatedContext("revoked-v5").firestore();

  await assertFails(updateDoc(doc(db, screenPath), {
    telemetry: basic(),
    telemetryUpdatedAt: new Date()
  }));
});

test("identidade de outra tela ou dispositivo e bloqueada", async () => {
  const db = env.authenticatedContext("player-v5").firestore();

  await assertFails(updateDoc(doc(db, screenPath), {
    telemetry: basic("outro-dispositivo"),
    telemetryUpdatedAt: new Date()
  }));

  await assertFails(updateDoc(doc(db, screenPath), {
    telemetry: basic("device-v5", "outra-tela"),
    telemetryUpdatedAt: new Date()
  }));
});

test("campos administrativos continuam protegidos", async () => {
  const db = env.authenticatedContext("player-v5").firestore();

  await assertFails(updateDoc(doc(db, screenPath), {
    telemetry: basic(),
    name: "Alteracao indevida"
  }));
});

test("master autorizado continua podendo administrar", async () => {
  const db = env.authenticatedContext(
    "master-v5",
    {email: "master@example.com"}
  ).firestore();

  await assertSucceeds(updateDoc(doc(db, screenPath), {
    name: "TV aprovada"
  }));
});