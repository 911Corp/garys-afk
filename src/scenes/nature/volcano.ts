import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Ember = { x: number; y: number; vx: number; vy: number; life: number; s: number }
type Puff = { x: number; y: number; r: number; vx: number; life: number }

export function create(ctx: SceneContext) {
  return new Volcano(ctx)
}

/** A volcano erupting at night over the sea: a lava fountain, glowing flows, a slow ash plume and a red reflection. */
class Volcano extends PixelScene {
  embers: Ember[] = []
  puffs: Puff[] = []
  flows: { side: number; off: number; len: number; ph: number }[] = []
  stars: { x: number; y: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.flows = Array.from({ length: 5 }, (_, i) => ({ side: i % 2 ? 1 : -1, off: this.r.range(0.1, 0.9), len: this.r.range(0.4, 0.95), ph: this.r() * TAU }))
    this.stars = Array.from({ length: 120 }, () => ({ x: this.r(), y: this.r() * 0.5 }))
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.5
  }
  get peak() {
    return { x: this.w * 0.55, y: this.h * 0.36 }
  }
  step(dt: number) {
    const { u } = this
    const P = this.peak
    const k = this.num('eruption')
    const pulse = 0.6 + 0.4 * Math.sin(this.t * 0.8) + (Math.sin(this.t * 0.13) > 0.8 ? 0.8 : 0)
    const n = dt * 90 * k * pulse * this.density
    for (let i = 0; i < n; i++)
      this.embers.push({ x: P.x + this.r.range(-4, 4) * u, y: P.y, vx: this.r.range(-18, 18) * u, vy: -this.r.range(30, 75) * u * Math.sqrt(k), life: this.r.range(1.2, 2.6), s: this.r.range(0.6, 1.6) })
    for (const e of this.embers) {
      e.vy += 45 * u * dt
      e.x += e.vx * dt
      e.y += e.vy * dt
      e.life -= dt
    }
    this.embers = this.embers.filter((e) => e.life > 0)
    if (this.r.chance(dt * 6)) this.puffs.push({ x: P.x + this.r.range(-5, 5) * u, y: P.y - 4 * u, r: this.r.range(8, 14) * u, vx: this.r.range(4, 9) * u, life: 1 })
    for (const p of this.puffs) {
      p.y -= 9 * u * dt
      p.x += p.vx * dt
      p.r += 4 * u * dt
      p.life -= dt * 0.045
    }
    this.puffs = this.puffs.filter((p) => p.life > 0)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const P = this.peak
    const sea = h * 0.74
    const sky = c.createLinearGradient(0, 0, 0, sea)
    sky.addColorStop(0, '#0c0705')
    sky.addColorStop(1, '#3f1f0f')
    c.fillStyle = sky
    c.fillRect(0, 0, w, sea)
    c.fillStyle = '#fffbe8'
    for (const s of this.stars) c.fillRect(s.x * w, s.y * h, Math.max(1, 0.5 * u), Math.max(1, 0.5 * u))
    glow(c, P.x, P.y, w * 0.5, 'rgba(240,138,42,0.25)')
    // ash plume, lit from below
    for (const p of this.puffs) {
      c.globalAlpha = Math.min(1, p.life * 1.5) * 0.8
      c.fillStyle = p.y > P.y - 30 * u ? '#682e14' : '#3a2a22'
      c.beginPath()
      c.arc(p.x, p.y, p.r, 0, TAU)
      c.fill()
    }
    c.globalAlpha = 1
    // mountain
    const base = 120 * u
    c.fillStyle = '#1a1d24'
    c.beginPath()
    c.moveTo(P.x - base * 1.8, sea)
    c.quadraticCurveTo(P.x - base * 0.5, P.y + 30 * u, P.x - 8 * u, P.y)
    c.lineTo(P.x + 8 * u, P.y)
    c.quadraticCurveTo(P.x + base * 0.5, P.y + 30 * u, P.x + base * 1.8, sea)
    c.fill()
    // a smaller cone to the left
    c.fillStyle = '#24120a'
    c.beginPath()
    c.moveTo(-10 * u, sea)
    c.quadraticCurveTo(w * 0.12, sea - 50 * u, w * 0.28, sea)
    c.fill()
    // glowing lava flows down the slopes
    c.lineCap = 'round'
    for (const f of this.flows) {
      const pts: [number, number][] = []
      for (let i = 0; i <= 20; i++) {
        const t = (i / 20) * f.len
        const x = P.x + f.side * (6 * u + t * base * 1.2 * f.off + Math.sin(t * 8 + f.ph) * 4 * u)
        const y = P.y + t * (sea - P.y)
        pts.push([x, y])
      }
      for (const [col, wd] of [
        ['rgba(207,90,28,0.5)', 4],
        ['#f08a2a', 2],
        ['#ffe9a3', 0.8],
      ] as const) {
        c.strokeStyle = col
        c.lineWidth = wd * u
        c.beginPath()
        pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
        c.stroke()
      }
      // a bright bead travelling down each flow
      const b = (this.t * 0.05 + f.ph) % 1
      const [bx, by] = pts[Math.floor(b * 20)]
      glow(c, bx, by, 6 * u, 'rgba(255,233,163,0.8)')
    }
    c.lineCap = 'butt'
    // crater glow and fountain
    glow(c, P.x, P.y, 26 * u, 'rgba(255,190,79,0.9)')
    for (const e of this.embers) {
      const k = Math.min(1, e.life)
      c.fillStyle = k > 0.7 ? '#ffe9a3' : k > 0.35 ? '#f08a2a' : '#9a3d16'
      c.fillRect(e.x, e.y, e.s * u, e.s * u)
    }
    // sea with the glow reflected
    c.fillStyle = '#0c0705'
    c.fillRect(0, sea, w, h - sea)
    for (let i = 0; i < 40; i++) {
      const y = sea + 2 * u + ((i * 7.3) % 1) * (h - sea) + (i / 40) * (h - sea) * 0.9
      const spread = (y - sea) / (h - sea)
      const ww = (8 + spread * 40) * u * (0.6 + 0.4 * Math.sin(this.t * 1.5 + i))
      const x = P.x + Math.sin(this.t * 0.7 + i * 1.3) * spread * 30 * u
      c.globalAlpha = 0.6 * (1 - spread * 0.6)
      c.fillStyle = i % 3 ? '#cf5a1c' : '#ffbe4f'
      c.fillRect(x - ww / 2, y, ww, Math.max(1, 0.8 * u))
    }
    c.globalAlpha = 1
  }
}
