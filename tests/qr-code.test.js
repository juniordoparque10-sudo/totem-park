import test from "node:test";
import assert from "node:assert/strict";
import { buildQrUrl } from "../src/qr-code.js";

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
