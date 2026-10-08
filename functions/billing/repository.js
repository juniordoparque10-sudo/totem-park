"use strict";

function snapshotData(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  return { id: snapshot.id, ...data, updatedAtMs: data.updatedAt?.toMillis?.() || data.financialUpdatedAt?.toMillis?.() || 0 };
}

function createFirestoreBillingRepository(db, FieldValue) {
  return {
    async getClient(clientId) { return snapshotData(await db.doc(`clients/${clientId}`).get()); },
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
  };
}

module.exports = { createFirestoreBillingRepository };
