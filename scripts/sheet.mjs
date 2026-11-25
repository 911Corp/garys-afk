// Contact sheet of every scene: node scripts/sheet.mjs <base> <out.png> [extraQuery] [seconds]
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const [base, out, extra = '', secs = '3'] = process.argv.slice(2)
const ids = []
for (const cat of ['gary', 'terminal', 'cozy', 'space', 'retro', 'nature', 'pixel', 'generative']) {
  const src = readFileSync(new URL(`../src/scenes/${cat}/index.ts`, import.meta.url), 'utf8')
  for (const m of src.matchAll(/^\s+id: '([\w-]+)',$/gm)) ids.push(m[1])
}
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 })
const shots = []
for (const id of ids) {
  await p.goto('about:blank')
  await p.goto(`${base}#/render/${id}?q=balanced&seed=7&${extra}`)
  await p.waitForTimeout(+secs * 1000)
  shots.push((await p.screenshot()).toString('base64'))
}
const sheet = await b.newPage({ viewport: { width: 1312, height: 2960 } })
await sheet.setContent(`<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(4,320px);gap:8px;padding:8px">${shots.map((s) => `<img width=320 height=180 src="data:image/png;base64,${s}">`).join('')}</body>`)
await sheet.screenshot({ path: out, fullPage: true })
await b.close()
