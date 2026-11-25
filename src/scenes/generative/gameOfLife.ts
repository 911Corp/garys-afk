import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

const PALS: Record<string, string[]> = {
  lcd: ['#1f2a12', '#2e3d1a', '#4f6a2a', '#8fb354', '#b8d97a', '#e8f5c8'],
  ember: ['#0c0705', '#3f1f0f', '#9a3d16', '#f08a2a', '#ffbe4f', '#fffbe8'],
  ice: ['#020409', '#0e2236', '#22557a', '#3a7fa3', '#a6dbe5', '#ffffff'],
  mono: ['#000000', '#1a1a1a', '#444444', '#888888', '#cccccc', '#ffffff'],
}

/** Rule as birth/survival bitmasks over neighbour counts 0..8. */
const RULES: Record<string, { b: number; s: number }> = {
  conway: { b: 1 << 3, s: (1 << 2) | (1 << 3) }, // B3/S23
  highlife: { b: (1 << 3) | (1 << 6), s: (1 << 2) | (1 << 3) }, // B36/S23
}

/** Well-known patterns, as live-cell coordinates. */
const GLIDER_GUN = [
  [24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2], [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3],
  [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
  [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8],
]
const R_PENTOMINO = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]]
const ACORN = [[1, 0], [3, 1], [0, 2], [1, 2], [4, 2], [5, 2], [6, 2]]
const GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]]

export function create(ctx: SceneContext) {
  return new GameOfLife(ctx)
}

/** One generation on a wrapping grid. Writes into `next`, returns the population. Pure. */
export function lifeStep(cells: Uint8Array, next: Uint8Array, gw: number, gh: number, rule: { b: number; s: number }) {
  let pop = 0
  for (let y = 0; y < gh; y++) {
    const ym = ((y - 1 + gh) % gh) * gw
    const y0 = y * gw
    const yp = ((y + 1) % gh) * gw
    for (let x = 0; x < gw; x++) {
      const xm = (x - 1 + gw) % gw
      const xp = (x + 1) % gw
      const n = cells[ym + xm] + cells[ym + x] + cells[ym + xp] + cells[y0 + xm] + cells[y0 + xp] + cells[yp + xm] + cells[yp + x] + cells[yp + xp]
      const i = y0 + x
      const alive = cells[i] ? (rule.s >> n) & 1 : (rule.b >> n) & 1
      next[i] = alive
      pop += alive
    }
  }
  return pop
}

export { RULES }

/**
 * The real thing: a toroidal grid updated with Conway's B3/S23 rule (or HighLife B36/S23).
 * Cells fade as they age and dead cells leave a short trace. When the board settles into a
 * repeating state, it reseeds.
 */
class GameOfLife extends PixelScene {
  gw = 0
  gh = 0
  cells = new Uint8Array(0)
  next = new Uint8Array(0)
  age = new Uint16Array(0)
  trace = new Uint8Array(0)
  acc = 0
  generation = 0
  history: number[] = []
  img: ImageData | null = null
  rgb: number[][] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PALS[this.str('palette')] ?? PALS.lcd
  }
  dither() {
    return 0
  }
  get cell() {
    return Math.max(1, Math.round(this.num('cell') * this.u))
  }
  layout() {
    this.gw = Math.ceil(this.w / this.cell)
    this.gh = Math.ceil(this.h / this.cell)
    const n = this.gw * this.gh
    this.cells = new Uint8Array(n)
    this.next = new Uint8Array(n)
    this.age = new Uint16Array(n)
    this.trace = new Uint8Array(n)
    this.img = new ImageData(this.w, this.h)
    this.seed()
  }
  configure() {
    this.rgb = this.palette().map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])
    const want = Math.ceil(this.w / this.cell)
    if (want !== this.gw) this.layout()
  }
  put(pts: number[][], ox: number, oy: number) {
    for (const [x, y] of pts) this.cells[((oy + y + this.gh) % this.gh) * this.gw + ((ox + x + this.gw) % this.gw)] = 1
  }
  seed() {
    this.cells.fill(0)
    this.age.fill(0)
    this.generation = 0
    this.history = []
    const mode = this.str('seed')
    const cx = Math.floor(this.gw / 2)
    const cy = Math.floor(this.gh / 2)
    if (mode === 'gun') {
      this.put(GLIDER_GUN, 2, 2)
      if (this.gw > 80) this.put(GLIDER_GUN.map(([x, y]) => [35 - x, y]), this.gw - 40, this.gh - 14)
    } else if (mode === 'rpent') this.put(R_PENTOMINO, cx, cy)
    else if (mode === 'acorn') this.put(ACORN, cx - 3, cy)
    else if (mode === 'gliders') {
      for (let i = 0; i < 24; i++) this.put(GLIDER, this.r.int(0, this.gw - 1), this.r.int(0, this.gh - 1))
    } else {
      const p = this.num('fill')
      for (let i = 0; i < this.cells.length; i++) this.cells[i] = this.r() < p ? 1 : 0
    }
    this.configure()
  }
  tick() {
    const { gw, gh, cells, next } = this
    const rule = RULES[this.str('rule')] ?? RULES.conway
    const pop = lifeStep(cells, next, gw, gh, rule)
    let hash = 0
    for (let i = 0; i < next.length; i++) {
      if (next[i]) {
        this.age[i] = Math.min(65535, this.age[i] + 1)
        hash = (hash * 31 + i) | 0
      } else {
        if (cells[i]) this.trace[i] = 6
        else if (this.trace[i]) this.trace[i]--
        this.age[i] = 0
      }
    }
    this.cells = next
    this.next = cells
    this.generation++
    // stagnation: same state seen recently (still lifes, blinkers) or extinction
    this.history.push(hash ^ pop)
    if (this.history.length > 30) this.history.shift()
    const repeats = this.history.filter((h) => h === (hash ^ pop)).length
    if (pop === 0 || (repeats > 3 && this.generation > 60) || this.generation > 4000) {
      if (this.bool('autoreset')) this.seed()
    }
  }
  step(dt: number) {
    this.acc += dt * this.num('gps')
    let n = 0
    while (this.acc > 1 && n < 8) {
      this.acc--
      this.tick()
      n++
    }
    if (n === 8) this.acc = 0
  }
  draw() {
    const { w, h, gw, cell } = this
    const d = this.img!.data
    const P = this.rgb.length ? this.rgb : this.palette().map((x) => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)])
    for (let y = 0; y < h; y++) {
      const gy = Math.floor(y / cell)
      for (let x = 0; x < w; x++) {
        const gx = Math.floor(x / cell)
        const i = gy * gw + gx
        let k = 0
        if (this.cells[i]) {
          const a = this.age[i]
          k = a < 2 ? 5 : a < 8 ? 4 : 3
        } else if (this.trace[i]) k = this.trace[i] > 3 ? 2 : 1
        // a 1px gap between cells when they are big enough
        if (cell >= 4 && (x % cell === 0 || y % cell === 0)) k = Math.min(k, 1)
        const o = (y * w + x) * 4
        d[o] = P[k][0]
        d[o + 1] = P[k][1]
        d[o + 2] = P[k][2]
        d[o + 3] = 255
      }
    }
    this.c.putImageData(this.img!, 0, 0)
    if (this.bool('counter')) {
      const c = this.c
      c.font = `${Math.round(9 * this.u)}px "VT323", monospace`
      c.textAlign = 'left'
      c.textBaseline = 'top'
      c.fillStyle = this.palette()[3]
      c.fillText(`gen ${this.generation}`, 3 * this.u, 2 * this.u)
    }
  }
}
