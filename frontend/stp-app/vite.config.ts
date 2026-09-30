import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/local-api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/local-api/, '')
      },
      '/utl-api': {
        target: 'http://13.200.3.124',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/utl-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['www-authenticate'];
          });
        }
      }
    }
  }
})
