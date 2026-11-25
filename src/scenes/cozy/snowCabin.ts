import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

export function create(ctx: SceneContext) {
  return new SnowCabin(ctx)
}

/** A log cabin on a snowy hill at night: warm windows, chimney smoke, three layers of snow. */
class SnowCabin extends PixelScene {
  noise = createNoise(11)
  bg: HTMLCanvasElement | null = null
  flakes: { x: number; y: number; z: number; ph: number }[] = []
  smoke: { x: number; y: number; a: number; s: number }[] = []
  stars: { x: number; y: number; ph: number }[] = []
  cabin = { x: 0, y: 0 }
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.cold16
  }
  dither() {
    return 0.55
  }
  configure() {
    this.layout()
  }
  ridge(base: number, amp: number, freq: number, seed: number) {
    const pts: number[] = []
    for (let x = 0; x <= this.w; x++) pts.push(base + this.noise.fbm2(x * freq + seed, seed, 3) * amp)
    return pts
  }
  layout() {
    const { w, h, u } = this
    const dusk = this.str('time') === 'dusk'
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    const g = c.createLinearGradient(0, 0, 0, h * 0.7)
    g.addColorStop(0, dusk ? '#2e2552' : '#020409')
    g.addColorStop(0.6, dusk ? '#7a6aa8' : '#0e2236')
    g.addColorStop(1, dusk ? '#ffd28a' : '#173856')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // moon with a soft halo
    const mx = w * 0.78
    const my = h * 0.2
    const halo = c.createRadialGradient(mx, my, 2, mx, my, 40 * u)
    halo.addColorStop(0, 'rgba(230,246,247,0.4)')
    halo.addColorStop(1, 'rgba(230,246,247,0)')
    c.fillStyle = halo
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#e6f6f7'
    c.beginPath()
    c.arc(mx, my, 9 * u, 0, Math.PI * 2)
    c.fill()
    // mountains, far and near
    const layers: [number, number, number, string, string][] = [
      [0.5, 26 * u, 0.012, '#22557a', '#a6dbe5'],
      [0.62, 18 * u, 0.02, '#173856', '#66b0c9'],
    ]
    layers.forEach(([base, amp, fq, col, snow], i) => {
      const r = this.ridge(h * base, amp, fq / u, i * 10 + 3)
      for (let x = 0; x < w; x++) {
        c.fillStyle = col
        c.fillRect(x, r[x], 1, h)
        c.fillStyle = snow
        c.fillRect(x, r[x], 1, Math.max(1, 3 * u - (x % 3)))
      }
    })
    // pine forest line
    for (let i = 0; i < w / (6 * u); i++) {
      const x = this.r() * w
      const base = h * 0.7 + this.r() * 6 * u
      this.pine(c, x, base, this.r.range(10, 18) * u, '#08121f', '#3a7fa3')
    }
    // the hill
    const hill = this.ridge(h * 0.74, 8 * u, 0.008 / u, 42)
    for (let x = 0; x < w; x++) {
      c.fillStyle = '#a6dbe5'
      c.fillRect(x, hill[x], 1, h)
      c.fillStyle = '#e6f6f7'
      c.fillRect(x, hill[x], 1, 2)
    }
    // cabin
    const cx = Math.round(w * 0.42)
    const cy = Math.round(hill[Math.min(w - 1, Math.round(cx + 20 * u))] - 2 * u)
    this.cabin = { x: cx, y: cy }
    const cw = 46 * u
    const ch = 22 * u
    c.fillStyle = '#4b3d7a'
    c.fillRect(cx, cy - ch, cw, ch)
    c.fillStyle = '#2e2552'
    for (let y = cy - ch; y < cy; y += 3 * u) c.fillRect(cx, y, cw, Math.max(1, u * 0.7))
    // roof with snow
    for (let i = 0; i < 16 * u; i++) {
      c.fillStyle = '#1a1430'
      c.fillRect(cx - 5 * u + i, cy - ch - i, cw + 10 * u - i * 2, 1)
    }
    c.fillStyle = '#e6f6f7'
    for (let i = 0; i < 16 * u; i++) c.fillRect(cx - 5 * u + i, cy - ch - i - 1, Math.max(2, 3 * u), 1)
    for (let i = 0; i < 16 * u; i++) c.fillRect(cx + cw + 5 * u - i - 3 * u, cy - ch - i - 1, Math.max(2, 3 * u), 1)
    c.fillRect(cx - 6 * u, cy - ch - 1, cw + 12 * u, 2 * u)
    // chimney
    c.fillStyle = '#7a6aa8'
    c.fillRect(cx + cw * 0.7, cy - ch - 20 * u, 6 * u, 12 * u)
    c.fillStyle = '#e6f6f7'
    c.fillRect(cx + cw * 0.7 - u, cy - ch - 21 * u, 8 * u, 2 * u)
    // door
    c.fillStyle = '#1a1430'
    c.fillRect(cx + cw * 0.62, cy - 13 * u, 8 * u, 13 * u)
    // fence
    c.fillStyle = '#2e2552'
    for (let i = 0; i < 9; i++) {
      const fx = cx + cw + 10 * u + i * 9 * u
      const fy = hill[Math.min(w - 1, Math.round(fx))]
      c.fillRect(fx, fy - 8 * u, 2 * u, 9 * u)
      c.fillStyle = '#e6f6f7'
      c.fillRect(fx, fy - 9 * u, 2 * u, 1 * u)
      c.fillStyle = '#2e2552'
    }
    c.fillRect(cx + cw + 10 * u, hill[Math.round(cx + cw + 10 * u)] - 5 * u, 74 * u, 1 * u)
    // foreground pines
    this.pine(c, w * 0.12, h * 0.98, 44 * u, '#08121f', '#e6f6f7')
    this.pine(c, w * 0.2, h * 1.02, 34 * u, '#08121f', '#e6f6f7')
    this.pine(c, w * 0.9, h * 1.0, 50 * u, '#08121f', '#e6f6f7')
    this.bg = cv
    this.stars = Array.from({ length: Math.round(50 * this.density) }, () => ({ x: this.r() * w, y: this.r() * h * 0.45, ph: this.r() * 6 }))
    this.flakes = Array.from({ length: Math.round(260 * this.num('snow') * this.density) }, () => ({ x: this.r() * w, y: this.r() * h, z: this.r(), ph: this.r() * 6 }))
  }
  pine(c: CanvasRenderingContext2D, x: number, base: number, hgt: number, col: string, snow: string) {
    const u = this.u
    const step = Math.max(1, Math.round(u))
    c.fillStyle = col
    c.fillRect(Math.round(x - u), Math.round(base - hgt * 0.18), Math.max(2, Math.round(2 * u)), Math.round(hgt * 0.18))
    const tiers = 3
    const th = (hgt * 0.85) / tiers
    for (let t = 0; t < tiers; t++) {
      const tierBase = base - hgt * 0.12 - t * th * 0.75
      const maxHalf = hgt * 0.3 * (1 - t * 0.25)
      for (let i = 0; i < th; i += step) {
        const half = maxHalf * (1 - i / th)
        c.fillStyle = col
        c.fillRect(Math.round(x - half), Math.round(tierBase - i), Math.max(1, Math.round(half * 2)), step)
      }
      c.fillStyle = snow
      c.fillRect(Math.round(x - maxHalf * 0.5), Math.round(tierBase - th * 0.5), Math.round(maxHalf * 0.4), step)
    }
  }
  step(dt: number) {
    const { u } = this
    const wind = this.num('wind')
    for (const f of this.flakes) {
      const sp = 8 + f.z * 22
      f.y += sp * dt * u
      f.x += (Math.sin(this.t * 0.8 + f.ph) * 4 + wind * 14 * (0.4 + f.z)) * dt * u
      if (f.y > this.h) {
        f.y = -2
        f.x = this.r() * this.w
      }
      if (f.x > this.w) f.x -= this.w
      if (f.x < 0) f.x += this.w
    }
    const cx = this.cabin.x + 46 * u * 0.7 + 3 * u
    if (this.r.chance(dt * 5)) this.smoke.push({ x: cx, y: this.cabin.y - 22 * u - 20 * u, a: 0, s: this.r.range(2, 4) })
    for (const s of this.smoke) {
      s.a += dt
      s.y -= dt * 6 * u
      s.x += (wind * 6 + this.noise.noise2(s.y * 0.05, this.t * 0.3) * 4) * dt * u
    }
    this.smoke = this.smoke.filter((s) => s.a < 6)
  }
  draw() {
    const c = this.c
    const { u } = this
    c.drawImage(this.bg!, 0, 0)
    for (const s of this.stars) {
      if (Math.sin(this.t * 1.5 + s.ph) > 0.6) continue
      c.fillStyle = '#e6f6f7'
      c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1)
    }
    // smoke puffs
    for (const s of this.smoke) {
      c.fillStyle = `rgba(166,219,229,${0.4 * (1 - s.a / 6)})`
      const r = (s.s + s.a * 1.5) * u
      c.fillRect(Math.round(s.x - r / 2), Math.round(s.y - r / 2), Math.round(r), Math.round(r))
    }
    // warm windows, flickering a little
    if (this.bool('lights')) {
      const { x, y } = this.cabin
      const k = 0.85 + Math.sin(this.t * 5) * 0.05 + Math.sin(this.t * 13) * 0.04
      const g = c.createRadialGradient(x + 14 * u, y - 10 * u, 1, x + 14 * u, y - 10 * u, 36 * u)
      g.addColorStop(0, `rgba(255,210,138,${0.35 * k})`)
      g.addColorStop(1, 'rgba(255,210,138,0)')
      c.fillStyle = g
      c.fillRect(x - 30 * u, y - 46 * u, 100 * u, 70 * u)
      c.fillStyle = k > 0.86 ? '#ffd28a' : '#ff9f5a'
      c.fillRect(x + 6 * u, y - 15 * u, 7 * u, 6 * u)
      c.fillRect(x + 17 * u, y - 15 * u, 7 * u, 6 * u)
      c.fillStyle = '#1a1430'
      c.fillRect(x + 9 * u, y - 15 * u, 1 * u, 6 * u)
      c.fillRect(x + 20 * u, y - 15 * u, 1 * u, 6 * u)
    }
    for (const f of this.flakes) {
      c.fillStyle = f.z > 0.6 ? '#ffffff' : '#a6dbe5'
      const s = f.z > 0.85 ? Math.max(2, Math.round(2 * u)) : 1
      c.fillRect(Math.round(f.x), Math.round(f.y), s, s)
    }
  }
}
