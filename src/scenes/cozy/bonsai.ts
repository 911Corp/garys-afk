import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

/**
 * Bonsai, in flat illustration. An evergreen in informal upright style (moyogi), built to the
 * classic rules:
 * - the trunk is widest at the base, tapers steadily, and its curves get smaller towards the apex;
 * - surface roots (nebari) spread from the base into the soil;
 * - the first branch sits about a third of the way up, on the outside of a curve; branches then
 *   alternate left, right and back, getting shorter and thinner as they rise;
 * - foliage grows in pads with flat undersides and domed tops; together they form a scalene
 *   triangle, and the apex leans slightly towards the viewer;
 * - the tree stands off-centre in a shallow pot whose depth is about the trunk's width at the base,
 *   and is displayed on a stand with a small accent plant.
 */

const LIGHTS: Record<string, { wall: [string, string]; sun: string; shadow: string; leafTint: number }> = {
  morning: { wall: ['#f3ecdf', '#e4d8c4'], sun: 'rgba(255,240,200,0.35)', shadow: 'rgba(60,40,20,0.10)', leafTint: 0 },
  noon: { wall: ['#f6f2ea', '#e8e0d2'], sun: 'rgba(255,255,240,0.25)', shadow: 'rgba(60,40,20,0.08)', leafTint: 0.06 },
  evening: { wall: ['#f0dcc4', '#d8b898'], sun: 'rgba(255,190,120,0.35)', shadow: 'rgba(80,40,20,0.14)', leafTint: -0.05 },
}

const LEAF = ['#1f4a2a', '#2e6a36', '#3f8a40', '#62a84c', '#8cc460']
const BARK = { dark: '#3a2a22', mid: '#5c4434', light: '#8a6a52' }

type Pt = { x: number; y: number }
type Branch = { at: number; side: number; len: number; drop: number; back: boolean; pad: number }

export function create(ctx: SceneContext) {
  return new Bonsai(ctx)
}

