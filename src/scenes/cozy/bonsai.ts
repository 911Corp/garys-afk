import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

/**
 * Bonsai, in hand-built pixel art. An evergreen in informal upright style (moyogi), drawn to the
 * classic rules: the trunk is widest at the roots and tapers steadily, its curves shrink towards
 * the apex; surface roots spread into the soil; the first branch sits about a third of the way up;
 * branches alternate left, right and back and get shorter as they rise; foliage grows in pads with
 * flat undersides that together make a scalene triangle; the tree stands left of centre in a
 * shallow pot, displayed on a stand with a small accent plant.
 *
 * Everything sits on the pixel grid: the pot is centred on the stand, the trunk is rooted in the
 * soil, and the light always comes from the upper left.
 */

const LIGHTS: Record<string, { wall: string; wall2: string; line: string; sun: string }> = {
  morning: { wall: '#ebe2d0', wall2: '#e2d7c2', line: '#d6c9b0', sun: 'rgba(255,244,210,0.28)' },
  noon: { wall: '#efe9dc', wall2: '#e6dfcf', line: '#dad1bf', sun: 'rgba(255,255,240,0.18)' },
  evening: { wall: '#e8d2b4', wall2: '#ddc4a2', line: '#cfb48e', sun: 'rgba(255,196,128,0.3)' },
}

/** Greens from darkest to lightest. The evening light shifts them warmer. */
const GREENS = ['#16301c', '#22462a', '#2f6334', '#44823e', '#64a24a', '#8cc25c']
const GREENS_EVE = ['#1a2c18', '#2a4426', '#3c602e', '#5a7e36', '#80a040', '#a8be52']
const BARK = ['#21160f', '#3b2a1f', '#56402e', '#735a42', '#94785a']
const POT = { lip: '#9a5a40', body: '#7e4430', shade: '#5e3022', dark: '#3e1e14', foot: '#4a261a' }
const WOOD = { top: '#5a3a26', edge: '#46301e', dark: '#2a1a10', leg: '#3a2416' }

type Pad = { cx: number; by: number; w: number; h: number; mask: Uint8Array; back: boolean; sway: number }
type Branch = { from: [number, number]; to: [number, number]; w: number; back: boolean; k: number }

export function create(ctx: SceneContext) {
  return new Bonsai(ctx)
}

