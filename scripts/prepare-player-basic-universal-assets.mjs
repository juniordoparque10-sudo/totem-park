import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TARGET_SUFFIX = path.join('android', 'app', 'src', 'playerBasicUniversal', 'assets', 'public');

function listFiles(directory, root = directory) {
  return fs.readdirSync(directory, { withFileTypes:true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute, root) : [path.relative(root, absolute).replaceAll(path.sep, '/')];
  });
}

export function prepareBasicUniversalAssets({ distDir, targetDir, allowedRoot }) {
  const dist = path.resolve(distDir);
  const target = path.resolve(targetDir);
  const expected = path.join(path.resolve(allowedRoot), TARGET_SUFFIX);
  if (target !== expected) throw new Error(`Destino universal inesperado: ${target}`);
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error(`index.html ausente no build: ${dist}`);
  if (fs.existsSync(target)) throw new Error(`Assets universais já existem; recusando sobrescrever: ${target}`);
  fs.mkdirSync(path.dirname(target), { recursive:true });
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  fs.cpSync(dist, temporary, { recursive:true });
  const files = listFiles(temporary).sort().map(relative => ({
    path:relative,
    sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(temporary, relative))).digest('hex'),
  }));
  fs.writeFileSync(path.join(temporary, 'bundle-manifest.json'), `${JSON.stringify({ schemaVersion:1, files }, null, 2)}\n`);
  fs.renameSync(temporary, target);
  return { targetDir:target, files };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = path.resolve(path.dirname(currentFile), '..');
  const result = prepareBasicUniversalAssets({
    distDir:path.join(root, 'dist-player-basic-universal'),
    targetDir:path.join(root, TARGET_SUFFIX),
    allowedRoot:root,
  });
  console.log(`Bundle BASIC V5 universal preparado: ${result.files.length} arquivos verificados.`);
}
