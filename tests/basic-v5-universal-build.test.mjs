import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('universal flavor has a unique production package and version', () => {
  const gradle = read('android/app/build.gradle');
  const block = gradle.match(/playerBasicUniversal\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  assert.match(block, /applicationIdSuffix\s+"\.player\.basicv5"/);
  assert.match(block, /versionCode\s+5/);
  assert.match(block, /versionName\s+"5\.0\.0-basic-v5-universal-test"/);
  assert.match(block, /tvLauncherEnabled:\s*"false"/);
});

test('universal Vite mode uses production services and BASIC ECO cadence', () => {
  const env = read('.env.playerBasicUniversal');
  assert.match(env, /^VITE_APP_MODE=playerRc$/m);
  assert.match(env, /^VITE_OPERATIONAL_HEARTBEAT_SECONDS=25$/m);
  assert.doesNotMatch(env, /EMULATOR|localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i);
  assert.doesNotMatch(env, /VITE_BASIC_HOM=true|VITE_BASIC_V5_INTEGRATED_LAB=true/);
  assert.match(read('package.json'), /build:player-basic-universal/);
  assert.match(read('package.json'), /prepare:player-basic-universal/);
});

test('Vite rejects Emulator or LAB flags in universal mode', () => {
  const vite = read('vite.config.js');
  assert.match(vite, /mode === 'playerBasicUniversal'/);
  assert.match(vite, /Build BASIC V5 universal bloqueado/);
  assert.match(vite, /VITE_USE_FIREBASE_EMULATORS/);
  assert.match(vite, /VITE_BASIC_HOM/);
});

test('V73 flavor remains package-compatible and version 73', () => {
  const gradle = read('android/app/build.gradle');
  const block = gradle.match(/playerRc\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  assert.match(block, /versionCode\s+73/);
  assert.doesNotMatch(block, /applicationIdSuffix/);
});
