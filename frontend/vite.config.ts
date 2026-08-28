import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Release + sourcemap upload to Sentry — ONLY when SENTRY_AUTH_TOKEN is
    // present in the build environment (Vercel/CI). Without the token the
    // plugin is not even instantiated, so local builds and CI without the
    // secret stay byte-for-byte identical and can never fail on Sentry.
    // Org/project come from SENTRY_ORG / SENTRY_PROJECT env vars.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            telemetry: false,
          }),
        ]
      : []),
  ],
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
    rollupOptions: {
      output: {
        // Vendor splitting for the heavy libraries. Combined with the
        // route-level React.lazy in App.tsx, each of these only downloads
        // when a page that actually uses it renders:
        //   - viem: only the wallet login path imports it
        //   - framer-motion (~110 KB): ModulePage / CertPage / OnboardingTour
        //   - react-markdown + remark/micromark tree (~120 KB): ModulePage
        // i18n locales are NOT bundled — i18next-http-backend fetches
        // /locales/{{lng}}/{{ns}}.json at runtime, so there is nothing to
        // split there. The object form pulls each listed package and its
        // exclusive dependency subtree into the named chunk.
        manualChunks: {
          'vendor-viem': ['viem'],
          'vendor-motion': ['framer-motion'],
          'vendor-markdown': ['react-markdown'],
          // Sentry SDK in its own chunk: it loads eagerly (main.tsx inits
          // it before render), but isolating it keeps the entry chunk lean
          // and lets returning visitors cache it across deploys.
          'vendor-sentry': ['@sentry/react'],
          // React core in its own chunk: it loads eagerly (in parallel with
          // the entry), but it changes far less often than app code, so
          // returning visitors keep it cached across deploys.
          'vendor-react': ['react', 'react-dom', 'react-router'],
        },
      },
    },
    // Surface bundle-bloat regressions in build/CI logs. After the Onda 2b
    // code-splitting (route-level React.lazy + manualChunks above), the
    // largest chunks are the entry (~259 KB pre-gzip) and vendor-viem
    // (~201 KB pre-gzip, lazy). The 500 KB ceiling gives headroom before
    // Vite/Rollup emits the chunk-size warning, so a stray new dependency
    // shows up as a noisy log instead of silently drifting bigger.
    // NOTE: this is a warning threshold only — it does NOT fail the build.
    // To enforce a hard budget, hook `onwarn` in rollupOptions and
    // process.exit on chunk-size codes, or grep the build log in CI.
    chunkSizeWarningLimit: 500,
  },
})
