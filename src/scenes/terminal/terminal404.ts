import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { fontsReady } from '../../engine/gary/draw'
import type { SceneContext } from '../../engine/types'

/** Fictional sessions. Commands are typed, outputs appear; {bar} lines animate a progress bar. */
const SESSIONS: string[][] = [
  ['$ cd ~/garys-afk', '$ npm run build', '> tsc -b && vite build', 'transforming...', '{bar} 412 modules transformed', 'dist/index.html      1.2 kB', 'dist/assets/app.js 184.6 kB', 'built in 2.41s'],
  ['$ git status', 'On branch main', "Your branch is ahead of 'origin/main' by 37 commits.", 'Changes not staged for commit:', '  modified:   everything', '$ git commit -am "fix"', '[main 4f0e404] fix', ' 69 files changed, 420 insertions(+), 1337 deletions(-)'],
  ['$ ./scan --deep ~/bags', 'scanning wallets (simulated)...', '{bar} 3 of 3 bags checked', 'bag #1: heavy', 'bag #2: heavier', 'bag #3: do not look', 'verdict: ngmi'],
  ['$ ping moon', 'PING moon (384.4 Mm): 56 data bytes', 'Request timeout for icmp_seq 0', 'Request timeout for icmp_seq 1', 'Request timeout for icmp_seq 2', '--- moon ping statistics ---', '3 packets transmitted, 0 received, 100% packet loss'],
  ['$ jarvis --status', 'jarvis v4.0.4 :: online', 'uptime: 404 days', 'tasks: 12 queued, 0 failed', 'gary: afk', 'mood: patient'],
  ['$ npm audit', 'found 3 vulnerabilities (1 low, 2 "it depends")', '$ npm audit fix --force', '{bar} rewriting history', 'fixed 3 vulnerabilities', 'introduced 7 new ones', 'jarvis: reverting.'],
  ['$ top -n 1', 'PID   USER   %CPU  COMMAND', '404   gary   99.0  chrome (127 tabs)', '405   gary   42.0  charts', '406   jarvis  3.1  build-watcher', '407   root    0.1  hope'],
  ['$ ssh gary@prod', 'Permission denied (publickey).', '$ ssh gary@prod --please', 'ssh: unknown option -- please', '$ sudo !!', 'gary is not in the sudoers file. This incident will be reported.'],
  ['$ make coffee', "make: *** No rule to make target 'coffee'.  Stop.", '$ make coffee --force', 'brewing...', '{bar} heating water', 'error: mug not found'],
  ['$ tail -f /var/log/life.log', '08:00 alarm snoozed', '08:09 alarm snoozed', '08:18 alarm snoozed', '09:41 gm', '10:02 checked charts', '10:03 regretted checking charts'],
]

const PALETTES: Record<string, { bg: string; fg: string; dim: string; glow: string; px: string[] }> = {
  amber: { bg: '#120a02', fg: '#ffb000', dim: '#9a6a08', glow: '#ffb000', px: PX.amber },
  green: { bg: '#020a04', fg: '#4cff7a', dim: '#1f8a3c', glow: '#4cff7a', px: PX.phosphor },
  white: { bg: '#0b0b0c', fg: '#e8e8e8', dim: '#8a8a90', glow: '#e8e8e8', px: PX.mono },
  blue: { bg: '#001a6b', fg: '#d9e4ff', dim: '#8ea6e8', glow: '#d9e4ff', px: ['#001a6b', '#1d3a9a', '#8ea6e8', '#d9e4ff'] },
}

interface Line {
  text: string
  typed: number
  bar: number
  isCmd: boolean
}

export function create(ctx: SceneContext) {
  return new Terminal404(ctx)
}

