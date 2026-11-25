import { PixelScene } from '../../engine/base'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

const PAL = ['#000000', '#0a0612', '#1a0f24', '#3a1a2a', '#6a2a1a', '#a8461a', '#e07a2a', '#ffb04a', '#ffe08a', '#fff8e0', '#2a3a6a', '#8aa0d0']

interface P {
  r: number
  a: number
  y: number
  heat: number
}

export function create(ctx: SceneContext) {
  return new BlackHole(ctx)
}

/**
 * An artistic black hole (not a physical simulation): a tilted accretion disk of orbiting
 * particles (inner ones faster), the back of the disk bent over the top, a thin photon ring,
 * and background stars pushed outwards around the shadow.
 */
class BlackHole extends PixelScene {
  parts: P[] = []
  stars: { x: number; y: number; b: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return PAL
  }
  dither() {
    return 0.35
  }
  configure() {
    const n = Math.round(1400 * this.num('disk') * this.density)
    this.parts = Array.from({ length: n }, () => {
      const r = 1.25 + Math.pow(this.r(), 1.6) * 2.4
      return { r, a: this.r() * TAU, y: this.r.range(-0.04, 0.04), heat: this.r() }
    })
    this.stars = Array.from({ length: 220 }, () => ({ x: this.r.range(-1.2, 1.2), y: this.r.range(-1, 1), b: this.r() }))
  }
  step(dt: number) {
    const sp = this.num('speed')
    for (const p of this.parts) p.a += (dt * sp * 1.6) / Math.pow(p.r, 1.5)
  }
  draw() {
    const c = this.c
    const { w, h } = this
    c.fillStyle = PAL[1]
    c.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) * 0.13 * this.num('size')
    const tilt = this.num('tilt')
    // lensed background stars: pushed away from the centre, none inside the shadow
    for (const s of this.stars) {
      let x = s.x * w * 0.5
      let y = s.y * h * 0.5
      const d = Math.hypot(x, y)
      if (d < 1) continue
      const push = (R * R * 1.4) / d
      x += (x / d) * push
      y += (y / d) * push
      c.fillStyle = s.b > 0.8 ? PAL[11] : PAL[10]
      c.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1)
    }
    // glow
    const g = c.createRadialGradient(cx, cy, R, cx, cy, R * 4)
    g.addColorStop(0, `rgba(224,122,42,${0.35 * this.g.intensity})`)
    g.addColorStop(1, 'rgba(224,122,42,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    const project = (p: P) => {
      const x = Math.cos(p.a) * p.r * R
      const z = Math.sin(p.a) * p.r
      const y = (Math.sin(p.a) * tilt + p.y) * p.r * R
      return { x, y, z }
    }
    const col = (p: P, x: number) => {
      // brighter on the side moving towards us, hotter near the centre
      const dop = 0.5 - (x / (p.r * R)) * 0.5
      const k = Math.min(1, (1 / p.r) * 1.6 * (0.5 + dop * 0.8) + p.heat * 0.15)
      return PAL[Math.max(3, Math.min(9, Math.round(3 + k * 6)))]
    }
    // the far side of the disk, bent up over the shadow
    for (const p of this.parts) {
      const { x, y, z } = project(p)
      if (z >= 0) continue
      c.fillStyle = col(p, x)
      // light from behind the hole is bent into an arc that hugs the top of the shadow
      const th = Math.acos(Math.max(-1, Math.min(1, x / (p.r * R))))
      const rr = R * 1.08 + (p.r - 1.25) * R * 0.28
      c.fillRect(Math.round(cx + Math.cos(th) * rr * 1.05), Math.round(cy - Math.sin(th) * rr + y * 0.15), 1, 1)
    }
    // shadow and photon ring
    c.fillStyle = '#000'
    c.beginPath()
    c.arc(cx, cy, R, 0, TAU)
    c.fill()
    c.strokeStyle = PAL[8]
    c.lineWidth = Math.max(1, Math.round(R * 0.05))
    c.beginPath()
    c.arc(cx, cy, R * 1.04, 0, TAU)
    c.stroke()
    // near side of the disk, in front of everything
    for (const p of this.parts) {
      const { x, y, z } = project(p)
      if (z < 0) continue
      c.fillStyle = col(p, x)
      c.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1)
    }
  }
}
