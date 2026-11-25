import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

const LIGHTS: Record<string, { sky: [string, string]; sun: string; lit: string[]; shade: string[]; stars: boolean }> = {
  day: { sky: ['#5ab4e5', '#f2e2b0'], sun: '#fffbe8', lit: ['#e8c48a', '#f0b26a', '#e89a52', '#d9803c'], shade: ['#c89a62', '#c4824a', '#b86c36', '#9a5428'], stars: false },
  sunset: { sky: ['#55305a', '#f3a64b'], sun: '#ffe9a3', lit: ['#c47a5a', '#e2805a', '#f08a4a', '#f3a64b'], shade: ['#6a3a4a', '#7a3a3a', '#8a3d2a', '#9a4222'], stars: false },
  night: { sky: ['#05060d', '#24407a'], sun: '#f2f4ff', lit: ['#3a4a7a', '#44507a', '#4e5680', '#5a5e86'], shade: ['#1a2040', '#1c2240', '#202444', '#24284a'], stars: true },
}

export function create(ctx: SceneContext) {
  return new DesertDunes(ctx)
}

/** Rolling dunes under a wide sky: wind lifts sand off the crests and a small caravan crosses the far ridge. */
class DesertDunes extends PixelScene {
  grains: { x: number; y: number; vx: number; life: number; layer: number }[] = []
  stars: { x: number; y: number; p: number }[] = []
  caravan = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.stars = Array.from({ length: 160 }, () => ({ x: this.r(), y: this.r() * 0.55, p: this.r() * TAU }))
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.45
  }
  get L() {
    return LIGHTS[this.str('light')] ?? LIGHTS.day
  }
  crest(layer: number, x: number) {
    const { w, h } = this
    const base = h * (0.5 + layer * 0.12)
    const amp = Math.min(h, w * 0.9) * (0.05 + layer * 0.025)
    const f = 1 / (Math.max(w, h * 1.4) * (0.35 + layer * 0.12))
    const drift = this.t * 0.002 * (layer + 1) * this.num('wind')
    return base - amp * (Math.sin(x * f * TAU + layer * 1.7 + drift) * 0.6 + Math.sin(x * f * TAU * 2.3 + layer + drift * 1.3) * 0.4)
  }
  step(dt: number) {
    const { w, u } = this
    const wind = this.num('wind')
    const want = Math.round(220 * wind * this.density)
    while (this.grains.length < want) {
      const layer = this.r.int(0, 3)
      const x = this.r() * w
      this.grains.push({ x, y: this.crest(layer, x), vx: this.r.range(20, 50) * u * wind, life: this.r.range(0.5, 1.6), layer })
    }
    for (const g of this.grains) {
      g.x += g.vx * dt
      g.y += Math.sin(this.t * 3 + g.x) * dt * 3 * u - dt * 2 * u
      g.life -= dt
    }
    this.grains = this.grains.filter((g) => g.life > 0 && g.x < w + 10)
    this.caravan = (this.caravan + dt * 0.006) % 1.2
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const L = this.L
    const sky = c.createLinearGradient(0, 0, 0, h * 0.6)
    sky.addColorStop(0, L.sky[0])
    sky.addColorStop(1, L.sky[1])
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    if (L.stars)
      for (const s of this.stars) {
        c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 0.7 + s.p))
        c.fillStyle = '#f2f4ff'
        c.fillRect(s.x * w, s.y * h, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
      }
    c.globalAlpha = 1
    const sx = w * 0.72
    const sy = this.str('light') === 'sunset' ? h * 0.46 : h * 0.18
    const sr = (this.str('light') === 'sunset' ? 22 : 12) * u
    glow(c, sx, sy, sr * 4, L.sun + '66')
    c.fillStyle = L.sun
    c.beginPath()
    c.arc(sx, sy, sr, 0, TAU)
    c.fill()
    // dunes back to front: each has a lit face and a shaded slip face
    for (let layer = 0; layer < 4; layer++) {
      const step = 3 * u
      const pts: number[] = []
      for (let x = -step; x <= w + step; x += step) pts.push(this.crest(layer, x))
      c.fillStyle = L.lit[layer]
      c.beginPath()
      c.moveTo(-step, h)
      pts.forEach((y, i) => c.lineTo(-step + i * step, y))
      c.lineTo(w + step, h)
      c.fill()
      // slip faces: where the crest goes downhill, a shaded band whose depth follows the slope
      c.fillStyle = L.shade[layer]
      c.globalAlpha = 0.75
      let i = 1
      while (i < pts.length) {
        if (pts[i] - pts[i - 1] <= 0) {
          i++
          continue
        }
        const start = i - 1
        while (i < pts.length && pts[i] - pts[i - 1] > 0) i++
        const end = i - 1
        c.beginPath()
        for (let k = start; k <= end; k++) c.lineTo(-step + k * step, pts[k])
        for (let k = end; k >= start; k--) {
          const sl = k > 0 ? Math.max(0, pts[k] - pts[k - 1]) : 0
          const edge = Math.min(1, (k - start) / 3, (end - k) / 3 + 0.3)
          c.lineTo(-step + k * step, pts[k] + Math.min(h * 0.07, (sl / step) * 14 * u) * edge)
        }
        c.closePath()
        c.fill()
      }
      c.globalAlpha = 1
      // ripples on the sand
      c.strokeStyle = L.shade[layer]
      c.globalAlpha = 0.12
      c.lineWidth = Math.max(1, 0.4 * u)
      for (let k = 0; k < 4; k++) {
        c.beginPath()
        for (let i = 0; i < pts.length; i += 2) {
          const x = -step + i * step
          const y = pts[i] + (k + 1) * h * 0.022 + Math.sin(x / (8 * u) + k) * 0.8 * u
          if (i) c.lineTo(x, y)
          else c.moveTo(x, y)
        }
        c.stroke()
      }
      c.globalAlpha = 1
      // caravan on the far ridge
      if (layer === 0 && this.bool('caravan')) {
        const cx0 = (this.caravan - 0.1) * w
        for (let k = 0; k < 4; k++) {
          const x = cx0 - k * 12 * u
          if (x < -10 * u || x > w + 10 * u) continue
          this.camel(x, this.crest(0, x), u * 0.8, k)
        }
      }
      // blowing sand for this layer
      c.fillStyle = L.lit[Math.min(3, layer + 1)]
      for (const g of this.grains) {
        if (g.layer !== layer) continue
        c.globalAlpha = Math.min(1, g.life) * 0.7
        c.fillRect(g.x, g.y, Math.max(1, 0.6 * u), Math.max(1, 0.5 * u))
      }
      c.globalAlpha = 1
    }
  }
  camel(x: number, y: number, s: number, k: number) {
    const c = this.c
    const step = Math.sin(this.t * 4 + k) * s
    c.fillStyle = this.str('light') === 'day' ? '#3f1f0f' : '#0c0705'
    c.beginPath()
    c.ellipse(x, y - 7 * s, 4.5 * s, 2.2 * s, 0, 0, TAU)
    c.fill()
    c.beginPath()
    c.arc(x - 0.5 * s, y - 9 * s, 2 * s, Math.PI, 0)
    c.fill()
    c.fillRect(x + 3 * s, y - 11 * s, 1.2 * s, 4 * s)
    c.fillRect(x + 3 * s, y - 11.5 * s, 3 * s, 1.4 * s)
    c.fillRect(x - 3 * s + step, y - 6 * s, 0.9 * s, 6 * s)
    c.fillRect(x + 2.5 * s - step, y - 6 * s, 0.9 * s, 6 * s)
    if (k === 0) c.fillRect(x - 1 * s, y - 13 * s, 1.4 * s, 3.5 * s)
  }
}