class Terminal404 extends PixelScene {
  lines: Line[] = []
  queue: string[] = []
  wait = 0.6
  fontPx = 20
  cols = 80
  rows = 24
  flick = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
    this.boot()
    fontsReady().then(() => this.layout())
  }
  boot() {
    this.queue.push('GARY-OS 4.04 (tty1)', 'last login: whenever', 'jarvis: watching the logs. gary: watching the ceiling.', '')
  }
  layout() {
    const target = Math.min(this.w, this.h) / 16
    this.fontPx = Math.round(target)
    const c = this.c
    c.font = `${this.fontPx}px ${this.fontFamily()}`
    const cw = c.measureText('M').width
    this.cols = Math.max(20, Math.floor((this.w * 0.9) / cw))
    this.rows = Math.max(8, Math.floor((this.h * 0.86) / (this.fontPx * 1.25)))
  }
  configure() {
    this.layout()
  }
  palette() {
    return (PALETTES[this.str('palette')] ?? PALETTES.amber).px
  }
  dither() {
    return 0
  }
  fontFamily() {
    return this.str('font') === 'plex' ? '"IBM Plex Mono", monospace' : '"VT323", monospace'
  }
  push(text: string) {
    const isCmd = text.startsWith('$ ')
    const bar = text.startsWith('{bar}') ? 0 : -1
    this.lines.push({ text: bar >= 0 ? text.slice(6) : text, typed: isCmd ? 0 : Infinity, bar, isCmd })
    while (this.lines.length > this.rows - 1) this.lines.shift()
  }
  step(dt: number) {
    const rate = this.num('rate')
    const last = this.lines[this.lines.length - 1]
    if (last && last.isCmd && last.typed < last.text.length) {
      last.typed += dt * this.r.range(10, 26) * rate
      return
    }
    if (last && last.bar >= 0 && last.bar < 1) {
      last.bar = Math.min(1, last.bar + dt * this.r.range(0.2, 0.7) * rate)
      return
    }
    this.wait -= dt * rate
    if (this.wait > 0) return
    if (!this.queue.length) {
      this.queue.push(...this.r.pick(SESSIONS), '')
    }
    const next = this.queue.shift()!
    this.push(next)
    this.wait = next.startsWith('$ ') ? 0.25 : next === '' ? this.r.range(1.2, 2.6) : this.r.range(0.08, 0.45)
    if (this.r.chance(0.02)) this.flick = 0.15
  }
  draw() {
    const c = this.c
    const p = PALETTES[this.str('palette')] ?? PALETTES.amber
    const crt = this.num('crt')
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.fillStyle = p.bg
    c.fillRect(0, 0, this.w, this.h)
    const lh = this.fontPx * 1.25
    const x0 = this.w * 0.05
    const y0 = this.h * 0.08 + this.fontPx
    c.font = `${this.fontPx}px ${this.fontFamily()}`
    c.textBaseline = 'alphabetic'
    c.textAlign = 'left'
    c.shadowColor = p.glow
    c.shadowBlur = crt * this.fontPx * 0.4 * this.g.intensity
    const cursorOn = Math.floor(this.t * 2) % 2 === 0
    this.lines.forEach((l, i) => {
      const y = y0 + i * lh
      let text = l.isCmd ? l.text.slice(0, Math.floor(l.typed)) : l.text
      if (l.bar >= 0) {
        const n = 24
        const k = Math.round(l.bar * n)
        text = `[${'#'.repeat(k)}${'.'.repeat(n - k)}] ${Math.round(l.bar * 100)}% ${l.bar >= 1 ? l.text : ''}`
      }
      if (text.length > this.cols) text = text.slice(0, this.cols - 1) + '…'
      if (l.isCmd) {
        c.shadowBlur = 0
        c.fillStyle = p.dim
        const prompt = 'gary@afk:~'
        c.fillText(prompt, x0, y)
        const pw = c.measureText(prompt).width
        c.fillStyle = p.fg
        c.shadowBlur = crt * this.fontPx * 0.4 * this.g.intensity
        c.fillText(text, x0 + pw, y)
        if (i === this.lines.length - 1 && cursorOn) c.fillRect(x0 + pw + c.measureText(text).width + 2, y - this.fontPx * 0.8, this.fontPx * 0.5, this.fontPx * 0.9)
      } else {
        const hot = l.text.startsWith('jarvis') || i === 0 || /error|denied|timeout|ngmi|vulnerab/i.test(text)
        c.fillStyle = hot ? p.fg : p.dim
        c.shadowBlur = hot ? crt * this.fontPx * 0.4 * this.g.intensity : 0
        c.fillText(text, x0, y)
      }
    })
    const last = this.lines[this.lines.length - 1]
    if ((!last || !last.isCmd) && cursorOn) {
      c.fillStyle = p.fg
      c.fillRect(x0, y0 + this.lines.length * lh - this.fontPx * 0.8, this.fontPx * 0.5, this.fontPx * 0.9)
    }
    c.shadowBlur = 0
    // CRT: scanlines, vignette, the odd flicker
    if (crt > 0) {
      c.fillStyle = `rgba(0,0,0,${0.3 * crt})`
      for (let y = 0; y < this.h; y += 2) c.fillRect(0, y, this.w, 1)
      const g = c.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, `rgba(0,0,0,${0.75 * crt})`)
      c.fillStyle = g
      c.fillRect(0, 0, this.w, this.h)
      if (this.flick > 0 && !this.g.noFlash && !this.g.reducedMotion) {
        c.fillStyle = `rgba(255,255,255,${this.flick * 0.15 * crt})`
        c.fillRect(0, 0, this.w, this.h)
      }
    }
    this.flick = Math.max(0, this.flick - 0.02)
  }
}
