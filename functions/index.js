const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const SPORTSDB_API_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const SPORTS_V2_COMPETITIONS = Object.freeze({
  brasileirao_a: { id: "brasileirao_a", sport: "football", name: "Brasileirão Série A", region: "Brasil", leagueId: "4351" },
  brasileirao_d: { id: "brasileirao_d", sport: "football", name: "Brasileirão Série D", region: "Brasil", leagueId: "5079" },
  brasileirao_feminino: { id: "brasileirao_feminino", sport: "football", name: "Brasileirão Feminino A1", region: "Brasil", leagueId: "5201" },
  acreano: { id: "acreano", sport: "football", name: "Campeonato Acreano", region: "Brasil", leagueId: "5676" },
  alagoano: { id: "alagoano", sport: "football", name: "Campeonato Alagoano", region: "Brasil", leagueId: "5677" },
  amapaense: { id: "amapaense", sport: "football", name: "Campeonato Amapaense", region: "Brasil", leagueId: "5678" },
});
const SPORTS_V2_COVERAGE = Object.freeze({
  football: { available: true, results: true, upcoming: true, standings: true, events: true, live: false, statistics: false },
  basketball: { available: true, events: true, results: true, upcoming: false, standings: false, live: false, advancedStats: false },
  volleyball: { available: true, events: true, results: true, upcoming: false, standings: false, live: false, sets: false },
  motorsport: { available: true, events: true, results: true, upcoming: false, standings: false, live: false },
  futsal: { available: false },
  combat: { available: false },
});
const SPORTS_V2_TTL_MS = Object.freeze({ football: 30 * 60 * 1000, basketball: 20 * 60 * 1000, volleyball: 20 * 60 * 1000, motorsport: 20 * 60 * 1000 });

function sportsV2SnapshotId(sport, competitionId) {
  return `${clean(sport, 32)}_${clean(competitionId || "daily", 80)}`.replace(/[^a-z0-9_-]/gi, "_");
}

function sportsV2Status(event = {}, assumed = "scheduled") {
  const raw = clean(event.strStatus || event.strProgress || "", 80).toLowerCase();
  if (/finished|match finished|ft|after extra time|after penalties/.test(raw)) return "final";
  if (/not started|scheduled|fixture|tbd/.test(raw)) return "scheduled";
  // The free phase never claims live data. Unknown/in-progress states remain neutral.
  return assumed === "finished" ? "final" : "scheduled";
}

function sportsV2TeamEvent(event = {}, sport, assumedStatus, competition) {
  const homeScore = event.intHomeScore ?? event.intHomeResult ?? null;
  const awayScore = event.intAwayScore ?? event.intAwayResult ?? null;
  return {
    id: clean(event.idEvent || `${event.strEvent || "event"}-${event.dateEvent || ""}`, 120),
    sport,
    competition: { id: competition?.id || clean(event.idLeague), name: competition?.name || clean(event.strLeague) || "Competição", region: competition?.region || "" },
    status: sportsV2Status(event, assumedStatus),
    startTime: [clean(event.dateEvent), clean(event.strTime, 8)].filter(Boolean).join("T"),
    venue: clean(event.strVenue || event.strCircuit, 160),
    home: { name: clean(event.strHomeTeam || event.strPlayer || event.strEvent, 120), logo: clean(event.strHomeTeamBadge || event.strThumb, 500) },
    away: { name: clean(event.strAwayTeam, 120), logo: clean(event.strAwayTeamBadge, 500) },
    score: { home: homeScore === null ? null : Number(homeScore), away: awayScore === null ? null : Number(awayScore), summary: clean(event.strResult || event.intScore || "", 120) },
    title: clean(event.strEvent || event.strFilename, 180),
    round: clean(event.intRound || event.strSeason, 80),
  };
}

function sportsV2Standing(row = {}, index = 0) {
  return { position: Number(row.intRank || row.intPosition || index + 1), team: clean(row.strTeam || row.strTeamShort, 120), badge: clean(row.strTeamBadge || row.strBadge, 500), played: Number(row.intPlayed || 0), won: Number(row.intWin || 0), drawn: Number(row.intDraw || 0), lost: Number(row.intLoss || 0), points: Number(row.intPoints ?? row.intPts ?? 0) };
}

