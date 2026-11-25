import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

type Mist = { x: number; y: number; vx: number; vy: number; r: number; life: number }

export function create(ctx: SceneContext) {
  return new Waterfall(ctx)
}

/** A tall waterfall between mossy cliffs, falling into a pool with mist, a rainbow on sunny days, and birds. */
class Waterfall extends PixelScene {
  streaks: { x: number; y: number; v: number; l: number }[] = []
  mist: Mist[] = []
  birds: { x: number; y: number; v: number }[] = []
  ferns: { x: number; y: number; s: number; side: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.streaks = Array.from({ length: 160 }, () => ({ x: this.r(), y: this.r(), v: this.r.range(0.5, 1), l: this.r.range(0.04, 0.12) }))
    this.ferns = Array.from({ length: 14 }, () => ({ x: this.r(), y: this.r.range(0.15, 0.85), s: this.r.range(0.6, 1.3), side: this.r.chance(0.5) ? -1 : 1 }))
  }
  palette() {
    return PX.forest16
  }
  dither() {
    return 0.45
  }
  get fall() {
    const { w, h } = this
    const fw = Math.min(w * 0.22, h * 0.24)
    return { x: w / 2 - fw / 2, w: fw, top: h * 0.26, bottom: h * 0.74 }
  }
  step(dt: number) {
    const { w, h, u } = this
    const flow = this.num('flow')
    for (const s of this.streaks) {
      s.y += s.v * dt * 0.8 * flow
      if (s.y > 1) {
        s.y -= 1
        s.x = this.r()
      }
    }
    const F = this.fall
    const n = dt * 60 * flow * this.density
    for (let i = 0; i < n; i++)
      this.mist.push({ x: F.x + this.r() * F.w, y: F.bottom, vx: this.r.range(-25, 25) * u, vy: -this.r.range(5, 22) * u, r: this.r.range(3, 9) * u, life: 1 })
    for (const m of this.mist) {
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.vx *= Math.pow(0.5, dt)
      m.r += 6 * u * dt
      m.life -= dt * 0.55
    }
    this.mist = this.mist.filter((m) => m.life > 0)
    if (this.birds.length < 3 && this.r.chance(dt / 6)) this.birds.push({ x: -10, y: this.r.range(0.05, 0.25) * h, v: this.r.range(20, 40) * u })
    for (const b of this.birds) b.x += b.v * dt
    this.birds = this.birds.filter((b) => b.x < w + 20)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const F = this.fall
    const sunny = this.bool('rainbow')
    const sky = c.createLinearGradient(0, 0, 0, h * 0.5)
    sky.addColorStop(0, '#9ad1e8')
    sky.addColorStop(1, '#f0f4c8')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    // distant hills
    c.fillStyle = '#8fbb53'
    c.globalAlpha = 0.5
    c.beginPath()
    c.moveTo(0, h * 0.2)
    for (let x = 0; x <= w; x += 8 * u) c.lineTo(x, h * 0.17 + Math.sin(x / (30 * u)) * 5 * u)
    c.lineTo(w, h)
    c.lineTo(0, h)
    c.fill()
    c.globalAlpha = 1
    // cliffs left and right with the river cutting through at the top
    const cliff = (side: number) => {
      c.fillStyle = side < 0 ? '#6e4d33' : '#4a3222'
      c.beginPath()
      const edge = side < 0 ? F.x : F.x + F.w
      const outer = side < 0 ? 0 : w
      c.moveTo(outer, F.top - 6 * u)
      c.lineTo(edge, F.top)
      for (let y = F.top; y <= h; y += 6 * u) c.lineTo(edge + side * (Math.sin(y / (9 * u)) * 3 * u + ((y - F.top) / h) * 30 * u), y)
      c.lineTo(outer, h)
      c.fill()
      // rock strata
      c.strokeStyle = side < 0 ? '#4a3222' : '#2b1d14'
      c.lineWidth = Math.max(1, 0.8 * u)
      for (let y = F.top + 10 * u; y < h * 0.85; y += 14 * u) {
        c.beginPath()
        c.moveTo(outer, y + 6 * u)
        c.lineTo(edge + side * (6 * u + ((y - F.top) / h) * 30 * u), y)
        c.stroke()
      }
    }
    // moss and trees along the cliff tops
    const mossTop = () => {
      c.fillStyle = '#447a3c'
      c.fillRect(0, F.top - 10 * u, F.x, 8 * u)
      c.fillRect(F.x + F.w, F.top - 10 * u, w - F.x - F.w, 8 * u)
      c.fillStyle = '#2f5e35'
      for (let x = 4 * u; x < w; x += 14 * u) {
        if (x > F.x - 6 * u && x < F.x + F.w + 6 * u) continue
        const th = (10 + ((x * 7) % 9)) * u
        c.beginPath()
        c.moveTo(x - 5 * u, F.top - 8 * u)
        c.lineTo(x, F.top - 8 * u - th)
        c.lineTo(x + 5 * u, F.top - 8 * u)
        c.fill()
      }
    }
    // dark wet rock behind the falling water
    c.fillStyle = '#2b1d14'
    c.fillRect(F.x - 40 * this.u, F.top, F.w + 80 * this.u, h - F.top)
    // river above the fall
    c.fillStyle = '#9ad1e8'
    c.fillRect(F.x - 4 * u, F.top - 8 * u, F.w + 8 * u, 8 * u)
    cliff(-1)
    cliff(1)
    mossTop()
    // the falling water
    const wg = c.createLinearGradient(F.x, 0, F.x + F.w, 0)
    wg.addColorStop(0, '#9ad1e8')
    wg.addColorStop(0.5, '#f0f4c8')
    wg.addColorStop(1, '#9ad1e8')
    c.fillStyle = wg
    c.fillRect(F.x, F.top, F.w, F.bottom - F.top)
    c.fillStyle = '#ffffff'
    for (const s of this.streaks) {
      const y = F.top + s.y * (F.bottom - F.top)
      c.globalAlpha = 0.55
      c.fillRect(F.x + s.x * F.w, y, Math.max(1, 0.8 * u), s.l * (F.bottom - F.top))
    }
    c.globalAlpha = 1
    // lip of the fall
    c.fillStyle = '#ffffff'
    c.fillRect(F.x, F.top - 1 * u, F.w, 2 * u)
    // pool
    const pool = F.bottom
    c.fillStyle = '#5aa0c0'
    c.beginPath()
    c.ellipse(w / 2, pool + (h - pool) * 0.45, w * 0.48, (h - pool) * 0.6, 0, 0, TAU)
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.4)'
    c.lineWidth = Math.max(1, 0.6 * u)
    for (let i = 0; i < 5; i++) {
      const k = ((this.t * 0.3 + i / 5) % 1)
      c.globalAlpha = 1 - k
      c.beginPath()
      c.ellipse(w / 2, pool + 4 * u, F.w * (0.6 + k * 1.6), (h - pool) * (0.08 + k * 0.3), 0, 0, Math.PI)
      c.stroke()
    }
    c.globalAlpha = 1
    // rainbow in the mist
    if (sunny) {
      const cols = ['#ff6a6a', '#ffb36a', '#ffe96a', '#8fe36a', '#6ab8ff', '#a68cff']
      cols.forEach((col, i) => {
        c.strokeStyle = col
        c.globalAlpha = 0.22
        c.lineWidth = 2 * u
        c.beginPath()
        c.arc(w / 2 + F.w * 0.6, pool + 10 * u, F.w * 1.1 - i * 2 * u, Math.PI * 1.05, Math.PI * 1.65)
        c.stroke()
      })
      c.globalAlpha = 1
    }
    // mist
    for (const m of this.mist) {
      c.globalAlpha = m.life * 0.35
      c.fillStyle = '#ffffff'
      c.beginPath()
      c.arc(m.x, m.y, m.r, 0, TAU)
      c.fill()
    }
    c.globalAlpha = 1
    // ferns hanging on the cliffs
    for (const f of this.ferns) {
      const edge = f.side < 0 ? F.x - (f.x * F.x) : F.x + F.w + f.x * (w - F.x - F.w)
      const y = F.top + f.y * (h - F.top) * 0.8
      c.fillStyle = f.side < 0 ? '#8fbb53' : '#649a45'
      const sway = Math.sin(this.t + f.x * 10) * u
      for (let k = 0; k < 5; k++) {
        c.beginPath()
        c.ellipse(edge + sway, y + k * 2 * u * f.s, 5 * u * f.s, 1.4 * u * f.s, (k - 2) * 0.3, 0, TAU)
        c.fill()
      }
    }
    // birds
    c.strokeStyle = '#22452b'
    c.lineWidth = Math.max(1, 0.7 * u)
    for (const b of this.birds) {
      const f = Math.sin(this.t * 8 + b.x) * 2 * u
      c.beginPath()
      c.moveTo(b.x - 4 * u, b.y - f)
      c.lineTo(b.x, b.y)
      c.lineTo(b.x + 4 * u, b.y - f)
      c.stroke()
    }
  }
}
