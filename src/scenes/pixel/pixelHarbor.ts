import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Boat = { x: number; s: number; ph: number; col: string; sail: boolean; v: number }

export function create(ctx: SceneContext) {
  return new PixelHarbor(ctx)
}

/** A fishing harbor at dusk: houses on the hill light up, boats rock at the quay, the lighthouse sweeps the bay. */
class PixelHarbor extends PixelScene {
  houses: { x: number; y: number; w: number; h: number; col: string; roof: string; win: number[] }[] = []
  boats: Boat[] = []
  gulls: { x: number; y: number; v: number; ph: number }[] = []
  stars: { x: number; y: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.console16
  }
  dither() {
    return 0.45
  }
  layout() {
    const r = this.r
    this.houses = []
    for (let i = 0; i < 26; i++) {
      const x = r.range(0.02, 0.62)
      this.houses.push({ x, y: 0.5 - x * 0.25 + r.range(-0.05, 0.05), w: r.range(0.035, 0.06), h: r.range(0.04, 0.07), col: r.pick(['#f2f0e6', '#f3a64b', '#e2614f', '#b6e3f0', '#f7e07a']), roof: r.pick(['#a23e5c', '#55305a', '#2b2236']), win: [r(), r()] })
    }
    this.houses.sort((a, b) => a.y - b.y)
    this.boats = Array.from({ length: 5 }, (_, i) => ({ x: 0.1 + i * 0.17 + r.range(-0.03, 0.03), s: r.range(0.8, 1.2), ph: r() * TAU, col: r.pick(['#e2614f', '#2f6fb0', '#3e9a4e', '#f7e07a']), sail: r.chance(0.4), v: 0 }))
    this.boats.push({ x: 1.1, s: 1, ph: 0, col: '#f2f0e6', sail: true, v: -0.01 })
    this.gulls = Array.from({ length: 4 }, () => ({ x: r(), y: r.range(0.1, 0.3), v: r.range(0.01, 0.03), ph: r() * TAU }))
    this.stars = Array.from({ length: 80 }, () => ({ x: r(), y: r() * 0.35 }))
  }
  step(dt: number) {
    for (const b of this.boats) {
      if (b.v) {
        b.x += b.v * dt
        if (b.x < -0.2) b.x = 1.2
      }
    }
    for (const g of this.gulls) {
      g.x += g.v * dt
      if (g.x > 1.1) g.x = -0.1
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const dusk = (Math.sin(this.t * 0.02 * this.num('cycle')) + 1) / 2 // 0 = evening, 1 = night
    const sea = h * 0.6
    const sky = c.createLinearGradient(0, 0, 0, sea)
    sky.addColorStop(0, dusk > 0.5 ? '#0d0b14' : '#2b2236')
    sky.addColorStop(0.7, dusk > 0.5 ? '#1e3d5c' : '#a23e5c')
    sky.addColorStop(1, dusk > 0.5 ? '#2b2236' : '#f3a64b')
    c.fillStyle = sky
    c.fillRect(0, 0, w, sea)
    c.fillStyle = '#f2f0e6'
    c.globalAlpha = dusk
    for (const s of this.stars) c.fillRect(s.x * w, s.y * h, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
    c.globalAlpha = 1
    // hill
    c.fillStyle = '#25604f'
    c.beginPath()
    c.moveTo(0, sea)
    c.lineTo(0, h * 0.28)
    c.quadraticCurveTo(w * 0.35, h * 0.3, w * 0.7, sea)
    c.fill()
    // houses
    for (const hs of this.houses) {
      const x = hs.x * w
      const y = hs.y * h
      const hw = hs.w * Math.max(w, h * 1.4)
      const hh = hs.h * h
      if (y + hh > sea) continue
      c.fillStyle = hs.col
      c.fillRect(x, y, hw, hh)
      c.fillStyle = hs.roof
      c.beginPath()
      c.moveTo(x - hw * 0.1, y)
      c.lineTo(x + hw / 2, y - hh * 0.6)
      c.lineTo(x + hw * 1.1, y)
      c.fill()
      // windows light up as night falls
      hs.win.forEach((v, k) => {
        const lit = v < dusk
        c.fillStyle = lit ? '#f7e07a' : '#1e3d5c'
        c.fillRect(x + hw * (0.2 + k * 0.4), y + hh * 0.3, hw * 0.2, hh * 0.3)
      })
      c.fillStyle = 'rgba(13,11,20,' + dusk * 0.45 + ')'
      c.fillRect(x - hw * 0.1, y - hh * 0.6, hw * 1.2, hh * 1.6)
    }
    // lighthouse on the right point
    const lx = w * 0.86
    const ly = sea - 4 * u
    c.fillStyle = '#2b2236'
    c.beginPath()
    c.moveTo(w * 0.72, sea)
    c.quadraticCurveTo(w * 0.85, sea - 14 * u, w, sea - 10 * u)
    c.lineTo(w, sea)
    c.fill()
    for (let k = 0; k < 5; k++) {
      c.fillStyle = k % 2 ? '#f2f0e6' : '#e2614f'
      c.fillRect(lx - (5 - k * 0.4) * u, ly - 10 * u - k * 8 * u, (10 - k * 0.8) * u, 8 * u)
    }
    c.fillStyle = '#0d0b14'
    c.fillRect(lx - 4 * u, ly - 56 * u, 8 * u, 6 * u)
    const lampY = ly - 53 * u
    const a = this.t * 0.8
    const beam = Math.cos(a)
    glow(c, lx, lampY, 10 * u, 'rgba(247,224,122,0.9)')
    c.fillStyle = `rgba(247,224,122,${0.12 + 0.18 * dusk})`
    c.beginPath()
    c.moveTo(lx, lampY)
    c.lineTo(lx + beam * w * 1.2, lampY - 18 * u)
    c.lineTo(lx + beam * w * 1.2, lampY + 18 * u)
    c.fill()
    // sea
    const sg = c.createLinearGradient(0, sea, 0, h)
    sg.addColorStop(0, dusk > 0.5 ? '#1e3d5c' : '#2f6fb0')
    sg.addColorStop(1, '#0d0b14')
    c.fillStyle = sg
    c.fillRect(0, sea, w, h - sea)
    for (let i = 0; i < 50; i++) {
      const y = sea + ((i * 0.37) % 1) * (h - sea)
      const x = ((i * 0.61 + this.t * 0.01 * ((i % 3) + 1)) % 1) * w
      c.fillStyle = i % 4 ? 'rgba(182,227,240,0.25)' : 'rgba(247,224,122,0.35)'
      c.fillRect(x, y, (6 + (i % 5) * 3) * u, Math.max(1, 0.6 * u))
    }
    // quay
    const qy = h * 0.8
    c.fillStyle = '#55305a'
    c.fillRect(0, qy, w * 0.75, 6 * u)
    c.fillStyle = '#2b2236'
    for (let x = 4 * u; x < w * 0.75; x += 24 * u) c.fillRect(x, qy + 6 * u, 3 * u, h - qy)
    // boats rocking along the quay
    for (const b of this.boats) {
      const bx = b.x * w
      const by = (b.v ? sea + 8 * u : qy - 1 * u) + Math.sin(this.t * 1.4 + b.ph) * 1.2 * u
      const s = b.s * u * (b.v ? 0.6 : 1)
      const tilt = Math.sin(this.t * 1.1 + b.ph) * 0.06
      c.save()
      c.translate(bx, by)
      c.rotate(tilt)
      c.fillStyle = b.col
      c.beginPath()
      c.moveTo(-14 * s, -5 * s)
      c.lineTo(14 * s, -5 * s)
      c.lineTo(10 * s, 2 * s)
      c.lineTo(-11 * s, 2 * s)
      c.fill()
      c.fillStyle = '#f2f0e6'
      c.fillRect(-14 * s, -5 * s, 28 * s, 1.2 * s)
      if (b.sail) {
        c.fillStyle = '#0d0b14'
        c.fillRect(-0.5 * s, -26 * s, 1 * s, 21 * s)
        c.fillStyle = '#f2f0e6'
        c.beginPath()
        c.moveTo(0.5 * s, -25 * s)
        c.lineTo(11 * s, -7 * s)
        c.lineTo(0.5 * s, -7 * s)
        c.fill()
      } else {
        c.fillStyle = '#f2f0e6'
        c.fillRect(-6 * s, -11 * s, 9 * s, 6 * s)
        c.fillStyle = dusk > 0.4 ? '#f7e07a' : '#1e3d5c'
        c.fillRect(-4 * s, -9.5 * s, 2.5 * s, 2 * s)
      }
      c.restore()
    }
    // gulls
    c.strokeStyle = '#f2f0e6'
    c.lineWidth = Math.max(1, 0.6 * u)
    for (const g of this.gulls) {
      const x = g.x * w
      const y = g.y * h + Math.sin(this.t + g.ph) * 4 * u
      const f = Math.sin(this.t * 5 + g.ph) * 2 * u
      c.beginPath()
      c.moveTo(x - 4 * u, y - f)
      c.quadraticCurveTo(x - 2 * u, y - 2 * u, x, y)
      c.quadraticCurveTo(x + 2 * u, y - 2 * u, x + 4 * u, y - f)
      c.stroke()
    }
  }
}
