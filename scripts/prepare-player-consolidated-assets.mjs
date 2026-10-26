import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TARGET_SUFFIX = path.join("android", "app", "src", "playerConsolidatedExperimental", "assets", "public");

function listFiles(directory, root = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute, root) : [path.relative(root, absolute).replaceAll(path.sep, "/")];
  });
}

function referencedAssets(indexHtml) {
  return [...String(indexHtml).matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1]).filter((value) => value.startsWith("/assets/")).map((value) => value.slice(1));
}

export function prepareConsolidatedAssets({ distDir, targetDir, allowedRoot }) {
  const dist = path.resolve(distDir);
  const target = path.resolve(targetDir);
  const expectedTarget = allowedRoot ? path.join(path.resolve(allowedRoot), TARGET_SUFFIX) : null;
  if (!target.endsWith(TARGET_SUFFIX) || (expectedTarget && target !== expectedTarget)) {
    throw new Error(`Destino consolidado inesperado: ${target}`);
  }
  const indexPath = path.join(dist, "index.html");
  if (!fs.existsSync(indexPath)) throw new Error(`index.html ausente no build: ${dist}`);
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  for (const relative of referencedAssets(indexHtml)) {
    if (!fs.existsSync(path.join(dist, relative))) throw new Error(`Asset referenciado não existe: ${relative}`);
  }

  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const nonce = `${process.pid}-${Date.now()}`;
  const temporary = `${target}.tmp-${nonce}`;
  const backup = `${target}.backup-${nonce}`;
  fs.cpSync(dist, temporary, { recursive: true });
  const files = listFiles(temporary).sort().map((relative) => ({
    path: relative,
    sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(temporary, relative))).digest("hex"),
  }));
  fs.writeFileSync(path.join(temporary, "bundle-manifest.json"), `${JSON.stringify({ schemaVersion: 1, files }, null, 2)}\n`);

  let movedCurrent = false;
  try {
    if (fs.existsSync(target)) { fs.renameSync(target, backup); movedCurrent = true; }
    fs.renameSync(temporary, target);
    if (movedCurrent) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { recursive: true, force: true });
    if (movedCurrent && !fs.existsSync(target) && fs.existsSync(backup)) fs.renameSync(backup, target);
    throw error;
  }
  return { targetDir: target, files };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = path.resolve(path.dirname(currentFile), "..");
  const result = prepareConsolidatedAssets({
    distDir: path.join(root, "dist-player-consolidated"),
    targetDir: path.join(root, TARGET_SUFFIX),
    allowedRoot: root,
  });
  console.log(`Bundle consolidado preparado: ${result.files.length} arquivos verificados.`);
}