class Bonsai extends PixelScene {
  spine: Pt[] = []
  widths: number[] = []
  branches: Branch[] = []
  tufts: { x: number; y: number; r: number }[][] = []
  motes: { x: number; y: number; v: number; p: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.forest16
  }
  dither() {
    return 0.25
  }
  get L() {
    return LIGHTS[this.str('light')] ?? LIGHTS.morning
  }
  /** Overall scale: height of the tree above the soil. */
  get S() {
    return Math.min(this.h * 0.5, this.w * 0.42)
  }
  get base() {
    const { w, h } = this
    const S = this.S
    // the tree sits a little left of the pot centre, which itself sits a little left of the stand
    return { x: w * 0.5 - S * 0.16, y: h * 0.66 }
  }
  layout() {
    const R = rng(108)
    const S = this.S
    // trunk spine in normalised units (x across, y up), moyogi curves shrinking with height
    const pts: Pt[] = []
    const N = 40
    for (let i = 0; i <= N; i++) {
      const k = i / N
      // the base rises straight from the roots, then the curves begin and shrink upwards
      const amp = 0.12 * Math.min(1, k * 6) * (1 - k) ** 1.1
      const x = Math.sin(k * 3.2 * Math.PI) * amp + k * 0.1
      pts.push({ x: x * S, y: -k * S })
    }
    this.spine = pts
    this.widths = pts.map((_, i) => {
      const k = i / N
      return S * (0.13 * (1 - k) ** 1.35 + 0.012)
    })
    // branches: first at a third of the height, alternating, the back ones shorter
    this.branches = [
      { at: 0.33, side: -1, len: 0.5, drop: 0.08, back: false, pad: 1.0 },
      { at: 0.43, side: 1, len: 0.42, drop: 0.07, back: false, pad: 0.9 },
      { at: 0.52, side: 1, len: 0.22, drop: 0.03, back: true, pad: 0.7 },
      { at: 0.6, side: -1, len: 0.3, drop: 0.05, back: false, pad: 0.75 },
      { at: 0.7, side: 1, len: 0.26, drop: 0.04, back: false, pad: 0.65 },
      { at: 0.79, side: -1, len: 0.17, drop: 0.03, back: false, pad: 0.55 },
    ]
    // foliage tufts for each pad (plus the apex), precomputed so the shape is stable
    this.tufts = [...this.branches.map((b) => b.pad), 0.8].map((size) => {
      const n = 26
      return Array.from({ length: n }, () => {
        const a = R.range(Math.PI * 1.05, Math.PI * 1.95)
        const r = Math.sqrt(R()) * 0.95
        return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.55, r: R.range(0.16, 0.26) * size }
      })
    })
    this.motes = Array.from({ length: 18 }, () => ({ x: R(), y: R(), v: R.range(0.003, 0.01), p: R() * TAU }))
  }
  /** Point on the trunk spine at height fraction k (0 base, 1 apex), with the breeze applied. */
  trunkAt(k: number) {
    const i = Math.min(this.spine.length - 1, Math.max(0, Math.round(k * (this.spine.length - 1))))
    const p = this.spine[i]
    const sway = this.sway(k)
    return { x: p.x + sway, y: p.y, w: this.widths[i] }
  }
  sway(k: number) {
    if (this.g.reducedMotion) return 0
    return Math.sin(this.t * 0.9) * k * k * this.S * 0.008 * this.num('breeze')
  }
  step(dt: number) {
    for (const m of this.motes) {
      m.y -= m.v * dt
      m.x += Math.sin(this.t * 0.4 + m.p) * dt * 0.004
      if (m.y < 0) m.y = 1
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const L = this.L
    const S = this.S
    const B = this.base
    // wall and a soft patch of window light
    const wall = c.createLinearGradient(0, 0, 0, h)
    wall.addColorStop(0, L.wall[0])
    wall.addColorStop(1, L.wall[1])
    c.fillStyle = wall
    c.fillRect(0, 0, w, h)
    c.fillStyle = L.sun
    c.beginPath()
    c.moveTo(w * 0.62, 0)
    c.lineTo(w * 0.98, 0)
    c.lineTo(w * 0.78, h * 0.8)
    c.lineTo(w * 0.36, h * 0.8)
    c.fill()
    // window lattice shadow across the light
    c.strokeStyle = L.shadow
    c.lineWidth = Math.max(1, 1.5 * u)
    for (let k = 0; k < 4; k++) {
      c.beginPath()
      c.moveTo(w * (0.66 + k * 0.08), 0)
      c.lineTo(w * (0.43 + k * 0.1), h * 0.8)
      c.stroke()
    }
    // dust motes in the light
    c.fillStyle = 'rgba(255,250,230,0.6)'
    for (const m of this.motes) c.fillRect(w * (0.45 + m.x * 0.35), m.y * h * 0.8, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
    // floor
    const floor = h * 0.86
    c.fillStyle = '#b89a76'
    c.fillRect(0, floor, w, h - floor)
    c.fillStyle = '#a4865f'
    for (let x = 0; x < w; x += 18 * u) c.fillRect(x, floor, Math.max(1, 0.5 * u), h - floor)
    c.fillStyle = '#8a6c4a'
    c.fillRect(0, floor, w, Math.max(1, u))
    // display stand: dark wood slab on short legs
    const standW = S * 1.25
    const standX = w * 0.5 - standW / 2 + S * 0.05
    const potH = S * 0.12
    const potW = S * 0.74
    const potTop = B.y
    const standTop = potTop + potH + S * 0.01
    c.fillStyle = 'rgba(40,24,10,0.18)'
    c.beginPath()
    c.ellipse(w * 0.5, floor + 2 * u, standW * 0.55, 4 * u, 0, 0, TAU)
    c.fill()
    c.fillStyle = '#3a2418'
    c.fillRect(standX, standTop, standW, S * 0.045)
    c.fillStyle = '#5a3a26'
    c.fillRect(standX, standTop, standW, Math.max(1, S * 0.01))
    c.fillStyle = '#2a180e'
    c.fillRect(standX + S * 0.04, standTop + S * 0.045, S * 0.05, floor - standTop - S * 0.045)
    c.fillRect(standX + standW - S * 0.09, standTop + S * 0.045, S * 0.05, floor - standTop - S * 0.045)
    // pot: shallow, unglazed, with a lip and two feet; the tree stands left of its centre
    const potX = B.x + S * 0.16 - potW / 2
    c.fillStyle = '#6a3a2a'
    c.beginPath()
    c.moveTo(potX, potTop)
    c.lineTo(potX + potW, potTop)
    c.lineTo(potX + potW - S * 0.03, potTop + potH)
    c.lineTo(potX + S * 0.03, potTop + potH)
    c.fill()
    c.fillStyle = '#7e4a36'
    c.fillRect(potX - S * 0.012, potTop - S * 0.012, potW + S * 0.024, S * 0.024)
    c.fillStyle = '#54301f'
    c.fillRect(potX + S * 0.03, potTop + potH * 0.55, potW - S * 0.06, Math.max(1, S * 0.006))
    c.fillRect(potX + S * 0.08, potTop + potH, S * 0.06, S * 0.012)
    c.fillRect(potX + potW - S * 0.14, potTop + potH, S * 0.06, S * 0.012)
    // soil and moss mounds
    c.fillStyle = '#3a2a1e'
    c.fillRect(potX + S * 0.005, potTop - S * 0.018, potW - S * 0.01, S * 0.012)
    c.fillStyle = '#4f8a3a'
    for (let i = 0; i < 9; i++) {
      const mx = potX + potW * (0.06 + i * 0.11)
      c.beginPath()
      c.ellipse(mx, potTop - S * 0.016, S * 0.05, S * 0.016, 0, Math.PI, TAU)
      c.fill()
    }
    // tree, drawn relative to its base
    c.save()
    c.translate(B.x, potTop - S * 0.012)
    this.drawTree()
    c.restore()
    // accent plant: a small grass tuft in a tiny pot, lower and to the right
    const ax = standX + standW + S * 0.08
    const ay = floor - S * 0.06
    if (ax + S * 0.12 < w) {
      c.fillStyle = '#c8b090'
      c.fillRect(ax - S * 0.05, ay, S * 0.1, S * 0.06)
      c.fillStyle = '#b09878'
      c.fillRect(ax - S * 0.055, ay, S * 0.11, Math.max(1, S * 0.01))
      c.strokeStyle = '#5a9a46'
      c.lineWidth = Math.max(1, S * 0.006)
      for (let k = -4; k <= 4; k++) {
        const sw = Math.sin(this.t * 1.2 + k) * S * 0.004 * this.num('breeze')
        c.beginPath()
        c.moveTo(ax + k * S * 0.006, ay)
        c.quadraticCurveTo(ax + k * S * 0.012, ay - S * 0.06, ax + k * S * 0.02 + sw, ay - S * (0.08 + (4 - Math.abs(k)) * 0.008))
        c.stroke()
      }
    }
  }
  drawTree() {
    const c = this.c
    const S = this.S
    // nebari: surface roots hugging the soil, thick at the trunk and thinning outward
    const w0 = this.widths[0]
    c.fillStyle = BARK.mid
    for (const [side, len, lift] of [
      [-1, 1.5, 0.22],
      [1, 1.3, 0.2],
      [-1, 0.9, 0.12],
      [1, 0.8, 0.1],
    ] as const) {
      c.beginPath()
      c.moveTo(side * w0 * 0.2, -w0 * (0.25 + lift))
      c.quadraticCurveTo(side * w0 * 0.55, -w0 * 0.08, side * w0 * (0.5 + len), 0)
      c.lineTo(side * w0 * 0.1, 0)
      c.closePath()
      c.fill()
    }
    // back branch and its pad first, so the trunk passes in front of it
    this.branches.forEach((b, i) => {
      if (b.back) this.drawBranch(b, i)
    })
    // trunk: a filled outline from left edge up and right edge down
    const N = this.spine.length
    const left: Pt[] = []
    const right: Pt[] = []
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1)
      const p = this.trunkAt(k)
      const q = this.trunkAt(Math.min(1, k + 1 / (N - 1)))
      const ang = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2
      left.push({ x: p.x + Math.cos(ang) * p.w * 0.5, y: p.y + Math.sin(ang) * p.w * 0.5 })
      right.push({ x: p.x - Math.cos(ang) * p.w * 0.5, y: p.y - Math.sin(ang) * p.w * 0.5 })
    }
    c.fillStyle = BARK.mid
    c.beginPath()
    left.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
    for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i].x, right[i].y)
    c.closePath()
    c.fill()
    // shading: dark side on the right, a light ridge on the left, a few bark lines
    c.strokeStyle = BARK.dark
    c.lineWidth = Math.max(1, S * 0.012)
    c.beginPath()
    right.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
    c.stroke()
    c.strokeStyle = BARK.light
    c.lineWidth = Math.max(1, S * 0.008)
    c.beginPath()
    for (let i = 0; i < N * 0.8; i++) {
      const p = this.trunkAt(i / (N - 1))
      const x = p.x - p.w * 0.22
      if (i) c.lineTo(x, p.y)
      else c.moveTo(x, p.y)
    }
    c.stroke()
    // front branches and pads, low to high
    this.branches.forEach((b, i) => {
      if (!b.back) this.drawBranch(b, i)
    })
    // apex: a domed crown leaning slightly forward
    const top = this.trunkAt(1)
    this.pad(top.x + S * 0.01, top.y - S * 0.02, S * 0.2, this.tufts[this.tufts.length - 1], 1)
  }
  drawBranch(b: Branch, i: number) {
    const c = this.c
    const S = this.S
    const p = this.trunkAt(b.at)
    const endX = p.x + b.side * b.len * S
    const endY = p.y + b.drop * S * 0.6
    // the branch leaves the trunk rising slightly, then is wired down towards the pad
    c.strokeStyle = b.back ? '#4a3a30' : BARK.mid
    c.lineCap = 'round'
    c.lineWidth = Math.max(1, p.w * 0.38)
    c.beginPath()
    c.moveTo(p.x, p.y)
    c.quadraticCurveTo(p.x + b.side * b.len * S * 0.35, p.y - S * 0.035, endX, endY)
    c.stroke()
    // two secondary twigs into the pad
    c.lineWidth = Math.max(1, p.w * 0.16)
    for (const f of [0.6, 0.85]) {
      const tx = p.x + b.side * b.len * S * f
      const ty = p.y + b.drop * S * 0.4 * f
      c.beginPath()
      c.moveTo(tx, ty)
      c.lineTo(tx + b.side * S * 0.05, ty - S * 0.03)
      c.stroke()
    }
    c.lineCap = 'butt'
    const padW = S * 0.26 * b.pad
    this.pad(endX - b.side * padW * 0.2, endY - S * 0.03, padW, this.tufts[i], b.back ? 0.75 : 1)
  }
  /** A foliage pad: flat underside, domed top, three greens lit from the upper left. */
  pad(x: number, y: number, size: number, tufts: { x: number; y: number; r: number }[], depth: number) {
    const c = this.c
    const tint = this.L.leafTint
    const col = (i: number) => {
      const k = Math.max(0, Math.min(LEAF.length - 1, i + (depth < 1 ? -1 : 0)))
      return tint === 0 ? LEAF[k] : shade(LEAF[k], tint)
    }
    const wob = this.g.reducedMotion ? 0 : Math.sin(this.t * 1.1 + x * 0.01) * size * 0.01 * this.num('breeze')
    // shadow layer with the flat underside
    c.fillStyle = col(0)
    c.beginPath()
    c.ellipse(x + wob, y + size * 0.05, size, size * 0.5, 0, Math.PI, TAU)
    c.lineTo(x - size + wob, y + size * 0.05)
    c.fill()
    c.fillRect(x - size * 0.92 + wob, y + size * 0.02, size * 1.84, size * 0.08)
    // body and highlight tufts
    for (const [layer, dy, scale] of [
      [1, 0, 1],
      [2, -0.04, 0.85],
      [3, -0.09, 0.62],
    ] as const) {
      c.fillStyle = col(layer)
      for (const t of tufts) {
        const tx = x + wob + t.x * size * 0.85 * scale - (layer - 1) * size * 0.06
        const ty = y + (t.y * 1.45 + dy) * size * 0.9
        c.beginPath()
        c.ellipse(tx, ty, t.r * size * scale * 1.1, t.r * size * 0.8 * scale, 0, 0, TAU)
        c.fill()
      }
    }
    // a few bright needle flecks on top
    c.fillStyle = col(4)
    for (let k = 0; k < tufts.length; k += 3) {
      const t = tufts[k]
      c.fillRect(x + wob + t.x * size * 0.5 - size * 0.12, y + t.y * size * 0.6 - size * 0.12, Math.max(1, size * 0.03), Math.max(1, size * 0.015))
    }
  }
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * k)))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `rgb(${r},${g},${b})`
}
