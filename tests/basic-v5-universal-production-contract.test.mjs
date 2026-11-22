import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getPlayerTelemetryProfile, shouldCollectAdvancedTelemetry } from '../src/player-basic-heartbeat.js';
import { isApprovedAndroidNavigationPlayer } from '../src/templates-v2/player-capability.js';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('universal mode is BASIC-only and does not activate LAB watcher protocol', () => {
  assert.equal(getPlayerTelemetryProfile('playerRc'), 'BASIC');
  assert.equal(shouldCollectAdvancedTelemetry('playerRc'), false);
  const env = read('.env.playerBasicUniversal');
  assert.match(env, /^VITE_BASIC_V5_UNIVERSAL=true$/m);
  assert.doesNotMatch(env, /NOW_PLAYING_WATCHERS|NOW_PLAYING_DEMAND|INTEGRATED_LAB|BASIC_HOM/);
});

test('universal heartbeat is explicitly 25 seconds without changing V73 constant', () => {
  const app = read('src/App.jsx');
  assert.match(app, /IS_BASIC_V5_UNIVERSAL_BUILD/);
  assert.match(app, /IS_BASIC_V5_UNIVERSAL_BUILD\s*\?\s*25_000/);
  assert.match(read('src/operational-telemetry.js'), /OPERATIONAL_HEARTBEAT_INTERVAL_MS\s*=\s*15_000/);
});

test('normal secure pairing accepts runtime code and contains no synthetic universal code', () => {
  const app = read('src/App.jsx');
  assert.match(app, /code:\s*codigo/);
  assert.match(app, /claimPlayerBinding\(/);
  assert.doesNotMatch(read('.env.playerBasicUniversal'), /BASICV5LAB|screenId|clientId/);
});

test('universal APK metadata is approved for existing remote navigation capability', () => {
  assert.equal(isApprovedAndroidNavigationPlayer('br.com.parksolutions.totempark.player.basicv5', 6), true);
  assert.equal(isApprovedAndroidNavigationPlayer('br.com.parksolutions.totempark.player.basicv5', 5), false);
  const plugin = read('android/app/src/main/java/br/com/parksolutions/totempark/TotemDevicePlugin.java');
  for (const field of ['packageName', 'versionCode', 'versionName', 'buildId', 'buildTimestamp']) {
    assert.match(plugin, new RegExp(`put\\("${field}"`));
  }
});
