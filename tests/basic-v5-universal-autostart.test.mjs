import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('universal preference defaults enabled and persists one isolated boolean', () => {
  const source = read('android/app/src/main/java/br/com/parksolutions/totempark/BasicUniversalPreferences.java');
  assert.match(source, /PREFERENCES_NAME\s*=\s*"totem_basic_v5_universal"/);
  assert.match(source, /AUTO_START_KEY\s*=\s*"auto_start_enabled"/);
  assert.match(source, /getBoolean\(AUTO_START_KEY, true\)/);
  assert.match(source, /putBoolean\(AUTO_START_KEY, enabled\)\.apply\(\)/);
});

test('receiver is exact-package, preference-gated and launches only once', () => {
  const source = read('android/app/src/main/java/br/com/parksolutions/totempark/BasicUniversalBootReceiver.java');
  assert.match(source, /br\.com\.parksolutions\.totempark\.player\.basicv5/);
  assert.match(source, /BasicUniversalPreferences\.isAutoStartEnabled\(context\)/);
  assert.match(source, /ACTION_BOOT_COMPLETED/);
  assert.match(source, /ACTION_MY_PACKAGE_REPLACED/);
  assert.match(source, /QUICKBOOT_POWERON/);
  assert.match(source, /FLAG_ACTIVITY_NEW_TASK/);
  assert.match(source, /FLAG_ACTIVITY_SINGLE_TOP/);
  assert.match(source, /FLAG_ACTIVITY_CLEAR_TOP/);
  assert.equal((source.match(/startActivity\(/g) || []).length, 1);
  assert.doesNotMatch(source, /AlarmManager|setAndAllowWhileIdle|schedule/);
});

test('universal manifest owns its receiver and removes protected BootReceiver', () => {
  const manifest = read('android/app/src/playerBasicUniversal/AndroidManifest.xml');
  assert.match(manifest, /BasicUniversalBootReceiver/);
  assert.match(manifest, /android\.intent\.action\.BOOT_COMPLETED/);
  assert.match(manifest, /android\.intent\.action\.MY_PACKAGE_REPLACED/);
  assert.match(manifest, /BasicUniversalSettingsActivity/);
  assert.match(manifest, /android:name="\.BootReceiver"[\s\S]*tools:node="remove"/);
});

test('V73 BootReceiver source is not extended with universal package', () => {
  assert.doesNotMatch(read('android/app/src/main/java/br/com/parksolutions/totempark/BootReceiver.java'), /player\.basicv5/);
});
