import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

const TIMES: Record<string, { sky: [string, string]; layers: string[]; ground: string; beam: string; dark: number }> = {
  day: { sky: ['#9ad1e8', '#f0f4c8'], layers: ['#8fbb53', '#649a45', '#447a3c', '#22452b'], ground: '#2f5e35', beam: 'rgba(240,244,200,0.35)', dark: 0 },
  dusk: { sky: ['#4a3222', '#ffd76a'], layers: ['#6e4d33', '#4a3222', '#2b1d14', '#0f1f13'], ground: '#173020', beam: 'rgba(255,215,106,0.25)', dark: 0.25 },
  night: { sky: ['#07100a', '#173020'], layers: ['#173020', '#0f1f13', '#0a160d', '#07100a'], ground: '#07100a', beam: 'rgba(154,209,232,0.08)', dark: 0.5 },
}

/** Deer walk cycle, 12x10, two frames. d = body, D = dark, w = white tail. */
const DEER = [
  ['..........DD', '.........DdD', '.........dd.', 'ddddddddddd.', 'wdddddddddd.', '.dddddddddd.', '.dd....dd...', '.d.d...d.d..', '.d..d..d..d.', '.D..D..D..D.'],
  ['..........DD', '.........DdD', '.........dd.', 'ddddddddddd.', 'wdddddddddd.', '.dddddddddd.', '..dd...dd...', '..dd...dd...', '..d.d..d.d..', '..D.D..D.D..'],
]

export function create(ctx: SceneContext) {
  return new ForestLife(ctx)
}

