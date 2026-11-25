import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

type House = { x: number; y: number; w: number; h: number; wall: string; roof: string; win: number[] }
type Boat = { x: number; y: number; col: string; sail: boolean; ph: number; v: number }

export function create(ctx: SceneContext) {
  return new PixelHarbor(ctx)
}

/**
 * Pixel art: a fishing harbour on a hillside as evening turns to night. Houses climb the slope
 * in rows and light up one by one, boats rock at the quay, the lighthouse turns its beam.
 */
class PixelHarbor extends PixelArtScene {
  houses: House[] = []
  boats: Boat[] = []
  gulls: { x: number; y: number; v: number; ph: number }[] = []
  stars: { x: number; y: number }[] = []
  dusk = 0
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.console16
  }
  dither() {
    return 0.15
  }
  get geo() {
    const { PW, PH } = this
    const portrait = PH > PW
    return { sea: Math.round(PH * (portrait ? 0.62 : 0.6)), quay: Math.round(PH * (portrait ? 0.76 : 0.78)), hillW: Math.round(PW * (portrait ? 0.9 : 0.6)) }
  }
  build() {
    const { PW } = this
    const g = this.geo
    const R = rng(66)
    // houses in terraces up the hill, back rows first so the front ones overlap
    this.houses = []
    const walls = ['#f2f0e6', '#f3a64b', '#e2614f', '#b6e3f0', '#f7e07a', '#e8c8a8']
    const roofs = ['#a23e5c', '#55305a', '#7a2a3a', '#4a2a4e']
    for (let row = 0; row < 4; row++) {
      const y = g.sea - 8 - row * 11
      const xmax = g.hillW * (1 - row * 0.18)
      let x = 2 + row * 3
      while (x < xmax - 10) {
        const w = R.int(10, 16)
        this.houses.push({ x, y, w, h: R.int(8, 11), wall: R.pick(walls), roof: R.pick(roofs), win: [R(), R(), R()] })
        x += w + R.int(1, 3)
      }
    }
    this.houses.sort((a, b) => a.y - b.y)
    this.boats = [0.1, 0.24, 0.38, 0.52, 0.66].map((k, i) => ({ x: Math.round(PW * k), y: g.quay - 1, col: R.pick(['#e2614f', '#2f6fb0', '#3e9a4e', '#f7e07a', '#f2f0e6']), sail: i % 2 === 1, ph: R() * 6, v: 0 }))
    this.boats.push({ x: PW + 20, y: g.sea + 6, col: '#f2f0e6', sail: true, ph: 0, v: -4 })
    this.gulls = Array.from({ length: 4 }, () => ({ x: R() * PW, y: R.int(8, 34), v: R.range(5, 10), ph: R() * 6 }))
    this.stars = Array.from({ length: 50 }, () => ({ x: R.int(0, PW), y: R.int(0, g.sea - 40) }))
  }
  step(dt: number) {
    this.dusk = (Math.sin(this.t * 0.02 * this.num('cycle') - 1.2) + 1) / 2
    for (const b of this.boats)
      if (b.v) {
        b.x += b.v * dt
        if (b.x < -20) b.x = this.PW + 20
      }
    for (const gl of this.gulls) {
      gl.x += gl.v * dt
      if (gl.x > this.PW + 4) gl.x = -4
    }
  }
  compose() {
    const { PW, PH } = this
    const g = this.geo
    const t = this.t
    const d = this.dusk
    const night = d > 0.55
    this.bands(0, g.sea, night ? ['#0d0b14', '#141228', '#1e1a3a', '#2b2252'] : ['#2b2236', '#55305a', '#a23e5c', '#f3a64b'])
    if (night) for (const s of this.stars) this.dot(s.x, s.y, '#f2f0e6')
    else this.disc(Math.round(PW * 0.62), g.sea - 4, 9, '#f7e07a')
    // the hill
    for (let x = 0; x < g.hillW + 20; x++) {
      const k = x / (g.hillW + 20)
      const y = Math.round(g.sea - 52 + k * k * 52)
      this.px(x, y, 1, g.sea - y, night ? '#163a30' : '#25604f')
      this.dot(x, y, night ? '#1e4a3a' : '#3e9a4e')
    }
    // houses with windows that light up as night falls
    for (const h of this.houses) {
      this.px(h.x, h.y - h.h, h.w, h.h, h.wall)
      this.px(h.x + h.w - 2, h.y - h.h, 2, h.h, '#00000022')
      for (let k = 0; k < 4; k++) this.px(h.x - 1 + k, h.y - h.h - 1 - k, h.w + 2 - k * 2, 1, h.roof)
      this.px(h.x + Math.round(h.w / 2) - 1, h.y - 3, 2, 3, '#4a2a2a')
      h.win.forEach((v, k) => {
        if (k > 1 && h.w < 13) return
        const lit = v < d
        this.px(h.x + 2 + k * 4, h.y - h.h + 3, 2, 2, lit ? '#f7e07a' : '#1e3d5c')
      })
      if (night) {
        this.b.fillStyle = 'rgba(13,11,20,0.35)'
        this.b.fillRect(h.x, h.y - h.h - 4, h.w, h.h + 4)
      }
    }
    // lighthouse on the point
    const lx = PW - 22
    for (let x = PW - 44; x < PW; x++) {
      const y = Math.round(g.sea - 6 + Math.abs(x - (PW - 22)) * 0.2)
      this.px(x, y, 1, g.sea - y + 1, night ? '#2b2236' : '#4a2a4e')
    }
    for (let k = 0; k < 6; k++) this.px(lx - 3 + Math.floor(k / 3), g.sea - 12 - k * 6, 7 - Math.floor(k / 3) * 2, 6, k % 2 ? '#f2f0e6' : '#e2614f')
    this.px(lx - 3, g.sea - 52, 7, 4, '#2b2236')
    this.px(lx - 2, g.sea - 49, 5, 3, '#f7e07a')
    // turning beam
    const a = t * 0.9
    const dir = Math.cos(a)
    if (Math.abs(dir) > 0.15) {
      this.b.fillStyle = `rgba(247,224,122,${0.1 + 0.2 * d})`
      this.b.beginPath()
      this.b.moveTo(lx, g.sea - 48)
      this.b.lineTo(lx + dir * PW, g.sea - 58)
      this.b.lineTo(lx + dir * PW, g.sea - 38)
      this.b.fill()
    }
    // sea with reflection strips
    for (let y = g.sea; y < PH; y++) this.px(0, y, PW, 1, y < g.sea + 6 ? (night ? '#1e3d5c' : '#2f6fb0') : night ? '#122a44' : '#1e3d5c')
    for (let i = 0; i < 40; i++) {
      const y = g.sea + 2 + ((i * 7) % (PH - g.sea - 2))
      const x = Math.round(((i * 41 + t * (2 + (i % 3))) % (PW + 20)) - 10)
      this.px(x, y, 3 + (i % 4), 1, i % 5 === 0 ? '#f7e07a' : '#5ab4e5')
    }
    // quay with bollards
    this.px(0, g.quay, Math.round(PW * 0.78), 4, '#55305a')
    this.px(0, g.quay, Math.round(PW * 0.78), 1, '#8b8598')
    for (let x = 4; x < PW * 0.78; x += 16) {
      this.px(x, g.quay - 3, 2, 3, '#2b2236')
      this.px(x, g.quay + 4, 2, PH - g.quay, '#2b2236')
    }
    // boats rocking
    for (const b of this.boats) {
      const bob = Math.sin(t * 1.4 + b.ph) > 0 ? 1 : 0
      const x = Math.round(b.x)
      const y = (b.v ? b.y : g.quay - 1) + bob
      const s = b.v ? 0.7 : 1
      const len = Math.round(18 * s)
      for (let k = 0; k < 4; k++) this.px(x - len / 2 + k, y - 4 + k, len - k * 2, 1, b.col)
      this.px(x - len / 2, y - 5, len, 1, '#f2f0e6')
      if (b.sail) {
        this.px(x, y - 18 * s, 1, 13 * s, '#2b2236')
        for (let k = 0; k < 11 * s; k++) this.px(x + 1, y - 17 * s + k, Math.round(k * 0.7), 1, '#f2f0e6')
      } else {
        this.px(x - 4, y - 10, 7, 5, '#f2f0e6')
        this.px(x - 2, y - 9, 2, 2, d > 0.4 ? '#f7e07a' : '#1e3d5c')
        this.px(x + 1, y - 13, 1, 3, '#2b2236')
      }
    }
    // gulls
    for (const gl of this.gulls) {
      const f = Math.sin(t * 6 + gl.ph) > 0 ? -1 : 0
      const x = Math.round(gl.x)
      const y = Math.round(gl.y)
      this.dot(x - 2, y + f, '#f2f0e6')
      this.dot(x - 1, y, '#f2f0e6')
      this.dot(x, y + 1, '#f2f0e6')
      this.dot(x + 1, y, '#f2f0e6')
      this.dot(x + 2, y + f, '#f2f0e6')
    }
  }
}
