import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

interface Star {
  x: number
  y: number
  z: number
  pz: number
}

export function create(ctx: SceneContext) {
  return new Starfield(ctx)
}

/** The classic: stars in 3D, projected towards the viewer. Streaks appear past warp speed. */
class Starfield extends PixelScene {
  stars: Star[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return this.str('tint') === 'amber' ? ['#000000', '#3a2006', '#8a5a10', '#ffb000', '#fff0c8'] : this.str('tint') === 'blue' ? ['#000000', '#0e2236', '#3a7fa3', '#a6dbe5', '#ffffff'] : ['#000000', '#2a2a2e', '#6a6a70', '#b4b4ba', '#ffffff']
  }
  dither() {
    return 0
  }
  configure() {
    const n = Math.round(this.num('density') * 900 * this.density)
    this.stars = Array.from({ length: n }, () => this.spawn(true))
  }
  spawn(anyZ: boolean): Star {
    const z = anyZ ? this.r.range(0.05, 1) : 1
    return { x: this.r.range(-1, 1), y: this.r.range(-1, 1), z, pz: z }
  }
  step(dt: number) {
    const sp = this.num('speed') * 0.35
    const dir = this.str('direction')
    for (const s of this.stars) {
      s.pz = s.z
      if (dir === 'back') {
        s.z += dt * sp
        if (s.z > 1) Object.assign(s, this.spawn(false), { z: 0.05, pz: 0.05 })
      } else if (dir === 'drift') {
        s.x -= dt * sp * 0.5 * (1.1 - s.z)
        s.pz = s.z
        if (s.x < -1) s.x += 2
      } else {
        s.z -= dt * sp
        if (s.z <= 0.03) Object.assign(s, this.spawn(false))
      }
    }
  }
  draw() {
    const c = this.c
    const { w, h } = this
    c.fillStyle = '#000'
    c.fillRect(0, 0, w, h)
    const f = Math.max(w, h) * 0.5
    const cx = w / 2
    const cy = h / 2
    const warp = this.num('speed') > 2.2 && this.str('direction') !== 'drift'
    for (const s of this.stars) {
      const x = cx + (s.x / s.z) * f * (this.str('direction') === 'drift' ? s.z : 1)
      const y = cy + (s.y / s.z) * f * (this.str('direction') === 'drift' ? s.z : 1)
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const b = 1 - s.z
      const shade = Math.min(255, Math.round(120 + b * 170))
      c.fillStyle = `rgb(${shade},${shade},${shade})`
      const size = b > 0.85 ? 2 : 1
      if (warp) {
        const px = cx + (s.x / s.pz) * f
        const py = cy + (s.y / s.pz) * f
        c.strokeStyle = c.fillStyle
        c.lineWidth = size
        c.beginPath()
        c.moveTo(Math.round(px), Math.round(py))
        c.lineTo(Math.round(x), Math.round(y))
        c.stroke()
      }
      c.fillRect(Math.round(x), Math.round(y), size, size)
    }
  }
}
