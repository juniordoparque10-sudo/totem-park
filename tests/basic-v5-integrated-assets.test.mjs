import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('asset preparation is confined to the new integrated flavor', () => {
  const source = read('scripts/prepare-player-basic-integrated-lab-assets.mjs');
  assert.match(source, /playerBasicIntegratedLab/);
  assert.doesNotMatch(source, /playerBasicDiag.*assets|playerBasicHom.*assets|playerRc.*assets/);
  assert.match(source, /recusando sobrescrever/);
  assert.match(read('package.json'), /prepare:player-basic-integrated-lab/);
});

test('cleartext access remains scoped to the experimental WebView package build', () => {
  const mainManifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(mainManifest, /android:usesCleartextTraffic="true"/);
  const integrated = read('android/app/src/playerBasicIntegratedLab/AndroidManifest.xml');
  assert.match(integrated, /tools:node="remove"/);
});
