import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

/** Two versions of every colour: in the dark, and lit by a lightning flash. */
const DARK = {
  sky: ['#080b16', '#0e1324', '#161e36', '#222c4a', '#34405e'],
  cloud: ['#121828', '#1a2236', '#242e46'],
  far: '#1a2236',
  hill: '#121c1c',
  hill2: '#182620',
  field: '#142018',
  field2: '#1a2a1e',
  tree: '#0c140e',
  tree2: '#142018',
  rain: '#4a5878',
}
const LIT = {
  sky: ['#4e5a7e', '#5e6c92', '#7080a8', '#8494bc', '#98a8cc'],
  cloud: ['#6a7698', '#8490b2', '#a2aecc'],
  far: '#5a6688',
  hill: '#34463e',
  hill2: '#405648',
  field: '#3a4e3e',
  field2: '#46604a',
  tree: '#22302a',
  tree2: '#2e4036',
  rain: '#c4d0ec',
}
const ROOM = {
  wall: '#2a201c',
  wall2: '#332620',
  stone: '#3a2e28',
  frame: '#5a3c28',
  frame2: '#7a5236',
  frame3: '#3a2618',
  sill: '#6a4630',
  sill2: '#8a5e3e',
  drop: '#b4c6e4',
  drop2: '#7a90b8',
}

type Bolt = { pts: [number, number][]; life: number }
type Drop = { x: number; y: number; size: number; vy: number; still: number }

export function create(ctx: SceneContext) {
  return new Thunderstorm(ctx)
}

/**
 * Pixel art: a storm seen through a cottage window. Outside, only the landscape: hills, a line of
 * trees standing on the ridge, fields running down to the glass. Rain streaks outside and gathers
 * on the pane; lightning lights everything at once. With "no flash" the landscape is never lit
 * and bolts stay dim and short.
 */
