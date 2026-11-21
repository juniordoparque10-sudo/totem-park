const BASIC_V5_LAB_PROJECT_ID = "demo-totem-basic-hom";
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

function isBasicV5LabProject(projectId) {
  return projectId === BASIC_V5_LAB_PROJECT_ID;
}

function buildPlayerLabClaims(existing = {}, identity = {}) {
  const clientId = String(identity.clientId || "").trim();
  const screenId = String(identity.screenId || "").trim();
  if (!SAFE_ID.test(clientId) || !SAFE_ID.test(screenId)) throw new Error("Invalid Player LAB identity");
  return { ...existing, clientId, screenId, role:"player" };
}

function stripPlayerLabClaims(existing = {}) {
  if (existing.role !== "player") return { ...existing };
  const next = { ...existing };
  delete next.clientId;
  delete next.screenId;
  delete next.role;
  return next;
}

module.exports = { BASIC_V5_LAB_PROJECT_ID, isBasicV5LabProject, buildPlayerLabClaims, stripPlayerLabClaims };
