import { PixelScene } from '../../engine/base'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

const PAL = ['#050608', '#0c0f16', '#151a24', '#202838', '#2e3a4e', '#44546c', '#64788e', '#9aaec2', '#e8f0ff', '#ffffff', '#1a2216', '#2a3a22', '#ffd28a']

type Pt = [number, number]

export function create(ctx: SceneContext) {
  return new Thunderstorm(ctx)
}

/**
 * Storm over open fields. Lightning bolts are grown by midpoint displacement with side branches.
 * With "no flash" (here or in Accessibility) the sky never flashes: bolts stay dim and short.
 */
class Thunderstorm extends PixelScene {
  noise = createNoise(31)
  clouds: HTMLCanvasElement[] = []
  rain: { x: number; y: number; l: number; v: number }[] = []
  bolt: { pts: Pt[]; branches: Pt[][]; life: number } | null = null
  flash = 0
  next = 4
  scroll = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PAL
  }
  dither() {
    return 0.6
  }
  get calm() {
    return this.g.noFlash || this.bool('noflash') || this.g.reducedMotion
  }
  configure() {
    this.layout()
  }
  layout() {
    const { w, h, u } = this
    // two cloud layers drawn from noise, twice the screen width so they can scroll
    this.clouds = [0, 1].map((li) => {
      const cv = document.createElement('canvas')
      cv.width = w * 2
      cv.height = Math.round(h * 0.6)
      const c = cv.getContext('2d')!
      const img = c.createImageData(cv.width, cv.height)
      for (let y = 0; y < cv.height; y++)
        for (let x = 0; x < cv.width; x++) {
          // tile horizontally by blending the noise across the seam
          const fx = x / cv.width
          const a = this.noise.fbm2((x / u) * 0.02 + li * 30, (y / u) * 0.03, 4)
          const b = this.noise.fbm2(((x - cv.width) / u) * 0.02 + li * 30, (y / u) * 0.03, 4)
          const v = a * (1 - fx) + b * fx
          const fall = 1 - y / cv.height
          const dens = Math.max(0, Math.min(1, (v + 0.2) * 1.8)) * (0.5 + fall * 0.7)
          const i = (y * cv.width + x) * 4
          const shade = 22 + dens * (li ? 60 : 40)
          img.data[i] = shade
          img.data[i + 1] = shade + 6
          img.data[i + 2] = shade + 16
          img.data[i + 3] = Math.min(255, dens * 400)
        }
      c.putImageData(img, 0, 0)
      return cv
    })
    this.rain = Array.from({ length: Math.round(220 * this.num('rain') * this.density) }, () => ({ x: this.r() * w, y: this.r() * h, l: this.r.range(4, 9) * u, v: this.r.range(160, 240) * u }))
  }
  strike() {
    const { w, h } = this
    const x0 = this.r.range(w * 0.15, w * 0.85)
    const ground = h * 0.8
    const grow = (a: Pt, b: Pt, depth: number, spread: number): Pt[] => {
      if (depth === 0) return [a, b]
      const m: Pt = [(a[0] + b[0]) / 2 + this.r.range(-spread, spread), (a[1] + b[1]) / 2]
      return [...grow(a, m, depth - 1, spread / 2).slice(0, -1), ...grow(m, b, depth - 1, spread / 2)]
    }
    const end: Pt = [x0 + this.r.range(-w * 0.1, w * 0.1), this.calm ? h * 0.45 : ground]
    const pts = grow([x0, h * 0.12], end, 6, w * 0.08)
    const branches: Pt[][] = []
    for (let i = 4; i < pts.length - 6; i += 5)
      if (this.r.chance(0.5)) {
        const s = pts[i]
        const e: Pt = [s[0] + this.r.range(-w * 0.12, w * 0.12), s[1] + this.r.range(h * 0.06, h * 0.18)]
        branches.push(grow(s, e, 4, w * 0.03))
      }
    this.bolt = { pts, branches, life: 0.35 }
    if (!this.calm) this.flash = 1
    this.emit({ type: 'thunder', strength: this.r.range(0.5, 1), delay: this.r.range(0.4, 3) })
  }
  step(dt: number) {
    const { w, h } = this
    const wind = this.num('wind')
    this.scroll += dt * (6 + wind * 10) * this.u
    for (const r of this.rain) {
      r.y += r.v * dt
      r.x += r.v * dt * wind * 0.25
      if (r.y > h) {
        r.y = -r.l
        r.x = this.r() * w
      }
      if (r.x > w) r.x -= w
      if (r.x < 0) r.x += w
    }
    this.next -= dt * this.num('lightning')
    if (this.next <= 0) {
      this.strike()
      this.next = this.r.range(4, 12)
    }
    if (this.bolt) {
      this.bolt.life -= dt
      if (this.bolt.life <= 0) this.bolt = null
    }
    this.flash = Math.max(0, this.flash - dt * 3)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const lit = this.flash
    const g = c.createLinearGradient(0, 0, 0, h * 0.8)
    g.addColorStop(0, lit > 0.3 ? '#44546c' : '#0c0f16')
    g.addColorStop(1, lit > 0.3 ? '#9aaec2' : '#202838')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // clouds, far layer slower
    this.clouds.forEach((cv, li) => {
      const off = (this.scroll * (li ? 1 : 0.5)) % w
      c.drawImage(cv, -off, li ? h * 0.02 : 0)
      c.drawImage(cv, -off + w * 2, li ? h * 0.02 : 0)
    })
    // a glow inside the clouds even in calm mode
    if (this.bolt) {
      const bx = this.bolt.pts[0][0]
      const gl = c.createRadialGradient(bx, h * 0.15, 2, bx, h * 0.15, w * 0.3)
      gl.addColorStop(0, `rgba(154,174,194,${this.calm ? 0.3 : 0.6})`)
      gl.addColorStop(1, 'rgba(154,174,194,0)')
      c.fillStyle = gl
      c.fillRect(0, 0, w, h)
    }
    if (lit > 0) {
      c.fillStyle = `rgba(232,240,255,${lit * 0.35})`
      c.fillRect(0, 0, w, h)
    }
    // the bolt
    if (this.bolt) {
      const line = (pts: Pt[], width: number, col: string) => {
        c.strokeStyle = col
        c.lineWidth = width
        c.beginPath()
        pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])))
        c.stroke()
      }
      const main = this.calm ? '#9aaec2' : '#ffffff'
      line(this.bolt.pts, Math.max(1, 2 * u), main)
      for (const b of this.bolt.branches) line(b, Math.max(1, u), this.calm ? '#64788e' : '#e8f0ff')
    }
    // fields, a tree and a farmhouse with a lit window
    const gy = Math.round(h * 0.8)
    c.fillStyle = lit > 0.3 ? '#2a3a22' : '#1a2216'
    c.fillRect(0, gy, w, h)
    c.fillStyle = '#050608'
    for (let x = 0; x < w; x += 1) {
      const hill = Math.round(Math.sin(x * 0.02 / u) * 3 * u + Math.sin(x * 0.05 / u) * u)
      c.fillRect(x, gy - hill - 2 * u, 1, hill + 2 * u)
    }
    const tx = w * 0.2
    c.fillRect(tx, gy - 30 * u, 3 * u, 30 * u)
    for (let k = 0; k < 5; k++) c.fillRect(tx - (14 - k * 2) * u, gy - (30 + k * 4) * u, (31 - k * 4) * u, 5 * u)
    const hx = w * 0.7
    c.fillRect(hx, gy - 16 * u, 30 * u, 16 * u)
    for (let k = 0; k < 10; k++) c.fillRect(hx - 3 * u + k * u, gy - (16 + k) * u, 36 * u - k * 2 * u, u)
    c.fillStyle = '#ffd28a'
    c.fillRect(hx + 6 * u, gy - 11 * u, 5 * u, 5 * u)
    // rain
    c.fillStyle = lit > 0.3 ? '#e8f0ff' : '#64788e'
    const wind = this.num('wind')
    for (const r of this.rain) {
      for (let i = 0; i < r.l; i += Math.max(1, u)) c.fillRect(Math.round(r.x - i * wind * 0.25), Math.round(r.y - i), 1, Math.max(1, Math.round(u)))
    }
  }
}
