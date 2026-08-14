import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        oauthBridge: path.resolve(__dirname, 'oauth-bridge.html'),
      },
    },
  },
  server: {
    strictPort: true,
    port: 5173,
    host: '127.0.0.1',
    fs: {
      // Permite importar componentes do projeto `orbit` irmão
      // (ex: AurasigninScreen.tsx usa o LoginScreen de orbit/src/...)
      allow: ['.', '.luna', '../orbit'],
    },
  },
})
