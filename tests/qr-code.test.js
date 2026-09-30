import test from "node:test";
import assert from "node:assert/strict";
import { buildQRCodeValue, buildQrUrl, getQRCodeValidationError, normalizePhoneDigits } from "../src/qr-code.js";

test("QR encodes URLs, WhatsApp and social links", () => {
  for (const value of ["https://totempark.com.br", "https://wa.me/5584999999999", "https://instagram.com/totempark"]) {
    const url = buildQrUrl(value);
    assert.match(url, /^https:\/\/api\.qrserver\.com/);
    assert.ok(url.includes(encodeURIComponent(value)));
  }
});

test("empty QR content is hidden and sizes remain bounded", () => {
  assert.equal(buildQrUrl("   "), "");
  assert.match(buildQrUrl("ok", 10), /size=180x180/);
  assert.match(buildQrUrl("ok", 5000), /size=800x800/);
});

test("WhatsApp QR normalizes masked, international and unformatted numbers", () => {
  assert.equal(normalizePhoneDigits("(84) 99134-6016", "55"), "5584991346016");
  assert.equal(normalizePhoneDigits("+55 84 99134-6016", "55"), "5584991346016");
  assert.equal(normalizePhoneDigits("84 99134-6016", "55"), "5584991346016");
  assert.equal(normalizePhoneDigits("912345678", "351"), "351912345678");
});

test("WhatsApp QR opens the official conversation URL with optional message", () => {
  assert.equal(buildQRCodeValue({ type: "whatsapp", countryCode: "55", phone: "(84) 99134-6016" }), "https://wa.me/5584991346016");
  assert.equal(
    buildQRCodeValue({ type: "whatsapp", countryCode: "55", phone: "84 99134-6016", message: "Olá! Quero informações." }),
    `https://wa.me/5584991346016?text=${encodeURIComponent("Olá! Quero informações.")}`,
  );
});

test("link and free text keep their exact QR payload", () => {
  assert.equal(buildQRCodeValue({ type: "link", link: "https://instagram.com/totempark" }), "https://instagram.com/totempark");
  assert.equal(buildQRCodeValue({ type: "link", link: "https://totempark.com.br" }), "https://totempark.com.br");
  assert.equal(buildQRCodeValue({ type: "text", text: "Atendimento no segundo andar" }), "Atendimento no segundo andar");
});

test("invalid WhatsApp does not create a broken QR payload", () => {
  const config = { type: "whatsapp", countryCode: "55", phone: "123" };
  assert.equal(buildQRCodeValue(config), "");
  assert.equal(getQRCodeValidationError(config), "Informe um número de WhatsApp válido.");
});
