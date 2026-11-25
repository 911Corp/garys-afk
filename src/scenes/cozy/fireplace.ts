import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

/** Fire palette, from cold to white hot (index 0 = nothing). */
const FIRE = ['#00000000', '#1a0608', '#3a0a0a', '#5e140c', '#86200e', '#a8340e', '#c84c10', '#e06a14', '#ee8a1e', '#f6aa30', '#fac850', '#fde07a', '#fff2b0', '#ffffff']

const C = {
  wall: '#3a2430',
  wall2: '#46303a',
  wallDot: '#523a44',
  floor: '#4a2e22',
  floor2: '#5a3a2a',
  floorLine: '#3a2218',
  brick: '#8a3a2a',
  brick2: '#a44a32',
  mortar: '#5a2a22',
  stone: '#b8a890',
  stone2: '#d4c4a8',
  stone3: '#8a7c68',
  mantel: '#6a4028',
  mantel2: '#8a5634',
  mantel3: '#4a2a1a',
  soot: '#120808',
  iron: '#2a2a32',
  iron2: '#4a4a56',
  brass: '#d4a03a',
  brass2: '#f0c860',
  wax: '#f4ead2',
  frame: '#b08a3a',
  frame2: '#7a5a22',
  rug: '#7a2a3a',
  rug2: '#a43c4a',
  rug3: '#d4a060',
  leaf: '#3e8a4a',
  leaf2: '#6cbf5a',
  pot: '#c86a3a',
  book1: '#2e5a8a',
  book2: '#8a2e3a',
  book3: '#3a7a4a',
  page: '#e8dcc0',
  log: '#5a3422',
  log2: '#7a4a2e',
  logEnd: '#c49a6a',
  chair: '#6a2a3a',
  chair2: '#8a3a4a',
  chair3: '#4a1a28',
  glass: '#1a2440',
  snow: '#e8f0ff',
}

export function create(ctx: SceneContext) {
  return new Fireplace(ctx)
}

/**
 * A pixel-art fireplace on a winter night. The fire is a real per-pixel fire simulation; on the
 * mantel, each object is drawn to be recognised at a glance: a carriage clock that keeps the real
 * time, two brass candlesticks, a stack of books and a potted fern. A landscape painting hangs above.
 */
