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
    const { w, h, u } = this
    const tint = this.str('tint')
    const bg = c.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, tint === 'amber' ? '#100a04' : '#04060f')
    bg.addColorStop(1, tint === 'amber' ? '#1c1208' : '#0a1030')
    c.fillStyle = bg
    c.fillRect(0, 0, w, h)
    const f = Math.max(w, h) * 0.5
    const cx = w / 2
    const cy = h / 2
    const drift = this.str('direction') === 'drift'
    const col = tint === 'amber' ? [255, 196, 120] : tint === 'white' ? [235, 238, 245] : [150, 190, 255]
    // streak length grows with speed: at warp the stars become long lines
    const trail = 0.06 + Math.min(1.2, this.num('speed') * 0.18)
    c.lineCap = 'round'
    for (const s of this.stars) {
      const k = drift ? s.z : 1
      const x = cx + (s.x / s.z) * f * k
      const y = cy + (s.y / s.z) * f * k
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue
      const b = 1 - s.z
      const a = Math.min(1, 0.25 + b * 1.1)
      c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`
      c.lineWidth = Math.max(1, (0.5 + b * 1.6) * u * 0.6)
      c.beginPath()
      if (drift) {
        c.moveTo(x, y)
        c.lineTo(x + trail * 30 * u * (1.1 - s.z), y)
      } else {
        const zt = Math.min(1, s.z * (1 + trail * (this.str('direction') === 'back' ? -0.5 : 1)))
        const tx = cx + (s.x / zt) * f
        const ty = cy + (s.y / zt) * f
        c.moveTo(tx, ty)
        c.lineTo(x, y)
      }
      c.stroke()
    }
  }
}
