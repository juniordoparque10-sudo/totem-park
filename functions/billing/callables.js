"use strict";

function createBillingCallables({ onCall, HttpsError, db, FieldValue, isMaster }) {
  const { createFirestoreBillingRepository } = require("./repository");
  const { createBillingService } = require("./service");
  const repository = createFirestoreBillingRepository(db, FieldValue);
  const service = createBillingService({ repository, previewSecret: process.env.BILLING_PREVIEW_SECRET || (process.env.FUNCTIONS_EMULATOR ? "emulator-billing-preview-secret" : "") });
  function endpoint(handler) {
    return onCall(async (request) => {
      if (!(await isMaster(request))) throw new HttpsError("permission-denied", "Only an authorized master can manage billing.");
      try { return await handler({ uid: request.auth.uid, email: request.auth.token.email || "" }, request.data || {}); }
      catch (error) { throw new HttpsError("failed-precondition", error.message || "Billing operation failed."); }
    });
  }
  return {
    previewFinancialActivation: endpoint(service.previewActivation),
    confirmFinancialActivation: endpoint(service.confirmActivation),
  };
}

module.exports = { createBillingCallables };
