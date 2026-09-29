import test from "node:test";
import assert from "node:assert/strict";
import { resolveTemplatesV2Entitlement } from "../src/templates-v2/entitlement.js";
import { createTemplateV2Document, getPublishedTemplateV2View } from "../src/templates-v2/schema.js";

test("Professional e Enterprise recebem Templates V2 pelo plano", () => {
  assert.equal(resolveTemplatesV2Entitlement({ planKey: "professional" }).allowed, true);
  assert.equal(resolveTemplatesV2Entitlement({ planKey: "enterprise" }).allowed, true);
});

test("planos inferiores ficam bloqueados sem override", () => {
  for (const planKey of ["demonstracao", "start", "business"]) assert.equal(resolveTemplatesV2Entitlement({ planKey }).allowed, false);
});

test("override individual tem precedência sobre o plano", () => {
  assert.equal(resolveTemplatesV2Entitlement({ planKey: "start", override: "allowed" }).allowed, true);
  assert.equal(resolveTemplatesV2Entitlement({ planKey: "professional", override: "blocked" }).allowed, false);
  assert.equal(resolveTemplatesV2Entitlement({ planKey: "enterprise", override: "blocked" }).allowed, false);
});

test("Master continua capaz de administrar", () => {
  assert.equal(resolveTemplatesV2Entitlement({ planKey: "start", override: "blocked", isMaster: true }).allowed, true);
});

test("published válido permanece renderizável após perda de entitlement", () => {
  const document = createTemplateV2Document();
  document.published = structuredClone(document.draft);
  assert.equal(resolveTemplatesV2Entitlement({ planKey: "start", override: "blocked" }).allowed, false);
  assert.ok(getPublishedTemplateV2View(document)?.published);
});
