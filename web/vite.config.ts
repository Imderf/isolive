import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // /api va al servidor de Ogilvy Live (server/), que guarda la llave del TaskBoard.
  server: { port: 5180, strictPort: true, proxy: { '/api': 'http://localhost:4100' } },
})
