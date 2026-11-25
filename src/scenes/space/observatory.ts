import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

type Star = { r: number; a: number; b: number; col: string }

/**
 * Observatory, in silhouette: a long exposure of the night sky turning around the pole star, over
 * layered hills cut flat in three tones and a black observatory whose open slit glows red.
 */
export function create(ctx: SceneContext) {
  return new Observatory(ctx)
}

class Observatory extends PixelScene {
  stars: Star[] = []
  trails!: HTMLCanvasElement
  tc!: CanvasRenderingContext2D
  hills!: HTMLCanvasElement
  angle = 0
  meteor = { t: -1, x: 0, y: 0, a: 0 }
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.25
  }
  get pole() {
    const portrait = this.h > this.w
    return { x: this.w * (portrait ? 0.5 : 0.6), y: this.h * (portrait ? 0.2 : 0.16) }
  }
  get ground() {
    return this.h * (this.h > this.w ? 0.7 : 0.66)
  }
  layout() {
    const { w, h, u } = this
    if (!w) return
    const R = rng(21)
    const reach = Math.hypot(w, h)
    this.stars = Array.from({ length: Math.round(420 * this.density) }, () => {
      const b = R() ** 2
      return { r: 6 * u + R() ** 0.8 * reach, a: R() * TAU, b, col: b > 0.7 ? '#ffffff' : R.pick(['#dfe8ff', '#b8ccff', '#ffd9a8', '#ffb8a0', '#cfe0ff']) }
    })
    this.trails = document.createElement('canvas')
    this.trails.width = w
    this.trails.height = h
    this.tc = this.trails.getContext('2d')!
    this.angle = 0
    this.expose(-1.1, 0)
    this.paintHills()
  }
  /** Adds the arcs each star sweeps between two rotation angles to the exposure. */
  expose(a0: number, a1: number) {
    const tc = this.tc
    const P = this.pole
    tc.lineCap = 'round'
    for (const s of this.stars) {
      tc.strokeStyle = s.col
      tc.globalAlpha = 0.12 + s.b * 0.75
      tc.lineWidth = Math.max(1, this.u * (0.35 + s.b * 0.5))
      tc.beginPath()
      tc.arc(P.x, P.y, s.r, s.a + a0, s.a + a1)
      tc.stroke()
    }
    tc.globalAlpha = 1
  }
  /** Three flat ridges, the observatory and the pines, all as solid silhouettes. */
  paintHills() {
    const { w, h, u } = this
    const c0 = document.createElement('canvas')
    c0.width = w
    c0.height = h
    const c = c0.getContext('2d')!
    const G = this.ground
    const ridge = (base: number, amp: number, f: number, ph: number, col: string) => {
      c.fillStyle = col
      c.beginPath()
      c.moveTo(0, h)
      for (let x = 0; x <= w + 4; x += 4) c.lineTo(x, base - Math.sin(x * f + ph) * amp - Math.sin(x * f * 2.7 + ph * 2) * amp * 0.3)
      c.lineTo(w, h)
      c.fill()
    }
    ridge(G - 30 * u, 14 * u, 0.004 / (u / 4), 1, '#1b2550')
    ridge(G - 12 * u, 10 * u, 0.007 / (u / 4), 3, '#111836')
    // the near hill carries the observatory: a smooth crest
    const ox = w * (this.h > this.w ? 0.5 : 0.34)
    c.fillStyle = '#070a18'
    c.beginPath()
    c.moveTo(0, h)
    for (let x = 0; x <= w + 4; x += 4) {
      const d = (x - ox) / (w * 0.55)
      c.lineTo(x, G + d * d * 40 * u)
    }
    c.lineTo(w, h)
    c.fill()
    // pines along the crest
    const pine = (x: number, base: number, hh: number) => {
      c.beginPath()
      c.moveTo(x, base - hh)
      for (let k = 0; k <= 4; k++) {
        const y = base - hh + (k / 4) * hh
        const wd = (k / 4) * hh * 0.32 + hh * 0.04
        c.lineTo(x + wd, y)
        if (k < 4) c.lineTo(x + wd * 0.45, y + hh * 0.04)
      }
      c.lineTo(x - hh * 0.36, base)
      for (let k = 4; k >= 0; k--) {
        const y = base - hh + (k / 4) * hh
        const wd = (k / 4) * hh * 0.32 + hh * 0.04
        if (k < 4) c.lineTo(x - wd * 0.45, y + hh * 0.04)
        c.lineTo(x - wd, y)
      }
      c.fill()
    }
    const R = rng(5)
    for (let i = 0; i < 9; i++) {
      const x = R() * w
      if (Math.abs(x - ox) < 50 * u) continue
      const d = (x - ox) / (w * 0.55)
      pine(x, G + d * d * 40 * u + 2 * u, R.range(14, 30) * u)
    }
    // observatory: drum building, dome, slit cut by the live layer
    const s = u
    c.fillRect(ox - 20 * s, G - 18 * s, 40 * s, 19 * s)
    c.beginPath()
    c.arc(ox, G - 18 * s, 21 * s, Math.PI, 0)
    c.fill()
    c.fillRect(ox - 23 * s, G - 19 * s, 46 * s, 2 * s)
    this.hills = c0
  }
  step(dt: number) {
    const sp = this.num('speed')
    const prev = this.angle
    this.angle += dt * 0.012 * sp
    this.expose(prev, this.angle)
    if (this.angle > 1.4) {
      // a new plate: wipe and start a fresh exposure
      this.tc.clearRect(0, 0, this.w, this.h)
      this.angle = 0
      this.expose(-0.4, 0)
    }
    if (this.meteor.t < 0 && this.r.chance(dt / 14)) this.meteor = { t: 0, x: this.r.range(0.1, 0.9) * this.w, y: this.r.range(0.05, 0.35) * this.h, a: this.r.range(0.3, 0.8) }
    if (this.meteor.t >= 0) {
      this.meteor.t += dt * 1.6
      if (this.meteor.t > 1) this.meteor.t = -1
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const G = this.ground
    // deep gradient sky with a cool glow along the horizon
    const sky = c.createLinearGradient(0, 0, 0, G)
    sky.addColorStop(0, '#03040c')
    sky.addColorStop(0.55, '#0b1230')
    sky.addColorStop(0.85, '#1c2b5c')
    sky.addColorStop(1, '#2f4a7a')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    c.drawImage(this.trails, 0, 0)
    // the pole star, steady and bright
    const P = this.pole
    const pg = c.createRadialGradient(P.x, P.y, 0, P.x, P.y, 6 * u)
    pg.addColorStop(0, 'rgba(255,255,255,0.95)')
    pg.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = pg
    c.fillRect(P.x - 6 * u, P.y - 6 * u, 12 * u, 12 * u)
    // shooting star
    if (this.meteor.t >= 0) {
      const m = this.meteor
      const len = 60 * u
      const hx = m.x + Math.cos(m.a) * len * m.t * 2
      const hy = m.y + Math.sin(m.a) * len * m.t * 2
      const g = c.createLinearGradient(hx - Math.cos(m.a) * len, hy - Math.sin(m.a) * len, hx, hy)
      g.addColorStop(0, 'rgba(255,255,255,0)')
      g.addColorStop(1, `rgba(255,255,255,${1 - m.t})`)
      c.strokeStyle = g
      c.lineWidth = Math.max(1, 0.8 * u)
      c.beginPath()
      c.moveTo(hx - Math.cos(m.a) * len, hy - Math.sin(m.a) * len)
      c.lineTo(hx, hy)
      c.stroke()
    }
    c.drawImage(this.hills, 0, 0)
    // the slit: a red-lit opening in the black dome, with the telescope tube inside
    const ox = w * (this.h > this.w ? 0.5 : 0.34)
    const s = u
    const sw = 5 * s
    const slitTop = G - 38 * s
    c.save()
    c.beginPath()
    c.arc(ox, G - 18 * s, 21 * s, Math.PI, 0)
    c.clip()
    const lg = c.createLinearGradient(0, slitTop, 0, G - 18 * s)
    lg.addColorStop(0, '#3a0a12')
    lg.addColorStop(1, '#9a1e24')
    c.fillStyle = lg
    c.fillRect(ox - sw / 2 + 3 * s, slitTop - 2 * s, sw, 22 * s)
    c.strokeStyle = '#03040c'
    c.lineWidth = 3 * s
    c.beginPath()
    const ta = -1.25 + Math.sin(this.t * 0.02) * 0.04
    c.moveTo(ox + 3 * s, G - 22 * s)
    c.lineTo(ox + 3 * s + Math.cos(ta) * 18 * s, G - 22 * s + Math.sin(ta) * 18 * s)
    c.stroke()
    c.restore()
    // a little red door light at the base
    c.fillStyle = '#c8262e'
    c.fillRect(ox + 9 * s, G - 9 * s, 4 * s, 8 * s)
    const dg = c.createRadialGradient(ox + 11 * s, G - 4 * s, 0, ox + 11 * s, G - 4 * s, 16 * s)
    dg.addColorStop(0, 'rgba(200,38,46,0.35)')
    dg.addColorStop(1, 'rgba(200,38,46,0)')
    c.fillStyle = dg
    c.fillRect(ox - 8 * s, G - 22 * s, 38 * s, 30 * s)
  }
}
