import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = () => fs.readFileSync(new URL('../scripts/prepare-player-basic-universal-assets.mjs', import.meta.url), 'utf8');

test('universal asset preparation is confined to its own source set', () => {
  const value = source();
  assert.match(value, /playerBasicUniversal/);
  assert.match(value, /dist-player-basic-universal/);
  assert.doesNotMatch(value, /playerRc[\\/',]|playerBasicHom[\\/',]|playerBasicDiag[\\/',]|playerBasicMedicao[\\/',]/);
  assert.match(value, /recusando sobrescrever/);
});

test('bundle receives a SHA-256 manifest before atomic rename', () => {
  const value = source();
  assert.match(value, /createHash\(['"]sha256['"]\)/);
  assert.match(value, /bundle-manifest\.json/);
  assert.match(value, /renameSync\(temporary, target\)/);
});
