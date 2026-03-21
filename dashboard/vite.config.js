import { defineConfig, createLogger } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const logger = createLogger()
const originalError = logger.error.bind(logger)
logger.error = (msg, opts) => {
  if (typeof msg === 'string' && msg.includes('proxy') && msg.includes('socket error')) return
  originalError(msg, opts)
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  customLogger: logger,
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        configure: (proxy) => { proxy.on('error', () => {}) },
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        configure: (proxy) => { proxy.on('error', () => {}) },
      },
    },
  },
})
