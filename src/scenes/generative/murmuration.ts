import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

type Bird = { x: number; y: number; vx: number; vy: number; u: number; v: number; ph: number }

export function create(ctx: SceneContext) {
  return new Murmuration(ctx)
}

/**
 * Murmuration, in silhouette: thousands of starlings over a marsh at dusk. Each bird follows a
 * point on a living shape that stretches, turns and folds, plus a little flutter of its own,
 * so the flock always reads as one body. Reeds, a far treeline and the still water are cut flat.
 */
class Murmuration extends PixelScene {
  birds: Bird[] = []
  land!: HTMLCanvasElement
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.3
  }
  get horizon() {
    return this.h * (this.h > this.w ? 0.7 : 0.72)
  }
  configure() {
    const R = rng(11)
    const n = Math.round(1400 * this.num('birds') * this.density)
    this.birds = Array.from({ length: n }, () => {
      // a point in a soft disc: denser in the middle
      const a = R() * TAU
      const r = Math.sqrt(R()) * (0.6 + R() * 0.4)
      const u = Math.cos(a) * r
      const v = Math.sin(a) * r
      return { x: this.w / 2, y: this.h * 0.35, vx: 0, vy: 0, u, v, ph: R() * TAU }
    })
  }
  layout() {
    const { w, h, u } = this
    if (!w) return
    const H = this.horizon
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    // far treeline
    c.fillStyle = '#2a1a36'
    c.beginPath()
    c.moveTo(0, H)
    const T = rng(9)
    let tree = 0
    for (let x = 0; x <= w; x += 3) {
      // clumps of trees of different heights, with gaps
      if (tree <= 0) tree = T.range(10, 40) * u
      tree -= 3
      const clump = Math.sin((tree / (40 * u)) * Math.PI)
      c.lineTo(x, H - 3 * u - clump * T.range(5, 9) * u * (Math.sin(x * 0.013) * 0.4 + 0.8))
    }
    c.lineTo(w, H)
    c.fill()
    // water
    const wg = c.createLinearGradient(0, H, 0, h)
    wg.addColorStop(0, '#7a3a5a')
    wg.addColorStop(1, '#1a1028')
    c.fillStyle = wg
    c.fillRect(0, H, w, h - H)
    // near reeds on both banks
    const R = rng(4)
    c.strokeStyle = '#0d0814'
    c.lineCap = 'round'
    for (let i = 0; i < 160; i++) {
      const side = i % 2 ? 1 : -1
      const x = side < 0 ? R() * w * 0.32 : w - R() * w * 0.32
      const base = h + 2
      const hh = R.range(18, 60) * u * (1 - Math.abs(x - (side < 0 ? 0 : w)) / (w * 0.4))
      c.lineWidth = Math.max(1, R.range(0.6, 1.4) * u)
      c.beginPath()
      c.moveTo(x, base)
      c.quadraticCurveTo(x + side * 3 * u, base - hh * 0.6, x + side * R.range(2, 8) * u, base - hh)
      c.stroke()
      if (R.chance(0.15)) {
        c.fillStyle = '#0d0814'
        c.beginPath()
        c.ellipse(x + side * 6 * u, base - hh, 1.4 * u, 4 * u, side * 0.3, 0, TAU)
        c.fill()
      }
    }
    this.land = cv
    this.configure()
  }
  step(dt: number) {
    const { w, h } = this
    dt = Math.min(dt, 0.05)
    const t = this.t * this.num('speed')
    // the living shape: centre wanders, size breathes, it stretches and turns, and folds over itself
    const cx = w * (0.5 + Math.sin(t * 0.11) * 0.22 + Math.sin(t * 0.27) * 0.06)
    const cy = this.horizon * (0.45 + Math.sin(t * 0.17 + 1) * 0.14)
    const size = Math.min(w, h) * (0.16 + 0.05 * Math.sin(t * 0.23))
    const sx = size * (1.6 + 0.9 * Math.sin(t * 0.31))
    const sy = size * (0.6 + 0.35 * Math.cos(t * 0.29))
    const rot = Math.sin(t * 0.13) * 1.2
    const fold = Math.sin(t * 0.37) * 0.9
    const cr = Math.cos(rot)
    const sr = Math.sin(rot)
    for (const b of this.birds) {
      // bend the disc: points on one side swing round, giving the classic folding wave
      const bu = b.u
      const bv = b.v + fold * bu * bu
      let tx = bu * sx
      let ty = bv * sy
      ;[tx, ty] = [tx * cr - ty * sr, tx * sr + ty * cr]
      tx += cx + Math.sin(t * 2 + b.ph) * size * 0.04
      ty += cy + Math.cos(t * 1.7 + b.ph) * size * 0.04
      const ax = (tx - b.x) * 3.2 - b.vx * 1.8
      const ay = (ty - b.y) * 3.2 - b.vy * 1.8
      b.vx += ax * dt
      b.vy += ay * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const H = this.horizon
    const sky = c.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#1c2048')
    sky.addColorStop(0.45, '#5a3270')
    sky.addColorStop(0.8, '#d0586a')
    sky.addColorStop(1, '#ffb070')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    // low sun on the horizon
    const sg = c.createRadialGradient(w * 0.62, H, 0, w * 0.62, H, 60 * u)
    sg.addColorStop(0, 'rgba(255,220,150,0.9)')
    sg.addColorStop(1, 'rgba(255,220,150,0)')
    c.fillStyle = sg
    c.fillRect(w * 0.62 - 60 * u, H - 60 * u, 120 * u, 60 * u)
    c.drawImage(this.land, 0, 0)
    // the flock, and its reflection on the water
    const s = Math.max(1, 0.9 * u)
    c.fillStyle = '#120a1c'
    for (const b of this.birds) {
      const flap = Math.sin(this.t * 14 + b.ph) > 0 ? 1.6 : 0.8
      c.fillRect(b.x, b.y, s * flap, s)
    }
    c.globalAlpha = 0.25
    for (const b of this.birds) {
      const ry = H + (H - b.y) * 0.35
      if (ry < h) c.fillRect(b.x, ry, s, s * 0.6)
    }
    c.globalAlpha = 1
    // the reeds again in front of the reflection
    c.drawImage(this.land, 0, H, w, h - H, 0, H, w, h - H)
  }
}
