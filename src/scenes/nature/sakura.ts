import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

type Light = { sky: [string, string, string]; mount: string; snow: string; hill: [string, string]; water: string; mist: string; trunk: string; bloom: [string, string, string]; sun: string | null; moon: boolean; lanterns: boolean }

const LIGHTS: Record<string, Light> = {
  day: { sky: ['#8fb4dc', '#cfe0f0', '#f6eef0'], mount: '#7d8db8', snow: '#f4f6fb', hill: ['#8a9ec2', '#5f7d6e'], water: '#9fb8d8', mist: 'rgba(246,238,240,0.55)', trunk: '#3b2a2a', bloom: ['#f7a8c0', '#ffd0dd', '#fff1f4'], sun: null, moon: false, lanterns: false },
  sunset: { sky: ['#4a3f78', '#e9879a', '#ffd38a'], mount: '#5c4f86', snow: '#ffd9cf', hill: ['#6c4f7c', '#3e3552'], water: '#c87d93', mist: 'rgba(255,211,170,0.35)', trunk: '#2a1c22', bloom: ['#ee86a6', '#ffb6c8', '#ffe1d6'], sun: '#ffe7a8', moon: false, lanterns: true },
  night: { sky: ['#0b0c1e', '#1c1f45', '#3a3c70'], mount: '#2a2d58', snow: '#b9c3e6', hill: ['#22254a', '#151830'], water: '#1c2148', mist: 'rgba(120,130,190,0.18)', trunk: '#120d16', bloom: ['#b9688c', '#e59ab7', '#ffd6e4'], sun: null, moon: true, lanterns: true },
}

type Petal = { x: number; y: number; vx: number; vy: number; a: number; va: number; s: number; tone: number }

export function create(ctx: SceneContext) {
  return new Sakura(ctx)
}

/**
 * A Japanese spring landscape: a snow-capped volcano over a still lake, a pagoda on the far shore,
 * a vermilion torii standing in the water, and a great cherry tree shedding petals in the wind.
 */
