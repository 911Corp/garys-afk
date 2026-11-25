import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

type Pal = {
  sky: string[]
  cloud: [string, string]
  far: [string, string]
  rock: [string, string, string, string]
  moss: [string, string]
  leaf: [string, string, string]
  trunk: string
  water: string[]
  pool: [string, string, string]
  foam: string
  sun: string | null
  moon: boolean
}

const PALS: Record<string, Pal> = {
  day: {
    sky: ['#4f8fd6', '#63a3e0', '#7ab8ea', '#94cbf0', '#b4ddf4'],
    cloud: ['#ffffff', '#d4ecfa'],
    far: ['#8ab4c8', '#a8c8d4'],
    rock: ['#3b3a4a', '#575566', '#78748a', '#9a96a8'],
    moss: ['#3e8a3c', '#6cbf4a'],
    leaf: ['#1f5a32', '#2f7a3a', '#4fa046'],
    trunk: '#4a3226',
    water: ['#ffffff', '#d4f0ff', '#9fd8f4', '#6cb8e8', '#4a98d0'],
    pool: ['#3e86c0', '#2e6aa0', '#24507e'],
    foam: '#ffffff',
    sun: '#fff4c0',
    moon: false,
  },
  golden: {
    sky: ['#4a3a78', '#7a4a7a', '#c4607a', '#ec8a6a', '#ffc07a'],
    cloud: ['#ffd8a0', '#f0a08a'],
    far: ['#8a5a78', '#b4708a'],
    rock: ['#2e2232', '#4a3442', '#6e4c54', '#946a62'],
    moss: ['#5a6a2a', '#8a8a3a'],
    leaf: ['#22241e', '#363a26', '#56562e'],
    trunk: '#2a1c18',
    water: ['#fff4e0', '#ffd8b0', '#f0b08a', '#c4807a', '#94607a'],
    pool: ['#a0607a', '#7a4a6a', '#4a3050'],
    foam: '#fff0d8',
    sun: '#ffe8a0',
    moon: false,
  },
  night: {
    sky: ['#070a1a', '#0c1228', '#121a36', '#1a2446', '#243058'],
    cloud: ['#2a3660', '#1e2a4e'],
    far: ['#16203e', '#1e2a4c'],
    rock: ['#0c0e18', '#161a28', '#222838', '#30384c'],
    moss: ['#16302a', '#22463a'],
    leaf: ['#060a10', '#0c1420', '#14202e'],
    trunk: '#0a0c14',
    water: ['#e6f0ff', '#b4c8f0', '#7e98d0', '#56709e', '#3a5078'],
    pool: ['#2a3c68', '#1c2a4e', '#121c36'],
    foam: '#dce8ff',
    sun: null,
    moon: true,
  },
}

export function create(ctx: SceneContext) {
  return new Waterfall(ctx)
}

/**
 * A pixel-art waterfall in the 16-bit tradition: the falling water is drawn with colour cycling,
 * the rock is shaded by hand, mist and foam are single pixels, trees and ferns frame the gorge.
 */
