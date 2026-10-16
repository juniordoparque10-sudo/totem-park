import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const scriptPath = new URL("../scripts/verify-player-v56-metadata.ps1", import.meta.url);

test("metadata collector is read-only and inspects only the requested package", () => {
  assert.equal(fs.existsSync(scriptPath), true, "metadata collector must exist");
  const source = fs.readFileSync(scriptPath, "utf8");

  assert.match(source, /dumpsys\s+package/i);
  assert.match(source, /pm\s+path/i);
  assert.match(source, /apksigner/i);
  assert.match(source, /\[string\]\$PackageName/);
  assert.doesNotMatch(source, /adb(?:\.exe)?\s+(?:-s\s+\S+\s+)?(?:install|uninstall)/i);
  assert.doesNotMatch(source, /pm\s+clear/i);
  assert.doesNotMatch(source, /shell\s+rm/i);
});
