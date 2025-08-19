import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const HMR_HOST = process.env.VITE_PUBLIC_HOST || undefined
const HTTPS = (process.env.VITE_PUBLIC_HTTPS || 'false') === 'true'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    hmr: HMR_HOST ? {
      host: HMR_HOST,
      protocol: HTTPS ? 'wss' : 'ws',
      clientPort: HTTPS ? 443 : 5173
    } : true
  }
})
