import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

function callable(name) {
  const invoke = httpsCallable(functions, name);
  return async (payload) => (await invoke(payload)).data;
}

export const previewFinancialActivation = callable("previewFinancialActivation");
export const createFinancialClient = callable("createFinancialClient");
export const confirmFinancialActivation = callable("confirmFinancialActivation");
export const settleFinancialInvoice = callable("settleFinancialInvoice");
export const settleFinancialInvoicesBatch = callable("settleFinancialInvoicesBatch");
export const reverseFinancialSettlement = callable("reverseFinancialSettlement");
export const previewFinancialReversion = callable("previewFinancialReversion");
export const confirmFinancialReversion = callable("confirmFinancialReversion");
export const renewFinancialContract = callable("renewFinancialContract");
export const updateFinancialContract = callable("updateFinancialContract");
export const previewPermanentClientDeletion = callable("previewPermanentClientDeletion");
export const confirmPermanentClientDeletion = callable("confirmPermanentClientDeletion");
export const previewOrphanAuthRemoval = callable("previewOrphanAuthRemoval");
export const confirmOrphanAuthRemoval = callable("confirmOrphanAuthRemoval");
