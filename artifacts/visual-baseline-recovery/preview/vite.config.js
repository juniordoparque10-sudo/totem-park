import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const previewDir = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(previewDir, '../../..');
export default defineConfig({
  root: previewDir,
  plugins: [react()],
  resolve: { alias: [
    { find: /^firebase\/firestore$/, replacement: path.join(previewDir, 'mock-firestore.js') },
    { find: /^\.\/firebase$/, replacement: path.join(previewDir, 'mock-firebase.js') },
  ] },
  server: { fs: { allow: [workspace] } },
});
