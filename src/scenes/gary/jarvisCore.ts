import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, font, glow } from '../kit'

const THOUGHTS = [
  'reading 214 files',
  'refactoring wallet.ts',
  'tests: 128 passed',
  'gary is asleep. lowering fan speed',
  'scanning repo for abandoned branches',
  'suggestion: rename final_final_v3.ts',
  'rug check: no red flags',
  'drafting changelog',
  'cache warmed',
  'ship it? waiting for gary',
  'compressing thumbnails',
  'npm audit: 0 vulnerabilities',
  'indexing free stack',
  'watching the mempool, quietly',
  'context window: comfy',
]
const THEMES: Record<string, { core: string; ring: string; dim: string; bg: string }> = {
  cyan: { core: '#9af5ff', ring: '#22e1ff', dim: '#123448', bg: '#05080f' },
  mint: { core: '#c8ffd6', ring: '#3ef07f', dim: '#0e3b22', bg: '#040a07' },
  amber: { core: '#ffe9a3', ring: '#ffb000', dim: '#4a2a04', bg: '#0b0703' },
}

export function create(ctx: SceneContext) {
  return new JarvisCore(ctx)
}

/** Jarvis, Gary's assistant, thinking: rotating rings, a breathing core and a stream of thoughts. */
class JarvisCore extends PixelScene {
  thoughts: { s: string; age: number }[] = []
  typing = ''
  target = ''
  typeT = 0
  bars = new Float32Array(64)
  constructor(ctx: SceneContext) {
    super(ctx)
    this.next()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.3
  }
  get T() {
    return THEMES[this.str('color')] ?? THEMES.cyan
  }
  next() {
    let t = this.r.pick(THOUGHTS)
    while (t === this.target) t = this.r.pick(THOUGHTS)
    this.target = t
    this.typing = ''
  }
  step(dt: number) {
    const act = this.num('activity')
    this.typeT += dt * act
    if (this.typing.length < this.target.length) {
      while (this.typeT > 0.05 && this.typing.length < this.target.length) {
        this.typeT -= 0.05
        this.typing = this.target.slice(0, this.typing.length + 1)
      }
    } else if (this.typeT > 2.2) {
      this.typeT = 0
      this.thoughts.push({ s: this.target, age: 0 })
      if (this.thoughts.length > 6) this.thoughts.shift()
      this.next()
    }
    for (const t of this.thoughts) t.age += dt
    const talking = this.typing.length < this.target.length ? 1 : 0.25
    for (let i = 0; i < this.bars.length; i++) {
      const want = talking * (0.3 + 0.7 * Math.abs(Math.sin(this.t * (3 + (i % 7)) + i * 1.7)))
      this.bars[i] += (want - this.bars[i]) * Math.min(1, dt * 8)
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const T = this.T
    c.fillStyle = T.bg
    c.fillRect(0, 0, w, h)
    // faint grid
    c.strokeStyle = T.dim
    c.globalAlpha = 0.35
    c.lineWidth = 1
    const gs = 16 * u
    for (let x = (w / 2) % gs; x < w; x += gs) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x, h)
      c.stroke()
    }
    for (let y = (h / 2) % gs; y < h; y += gs) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(w, y)
      c.stroke()
    }
    c.globalAlpha = 1
    const portrait = h > w
    const cx = w / 2
    const cy = portrait ? h * 0.38 : h * 0.44
    const R = Math.min(w, h) * (portrait ? 0.34 : 0.3)
    const act = this.num('activity')
    const breathe = 1 + Math.sin(this.t * 1.6) * 0.05
    glow(c, cx, cy, R * 1.6, T.ring + '44')
    // waveform ring
    c.fillStyle = T.ring
    for (let i = 0; i < this.bars.length; i++) {
      const a = (i / this.bars.length) * TAU - Math.PI / 2
      const len = R * 0.08 + this.bars[i] * R * 0.18
      c.save()
      c.translate(cx + Math.cos(a) * R * 1.05, cy + Math.sin(a) * R * 1.05)
      c.rotate(a)
      c.globalAlpha = 0.75
      c.fillRect(0, -R * 0.012, len, R * 0.024)
      c.restore()
    }
    c.globalAlpha = 1
    // rotating rings
    const rings = [
      { r: 0.92, w: 0.02, speed: 0.15, dash: [0.6, 0.15], alpha: 0.9 },
      { r: 0.8, w: 0.05, speed: -0.3, dash: [0.12, 0.08], alpha: 0.6 },
      { r: 0.66, w: 0.012, speed: 0.6, dash: [1.4, 0.4], alpha: 0.9 },
      { r: 0.55, w: 0.03, speed: -0.9, dash: [0.05, 0.05], alpha: 0.5 },
    ]
    c.strokeStyle = T.ring
    for (const rg of rings) {
      c.lineWidth = R * rg.w
      c.globalAlpha = rg.alpha
      c.setLineDash(rg.dash.map((d) => d * R))
      c.lineDashOffset = -this.t * rg.speed * act * R
      c.beginPath()
      c.arc(cx, cy, R * rg.r, 0, TAU)
      c.stroke()
    }
    c.setLineDash([])
    c.globalAlpha = 1
    // ticks
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU + this.t * 0.05
      const r1 = R * 0.97
      const r2 = R * (i % 5 ? 1.0 : 1.03)
      c.strokeStyle = T.ring
      c.lineWidth = Math.max(1, R * 0.006)
      c.beginPath()
      c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
      c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
      c.stroke()
    }
    // orbiting sparks
    for (let i = 0; i < 3; i++) {
      const a = this.t * (0.7 + i * 0.35) * act + i * 2.1
      const rr = R * (0.66 + i * 0.13)
      glow(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, R * 0.07, T.core)
    }
    // core
    glow(c, cx, cy, R * 0.55 * breathe, T.ring + 'aa')
    c.fillStyle = T.core
    c.beginPath()
    c.arc(cx, cy, R * 0.22 * breathe, 0, TAU)
    c.fill()
    c.fillStyle = T.bg
    font(c, R * 0.11, MONO, 600)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('J', cx, cy + R * 0.005)
    // labels
    font(c, Math.max(7, R * 0.07), MONO, 500)
    c.fillStyle = T.ring
    c.fillText('JARVIS', cx, cy - R * 1.32)
    c.globalAlpha = 0.6
    font(c, Math.max(6, R * 0.05), MONO, 400)
    c.fillText(this.typing.length < this.target.length ? 'thinking' : 'idle', cx, cy - R * 1.2)
    c.globalAlpha = 1
    // thought stream
    const fs = Math.max(7, Math.min(R * 0.075, 8 * u))
    font(c, fs, MONO, 400)
    const ty = portrait ? cy + R * 1.45 : cy + R * 1.32
    const lines = [...this.thoughts.map((t) => t.s), this.typing + (Math.sin(this.t * 8) > 0 ? '▍' : ' ')]
    const show = lines.slice(portrait ? -6 : -3)
    show.forEach((s, i) => {
      c.globalAlpha = 0.25 + 0.75 * ((i + 1) / show.length)
      c.fillStyle = i === show.length - 1 ? T.core : T.ring
      c.fillText('> ' + s, cx, ty + i * fs * 1.5)
    })
    c.globalAlpha = 1
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
}
