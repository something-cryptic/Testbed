import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@analyzer/types': path.resolve(__dirname, '../../packages/types/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/videos': 'http://127.0.0.1:8000',
      '/analyze': 'http://127.0.0.1:8000',
      '/users': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/proxy': 'http://127.0.0.1:8000',
      '/upload': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
    },
  },
})
