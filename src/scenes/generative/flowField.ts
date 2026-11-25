import { PixelScene } from '../../engine/base'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

const PALS: Record<string, string[]> = {
  aurora: ['#05060d', '#0d1a2a', '#1a3a4a', '#2a7a7a', '#5ad0a0', '#c8ff9a', '#ffffff'],
  sunset: ['#0b0716', '#2b1250', '#6a1f7a', '#b8336a', '#f2665a', '#ffb347', '#fff1a8'],
  ink: ['#f4efe2', '#d8d0bc', '#a89c84', '#6a6252', '#3a352c', '#1c1b19'],
  neon: ['#07040f', '#1e1240', '#ff2e88', '#22e1ff', '#ffe95a', '#ffffff'],
}

export function create(ctx: SceneContext) {
  return new FlowField(ctx)
}

/**
 * Particles ride a curl-noise vector field that slowly changes over time. Their trails are kept
 * in a separate buffer that fades a little every frame (time-based, so frame rate doesn't matter).
 */
class FlowField extends PixelScene {
  noise = createNoise(77)
  trail: HTMLCanvasElement | null = null
  tc: CanvasRenderingContext2D | null = null
  parts: { x: number; y: number; life: number; hue: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PALS[this.str('palette')] ?? PALS.aurora
  }
  dither() {
    return 0.35
  }
  layout() {
    this.trail = document.createElement('canvas')
    this.trail.width = this.w
    this.trail.height = this.h
    this.tc = this.trail.getContext('2d')!
    this.tc.fillStyle = this.palette()[0]
    this.tc.fillRect(0, 0, this.w, this.h)
    this.configure()
  }
  configure() {
    const n = Math.round(this.num('density') * 900 * this.density)
    this.parts = Array.from({ length: n }, () => this.spawn())
    if (this.tc) {
      this.tc.fillStyle = this.palette()[0]
      this.tc.fillRect(0, 0, this.w, this.h)
    }
  }
  spawn() {
    return { x: this.r() * this.w, y: this.r() * this.h, life: this.r.range(2, 8), hue: this.r() }
  }
  /** curl of a 3D noise potential: divergence-free, so particles swirl instead of piling up */
  field(x: number, y: number) {
    const s = 0.006 * this.num('turbulence') / this.u
    const t = this.t * 0.05
    const e = 0.5
    const n = this.noise
    const dx = (n.noise3(x * s, (y + e) * s, t) - n.noise3(x * s, (y - e) * s, t)) / (2 * e)
    const dy = (n.noise3((x + e) * s, y * s, t) - n.noise3((x - e) * s, y * s, t)) / (2 * e)
    return [dx / s, -dy / s]
  }
  step(dt: number) {
    const tc = this.tc!
    const pal = this.palette()
    // fade the trails: longer trails, slower fade
    const keep = this.num('trail')
    const fade = 1 - Math.pow(1 - Math.min(0.99, 0.02 + (1 - keep) * 0.3), dt * 60)
    tc.globalAlpha = fade
    tc.fillStyle = pal[0]
    tc.fillRect(0, 0, this.w, this.h)
    tc.globalAlpha = 1
    const sp = 30 * this.u * this.num('speed')
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i]
      const [vx, vy] = this.field(p.x, p.y)
      const m = Math.hypot(vx, vy) || 1
      p.x += (vx / m) * sp * dt
      p.y += (vy / m) * sp * dt
      p.life -= dt
      if (p.life <= 0 || p.x < 0 || p.y < 0 || p.x >= this.w || p.y >= this.h) {
        this.parts[i] = this.spawn()
        continue
      }
      // colour from the local field direction and the particle's own tint
      const ang = (Math.atan2(vy, vx) / Math.PI + 1) / 2
      const k = 2 + Math.floor(((ang + p.hue * 0.3) % 1) * (pal.length - 2))
      tc.fillStyle = pal[Math.min(pal.length - 1, k)]
      tc.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
    }
  }
  draw() {
    this.c.drawImage(this.trail!, 0, 0)
  }
}
