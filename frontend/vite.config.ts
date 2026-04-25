import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Surface bundle-bloat regressions in build/CI logs. The current main
    // JS bundle sits ~880 KB pre-gzip (~290 KB gzipped) — heavy contributors
    // are ethers, framer-motion, and react-markdown. The 1100 KB ceiling
    // gives ~25 % headroom before Vite/Rollup emits the chunk-size warning,
    // so a stray new dependency shows up as a noisy log instead of silently
    // drifting bigger. NOTE: this is a warning threshold only — it does NOT
    // fail the build. To enforce a hard budget, hook `onwarn` in rollupOptions
    // and process.exit on chunk-size codes, or grep the build log in CI.
    chunkSizeWarningLimit: 1100,
  },
})
