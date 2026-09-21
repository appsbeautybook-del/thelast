import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../../shared', import.meta.url))] }, proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true } } },
  build: { sourcemap: false },
});
