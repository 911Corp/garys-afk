import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

/** Heat palette: index 0 = cold, 36 = white hot. Colours fall on the warm16 palette. */
const HEAT = [
  '#0c0705', '#1f0a05', '#2f0f07', '#470f07', '#571707', '#671f07', '#771f07', '#8f2707', '#9f2f07', '#af3f07', '#bf4707', '#c74707',
  '#df4f07', '#df5707', '#df5707', '#d75f07', '#d7670f', '#cf6f0f', '#cf770f', '#cf7f0f', '#cf8717', '#c78717', '#c78f17', '#c7971f',
  '#bf9f1f', '#bf9f1f', '#bfa727', '#bfa727', '#bfaf2f', '#b7af2f', '#b7b72f', '#b7b737', '#cfcf6f', '#dfdf9f', '#efefc7', '#ffffff', '#ffffff',
].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])

export function create(ctx: SceneContext) {
  return new Fireplace(ctx)
}

/** The classic pixel fire (heat spreads up and cools at random), framed by a brick hearth. */
class Fireplace extends PixelScene {
  fw = 0
  fh = 0
  fx = 0
  fy = 0
  heat = new Uint8Array(0)
  img: ImageData | null = null
  acc = 0
  embers: { x: number; y: number; vx: number; vy: number; a: number }[] = []
  glow = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.45
  }
  layout() {
    const u = this.u
    this.fw = Math.round(96 * u)
    this.fh = Math.round(66 * u)
    this.fx = Math.round(this.w / 2 - this.fw / 2)
    this.fy = Math.round(this.h * 0.86 - this.fh - 12 * u)
    this.heat = new Uint8Array(this.fw * this.fh)
    this.img = this.c.createImageData(this.fw, this.fh)
  }
  spread() {
    const { fw, fh, heat } = this
    const k = this.num('intensity')
    // fuel line along the bottom, shaped by the logs: hotter in the middle
    for (let x = 0; x < fw; x++) {
      const m = 1 - Math.abs(x / fw - 0.5) * 2
      heat[(fh - 1) * fw + x] = m > 0.12 ? Math.min(36, Math.round(20 + m * 16 * k + this.r() * 4)) : 0
    }
    const cool = k > 1 ? 1 : 2 - Math.round(k)
    for (let x = 0; x < fw; x++)
      for (let y = 1; y < fh; y++) {
        const src = y * fw + x
        const v = heat[src]
        if (v === 0) {
          heat[src - fw] = 0
          continue
        }
        const rnd = Math.floor(this.r() * 4)
        const dst = src - rnd + 1 - fw
        if (dst >= 0) heat[dst] = Math.max(0, v - ((rnd & 1) + (this.r() < 0.2 ? cool : 0)))
      }
  }
  step(dt: number) {
    this.acc += dt
    // the fire simulation runs at a fixed 30 steps per second
    while (this.acc > 1 / 30) {
      this.acc -= 1 / 30
      this.spread()
    }
    const u = this.u
    if (this.bool('embers') && this.r.chance(dt * 6)) this.embers.push({ x: this.fx + this.fw * this.r.range(0.3, 0.7), y: this.fy + this.fh * 0.5, vx: this.r.range(-6, 6) * u, vy: -this.r.range(14, 30) * u, a: 0 })
    for (const e of this.embers) {
      e.a += dt
      e.x += e.vx * dt + Math.sin(e.a * 6) * 0.2
      e.y += e.vy * dt
    }
    this.embers = this.embers.filter((e) => e.a < 2.4 && e.y > this.fy - 30 * u)
    this.glow = 0.75 + Math.sin(this.t * 7.3) * 0.08 + Math.sin(this.t * 3.1) * 0.08 + this.r.range(-0.04, 0.04)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    // room wall
    c.fillStyle = '#24120a'
    c.fillRect(0, 0, w, h)
    // warm light on the wall
    const k = this.glow * this.num('glow') * this.g.intensity
    const g = c.createRadialGradient(w / 2, this.fy + this.fh * 0.6, 4, w / 2, this.fy + this.fh * 0.6, w * 0.6)
    g.addColorStop(0, `rgba(240,138,42,${0.55 * k})`)
    g.addColorStop(1, 'rgba(240,138,42,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // floor
    c.fillStyle = '#3f1f0f'
    c.fillRect(0, h * 0.86, w, h)
    c.fillStyle = `rgba(207,90,28,${0.3 * k})`
    c.fillRect(0, h * 0.86, w, 2 * u)
    // brick hearth
    const hx = this.fx - 26 * u
    const hy = this.fy - 30 * u
    const hw = this.fw + 52 * u
    const hh = h * 0.86 - hy
    c.fillStyle = '#5c4434'
    c.fillRect(hx, hy, hw, hh)
    const bw = 12 * u
    const bh = 5 * u
    c.fillStyle = '#3a2a22'
    for (let row = 0; row * bh < hh; row++) {
      c.fillRect(hx, hy + row * bh, hw, Math.max(1, u * 0.7))
      for (let x = (row % 2) * (bw / 2); x < hw; x += bw) c.fillRect(hx + x, hy + row * bh, Math.max(1, u * 0.7), bh)
    }
    // mantel
    c.fillStyle = '#8a6a52'
    c.fillRect(hx - 8 * u, hy - 6 * u, hw + 16 * u, 6 * u)
    c.fillStyle = '#5c4434'
    c.fillRect(hx - 8 * u, hy - 1 * u, hw + 16 * u, 1 * u)
    // things on the mantel: a clock, two candles, a small plant
    c.fillStyle = '#b89a7c'
    c.fillRect(hx + 8 * u, hy - 20 * u, 14 * u, 14 * u)
    c.fillStyle = '#24120a'
    c.fillRect(hx + 14.5 * u, hy - 16 * u, 1 * u, 6 * u)
    c.fillRect(hx + 14.5 * u, hy - 13 * u, 4 * u, 1 * u)
    for (const cx of [hx + hw - 30 * u, hx + hw - 22 * u]) {
      c.fillStyle = '#fffbe8'
      c.fillRect(cx, hy - 16 * u, 4 * u, 10 * u)
      c.fillStyle = Math.floor(this.t * 6 + cx) % 3 ? '#ffbe4f' : '#f08a2a'
      c.fillRect(cx + 1 * u, hy - 20 * u, 2 * u, 3 * u)
    }
    c.fillStyle = '#3a2a22'
    c.fillRect(hx + hw / 2 - 5 * u, hy - 12 * u, 10 * u, 6 * u)
    // firebox opening
    c.fillStyle = '#0c0705'
    c.fillRect(this.fx - 6 * u, this.fy - 8 * u, this.fw + 12 * u, this.fh + 8 * u)
    // the fire itself
    const img = this.img!
    const d = img.data
    for (let i = 0; i < this.heat.length; i++) {
      const v = this.heat[i]
      const col = HEAT[v]
      d[i * 4] = col[0]
      d[i * 4 + 1] = col[1]
      d[i * 4 + 2] = col[2]
      d[i * 4 + 3] = v < 2 ? 0 : 255
    }
    // putImageData ignores alpha blending, so draw through a temporary bitmap via drawImage
    const tmp = this.tmpCanvas()
    tmp.getContext('2d')!.putImageData(img, 0, 0)
    c.drawImage(tmp, this.fx, this.fy)
    // logs
    c.fillStyle = '#4a3222'
    c.fillRect(this.fx + this.fw * 0.18, this.fy + this.fh - 7 * u, this.fw * 0.64, 6 * u)
    c.fillStyle = '#6e4d33'
    c.fillRect(this.fx + this.fw * 0.26, this.fy + this.fh - 12 * u, this.fw * 0.5, 5 * u)
    c.fillStyle = '#cf5a1c'
    for (let i = 0; i < 6; i++) {
      if (Math.sin(this.t * 2 + i * 1.7) > 0.2) c.fillRect(this.fx + this.fw * (0.25 + i * 0.09), this.fy + this.fh - 5 * u, 2 * u, 1 * u)
    }
    // grate
    c.fillStyle = '#1a1d24'
    c.fillRect(this.fx, this.fy + this.fh - 1 * u, this.fw, 2 * u)
    for (let x = 0; x < this.fw; x += 8 * u) c.fillRect(this.fx + x, this.fy + this.fh - 4 * u, 1 * u, 4 * u)
    // embers
    for (const e of this.embers) {
      c.fillStyle = e.a < 1 ? '#ffe9a3' : e.a < 1.8 ? '#ffbe4f' : '#cf5a1c'
      c.fillRect(Math.round(e.x), Math.round(e.y), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)))
    }
    // rug
    c.fillStyle = '#682e14'
    c.fillRect(w / 2 - 70 * u, h * 0.92, 140 * u, 10 * u)
    c.fillStyle = '#9a3d16'
    c.fillRect(w / 2 - 64 * u, h * 0.935, 128 * u, 2 * u)
  }
  private _tmp: HTMLCanvasElement | null = null
  tmpCanvas() {
    if (!this._tmp || this._tmp.width !== this.fw || this._tmp.height !== this.fh) {
      this._tmp = document.createElement('canvas')
      this._tmp.width = this.fw
      this._tmp.height = this.fh
    }
    return this._tmp
  }
  dispose() {
    this._tmp = null
  }
}