async function sportsDbRequest(endpoint) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${SPORTSDB_API_BASE}/${endpoint}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`TheSportsDB ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

async function fetchSportsV2Football(competition) {
  const [past, next] = await Promise.all([
    sportsDbRequest(`eventspastleague.php?id=${encodeURIComponent(competition.leagueId)}`),
    sportsDbRequest(`eventsnextleague.php?id=${encodeURIComponent(competition.leagueId)}`),
  ]);
  let standings = [];
  const year = new Date().getUTCFullYear();
  for (const season of [`${year}`, `${year - 1}`, `${year}-${year + 1}`, `${year - 1}-${year}`]) {
    try {
      const response = await sportsDbRequest(`lookuptable.php?l=${encodeURIComponent(competition.leagueId)}&s=${encodeURIComponent(season)}`);
      standings = (response.table || []).map(sportsV2Standing).filter((row) => row.team);
      if (standings.length) break;
    } catch { /* another valid season may exist */ }
  }
  return {
    results: (past.events || []).slice(0, 10).map((event) => sportsV2TeamEvent(event, "football", "finished", competition)),
    upcoming: (next.events || []).slice(0, 10).map((event) => sportsV2TeamEvent(event, "football", "scheduled", competition)),
    standings,
  };
}

async function fetchSportsV2Daily(sport) {
  const sportsDbSport = { basketball: "Basketball", volleyball: "Volleyball", motorsport: "Motorsport" }[sport];
  const date = new Date().toISOString().slice(0, 10);
  const response = await sportsDbRequest(`eventsday.php?d=${date}&s=${encodeURIComponent(sportsDbSport)}`);
  return { events: (response.events || []).slice(0, 12).map((event) => sportsV2TeamEvent(event, sport, "scheduled", null)) };
}

function requireUid(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Player authentication is required.");
  return request.auth.uid;
}

function clean(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

async function isMaster(request) {
  const email = clean(request.auth?.token?.email).toLowerCase();
  if (!email) return false;
  const access = await db.doc("settings/masterAccess").get();
  const fallback = ["admin@parksolutions.com", "juniordoparque10@gmail.com"];
  const emails = access.exists ? access.get("emails") || [] : fallback;
  return emails.map((item) => clean(item).toLowerCase()).includes(email);
}

exports.claimPlayerBinding = onCall(async (request) => {
  const uid = requireUid(request);
  const code = clean(request.data?.code, 16).toUpperCase();
  const deviceId = clean(request.data?.deviceId);
  const appVersion = clean(request.data?.appVersion, 80);
  if (!code || !deviceId) throw new HttpsError("invalid-argument", "Code and deviceId are required.");

  return db.runTransaction(async (transaction) => {
    const codeRef = db.doc(`tv_codes/${code}`);
    const codeSnapshot = await transaction.get(codeRef);
    if (!codeSnapshot.exists) throw new HttpsError("not-found", "Pairing code was not found.");
    const codeData = codeSnapshot.data() || {};
    const clientId = clean(codeData.clientId);
    const screenId = clean(codeData.screenId);
    if (!clientId || !screenId) throw new HttpsError("failed-precondition", "Pairing code is incomplete.");

    const screenRef = db.doc(`clients/${clientId}/screens/${screenId}`);
    const bindingRef = db.doc(`playerDeviceBindings/${uid}`);
    const [screenSnapshot, bindingSnapshot] = await Promise.all([
      transaction.get(screenRef),
      transaction.get(bindingRef),
    ]);
    if (!screenSnapshot.exists) throw new HttpsError("not-found", "Screen was not found.");

    const previous = bindingSnapshot.data() || {};
    if (previous.status === "ACTIVE" && (previous.clientId !== clientId || previous.screenId !== screenId)) {
      throw new HttpsError("failed-precondition", "This identity is already bound to another screen.");
    }
    const screen = screenSnapshot.data() || {};
    if (screen.connectedAuthUid && screen.connectedAuthUid !== uid) {
      throw new HttpsError("already-exists", "Screen is bound to another authenticated player.");
    }

    const now = FieldValue.serverTimestamp();
    const sameCurrentLink = previous.status === "ACTIVE"
      && previous.clientId === clientId
      && previous.screenId === screenId
      && previous.deviceId === deviceId;
    // Legacy pairedAt/createdAt can predate a later relink. Do not turn either
    // into a claimed current-link timestamp without independent evidence.
    const linkedAt = sameCurrentLink ? (previous.linkedAt || null) : now;
    transaction.set(bindingRef, {
      uid, clientId, screenId, deviceId, appVersion,
      status: "ACTIVE",
      createdAt: previous.createdAt || now,
      pairedAt: sameCurrentLink ? (previous.pairedAt || null) : now,
      linkedAt,
      updatedAt: now,
      revokedAt: null,
    }, { merge: false });
    transaction.update(screenRef, {
      connectedAuthUid: uid,
      connectedDeviceId: deviceId,
      linkedAt,
      status: "online",
      lastSeenAt: now,
    });
    return { status: "ACTIVE", clientId, screenId, deviceId };
  });
});

exports.validatePlayerBinding = onCall(async (request) => {
  const uid = requireUid(request);
  const snapshot = await db.doc(`playerDeviceBindings/${uid}`).get();
  if (!snapshot.exists || snapshot.get("status") !== "ACTIVE") {
    throw new HttpsError("permission-denied", "Player binding is not active.");
  }
  const binding = snapshot.data();
  return { status: binding.status, clientId: binding.clientId, screenId: binding.screenId, deviceId: binding.deviceId };
});

exports.revokePlayerBinding = onCall(async (request) => {
  const callerUid = requireUid(request);
  const requestedUid = clean(request.data?.uid) || callerUid;
  if (requestedUid !== callerUid && !(await isMaster(request))) {
    throw new HttpsError("permission-denied", "Only a master can revoke another player.");
  }
  const bindingRef = db.doc(`playerDeviceBindings/${requestedUid}`);
  return db.runTransaction(async (transaction) => {
    const bindingSnapshot = await transaction.get(bindingRef);
    if (!bindingSnapshot.exists) return { status: "NOT_FOUND" };
    const binding = bindingSnapshot.data();
    const screenRef = db.doc(`clients/${binding.clientId}/screens/${binding.screenId}`);
    const screenSnapshot = await transaction.get(screenRef);
    transaction.update(bindingRef, {
      status: "REVOKED",
      revokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      revokeReason: clean(request.data?.reason, 80) || "REVOKED",
    });
    if (screenSnapshot.exists && screenSnapshot.get("connectedAuthUid") === requestedUid) {
      transaction.update(screenRef, {
        connectedAuthUid: FieldValue.delete(),
        connectedDeviceId: FieldValue.delete(),
        status: "offline",
        lastSeenAt: null,
      });
    }
    return { status: "REVOKED" };
  });
});

exports.getSportsV2Snapshot = onCall({ timeoutSeconds: 30, memory: "256MiB" }, async (request) => {
  // Public, read-only sports snapshots are consumed by production Players that
  // do not establish Firebase Auth outside telemetry builds. No client data is
  // read and all provider/cache writes remain server-side.
  const sport = clean(request.data?.sport, 32).toLowerCase();
  const coverage = SPORTS_V2_COVERAGE[sport];
  if (!coverage) throw new HttpsError("invalid-argument", "Unsupported sport.");
  if (!coverage.available) return { sport, coverage, unavailable: true, reason: "coming-soon" };

  const competitionId = sport === "football" ? clean(request.data?.competitionId, 80) || "brasileirao_a" : "daily";
  const competition = sport === "football" ? SPORTS_V2_COMPETITIONS[competitionId] : null;
  if (sport === "football" && !competition) throw new HttpsError("invalid-argument", "Unsupported competition.");

  const snapshotRef = db.doc(`sportsDataSnapshots/${sportsV2SnapshotId(sport, competitionId)}`);
  const now = Date.now();
  const ttlMs = SPORTS_V2_TTL_MS[sport] || 30 * 60 * 1000;
  const existing = await snapshotRef.get();
  const existingData = existing.data() || null;
  if (existingData?.payload && Number(existingData.expiresAtMs || 0) > now) {
    return { ...existingData.payload, cache: { hit: true, isStale: false, updatedAt: existingData.updatedAtIso, lastSuccessfulAt: existingData.lastSuccessfulAtIso } };
  }

  const acquired = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(snapshotRef);
    const data = current.data() || {};
    if (data.payload && Number(data.expiresAtMs || 0) > now) return false;
    if (Number(data.refreshingUntilMs || 0) > now) return false;
    transaction.set(snapshotRef, { refreshingUntilMs: now + 15000, refreshStartedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });

  if (!acquired) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const refreshed = await snapshotRef.get();
      const data = refreshed.data() || {};
      if (data.payload && Number(data.expiresAtMs || 0) > Date.now()) {
        return { ...data.payload, cache: { hit: true, deduplicated: true, isStale: false, updatedAt: data.updatedAtIso, lastSuccessfulAt: data.lastSuccessfulAtIso } };
      }
    }
    if (existingData?.payload) return { ...existingData.payload, cache: { hit: true, deduplicated: true, isStale: true, updatedAt: existingData.updatedAtIso, lastSuccessfulAt: existingData.lastSuccessfulAtIso } };
    throw new HttpsError("unavailable", "Sports data refresh is in progress.");
  }

  try {
    const data = sport === "football" ? await fetchSportsV2Football(competition) : await fetchSportsV2Daily(sport);
    const timestamp = new Date().toISOString();
    const payload = { provider: "thesportsdb", sport, competition: competition || null, coverage, data };
    await snapshotRef.set({ payload, sport, competitionId, updatedAtIso: timestamp, lastSuccessfulAtIso: timestamp, expiresAtMs: Date.now() + ttlMs, refreshingUntilMs: 0, updatedAt: FieldValue.serverTimestamp(), lastSuccessfulAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ...payload, cache: { hit: false, isStale: false, updatedAt: timestamp, lastSuccessfulAt: timestamp } };
  } catch (error) {
    await snapshotRef.set({ refreshingUntilMs: 0, lastFailureAt: FieldValue.serverTimestamp(), lastFailureMessage: clean(error?.message, 160) }, { merge: true });
    if (existingData?.payload) return { ...existingData.payload, cache: { hit: true, isStale: true, updatedAt: existingData.updatedAtIso, lastSuccessfulAt: existingData.lastSuccessfulAtIso } };
    throw new HttpsError("unavailable", "Sports data is temporarily unavailable.");
  }
});
