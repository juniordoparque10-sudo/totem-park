"use strict";

const { evaluateFinancialState } = require("./domain");

function timestampMillis(value) { return value?.toMillis?.() || (typeof value === "string" ? Date.parse(value) : 0) || 0; }
function snapshotData(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  return { id: snapshot.id, path: snapshot.ref?.path, ...data, updatedAtMs: timestampMillis(data.financialUpdatedAt) || timestampMillis(data.updatedAt) };
}
function versionOf(value) { return String(value.financialRevision ?? value.updatedAtMs ?? "legacy"); }
function cursorOf(snapshot, field) { return snapshot ? { value: snapshot.get(field), path: snapshot.ref.path } : null; }

function createFirestoreBillingRepository(db, FieldValue, FieldPath) {
  const documentId = FieldPath?.documentId?.();
  const ordered = (query, field) => documentId ? query.orderBy(field).orderBy(documentId) : query.orderBy(field);
  const resume = (query, cursor) => !cursor ? query : documentId ? query.startAfter(cursor.value, cursor.path) : query.startAfter(cursor.value);
  return {
    async getClient(clientId) { return snapshotData(await db.doc(`clients/${clientId}`).get()); },
    async getInvoice(clientId, invoiceId) { return snapshotData(await db.doc(`clients/${clientId}/invoices/${invoiceId}`).get()); },
    async getContract(clientId, contractId) { return snapshotData(await db.doc(`clients/${clientId}/contracts/${contractId}`).get()); },
    async getOpenInvoices(clientId) {
      const snapshot = await db.collection(`clients/${clientId}/invoices`).where("status", "in", ["pending", "overdue"]).get();
      return snapshot.docs.map(snapshotData);
    },
    async activate({ clientId, expectedClientVersion, clientPatch, contract, invoice, audit }) {
      return db.runTransaction(async (transaction) => {
        const clientRef = db.doc(`clients/${clientId}`), clientSnapshot = await transaction.get(clientRef);
        if (!clientSnapshot.exists) throw new Error("client-not-found");
        const current = snapshotData(clientSnapshot);
        if (current.financialMode === "active" && current.activeContractId === contract.id) return { repeated: true };
        if (versionOf(current) !== String(expectedClientVersion)) throw new Error("stale-financial-preview");
        transaction.create(db.doc(`clients/${clientId}/contracts/${contract.id}`), { ...contract, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        transaction.create(db.doc(`clients/${clientId}/invoices/${invoice.id}`), { ...invoice, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        transaction.create(db.doc(`clients/${clientId}/financialAudit/${audit.id}`), { ...audit, createdAt: FieldValue.serverTimestamp() });
        transaction.update(clientRef, { ...clientPatch, financialRevision: Number(current.financialRevision || 0) + 1, financialUpdatedAt: FieldValue.serverTimestamp() });
        return { repeated: false, contractId: contract.id, invoiceId: invoice.id };
      });
    },
    async mutateInvoice({ clientId, invoiceId, mutate, audit, buildClientPatch, resolveNotifications }) {
      return db.runTransaction(async (transaction) => {
        const invoiceRef = db.doc(`clients/${clientId}/invoices/${invoiceId}`), clientRef = db.doc(`clients/${clientId}`);
        const invoicesQuery = db.collection(`clients/${clientId}/invoices`).where("status", "in", ["pending", "overdue", "paid"]);
        const noticesQuery = resolveNotifications ? db.collection(`clients/${clientId}/financialNotifications`).where("invoiceId", "==", invoiceId).where("status", "==", "active") : null;
        const [invoiceSnapshot, clientSnapshot, invoicesSnapshot, noticesSnapshot] = await Promise.all([transaction.get(invoiceRef), transaction.get(clientRef), transaction.get(invoicesQuery), noticesQuery ? transaction.get(noticesQuery) : Promise.resolve(null)]);
        if (!invoiceSnapshot.exists) throw new Error("invoice-not-found");
        const outcome = mutate(snapshotData(invoiceSnapshot));
        if (outcome.repeated) return { repeated: true, invoice: outcome.invoice };
        const nextInvoice = outcome.invoice;
        const invoices = invoicesSnapshot.docs.map(snapshotData).map((item) => item.id === invoiceId ? nextInvoice : item);
        transaction.set(invoiceRef, { ...nextInvoice, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        if (audit) transaction.create(db.doc(`clients/${clientId}/financialAudit/${audit.id}`), { ...audit, createdAt: FieldValue.serverTimestamp() });
        if (noticesSnapshot) noticesSnapshot.docs.forEach((item) => transaction.update(item.ref, { status: "resolved", resolvedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }));
        transaction.update(clientRef, { ...buildClientPatch(invoices), financialRevision: Number(clientSnapshot.get("financialRevision") || 0) + 1, financialUpdatedAt: FieldValue.serverTimestamp() });
        return { repeated: false, invoice: nextInvoice };
      });
    },
    async revert({ clientId, contractId, expectedClientVersion, audit, clientPatch }) {
      return db.runTransaction(async (transaction) => {
        const clientRef = db.doc(`clients/${clientId}`), contractRef = db.doc(`clients/${clientId}/contracts/${contractId}`);
        const [clientSnapshot, contractSnapshot] = await Promise.all([transaction.get(clientRef), transaction.get(contractRef)]);
        if (!clientSnapshot.exists || !contractSnapshot.exists) throw new Error("financial-record-not-found");
        const current = snapshotData(clientSnapshot);
        if (current.financialMode === "reverted") return { repeated: true };
        if (versionOf(current) !== String(expectedClientVersion)) throw new Error("stale-financial-preview");
        transaction.update(contractRef, { status: "reverted", endedAt: FieldValue.serverTimestamp(), endedReason: "ADMIN_REVERSION", updatedAt: FieldValue.serverTimestamp() });
        transaction.create(db.doc(`clients/${clientId}/financialAudit/${audit.id}`), { ...audit, createdAt: FieldValue.serverTimestamp() });
        transaction.update(clientRef, { ...clientPatch, financialRevision: Number(current.financialRevision || 0) + 1, financialUpdatedAt: FieldValue.serverTimestamp() });
        return { repeated: false };
      });
    },
    async renew({ clientId, contractId, expectedEndDate, newEndDate, audit }) {
      return db.runTransaction(async (transaction) => {
        const clientRef = db.doc(`clients/${clientId}`), contractRef = db.doc(`clients/${clientId}/contracts/${contractId}`);
        const [clientSnapshot, contractSnapshot] = await Promise.all([transaction.get(clientRef), transaction.get(contractRef)]);
        if (!clientSnapshot.exists || !contractSnapshot.exists) throw new Error("financial-record-not-found");
        if (clientSnapshot.get("financialMode") !== "active" || clientSnapshot.get("activeContractId") !== contractId || !["active", "expired"].includes(contractSnapshot.get("status"))) throw new Error("financial-model-not-active");
        if (contractSnapshot.get("endDate") !== expectedEndDate) throw new Error("contract-changed");
        transaction.update(contractRef, { endDate: newEndDate, status: "active", renewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        transaction.create(db.doc(`clients/${clientId}/financialAudit/${audit.id}`), { ...audit, createdAt: FieldValue.serverTimestamp() });
        transaction.update(clientRef, { financialRevision: Number(clientSnapshot.get("financialRevision") || 0) + 1, financialUpdatedAt: FieldValue.serverTimestamp() });
        return { repeated: false, contractId, endDate: newEndDate };
      });
    },
    async listEligibleContracts({ cutoff, cursor, limit }) {
      let query = db.collectionGroup("contracts").where("status", "==", "active").where("nextInvoiceDueDate", "<=", cutoff);
      query = resume(ordered(query, "nextInvoiceDueDate"), cursor).limit(limit);
      const snapshot = await query.get();
      return { items: snapshot.docs.map(snapshotData), nextCursor: cursorOf(snapshot.docs.at(-1), "nextInvoiceDueDate") };
    },
    async createInvoiceAndAdvance({ invoice, nextInvoiceDueDate, nextCompetence }) {
      const invoiceRef = db.doc(`clients/${invoice.clientId}/invoices/${invoice.id}`), contractRef = db.doc(`clients/${invoice.clientId}/contracts/${invoice.contractId}`), clientRef = db.doc(`clients/${invoice.clientId}`);
      return db.runTransaction(async (transaction) => {
        const [clientSnapshot, contractSnapshot, invoiceSnapshot] = await Promise.all([transaction.get(clientRef), transaction.get(contractRef), transaction.get(invoiceRef)]);
        if (!clientSnapshot.exists || !contractSnapshot.exists) return false;
        const client = clientSnapshot.data(), contract = contractSnapshot.data();
        if (client.financialMode !== "active" || client.activeContractId !== invoice.contractId || contract.status !== "active") return false;
        if (contract.nextCompetence !== invoice.competence || contract.nextInvoiceDueDate !== invoice.dueDate || invoice.dueDate > contract.endDate) return false;
        if (!invoiceSnapshot.exists) transaction.create(invoiceRef, { ...invoice, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        transaction.update(contractRef, { nextInvoiceDueDate, nextCompetence, updatedAt: FieldValue.serverTimestamp() });
        return !invoiceSnapshot.exists;
      });
    },
    async closeContractIfExpired(contract) {
      if (contract.nextInvoiceDueDate <= contract.endDate) return false;
      const ref = db.doc(`clients/${contract.clientId}/contracts/${contract.id}`);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists || snapshot.get("status") !== "active" || snapshot.get("nextInvoiceDueDate") <= snapshot.get("endDate")) return false;
        transaction.update(ref, { status: "expired", expiredAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return true;
      });
    },
    async listEligibleInvoices({ today, cursor, limit }) {
      let query = db.collectionGroup("invoices").where("status", "in", ["pending", "overdue"]).where("dueDate", "<=", addDaysForRepository(today, 5));
      query = resume(ordered(query, "dueDate"), cursor).limit(limit);
      const snapshot = await query.get();
      return { items: snapshot.docs.map(snapshotData), nextCursor: cursorOf(snapshot.docs.at(-1), "dueDate") };
    },
    async createNotificationIfEligible(notification) {
      const ref = db.doc(`clients/${notification.clientId}/financialNotifications/${notification.id}`), invoiceRef = db.doc(`clients/${notification.clientId}/invoices/${notification.invoiceId}`), clientRef = db.doc(`clients/${notification.clientId}`), contractRef = db.doc(`clients/${notification.clientId}/contracts/${notification.contractId}`);
      return db.runTransaction(async (transaction) => {
        const [existing, invoiceSnapshot, clientSnapshot, contractSnapshot] = await Promise.all([transaction.get(ref), transaction.get(invoiceRef), transaction.get(clientRef), transaction.get(contractRef)]);
        if (!invoiceSnapshot.exists || !clientSnapshot.exists || !contractSnapshot.exists) return { eligible: false, created: false };
        if (!["pending", "overdue"].includes(invoiceSnapshot.get("status")) || clientSnapshot.get("financialMode") !== "active" || clientSnapshot.get("activeContractId") !== notification.contractId || contractSnapshot.get("status") !== "active") return { eligible: false, created: false };
        if (existing.exists) return { eligible: true, created: false };
        transaction.create(ref, { ...notification, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return { eligible: true, created: true };
      });
    },
    async recalculateClientFinancial(clientId, today) {
      return db.runTransaction(async (transaction) => {
        const clientRef = db.doc(`clients/${clientId}`), query = db.collection(`clients/${clientId}/invoices`).where("status", "in", ["pending", "overdue"]);
        const [clientSnapshot, invoicesSnapshot] = await Promise.all([transaction.get(clientRef), transaction.get(query)]);
        if (!clientSnapshot.exists || clientSnapshot.get("financialMode") !== "active") return false;
        const state = evaluateFinancialState({ invoices: invoicesSnapshot.docs.map(snapshotData), today });
        if (clientSnapshot.get("financialStatus") === state.status && clientSnapshot.get("financialRestriction") === state.restriction && Number(clientSnapshot.get("financialDaysOverdue") || 0) === state.daysOverdue && (clientSnapshot.get("financialReferenceInvoiceId") || null) === state.referenceInvoiceId) return false;
        transaction.update(clientRef, { financialStatus: state.status, financialRestriction: state.restriction, financialDaysOverdue: state.daysOverdue, financialReferenceInvoiceId: state.referenceInvoiceId, financialRevision: Number(clientSnapshot.get("financialRevision") || 0) + 1, financialUpdatedAt: FieldValue.serverTimestamp() });
        return true;
      });
    },
    async getDelivery(clientId, deliveryId) { return snapshotData(await db.doc(`clients/${clientId}/financialEmailDeliveries/${deliveryId}`).get()); },
    async saveDelivery(delivery) { await db.doc(`clients/${delivery.clientId}/financialEmailDeliveries/${delivery.id}`).set({ ...delivery, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); },
    async getCheckpoint(job) { return snapshotData(await db.doc(`billingJobs/${job}`).get()); },
    async saveCheckpoint(checkpoint) { await db.doc(`billingJobs/${checkpoint.job}`).set({ ...checkpoint, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); },
  };
}

function addDaysForRepository(value, days) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
module.exports = { createFirestoreBillingRepository, snapshotData, versionOf };
