import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzer } from 'vite-bundle-analyzer'

// Canonical URL is deployment-provided at build time (VITE_CANONICAL_URL).
// Until MYF-14 exposes a real domain this stays empty and the tag is skipped,
// so SEO never points at a guessed URL.
function canonicalPlugin(): Plugin {
  return {
    name: 'myf:canonical',
    transformIndexHtml() {
      const url = process.env.VITE_CANONICAL_URL?.trim()
      if (!url) {
        return [
          {
            tag: 'link',
            attrs: { rel: 'canonical', href: '/' },
            injectTo: 'head',
          },
        ]
      }
      return [
        {
          tag: 'link',
          attrs: { rel: 'canonical', href: url },
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(() => {
  const isAnalyze = process.env.ANALYZE === 'true'

  return {
    plugins: [
      react(),
      canonicalPlugin(),
      // Bundle analysis: `ANALYZE=true npm run build` emits an interactive
      // treemap (dist/stats.html) and a summary to the console, without
      // affecting normal builds.
      ...(isAnalyze
        ? [
            analyzer({
              analyzerMode: 'static',
              reportTitle: 'My Financial Compass bundle',
              summary: true,
              openAnalyzer: false,
              defaultSizes: 'gzip',
            }),
          ]
        : []),
    ],
    server: {
      port: 3000,
      strictPort: true,
    },
    preview: {
      port: 3000,
    },
    build: {
      target: 'es2022',
      // Split heavy vendor libraries out of the app chunks so the initial
      // route loads a small bundle and react/react-dom are cached separately.
      rolldownOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react'
            }
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },
      },
    },
  }
})