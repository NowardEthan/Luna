import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    strictPort: true,
    port: 5173,
    // Alinha com Electron/wait-on (evita Vite só em ::1 e wait-on em 127.0.0.1)
    host: '127.0.0.1',
  },
})
