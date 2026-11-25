import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

const RAMPS: Record<string, string[]> = {
  sunset: ['#0b0716', '#2b1250', '#6a1f7a', '#b8336a', '#f2665a', '#ffb347', '#fff1a8', '#ffffff'],
  ocean: ['#020611', '#0a1f3d', '#123f6b', '#1f6f9a', '#3aa6c4', '#8ad8e0', '#e8fbff', '#ffffff'],
  lcd: ['#1f2a12', '#2e3d1a', '#4f6a2a', '#6f8f3e', '#8fb354', '#b8d97a', '#e8f5c8', '#fffaf0'],
  fire: ['#000000', '#2a0602', '#6a1204', '#b02a08', '#e85a10', '#ffa02a', '#ffe070', '#ffffff'],
}

/** Points known to sit on the Mandelbrot boundary, where zooming keeps revealing structure. */
const TARGETS: [number, number][] = [
  [-0.743643887037151, 0.13182590420533],
  [-0.7453, 0.1127],
  [-1.25066, 0.02012],
  [-0.1011, 0.9563],
  [0.2549, 0.0005],
  [-1.7686, 0.0017],
  [-0.16, 1.0405],
]

export function create(ctx: SceneContext) {
  return new Fractal(ctx)
}

/**
 * Real escape-time fractals (Mandelbrot, Burning Ship, or a Julia set whose constant drifts),
 * iterated per pixel on the CPU at pixel-art resolution with smooth colouring. The Mandelbrot
 * modes zoom automatically into boundary points, then pull back out and pick another one when
 * double precision runs out.
 */
class Fractal extends PixelScene {
  img: ImageData | null = null
  zoom = 1
  target: [number, number] = TARGETS[0]
  dir = 1
  ramp: number[][] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.target = this.r.pick(TARGETS)
    this.layout()
  }
  palette() {
    return RAMPS[this.str('palette')] ?? RAMPS.sunset
  }
  dither() {
    return 0.55
  }
  layout() {
    this.img = new ImageData(this.w, this.h)
    this.configure()
  }
  configure() {
    this.ramp = this.palette().map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])
  }
  step(dt: number) {
    const kind = this.str('fractal')
    if (kind === 'julia') return
    this.zoom *= Math.exp(this.dir * dt * 0.25 * this.num('speed'))
    if (this.zoom > 2e11) this.dir = -1
    if (this.zoom < 1 && this.dir < 0) {
      this.dir = 1
      this.zoom = 1
      this.target = this.r.pick(TARGETS.filter((t) => t !== this.target))
    }
  }
  draw() {
    const { w, h } = this
    const d = this.img!.data
    const kind = this.str('fractal')
    const ramp = this.ramp
    // more iterations as we go deeper, capped by the setting
    const maxIt = Math.min(this.num('iterations'), Math.round(80 + Math.log2(Math.max(1, this.zoom)) * 14))
    const scale = 3 / (Math.min(w, h) * (kind === 'julia' ? 1 : this.zoom))
    let cx0: number, cy0: number
    let jx = 0
    let jy = 0
    if (kind === 'julia') {
      cx0 = 0
      cy0 = 0
      const a = this.t * 0.07 * this.num('speed')
      jx = 0.7885 * Math.cos(a)
      jy = 0.7885 * Math.sin(a)
    } else if (kind === 'ship') {
      cx0 = -1.762
      cy0 = -0.028
    } else {
      // ease from the full view towards the target as the zoom grows
      const k = Math.min(1, Math.log10(this.zoom + 1) / 2)
      cx0 = -0.6 + (this.target[0] + 0.6) * k
      cy0 = this.target[1] * k
    }
    if (kind === 'ship') {
      const z = Math.exp((1 - Math.cos(this.t * 0.05 * this.num('speed'))) * 3)
      const s2 = 3 / (Math.min(w, h) * z)
      this.iterate(d, w, h, cx0, cy0, s2, maxIt, ramp, 'ship', 0, 0)
    } else this.iterate(d, w, h, cx0, cy0, scale, maxIt, ramp, kind, jx, jy)
    this.c.putImageData(this.img!, 0, 0)
  }
  iterate(d: Uint8ClampedArray, w: number, h: number, cx: number, cy: number, s: number, maxIt: number, ramp: number[][], kind: string, jx: number, jy: number) {
    const cycle = this.t * 0.05 * this.num('colorSpeed')
    const n = ramp.length - 1
    for (let py = 0; py < h; py++) {
      const y0 = cy + (py - h / 2) * s
      for (let px = 0; px < w; px++) {
        const x0 = cx + (px - w / 2) * s
        let x = kind === 'julia' ? x0 : 0
        let y = kind === 'julia' ? y0 : 0
        const ax = kind === 'julia' ? jx : x0
        const ay = kind === 'julia' ? jy : y0
        let i = 0
        let x2 = x * x
        let y2 = y * y
        while (x2 + y2 <= 256 && i < maxIt) {
          if (kind === 'ship') {
            y = Math.abs(2 * x * y) + ay
          } else y = 2 * x * y + ay
          x = x2 - y2 + ax
          x2 = x * x
          y2 = y * y
          i++
        }
        const o = (py * w + px) * 4
        if (i >= maxIt) {
          d[o] = ramp[0][0]
          d[o + 1] = ramp[0][1]
          d[o + 2] = ramp[0][2]
        } else {
          // smooth iteration count, then cycle through the ramp
          const sm = i + 1 - Math.log2(Math.log2(x2 + y2) / 2)
          let f = ((sm * 0.045 + cycle) % 1 + 1) % 1
          f = f < 0.5 ? f * 2 : (1 - f) * 2
          const v = 1 + f * (n - 1)
          const a = Math.floor(v)
          const b = Math.min(n, a + 1)
          const k = v - a
          d[o] = ramp[a][0] + (ramp[b][0] - ramp[a][0]) * k
          d[o + 1] = ramp[a][1] + (ramp[b][1] - ramp[a][1]) * k
          d[o + 2] = ramp[a][2] + (ramp[b][2] - ramp[a][2]) * k
        }
        d[o + 3] = 255
      }
    }
  }
}
