import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

type Stone = { x: number; y: number; r: number; rot: number }

export function create(ctx: SceneContext) {
  return new ZenGarden(ctx)
}

/**
 * A raked sand garden seen from above. A rake draws parallel lines that bend into rings around
 * the stones; when the garden is complete, the wind smooths it and the raking starts again.
 */
class ZenGarden extends PixelScene {
  stones: Stone[] = []
  sand!: HTMLCanvasElement
  sc!: CanvasRenderingContext2D
  rows = 0
  row = 0
  pos = 0
  done = 0
  leaves: { x: number; y: number; a: number; v: number }[] = []
  seed = 1
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.3
  }
  layout() {
    const { w, h, u } = this
    if (!w) return
    const R = rng(this.seed * 31)
    const n = 3 + Math.floor(R() * 2)
    this.stones = []
    for (let i = 0; i < n; i++) {
      let s: Stone
      let tries = 0
      do {
        s = { x: R.range(0.15, 0.85) * w, y: R.range(0.18, 0.82) * h, r: R.range(8, 16) * u, rot: R() * TAU }
        tries++
      } while (tries < 40 && this.stones.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < (o.r + s.r) * 3.4))
      this.stones.push(s)
    }
    this.sand = document.createElement('canvas')
    this.sand.width = w
    this.sand.height = h
    this.sc = this.sand.getContext('2d')!
    this.smooth()
    this.rows = Math.ceil(h / (10 * u))
    this.row = 0
    this.pos = 0
    this.done = 0
    if (this.seed === 1) {
      // the first garden is already raked; the next ones are raked live
      for (let r = 0; r < this.rows; r++) this.rakeRow(r, 0, w)
      this.done = 0.001
    }
  }
  /** One pass of the rake: four tines, each a groove with a light ridge beside it. */
  rakeRow(row: number, from: number, to: number) {
    const sc = this.sc
    const u = this.u
    const w = this.w
    const dir = row % 2 ? -1 : 1
    sc.lineCap = 'round'
    for (let tine = 0; tine < 4; tine++) {
      const y0 = row * 10 * u + (tine + 0.5) * 2.5 * u
      for (const [col, off, lw] of [
        ['rgba(140,110,70,0.5)', 0.5, 1.4],
        ['rgba(255,255,255,0.55)', -0.6, 0.9],
      ] as const) {
        sc.strokeStyle = col
        sc.lineWidth = Math.max(1, lw * u * 0.5)
        sc.beginPath()
        let first = true
        for (let p = from; p <= to; p += 2 * u) {
          const x = dir > 0 ? p : w - p
          const y = this.groove(x, y0) + off * u * 0.5
          if (first) sc.moveTo(x, y)
          else sc.lineTo(x, y)
          first = false
        }
        sc.stroke()
      }
    }
  }
  smooth() {
    const sc = this.sc
    sc.fillStyle = '#e9dcc0'
    sc.fillRect(0, 0, this.w, this.h)
    const R = rng(7)
    for (let i = 0; i < (this.w * this.h) / 40; i++) {
      sc.fillStyle = R.chance(0.5) ? 'rgba(160,130,90,0.15)' : 'rgba(255,255,255,0.25)'
      sc.fillRect(R() * this.w, R() * this.h, 1, 1)
    }
  }
  /** Where the groove passes: straight rows, bent into rings near each stone. */
  groove(x: number, y0: number) {
    let y = y0
    for (const s of this.stones) {
      const dx = x - s.x
      const dy = y0 - s.y
      const d = Math.hypot(dx, dy)
      const ring = s.r * 3
      if (d < ring && d > 0) {
        // push the line out onto the nearest ring around the stone
        const k = Math.round(d / (5 * this.u)) * 5 * this.u
        const rr = Math.max(s.r * 1.4, k)
        const ang = Math.atan2(dy, dx)
        y = s.y + Math.sin(ang) * rr
      }
    }
    return y
  }
  step(dt: number) {
    const { w, h, u } = this
    for (const l of this.leaves) {
      l.y += l.v * dt
      l.x += Math.sin(this.t + l.a) * dt * 6 * u
      l.a += dt
    }
    this.leaves = this.leaves.filter((l) => l.y < h + 10)
    if (this.r.chance(dt * 0.15)) this.leaves.push({ x: this.r() * w, y: -5, a: this.r() * TAU, v: this.r.range(5, 12) * u })
    if (this.done > 0) {
      this.done += dt
      if (this.done > 8) {
        this.seed++
        this.layout()
      }
      return
    }
    // rake a stretch of the current row
    const from = this.pos
    this.pos = Math.min(w, this.pos + 160 * u * this.num('speed') * dt)
    this.rakeRow(this.row, from, this.pos)
    if (this.pos >= w) {
      this.pos = 0
      this.row++
      if (this.row >= this.rows) this.done = 0.001
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.drawImage(this.sand, 0, 0)
    // moss collars and stones
    for (const s of this.stones) {
      c.fillStyle = '#4c6b47'
      c.beginPath()
      c.ellipse(s.x, s.y, s.r * 1.35, s.r * 1.2, s.rot, 0, TAU)
      c.fill()
      c.fillStyle = 'rgba(0,0,0,0.25)'
      c.beginPath()
      c.ellipse(s.x + s.r * 0.2, s.y + s.r * 0.25, s.r, s.r * 0.85, s.rot, 0, TAU)
      c.fill()
      c.fillStyle = '#5c5a66'
      c.beginPath()
      c.ellipse(s.x, s.y, s.r, s.r * 0.82, s.rot, 0, TAU)
      c.fill()
      c.fillStyle = '#8a8896'
      c.beginPath()
      c.ellipse(s.x - s.r * 0.25, s.y - s.r * 0.25, s.r * 0.5, s.r * 0.35, s.rot, 0, TAU)
      c.fill()
    }
    // the rake, at the end of the line being drawn
    if (!this.done) {
      const y0 = (this.row + 0.5) * 10 * u
      const dir = this.row % 2 ? -1 : 1
      const x = dir > 0 ? this.pos : w - this.pos
      const y = this.groove(x, y0)
      c.fillStyle = '#7a5230'
      c.fillRect(x - 1 * u, y - 14 * u, 2 * u, 14 * u)
      c.fillRect(x - 1 * u, y - 6 * u, 2 * u, 12 * u)
    }
    // falling maple leaves, and a wooden border
    for (const l of this.leaves) {
      c.fillStyle = '#c8402e'
      c.save()
      c.translate(l.x, l.y)
      c.rotate(l.a)
      c.beginPath()
      c.ellipse(0, 0, 2.6 * u, 1.4 * u, 0, 0, TAU)
      c.fill()
      c.restore()
    }
    c.strokeStyle = '#5c4434'
    c.lineWidth = 4 * u
    c.strokeRect(2 * u, 2 * u, w - 4 * u, h - 4 * u)
  }
}
