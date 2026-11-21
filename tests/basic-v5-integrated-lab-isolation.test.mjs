import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('integrated Android flavor is side-by-side, LAB-only and has no autostart', () => {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /playerBasicIntegratedLab\s*\{/);
  assert.match(gradle, /applicationIdSuffix\s+"\.player\.basicv5integrated"/);
  assert.match(gradle, /versionName\s+"1\.0\.0-basic-v5-integrated-lab"/);
  const manifest = read('android/app/src/playerBasicIntegratedLab/AndroidManifest.xml');
  assert.match(manifest, /android:name="\.BootReceiver"/);
  assert.match(manifest, /tools:node="remove"/);
});

test('integrated modes use only demo Emulator, final watcher flags and 25 second ECO heartbeat', () => {
  for (const file of ['.env.playerBasicIntegratedLab', '.env.basicV5PortalLab']) {
    const env = read(file);
    assert.match(env, /VITE_USE_FIREBASE_EMULATORS=true/);
    assert.match(env, /VITE_EMULATOR_PROJECT_ID=demo-totem-basic-hom/);
    assert.match(env, /VITE_BASIC_V5_INTEGRATED_LAB=true/);
    assert.match(env, /VITE_NOW_PLAYING_DEMAND_LAB=true/);
    assert.match(env, /VITE_NOW_PLAYING_WATCHERS_V2_LAB=true/);
  }
  assert.match(read('.env.playerBasicIntegratedLab'), /VITE_OPERATIONAL_HEARTBEAT_SECONDS=25/);
  assert.match(read('package.json'), /build:player-basic-integrated-lab/);
  assert.match(read('package.json'), /dev:basic-v5-portal-lab/);
});

test('V73 identity and ECO configuration remain unchanged', () => {
  const gradle = read('android/app/build.gradle');
  const rc = gradle.match(/playerRc\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  assert.match(rc, /versionCode\s+73/);
  assert.doesNotMatch(rc, /applicationIdSuffix/);
  assert.match(read('.env.playerRc'), /VITE_APP_MODE=playerRc/);
});
