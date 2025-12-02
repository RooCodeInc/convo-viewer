import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import os from 'os'

const PORT_FILE = path.join(os.tmpdir(), 'convo-viewer-server-port')
const DEFAULT_SERVER_PORT = 3001

function getServerPort(): number {
  try {
    const port = fs.readFileSync(PORT_FILE, 'utf-8').trim()
    return parseInt(port, 10) || DEFAULT_SERVER_PORT
  } catch {
    return DEFAULT_SERVER_PORT
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: `http://localhost:${getServerPort()}`,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {
            const newPort = getServerPort()
            console.log(`Proxy error, re-reading server port: ${newPort}`)
          })
        }
      }
    }
  }
})
