// End-to-end checks against the production build, served under /garys-afk/ like GitHub Pages.
// Usage: npm run build && node tests/e2e/run.mjs   (set CHROME=/path/to/chrome if needed)
import { spawn } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4173
const BASE = `http://localhost:${PORT}/garys-afk/`
const results = []
const ok = (name, pass, detail = '') => {
  console.error(new Date().toISOString().slice(11, 19), name)
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  · ' + detail : ''}`)
}
const ids = []
for (const cat of ['gary', 'terminal', 'cozy', 'space', 'retro', 'nature', 'pixel', 'generative']) {
  const src = readFileSync(new URL(`../../src/scenes/${cat}/index.ts`, import.meta.url), 'utf8')
  for (const m of src.matchAll(/^\s+id: '([\w-]+)',$/gm)) ids.push(m[1])
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => {
  server.stdout.on('data', (d) => String(d).includes('Local') && r())
  setTimeout(r, 8000)
})

const browser = await chromium.launch({ timeout: 60000, executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] })
try {
  /* ---------- every scene renders, in landscape and portrait ---------- */
  if (!process.env.SKIP_SCENES) for (const [vw, vh, label] of [
    [1280, 720, 'landscape'],
    [390, 844, 'portrait'],
  ]) {
    const page = await browser.newPage({ viewport: { width: vw, height: vh } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    for (const id of ids) {
      errors.length = 0
      await page.goto('about:blank')
      await page.goto(`${BASE}#/render/${id}?q=balanced`)
      await page.waitForTimeout(label === 'landscape' ? 2500 : 1200)
      const info = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        if (!c) return { colors: 0, fps: 0 }
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
        const set = new Set()
        for (let i = 0; i < d.length; i += 16) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])
        return { colors: set.size, fps: window.__stage?.measuredFps ?? 0, w: c.width, h: c.height }
      })
      ok(`scene ${id} renders (${label})`, errors.length === 0 && info.colors > 1, `${info.w}x${info.h}, ${info.colors} colours, ${info.fps} fps${errors.length ? ', ' + errors[0] : ''}`)
    }
    await page.close()
  }
  /* ---------- no-flash and reduced motion paths ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 800, height: 450 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    for (const id of ['thunderstorm', 'rainy-night', 'the-trenches', 'terminal-404']) {
      await page.goto('about:blank')
      await page.goto(`${BASE}#/render/${id}?noflash=1&reduced=1&s=${encodeURIComponent(JSON.stringify({ lightning: 3, chaos: 3 }))}`)
      await page.waitForTimeout(6000)
    }
    ok('no-flash + reduced motion modes run', errors.length === 0, errors[0] ?? '')
    await page.close()
  }

  /* ---------- the app ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(BASE)
  await page.waitForTimeout(2000)
  ok('app loads under /garys-afk/ without errors', (await page.title()) === "Gary's AFK" && errors.length === 0, errors[0] ?? '')
  ok('starts on Gary.exe', (await page.locator('.scene-title strong').textContent()) === 'Gary.exe')

  await page.locator('.card', { hasText: 'Fireplace' }).click()
  await page.waitForTimeout(1200)
  ok('picking a card switches scene', (await page.locator('.scene-title strong').textContent()) === 'Fireplace')

  await page.getByRole('tab', { name: 'Space' }).click()
  ok('category filter', (await page.locator('.card').count()) === 4)
  await page.getByRole('tab', { name: 'All' }).click()
  await page.fill('.search', 'rain')
  const found = await page.locator('.card .card-name').allTextContents()
  ok('search', found.includes('Rainy Night') && found.includes('Digital Rain'), found.join(', '))
  await page.fill('.search', '')
  await page.evaluate(() => document.activeElement?.blur()) // shortcuts are ignored while typing in a field

  await page.keyboard.press('l')
  await page.waitForTimeout(400)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(1000)
  const afterNext = await page.locator('.scene-title strong').textContent()
  ok('next scene (→)', afterNext !== 'Fireplace', afterNext)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(1000)
  ok('previous scene (←)', (await page.locator('.scene-title strong').textContent()) === 'Fireplace')

  await page.keyboard.press(' ')
  await page.waitForTimeout(200)
  ok('pause with Space', (await page.getByRole('button', { name: 'Play' }).count()) === 1)
  await page.keyboard.press(' ')

  // a scene setting, then reload: favorites, last scene and settings persist
  await page.locator('.toggle', { hasText: 'Embers' }).click()
  await page.waitForTimeout(500)
  await page.reload()
  await page.waitForTimeout(1500)
  ok('last scene restored after reload', (await page.locator('.scene-title strong').textContent()) === 'Fireplace')
  ok('favorite persisted', (await page.getByRole('tab', { name: '★ 1' }).count()) === 1)
  ok('scene setting persisted', (await page.locator('.toggle', { hasText: 'Embers' }).locator('input').isChecked()) === false)

  await page.keyboard.press('f')
  await page.waitForTimeout(500)
  ok('immersive with F', (await page.locator('.player.is-immersive').count()) === 1)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  ok('Escape leaves immersive', (await page.locator('.player.is-immersive').count()) === 0)

  // shuffle picks another scene
  const before = await page.locator('.scene-title strong').textContent()
  await page.getByRole('button', { name: 'Random scene (R)' }).click()
  await page.waitForTimeout(800)
  ok('shuffle', (await page.locator('.scene-title strong').textContent()) !== before)

  // export, then imports: bad JSON, foreign JSON, the real file
  await page.locator('summary', { hasText: 'Your data' }).click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()])
  const exported = readFileSync(await dl.path(), 'utf8')
  ok('export JSON', JSON.parse(exported).app === 'garys-afk')
  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{oops') })
  await page.waitForTimeout(400)
  ok('import rejects invalid JSON', (await page.locator('.note').textContent()).includes('not valid JSON'))
  await input.setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
  await page.waitForTimeout(400)
  ok('import rejects foreign files', (await page.locator('.note').textContent()).includes('not exported'))
  await input.setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(exported) })
  await page.waitForTimeout(400)
  ok('import accepts an export', (await page.locator('.note').textContent()) === 'Imported.')

  // focus timer shows on the scene
  await page.locator('summary', { hasText: 'Focus timer' }).click()
  await page.getByRole('button', { name: '▶ Start' }).click()
  await page.waitForTimeout(1200)
  const chip = await page.locator('.focus-chip').textContent().catch(() => '')
  ok('focus timer runs', /Focus (24|25):\d\d/.test(chip), chip)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()

  // playlist of two 30-second items: it must advance on its own
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('garys-afk'))
    s.playlists = [{ id: 'pl-test', name: 'Test', items: [{ sceneId: 'aquarium', duration: 0.5 }, { sceneId: 'starfield', duration: 0.5 }], shuffle: false, loop: true, transition: 1 }]
    s.afk = { enabled: true, delay: 1, target: 'current', exitOnInput: true }
    localStorage.setItem('garys-afk', JSON.stringify(s))
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('summary', { hasText: 'Playlists' }).click()
  await page.getByRole('button', { name: '▶ Play' }).click()
  await page.waitForTimeout(1500)
  ok('playlist starts', (await page.locator('.scene-title strong').textContent()) === 'Aquarium')
  await page.waitForTimeout(31_000)
  ok('playlist advances after 30 s', (await page.locator('.scene-title strong').textContent()) === 'Starfield')
  // stay idle: AFK mode (1 minute) kicks in
  await page.waitForTimeout(32_000)
  ok('AFK mode starts after the idle delay', (await page.locator('.player.is-immersive').count()) === 1)
  await page.mouse.move(100, 100)
  await page.mouse.move(300, 300)
  await page.waitForTimeout(600)
  ok('AFK mode exits on input', (await page.locator('.player.is-immersive').count()) === 0)
  ok('no runtime errors during the app session', errors.length === 0, errors.slice(0, 3).join(' | '))

  /* ---------- offline ---------- */
  {
    const c2 = await browser.newContext({ viewport: { width: 1024, height: 700 } })
    const p2 = await c2.newPage()
    await p2.goto(BASE)
    await p2.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 15000))]))
    await p2.waitForTimeout(4000) // let the precache finish
    await c2.setOffline(true)
    await p2.reload()
    await p2.waitForTimeout(1500)
    const title = await p2.locator('.brand h1').textContent().catch(() => '')
    await p2.locator('.card', { hasText: 'Kaleidoscope' }).click()
    await p2.waitForTimeout(1500)
    const scene = await p2.locator('.scene-title strong').textContent().catch(() => '')
    const thumbsOk = await p2.evaluate(() => [...document.querySelectorAll('.card img')].slice(0, 12).every((i) => i.complete && i.naturalWidth > 0))
    ok('works offline after first visit (service worker)', title.startsWith("GARY'S AFK") && scene === 'Kaleidoscope' && thumbsOk, `${title} / ${scene} / thumbnails ${thumbsOk}`)
    await c2.close()
  }

  /* ---------- soak: scene switching and a long run, memory must stay flat ---------- */
  {
    const p3 = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    await p3.goto(BASE)
    await p3.waitForTimeout(2000)
    // real garbage collection through the DevTools protocol, then the live heap size
    const cdp = await p3.context().newCDPSession(p3)
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage')
      return (await cdp.send('Runtime.getHeapUsage')).usedSize
    }
    const h0 = await heap()
    for (let i = 0; i < 96; i++) {
      await p3.keyboard.press('ArrowRight')
      await p3.waitForTimeout(350)
    }
    await p3.waitForTimeout(1500)
    const h1 = await heap()
    const canvases = await p3.locator('canvas').count()
    ok('96 scene switches: one canvas left, heap stable', canvases === 1 && h1 < h0 * 1.5 + 4e6, `heap ${(h0 / 1e6).toFixed(1)} MB -> ${(h1 / 1e6).toFixed(1)} MB, canvases ${canvases}`)
    await p3.locator('.card', { hasText: 'Fireplace' }).click()
    await p3.waitForTimeout(3000)
    const s0 = await heap()
    const fps = []
    for (let i = 0; i < 12; i++) {
      await p3.waitForTimeout(10_000)
      fps.push(await p3.evaluate(() => window.__stage?.measuredFps ?? 0))
    }
    const s1 = await heap()
    ok('2-minute run of one scene: heap stable', s1 < s0 * 1.3 + 2e6, `heap ${(s0 / 1e6).toFixed(1)} MB -> ${(s1 / 1e6).toFixed(1)} MB, fps samples ${fps.join(',')}`)
    await p3.close()
  }
} finally {
  await browser.close()
  server.kill()
  const passed = results.filter((r) => r.pass).length
  writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), passed, total: results.length, results }, null, 2))
  console.log(`\n${passed}/${results.length} passed`)
  process.exitCode = passed === results.length ? 0 : 1
}