class Thunderstorm extends PixelArtScene {
  clouds: { x: number; y: number; w: number; r: number; v: number; shade: number }[] = []
  trees: { x: number; h: number; kind: number }[] = []
  rain: { x: number; y: number; v: number }[] = []
  drops: Drop[] = []
  trails: { x: number; y: number; life: number }[] = []
  bolts: Bolt[] = []
  flash = 0
  next = 2
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.cold16
  }
  dither() {
    return 0.15
  }
  get calm() {
    return this.g.noFlash || this.bool('noflash') || this.g.reducedMotion
  }
  /** The window opening on the grid. */
  get W() {
    const { PW, PH } = this
    const portrait = PH > PW
    const x0 = portrait ? 12 : Math.round(PW * 0.12)
    return { x0, x1: PW - x0, y0: portrait ? 18 : 12, y1: Math.round(PH * (portrait ? 0.7 : 0.8)) }
  }
  /** Ground lines inside the window, all from the same few functions so everything sits on them. */
  farY(x: number) {
    const W = this.W
    const hz = W.y0 + (W.y1 - W.y0) * 0.52
    return Math.round(hz - 6 - Math.abs(Math.sin(x * 0.025 + 0.6)) * 9 - Math.sin(x * 0.09) * 1.5)
  }
  ridgeY(x: number) {
    const W = this.W
    const hz = W.y0 + (W.y1 - W.y0) * 0.6
    return Math.round(hz - Math.sin(x * 0.018 + 2) * 5 - Math.sin(x * 0.05) * 2)
  }
  build() {
    const W = this.W
    const R = rng(29)
    this.clouds = Array.from({ length: 12 }, () => ({ x: R.range(W.x0 - 40, W.x1), y: R.range(W.y0 - 4, W.y0 + (W.y1 - W.y0) * 0.3), w: R.int(30, 64), r: R.int(6, 11), v: R.range(1, 3), shade: R.int(0, 2) }))
    // a hedge of trees along the ridge, rooted on the ridge line
    this.trees = []
    let x = W.x0 + R.int(0, 6)
    while (x < W.x1) {
      if (R.chance(0.7)) this.trees.push({ x, h: R.int(7, 14), kind: R.int(0, 1) })
      x += R.int(5, 13)
    }
    this.rain = Array.from({ length: 90 }, () => ({ x: R.range(W.x0, W.x1), y: R.range(W.y0, W.y1), v: R.range(90, 140) }))
    this.drops = Array.from({ length: 30 }, () => this.newDrop())
  }
  newDrop(): Drop {
    const W = this.W
    return { x: Math.round(W.x0 + 2 + this.r() * (W.x1 - W.x0 - 4)), y: Math.round(W.y0 + 2 + this.r() * (W.y1 - W.y0 - 6)), size: 1, vy: 0, still: this.r.range(1, 6) }
  }
  strike() {
    const W = this.W
    let x = this.r.range(W.x0 + 10, W.x1 - 10)
    let y = W.y0
    const end = this.farY(Math.round(x))
    const pts: [number, number][] = [[x, y]]
    while (y < end) {
      x += this.r.int(-3, 3)
      y += this.r.int(2, 5)
      pts.push([x, Math.min(y, end)])
    }
    this.bolts.push({ pts, life: this.calm ? 0.2 : 0.35 })
    const start = pts[Math.min(pts.length - 1, this.r.int(1, 3))]
    const b: [number, number][] = [start]
    const dir = this.r.chance(0.5) ? 1 : -1
    for (let i = 0; i < 4; i++) b.push([b[i][0] + dir * this.r.int(2, 5), b[i][1] + this.r.int(2, 4)])
    this.bolts.push({ pts: b, life: this.calm ? 0.15 : 0.25 })
    if (!this.calm) this.flash = 1
    this.emit({ type: 'thunder', strength: this.r.range(0.5, 1), delay: this.r.range(0.4, 3) })
  }
  step(dt: number) {
    if (!this.trees.length) return
    const W = this.W
    const wind = this.num('wind')
    const rain = this.num('rain')
    for (const cl of this.clouds) {
      cl.x += cl.v * dt * (0.5 + Math.abs(wind)) * (wind < 0 ? -1 : 1)
      if (cl.x > W.x1 + 10) cl.x = W.x0 - cl.w - 10
      if (cl.x < W.x0 - cl.w - 10) cl.x = W.x1 + 10
    }
    for (const d of this.rain) {
      d.y += d.v * dt * rain
      d.x += wind * 24 * dt
      if (d.y > W.y1) {
        d.y = W.y0
        d.x = W.x0 + this.r() * (W.x1 - W.x0)
      }
      if (d.x > W.x1) d.x = W.x0
      if (d.x < W.x0) d.x = W.x1
    }
    // drops on the pane: grow, then run down leaving a trail
    for (const d of this.drops) {
      if (d.vy === 0) {
        d.still -= dt * rain
        if (d.still < 0 && d.size < 3 && this.r.chance(dt * 2)) d.size++
        if (d.size >= 3 && d.still < -2) d.vy = this.r.range(10, 22)
      } else {
        d.y += d.vy * dt
        if (this.r.chance(dt * 8)) this.trails.push({ x: d.x, y: d.y - 1, life: 2.5 })
        if (d.y > W.y1 - 2) Object.assign(d, this.newDrop())
      }
    }
    for (const t of this.trails) t.life -= dt
    this.trails = this.trails.filter((t) => t.life > 0)
    const freq = this.num('lightning')
    if (freq > 0) {
      this.next -= dt * freq
      if (this.next <= 0) {
        this.next = this.r.range(3, 8)
        this.strike()
      }
    }
    for (const b of this.bolts) b.life -= dt
    this.bolts = this.bolts.filter((b) => b.life > 0)
    this.flash = Math.max(0, this.flash - dt * 2.5)
  }
  compose() {
    const { PW, PH } = this
    const W = this.W
    const P = this.flash > 0.35 ? LIT : DARK
    const t = this.t
    // ---- the room: plastered wall with a stone band ----
    this.px(0, 0, PW, PH, ROOM.wall)
    for (let x = 0; x < PW; x += 9) this.px(x, 0, 1, PH, ROOM.wall2)
    // ---- the landscape, clipped to the opening ----
    this.b.save()
    this.b.beginPath()
    this.b.rect(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0)
    this.b.clip()
    const bandH = (W.y1 - W.y0) * 0.62 / P.sky.length
    P.sky.forEach((col, i) => {
      const y = Math.round(W.y0 + i * bandH)
      this.px(W.x0, y, W.x1 - W.x0, Math.ceil(bandH) + 1, col)
      if (i > 0) for (let x = W.x0; x < W.x1; x += 2) this.dot(x + (i % 2), y, P.sky[i - 1])
    })
    for (const cl of this.clouds) {
      for (let k = 0; k < 4; k++) this.disc(Math.round(cl.x + (k * cl.w) / 4), Math.round(cl.y + (k % 2)), cl.r - (k % 2), P.cloud[cl.shade])
      this.px(cl.x - 2, cl.y + cl.r - 2, cl.w + 4, 2, P.cloud[Math.max(0, cl.shade - 1)])
    }
    // lightning, behind the hills
    for (const b of this.bolts) {
      for (let i = 1; i < b.pts.length; i++) {
        const [x0, y0] = b.pts[i - 1]
        const [x1, y1] = b.pts[i]
        const n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))
        for (let k = 0; k <= n; k++) {
          const x = Math.round(x0 + ((x1 - x0) * k) / n)
          const y = Math.round(y0 + ((y1 - y0) * k) / n)
          if (!this.calm) {
            this.dot(x - 1, y, '#b4c4ff')
            this.dot(x + 1, y, '#b4c4ff')
          }
          this.dot(x, y, this.calm ? '#8a9ad0' : '#ffffff')
        }
      }
    }
    // far hills, then the ridge and its trees, then the fields down to the sill
    for (let x = W.x0; x < W.x1; x++) {
      const fy = this.farY(x)
      this.px(x, fy, 1, W.y1 - fy, P.far)
    }
    for (let x = W.x0; x < W.x1; x++) {
      const ry = this.ridgeY(x)
      this.px(x, ry, 1, W.y1 - ry, P.hill)
      this.dot(x, ry, P.hill2)
    }
    const wind = this.num('wind')
    for (const tr of this.trees) {
      const base = this.ridgeY(tr.x)
      const lean = Math.round(wind + Math.sin(t * 2.4 + tr.x) * 0.6)
      // trunk rooted on the ridge line
      this.px(tr.x, base - 3, 1, 3, P.tree)
      if (tr.kind === 0) {
        // round crown
        this.disc(tr.x + lean, base - 3 - Math.round(tr.h * 0.45), Math.round(tr.h * 0.45), P.tree)
        this.disc(tr.x + lean - 1, base - 4 - Math.round(tr.h * 0.5), Math.max(1, Math.round(tr.h * 0.25)), P.tree2)
      } else {
        // poplar: tall and narrow
        for (let k = 0; k < tr.h; k++) {
          const half = Math.round(Math.sin((k / tr.h) * Math.PI) * 2)
          this.px(tr.x - half + Math.round((lean * k) / tr.h), base - 3 - k, half * 2 + 1, 1, k % 3 ? P.tree : P.tree2)
        }
      }
    }
    // fields: bands that follow the slope, with hedgerow lines between them
    for (let x = W.x0; x < W.x1; x++) {
      const ry = this.ridgeY(x)
      const span = W.y1 - ry
      for (let k = 1; k < 4; k++) {
        const y = Math.round(ry + span * (k * k) / 12 + Math.sin(x * 0.04 + k) * 1.5)
        if (y < W.y1) this.px(x, y, 1, W.y1 - y, k % 2 ? P.field : P.field2)
        if (y < W.y1) this.dot(x, y, P.tree)
      }
    }
    // a river winding down the valley from the ridge, catching the sky
    const riverTop = this.ridgeY(Math.round((W.x0 + W.x1) * 0.55)) + 2
    for (let y = riverTop; y < W.y1; y++) {
      const k = (y - riverTop) / (W.y1 - riverTop)
      const cx = (W.x0 + W.x1) * 0.55 + Math.sin(k * 5.5) * (W.x1 - W.x0) * 0.12 * (0.3 + k)
      const half = Math.max(1, Math.round(1 + k * k * 10))
      this.px(cx - half, y, half * 2, 1, P.sky[3])
      if ((y + Math.floor(t * 6)) % 4 === 0) this.px(cx - half + 1, y, Math.max(1, half - 1), 1, P.sky[4])
      this.dot(cx - half - 1, y, P.tree)
    }
    // rain outside, slanting with the wind
    for (const d of this.rain) {
      const x = Math.round(d.x)
      const y = Math.round(d.y)
      this.dot(x, y, P.rain)
      this.dot(x - Math.round(wind * 0.5), y - 1, P.rain)
      this.dot(x - Math.round(wind * 1), y - 2, P.rain)
      this.dot(x - Math.round(wind * 1.5), y - 3, P.rain)
    }
    // drops and trails on the glass
    for (const tr of this.trails) this.dot(tr.x, tr.y, tr.life > 1.2 ? ROOM.drop2 : P.rain)
    for (const d of this.drops) {
      if (d.size === 1) this.dot(d.x, d.y, ROOM.drop2)
      else {
        this.px(d.x, d.y, d.size - 1, d.size, ROOM.drop2)
        this.dot(d.x, d.y, ROOM.drop)
      }
    }
    this.b.restore()
    // ---- frame: deep reveal, four panes, sill ----
    const fx0 = W.x0 - 5
    const fy0 = W.y0 - 5
    const fw = W.x1 - W.x0 + 10
    const fh = W.y1 - W.y0 + 5
    this.px(fx0, fy0, fw, 5, ROOM.frame)
    this.px(fx0, fy0, 5, fh, ROOM.frame)
    this.px(W.x1, fy0, 5, fh, ROOM.frame)
    this.px(fx0, fy0, fw, 1, ROOM.frame2)
    this.px(fx0, fy0, 1, fh, ROOM.frame2)
    this.px(W.x1 + 4, fy0, 1, fh, ROOM.frame3)
    const mx = Math.round((W.x0 + W.x1) / 2)
    const my = Math.round((W.y0 + W.y1) / 2)
    this.px(mx - 1, W.y0, 3, W.y1 - W.y0, ROOM.frame)
    this.px(mx - 1, W.y0, 1, W.y1 - W.y0, ROOM.frame2)
    this.px(W.x0, my - 1, W.x1 - W.x0, 3, ROOM.frame)
    this.px(W.x0, my - 1, W.x1 - W.x0, 1, ROOM.frame2)
    // sill
    this.px(fx0 - 4, W.y1, fw + 8, 5, ROOM.sill)
    this.px(fx0 - 4, W.y1, fw + 8, 1, ROOM.sill2)
    this.px(fx0 - 2, W.y1 + 5, fw + 4, 2, ROOM.frame3)
    // a flash also lights the room a little
    if (this.flash > 0 && !this.calm) {
      this.b.fillStyle = `rgba(180,196,240,${this.flash * 0.18})`
      this.b.fillRect(0, 0, PW, PH)
    }
  }
}
