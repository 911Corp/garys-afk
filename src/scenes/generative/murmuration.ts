import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

type Bird = { x: number; y: number; vx: number; vy: number }

export function create(ctx: SceneContext) {
  return new Murmuration(ctx)
}

/** A starling murmuration at dusk: hundreds of birds following three simple rules, folding into one shape. */
class Murmuration extends PixelScene {
  birds: Bird[] = []
  grid = new Map<number, number[]>()
  target = { x: 0.5, y: 0.4 }
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.4
  }
  configure() {
    const n = Math.round(600 * this.num('birds') * this.density)
    while (this.birds.length < n) {
      const a = this.r() * Math.PI * 2
      this.birds.push({ x: 0.5 + this.r.range(-0.1, 0.1), y: 0.4 + this.r.range(-0.08, 0.08), vx: Math.cos(a) * 0.1, vy: Math.sin(a) * 0.1 })
    }
    this.birds.length = n
  }
  step(dt: number) {
    dt = Math.min(dt, 0.05)
    const sp = this.num('speed')
    const asp = this.w / this.h
    // wandering attractor keeps the flock on screen and turning
    this.target.x = 0.5 + Math.sin(this.t * 0.13) * 0.28 + Math.sin(this.t * 0.31) * 0.08
    this.target.y = 0.38 + Math.sin(this.t * 0.17 + 1) * 0.14
    const cell = 0.06
    const grid = this.grid
    grid.clear()
    this.birds.forEach((b, i) => {
      const key = Math.floor(b.x / cell) * 1000 + Math.floor(b.y / cell)
      let arr = grid.get(key)
      if (!arr) grid.set(key, (arr = []))
      arr.push(i)
    })
    const R2 = 0.06 * 0.06
    const S2 = 0.012 * 0.012
    for (const b of this.birds) {
      let ax = 0
      let ay = 0
      let cx = 0
      let cy = 0
      let sx = 0
      let sy = 0
      let n = 0
      const gx = Math.floor(b.x / cell)
      const gy = Math.floor(b.y / cell)
      for (let ix = -1; ix <= 1; ix++)
        for (let iy = -1; iy <= 1; iy++) {
          const arr = grid.get((gx + ix) * 1000 + gy + iy)
          if (!arr) continue
          for (const j of arr) {
            const o = this.birds[j]
            if (o === b) continue
            const dx = (o.x - b.x) * asp
            const dy = o.y - b.y
            const d2 = dx * dx + dy * dy
            if (d2 > R2) continue
            n++
            ax += o.vx
            ay += o.vy
            cx += o.x
            cy += o.y
            if (d2 < S2) {
              sx -= dx / (d2 + 1e-5)
              sy -= dy / (d2 + 1e-5)
            }
          }
          if (n > 14) break
        }
      let fx = 0
      let fy = 0
      if (n) {
        fx += (ax / n - b.vx) * 1.4 + (cx / n - b.x) * 1.2 + sx * 0.00006
        fy += (ay / n - b.vy) * 1.4 + (cy / n - b.y) * 1.2 + sy * 0.00006
      }
      fx += (this.target.x - b.x) * 0.6
      fy += (this.target.y - b.y) * 0.6
      b.vx += fx * dt
      b.vy += fy * dt
      const v = Math.hypot(b.vx, b.vy)
      const vmax = 0.16
      const vmin = 0.08
      if (v > vmax) {
        b.vx *= vmax / v
        b.vy *= vmax / v
      } else if (v < vmin) {
        b.vx *= vmin / (v || 1)
        b.vy *= vmin / (v || 1)
      }
      b.x += b.vx * dt * sp
      b.y += b.vy * dt * sp
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const sky = c.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#24407a')
    sky.addColorStop(0.55, '#a3487a')
    sky.addColorStop(0.85, '#ff8a5c')
    sky.addColorStop(1, '#ffcf6a')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    // birds: tiny dark flecks, slightly bigger when flying across the view
    c.fillStyle = '#0d1226'
    const s = Math.max(1.5, 1.2 * u)
    for (const b of this.birds) {
      const x = b.x * w
      const y = b.y * h
      const side = Math.abs(b.vx) / (Math.abs(b.vx) + Math.abs(b.vy) + 1e-6)
      c.fillRect(x, y, s * (0.8 + side), s)
    }
    // reeds and a low horizon
    const gy = h * 0.88
    c.fillStyle = '#16244a'
    c.beginPath()
    c.moveTo(0, h)
    for (let x = 0; x <= w; x += 6 * u) c.lineTo(x, gy - Math.sin(x / (50 * u)) * 3 * u)
    c.lineTo(w, h)
    c.fill()
    c.strokeStyle = '#16244a'
    c.lineWidth = Math.max(1, 0.6 * u)
    for (let i = 0; i < 70; i++) {
      const x = ((i * 53) % 100) / 100 * w
      const hh = (8 + (i % 7) * 2) * u
      const sw = Math.sin(this.t * 0.8 + i) * 1.5 * u
      c.beginPath()
      c.moveTo(x, gy + 2 * u)
      c.quadraticCurveTo(x, gy - hh * 0.5, x + sw, gy - hh)
      c.stroke()
    }
  }
}