class Waterfall extends PixelArtScene {
  stat!: HTMLCanvasElement
  front!: HTMLCanvasElement
  G = { cx: 0, fw: 0, top: 0, pool: 0 }
  colOff: number[] = []
  mist: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  clouds: { x: number; y: number; w: number }[] = []
  birds: { x: number; y: number; v: number }[] = []
  stars: { x: number; y: number; p: number }[] = []
  flow = 0
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.forest16
  }
  dither() {
    return 0.15
  }
  get P() {
    return PALS[this.str('light')] ?? PALS.day
  }
  configure() {
    this.build()
  }
  build() {
    const { PW, PH } = this
    const P = this.P
    const R = rng(77)
    const N = createNoise(9)
    const portrait = PH > PW
    const fw = Math.round(portrait ? PW * 0.34 : PW * 0.17)
    const G = (this.G = { cx: Math.round(PW / 2), fw, top: Math.round(PH * (portrait ? 0.24 : 0.2)), pool: Math.round(PH * (portrait ? 0.74 : 0.72)) })
    this.colOff = Array.from({ length: fw + 6 }, () => R.int(0, 7))
    this.clouds = Array.from({ length: 4 }, () => ({ x: R() * PW, y: R.int(4, Math.max(6, G.top - 14)), w: R.int(10, 22) }))
    this.birds = Array.from({ length: 3 }, () => ({ x: R() * PW, y: R.int(G.top + 8, G.top + 30), v: R.range(6, 12) }))
    this.stars = Array.from({ length: 40 }, () => ({ x: R.int(0, PW - 1), y: R.int(0, G.top), p: R() * 6 }))

    // ---------- static layer: far ridge, cliffs, trees on the rim ----------
    const s = document.createElement('canvas')
    s.width = PW
    s.height = PH
    const c = s.getContext('2d')!
    const px = (x: number, y: number, w: number, h: number, col: string) => {
      c.fillStyle = col
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }
    // far ridge, two tones with a dithered edge
    for (let x = 0; x < PW; x++) {
      const y = Math.round(G.top - 6 - Math.abs(Math.sin(x * 0.045)) * 10 - Math.sin(x * 0.17) * 2)
      px(x, y, 1, PH - y, P.far[1])
      const y2 = Math.round(G.top - 1 - Math.abs(Math.sin(x * 0.07 + 2)) * 6)
      px(x, y2, 1, PH - y2, P.far[0])
    }
    // cliff body: the rim rises away from the notch; rock is shaded in four tones
    const rim = (x: number) => {
      const d = Math.abs(x - G.cx) - fw / 2
      if (d < 0) return G.top
      return Math.round(G.top - Math.min(1, d / (PW * 0.3)) * G.top * 0.45 - (x % 7 === 0 ? 1 : 0))
    }
    for (let x = 0; x < PW; x++) {
      const y0 = rim(x)
      for (let y = y0; y < G.pool; y++) {
        // natural rock: large noise shapes for boulders, fine noise for grain, lit from the upper left
        const big = N.noise2(x / 16, y / 11)
        const fine = N.noise2(x / 3.5, y / 3.5) * 0.14
        const light = (G.cx - x) * (x < G.cx ? 0.004 : -0.002) - (y - G.top) * 0.004
        const v = big + fine + light
        const below = N.noise2(x / 16, (y + 1) / 11) + N.noise2(x / 3.5, (y + 1) / 3.5) * 0.14
        let col = v > 0.35 ? P.rock[3] : v > 0 ? P.rock[2] : v > -0.4 ? P.rock[1] : P.rock[0]
        // a dark crack where a boulder ends above a lower one
        if (Math.floor(big * 3) !== Math.floor((N.noise2(x / 16, (y + 1) / 11)) * 3) && below < v) col = P.rock[0]
        // checker dither at the tone boundaries keeps the 16-bit feel
        if (Math.abs(v) < 0.05 && (x + y) % 2) col = P.rock[1]
        // the rock darkens behind the water
        if (Math.abs(x - G.cx) < fw * 0.75 && col !== P.rock[0]) col = (x + y) % 2 ? P.rock[1] : P.rock[0]
        px(x, y, 1, 1, col)
      }
      // moss on top of each ledge
      for (let y = y0 + 2; y < G.pool; y++)
        if (N.noise2(x / 16, y / 11) > 0.3 && N.noise2(x / 16, (y - 1) / 11) <= 0.3 && Math.abs(x - G.cx) > fw * 0.7 && R.chance(0.45)) {
          px(x, y - 1, 1, 1, P.moss[0])
          if (R.chance(0.5)) px(x, y - 2, 1, 1, P.moss[1])
        }
      // grass along the rim
      px(x, y0 - 1, 1, 1, P.moss[1])
      px(x, y0, 1, 1, P.moss[0])
    }
    // trees on the rim: round canopies with three greens
    const tree = (x: number, base: number, size: number) => {
      px(x, base - size, 2, size, P.trunk)
      const r = Math.round(size * 0.55)
      for (let y = -r; y <= r; y++) {
        const half = Math.floor(Math.sqrt(r * r - y * y))
        for (let k = -half; k <= half; k++) {
          const lit = k + y < -r * 0.3
          const dark = k + y > r * 0.5
          px(x + 1 + k, base - size + y, 1, 1, lit ? P.leaf[2] : dark ? P.leaf[0] : P.leaf[1])
        }
      }
    }
    for (let x = 4; x < PW; x += R.int(9, 16)) {
      if (Math.abs(x - G.cx) < fw * 0.9) continue
      tree(x, rim(x) - 1, R.int(8, 14))
    }
    this.stat = s

    // ---------- foreground: bank, rocks and ferns ----------
    const f = document.createElement('canvas')
    f.width = PW
    f.height = PH
    const fc = f.getContext('2d')!
    const fp = (x: number, y: number, w: number, h: number, col: string) => {
      fc.fillStyle = col
      fc.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }
    for (let x = 0; x < PW; x++) {
      const k = Math.abs(x - PW / 2) / (PW / 2)
      const y = Math.round(PH - 4 - k * k * 16 - (x % 5 === 0 ? 1 : 0))
      fp(x, y, 1, PH - y, P.leaf[0])
      fp(x, y, 1, 1, P.leaf[1])
    }
    const rock = (x: number, y: number, w: number, h: number) => {
      for (let yy = 0; yy < h; yy++) {
        const half = Math.round((w / 2) * Math.sqrt(1 - ((yy - h) / h) ** 2))
        fp(x - half, y - h + yy, half * 2, 1, yy < 2 ? P.rock[3] : yy < h * 0.5 ? P.rock[2] : P.rock[1])
      }
      fp(x - w / 2 + 1, y - h, w * 0.4, 1, P.moss[1])
    }
    rock(Math.round(PW * 0.1), PH - 4, 18, 9)
    rock(Math.round(PW * 0.2), PH - 2, 10, 6)
    rock(Math.round(PW * 0.88), PH - 3, 20, 10)
    // fern fronds: a curved stem with paired leaflets
    const fern = (x0: number, y0: number, dir: number, len: number) => {
      for (let i = 0; i < len; i++) {
        const t = i / len
        const x = x0 + dir * i * 0.9
        const y = y0 - i * 0.9 + t * t * len * 0.7
        fp(x, y, 1, 1, P.leaf[1])
        if (i % 2 === 0 && i < len - 2) {
          const l = Math.max(1, Math.round((1 - t) * 4))
          for (let k = 1; k <= l; k++) {
            fp(x + k * dir * 0.3, y - k, 1, 1, P.leaf[2])
            fp(x + k * dir * 0.3, y + k, 1, 1, P.leaf[0])
          }
        }
      }
    }
    for (let i = 0; i < 5; i++) fern(R.int(-2, 10), PH - R.int(2, 10), 1, R.int(14, 24))
    for (let i = 0; i < 5; i++) fern(PW - R.int(-2, 10), PH - R.int(2, 10), -1, R.int(14, 24))
    this.front = f
    this.mist = []
  }
  step(dt: number) {
    const G = this.G
    const flowK = this.num('flow')
    this.flow += dt * 22 * (0.5 + flowK * 0.5)
    const n = dt * 30 * flowK * this.density
    for (let i = 0; i < n; i++)
      this.mist.push({ x: G.cx + this.r.range(-0.6, 0.6) * G.fw, y: G.pool - 1, vx: this.r.range(-6, 6), vy: -this.r.range(4, 14), life: this.r.range(0.8, 2.2) })
    for (const m of this.mist) {
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.vx *= Math.pow(0.6, dt)
      m.life -= dt
    }
    this.mist = this.mist.filter((m) => m.life > 0)
    for (const cl of this.clouds) {
      cl.x += dt * 1.2
      if (cl.x > this.PW + 20) cl.x = -cl.w - 4
    }
    for (const b of this.birds) {
      b.x += b.v * dt
      if (b.x > this.PW + 4) b.x = -4
    }
  }
  compose() {
    const { PW, PH } = this
    const G = this.G
    const P = this.P
    const t = this.t
    // sky in dithered bands
    this.bands(0, G.pool, P.sky)
    if (P.moon) {
      for (const s of this.stars) if (Math.sin(t * 1.3 + s.p) > -0.2) this.dot(s.x, s.y, '#e6f0ff')
      this.disc(Math.round(PW * 0.78), Math.round(G.top * 0.35) + 2, 4, '#f0f4ff')
      this.disc(Math.round(PW * 0.78) + 2, Math.round(G.top * 0.35) + 1, 3, P.sky[0])
    }
    if (P.sun) {
      const sx = Math.round(PW * 0.2)
      const sy = Math.round(G.top * 0.4) + 2
      this.disc(sx, sy, 6, P.sun)
      // pixel rays
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.2
        this.dot(sx + Math.round(Math.cos(a) * 9), sy + Math.round(Math.sin(a) * 9), P.sun)
      }
    }
    for (const cl of this.clouds) {
      this.px(cl.x, cl.y, cl.w, 3, P.cloud[0])
      this.px(cl.x + 3, cl.y - 2, cl.w - 8, 2, P.cloud[0])
      this.px(cl.x + 1, cl.y + 3, cl.w - 2, 1, P.cloud[1])
    }
    this.b.drawImage(this.stat, 0, 0)
    // the falling water, colour-cycled: each column scrolls its stripes downward
    const half = G.fw / 2
    const W = P.water
    for (let y = G.top; y < G.pool; y++) {
      const k = (y - G.top) / (G.pool - G.top)
      const spread = Math.round(k * 3)
      const x0 = Math.round(G.cx - half - spread)
      const x1 = Math.round(G.cx + half + spread)
      for (let x = x0; x < x1; x++) {
        const col = this.colOff[(x - x0) % this.colOff.length]
        const edge = x - x0 < 2 || x1 - x < 3
        const idx = Math.floor((y - this.flow + col * 3) / 3)
        const band = ((idx % 5) + 5) % 5
        let c = W[Math.min(W.length - 1, band + (edge ? 2 : 0))]
        // the body of the fall is brightest in the middle
        if (!edge && Math.abs(x - G.cx) < half * 0.4 && band > 2) c = W[band - 1]
        this.dot(x, y, c)
      }
    }
    // the lip, where the river rolls over
    this.px(G.cx - half - 1, G.top - 1, G.fw + 2, 1, W[0])
    this.px(G.cx - half, G.top - 2, G.fw, 1, W[1])
    // plunge pool with cycling ripple lines
    for (let y = G.pool; y < PH; y++) {
      const k = (y - G.pool) / (PH - G.pool)
      this.px(0, y, PW, 1, k < 0.3 ? P.pool[0] : k < 0.65 ? P.pool[1] : P.pool[2])
    }
    for (let i = 0; i < 18; i++) {
      const y = G.pool + 2 + ((i * 5) % (PH - G.pool - 3))
      const len = 3 + (i % 4) * 2
      const x = Math.round(((i * 37 + t * (4 + (i % 3) * 2)) % (PW + 20)) - 10)
      this.px(x, y, len, 1, W[2])
    }
    // reflection of the fall
    for (let y = G.pool; y < Math.min(PH, G.pool + 14); y++)
      for (let x = Math.round(G.cx - half); x < G.cx + half; x += 2) if ((x + y + Math.floor(t * 4)) % 3 === 0) this.dot(x, y, W[3])
    // churning foam at the impact
    for (let i = 0; i < G.fw * 1.6; i++) {
      const x = Math.round(G.cx - half - 3 + ((i * 7 + Math.floor(t * 12) * 3) % (G.fw + 6)))
      const y = G.pool - 1 + ((i * 3 + Math.floor(t * 10)) % 4) - 1
      this.dot(x, y, P.foam)
    }
    this.px(G.cx - half - 2, G.pool, G.fw + 4, 1, P.foam)
    // mist pixels rising
    for (const m of this.mist) this.dot(m.x, m.y, m.life > 1 ? P.foam : W[1])
    // birds
    for (const b of this.birds) {
      const f = Math.sin(t * 8 + b.x) > 0 ? -1 : 0
      this.dot(b.x - 1, b.y + f, P.leaf[0])
      this.dot(b.x, b.y, P.leaf[0])
      this.dot(b.x + 1, b.y + f, P.leaf[0])
    }
    this.b.drawImage(this.front, 0, 0)
  }
}
