"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBillingCallables } = require("../functions/billing/callables");

test("every financial callable binds the production preview secret", () => {
  const registrations = [];
  const previewSecret = { value: () => "runtime-secret" };
  const onCall = (options, handler) => {
    registrations.push({ options, handler });
    return handler;
  };

  const callables = createBillingCallables({
    onCall,
    HttpsError: class extends Error {},
    db: {},
    FieldValue: {},
    FieldPath: {},
    isMaster: async () => true,
    previewSecret,
  });

  assert.deepEqual(Object.keys(callables).sort(), [
    "confirmFinancialActivation",
    "confirmFinancialReversion",
    "previewFinancialActivation",
    "previewFinancialReversion",
    "renewFinancialContract",
    "reverseFinancialSettlement",
    "settleFinancialInvoice",
  ]);
  assert.equal(registrations.length, 7);
  for (const registration of registrations) {
    assert.deepEqual(registration.options.secrets, [previewSecret]);
    assert.equal(typeof registration.handler, "function");
  }
});
