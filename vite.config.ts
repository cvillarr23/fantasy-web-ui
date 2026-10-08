import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Same-origin, not CORS: in production the ingress proxies /v1/* to the FastAPI
// service on the same host as the SPA (see fantasy-core-pipeline's web UI plan).
// Locally, Vite's dev-server proxy does the same thing against a locally-running
// backend, so the app never needs to know about cross-origin requests at all.
const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/v1/trigger/(?:waiver|lineup|draft-pick)(?:\\?|$)': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        headers: { 'X-API-Key': process.env.TRIGGER_API_KEY ?? '' },
      },
      '^/v1/trade/incoming/[^/]+/(?:triage|decision|decision/retry|counter)(?:\\?|$)': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        headers: { 'X-API-Key': process.env.TRIGGER_API_KEY ?? '' },
      },
      '/v1': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
})
