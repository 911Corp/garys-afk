import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, clamp } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, TOKENS, font, rr } from '../kit'

const ZONES = [
  { name: 'Pure', col: '#3ef07f' },
  { name: 'Mid', col: '#b8d97a' },
  { name: 'Sus', col: '#ffc83d' },
  { name: 'Cursed', col: '#ff9a3d' },
  { name: 'SCAM', col: '#ff4d64' },
]
const CHECKS = ['mint authority', 'freeze authority', 'liquidity locked', 'top 10 holders', 'dev wallet', 'socials', 'vibes']

export function create(ctx: SceneContext) {
  return new PurityScanner(ctx)
}

/** The Purity-o-Meter dial scans fictional tokens: the needle hunts, settles, and gives a verdict. */
class PurityScanner extends PixelScene {
  tok = ''
  target = 0.5
  needle = 0.5
  vel = 0
  phase: 'scan' | 'verdict' = 'scan'
  timer = 0
  checks: boolean[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.next()
  }
  palette() {
    return PX.degen
  }
  dither() {
    return 0.3
  }
  next() {
    const prev = this.tok
    while (this.tok === prev) this.tok = this.r.pick(TOKENS)
    this.target = clamp(this.r() ** 0.8, 0.04, 0.96)
    this.phase = 'scan'
    this.timer = 0
    const zone = Math.floor(this.target * 5)
    this.checks = CHECKS.map((_, i) => this.r() > zone * 0.18 + (i === 6 ? -0.3 : 0))
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.timer += dt * sp
    let goal = this.target
    if (this.phase === 'scan') {
      goal = 0.5 + Math.sin(this.timer * 3.1) * 0.42 * Math.max(0, 1 - this.timer / 5) + (this.target - 0.5) * Math.min(1, this.timer / 5)
      if (this.timer > 5.5) {
        this.phase = 'verdict'
        this.timer = 0
        this.emit({ type: Math.floor(this.target * 5) >= 4 ? 'blip' : 'chime' })
      }
    } else if (this.timer > 6) this.next()
    // springy needle
    this.vel += (goal - this.needle) * dt * 30
    this.vel *= Math.pow(0.02, dt)
    this.needle = clamp(this.needle + this.vel * dt, 0, 1)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0d1117'
    c.fillRect(0, 0, w, h)
    const portrait = h > w
    const R = Math.min(w * 0.4, h * (portrait ? 0.3 : 0.36))
    const cx = w / 2
    const cy = portrait ? h * 0.42 : h * 0.6
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    font(c, Math.max(8, R * 0.075), MONO, 600)
    c.fillStyle = '#6b7a99'
    c.fillText('PURITY-O-METER', cx, cy - R * 1.48)
    font(c, Math.max(10, R * 0.14), MONO, 600)
    c.fillStyle = '#ffffff'
    c.fillText(this.tok, cx, cy - R * 1.32)
    // dial zones
    const lw = R * 0.16
    ZONES.forEach((z, i) => {
      const a0 = Math.PI + (i / 5) * Math.PI
      const a1 = Math.PI + ((i + 1) / 5) * Math.PI
      c.strokeStyle = z.col
      c.globalAlpha = this.phase === 'verdict' && Math.floor(this.target * 5) !== i ? 0.25 : 0.9
      c.lineWidth = lw
      c.beginPath()
      c.arc(cx, cy, R, a0 + 0.015, a1 - 0.015)
      c.stroke()
      c.globalAlpha = 1
      const am = (a0 + a1) / 2
      font(c, Math.max(7, R * 0.065), MONO, 600)
      c.fillStyle = z.col
      c.fillText(z.name, cx + Math.cos(am) * R * 0.74, cy + Math.sin(am) * R * 0.74)
    })
    // ticks
    c.strokeStyle = '#3a4760'
    c.lineWidth = Math.max(1, R * 0.008)
    for (let i = 0; i <= 50; i++) {
      const a = Math.PI + (i / 50) * Math.PI
      const l = i % 5 ? 0.04 : 0.08
      c.beginPath()
      c.moveTo(cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * 1.12)
      c.lineTo(cx + Math.cos(a) * R * (1.12 + l), cy + Math.sin(a) * R * (1.12 + l))
      c.stroke()
    }
    // needle
    const na = Math.PI + this.needle * Math.PI
    c.strokeStyle = '#ffffff'
    c.lineWidth = Math.max(2, R * 0.025)
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(cx - Math.cos(na) * R * 0.1, cy - Math.sin(na) * R * 0.1)
    c.lineTo(cx + Math.cos(na) * R * 0.95, cy + Math.sin(na) * R * 0.95)
    c.stroke()
    c.lineCap = 'butt'
    c.fillStyle = '#c4cee0'
    c.beginPath()
    c.arc(cx, cy, R * 0.06, 0, TAU)
    c.fill()
    // status / verdict
    const zi = clamp(Math.floor(this.target * 5), 0, 4)
    if (this.phase === 'scan') {
      font(c, Math.max(8, R * 0.07), MONO, 500)
      c.fillStyle = '#ffc83d'
      const dots = '.'.repeat(1 + (Math.floor(this.t * 3) % 3))
      c.fillText('scanning' + dots, cx, cy + R * 0.25)
    } else {
      const z = ZONES[zi]
      const bw = R * 0.9
      const bh = R * 0.24
      c.fillStyle = z.col + '22'
      rr(c, cx - bw / 2, cy + R * 0.14, bw, bh, bh * 0.25)
      c.fill()
      c.strokeStyle = z.col
      c.lineWidth = Math.max(1, R * 0.01)
      c.stroke()
      font(c, Math.max(10, R * 0.12), MONO, 700)
      c.fillStyle = z.col
      c.fillText(z.name.toUpperCase(), cx, cy + R * 0.14 + bh / 2)
    }
    // checklist
    const fs = Math.max(7, Math.min(R * 0.06, 8 * u))
    font(c, fs, MONO, 400)
    const cols = portrait ? 1 : 2
    const per = Math.ceil(CHECKS.length / cols)
    const colW = Math.min(w * 0.4, fs * 22)
    const startY = cy + R * (portrait ? 0.55 : 0.5)
    CHECKS.forEach((name, i) => {
      const col = Math.floor(i / per)
      const row = i % per
      const x = cx + (col - (cols - 1) / 2) * colW
      const y = startY + row * fs * 1.6
      if (y > h - fs) return
      const revealed = this.phase === 'verdict' || this.timer > (i + 1) * 0.7
      c.fillStyle = !revealed ? '#3a4760' : this.checks[i] ? '#3ef07f' : '#ff4d64'
      c.fillText((revealed ? (this.checks[i] ? '✓ ' : '✗ ') : '· ') + name, x, y)
    })
    font(c, Math.max(7, fs * 0.85), MONO, 400)
    c.fillStyle = '#3a4760'
    c.fillText('Fictional tokens. Not financial advice. Neither is Gary.', cx, h - fs * 1.2)
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
}
