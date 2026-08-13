import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

const envFile = path.resolve(__dirname, '.env')
let extraDefines = {}
try {
  const envContent = fs.readFileSync(envFile, 'utf-8')
  const envVars = Object.fromEntries(
    envContent.split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('#'))
      .map(line => {
        const idx = line.indexOf('=')
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
      })
  )
  if (envVars.VITE_OPENROUTER_KEY) {
    extraDefines['__OPENROUTER_KEY__'] = JSON.stringify(envVars.VITE_OPENROUTER_KEY)
  }
} catch {}

export default defineConfig({
  logLevel: 'info',
  define: extraDefines,
  server: {
    port: 5173,
    host: true,
    open: '/',
    proxy: {
      '/ai-proxy': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-proxy/, ''),
      },
    },
  },
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});
