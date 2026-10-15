import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeQrInteractionConfig } from "../src/templates-v2/qr-interaction/config.js";
import { createTemplateV2Draft, QR_INTERACTION_TYPE } from "../src/templates-v2/schema.js";

test("QR aceita destinos válidos e bloqueia link inválido", () => {
  const config=normalizeQrInteractionConfig({items:[{id:"ok",title:"Site",qr:{type:"link",link:"https://totempark.com.br"}},{id:"bad",title:"Inválido",qr:{type:"link",link:"javascript:alert(1)"}}]});
  assert.equal(config.items.length,1);
  assert.equal(config.items[0].qr.value,"https://totempark.com.br");
});

test("QR persiste cards alternados e usa configurador existente", () => {
  const draft=createTemplateV2Draft(QR_INTERACTION_TYPE,{interaction:{items:[{id:"one",title:"Contato",qr:{type:"text",text:"Olá"}}]}});
  assert.equal(draft.interaction.items[0].qr.value,"Olá");
  assert.match(fs.readFileSync("src/templates-v2/qr-interaction/QrInteractionEditorFields.jsx","utf8"),/QRCodeConfigurator/);
  assert.match(fs.readFileSync("src/templates-v2/qr-interaction/QrInteractionRenderer.jsx","utf8"),/TemplateQRCode/);
});
