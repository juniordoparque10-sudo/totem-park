import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../src/TelemetryDashboard.jsx", import.meta.url), "utf8");
const cssUrl = new URL("../src/telemetry-v2.css", import.meta.url);

test("imports an isolated Telemetry V2 stylesheet", () => {
  assert.match(dashboard, /import "\.\/telemetry-v2\.css"/);
  assert.equal(existsSync(cssUrl), true);
});

test("keeps the approved dashboard composition", () => {
  assert.equal((dashboard.match(/<MetricCard /g) || []).length, 14);
  assert.match(dashboard, /Histórico do período/);
  assert.equal((dashboard.match(/<nav className="telemetry-section-nav">[\s\S]*?<button/g) || []).length, 1);
  assert.equal((dashboard.match(/scrollToTelemetry\(/g) || []).length, 6);
  assert.match(dashboard, /telemetry-overview-grid/);
  assert.match(dashboard, /telemetry-v2-activity-timeline-scroll/);
  assert.match(dashboard, /activityExpanded/);
});

test("all authored CSS rules are scoped below telemetry-v2", () => {
  const css = readFileSync(cssUrl, "utf8");
  const selectors = css.match(/(?:^|\})\s*([^@{}][^{}]*)\{/gm) || [];
  for (const rule of selectors) {
    const selector = rule.replace(/^\}/, "").replace(/\{$/, "").trim();
    if (selector.startsWith("@media")) continue;
    for (const part of selector.split(",")) assert.match(part.trim(), /^\.telemetry-v2(?:\s|$|\.|:)/, `unscoped selector: ${part}`);
  }
  assert.match(css, /@media\s*\(max-width:\s*1100px\)/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /\.telemetry-v2 \.telemetry-v2-activity-timeline-scroll\s*\{[^}]*overflow-x:\s*auto/s);
});
