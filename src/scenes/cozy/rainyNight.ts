import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

const CITY: Record<string, { sky: string[]; far: string; near: string; lit: string[] }> = {
  warm: { sky: ['#0c0a1a', '#141228', '#1e1a36', '#2a2244'], far: '#1a1630', near: '#100e1e', lit: ['#ffcf6a', '#ffb050', '#ffe6a0'] },
  cool: { sky: ['#06101c', '#0a1828', '#102236', '#183048'], far: '#0e1c2e', near: '#08121e', lit: ['#a8d8ff', '#e0f0ff', '#78b8e8'] },
  neon: { sky: ['#0c0618', '#160a28', '#220e3a', '#30124a'], far: '#1a0c2c', near: '#0e0618', lit: ['#ff4fa8', '#4ff0ff', '#ffe04f'] },
}

const C = {
  frame: '#5a3a2a',
  frame2: '#7a5038',
  frame3: '#3a2418',
  wall: '#2a1e28',
  wall2: '#34262f',
  sill: '#8a6040',
  sill2: '#a87850',
  wax: '#f4ead2',
  holder: '#c8963a',
  pot: '#b8603a',
  leaf: '#3e7a46',
  leaf2: '#5ea050',
  mug: '#d8d0c0',
  drop: '#c8dcf0',
  drop2: '#8aa8d0',
  rain: '#5a6a9a',
}

type Drop = { x: number; y: number; size: number; vy: number; still: number }

export function create(ctx: SceneContext) {
  return new RainyNight(ctx)
}

/**
 * Pixel art: a window over a rainy city at night. Drops gather on the glass, grow, then slide
 * down leaving a trail; a candle burns on the sill next to a plant and a mug of tea.
 */
