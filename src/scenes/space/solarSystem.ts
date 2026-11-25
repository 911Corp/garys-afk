import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

/** Orbital periods in Earth years (real ratios), distances in AU, sizes compressed for display. */
const PLANETS = [
  { name: 'Mercury', au: 0.39, period: 0.24, size: 1.2, col: '#8b8598', dark: '#2b2236' },
  { name: 'Venus', au: 0.72, period: 0.62, size: 2, col: '#f7e07a', dark: '#a23e5c' },
  { name: 'Earth', au: 1, period: 1, size: 2.1, col: '#5ab4e5', dark: '#1e3d5c', moon: true },
  { name: 'Mars', au: 1.52, period: 1.88, size: 1.6, col: '#e2614f', dark: '#55305a' },
  { name: 'Jupiter', au: 5.2, period: 11.86, size: 5, col: '#f3a64b', dark: '#a23e5c', bands: true },
  { name: 'Saturn', au: 9.54, period: 29.45, size: 4.2, col: '#f7e07a', dark: '#a23e5c', rings: true },
  { name: 'Uranus', au: 19.2, period: 84, size: 3, col: '#b6e3f0', dark: '#2f6fb0' },
  { name: 'Neptune', au: 30.1, period: 164.8, size: 3, col: '#2f6fb0', dark: '#1e3d5c' },
]

export function create(ctx: SceneContext) {
  return new SolarSystem(ctx)
}

class SolarSystem extends PixelScene {
  years = 0
  phase = PLANETS.map(() => 0)
  stars: { x: number; y: number; b: boolean }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.phase = PLANETS.map(() => this.r() * TAU)
    this.layout()
  }
  palette() {
    return PX.console16
  }
  dither() {
    return 0.3
  }
  layout() {
    this.stars = Array.from({ length: Math.round((this.w * this.h) / 220) }, () => ({ x: this.r() * this.w, y: this.r() * this.h, b: this.r.chance(0.15) }))
  }
  /** Map AU to screen radius: 'log' keeps every orbit on screen, 'inner' zooms on the rocky planets. */
  radius(au: number) {
    const maxR = Math.min(this.w * 0.47, this.h * 0.47 / this.num('tilt'))
    const scale = this.str('scale')
    if (scale === 'inner') return (au / 1.7) * maxR
    return (Math.log(1 + au * 2.2) / Math.log(1 + 30.1 * 2.2)) * maxR
  }
  step(dt: number) {
    // time speed is in Earth days per second
    this.years += (dt * this.num('days')) / 365.25
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0d0b14'
    c.fillRect(0, 0, w, h)
    for (const s of this.stars) {
      c.fillStyle = s.b ? '#f2f0e6' : '#8b8598'
      c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1)
    }
    const cx = w / 2
    const cy = h / 2
    const tilt = this.num('tilt')
    const inner = this.str('scale') === 'inner'
    // orbits as dotted ellipses
    c.fillStyle = '#2b2236'
    for (const p of PLANETS) {
      const r = this.radius(p.au)
      if (inner && p.au > 2) continue
      const n = Math.max(40, Math.round(r * 1.2))
      for (let i = 0; i < n; i += 2) {
        const a = (i / n) * TAU
        c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * tilt), 1, 1)
      }
    }
    // planets sorted by depth so the ones behind the Sun are hidden by it
    const items = PLANETS.map((p, i) => {
      const a = this.phase[i] + (this.years / p.period) * TAU
      const r = this.radius(p.au)
      return { p, a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * tilt, depth: Math.sin(a) }
    }).filter((it) => !inner || it.p.au < 2)
    const sun = () => {
      const R = 7 * u
      const g = c.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 3.5)
      g.addColorStop(0, `rgba(243,166,75,${0.6 * this.g.intensity})`)
      g.addColorStop(1, 'rgba(243,166,75,0)')
      c.fillStyle = g
      c.fillRect(cx - R * 4, cy - R * 4, R * 8, R * 8)
      c.fillStyle = '#f3a64b'
      c.beginPath()
      c.arc(cx, cy, R, 0, TAU)
      c.fill()
      c.fillStyle = '#f7e07a'
      c.beginPath()
      c.arc(cx - R * 0.2, cy - R * 0.2, R * 0.7, 0, TAU)
      c.fill()
    }
    items.sort((a, b) => a.depth - b.depth)
    let sunDrawn = false
    for (const it of items) {
      if (!sunDrawn && it.depth >= 0) {
        sun()
        sunDrawn = true
      }
      this.planet(it.p, it.x, it.y, it.a)
    }
    if (!sunDrawn) sun()
    if (this.bool('labels')) {
      c.font = `${Math.round(8 * u)}px "VT323", monospace`
      c.fillStyle = '#b6e3f0'
      c.textAlign = 'left'
      for (const it of items) c.fillText(it.p.name, Math.round(it.x + it.p.size * u + 2 * u), Math.round(it.y - 2 * u))
      c.fillStyle = '#8b8598'
      c.fillText(`year ${(2026 + this.years).toFixed(1)}`, 4 * u, h - 4 * u)
    }
  }
  planet(p: (typeof PLANETS)[number], x: number, y: number, a: number) {
    const c = this.c
    const u = this.u
    const R = Math.max(1, p.size * u)
    if (p.rings) {
      c.strokeStyle = '#f2f0e6'
      c.lineWidth = Math.max(1, u * 0.8)
      c.beginPath()
      c.ellipse(x, y, R * 2.1, R * 0.7, -0.2, 0, TAU)
      c.stroke()
    }
    c.fillStyle = p.col
    c.beginPath()
    c.arc(x, y, R, 0, TAU)
    c.fill()
    if (p.bands) {
      c.fillStyle = p.dark
      c.fillRect(Math.round(x - R), Math.round(y - R * 0.3), Math.round(R * 2), Math.max(1, Math.round(u)))
      c.fillRect(Math.round(x - R * 0.8), Math.round(y + R * 0.35), Math.round(R * 1.6), Math.max(1, Math.round(u)))
    }
    // night side: the half facing away from the Sun
    c.fillStyle = p.dark
    c.globalAlpha = 0.85
    c.beginPath()
    c.arc(x, y, R, a - Math.PI / 2, a + Math.PI / 2)
    c.fill()
    c.globalAlpha = 1
    if (p.moon) {
      const ma = this.years * TAU * 13.4
      c.fillStyle = '#f2f0e6'
      c.fillRect(Math.round(x + Math.cos(ma) * R * 2.4), Math.round(y + Math.sin(ma) * R * 1.2), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)))
    }
  }
}
