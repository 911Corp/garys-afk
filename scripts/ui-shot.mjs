import { chromium } from 'playwright'
const [base, out, w, h, actions = ''] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(base)
await page.waitForTimeout(3500)
for (const a of actions.split(';').filter(Boolean)) {
  const [kind, arg] = a.split('=')
  if (kind === 'click') await page.getByText(arg, { exact: false }).first().click()
  if (kind === 'key') await page.keyboard.press(arg)
  if (kind === 'wait') await page.waitForTimeout(+arg)
  if (kind === 'scroll') await page.mouse.wheel(0, +arg)
}
await page.waitForTimeout(800)
await page.screenshot({ path: out, fullPage: false })
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'))
await browser.close()
