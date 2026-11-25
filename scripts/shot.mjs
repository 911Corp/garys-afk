// Usage: node scripts/shot.mjs <baseUrl> <outDir> <id[,id...]> [seconds] [w] [h] [extraQuery]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const [base, out, ids, secs = '4', w = '1280', h = '720', extra = ''] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
for (const id of ids.split(',')) {
  await page.goto('about:blank')
  await page.goto(`${base}#/render/${id}?${extra}`)
  await page.waitForTimeout(+secs * 1000)
  const t = await page.title()
  await page.screenshot({ path: `${out}/${id}.png` })
  console.log(id, t.startsWith('ERROR') ? t : 'ok', await page.evaluate(() => window.__stage?.measuredFps))
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'))
await browser.close()
