import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: ['playerRc', 'playerRcSecureLinkExperiment'].includes(mode) ? {
    alias: [
      { find: './jump-diagnostics', replacement: fileURLToPath(new URL('./src/production/jump-diagnostics-disabled.js', import.meta.url)) },
    ],
  } : {},
}))
