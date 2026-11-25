import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

type Shape = { pts: { x: number; y: number; vx: number; vy: number }[]; hist: { x: number; y: number }[][]; hue: number; hv: number }

export function create(ctx: SceneContext) {
  return new Mystify(ctx)
}

/** The classic: two bouncing polygons trailing echoes of themselves while their colours drift. */
class Mystify extends PixelScene {
  shapes: Shape[] = []
  acc = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.2
  }
  configure() {
    const n = Math.max(1, Math.round(this.num('shapes')))
    const v = Math.max(3, Math.round(this.num('vertices')))
    if (this.shapes.length === n && this.shapes[0]?.pts.length === v) return
    this.shapes = Array.from({ length: n }, (_, i) => ({
      pts: Array.from({ length: v }, () => ({ x: this.r(), y: this.r(), vx: this.r.range(0.08, 0.2) * (this.r.chance(0.5) ? 1 : -1), vy: this.r.range(0.08, 0.2) * (this.r.chance(0.5) ? 1 : -1) })),
      hist: [],
      hue: i * 180 + this.r() * 60,
      hv: this.r.range(10, 25),
    }))
  }
  step(dt: number) {
    const sp = this.num('speed')
    for (const s of this.shapes) {
      for (const p of s.pts) {
        p.x += p.vx * dt * sp
        p.y += p.vy * dt * sp
        if (p.x < 0 || p.x > 1) {
          p.vx *= -1
          p.x = Math.max(0, Math.min(1, p.x))
        }
        if (p.y < 0 || p.y > 1) {
          p.vy *= -1
          p.y = Math.max(0, Math.min(1, p.y))
        }
      }
      s.hue += s.hv * dt
    }
    this.acc += dt * sp
    if (this.acc > 0.045) {
      this.acc = 0
      const trail = Math.round(this.num('trail'))
      for (const s of this.shapes) {
        s.hist.unshift(s.pts.map((p) => ({ x: p.x, y: p.y })))
        if (s.hist.length > trail) s.hist.length = trail
      }
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#000000'
    c.fillRect(0, 0, w, h)
    c.lineWidth = Math.max(1, 0.7 * u)
    c.lineJoin = 'round'
    for (const s of this.shapes) {
      const frames = [s.pts, ...s.hist]
      frames.forEach((f, i) => {
        const k = 1 - i / frames.length
        c.strokeStyle = `hsl(${(s.hue - i * 3) % 360},100%,${45 + k * 20}%)`
        c.globalAlpha = k
        c.beginPath()
        f.forEach((p, j) => (j ? c.lineTo(p.x * w, p.y * h) : c.moveTo(p.x * w, p.y * h)))
        c.closePath()
        c.stroke()
      })
    }
    c.globalAlpha = 1
  }
}
