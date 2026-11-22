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

test('universal settings presents real installed build identity', () => {
  const settings = fs.readFileSync(new URL('../android/app/src/main/java/br/com/parksolutions/totempark/BasicUniversalSettingsActivity.java', import.meta.url), 'utf8');
  assert.match(settings, /getPackageInfo\(getPackageName\(\), 0\)/);
  assert.match(settings, /VersionCode/);
  assert.match(settings, /VersionName/);
  assert.match(settings, /Perfil: BASIC V5/);
  assert.match(settings, /Build ID:.*BuildConfig\.TOTEM_BUILD_ID/);
  assert.match(settings, /Compilado em:.*BuildConfig\.TOTEM_BUILD_TIMESTAMP/);
});

test('universal exit surface uses approved compact copy and preserves app data', () => {
  assert.match(main, /showBasicUniversalExitDialog/);
  assert.match(main, /Sair do Player\?/);
  assert.match(main, /A reprodução será encerrada nesta tela\./);
  assert.match(main, /Continuar/);
  assert.match(main, /Sair do aplicativo/);
  assert.match(main, /FLAG_DIM_BEHIND/);
  assert.match(main, /setOnKeyListener/);
  assert.doesNotMatch(main, /clearApplicationUserData|deleteRecursively|clearTvConnection/);
});
