import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

function callable(name) {
  const invoke = httpsCallable(functions, name);
  return async (payload) => (await invoke(payload)).data;
}

export const previewFinancialActivation = callable("previewFinancialActivation");
export const confirmFinancialActivation = callable("confirmFinancialActivation");
export const settleFinancialInvoice = callable("settleFinancialInvoice");
export const reverseFinancialSettlement = callable("reverseFinancialSettlement");
export const previewFinancialReversion = callable("previewFinancialReversion");
export const confirmFinancialReversion = callable("confirmFinancialReversion");
export const renewFinancialContract = callable("renewFinancialContract");
