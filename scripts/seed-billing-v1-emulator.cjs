"use strict";

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
if (!/^127\.0\.0\.1:\d+$/.test(firestoreHost || "") || !/^127\.0\.0\.1:\d+$/.test(authHost || "") || projectId !== "demo-totem-billing-ux") {
  throw new Error("emulator-only-fixture-refused");
}

const path = require("node:path");
const { createRequire } = require("node:module");
const requireFromFunctions = createRequire(path.resolve(__dirname, "../functions/package.json"));
const { initializeApp } = requireFromFunctions("firebase-admin/app");
const { getAuth } = requireFromFunctions("firebase-admin/auth");
const { getFirestore, Timestamp } = requireFromFunctions("firebase-admin/firestore");

const mode = process.argv[2] || "legacy";
if (!new Set(["legacy", "active"]).has(mode)) throw new Error("usage: seed-billing-v1-emulator.cjs legacy|active");

const app = initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app);
const clientId = "billing-ux-demo-client";
const adminEmail = "billing.ux.master@example.com";
const adminPassword = "TotemParkDemo#2026";

async function ensureAdmin() {
  let user;
  try { user = await auth.getUserByEmail(adminEmail); }
  catch { user = await auth.createUser({ email: adminEmail, password: adminPassword, displayName: "Homologação Financeira", emailVerified: true }); }
  await db.doc("settings/masterAccess").set({ emails: [adminEmail] }, { merge: true });
  return user;
}

async function clearCollection(name) {
  const snapshot = await db.collection(`clients/${clientId}/${name}`).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((item) => batch.delete(item.ref));
  await batch.commit();
}

async function seedLegacy() {
  await Promise.all(["contracts", "invoices", "financialNotifications", "financialAudit", "financialEmailDeliveries"].map(clearCollection));
  await db.doc(`clients/${clientId}`).set({
    name: "Café Horizonte — Homologação", companyName: "Café Horizonte", email: "cliente.homologacao@example.com",
    plan: "Business", billing: "Mensal", startDate: "2026-09-11", dueDate: "2026-10-11", status: "Ativo",
    accountStatus: "active", screensLimit: 5, financialModelVersion: 0, financialMode: "legacy",
    createdAt: Timestamp.fromDate(new Date("2026-09-11T12:00:00Z")), updatedAt: Timestamp.now(),
  }, { merge: false });
}

async function seedActive() {
  await seedLegacy();
  const contractId = "billing-ux-contract-2026";
  const invoiceId = `${contractId}__2026-10`;
  await db.doc(`clients/${clientId}/contracts/${contractId}`).set({ id: contractId, clientId, schemaVersion: 1, planKey: "business", planName: "Business", startDate: "2026-09-11", endDate: "2027-09-10", status: "active", billingPeriod: "monthly", billingAnchorDay: 11, firstCompetence: "2026-10", nextCompetence: "2026-11", nextInvoiceDueDate: "2026-11-11", defaultAmountCents: 9900, currency: "BRL", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  await db.doc(`clients/${clientId}/invoices/${invoiceId}`).set({ id: invoiceId, clientId, contractId, schemaVersion: 1, competence: "2026-10", billingPeriod: "monthly", amountCents: 9900, currency: "BRL", dueDate: "2026-10-08", status: "pending", paymentOrigin: null, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  await db.doc(`clients/${clientId}/financialNotifications/billing-ux-due-today`).set({ id: "billing-ux-due-today", clientId, contractId, invoiceId, competence: "2026-10", eventType: "due_today", severity: "today", status: "active", title: "Cobrança vence hoje", message: "Competência 2026-10 — vencimento 2026-10-08.", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  await db.doc(`clients/${clientId}/financialAudit/billing-ux-activation`).set({ id: "billing-ux-activation", type: "financial_activation", clientId, contractId, invoiceId, actorUid: "fixture", actorEmail: adminEmail, createdAt: Timestamp.now() });
  await db.doc(`clients/${clientId}`).set({ financialModelVersion: 1, financialMode: "active", activeContractId: contractId, financialStatus: "pending", financialRestriction: "none", financialDaysOverdue: 0, financialReferenceInvoiceId: invoiceId, financialRevision: 1, financialUpdatedAt: Timestamp.now() }, { merge: true });
}

(async () => {
  const user = await ensureAdmin();
  if (mode === "legacy") await seedLegacy(); else await seedActive();
  process.stdout.write(JSON.stringify({ mode, projectId, clientId, adminEmail, adminPassword, adminUid: user.uid }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
