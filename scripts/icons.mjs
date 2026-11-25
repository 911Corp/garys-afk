// Builds the app icons from Gary's canonical drawing code (served by the Vite dev server).
// Usage: node scripts/icons.mjs [baseUrl]
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
const base = process.argv[2] ?? 'http://localhost:5173/'
const out = new URL('../public/', import.meta.url).pathname
mkdirSync(out + 'assets/icons', { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const page = await browser.newPage()
await page.goto(base + '#/render/gary-exe')
await page.waitForTimeout(1500)
const result = await page.evaluate(async () => {
  const kit = await import('/src/engine/gary/kit.ts')
  const { Drawing } = await import('/src/engine/gary/draw.ts')
  kit.seed(7 + 101) // canonical "Mid" face
  const ops = [...kit.head(0, 0), ...kit.face(1, 0, 0)]
  // vector favicon
  const paths = ops
    .filter((o) => o.k === 'path')
    .map((o) => (o.fill ? `<path d="${o.d}" fill="#1f2a12" stroke="#1f2a12" stroke-width="1"/>` : `<path d="${o.d}" fill="none" stroke="#1f2a12" stroke-width="${o.w}" stroke-linecap="round" stroke-linejoin="round"/>`))
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -18 34 34"><rect x="-16" y="-18" width="34" height="34" rx="4" fill="#b8d97a"/>${paths}</svg>`
  // pixel icons: draw small, then upscale with nearest neighbour
  const make = (size, pad) => {
    const small = document.createElement('canvas')
    const n = 64
    small.width = small.height = n
    const c = small.getContext('2d')
    c.fillStyle = '#b8d97a'
    c.fillRect(0, 0, n, n)
    const k = (n * (1 - pad * 2)) / 30
    c.setTransform(k, 0, 0, k, n / 2 - 1 * k, n / 2 + 0.5 * k)
    new Drawing(ops).draw(c, '#1f2a12')
    // hard threshold so the icon is pure two-colour pixels
    const img = c.getImageData(0, 0, n, n)
    for (let i = 0; i < img.data.length; i += 4) {
      const dark = img.data[i + 1] < 160
      img.data[i] = dark ? 0x1f : 0xb8
      img.data[i + 1] = dark ? 0x2a : 0xd9
      img.data[i + 2] = dark ? 0x12 : 0x7a
      img.data[i + 3] = 255
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.putImageData(img, 0, 0)
    const big = document.createElement('canvas')
    big.width = big.height = size
    const b = big.getContext('2d')
    b.imageSmoothingEnabled = false
    b.drawImage(small, 0, 0, size, size)
    return big.toDataURL('image/png').split(',')[1]
  }
  return { svg, i512: make(512, 0.08), i192: make(192, 0.08), i180: make(180, 0.08), m512: make(512, 0.2), og: null }
})
writeFileSync(out + 'favicon.svg', result.svg)
for (const [k, f] of [['i512', 'icon-512.png'], ['i192', 'icon-192.png'], ['i180', 'icon-180.png'], ['m512', 'maskable-512.png']]) writeFileSync(out + 'assets/icons/' + f, Buffer.from(result[k], 'base64'))
console.log('icons written')
await browser.close()
