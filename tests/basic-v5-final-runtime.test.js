import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { resolveTemplateTimeZone, formatTemplateClockParts } from "../src/template-timezone.js";
import { shouldUseSingleDecoderTransition } from "../src/decoder-lifecycle.js";
import { getPlaylistNavigationCapability } from "../src/player-remote-capability.js";

test("template clock uses configured screen time zone instead of Android local zone", () => {
  const timeZone = resolveTemplateTimeZone({
    screen:{ timeZone:"America/Manaus" },
    template:{ timeZone:"America/Sao_Paulo" },
  });
  assert.equal(timeZone, "America/Manaus");
  assert.equal(formatTemplateClockParts(new Date("2026-11-22T15:00:00.000Z"), { timeZone }).time, "11:00");
});

test("location time zone is used when the screen has no explicit setting", () => {
  assert.equal(resolveTemplateTimeZone({
    screen:{ deviceLocation:{ timeZone:"America/Fortaleza" } },
    template:{ timeZone:"Invalid/Zone" },
  }), "America/Fortaleza");
});

test("invalid zones use deterministic UTC rather than Android local time", () => {
  assert.equal(resolveTemplateTimeZone({ screen:{ timeZone:"Mars/Olympus" } }), "UTC");
});

test("playlist navigation does not depend on template capability flags", () => {
  const screen = {
    connectedDeviceId:"device-a",
    capabilities:{
      platform:"ANDROID",
      packageName:"br.com.parksolutions.totempark.player.basicv5",
      versionCode:6,
      deviceId:"device-a",
      playlistItemNavigation:true,
    },
  };
  assert.equal(getPlaylistNavigationCapability(screen).supported, true);
});

test("universal candidate uses buffered layers while V73 keeps single decoder lifecycle", () => {
  assert.equal(shouldUseSingleDecoderTransition({ playerRc:true, basicUniversal:true }), false);
  assert.equal(shouldUseSingleDecoderTransition({ playerRc:true, basicUniversal:false }), true);
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /shouldUseSingleDecoderTransition\(\{/);
});
