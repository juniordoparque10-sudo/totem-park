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

  if (mode === 'playerBasicIntegratedLab' || mode === 'basicV5PortalLab') {
    const expectedHost = mode === 'playerBasicIntegratedLab' ? '10.0.2.2' : '127.0.0.1'
    if (
      env.VITE_BASIC_HOM !== 'true' ||
      env.VITE_BASIC_V5_INTEGRATED_LAB !== 'true' ||
      env.VITE_USE_FIREBASE_EMULATORS !== 'true' ||
      env.VITE_EMULATOR_PROJECT_ID !== 'demo-totem-basic-hom' ||
      env.VITE_EMULATOR_HOST !== expectedHost ||
      env.VITE_NOW_PLAYING_DEMAND_LAB !== 'true' ||
      env.VITE_NOW_PLAYING_WATCHERS_V2_LAB !== 'true'
    ) {
      throw new Error('BASIC V5 integrado bloqueado: parametros LAB invalidos.')
    }
  }

  if (mode === 'playerBasicUniversal') {
    if (
      env.VITE_APP_MODE !== 'playerRc' ||
      env.VITE_BASIC_V5_UNIVERSAL !== 'true' ||
      env.VITE_OPERATIONAL_HEARTBEAT_SECONDS !== '25' ||
      env.VITE_USE_FIREBASE_EMULATORS === 'true' ||
      env.VITE_BASIC_HOM === 'true' ||
      env.VITE_BASIC_V5_DIAG === 'true' ||
      env.VITE_BASIC_V5_INTEGRATED_LAB === 'true' ||
      env.VITE_EMULATOR_HOST ||
      env.VITE_EMULATOR_PROJECT_ID
    ) {
      throw new Error('Build BASIC V5 universal bloqueado: exige servicos normais e heartbeat ECO de 25 segundos.')
    }
  }

  return {
    plugins: [react()],
    resolve: [
      'playerRc',
      'playerBasicHom',
      'playerBasicDiag',
      'playerBasicIntegratedLab',
      'playerBasicUniversal',
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
