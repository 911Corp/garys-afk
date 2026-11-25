// Renders every scene for a few seconds and saves a 640x360 JPEG thumbnail of the real output.
// Usage: node scripts/thumbnails.mjs [baseUrl]   (start `npx vite --base /` first)
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'
const base = process.argv[2] ?? 'http://localhost:5173/'
const out = new URL('../public/assets/thumbnails/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
// scene ids, read from the category index files
const ids = []
for (const cat of ['gary', 'terminal', 'cozy', 'space', 'retro', 'nature', 'pixel', 'generative']) {
  const src = readFileSync(new URL(`../src/scenes/${cat}/index.ts`, import.meta.url), 'utf8')
  for (const m of src.matchAll(/^\s+id: '([\w-]+)',$/gm)) ids.push(m[1])
}
// a moment that shows each scene at its best (seconds of simulated time before the shot)
const wait = { 'game-of-life': 6, 'flow-field': 7, '3d-pipes': 9, 'fireplace': 3, 'aquarium': 4, 'lofi-room': 5, 'gary-exe': 6, 'the-trenches': 4, 'terminal-404': 9, 'fractal-explorer': 10, 'commit-3am': 9, 'anomaly-archive': 9, 'friday-deploy': 8, 'jarvis-core': 7, 'whale-radar': 7, 'purity-scanner': 8, 'dial-up': 7, 'lava-lamp': 6, 'spirograph': 14, 'l-system-garden': 24, 'murmuration': 12, 'reaction-diffusion': 12, 'to-the-moon': 9, 'popup-storm': 7, 'degen-casino': 6, 'sakura-valley': 5, 'little-troop': 40, 'waterfall': 7 }
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 2 })
for (const id of ids) {
  await page.goto('about:blank')
  await page.goto(`${base}#/render/${id}?q=balanced&seed=7`)
  await page.waitForTimeout((wait[id] ?? 4) * 1000)
  await page.screenshot({ path: `${out}${id}.jpg`, type: 'jpeg', quality: 84 })
  console.log('thumb', id)
}
await browser.close()
