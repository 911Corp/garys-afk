import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, font, frameRect, glow, rr } from '../kit'

const STAGES = ['lint', 'test', 'build', 'deploy']
const LOGS: Record<string, string[]> = {
  lint: ['oxlint src', '0 warnings, 0 errors', 'jarvis: looks clean'],
  test: ['vitest run', '✓ wallet.test.ts (12)', '✓ rug-check.test.ts (31)', '✓ vibes.test.ts (1)'],
  build: ['vite build', 'transforming 1337 modules', 'dist/ 412 kB gzip', 'jarvis: bundle ok'],
  deploy: ['uploading artifact', 'waiting for prod', 'health check ...'],
}
const FAIL = ['✗ prod: 502 Bad Gateway', 'works on my machine', 'rolling back ...', 'jarvis: retrying']
const OK = ['✓ deployed to prod', 'jarvis: shipped it', 'have a nice weekend']

export function create(ctx: SceneContext) {
  return new FridayDeploy(ctx)
}

/** Friday, 16:59. A CI pipeline runs stage by stage on a big monitor. Sometimes prod says no. */
class FridayDeploy extends PixelScene {
  stage = 0
  prog = 0
  state: 'run' | 'fail' | 'ok' = 'run'
  hold = 0
  log: { s: string; col: string }[] = []
  pending: string[] = []
  typeT = 0
  minute = 59
  hour = 16
  steam = Array.from({ length: 6 }, (_, i) => i / 6)
  constructor(ctx: SceneContext) {
    super(ctx)
    this.reset()
  }
  palette() {
    return PX.degen
  }
  dither() {
    return 0.35
  }
  reset() {
    this.stage = 0
    this.prog = 0
    this.state = 'run'
    this.log = [{ s: '$ git push origin main --force-with-lease', col: '#c4cee0' }]
    this.pending = [...LOGS.lint]
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.typeT += dt * sp
    while (this.typeT > 0.55 && this.pending.length) {
      this.typeT -= 0.55
      const s = this.pending.shift()!
      this.log.push({ s, col: s.startsWith('✗') ? '#ff4d64' : s.startsWith('✓') ? '#3ef07f' : s.startsWith('jarvis') ? '#a77bff' : '#6b7a99' })
      if (this.log.length > 40) this.log.shift()
    }
    if (this.state === 'run') {
      this.prog += dt * sp * (0.22 + 0.1 * Math.sin(this.stage * 3.1))
      if (this.prog >= 1) {
        this.prog = 0
        if (this.stage === STAGES.length - 1) {
          const fail = this.r.chance(this.num('fail'))
          this.state = fail ? 'fail' : 'ok'
          this.pending.push(...(fail ? FAIL : OK))
          this.hold = 7
          if (!fail) this.emit({ type: 'chime' })
        } else {
          this.stage++
          this.pending.push(...LOGS[STAGES[this.stage]])
        }
      }
    } else {
      this.hold -= dt * sp
      if (this.hold <= 0) {
        if (this.state === 'fail') {
          // retry from the deploy stage
          this.state = 'run'
          this.prog = 0
          this.pending.push(...LOGS.deploy)
        } else {
          this.minute++
          if (this.minute >= 60) {
            this.minute = 0
            this.hour = this.hour >= 23 ? 16 : this.hour + 1
          }
          this.reset()
        }
      }
    }
    for (let i = 0; i < this.steam.length; i++) this.steam[i] = (this.steam[i] + dt * 0.25) % 1
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0d1117'
    c.fillRect(0, 0, w, h)
    // wall with a faint vertical panel rhythm
    c.fillStyle = '#111722'
    for (let x = 0; x < w; x += 40 * u) c.fillRect(x, 0, 1 * u, h * 0.78)
    // desk
    const deskY = h * 0.8
    c.fillStyle = '#161b26'
    c.fillRect(0, deskY, w, h - deskY)
    c.fillStyle = '#232c3d'
    c.fillRect(0, deskY, w, 1.5 * u)
    // monitor
    const f = frameRect(w, h * 0.8, u, 16 / 9, 12)
    const mx = f.x
    const my = f.y
    const red = this.state === 'fail'
    glow(c, mx + f.w / 2, my + f.h / 2, f.w * 0.7, red ? 'rgba(184,38,59,0.35)' : 'rgba(62,240,127,0.12)')
    c.fillStyle = '#05070b'
    rr(c, mx - 3 * u, my - 3 * u, f.w + 6 * u, f.h + 6 * u, 5 * u)
    c.fill()
    c.fillStyle = '#232c3d'
    c.fillRect(mx + f.w / 2 - 6 * u, my + f.h + 3 * u, 12 * u, deskY - my - f.h - 3 * u)
    c.fillRect(mx + f.w / 2 - 22 * u, deskY - 2 * u, 44 * u, 2 * u)
    c.fillStyle = '#0b0f16'
    rr(c, mx, my, f.w, f.h, 3 * u)
    c.fill()
    // screen content
    const pad = Math.max(6 * u, f.w * 0.04)
    const px = mx + pad
    const pw = f.w - pad * 2
    const fs = Math.max(7, Math.min(f.h * 0.055, 9 * u))
    font(c, fs, MONO, 500)
    c.fillStyle = '#c4cee0'
    c.textBaseline = 'top'
    c.fillText('pipeline #' + (4000 + this.hour * 60 + this.minute) + '  ·  main  ·  FRI ' + this.hour + ':' + String(this.minute).padStart(2, '0'), px, my + pad * 0.7)
    // stages row
    const sy = my + pad * 0.7 + fs * 2
    const gap = pw * 0.04
    const bw = (pw - gap * 3) / 4
    const bh = fs * 3
    STAGES.forEach((name, i) => {
      const x = px + i * (bw + gap)
      let col = '#232c3d'
      let ink = '#6b7a99'
      let p = 0
      if (i < this.stage || (i === this.stage && this.state === 'ok')) {
        col = '#0e3b22'
        ink = '#3ef07f'
        p = 1
      } else if (i === this.stage) {
        if (this.state === 'fail') {
          col = '#5a1520'
          ink = '#ff4d64'
          p = 1
        } else {
          col = '#161b26'
          ink = '#ffc83d'
          p = this.prog
        }
      }
      c.fillStyle = col
      rr(c, x, sy, bw, bh, 2 * u)
      c.fill()
      c.strokeStyle = ink
      c.lineWidth = Math.max(1, 0.6 * u)
      c.stroke()
      if (i === this.stage && this.state === 'run') {
        c.fillStyle = 'rgba(255,200,61,0.18)'
        c.fillRect(x, sy, bw * p, bh)
      }
      c.fillStyle = ink
      const mark = p >= 1 ? (ink === '#ff4d64' ? '✗ ' : '✓ ') : i === this.stage ? '◌ ' : '· '
      c.fillText(mark + name, x + fs * 0.6, sy + fs)
      if (i < 3) {
        c.fillStyle = '#3a4760'
        c.fillRect(x + bw, sy + bh / 2, gap, Math.max(1, 0.5 * u))
      }
    })
    // log
    const ly = sy + bh + fs * 1.4
    const lines = Math.max(1, Math.floor((my + f.h - pad * 0.6 - ly) / (fs * 1.35)))
    const shown = this.log.slice(-lines)
    shown.forEach((l, i) => {
      c.fillStyle = l.col
      c.fillText(l.s, px, ly + i * fs * 1.35)
    })
    if (Math.sin(this.t * 6) > 0) {
      c.fillStyle = '#c4cee0'
      c.fillRect(px, ly + shown.length * fs * 1.35, fs * 0.55, fs)
    }
    // wall clock
    const cx = w - Math.max(24 * u, w * 0.08)
    const cy = Math.max(18 * u, f.y * 0.5)
    const cr = Math.min(12 * u, Math.max(8 * u, f.y * 0.4))
    if (f.y > 20 * u) this.clock(cx, cy, cr)
    else if (f.x > 30 * u) this.clock(f.x / 2, h * 0.25, Math.min(12 * u, f.x * 0.3))
    // sticky note on the bezel
    c.save()
    c.translate(mx + f.w - 4 * u, my + f.h - 14 * u)
    c.rotate(-0.08)
    c.fillStyle = '#ffc83d'
    c.fillRect(-24 * u, 0, 26 * u, 20 * u)
    c.fillStyle = '#232c3d'
    font(c, 3.6 * u, MONO, 500)
    c.fillText("DON'T", -21 * u, 4 * u)
    c.fillText('DEPLOY', -21 * u, 8.5 * u)
    c.fillText('ON FRI', -21 * u, 13 * u)
    c.restore()
    // mug with steam
    const gx = Math.max(6 * u, mx - 18 * u)
    const gy = deskY - 12 * u + 6 * u
    c.fillStyle = '#c4cee0'
    rr(c, gx, gy, 10 * u, 12 * u, 1.5 * u)
    c.fill()
    c.strokeStyle = '#c4cee0'
    c.lineWidth = 1.6 * u
    c.beginPath()
    c.arc(gx + 11 * u, gy + 5 * u, 3 * u, -1.2, 1.2)
    c.stroke()
    c.strokeStyle = 'rgba(196,206,224,0.35)'
    c.lineWidth = 1 * u
    for (const s of this.steam) {
      c.globalAlpha = Math.sin(s * Math.PI) * 0.8
      c.beginPath()
      c.moveTo(gx + 5 * u + Math.sin(s * 9) * 2 * u, gy - s * 16 * u)
      c.lineTo(gx + 5 * u + Math.sin(s * 9 + 1) * 2 * u, gy - s * 16 * u - 3 * u)
      c.stroke()
    }
    c.globalAlpha = 1
    // keyboard
    c.fillStyle = '#232c3d'
    rr(c, w / 2 - 34 * u, deskY + 5 * u, 68 * u, 9 * u, 1.5 * u)
    c.fill()
    c.fillStyle = '#3a4760'
    for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) c.fillRect(w / 2 - 32 * u + k * 4.6 * u, deskY + 6.5 * u + r * 2.4 * u, 3.6 * u, 1.6 * u)
  }
  clock(x: number, y: number, r: number) {
    const c = this.c
    c.fillStyle = '#c4cee0'
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.fill()
    c.fillStyle = '#0d1117'
    c.beginPath()
    c.arc(x, y, r * 0.86, 0, TAU)
    c.fill()
    c.strokeStyle = '#c4cee0'
    c.lineCap = 'round'
    const mA = ((this.minute + (this.state === 'run' ? this.prog * 0.2 : 0)) / 60) * TAU - Math.PI / 2
    const hA = (((this.hour % 12) + this.minute / 60) / 12) * TAU - Math.PI / 2
    c.lineWidth = r * 0.12
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + Math.cos(hA) * r * 0.45, y + Math.sin(hA) * r * 0.45)
    c.stroke()
    c.lineWidth = r * 0.08
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + Math.cos(mA) * r * 0.7, y + Math.sin(mA) * r * 0.7)
    c.stroke()
    c.strokeStyle = '#ff4d64'
    c.lineWidth = r * 0.04
    const sA = (this.t % 60) / 60 * TAU - Math.PI / 2
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + Math.cos(sA) * r * 0.75, y + Math.sin(sA) * r * 0.75)
    c.stroke()
    c.lineCap = 'butt'
  }
}
