import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  if (env.VITE_NOW_PLAYING_DEMAND_LAB === 'true' && (
    env.VITE_USE_FIREBASE_EMULATORS !== 'true' ||
    (env.VITE_FIREBASE_EMULATOR_PROJECT_ID !== 'demo-totem-basic-hom' &&
      env.VITE_EMULATOR_PROJECT_ID !== 'demo-totem-basic-hom')
  )) {
    throw new Error('Now Playing LAB bloqueado: exige emulador e projeto demo-totem-basic-hom.')
  }

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

  if (mode === 'playerBasicDiag') {
    if (
      env.VITE_BASIC_HOM !== 'true' ||
      env.VITE_BASIC_V5_DIAG !== 'true' ||
      env.VITE_APP_MODE !== 'playerRc' ||
      env.VITE_USE_FIREBASE_EMULATORS !== 'true' ||
      env.VITE_EMULATOR_PROJECT_ID !== 'demo-totem-basic-hom' ||
      env.VITE_EMULATOR_HOST !== '10.0.2.2'
    ) {
      throw new Error('Build BASIC V5 DIAG bloqueado: parametros de diagnostico invalidos.')
    }
  }

  return {
    plugins: [react()],
    resolve: [
      'playerRc',
      'playerBasicHom',
      'playerBasicDiag',
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