class Bonsai extends PixelArtScene {
  /** Trunk: for each row from the soil up, the centre x and the width. */
  trunk: { y: number; x: number; w: number }[] = []
  pads: Pad[] = []
  branches: Branch[] = []
  motes: { x: number; y: number; v: number }[] = []
  anchor = { cx: 0, floor: 0, soil: 0, baseX: 0 }
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.forest16
  }
  dither() {
    return 0.1
  }
  get L() {
    return LIGHTS[this.str('light')] ?? LIGHTS.morning
  }
  get G() {
    return this.str('light') === 'evening' ? GREENS_EVE : GREENS
  }
  configure() {
    if (this.buf) this.build()
  }
  build() {
    const { PW, PH } = this
    const cx = Math.round(PW / 2)
    const floor = Math.round(PH * (PH > PW ? 0.74 : 0.86))
    const standTop = floor - 18
    const potTop = standTop - 12
    const soil = potTop - 1
    const baseX = cx - 7
    this.anchor = { cx, floor, soil, baseX }
    // ---- trunk: 66 rows tall, 11 pixels wide at the roots down to 2 at the apex ----
    const H = 66
    this.trunk = []
    for (let i = 0; i <= H; i++) {
      const k = i / H
      // straight for the first rows, then moyogi curves that shrink with height
      const amp = 9 * Math.min(1, k * 5) * (1 - k) ** 1.1
      const x = baseX + Math.sin(k * Math.PI * 3.1) * amp + k * 5
      const w = Math.max(2, Math.round(11 * (1 - k) ** 1.25 + 1.5))
      this.trunk.push({ y: soil - i, x: Math.round(x), w })
    }
    const at = (k: number) => this.trunk[Math.round(k * H)]
    // ---- pads and the branches that carry them (grid pixels) ----
    const R = rng(17)
    this.pads = []
    this.branches = []
    const addPad = (k: number, side: number, reach: number, w: number, h: number, back = false) => {
      const t = at(k)
      const ex = t.x + side * reach
      const ey = t.y + 3
      this.branches.push({ from: [t.x + side * Math.floor(t.w / 2), t.y], to: [ex, ey], w: back ? 1 : t.w > 6 ? 3 : 2, back, k })
      this.pads.push({ cx: ex - side * Math.round(w * 0.12), by: ey + 2, w, h, mask: this.padMask(w, h, R), back, sway: k })
    }
    addPad(0.34, -1, 33, 40, 17) // first branch: the longest, on the left
    addPad(0.46, 1, 27, 34, 16) // second: right, a little higher
    addPad(0.55, 1, 11, 24, 13, true) // back branch, behind the trunk
    addPad(0.63, -1, 20, 28, 14) // third: left
    addPad(0.74, 1, 16, 24, 13) // fourth: right
    addPad(0.84, -1, 10, 18, 11) // fifth: left, near the top
    // apex: a domed crown
    const top = at(1)
    this.pads.push({ cx: top.x + 1, by: top.y + 4, w: 28, h: 16, mask: this.padMask(28, 16, R, true), back: false, sway: 1 })
    this.motes = Array.from({ length: 14 }, () => ({ x: R.range(PW * 0.55, PW * 0.95), y: R.range(0, floor), v: R.range(1, 3) }))
  }
  /**
   * A cloud-shaped foliage pad: an overall elliptical dome, a scalloped top edge (each scallop a
   * small cushion of needles), a flat underside and rounded ends.
   */
  padMask(w: number, h: number, R: ReturnType<typeof rng>, dome = false) {
    const m = new Uint8Array(w * h)
    const scallops = dome ? 3 : Math.max(3, Math.round(w / 9))
    const step = w / scallops
    const off = R.range(0, step * 0.3)
    for (let x = 0; x < w; x++) {
      const e = (x + 0.5 - w / 2) / (w / 2)
      if (Math.abs(e) >= 1) continue
      const domeH = (h - 3) * Math.pow(1 - e * e, dome ? 0.55 : 0.7)
      const bump = Math.abs(Math.sin(((x + off) / step) * Math.PI))
      const top = Math.round(h - 1 - domeH - bump * 2.2 + (dome ? 0 : 1))
      // the underside is flat, its ends pulled in so the pad sits like a cushion
      const bottom = Math.abs(e) > 0.92 ? h - 3 : Math.abs(e) > 0.82 ? h - 2 : h - 1
      for (let y = Math.max(0, top); y <= bottom; y++) m[y * w + x] = 1
    }
    return m
  }
  step(dt: number) {
    for (const m of this.motes) {
      m.y -= m.v * dt
      if (m.y < 0) m.y = this.anchor.floor
    }
  }
  /** Whole-pixel sway, stronger near the top of the tree. */
  breeze(k: number) {
    if (this.g.reducedMotion) return 0
    return Math.round(Math.sin(this.t * 0.9 + k * 2) * k * k * this.num('breeze') * 1.4)
  }
  compose() {
    const { PW, PH } = this
    const L = this.L
    const A = this.anchor
    // ---- wall: paper panels and a soft beam of window light ----
    this.px(0, 0, PW, A.floor, L.wall)
    for (let x = 4; x < PW; x += 24) this.px(x, 0, 12, A.floor, L.wall2)
    for (let x = 0; x < PW; x += 24) this.px(x, 0, 1, A.floor, L.line)
    for (let y = 22; y < A.floor - 10; y += 30) this.px(0, y, PW, 1, L.line)
    this.b.fillStyle = L.sun
    this.b.beginPath()
    this.b.moveTo(PW * 0.6, 0)
    this.b.lineTo(PW * 0.92, 0)
    this.b.lineTo(PW * 0.74, A.floor)
    this.b.lineTo(PW * 0.42, A.floor)
    this.b.fill()
    for (const m of this.motes) this.dot(m.x, m.y, '#fffaf0')
    // ---- floor: light wood boards ----
    this.px(0, A.floor, PW, PH - A.floor, '#c0a07a')
    this.px(0, A.floor, PW, 1, '#8a6a4a')
    this.px(0, A.floor + 1, PW, 1, '#d4b892')
    for (let y = A.floor + 6; y < PH; y += 6) this.px(0, y, PW, 1, '#a88a66')
    for (let x = 10; x < PW; x += 37) for (let y = A.floor + 1; y < PH; y += 12) this.px(x + ((y >> 2) % 2) * 18, y, 1, 5, '#a88a66')
    // ---- stand: 96 wide, centred ----
    const sw = 96
    const sx = A.cx - sw / 2
    const st = A.floor - 18
    this.px(sx + 6, A.floor, sw - 12, 1, '#9a7a56')
    this.px(sx, st, sw, 4, WOOD.top)
    this.px(sx, st, sw, 1, '#7a5236')
    this.px(sx, st + 3, sw, 1, WOOD.edge)
    for (const lx of [sx + 4, sx + sw - 8]) {
      this.px(lx, st + 4, 4, A.floor - st - 4, WOOD.leg)
      this.px(lx, st + 4, 1, A.floor - st - 4, WOOD.edge)
    }
    this.px(sx + 8, st + 4, sw - 16, 2, WOOD.dark)
    // ---- pot: 64 wide, centred on the stand, shallow ----
    const pw = 64
    const px0 = A.cx - pw / 2
    const pt = st - 12
    this.px(px0 - 1, pt, pw + 2, 2, POT.lip)
    this.px(px0 - 1, pt, pw + 2, 1, '#b06e50')
    for (let y = 2; y < 10; y++) {
      const inset = Math.floor((y - 2) / 3)
      this.px(px0 + inset, pt + y, pw - inset * 2, 1, POT.body)
      this.px(px0 + inset, pt + y, 2, 1, POT.lip)
      this.px(px0 + pw - inset - 3, pt + y, 3, 1, POT.shade)
    }
    this.px(px0 + 3, pt + 6, pw - 6, 1, POT.shade)
    this.px(px0 + 2, pt + 10, pw - 4, 1, POT.dark)
    this.px(px0 + 6, pt + 11, 6, 1, POT.foot)
    this.px(px0 + pw - 12, pt + 11, 6, 1, POT.foot)
    // soil and moss inside the lip
    this.px(px0 + 1, pt - 1, pw - 2, 1, '#3a2a1c')
    for (let x = px0 + 2; x < px0 + pw - 2; x++) {
      const bump = Math.sin(x * 0.9) + Math.sin(x * 0.37) > 0.6 ? 1 : 0
      this.dot(x, pt - 1 - bump, bump ? '#6aa64a' : '#4e8a3c')
    }
    // ---- the tree: back pad and branch, trunk, front branches and pads ----
    const G = this.G
    for (const p of this.pads) if (p.back) this.drawPad(p, G)
    for (const b of this.branches) if (b.back) this.drawBranch(b)
    this.drawTrunk()
    for (const b of this.branches) if (!b.back) this.drawBranch(b)
    for (const p of this.pads) if (!p.back) this.drawPad(p, G)
    // ---- accent plant on the floor, right of the stand ----
    const ax = sx + sw + 16
    if (ax + 8 < PW) {
      this.px(ax - 5, A.floor - 6, 11, 6, '#cbb594')
      this.px(ax - 6, A.floor - 6, 13, 1, '#ddc9a8')
      this.px(ax + 3, A.floor - 5, 2, 5, '#b09878')
      const blades: [number, number][] = [
        [-4, 7],
        [-2, 10],
        [0, 12],
        [2, 9],
        [4, 7],
        [-1, 8],
        [1, 11],
      ]
      for (const [dx, hgt] of blades) {
        const lean = Math.round(Math.sin(this.t * 1.3 + dx) * this.num('breeze') * 0.8)
        const dir = dx < 0 ? -1 : dx > 0 ? 1 : 0
        for (let k = 0; k < hgt; k++) this.dot(ax + dx + Math.round((dir * k) / 5) + (k > hgt - 3 ? lean : 0), A.floor - 7 - k, k > hgt * 0.6 ? '#7ab452' : '#4e8a3c')
      }
    }
  }
  drawTrunk() {
    const A = this.anchor
    // nebari: roots that spread along the soil and taper out
    const base = this.trunk[0]
    for (const [side, len] of [
      [-1, 7],
      [1, 6],
    ] as const) {
      for (let k = 0; k < len; k++) {
        const x = base.x + side * (Math.floor(base.w / 2) + 2 + k)
        const h = Math.max(1, 3 - Math.floor(k / 2.5))
        this.px(x, A.soil - h + 1, 1, h, k < len - 2 ? BARK[2] : BARK[1])
        this.dot(x, A.soil - h + 1, k < 3 ? BARK[3] : BARK[2])
      }
    }
    // rows: dark outline, a lit left edge, mid tones, shaded right side
    for (let i = 0; i < this.trunk.length; i++) {
      const r = this.trunk[i]
      const k = i / (this.trunk.length - 1)
      const x = r.x + this.breeze(k)
      const w = r.w + (i < 4 ? 4 - i : 0)
      const x0 = x - Math.floor(w / 2)
      this.px(x0, r.y, w, 1, BARK[2])
      this.dot(x0, r.y, BARK[0])
      this.dot(x0 + w - 1, r.y, BARK[0])
      if (w > 3) {
        this.dot(x0 + 1, r.y, BARK[4])
        if (w > 6) this.dot(x0 + 2, r.y, BARK[3])
        this.dot(x0 + w - 2, r.y, BARK[1])
        if (w > 6) this.dot(x0 + w - 3, r.y, BARK[1])
      }
      if (w > 5 && (i * 7) % 5 === 0) this.dot(x0 + Math.floor(w / 2) + ((i >> 2) % 2), r.y, BARK[1])
    }
  }
  drawBranch(b: Branch) {
    const [x0, y0] = b.from
    const [x1, y1] = b.to
    const sway = this.breeze(b.k)
    const n = Math.max(1, Math.abs(x1 - x0))
    for (let s = 0; s <= n; s++) {
      const t = s / n
      // rises a little out of the trunk, then is wired down towards the pad
      const x = Math.round(x0 + (x1 - x0) * t) + sway
      const y = Math.round(y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 3)
      const w = Math.max(1, Math.round(b.w * (1 - t * 0.5)))
      this.px(x, y, 1, w, b.back ? BARK[1] : BARK[2])
      this.dot(x, y + w, BARK[0])
      if (!b.back) this.dot(x, y, BARK[3])
    }
  }
  drawPad(p: Pad, G: string[]) {
    const { w, h, mask } = p
    const ox = p.cx - Math.floor(w / 2) + this.breeze(p.sway)
    const oy = p.by - h
    const shift = p.back ? -1 : 0
    const g = (i: number) => G[Math.max(0, Math.min(G.length - 1, i + shift))]
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
        let col: string
        if (edge) col = g(0)
        else {
          let fromTop = 0
          while (inside(x, y - fromTop - 1)) fromTop++
          const fromBottom = h - 1 - y
          // light from the upper left; the underside stays in shadow
          if (fromBottom <= 1) col = g(1)
          else if (fromTop <= 1) col = x < w * 0.6 ? g(5) : g(4)
          else if (fromTop <= 3) col = g(4)
          else col = (x + y) % 2 === 0 && fromTop <= 5 ? g(3) : g(2)
          // needle tufts: lighter specks scattered on the lit side
          if (fromTop > 2 && fromBottom > 2 && (x * 5 + y * 3) % 11 === 0) col = g(4)
        }
        this.dot(ox + x, oy + y, col)
      }
  }
}
