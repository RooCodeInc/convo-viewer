import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Uncommon default ports
const DEFAULT_CLIENT_PORT = 41840;
const DEFAULT_SERVER_PORT = 41839;
const PORT_FILE = path.join(__dirname, '.server-port');

/**
 * Read the server port from the port file, with fallback to default
 */
function getServerPort(): number {
  try {
    const port = parseInt(fs.readFileSync(PORT_FILE, 'utf-8').trim(), 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  } catch {
    // File doesn't exist yet or is invalid
  }
  return DEFAULT_SERVER_PORT;
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEFAULT_CLIENT_PORT,
    strictPort: false, // Allow Vite to find another port if default is in use
    proxy: {
      '/api': {
        target: `http://localhost:${getServerPort()}`,
        changeOrigin: true,
        configure: (proxy, _options) => {
          // Re-read the port file on each request in case it changed
          proxy.on('proxyReq', (_proxyReq, _req, _res) => {
            const currentPort = getServerPort();
            const currentTarget = `http://localhost:${currentPort}`;
            // Note: The target is set at config time, but this log helps debug
            // In practice, the server should start before the client needs to proxy
          });
          proxy.on('error', (err, _req, res) => {
            console.error('Proxy error:', err.message);
            if (res && 'writeHead' in res) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Backend server is not available',
                message: 'Make sure the server is running on the expected port'
              }));
            }
          });
        }
      }
    }
  }
})