class RainyNight extends PixelArtScene {
  city!: HTMLCanvasElement
  drops: Drop[] = []
  rain: { x: number; y: number }[] = []
  trails: { x: number; y: number; life: number }[] = []
  lights: { x: number; y: number; on: boolean; t: number; col: number }[] = []
  flash = 0
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.15
  }
  get W() {
    // window geometry: a big pane centred, with a sill below
    const { PW, PH } = this
    const portrait = PH > PW
    const x0 = portrait ? 10 : Math.round(PW * 0.16)
    const x1 = PW - x0
    const y0 = portrait ? 16 : 10
    const y1 = Math.round(PH * (portrait ? 0.66 : 0.74))
    return { x0, x1, y0, y1 }
  }
  configure() {
    this.build()
  }
  build() {
    const { PW, PH } = this
    const W = this.W
    const K = CITY[this.str('city')] ?? CITY.warm
    const R = rng(31)
    const s = document.createElement('canvas')
    s.width = PW
    s.height = PH
    const c = s.getContext('2d')!
    const px = (x: number, y: number, w: number, h: number, col: string) => {
      c.fillStyle = col
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }
    // sky bands inside the window
    const bh = (W.y1 - W.y0) / K.sky.length
    K.sky.forEach((col, i) => px(W.x0, W.y0 + i * bh, W.x1 - W.x0, bh + 1, col))
    // far skyline then near buildings, with lit windows recorded for blinking
    this.lights = []
    const skyline = (base: number, minH: number, maxH: number, col: string, near: boolean) => {
      let x = W.x0
      while (x < W.x1) {
        const bw = Math.min(W.x1 - x, R.int(near ? 10 : 6, near ? 22 : 14))
        const bhh = R.int(minH, maxH)
        px(x, base - bhh, bw, bhh, col)
        if (R.chance(0.3)) px(x + Math.floor(bw / 2) - 1, base - bhh - 4, 1, 4, col)
        if (near) {
          for (let wy = base - bhh + 3; wy < base - 2; wy += 4)
            for (let wx = x + 2; wx < x + bw - 2; wx += 3)
              if (R.chance(0.5)) this.lights.push({ x: wx, y: wy, on: R.chance(0.6), t: R.range(2, 20), col: R.int(0, K.lit.length - 1) })
        } else {
          for (let wy = base - bhh + 2; wy < base - 1; wy += 3)
            for (let wx = x + 1; wx < x + bw - 1; wx += 2) if (R.chance(0.2)) px(wx, wy, 1, 1, K.lit[0] + '88')
        }
        x += bw + R.int(0, 2)
      }
    }
    const horizon = W.y1
    skyline(horizon, 14, Math.round((W.y1 - W.y0) * 0.55), K.far, false)
    skyline(horizon, 10, Math.round((W.y1 - W.y0) * 0.4), K.near, true)
    this.city = s
    this.rain = Array.from({ length: 60 }, () => ({ x: R.int(W.x0, W.x1), y: R.int(W.y0, W.y1) }))
    this.drops = Array.from({ length: 40 }, () => this.newDrop(R()))
  }
  newDrop(r = Math.random()): Drop {
    const W = this.W
    return { x: Math.round(W.x0 + 2 + r * (W.x1 - W.x0 - 4)), y: Math.round(W.y0 + 2 + this.r() * (W.y1 - W.y0 - 6)), size: 1, vy: 0, still: this.r.range(1, 6) }
  }
  step(dt: number) {
    if (!this.city) return
    const W = this.W
    const rain = this.num('rain')
    const glass = this.num('glass')
    for (const r of this.rain) {
      r.y += dt * 120 * rain
      r.x -= dt * 12
      if (r.y > W.y1) {
        r.y = W.y0
        r.x = W.x0 + this.r() * (W.x1 - W.x0)
      }
      if (r.x < W.x0) r.x = W.x1
    }
    // drops on the glass: grow while still, then run down
    const want = Math.round(40 * glass)
    while (this.drops.length < want) this.drops.push(this.newDrop())
    if (this.drops.length > want) this.drops.length = want
    for (const d of this.drops) {
      if (d.vy === 0) {
        d.still -= dt
        if (d.still < 0 && d.size < 3 && this.r.chance(dt * 2)) d.size++
        if (d.size >= 3 && d.still < -2) d.vy = this.r.range(10, 22)
      } else {
        d.y += d.vy * dt
        if (this.r.chance(dt * 8)) this.trails.push({ x: d.x, y: d.y - 1, life: 2.5 })
        if (this.r.chance(dt * 1.5)) d.x += this.r.chance(0.5) ? 1 : -1
        if (d.y > W.y1 - 2) Object.assign(d, this.newDrop())
      }
    }
    for (const t of this.trails) t.life -= dt
    this.trails = this.trails.filter((t) => t.life > 0)
    for (const l of this.lights) {
      l.t -= dt
      if (l.t < 0) {
        l.on = !l.on
        l.t = this.r.range(4, 30)
      }
    }
    if (this.bool('lightning') && !this.g.noFlash && this.flash <= 0 && this.r.chance(dt / 40)) {
      this.flash = 0.5
      this.emit({ type: 'thunder', strength: 0.4, delay: 2.5 })
    }
    this.flash = Math.max(0, this.flash - dt)
  }
  compose() {
    const { PW, PH } = this
    const W = this.W
    const K = CITY[this.str('city')] ?? CITY.warm
    const t = this.t
    // room wall around the window
    this.px(0, 0, PW, PH, C.wall)
    for (let x = 0; x < PW; x += 10) this.px(x, 0, 5, PH, C.wall2)
    this.b.drawImage(this.city, 0, 0)
    for (const l of this.lights) if (l.on && l.x + 2 <= W.x1) this.px(l.x, l.y, 2, 2, K.lit[l.col])
    if (this.flash > 0) {
      this.b.fillStyle = `rgba(200,214,240,${this.flash * (this.g.reducedMotion ? 0.2 : 0.45)})`
      this.b.fillRect(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0)
    }
    // falling rain outside
    for (const r of this.rain) {
      this.dot(r.x, r.y, C.rain)
      this.dot(r.x, r.y + 1, C.rain)
    }
    // drops on the glass and their trails
    for (const tr of this.trails) this.dot(tr.x, tr.y, tr.life > 1.2 ? C.drop2 : C.rain)
    for (const d of this.drops) {
      if (d.size === 1) this.dot(d.x, d.y, C.drop2)
      else {
        this.px(d.x, d.y, d.size - 1, d.size, C.drop2)
        this.dot(d.x, d.y, C.drop)
      }
    }
    // window frame and mullions
    this.px(W.x0 - 4, W.y0 - 4, W.x1 - W.x0 + 8, 4, C.frame)
    this.px(W.x0 - 4, W.y0 - 4, 4, W.y1 - W.y0 + 8, C.frame)
    this.px(W.x1, W.y0 - 4, 4, W.y1 - W.y0 + 8, C.frame)
    this.px(W.x0 - 4, W.y0 - 4, W.x1 - W.x0 + 8, 1, C.frame2)
    const mx = Math.round((W.x0 + W.x1) / 2)
    this.px(mx - 1, W.y0, 3, W.y1 - W.y0, C.frame)
    this.px(W.x0, Math.round((W.y0 + W.y1) / 2) - 1, W.x1 - W.x0, 3, C.frame)
    this.px(mx - 1, W.y0, 1, W.y1 - W.y0, C.frame2)
    // sill
    const sy = W.y1
    this.px(W.x0 - 8, sy, W.x1 - W.x0 + 16, 4, C.sill)
    this.px(W.x0 - 8, sy, W.x1 - W.x0 + 16, 1, C.sill2)
    this.px(W.x0 - 6, sy + 4, W.x1 - W.x0 + 12, 2, C.frame3)
    // radiator under the sill
    const ry = sy + 12
    if (ry + 14 < PH) {
      const rx0 = mx - 30
      for (let k = 0; k < 10; k++) {
        this.px(rx0 + k * 6, ry, 5, 18, '#5a5060')
        this.px(rx0 + k * 6, ry, 1, 18, '#7a7084')
      }
      this.px(rx0 - 2, ry + 18, 62, 2, '#3a3440')
    }
    // candle in a brass holder, flame flickering, warm glow on the glass
    if (this.bool('candle')) {
      const cx = W.x0 + 12
      const g = this.b.createRadialGradient(cx, sy - 12, 1, cx, sy - 12, 30)
      g.addColorStop(0, 'rgba(255,190,90,0.35)')
      g.addColorStop(1, 'rgba(255,190,90,0)')
      this.b.fillStyle = g
      this.b.fillRect(cx - 30, sy - 42, 60, 46)
      this.px(cx - 3, sy - 2, 7, 2, C.holder)
      this.px(cx - 1, sy - 11, 3, 9, C.wax)
      this.dot(cx, sy - 12, '#2a1e1e')
      const fl = Math.sin(t * 9) > 0.3 ? 1 : 0
      this.px(cx, sy - 15 - fl, 1, 3 + fl, '#ffd060')
      this.dot(cx, sy - 13, '#ffffff')
    }
    // a small plant and a mug of tea at the other end
    const px2 = W.x1 - 16
    this.px(px2, sy - 6, 7, 6, C.pot)
    this.px(px2 - 1, sy - 7, 9, 1, '#d07a4a')
    for (const [dx, h] of [
      [0, 6],
      [2, 9],
      [4, 7],
      [6, 5],
    ]) {
      for (let k = 0; k < h; k++) this.dot(px2 + dx + (k > h / 2 ? (dx < 3 ? -1 : 1) : 0), sy - 8 - k, k % 2 ? C.leaf : C.leaf2)
    }
    const mx2 = W.x1 - 30
    this.px(mx2, sy - 6, 6, 6, C.mug)
    this.px(mx2 + 6, sy - 5, 2, 3, C.mug)
    this.px(mx2 + 1, sy - 5, 4, 1, '#8a5a3a')
    const st = (t * 0.5) % 1
    this.dot(mx2 + 2 + Math.round(Math.sin(t * 2)), sy - 8 - Math.round(st * 5), '#d8d0c088')
  }
}