/** A layered pixel forest: light shafts, drifting pollen or fireflies, birds, and a deer passing by. */
class ForestLife extends PixelScene {
  layers: HTMLCanvasElement[] = []
  motes: { x: number; y: number; ph: number }[] = []
  birds: { x: number; y: number; v: number }[] = []
  ferns: { x: number; h: number; ph: number }[] = []
  deer = { x: -40, on: false, dir: 1, pause: 0 }
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.forest16
  }
  dither() {
    return 0.5
  }
  configure() {
    this.layout()
  }
  get T() {
    return TIMES[this.str('time')] ?? TIMES.day
  }
  layout() {
    const { w, h, u } = this
    const T = this.T
    this.layers = T.layers.map((col, li) => {
      const cv = document.createElement('canvas')
      cv.width = w
      cv.height = h
      const c = cv.getContext('2d')!
      c.fillStyle = col
      const ground = h * (0.62 + li * 0.08)
      c.fillRect(0, ground, w, h)
      const count = Math.round((w / u / 10) * (1 - li * 0.15))
      for (let i = 0; i < count; i++) {
        const x = this.r() * w
        const tw = (2 + li * 1.5) * u
        const th = this.r.range(50, 120) * u * (0.7 + li * 0.2)
        c.fillRect(Math.round(x), Math.round(ground - th), Math.round(tw), Math.round(th + 2))
        // crowns: stacked stepped blobs
        const cr = (8 + li * 4) * u * this.r.range(0.8, 1.3)
        for (let k = 0; k < 3; k++) {
          const cy = ground - th + k * cr * 0.7
          const half = cr * (0.6 + k * 0.25)
          for (let yy = -cr * 0.5; yy < cr * 0.5; yy += Math.max(1, u)) {
            const ww = half * Math.sqrt(Math.max(0, 1 - ((yy / (cr * 0.5)) ** 2)))
            c.fillRect(Math.round(x + tw / 2 - ww), Math.floor(cy + yy), Math.round(ww * 2), Math.ceil(Math.max(1, u)) + 1)
          }
        }
      }
      return cv
    })
    this.motes = Array.from({ length: Math.round(50 * this.num('particles') * this.density) }, () => ({ x: this.r() * w, y: this.r() * h, ph: this.r() * 6 }))
    this.ferns = Array.from({ length: Math.round(w / (12 * u)) }, () => ({ x: this.r() * w, h: this.r.range(8, 18) * u, ph: this.r() * 6 }))
  }
  step(dt: number) {
    const { w, h, u } = this
    const night = this.str('time') === 'night'
    for (const m of this.motes) {
      m.x += Math.sin(this.t * 0.5 + m.ph) * dt * 4 * u
      m.y += (night ? Math.cos(this.t * 0.7 + m.ph) * 3 : 2) * dt * u
      if (m.y > h) m.y = 0
    }
    if (!night && this.bool('wildlife') && this.birds.length < 2 && this.r.chance(dt / 10)) this.birds.push({ x: -10, y: this.r.range(0.1, 0.35) * h, v: this.r.range(30, 50) * u })
    for (const b of this.birds) b.x += b.v * dt
    this.birds = this.birds.filter((b) => b.x < w + 10)
    const d = this.deer
    if (!d.on && this.bool('wildlife') && this.r.chance(dt / 25)) Object.assign(d, { on: true, dir: this.r.chance(0.5) ? 1 : -1, pause: this.r.range(2, 5) })
    if (d.on) {
      if (d.x < 0 && d.dir < 0) d.x = w + 20
      if (Math.abs(d.x - w / 2) < 4 * u && d.pause > 0) d.pause -= dt
      else d.x += d.dir * 10 * u * dt
      if (d.x > w + 30 || d.x < -30) {
        d.on = false
        d.x = -20
      }
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const T = this.T
    const g = c.createLinearGradient(0, 0, 0, h * 0.7)
    g.addColorStop(0, T.sky[0])
    g.addColorStop(1, T.sky[1])
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    const wind = this.num('wind')
    this.layers.forEach((cv, li) => {
      const sway = this.g.reducedMotion ? 0 : Math.round(Math.sin(this.t * 0.4 + li) * wind * li * 0.5 * u)
      c.drawImage(cv, sway, 0)
      if (li === 1) {
        // light shafts between the far and near layers
        for (let i = 0; i < 4; i++) {
          const x = w * (0.15 + i * 0.22)
          const a = 0.6 + Math.sin(this.t * 0.3 + i * 2) * 0.4
          c.globalAlpha = a
          c.fillStyle = T.beam
          c.beginPath()
          c.moveTo(x, 0)
          c.lineTo(x + 10 * u, 0)
          c.lineTo(x + 40 * u, h)
          c.lineTo(x + 18 * u, h)
          c.fill()
          c.globalAlpha = 1
        }
      }
      if (li === 2 && this.deer.on) this.drawDeer()
    })
    c.fillStyle = T.ground
    c.fillRect(0, h * 0.92, w, h)
    // ferns sway in the foreground
    c.fillStyle = T.layers[3]
    for (const f of this.ferns) {
      for (let i = 0; i < f.h; i += Math.max(1, u)) {
        const k = i / f.h
        const x = f.x + Math.sin(this.t * 1.3 * (0.5 + wind) + f.ph) * k * k * 4 * u * wind
        c.fillRect(Math.round(x - (1 - k) * 3 * u), Math.round(h * 0.94 - i), Math.max(1, Math.round((1 - k) * 6 * u)), Math.max(1, Math.round(u)))
      }
    }
    const night = this.str('time') === 'night'
    for (const m of this.motes) {
      if (night) {
        if (Math.sin(this.t * 2 + m.ph * 3) < 0.2) continue
        c.fillStyle = '#ffd76a'
      } else c.fillStyle = '#f0f4c8'
      c.fillRect(Math.round(m.x), Math.round(m.y), 1, 1)
    }
    c.fillStyle = T.layers[3]
    for (const b of this.birds) {
      const f = Math.sin(this.t * 10 + b.x) > 0 ? -1 : 1
      c.fillRect(Math.round(b.x), Math.round(b.y), Math.round(u), Math.round(u))
      c.fillRect(Math.round(b.x - 2 * u), Math.round(b.y + f * u), Math.round(2 * u), Math.round(u))
      c.fillRect(Math.round(b.x + u), Math.round(b.y + f * u), Math.round(2 * u), Math.round(u))
    }
  }
  drawDeer() {
    const c = this.c
    const { h, u } = this
    const d = this.deer
    const s = Math.max(1, Math.round(u))
    const frame = d.pause > 0 && Math.abs(d.x - this.w / 2) < 4 * u ? 0 : Math.floor(this.t * 5) % 2
    const sprite = DEER[frame]
    const base = Math.round(h * 0.8)
    const cols: Record<string, string> = { d: '#a07a52', D: '#4a3222', w: '#f0f4c8' }
    for (let r = 0; r < sprite.length; r++)
      for (let k = 0; k < sprite[r].length; k++) {
        const ch = sprite[r][d.dir > 0 ? k : sprite[r].length - 1 - k]
        if (ch === '.') continue
        c.fillStyle = cols[ch]
        c.fillRect(Math.round(d.x) + k * s, base - (sprite.length - r) * s, s, s)
      }
  }
}
