import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const accessSource = readFileSync(new URL("../src/financial-access.js", import.meta.url), "utf8");

test("uses the approved overdue invoice title without changing the dynamic warning text", () => {
  assert.match(appSource, /warning:\s*"Fatura do mês vencida"/);
  assert.doesNotMatch(appSource, /warning:\s*"Plano vencido"/);
  assert.match(
    accessSource,
    /Pagamento atrasado há \$\{days\} dia\(s\)\. Regularize para evitar restrições\./,
  );
});