class Fireplace extends PixelArtScene {
  room!: HTMLCanvasElement
  fire = new Uint8Array(0)
  FW = 0
  FH = 0
  fx = 0
  fy = 0
  embers: { x: number; y: number; vy: number; life: number }[] = []
  snow: { x: number; y: number; v: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.15
  }
  /** Fireplace geometry on the grid. */
  get F() {
    const { PW, PH } = this
    const cx = Math.round(PW / 2)
    const portrait = PH > PW
    const w = portrait ? Math.round(PW * 0.8) : 112
    const floor = Math.round(PH * (portrait ? 0.78 : 0.86))
    const mantelY = floor - (portrait ? 74 : 70)
    return { cx, w, x0: cx - w / 2, x1: cx + w / 2, floor, mantelY, openW: Math.round(w * 0.52), openH: portrait ? 40 : 38 }
  }
  build() {
    const { PW, PH } = this
    const F = this.F
    const R = rng(12)
    const s = document.createElement('canvas')
    s.width = PW
    s.height = PH
    const c = s.getContext('2d')!
    const px = (x: number, y: number, w: number, h: number, col: string) => {
      c.fillStyle = col
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }
    // wallpaper: vertical stripes with a small diamond motif
    px(0, 0, PW, F.floor, C.wall)
    for (let x = 0; x < PW; x += 12) px(x, 0, 6, F.floor, C.wall2)
    for (let y = 6; y < F.floor - 10; y += 12) for (let x = 3; x < PW; x += 12) {
      px(x + 1, y, 1, 1, C.wallDot)
      px(x, y + 1, 3, 1, C.wallDot)
      px(x + 1, y + 2, 1, 1, C.wallDot)
    }
    // skirting board and wooden floor
    px(0, F.floor - 4, PW, 4, C.mantel3)
    px(0, F.floor - 4, PW, 1, C.mantel)
    for (let y = F.floor; y < PH; y++) px(0, y, PW, 1, (y - F.floor) % 6 === 0 ? C.floorLine : C.floor)
    for (let y = F.floor; y < PH; y += 6) for (let x = R.int(0, 30); x < PW; x += R.int(24, 40)) px(x, y, 1, 6, C.floorLine)
    // window on the left with snow outside (drawn live inside the glass)
    if (PW > 200) {
      const wx = 14
      const wy = 18
      px(wx - 3, wy - 3, 40, 52, C.mantel3)
      px(wx - 2, wy - 2, 38, 50, C.mantel)
      px(wx, wy, 34, 46, C.glass)
      px(wx + 16, wy, 2, 46, C.mantel)
      px(wx, wy + 22, 34, 2, C.mantel)
      px(wx - 4, wy + 46, 42, 3, C.mantel2)
    }
    // the chimney breast: stone surround with a brick firebox
    const top = F.mantelY + 6
    for (let y = top; y < F.floor; y++)
      for (let x = Math.round(F.x0 + 6); x < F.x1 - 6; x++) {
        const row = Math.floor((y - top) / 6)
        const off = row % 2 ? 7 : 0
        const edge = (y - top) % 6 === 0 || (x - F.x0 + off) % 14 === 0
        px(x, y, 1, 1, edge ? C.stone3 : (x + y) % 9 === 0 ? C.stone2 : C.stone)
      }
    // firebox opening with an arch, brick-lined, sooty at the back
    const ox = F.cx - F.openW / 2
    const oy = F.floor - F.openH
    for (let y = oy; y < F.floor; y++)
      for (let x = ox; x < ox + F.openW; x++) {
        const archTop = oy + Math.round(Math.pow((x - F.cx) / (F.openW / 2), 2) * 6)
        if (y < archTop) continue
        const brickRow = Math.floor((y - oy) / 4)
        const mortar = (y - oy) % 4 === 0 || (x - ox + (brickRow % 2) * 4) % 8 === 0
        const depth = Math.min(1, (y - archTop) / 10)
        px(x, y, 1, 1, mortar ? C.mortar : depth < 0.6 ? C.soot : (x + y) % 2 ? C.brick : C.brick2)
      }
    // keystone over the arch
    px(F.cx - 3, oy - 2, 6, 5, C.stone2)
    px(F.cx - 3, oy + 3, 6, 1, C.stone3)
    // hearth stone
    px(F.x0 + 2, F.floor - 3, F.w - 4, 3, C.stone2)
    px(F.x0 + 2, F.floor - 3, F.w - 4, 1, '#e8dcc4')
    // mantel shelf with a moulded edge and corbels
    px(F.x0, F.mantelY, F.w, 6, C.mantel)
    px(F.x0, F.mantelY, F.w, 1, C.mantel2)
    px(F.x0 - 2, F.mantelY + 1, F.w + 4, 2, C.mantel2)
    px(F.x0, F.mantelY + 5, F.w, 1, C.mantel3)
    for (const x of [F.x0 + 6, F.x1 - 12]) {
      px(x, F.mantelY + 6, 6, 4, C.mantel)
      px(x + 1, F.mantelY + 10, 4, 2, C.mantel3)
    }
    // landscape painting above the mantel: gilded frame, mountains and a lake
    const pw = Math.min(56, F.w - 30)
    const ph = Math.round(pw * 0.62)
    const pxl = F.cx - pw / 2
    const pyl = F.mantelY - ph - 14
    if (pyl > 2) {
      px(pxl - 3, pyl - 3, pw + 6, ph + 6, C.frame2)
      px(pxl - 2, pyl - 2, pw + 4, ph + 4, C.frame)
      for (let y = 0; y < ph; y++) px(pxl, pyl + y, pw, 1, y < ph * 0.3 ? '#6a8ac8' : y < ph * 0.45 ? '#9ab4dc' : y < ph * 0.7 ? '#4a6a4a' : '#3a5a8a')
      for (let x = 0; x < pw; x++) {
        const mh = Math.round(Math.abs(Math.sin(x * 0.12)) * ph * 0.35)
        px(pxl + x, pyl + Math.round(ph * 0.58) - mh, 1, mh, '#5a6a8a')
        if (mh > ph * 0.28) px(pxl + x, pyl + Math.round(ph * 0.58) - mh, 1, 2, '#f0f4ff')
      }
      px(pxl + pw - 10, pyl + 4, 4, 4, '#f6e8a0')
      // the nail and wire
      px(F.cx, pyl - 8, 1, 1, C.iron2)
      c.strokeStyle = C.iron2
      c.beginPath()
      c.moveTo(F.cx + 0.5, pyl - 7.5)
      c.lineTo(pxl + 4.5, pyl - 2.5)
      c.moveTo(F.cx + 0.5, pyl - 7.5)
      c.lineTo(pxl + pw - 3.5, pyl - 2.5)
      c.stroke()
    }
    // books lying flat on the left of the mantel, spines facing us
    const by = F.mantelY
    const bx = F.x0 + 6
    ;[
      [C.book1, 20, 4],
      [C.book2, 18, 3],
      [C.book3, 21, 4],
    ].forEach(([col, w, h], i) => {
      const y = by - 4 - i * 4 + (i ? 1 : 0) - (i > 1 ? 1 : 0)
      px(bx + i, y - Number(h) + 4, Number(w), Number(h), String(col))
      px(bx + i + 2, y - Number(h) + 5, Number(w) - 4, 1, C.page)
    })
    // potted fern at the right end of the mantel
    const fxp = F.x1 - 14
    px(fxp, by - 7, 9, 7, C.pot)
    px(fxp - 1, by - 8, 11, 2, '#e0844a')
    const fern = [
      [-1, -14],
      [2, -16],
      [5, -15],
      [8, -13],
      [10, -10],
      [-3, -10],
    ]
    for (const [dx, dy] of fern) {
      const steps = Math.abs(dy) - 7
      for (let k = 0; k < steps; k++) {
        const x = fxp + 4 + Math.round((dx * k) / steps)
        const y = by - 8 - k
        px(x, y, 1, 1, k % 2 ? C.leaf : C.leaf2)
        if (k % 2 === 0) px(x + (dx < 3 ? -1 : 1), y, 1, 1, C.leaf)
      }
    }
    // firewood basket on the right of the hearth, logs with visible end grain
    const lbx = Math.min(PW - 26, F.x1 + 6)
    if (lbx > F.x1) {
      px(lbx, F.floor - 10, 22, 10, '#8a6a3a')
      for (let x = lbx + 1; x < lbx + 22; x += 3) px(x, F.floor - 10, 1, 10, '#6a4a22')
      for (const [dx, dy] of [
        [3, -13],
        [9, -14],
        [15, -13],
        [6, -17],
        [12, -17],
      ]) {
        px(lbx + dx - 3, F.floor + dy, 7, 5, C.log)
        px(lbx + dx - 2, F.floor + dy + 1, 4, 3, C.logEnd)
        px(lbx + dx - 1, F.floor + dy + 2, 2, 1, C.log2)
      }
    }
    // fire irons on the left of the hearth
    const tx = F.x0 - 8
    if (tx > 4) {
      px(tx, F.floor - 2, 8, 2, C.iron)
      px(tx + 1, F.floor - 30, 1, 28, C.iron2)
      px(tx + 4, F.floor - 28, 1, 26, C.iron2)
      px(tx + 6, F.floor - 27, 1, 25, C.iron2)
      px(tx - 1, F.floor - 32, 4, 2, C.brass)
      px(tx + 3, F.floor - 30, 3, 2, C.brass)
      px(tx + 5, F.floor - 4, 3, 3, C.iron2)
    }
    // armchair on the right edge, seen from the side
    if (PW > 220) {
      const ax = PW - 34
      const ay = F.floor
      px(ax, ay - 40, 10, 34, C.chair3)
      px(ax + 2, ay - 42, 8, 4, C.chair)
      px(ax + 8, ay - 20, 26, 10, C.chair)
      px(ax + 8, ay - 22, 26, 2, C.chair2)
      px(ax + 4, ay - 26, 8, 10, C.chair2)
      px(ax + 10, ay - 10, 2, 10, C.mantel3)
      px(ax + 30, ay - 10, 2, 10, C.mantel3)
    }
    // rug in front of the hearth with a fringe and a border
    const rw = Math.min(PW - 20, F.w + 30)
    const rx = F.cx - rw / 2
    const ry = F.floor + 4
    const rh = Math.min(PH - ry - 2, 12)
    px(rx, ry, rw, rh, C.rug)
    px(rx + 2, ry + 2, rw - 4, rh - 4, C.rug2)
    for (let x = rx + 6; x < rx + rw - 6; x += 6) px(x, ry + Math.round(rh / 2) - 1, 3, 2, C.rug3)
    for (let x = rx; x < rx + rw; x += 2) {
      px(x, ry - 1, 1, 1, C.rug3)
      px(x, ry + rh, 1, 1, C.rug3)
    }
    this.room = s
    // fire simulation grid sized to the opening
    this.FW = F.openW - 6
    this.FH = F.openH - 4
    this.fx = F.cx - this.FW / 2
    this.fy = F.floor - 3 - this.FH
    this.fire = new Uint8Array(this.FW * this.FH)
    this.snow = Array.from({ length: 30 }, () => ({ x: R.range(14, 48), y: R.range(18, 64), v: R.range(4, 9) }))
  }
  step(dt: number) {
    if (!this.FW) return
    const { FW, FH } = this
    const f = this.fire
    const k = this.num('intensity')
    const max = FIRE.length - 1
    // feed the bottom row; logs sit there, so the source is uneven
    for (let x = 0; x < FW; x++) {
      const centre = 1 - Math.abs(x - FW / 2) / (FW / 2)
      f[(FH - 1) * FW + x] = this.r() < 0.25 + centre * 0.7 * k ? max : Math.max(0, Math.round(max * centre * k * 0.7))
    }
    // classic spreading fire: each cell copies the one below, cooled and nudged sideways
    const steps = Math.max(1, Math.round(dt * 24))
    for (let s = 0; s < steps; s++)
      for (let y = 0; y < FH - 1; y++)
        for (let x = 0; x < FW; x++) {
          const src = (y + 1) * FW + x
          const cool = this.r() < 0.42 ? 1 : 0
          const drift = Math.round(this.r() * 2 - 1)
          const dx = Math.min(FW - 1, Math.max(0, x + drift))
          f[y * FW + dx] = Math.max(0, f[src] - cool - (y < FH * 0.2 && this.r() < 0.5 ? 1 : 0))
        }
    if (this.bool('embers') && this.r.chance(dt * 6 * k)) this.embers.push({ x: this.fx + this.r() * FW, y: this.fy + FH * 0.4, vy: -this.r.range(6, 14), life: this.r.range(0.8, 1.8) })
    for (const e of this.embers) {
      e.y += e.vy * dt
      e.x += Math.sin(this.t * 4 + e.y) * dt * 4
      e.life -= dt
    }
    this.embers = this.embers.filter((e) => e.life > 0 && e.y > this.F.mantelY + 8)
    for (const s of this.snow) {
      s.y += s.v * dt
      s.x += Math.sin(this.t + s.y) * dt * 2
      if (s.y > 64) {
        s.y = 18
        s.x = 14 + this.r() * 34
      }
    }
  }
  compose() {
    const F = this.F
    const t = this.t
    this.b.drawImage(this.room, 0, 0)
    // snow behind the window glass
    if (this.PW > 200) for (const s of this.snow) if (s.x > 14 && s.x < 48 && Math.abs(s.x - 31) > 1 && Math.abs(s.y - 41) > 1) this.dot(s.x, s.y, C.snow)
    // logs in the grate, then the fire over them
    const gy = F.floor - 6
    this.px(F.cx - 16, gy - 2, 32, 4, C.log)
    this.px(F.cx - 14, gy - 5, 14, 4, C.log2)
    this.px(F.cx + 2, gy - 6, 14, 4, C.log)
    this.px(F.cx - 16, gy - 1, 3, 2, C.logEnd)
    this.px(F.cx + 13, gy - 5, 3, 2, C.logEnd)
    for (let y = 0; y < this.FH; y++)
      for (let x = 0; x < this.FW; x++) {
        const v = this.fire[y * this.FW + x]
        if (v > 1) this.dot(this.fx + x, this.fy + y, FIRE[v])
      }
    // iron grate bars in front
    this.px(F.cx - 20, F.floor - 5, 40, 2, C.iron)
    for (let x = F.cx - 18; x <= F.cx + 18; x += 6) this.px(x, F.floor - 9, 1, 6, C.iron2)
    // the clock on the mantel: brass case, white face, real hours and minutes
    const ck = { x: F.cx, y: F.mantelY - 9 }
    this.px(ck.x - 7, ck.y - 6, 15, 15, C.brass)
    this.px(ck.x - 6, ck.y - 7, 13, 1, C.brass2)
    this.px(ck.x - 3, ck.y - 9, 7, 2, C.brass)
    this.px(ck.x - 1, ck.y - 10, 3, 1, C.brass2)
    this.disc(ck.x, ck.y + 1, 5, '#f8f2e0')
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      if (i % 3 === 0) this.dot(ck.x + Math.round(Math.sin(a) * 4), ck.y + 1 - Math.round(Math.cos(a) * 4), C.iron)
    }
    const now = new Date()
    const ma = (now.getMinutes() / 60) * Math.PI * 2
    const ha = ((now.getHours() % 12) / 12 + now.getMinutes() / 720) * Math.PI * 2
    for (let r = 1; r <= 4; r++) this.dot(ck.x + Math.round(Math.sin(ma) * r), ck.y + 1 - Math.round(Math.cos(ma) * r), C.iron)
    for (let r = 1; r <= 2; r++) this.dot(ck.x + Math.round(Math.sin(ha) * r), ck.y + 1 - Math.round(Math.cos(ha) * r), C.book2)
    this.px(ck.x - 7, ck.y + 8, 15, 1, C.brass2)
    // two brass candlesticks with flickering flames
    for (const cx of [F.cx - 22, F.cx + 22]) {
      const base = F.mantelY
      this.px(cx - 3, base - 2, 7, 2, C.brass)
      this.px(cx - 1, base - 9, 3, 7, C.brass)
      this.px(cx - 2, base - 10, 5, 1, C.brass2)
      this.px(cx - 1, base - 18, 3, 8, C.wax)
      this.dot(cx, base - 19, C.iron)
      const fl = Math.sin(t * 9 + cx) > 0.2 ? 1 : 0
      this.px(cx, base - 22 - fl, 1, 2 + fl, FIRE[11])
      this.px(cx, base - 21, 1, 1, FIRE[13])
      this.dot(cx - 1 + fl, base - 21, FIRE[9])
    }
    // embers
    for (const e of this.embers) this.dot(e.x, e.y, e.life > 1 ? FIRE[11] : FIRE[8])
    // warm glow that breathes with the fire
    const glow = this.num('glow') * (0.18 + 0.05 * Math.sin(t * 7) + 0.03 * Math.sin(t * 13))
    const g = this.b.createRadialGradient(F.cx, F.floor - 14, 4, F.cx, F.floor - 14, Math.max(this.PW, this.PH) * 0.7)
    g.addColorStop(0, `rgba(255,150,60,${glow})`)
    g.addColorStop(0.5, `rgba(255,120,40,${glow * 0.4})`)
    g.addColorStop(1, 'rgba(20,6,10,0.35)')
    this.b.fillStyle = g
    this.b.fillRect(0, 0, this.PW, this.PH)
  }
}
