/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/** Emits sw.js with a versioned precache list of every file in the build. */
function serviceWorker(): Plugin {
  return {
    name: 'garys-afk-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const pub = new URL('./public', import.meta.url).pathname
      const walk = (d: string): string[] =>
        readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [relative(pub, join(d, n))]))
      const files = ['./', ...Object.keys(bundle), ...walk(pub)].filter((f) => !f.endsWith('.map') && f !== 'sw.js')
      const src = readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8')
      const hash = files.join('|').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: src
          .replaceAll('__VERSION__', `${pkg.version}-${(hash >>> 0).toString(36)}`)
          .replaceAll('__FILES__', JSON.stringify(files)),
      })
    },
  }
}

export default defineConfig({
  base: process.env.GARYS_AFK_BASE ?? '/garys-afk/',
  plugins: [react(), serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2022', chunkSizeWarningLimit: 600 },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
})
