"use strict";

const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function sign(encoded, secret) {
  return crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
}

function createPreviewToken(payload, { purpose, clientVersion, nowMs = Date.now(), ttlMs = 10 * 60 * 1000, secret }) {
  if (!secret) throw new Error("preview-secret-required");
  const envelope = { purpose, clientVersion, payload, expiresAtMs: nowMs + ttlMs };
  const encoded = Buffer.from(stable(envelope)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

function verifyPreviewToken(token, expectedPayload, { purpose, clientVersion, nowMs = Date.now(), secret }) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature || !secret) throw new Error("preview-invalid");
  const expectedSignature = sign(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new Error("preview-invalid");
  const envelope = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (nowMs > envelope.expiresAtMs) throw new Error("preview-expired");
  if (envelope.purpose !== purpose || envelope.clientVersion !== clientVersion || stable(envelope.payload) !== stable(expectedPayload)) {
    throw new Error("preview-mismatch");
  }
  return envelope;
}

function readPreviewTokenPayload(token) {
  const [encoded] = String(token || "").split(".");
  if (!encoded) throw new Error("preview-invalid");
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")).payload;
}

module.exports = { createPreviewToken, verifyPreviewToken, readPreviewTokenPayload };
