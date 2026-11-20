import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  if (mode === 'playerBasicHom') {
    const host = env.VITE_EMULATOR_HOST || ''
    const validHost = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host)
      && !host.startsWith('127.')
      && !host.startsWith('0.')

    if (
      env.VITE_BASIC_HOM !== 'true' ||
      env.VITE_APP_MODE !== 'playerRc' ||
      env.VITE_USE_FIREBASE_EMULATORS !== 'true' ||
      env.VITE_EMULATOR_PROJECT_ID !== 'demo-totem-basic-hom' ||
      !validHost
    ) {
      throw new Error('Build BASIC HOM bloqueado: parametros de homologacao invalidos.')
    }
  }

  return {
    plugins: [react()],
    resolve: [
      'playerRc',
      'playerBasicHom',
      'playerRcSecureLinkExperiment',
      'playerConsolidatedExperimental',
    ].includes(mode) ? {
      alias: [
        {
          find: './jump-diagnostics',
          replacement: fileURLToPath(
            new URL('./src/production/jump-diagnostics-disabled.js', import.meta.url)
          ),
        },
      ],
    } : {},
  }
})