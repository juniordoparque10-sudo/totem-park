"use strict";

function snapshotData(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  return { id: snapshot.id, ...data, updatedAtMs: data.updatedAt?.toMillis?.() || data.financialUpdatedAt?.toMillis?.() || 0 };
}

function createFirestoreBillingRepository(db, FieldValue) {
  return {
    async getClient(clientId) { return snapshotData(await db.doc(`clients/${clientId}`).get()); },
    async getInvoice(clientId, invoiceId) { return snapshotData(await db.doc(`clients/${clientId}/invoices/${invoiceId}`).get()); },
    async getOpenInvoices(clientId) {
      const snapshot = await db.collection(`clients/${clientId}/invoices`).where("status", "in", ["pending", "overdue"]).get();
      return snapshot.docs.map(snapshotData);
    },
    async activate({ clientId, clientPatch, contract, invoice, audit }) {
      return db.runTransaction(async (transaction) => {
        const clientRef = db.doc(`clients/${clientId}`);
        const clientSnapshot = await transaction.get(clientRef);
        if (!clientSnapshot.exists) throw new Error("client-not-found");
        if (clientSnapshot.get("financialModelVersion") === 1) return { repeated: true };
        transaction.create(db.doc(`clients/${clientId}/contracts/${contract.id}`), { ...contract, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        transaction.create(db.doc(`clients/${clientId}/invoices/${invoice.id}`), { ...invoice, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        transaction.create(db.doc(`clients/${clientId}/financialAudit/${audit.id}`), { ...audit, createdAt: FieldValue.serverTimestamp() });
        transaction.update(clientRef, { ...clientPatch, financialUpdatedAt: FieldValue.serverTimestamp() });
        return { repeated: false, contractId: contract.id, invoiceId: invoice.id };
      });
    },
    async mutateInvoice({ clientId, invoiceId, mutate, audit, buildClientPatch, resolveNotifications }) {
      return db.runTransaction(async (transaction) => {
        const invoiceRef = db.doc(`clients/${clientId}/invoices/${invoiceId}`);
        const clientRef = db.doc(`clients/${clientId}`);
        const openQuery = db.collection(`clients/${clientId}/invoices`).where("status", "in", ["pending", "overdue", "paid"]);
        const notificationQuery = resolveNotifications
          ? db.collection(`clients/${clientId}/financialNotifications`).where("invoiceId", "==", invoiceId).where("status", "==", "active")
          : null;
        const [invoiceSnapshot, invoicesSnapshot, notificationSnapshot] = await Promise.all([
          transaction.get(invoiceRef),
          transaction.get(openQuery),
          notificationQuery ? transaction.get(notificationQuery) : Promise.resolve(null),
        ]);
        if (!invoiceSnapshot.exists) throw new Error("invoice-not-found");
        const nextInvoice = mutate(snapshotData(invoiceSnapshot));
        const invoices = invoicesSnapshot.docs.map(snapshotData).map((item) => item.id === invoiceId ? nextInvoice : item);
        transaction.set(invoiceRef, { ...nextInvoice, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        if (audit) transaction.set(db.doc(`clients/${clientId}/financialAudit/${audit.id}`), { ...audit, createdAt: FieldValue.serverTimestamp() }, { merge: false });
        if (notificationSnapshot) {
          notificationSnapshot.docs.forEach((item) => transaction.update(item.ref, { status: "resolved", resolvedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }));
        }
        transaction.update(clientRef, { ...buildClientPatch(invoices), financialUpdatedAt: FieldValue.serverTimestamp() });
        return nextInvoice;
      });
    },
    async revert({ clientId, contractId, audit, clientPatch }) {
      return db.runTransaction(async (transaction) => {
        const clientRef = db.doc(`clients/${clientId}`);
        const contractRef = db.doc(`clients/${clientId}/contracts/${contractId}`);
        const [clientSnapshot, contractSnapshot] = await Promise.all([transaction.get(clientRef), transaction.get(contractRef)]);
        if (!clientSnapshot.exists || !contractSnapshot.exists) throw new Error("financial-record-not-found");
        if (clientSnapshot.get("financialMode") === "reverted") return { repeated: true };
        transaction.update(contractRef, { status: "reverted", endedAt: FieldValue.serverTimestamp(), endedReason: "ADMIN_REVERSION", updatedAt: FieldValue.serverTimestamp() });
        transaction.set(db.doc(`clients/${clientId}/financialAudit/${audit.id}`), { ...audit, createdAt: FieldValue.serverTimestamp() });
        transaction.update(clientRef, { ...clientPatch, financialUpdatedAt: FieldValue.serverTimestamp() });
        return { repeated: false };
      });
    },
  };
}

module.exports = { createFirestoreBillingRepository };
