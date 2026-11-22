import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync(new URL('../android/app/src/main/java/br/com/parksolutions/totempark/MainActivity.java', import.meta.url), 'utf8');

test('native BASIC handler includes universal package without changing V73 package', () => {
  assert.match(main, /BASIC_V5_UNIVERSAL_PACKAGE\s*=\s*\n?\s*"br\.com\.parksolutions\.totempark\.player\.basicv5"/);
  assert.match(main, /BASIC_V5_PACKAGE\.equals\(getPackageName\(\)\)[\s\S]*BASIC_V5_UNIVERSAL_PACKAGE\.equals\(getPackageName\(\)\)/);
  assert.match(main, /"br\.com\.parksolutions\.totempark"\.equals\(getPackageName\(\)\)/);
});

test('universal exit dialog opens isolated settings activity', () => {
  assert.match(main, /setNeutralButton\([\s\S]*"Configurações"/);
  assert.match(main, /new Intent\(this, BasicUniversalSettingsActivity\.class\)/);
  assert.match(main, /if \(isBasicUniversal\(\)\)/);
  assert.match(main, /BasicUniversalPreferences\.isAutoStartEnabled\(this\)/);
  assert.match(main, /A inicialização automática está desativada/);
});

test('settings activity is not exposed to non-universal packages', () => {
  const settings = fs.readFileSync(new URL('../android/app/src/main/java/br/com/parksolutions/totempark/BasicUniversalSettingsActivity.java', import.meta.url), 'utf8');
  const manifest = fs.readFileSync(new URL('../android/app/src/playerBasicUniversal/AndroidManifest.xml', import.meta.url), 'utf8');
  assert.match(settings, /BasicUniversalPreferences/);
  assert.match(manifest, /BasicUniversalSettingsActivity[\s\S]*android:exported="false"/);
});