class Sakura extends PixelScene {
  back!: HTMLCanvasElement
  tree!: HTMLCanvasElement
  treeX = 0
  treeY = 0
  petals: Petal[] = []
  stars: { x: number; y: number; p: number }[] = []
  boat = { x: 0.7, dir: -1 }
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.sakura
  }
  dither() {
    return 0.45
  }
  get L() {
    return LIGHTS[this.str('light')] ?? LIGHTS.day
  }
  configure() {
    this.layout()
  }
  get horizon() {
    return this.h * 0.6
  }
  layout() {
    const { w, h, u } = this
    const L = this.L
    const hz = this.horizon
    const r = this.r
    // ---- background: sky, mountain, far shore, pagoda (water is drawn live)
    const b = document.createElement('canvas')
    b.width = w
    b.height = h
    const c = b.getContext('2d')!
    const sky = c.createLinearGradient(0, 0, 0, hz)
    sky.addColorStop(0, L.sky[0])
    sky.addColorStop(0.65, L.sky[1])
    sky.addColorStop(1, L.sky[2])
    c.fillStyle = sky
    c.fillRect(0, 0, w, hz + 1)
    // the volcano: a wide, gently concave cone
    const mx = w * 0.6
    const peak = hz - 78 * u
    const base = 150 * u
    const top = 13 * u
    const cone = (k: number) => {
      // y at horizontal offset fraction k (0 = summit edge, 1 = base)
      return peak + (hz - peak) * Math.pow(k, 1.6)
    }
    c.fillStyle = L.mount
    c.beginPath()
    c.moveTo(mx - base, hz)
    for (let i = 0; i <= 40; i++) {
      const k = 1 - i / 40
      c.lineTo(mx - top - (base - top) * k, cone(k))
    }
    for (let i = 0; i <= 40; i++) {
      const k = i / 40
      c.lineTo(mx + top + (base - top) * k, cone(k))
    }
    c.lineTo(mx + base, hz)
    c.fill()
    // snow cap with ragged hem
    c.fillStyle = L.snow
    c.beginPath()
    const capK = 0.3
    c.moveTo(mx - top - (base - top) * capK, cone(capK))
    for (let i = 0; i <= 30; i++) {
      const k = capK - (capK * i) / 30
      c.lineTo(mx - top - (base - top) * k, cone(k))
    }
    for (let i = 0; i <= 30; i++) {
      const k = (capK * i) / 30
      c.lineTo(mx + top + (base - top) * k, cone(k))
    }
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const fx = 1 - (2 * i) / steps
      const k = capK * (0.55 + 0.45 * (i % 2 ? 1 : 0.35 + r() * 0.3))
      c.lineTo(mx + fx * (top + (base - top) * k), cone(k) + (i % 2 ? 4 * u : 0))
    }
    c.fill()
    // a soft band of cloud across the slope
    c.fillStyle = L.mist
    for (let i = 0; i < 7; i++) {
      c.beginPath()
      c.ellipse(mx - 90 * u + i * 30 * u + r() * 8 * u, hz - 30 * u + r() * 6 * u, 26 * u, 4 * u, 0, 0, TAU)
      c.fill()
    }
    // far hills
    c.fillStyle = L.hill[0]
    c.beginPath()
    c.moveTo(0, hz)
    for (let x = 0; x <= w; x += 4 * u) c.lineTo(x, hz - 10 * u - Math.sin(x / (40 * u)) * 6 * u - Math.sin(x / (13 * u)) * 2 * u)
    c.lineTo(w, hz)
    c.fill()
    // near shore (right) with pines and a pagoda
    c.fillStyle = L.hill[1]
    c.beginPath()
    c.moveTo(w * 0.62, hz)
    for (let x = w * 0.62; x <= w + 4 * u; x += 3 * u) {
      const k = (x - w * 0.62) / (w * 0.38)
      c.lineTo(x, hz - Math.sqrt(Math.max(0, k)) * 18 * u - Math.sin(x / (9 * u)) * 1.5 * u)
    }
    c.lineTo(w, hz)
    c.fill()
    for (let i = 0; i < 9; i++) {
      const x = w * 0.66 + i * w * 0.04 + r() * 6 * u
      const k = (x - w * 0.62) / (w * 0.38)
      const y = hz - Math.sqrt(Math.max(0, k)) * 18 * u
      const s = r.range(0.7, 1.1) * u
      c.fillRect(x - 0.5 * s, y - 4 * s, s, 5 * s)
      for (let t = 0; t < 3; t++) {
        c.beginPath()
        c.ellipse(x + (t % 2 ? 2 : -2) * s, y - (6 + t * 4) * s, (7 - t * 1.5) * s, 2.2 * s, (t % 2 ? -1 : 1) * 0.15, 0, TAU)
        c.fill()
      }
    }
    this.pagoda(c, w * 0.8, hz - 16 * u, u * 0.95, L)
    this.back = b

    // ---- the cherry tree, pre-rendered once
    const tw = w
    const th = h
    const t = document.createElement('canvas')
    t.width = tw
    t.height = th
    const tc = t.getContext('2d')!
    const blossoms: { x: number; y: number; r: number }[] = []
    const branch = (x: number, y: number, ang: number, len: number, wid: number, depth: number) => {
      const x2 = x + Math.cos(ang) * len
      const y2 = y + Math.sin(ang) * len
      tc.strokeStyle = L.trunk
      tc.lineCap = 'round'
      tc.lineWidth = wid
      tc.beginPath()
      tc.moveTo(x, y)
      const bend = r.range(-0.25, 0.25) * len
      tc.quadraticCurveTo((x + x2) / 2 + bend, (y + y2) / 2 - Math.abs(bend) * 0.4, x2, y2)
      tc.stroke()
      if (depth <= 0 || wid < 0.8 * u) {
        blossoms.push({ x: x2, y: y2, r: r.range(7, 12) * u })
        return
      }
      const kids = depth > 3 ? 2 : r.int(2, 3)
      for (let k = 0; k < kids; k++) {
        const spread = r.range(0.3, 0.7) * (k % 2 ? 1 : -1)
        // steer away from the top edge and keep the crown on the left third
        let a = ang + spread
        if (y2 < 30 * u) a = a * 0.5 + 0.5 * 0.4
        if (x2 > Math.min(w * 0.36, 120 * u)) a = a * 0.5 + 0.5 * -2.4
        branch(x2, y2, a, len * r.range(0.7, 0.84), wid * 0.66, depth - 1)
      }
      if (depth < 3) blossoms.push({ x: x2, y: y2, r: r.range(5, 9) * u })
    }
    // trunk leaning up and to the right, from the bottom-left corner
    branch(Math.min(w * 0.12, 30 * u), th, -Math.PI / 2 + 0.12, 40 * u, 10 * u, 5)
    // blossom clouds: dark, mid, light layers for volume
    const layer = (col: string, scale: number, dy: number, alpha: number) => {
      tc.fillStyle = col
      tc.globalAlpha = alpha
      for (const bl of blossoms) {
        for (let k = 0; k < 4; k++) {
          tc.beginPath()
          tc.arc(bl.x + Math.cos(k * 1.7) * bl.r * 0.5, bl.y + Math.sin(k * 1.7) * bl.r * 0.4 + dy, bl.r * scale * (0.6 + (k % 2) * 0.3), 0, TAU)
          tc.fill()
        }
      }
      tc.globalAlpha = 1
    }
    layer(L.bloom[0], 1, 2 * u, 1)
    layer(L.bloom[1], 0.72, 0, 1)
    layer(L.bloom[2], 0.32, -2 * u, 0.9)
    this.tree = t
    this.treeX = 0
    this.treeY = 0
    // falling petals
    const n = Math.round(90 * this.num('petals') * this.density)
    this.petals = Array.from({ length: n }, () => this.newPetal(true))
    this.stars = Array.from({ length: 70 }, () => ({ x: r() * w, y: r() * hz * 0.7, p: r() * TAU }))
  }
  pagoda(c: CanvasRenderingContext2D, x: number, y: number, s: number, L: Light) {
    const wall = this.str('light') === 'day' ? '#7a2a24' : '#3a1c22'
    const roof = this.str('light') === 'night' ? '#0f1128' : '#2c2a3c'
    for (let i = 0; i < 5; i++) {
      const fw = (11 - i * 1.5) * s
      const fy = y - i * 7 * s
      c.fillStyle = wall
      c.fillRect(x - fw * 0.55, fy - 5 * s, fw * 1.1, 5 * s)
      c.fillStyle = roof
      c.beginPath()
      c.moveTo(x - fw - 3 * s, fy - 4 * s)
      c.quadraticCurveTo(x - fw * 0.5, fy - 5 * s, x, fy - 8 * s)
      c.quadraticCurveTo(x + fw * 0.5, fy - 5 * s, x + fw + 3 * s, fy - 4 * s)
      c.lineTo(x + fw * 0.7, fy - 5.5 * s)
      c.lineTo(x - fw * 0.7, fy - 5.5 * s)
      c.fill()
    }
    c.fillStyle = roof
    c.fillRect(x - 0.4 * s, y - 50 * s, 0.8 * s, 14 * s)
    if (L.lanterns) {
      c.fillStyle = '#ffcf73'
      for (let i = 0; i < 4; i++) c.fillRect(x - 1 * s, y - 2.5 * s - i * 7 * s, 2 * s, 1.5 * s)
    }
  }
  newPetal(anywhere: boolean): Petal {
    const { w, h, u } = this
        return {
      x: anywhere ? this.r() * w : this.r() * Math.min(w * 0.4, 130 * u),
      y: anywhere ? this.r() * h : this.r.range(0.05, 0.5) * h,
      vx: this.r.range(6, 16) * u,
      vy: this.r.range(5, 11) * u,
      a: this.r() * TAU,
      va: this.r.range(-3, 3),
      s: this.r.range(1.1, 2.1) * u,
      tone: this.r.int(0, 2),
    }
  }
  step(dt: number) {
    const { w, h, u } = this
    const wind = this.num('wind')
    for (const p of this.petals) {
      p.x += (p.vx * wind + Math.sin(this.t * 1.3 + p.a) * 6 * u) * dt
      p.y += p.vy * dt
      p.a += p.va * dt
      if (p.y > h + 4 * u || p.x > w + 6 * u) Object.assign(p, this.newPetal(false))
    }
    if (this.bool('boat')) {
      this.boat.x += this.boat.dir * dt * 0.006
      if (this.boat.x < 0.42) this.boat.dir = 1
      if (this.boat.x > 0.95) this.boat.dir = -1
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const L = this.L
    const hz = this.horizon
    c.drawImage(this.back, 0, 0)
    if (L.moon) {
      for (const s of this.stars) {
        c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 0.8 + s.p))
        c.fillStyle = '#fff7f8'
        c.fillRect(s.x, s.y, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
      }
      c.globalAlpha = 1
      c.fillStyle = '#fff3d6'
      c.beginPath()
      c.arc(w * 0.88, hz * 0.22, 9 * u, 0, TAU)
      c.fill()
    }
    if (L.sun) {
      c.fillStyle = L.sun
      c.beginPath()
      c.arc(w * 0.3, hz - 4 * u, 14 * u, Math.PI, 0)
      c.fill()
    }
    // the lake: mirrored background, darkened, with shimmering lines
    c.save()
    c.translate(0, hz * 2)
    c.scale(1, -1)
    c.globalAlpha = 0.55
    c.drawImage(this.back, 0, 0, w, hz, 0, 0, w, hz)
    c.restore()
    c.globalAlpha = 1
    const wg = c.createLinearGradient(0, hz, 0, h)
    wg.addColorStop(0, L.water + '88')
    wg.addColorStop(1, L.water)
    c.fillStyle = wg
    c.fillRect(0, hz, w, h - hz)
    c.fillStyle = L.sky[2]
    for (let i = 0; i < 26; i++) {
      const y = hz + 3 * u + ((i * 37) % 100) / 100 * (h - hz)
      const x = ((i * 71 + this.t * (4 + (i % 3)) * u) % (w + 40 * u)) - 20 * u
      c.globalAlpha = 0.25
      c.fillRect(x, y, (10 + (i % 4) * 6) * u, Math.max(1, 0.5 * u))
    }
    c.globalAlpha = 1
    if (L.sun) {
      c.fillStyle = L.sun
      for (let i = 0; i < 8; i++) {
        const ww = (14 - i * 1.4) * u * (0.8 + 0.2 * Math.sin(this.t * 2 + i))
        c.globalAlpha = 0.5
        c.fillRect(w * 0.3 - ww, hz + 2 * u + i * 3 * u, ww * 2, Math.max(1, u))
      }
      c.globalAlpha = 1
    }
    // the torii, standing in the water
    this.torii(c, w * 0.5, hz + 16 * u, u)
    // a small boat with a lantern
    if (this.bool('boat')) {
      const bx = w * this.boat.x
      const by = hz + 9 * u + Math.sin(this.t * 1.2) * 0.6 * u
      c.fillStyle = '#1a1424'
      c.beginPath()
      c.moveTo(bx - 9 * u, by)
      c.lineTo(bx + 9 * u, by)
      c.lineTo(bx + 6 * u, by + 2.5 * u)
      c.lineTo(bx - 6 * u, by + 2.5 * u)
      c.fill()
      c.fillRect(bx - 1.5 * u, by - 6 * u, 3 * u, 6 * u)
      c.fillRect(bx - 1.6 * u, by - 7.5 * u, 3.2 * u, 1.6 * u)
      if (L.lanterns) {
        c.fillStyle = '#ffcf73'
        c.fillRect(bx + 6 * u, by - 5 * u, 1.8 * u, 2.2 * u)
        c.globalAlpha = 0.35
        c.fillRect(bx + 6 * u, by + 3 * u, 1.8 * u, 5 * u)
        c.globalAlpha = 1
      }
    }
    // near bank, bottom-left, under the tree, with a stone lantern
    c.fillStyle = L.hill[1]
    c.beginPath()
    c.moveTo(0, h)
    c.lineTo(0, h - 30 * u)
    c.quadraticCurveTo(w * 0.22, h - 26 * u, w * 0.34, h)
    c.fill()
    this.toro(c, w * 0.2, h - 22 * u, u, L)
    // the tree sways gently from its base
    const sway = this.g.reducedMotion ? 0 : Math.sin(this.t * 0.6) * 0.008 * this.num('wind')
    c.save()
    const root = Math.min(w * 0.12, 30 * u)
    c.translate(root, h)
    c.rotate(sway)
    c.drawImage(this.tree, -root, -h)
    c.restore()
    // petals
    for (const p of this.petals) {
      c.fillStyle = L.bloom[p.tone]
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.a)
      c.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(p.a * 1.7)))
      c.beginPath()
      c.ellipse(0, 0, p.s, p.s * 0.65, 0, 0, TAU)
      c.fill()
      c.restore()
    }
    // petals resting on the water
    c.fillStyle = L.bloom[1]
    for (let i = 0; i < 18; i++) {
      const x = ((i * 113 + this.t * 3 * u) % (w * 1.1)) - w * 0.05
      const y = hz + 20 * u + ((i * 53) % 60) / 60 * (h - hz - 24 * u)
      c.fillRect(x, y, 1.6 * u, 0.8 * u)
    }
  }
  torii(c: CanvasRenderingContext2D, x: number, y: number, u: number) {
    const red = this.str('light') === 'night' ? '#8a2a2a' : '#c8402e'
    const s = u * 1.25
    c.fillStyle = red
    c.fillRect(x - 11 * s, y - 26 * s, 2.4 * s, 26 * s)
    c.fillRect(x + 8.6 * s, y - 26 * s, 2.4 * s, 26 * s)
    c.fillRect(x - 13 * s, y - 21 * s, 26 * s, 1.8 * s)
    c.fillStyle = '#1a1424'
    c.beginPath()
    c.moveTo(x - 17 * s, y - 29 * s)
    c.quadraticCurveTo(x, y - 27 * s, x + 17 * s, y - 29 * s)
    c.lineTo(x + 15 * s, y - 26.5 * s)
    c.lineTo(x - 15 * s, y - 26.5 * s)
    c.fill()
    c.fillStyle = red
    c.fillRect(x - 15 * s, y - 26.5 * s, 30 * s, 1.6 * s)
    c.fillRect(x - 1 * s, y - 25 * s, 2 * s, 4 * s)
    // reflection
    c.globalAlpha = 0.3
    c.fillRect(x - 11 * s, y, 2.4 * s, 14 * s)
    c.fillRect(x + 8.6 * s, y, 2.4 * s, 14 * s)
    c.globalAlpha = 1
  }
  toro(c: CanvasRenderingContext2D, x: number, y: number, s: number, L: Light) {
    c.fillStyle = '#6e6a78'
    c.fillRect(x - 1.5 * s, y - 2 * s, 3 * s, 8 * s)
    c.fillRect(x - 4 * s, y - 4 * s, 8 * s, 2 * s)
    c.fillRect(x - 3 * s, y - 9 * s, 6 * s, 5 * s)
    c.beginPath()
    c.moveTo(x - 6 * s, y - 9 * s)
    c.lineTo(x, y - 13 * s)
    c.lineTo(x + 6 * s, y - 9 * s)
    c.fill()
    c.fillStyle = L.lanterns ? '#ffcf73' : '#3a3644'
    c.fillRect(x - 1.5 * s, y - 8 * s, 3 * s, 3 * s)
    if (L.lanterns) {
      c.globalAlpha = 0.12 + 0.04 * Math.sin(this.t * 3)
      c.beginPath()
      c.arc(x, y - 6.5 * s, 6 * s, 0, TAU)
      c.fill()
      c.globalAlpha = 1
    }
  }
}
