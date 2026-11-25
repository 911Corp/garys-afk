import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, mix } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, font } from '../kit'

const SEASONS = [
  { name: 'spring', leaf: ['#f59ab4', '#ffd3df'], wall: '#f3ece0', light: '#fff7e8', fall: '#ffd3df', amount: 0.85 },
  { name: 'summer', leaf: ['#4c6b47', '#7fa865'], wall: '#efe8d4', light: '#fff3c4', fall: '#7fa865', amount: 1 },
  { name: 'autumn', leaf: ['#c8402e', '#f08a2a'], wall: '#eadfcc', light: '#ffe2b0', fall: '#e2614f', amount: 0.75 },
  { name: 'winter', leaf: ['#e6ecf4', '#ffffff'], wall: '#dfe3ea', light: '#eef3ff', fall: '#ffffff', amount: 0.45 },
]

type Clump = { x: number; y: number; r: number }
type Flake = { x: number; y: number; vx: number; vy: number; a: number }

export function create(ctx: SceneContext) {
  return new Bonsai(ctx)
}

/** A bonsai on a low table in front of a shoji screen, cycling slowly through the four seasons. */
class Bonsai extends PixelScene {
  branches: { x1: number; y1: number; x2: number; y2: number; w: number }[] = []
  clumps: Clump[] = []
  flakes: Flake[] = []
  season = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    const start = this.str('season')
    this.season = Math.max(0, SEASONS.findIndex((s) => s.name === start))
    this.layout()
  }
  palette() {
    return PX.sakura
  }
  dither() {
    return 0.4
  }
  configure() {
    const start = this.str('season')
    const i = SEASONS.findIndex((s) => s.name === start)
    if (i >= 0 && Math.floor(this.season) !== i) this.season = i
  }
  layout() {
    // tree in normalised coordinates (0..1 of the tree box), seeded so it is stable
    const r = this.r
    this.branches = []
    this.clumps = []
    const grow = (x: number, y: number, a: number, len: number, wd: number, d: number) => {
      const x2 = x + Math.cos(a) * len
      const y2 = y + Math.sin(a) * len
      this.branches.push({ x1: x, y1: y, x2, y2, w: wd })
      if (d === 0) {
        this.clumps.push({ x: x2, y: y2, r: r.range(0.09, 0.13) })
        return
      }
      const n = d > 2 ? 2 : r.int(2, 3)
      for (let i = 0; i < n; i++) grow(x2, y2, a + (i - (n - 1) / 2) * r.range(0.5, 0.9) + r.range(-0.2, 0.2), len * r.range(0.62, 0.78), wd * 0.65, d - 1)
      if (d <= 2) this.clumps.push({ x: x2, y: y2, r: r.range(0.07, 0.11) })
    }
    // an informal upright trunk with a twist
    grow(0.5, 1, -Math.PI / 2 - 0.25, 0.24, 0.1, 4)
    this.flakes = []
  }
  step(dt: number) {
    const { w, h, u } = this
    this.season = (this.season + (dt * this.num('speed')) / 40) % SEASONS.length
    const S = SEASONS[Math.floor(this.season)]
    const want = Math.round(40 * this.density * (S.name === 'summer' ? 0.15 : 1))
    if (this.flakes.length < want && this.r.chance(dt * 6))
      this.flakes.push({ x: w * this.r.range(0.25, 0.75), y: h * this.r.range(0.15, 0.35), vx: this.r.range(-4, 4) * u, vy: this.r.range(5, 10) * u, a: this.r() * TAU })
    for (const f of this.flakes) {
      f.x += (f.vx + Math.sin(this.t + f.a) * 4 * u) * dt
      f.y += f.vy * dt
      f.a += dt * 2
    }
    this.flakes = this.flakes.filter((f) => f.y < h * 0.72)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const i0 = Math.floor(this.season)
    const k = Math.max(0, (this.season - i0 - 0.75) / 0.25)
    const A = SEASONS[i0]
    const B = SEASONS[(i0 + 1) % SEASONS.length]
    // shoji screen
    c.fillStyle = mix(A.wall, B.wall, k)
    c.fillRect(0, 0, w, h)
    const g = c.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, Math.max(w, h) * 0.8)
    g.addColorStop(0, mix(A.light, B.light, k))
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    c.strokeStyle = '#8a6a5a'
    c.lineWidth = Math.max(1, 1.2 * u)
    const cell = 30 * u
    for (let x = (w % cell) / 2; x <= w; x += cell) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x, h * 0.72)
      c.stroke()
    }
    for (let y = cell * 0.6; y < h * 0.72; y += cell * 1.3) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(w, y)
      c.stroke()
    }
    // floor and low table
    const floor = h * 0.72
    c.fillStyle = '#7a5a46'
    c.fillRect(0, floor, w, h - floor)
    c.fillStyle = '#5c4434'
    for (let y = floor; y < h; y += 8 * u) c.fillRect(0, y, w, Math.max(1, 0.4 * u))
    const tw = Math.min(w * 0.6, 120 * u)
    c.fillStyle = '#3b2a2a'
    c.fillRect(w / 2 - tw / 2, floor - 4 * u, tw, 5 * u)
    c.fillRect(w / 2 - tw / 2 + 4 * u, floor + 1 * u, 4 * u, 14 * u)
    c.fillRect(w / 2 + tw / 2 - 8 * u, floor + 1 * u, 4 * u, 14 * u)
    // pot
    const pw = Math.min(w * 0.34, 64 * u)
    const ph = pw * 0.24
    const py = floor - 4 * u - ph
    c.fillStyle = '#3d3f6e'
    c.beginPath()
    c.moveTo(w / 2 - pw / 2, py)
    c.lineTo(w / 2 + pw / 2, py)
    c.lineTo(w / 2 + pw * 0.42, py + ph)
    c.lineTo(w / 2 - pw * 0.42, py + ph)
    c.fill()
    c.fillStyle = '#6a6f9e'
    c.fillRect(w / 2 - pw / 2 - 1 * u, py - 1.5 * u, pw + 2 * u, 2.5 * u)
    c.fillStyle = '#4c6b47'
    c.fillRect(w / 2 - pw * 0.46, py - 2.5 * u, pw * 0.92, 1.5 * u)
    // tree
    const leafA = A.leaf.map((col, i) => mix(col, B.leaf[i], k))
    const amount = A.amount + (B.amount - A.amount) * k
    this.tree(w / 2 - this.treeSize() / 2, py - this.treeSize(), 1, leafA[0], leafA[1], amount)
    // snow on the pot in winter
    if (A.name === 'winter') {
      c.fillStyle = '#ffffff'
      c.fillRect(w / 2 - pw / 2, py - 3 * u, pw, 1.6 * u)
    }
    // falling petals / leaves / snow
    const fall = mix(A.fall, B.fall, k)
    for (const f of this.flakes) {
      c.fillStyle = fall
      c.save()
      c.translate(f.x, f.y)
      c.rotate(f.a)
      c.fillRect(-1.2 * u, -0.6 * u, 2.4 * u, 1.2 * u)
      c.restore()
    }
    font(c, Math.max(8, 5 * u), MONO, 500)
    c.fillStyle = '#8a6a5a'
    c.textAlign = 'right'
    c.fillText(A.name, w - 8 * u, h - 6 * u)
    c.textAlign = 'left'
  }
  treeSize() {
    return Math.min(this.h * 0.52, this.w * 0.7)
  }
  tree(x0: number, y0: number, sc: number, dark: string, light: string, amount: number) {
    const c = this.c
    const S = this.treeSize() * sc
    const sway = this.g.reducedMotion ? 0 : Math.sin(this.t * 0.5) * 0.003
    c.strokeStyle = '#4a3222'
    c.lineCap = 'round'
    for (const b of this.branches) {
      c.lineWidth = Math.max(1, b.w * S)
      c.beginPath()
      c.moveTo(x0 + (b.x1 + sway * (1 - b.y1)) * S, y0 + b.y1 * S)
      c.lineTo(x0 + (b.x2 + sway * (1 - b.y2)) * S, y0 + b.y2 * S)
      c.stroke()
    }
    c.lineCap = 'butt'
    for (const [col, sz, dy] of [
      [dark, 1, 0.012],
      [light, 0.62, -0.01],
    ] as const) {
      c.fillStyle = col
      for (const cl of this.clumps) {
        const r = cl.r * S * sz * amount
        if (r < 0.5) continue
        const cx = x0 + (cl.x + sway * (1 - cl.y)) * S
        const cy = y0 + (cl.y + dy) * S
        c.beginPath()
        c.ellipse(cx, cy, r * 1.4, r * 0.75, 0, 0, TAU)
        c.fill()
      }
    }
  }
}
