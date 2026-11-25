import { PixelScene } from '../../engine/base'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

const PALS: Record<string, string[]> = {
  jewel: ['#0a0614', '#2a1248', '#5a1a7a', '#b4448e', '#ff7ab6', '#ffd166', '#22e1ff', '#7cff6b', '#ffffff'],
  candy: ['#1a0a1e', '#ff5fa8', '#ffb3d9', '#7ad8ff', '#c8f0ff', '#fff3a0', '#b4ff9a', '#ffffff'],
  ega: ['#000000', '#0000aa', '#00aaaa', '#aa00aa', '#aa5500', '#5555ff', '#55ffff', '#ff55ff', '#ffff55', '#ffffff'],
  lcd: ['#1f2a12', '#4f6a2a', '#8fb354', '#b8d97a', '#fffaf0'],
}

export function create(ctx: SceneContext) {
  return new Kaleidoscope(ctx)
}

/**
 * Shapes drift and morph inside a single wedge; the wedge is then mirrored and rotated N times
 * around the centre, like the mirrors of a real kaleidoscope.
 */
class Kaleidoscope extends PixelScene {
  noise = createNoise(41)
  wedge: HTMLCanvasElement | null = null
  shapes: { a: number; r: number; size: number; kind: number; col: number; spin: number; ph: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PALS[this.str('palette')] ?? PALS.jewel
  }
  dither() {
    return 0.2
  }
  get R() {
    return Math.hypot(this.w, this.h) / 2
  }
  layout() {
    const R = Math.ceil(this.R)
    this.wedge = document.createElement('canvas')
    this.wedge.width = R
    this.wedge.height = R
    this.configure()
  }
  configure() {
    const n = Math.round(6 + this.num('complexity') * 10)
    const pal = this.palette()
    this.shapes = Array.from({ length: n }, () => ({
      a: this.r(),
      r: this.r(),
      size: this.r.range(0.04, 0.16),
      kind: this.r.int(0, 3),
      col: this.r.int(1, pal.length - 1),
      spin: this.r.range(-1, 1),
      ph: this.r() * 10,
    }))
  }
  step(dt: number) {
    const sp = this.num('motion')
    for (const s of this.shapes) {
      s.r += dt * 0.03 * sp * (0.5 + this.noise.noise2(s.ph, this.t * 0.1))
      if (s.r > 1.1) {
        s.r = -0.1
        s.col = 1 + ((s.col + 1) % (this.palette().length - 1))
      }
      s.a += dt * 0.02 * sp * this.noise.noise2(s.ph + 5, this.t * 0.08)
    }
  }
  draw() {
    const c = this.c
    const { w, h } = this
    const pal = this.palette()
    const n = Math.round(this.num('symmetry'))
    const slice = Math.PI / n // half of one sector; mirrored to make the full sector
    const R = this.R
    const wc = this.wedge!.getContext('2d')!
    wc.setTransform(1, 0, 0, 1, 0, 0)
    wc.clearRect(0, 0, R, R)
    wc.save()
    // clip to the wedge between angle 0 and `slice`
    wc.beginPath()
    wc.moveTo(0, 0)
    wc.lineTo(R, 0)
    wc.lineTo(R * Math.cos(slice), R * Math.sin(slice))
    wc.closePath()
    wc.clip()
    wc.fillStyle = pal[0]
    wc.fillRect(0, 0, R, R)
    for (const s of this.shapes) {
      const ang = (((s.a % 1) + 1) % 1) * slice
      const rr = s.r * R
      const x = Math.cos(ang) * rr
      const y = Math.sin(ang) * rr
      const size = s.size * R * (0.6 + 0.4 * Math.sin(this.t * 0.7 + s.ph))
      wc.save()
      wc.translate(x, y)
      wc.rotate(this.t * s.spin * 0.5)
      wc.fillStyle = pal[s.col]
      wc.strokeStyle = pal[(s.col % (pal.length - 1)) + 1]
      wc.lineWidth = Math.max(1, size * 0.15)
      if (s.kind === 0) {
        wc.beginPath()
        wc.arc(0, 0, size, 0, Math.PI * 2)
        wc.fill()
      } else if (s.kind === 1) wc.fillRect(-size / 2, -size / 2, size, size)
      else if (s.kind === 2) {
        wc.beginPath()
        wc.moveTo(0, -size)
        wc.lineTo(size * 0.87, size * 0.5)
        wc.lineTo(-size * 0.87, size * 0.5)
        wc.closePath()
        wc.fill()
      } else {
        wc.beginPath()
        wc.moveTo(-size, 0)
        wc.lineTo(size, 0)
        wc.moveTo(0, -size)
        wc.lineTo(0, size)
        wc.stroke()
      }
      wc.restore()
    }
    wc.restore()
    // assemble: 2n copies, every other one mirrored
    c.fillStyle = pal[0]
    c.fillRect(0, 0, w, h)
    const rot = this.t * 0.03 * this.num('motion')
    for (let k = 0; k < n * 2; k++) {
      c.setTransform(1, 0, 0, 1, w / 2, h / 2)
      c.rotate(rot + Math.floor(k / 2) * slice * 2 + (k % 2 ? slice * 2 : 0))
      if (k % 2) c.scale(1, -1)
      c.drawImage(this.wedge!, 0, 0)
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
  }
}
