import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Stall = { x: number; w: number; roof: string; cloth: string; steam: boolean; sign: number }
type Walker = { x: number; v: number; col: string; size: number; ph: number }

export function create(ctx: SceneContext) {
  return new NightMarket(ctx)
}

/** A night market in light rain: lantern strings, steaming stalls, umbrellas drifting by, reflections on wet stones. */
class NightMarket extends PixelScene {
  stalls: Stall[] = []
  walkers: Walker[] = []
  steam: { x: number; y: number; r: number; life: number }[] = []
  rain: { x: number; y: number; v: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.4
  }
  layout() {
    const r = this.r
    this.stalls = []
    let x = -0.02
    while (x < 1.02) {
      const w = r.range(0.14, 0.22)
      this.stalls.push({ x, w, roof: r.pick(['#ff2e88', '#22e1ff', '#ffe95a', '#ff9a3d', '#7cff6b']), cloth: r.pick(['#2c1b5e', '#3e2a7a', '#1e1240']), steam: r.chance(0.6), sign: r.int(2, 4) })
      x += w + 0.01
    }
    this.walkers = Array.from({ length: 7 }, () => this.walker(true))
    this.rain = Array.from({ length: 160 }, () => ({ x: r(), y: r(), v: r.range(0.5, 0.9) }))
  }
  walker(any: boolean): Walker {
    const dir = this.r.chance(0.5) ? 1 : -1
    return { x: any ? this.r() : dir > 0 ? -0.1 : 1.1, v: dir * this.r.range(0.012, 0.03), col: this.r.pick(['#ff2e88', '#22e1ff', '#ffe95a', '#a68cff', '#f2f0e6']), size: this.r.range(0.8, 1.2), ph: this.r() * TAU }
  }
  step(dt: number) {
    const { u } = this
    for (const s of this.stalls)
      if (s.steam && this.r.chance(dt * 4)) this.steam.push({ x: (s.x + s.w * this.r.range(0.3, 0.7)) * this.w, y: this.h * 0.56, r: this.r.range(3, 6) * u, life: 1 })
    for (const p of this.steam) {
      p.y -= dt * 12 * u
      p.x += Math.sin(this.t + p.y) * dt * 4 * u
      p.r += dt * 5 * u
      p.life -= dt * 0.45
    }
    this.steam = this.steam.filter((p) => p.life > 0)
    for (const wk of this.walkers) wk.x += wk.v * dt
    this.walkers = this.walkers.map((wk) => (wk.x < -0.15 || wk.x > 1.15 ? this.walker(false) : wk))
    const rain = this.num('rain')
    for (const d of this.rain) {
      d.y += d.v * dt * 1.4 * rain
      if (d.y > 1) d.y -= 1
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const ground = h * 0.7
    // sky and far buildings
    const sky = c.createLinearGradient(0, 0, 0, ground)
    sky.addColorStop(0, '#07040f')
    sky.addColorStop(1, '#2c1b5e')
    c.fillStyle = sky
    c.fillRect(0, 0, w, ground)
    for (let i = 0; i < 12; i++) {
      const bx = (i / 12) * w
      const bh = h * (0.25 + ((i * 37) % 10) / 30)
      c.fillStyle = '#120a24'
      c.fillRect(bx, ground - bh - h * 0.12, w / 12 + 1, bh)
      c.fillStyle = '#ffe95a'
      for (let k = 0; k < 6; k++) {
        if ((i * 7 + k * 3) % 4 === 0) continue
        c.globalAlpha = 0.35
        c.fillRect(bx + (k % 3) * (w / 40) + w / 80, ground - bh - h * 0.1 + Math.floor(k / 3) * h * 0.06, w / 120, h * 0.02)
      }
      c.globalAlpha = 1
    }
    // lantern strings
    for (let s = 0; s < 3; s++) {
      const y0 = h * (0.1 + s * 0.08)
      const sag = h * 0.06
      c.strokeStyle = '#2c1b5e'
      c.lineWidth = Math.max(1, 0.5 * u)
      c.beginPath()
      for (let x = 0; x <= w; x += 10 * u) {
        const k = (x / w) * 3 + s * 0.5
        const y = y0 + Math.abs(Math.sin(k * Math.PI)) * sag
        if (x) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
      c.stroke()
      for (let i = 0; i < 14; i++) {
        const x = ((i + 0.5) / 14) * w
        const k = (x / w) * 3 + s * 0.5
        const y = y0 + Math.abs(Math.sin(k * Math.PI)) * sag + 3 * u
        const sway = Math.sin(this.t * 1.2 + i + s) * 1.5 * u
        const col = ['#ff2e88', '#ff9a3d', '#ffe95a'][(i + s) % 3]
        glow(c, x + sway, y + 3 * u, 9 * u, col + '55')
        c.fillStyle = col
        c.beginPath()
        c.ellipse(x + sway, y + 3 * u, 2.6 * u, 3.4 * u, 0, 0, TAU)
        c.fill()
        c.fillStyle = '#120a24'
        c.fillRect(x + sway - 1.5 * u, y - 0.5 * u, 3 * u, 0.8 * u)
      }
    }
    // stalls
    for (const st of this.stalls) {
      const x = st.x * w
      const sw = st.w * w
      const roofY = h * 0.44
      c.fillStyle = st.cloth
      c.fillRect(x + sw * 0.05, roofY, sw * 0.9, ground - roofY)
      // striped awning
      for (let k = 0; k < 6; k++) {
        c.fillStyle = k % 2 ? st.roof : '#f2f0e6'
        c.beginPath()
        c.moveTo(x + (k * sw) / 6, roofY)
        c.lineTo(x + ((k + 1) * sw) / 6, roofY)
        c.lineTo(x + ((k + 1) * sw) / 6, roofY + 6 * u)
        c.arc(x + ((k + 0.5) * sw) / 6, roofY + 6 * u, sw / 12, 0, Math.PI)
        c.fill()
      }
      // glowing counter and signboard with glyph-like marks
      glow(c, x + sw / 2, ground - h * 0.08, sw * 0.7, st.roof + '44')
      c.fillStyle = '#07040f'
      c.fillRect(x + sw * 0.15, roofY + h * 0.05, sw * 0.7, h * 0.07)
      c.fillStyle = st.roof
      for (let g = 0; g < st.sign; g++) {
        const gx = x + sw * 0.22 + g * (sw * 0.56) / st.sign
        c.fillRect(gx, roofY + h * 0.065, sw * 0.08, Math.max(1, 0.8 * u))
        c.fillRect(gx + sw * 0.03, roofY + h * 0.06, Math.max(1, 0.8 * u), h * 0.04)
        c.fillRect(gx, roofY + h * 0.09, sw * 0.08, Math.max(1, 0.8 * u))
      }
      c.fillStyle = '#5a5a7a'
      c.fillRect(x + sw * 0.08, ground - h * 0.1, sw * 0.84, h * 0.1)
      c.fillStyle = '#f2f0e6'
      for (let k = 0; k < 4; k++) {
        c.beginPath()
        c.arc(x + sw * (0.22 + k * 0.18), ground - h * 0.1, 2.5 * u, Math.PI, 0)
        c.fill()
      }
    }
    // steam
    for (const p of this.steam) {
      c.globalAlpha = p.life * 0.35
      c.fillStyle = '#f2f0e6'
      c.beginPath()
      c.arc(p.x, p.y, p.r, 0, TAU)
      c.fill()
    }
    c.globalAlpha = 1
    // wet ground with reflections
    c.fillStyle = '#120a24'
    c.fillRect(0, ground, w, h - ground)
    c.save()
    c.globalAlpha = 0.25
    c.translate(0, ground * 2)
    c.scale(1, -1)
    c.drawImage(this.c.canvas, 0, ground * 0.6, w, ground * 0.4, 0, ground * 0.6, w, ground * 0.4)
    c.restore()
    c.globalAlpha = 1
    c.fillStyle = 'rgba(18,10,36,0.5)'
    for (let y = ground; y < h; y += 4 * u) c.fillRect(0, y, w, Math.max(1, 1.2 * u))
    // walkers with umbrellas, silhouettes only
    for (const wk of this.walkers) {
      const x = wk.x * w
      const s = wk.size * u
      const bob = Math.sin(this.t * 6 + wk.ph) * 0.6 * s
      const y = ground + 8 * s
      c.fillStyle = '#07040f'
      c.fillRect(x - 2.5 * s, y - 16 * s + bob, 5 * s, 16 * s)
      c.beginPath()
      c.arc(x, y - 18 * s + bob, 2.6 * s, 0, TAU)
      c.fill()
      c.fillStyle = wk.col
      c.beginPath()
      c.arc(x, y - 21 * s + bob, 9 * s, Math.PI, 0)
      c.fill()
      c.fillStyle = '#07040f'
      c.fillRect(x - 0.3 * s, y - 21 * s + bob, 0.6 * s, 6 * s)
    }
    // rain
    c.strokeStyle = 'rgba(154,245,255,0.35)'
    c.lineWidth = Math.max(1, 0.4 * u)
    if (this.num('rain') > 0)
      for (const d of this.rain) {
        c.beginPath()
        c.moveTo(d.x * w, d.y * h)
        c.lineTo(d.x * w - 1 * u, d.y * h + 5 * u)
        c.stroke()
      }
  }
}
