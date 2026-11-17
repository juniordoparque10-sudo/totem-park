import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const gradle = fs.readFileSync(new URL("../android/app/build.gradle", import.meta.url), "utf8");
const plugin = fs.readFileSync(new URL("../android/app/src/main/java/br/com/parksolutions/totempark/TotemDevicePlugin.java", import.meta.url), "utf8");

test("build Android incorpora identificação e data da compilação no BuildConfig", () => {
  assert.match(gradle, /TOTEM_BUILD_ID/);
  assert.match(gradle, /TOTEM_BUILD_TIMESTAMP/);
  assert.match(gradle, /TOTEM_BUILD_ID/);
  assert.match(gradle, /commandLine\s+['"]git['"],\s*['"]rev-parse['"],\s*['"]--short=12['"],\s*['"]HEAD['"]/);
});

test("plugin expõe versão instalada pelo PackageManager e build pelo BuildConfig", () => {
  assert.match(plugin, /getPackageManager\(\)\.getPackageInfo\(packageName, 0\)/);
  assert.match(plugin, /packageInfo\.getLongVersionCode\(\)/);
  assert.match(plugin, /result\.put\("versionName", packageInfo\.versionName/);
  assert.match(plugin, /result\.put\("buildId", BuildConfig\.TOTEM_BUILD_ID\)/);
  assert.match(plugin, /result\.put\("buildTimestamp", BuildConfig\.TOTEM_BUILD_TIMESTAMP\)/);
  assert.doesNotMatch(plugin, /VITE_APP_VERSION/);
});
