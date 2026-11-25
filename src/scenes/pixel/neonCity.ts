import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

const SIGNS = ['NOODLES', '24H', 'AFK', 'HOTEL', 'GM', 'BAR', 'ARCADE', 'OPEN', 'RAMEN', 'TAXI']
const NEON = ['#ff2e88', '#22e1ff', '#ffe95a', '#7cff6b', '#ff9a3d', '#a68cff']

interface Sign {
  x: number
  y: number
  text: string
  col: string
  vertical: boolean
  flick: number
}

export function create(ctx: SceneContext) {
  return new NeonCity(ctx)
}

/** A pixel city at night: parallax skyline, flickering neon, traffic on a wet street. */
class NeonCity extends PixelScene {
  layers: { cv: HTMLCanvasElement; speed: number }[] = []
  signs: Sign[] = []
  cars: { x: number; lane: number; v: number; col: string }[] = []
  rain: { x: number; y: number }[] = []
  scroll = 0
  tile = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.45
  }
  get street() {
    return Math.round(this.h * 0.78)
  }
  configure() {
    this.layout()
  }
  layout() {
    const { h, u } = this
    this.tile = Math.round(this.w * 1.5)
    const tile = this.tile
    this.layers = [
      { col: '#1e1240', win: '#3e2a7a', base: 0.6, min: 40, max: 100, speed: 0.15 },
      { col: '#120a24', win: '#ffe95a', base: 0.74, min: 30, max: 120, speed: 0.4 },
    ].map((L, li) => {
      const cv = document.createElement('canvas')
      cv.width = tile
      cv.height = h
      const c = cv.getContext('2d')!
      let x = 0
      while (x < tile) {
        const bw = Math.round(this.r.range(16, 36) * u)
        const bh = Math.round(this.r.range(L.min, L.max) * u)
        const top = Math.round(h * L.base - bh)
        c.fillStyle = L.col
        c.fillRect(x, top, Math.min(bw, tile - x), h)
        // antenna or rooftop box
        if (this.r.chance(0.4)) c.fillRect(x + Math.round(bw / 2), top - Math.round(6 * u), Math.max(1, Math.round(u)), Math.round(6 * u))
        for (let wy = top + 3 * u; wy < h * L.base - 2 * u; wy += 4 * u)
          for (let wx = x + 2 * u; wx < x + bw - 2 * u && wx < tile - 2 * u; wx += 4 * u)
            if (this.r.chance(li ? 0.22 : 0.12)) {
              c.fillStyle = li ? this.r.pick([L.win, '#ff9a3d', '#9af5ff']) : L.win
              c.fillRect(Math.round(wx), Math.round(wy), Math.max(1, Math.round(u * (li ? 2 : 1))), Math.max(1, Math.round(u * (li ? 2 : 1))))
            }
        x += bw + Math.round(this.r.range(0, 3) * u)
      }
      return { cv, speed: L.speed }
    })
    this.signs = Array.from({ length: 7 }, (_, i) => ({
      x: (i / 7) * tile + this.r.range(0, tile / 10),
      y: this.r.range(h * 0.4, h * 0.62),
      text: this.r.pick(SIGNS),
      col: this.r.pick(NEON),
      vertical: this.r.chance(0.4),
      flick: this.r.chance(0.3) ? this.r.range(2, 6) : 0,
    }))
    this.cars = Array.from({ length: Math.round(6 * this.num('traffic')) }, () => this.newCar(true))
    this.rain = Array.from({ length: 150 }, () => ({ x: this.r() * this.w, y: this.r() * this.h }))
  }
  newCar(any: boolean) {
    const lane = this.r.chance(0.5) ? 0 : 1
    const v = this.r.range(30, 60) * this.u * (lane ? -1 : 1)
    return { x: any ? this.r() * this.w : lane ? this.w + 20 : -20, lane, v, col: this.r.pick(['#3e2a7a', '#5a5a7a', '#ff2e88', '#22e1ff']) }
  }
  step(dt: number) {
    this.scroll += dt * 8 * this.u * this.num('pan')
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i]
      car.x += car.v * dt
      if (car.x > this.w + 30 || car.x < -30) this.cars[i] = this.newCar(false)
    }
    if (this.bool('rain'))
      for (const r of this.rain) {
        r.y += dt * 160 * this.u
        r.x -= dt * 20 * this.u
        if (r.y > this.h) {
          r.y = 0
          r.x = this.r() * this.w
        }
        if (r.x < 0) r.x += this.w
      }
  }
  drawSign(s: Sign, x: number, y: number, mirror: boolean) {
    const c = this.c
    const u = this.u
    const on = !s.flick || Math.floor(this.t * s.flick) % 7 !== 0
    c.font = `${Math.round(9 * u)}px "VT323", monospace`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = on ? s.col : '#2c1b5e'
    const pad = 2 * u
    if (s.vertical) {
      const letters = s.text.split('')
      const lh = 8 * u
      if (!mirror) {
        c.fillStyle = '#07040f'
        c.fillRect(x - 5 * u, y - pad, 10 * u, letters.length * lh + pad)
        c.fillStyle = on ? s.col : '#2c1b5e'
      }
      letters.forEach((ch, i) => c.fillText(ch, x, (mirror ? y - i * lh : y + i * lh + lh / 2)))
    } else {
      const tw = c.measureText(s.text).width
      if (!mirror) {
        c.strokeStyle = on ? s.col : '#2c1b5e'
        c.lineWidth = Math.max(1, Math.round(u))
        c.strokeRect(Math.round(x - tw / 2 - pad), Math.round(y - 5 * u), Math.round(tw + pad * 2), Math.round(10 * u))
      }
      c.fillText(s.text, x, y)
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const g = c.createLinearGradient(0, 0, 0, h * 0.75)
    g.addColorStop(0, '#07040f')
    g.addColorStop(1, '#3e2a7a')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // a big moon behind it all
    c.fillStyle = '#a68cff'
    c.beginPath()
    c.arc(w * 0.78, h * 0.22, 18 * u, 0, Math.PI * 2)
    c.fill()
    for (const L of this.layers) {
      const off = (this.scroll * L.speed) % this.tile
      c.drawImage(L.cv, -off, 0)
      c.drawImage(L.cv, -off + this.tile, 0)
    }
    const st = this.street
    const signOff = (this.scroll * 0.4) % this.tile
    for (const s of this.signs) for (const k of [0, 1]) this.drawSign(s, s.x - signOff + k * this.tile, s.y, false)
    // wet street with mirrored neon
    c.fillStyle = '#120a24'
    c.fillRect(0, st, w, h - st)
    c.save()
    c.globalAlpha = 0.45
    for (const s of this.signs)
      for (const k of [0, 1]) {
        const x = s.x - signOff + k * this.tile + Math.round(Math.sin(this.t * 3 + s.y) * u)
        const y = st + (st - s.y) * 0.35 + 6 * u
        if (y < h) this.drawSign(s, x, y, true)
      }
    c.restore()
    // lane markings
    c.fillStyle = '#5a5a7a'
    for (let x = -((this.t * 30 * u) % (20 * u)); x < w; x += 20 * u) c.fillRect(Math.round(x), Math.round(st + (h - st) * 0.5), Math.round(8 * u), Math.max(1, Math.round(u)))
    // cars: body, windows, lights and their streaks on the wet road
    for (const car of this.cars) {
      const y = Math.round(st + (car.lane ? (h - st) * 0.22 : (h - st) * 0.62))
      const x = Math.round(car.x)
      const cw = Math.round(16 * u)
      c.fillStyle = car.col
      c.fillRect(x - cw / 2, y - 4 * u, cw, 4 * u)
      c.fillRect(x - cw / 4, y - 7 * u, cw / 2, 3 * u)
      c.fillStyle = '#9af5ff'
      c.fillRect(x - cw / 4 + u, y - 6 * u, cw / 2 - 2 * u, 2 * u)
      const front = car.v > 0 ? x + cw / 2 : x - cw / 2 - u
      const back = car.v > 0 ? x - cw / 2 - u : x + cw / 2
      c.fillStyle = '#ffffff'
      c.fillRect(front, y - 3 * u, u, u)
      c.fillStyle = '#ff2e88'
      c.fillRect(back, y - 3 * u, u, u)
      c.globalAlpha = 0.35
      c.fillStyle = '#ffe95a'
      c.fillRect(car.v > 0 ? front : front - 14 * u, y + u, 14 * u, u)
      c.globalAlpha = 1
    }
    if (this.bool('rain')) {
      c.fillStyle = '#9af5ff'
      c.globalAlpha = 0.6
      for (const r of this.rain) c.fillRect(Math.round(r.x), Math.round(r.y), 1, Math.max(2, Math.round(3 * u)))
      c.globalAlpha = 1
    }
  }
}
