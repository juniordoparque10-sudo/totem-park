"use strict";

function createBillingCallables({ onCall, HttpsError, db, FieldValue, FieldPath, isMaster, previewSecret }) {
  const { createFirestoreBillingRepository } = require("./repository");
  const { createBillingService } = require("./service");
  const repository = createFirestoreBillingRepository(db, FieldValue, FieldPath);
  function service() {
    const secret = previewSecret?.value?.() || process.env.BILLING_PREVIEW_SECRET || (process.env.FUNCTIONS_EMULATOR ? "emulator-billing-preview-secret" : "");
    return createBillingService({ repository, previewSecret: secret });
  }
  function endpoint(method) {
    return onCall({ secrets: previewSecret ? [previewSecret] : [] }, async (request) => {
      if (!(await isMaster(request))) throw new HttpsError("permission-denied", "Only an authorized master can manage billing.");
      try { return await service()[method]({ uid: request.auth.uid, email: request.auth.token.email || "" }, request.data || {}); }
      catch (error) { throw new HttpsError("failed-precondition", error.message || "Billing operation failed."); }
    });
  }
  return {
    previewFinancialActivation: endpoint("previewActivation"),
    confirmFinancialActivation: endpoint("confirmActivation"),
    settleFinancialInvoice: endpoint("settleInvoice"),
    reverseFinancialSettlement: endpoint("reverseSettlement"),
    previewFinancialReversion: endpoint("previewReversion"),
    confirmFinancialReversion: endpoint("confirmReversion"),
    renewFinancialContract: endpoint("renewContract"),
  };
}

module.exports = { createBillingCallables };
