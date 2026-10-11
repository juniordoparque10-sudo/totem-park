import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { formatScheduledPlaylistSummary } from "../src/portal-schedule-presentation.js";

test("same-day schedule is presented in Brazilian format", () => {
  assert.equal(formatScheduledPlaylistSummary({
    startDate: "2026-10-11", endDate: "2026-10-11",
    startTime: "11:56", endTime: "12:00", targetScreenIds: ["a"],
  }), "11/10/2026, das 11:56 às 12:00 • 1 tela");
});

test("multi-day schedule and plural screens are presented without changing stored values", () => {
  const schedule = {
    startDate: "2026-10-11", endDate: "2026-10-12",
    startTime: "11:56", endTime: "12:00", targetScreenIds: ["a", "b"],
  };
  assert.equal(formatScheduledPlaylistSummary(schedule), "De 11/10/2026 a 12/10/2026, das 11:56 às 12:00 • 2 telas");
  assert.equal(schedule.startDate, "2026-10-11");
});

test("screen update and scheduled playlist save use the existing visual toast", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /alert\("Tela atualizada com sucesso!"\)/);
  assert.match(app, /<PortalSuccessToast message=\{screenSuccessNotice\}/);
  assert.match(app, /showPlaylistSuccess\("Programação agendada (salva|atualizada) com sucesso"\)/);
  assert.doesNotMatch(app, /alert\("Tela cadastrada com sucesso!"\)/);
  assert.match(app, /setScreenSuccessNotice\("Tela cadastrada com sucesso"\)/);
});
