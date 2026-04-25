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
    // Surface bundle-bloat regressions early. The current main JS bundle
    // sits ~880 KB pre-gzip (~290 KB gzipped) — heavy contributors are
    // ethers, framer-motion, and react-markdown. The 1100 KB ceiling
    // gives ~25 % headroom before Vite/Rollup emits a chunk-size warning,
    // so a stray new dependency or accidentally-imported module shows up
    // in build/CI logs instead of silently drifting bigger. (This is an
    // alert threshold, not a hard fail — wire a CI grep on the warning
    // if you want enforcement.)
    chunkSizeWarningLimit: 1100,
  },
})
