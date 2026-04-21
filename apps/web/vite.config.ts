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
      '/auth': 'http://localhost:8000',
      '/videos': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/debug': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/proxy': 'http://localhost:8000',
    },
  },
})
