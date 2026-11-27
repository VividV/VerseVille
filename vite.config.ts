/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Writes dist/precache-manifest.json: every file the built app needs, so the
 * service worker (public/sw.js) can save them all at install and VerseVille
 * works fully offline — including screens the player hasn't opened yet.
 */
function precacheManifest(): Plugin {
  return {
    name: 'verseville-precache-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).map((f) => `/${f}`)
      this.emitFile({
        type: 'asset',
        fileName: 'precache-manifest.json',
        source: JSON.stringify({ version: Date.now(), files }, null, 2),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), precacheManifest()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
