// Renders every scene for a few seconds and saves a 320x180 PNG thumbnail of the real output.
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
const wait = { 'game-of-life': 6, 'flow-field': 7, '3d-pipes': 9, 'fireplace': 3, 'aquarium': 4, 'touch-grass': 4, 'burger-shift': 3, 'gary-exe': 6, 'the-trenches': 4, 'terminal-404': 9, 'fractal-explorer': 10 }
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 1 })
for (const id of ids) {
  await page.goto('about:blank')
  await page.goto(`${base}#/render/${id}?q=balanced&seed=7`)
  await page.waitForTimeout((wait[id] ?? 4) * 1000)
  await page.screenshot({ path: `${out}${id}.png` })
  console.log('thumb', id)
}
await browser.close()
