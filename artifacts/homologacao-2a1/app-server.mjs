import { createServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../..');
const server = await createServer({
  root: repo, mode: 'web', cacheDir: path.join(root, '.vite-app'),
  server: { host: '127.0.0.1', port: 5199, strictPort: true, hmr: false,
    watch: { ignored: ['**/chrome-profile-gate/**'] },
    proxy: { '/media': 'http://127.0.0.1:5198', '/api/events': 'http://127.0.0.1:5198' },
    headers: { 'Content-Security-Policy': "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; font-src 'self' data:" },
  },
  plugins: [{ name: 'homologacao-local-only', enforce: 'pre',
    configureServer(vite) {
      if (process.env.TOTEM_FIX_VARIANT !== 'before-2a1') return;
      vite.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/sw.js') return next();
        const source = fs.readFileSync(path.join(repo, 'public/sw.js'), 'utf8')
          .replace('key !== CACHE_NAME && RETIRED_APP_SHELL_CACHES.has(key)', 'key !== CACHE_NAME');
        res.setHeader('Content-Type', 'application/javascript'); res.end(source);
      });
    },
    transformIndexHtml() { return [{ tag: 'script', attrs: { type: 'module', src: '/artifacts/homologacao-2a1/observer.js' }, injectTo: 'body' }]; },
    transform(code, id) {
      const source = id.replaceAll('\\', '/').split('?')[0];
      if (source.endsWith('/src/App.jsx') && process.env.TOTEM_FIX_VARIANT) {
        if (['before-2a1', 'before-fix'].includes(process.env.TOTEM_FIX_VARIANT)) {
          code = fs.readFileSync(path.join(root, 'fix/App.before.jsx'), 'utf8');
        }
        return code
          .replace('function markCurrentMediaReady(item, index) {', 'function markCurrentMediaReady(item, index) { window.fix?.events.push({at:Date.now(),event:"react-ready",index,mediaIndex,src:item.preview});')
          .replaceAll('setReadyMediaKey("");', 'window.fix?.events.push({at:Date.now(),event:"react-reset"}); setReadyMediaKey("");')
          .replace(/if \(isCurrent\) markCurrentMediaReady\(item, index\);(\r?\n        }}\r?\n        onError=)/, 'window.fix?.events.push({at:Date.now(),event:"react-image-load",index,isCurrent}); if (isCurrent) markCurrentMediaReady(item, index);$1');
      }
      if (process.env.TOTEM_FIX_VARIANT === 'before-2a1' && source.endsWith('/src/offline-player-cache.js')) {
        return code.replace(/  \/\/ Web keys\/metadata[\s\S]*?if \(!Capacitor.isNativePlatform\(\)\) return \{ removed: 0, sizeBytes: 0 \};\r?\n/, '');
      }
      if (id.replaceAll('\\', '/').split('?')[0] !== repo.replaceAll('\\', '/') + '/src/firebase.js') return;
      const replaced = code.replace(/const firebaseConfig = \{[\s\S]*?\};/, `const firebaseConfig = { apiKey: 'demo-local-key', projectId: 'demo-totem-homolog', authDomain: 'localhost', storageBucket: 'demo-totem-homolog.appspot.com', appId: 'demo-homolog' };`);
      if (replaced === code) throw new Error('Local Firebase isolation failed');
      return `import { connectAuthEmulator } from 'firebase/auth';\nimport { connectFirestoreEmulator } from 'firebase/firestore';\nimport { connectStorageEmulator } from 'firebase/storage';\n` + replaced + `\nconnectAuthEmulator(auth, 'http://127.0.0.1:9288', { disableWarnings: true });\nconnectFirestoreEmulator(db, '127.0.0.1', 8288);\nconnectStorageEmulator(storage, '127.0.0.1', 9388);`;
    },
  }],
});
await server.listen();
console.log('Aplicacao real isolada: http://127.0.0.1:5199 | demo-totem-homolog');
