import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://nvcricbuz.runasp.net',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'https://nvcricbuz.runasp.net',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
