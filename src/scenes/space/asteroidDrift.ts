import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Rock = { x: number; y: number; z: number; rot: number; vr: number; shape: number[]; craters: { a: number; d: number; r: number }[]; tone: number }

const TONES = [
  ['#3a2a22', '#5c4434', '#8a6a52'],
  ['#2e3440', '#5c4434', '#b89a7c'],
  ['#24120a', '#3f1f0f', '#682e14'],
]

export function create(ctx: SceneContext) {
  return new AsteroidDrift(ctx)
}

/** Drifting through an asteroid belt: tumbling rocks at many depths, a ringed giant and a far sun. */
class AsteroidDrift extends PixelScene {
  rocks: Rock[] = []
  stars: { x: number; y: number; b: number }[] = []
  probe = { x: -0.2, y: 0.3 }
  constructor(ctx: SceneContext) {
    super(ctx)
    this.stars = Array.from({ length: 220 }, () => ({ x: this.r(), y: this.r(), b: this.r() }))
    this.configure()
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.5
  }
  configure() {
    const n = Math.round(30 * this.num('rocks') * this.density)
    this.rocks = Array.from({ length: n }, () => this.rock(true)).sort((a, b) => a.z - b.z)
  }
  rock(anywhere: boolean): Rock {
    const r = this.r
    const pts = r.int(9, 14)
    return {
      x: anywhere ? r() : 1.15,
      y: r.range(-0.1, 1.1),
      z: r.range(0.15, 1) ** 2,
      rot: r() * TAU,
      vr: r.range(-0.4, 0.4),
      shape: Array.from({ length: pts }, () => r.range(0.7, 1.1)),
      craters: Array.from({ length: r.int(2, 5) }, () => ({ a: r() * TAU, d: r.range(0, 0.6), r: r.range(0.1, 0.25) })),
      tone: r.int(0, TONES.length - 1),
    }
  }
  step(dt: number) {
    const sp = this.num('speed')
    for (let i = 0; i < this.rocks.length; i++) {
      const k = this.rocks[i]
      k.x -= dt * 0.02 * sp * (0.2 + k.z * 1.6)
      k.y += dt * 0.004 * sp * (k.z - 0.5)
      k.rot += k.vr * dt * sp
      if (k.x < -0.15) {
        const z = k.z
        this.rocks[i] = { ...this.rock(false), z }
      }
    }
    this.probe.x += dt * 0.015 * sp
    if (this.probe.x > 1.3) this.probe = { x: -0.3, y: this.r.range(0.15, 0.6) }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0c0705'
    c.fillRect(0, 0, w, h)
    const neb = c.createRadialGradient(w * 0.85, h * 0.2, 0, w * 0.85, h * 0.2, Math.max(w, h) * 0.7)
    neb.addColorStop(0, 'rgba(154,61,22,0.35)')
    neb.addColorStop(1, 'rgba(12,7,5,0)')
    c.fillStyle = neb
    c.fillRect(0, 0, w, h)
    for (const s of this.stars) {
      c.globalAlpha = 0.2 + s.b * 0.8
      c.fillStyle = '#fffbe8'
      c.fillRect(s.x * w, s.y * h, Math.max(1, s.b * 0.8 * u), Math.max(1, s.b * 0.8 * u))
    }
    c.globalAlpha = 1
    // far sun
    glow(c, w * 0.88, h * 0.18, 50 * u, 'rgba(255,233,163,0.8)')
    c.fillStyle = '#fffbe8'
    c.beginPath()
    c.arc(w * 0.88, h * 0.18, 4 * u, 0, TAU)
    c.fill()
    // ringed gas giant
    const gx = w * 0.22
    const gy = h * 0.3
    const gr = Math.min(w, h) * 0.16
    c.save()
    c.translate(gx, gy)
    c.rotate(-0.35)
    c.strokeStyle = 'rgba(184,154,124,0.45)'
    c.lineWidth = gr * 0.12
    c.beginPath()
    c.ellipse(0, 0, gr * 1.7, gr * 0.35, 0, Math.PI, TAU)
    c.stroke()
    const pg = c.createLinearGradient(0, -gr, 0, gr)
    ;['#cf5a1c', '#f08a2a', '#b89a7c', '#cf5a1c', '#682e14'].forEach((col, i) => pg.addColorStop(i / 4, col))
    c.fillStyle = pg
    c.beginPath()
    c.arc(0, 0, gr, 0, TAU)
    c.fill()
    c.fillStyle = 'rgba(12,7,5,0.45)'
    c.beginPath()
    c.arc(gr * 0.35, gr * 0.2, gr, 0, TAU)
    c.arc(0, 0, gr, 0, TAU, true)
    c.fill()
    c.beginPath()
    c.ellipse(0, 0, gr * 1.7, gr * 0.35, 0, 0, Math.PI)
    c.stroke()
    c.restore()
    // probe
    const px = this.probe.x * w
    const py = this.probe.y * h
    c.fillStyle = '#e6dcc8'
    c.fillRect(px - 2 * u, py - 1.5 * u, 4 * u, 3 * u)
    c.fillStyle = '#2e3440'
    c.fillRect(px - 9 * u, py - 1 * u, 6 * u, 2 * u)
    c.fillRect(px + 3 * u, py - 1 * u, 6 * u, 2 * u)
    if (Math.sin(this.t * 4) > 0.5) glow(c, px, py - 2 * u, 3 * u, 'rgba(255,90,90,0.9)')
    // rocks, far to near
    for (const k of this.rocks) {
      const R = (2.5 + k.z * 26) * u
      const x = k.x * w
      const y = k.y * h
      const T = TONES[k.tone]
      c.save()
      c.translate(x, y)
      c.rotate(k.rot)
      c.globalAlpha = 0.35 + k.z * 0.65
      c.beginPath()
      k.shape.forEach((s, i) => {
        const a = (i / k.shape.length) * TAU
        if (i) c.lineTo(Math.cos(a) * R * s, Math.sin(a) * R * s)
        else c.moveTo(Math.cos(a) * R * s, Math.sin(a) * R * s)
      })
      c.closePath()
      c.fillStyle = T[1]
      c.fill()
      c.save()
      c.clip()
      // lit from the upper right (sun), so shade the opposite side
      c.rotate(-k.rot)
      c.fillStyle = T[2]
      c.beginPath()
      c.arc(R * 0.35, -R * 0.35, R * 0.95, 0, TAU)
      c.fill()
      c.fillStyle = T[0]
      c.beginPath()
      c.arc(-R * 0.6, R * 0.6, R * 0.9, 0, TAU)
      c.fill()
      c.rotate(k.rot)
      for (const cr of k.craters) {
        c.fillStyle = T[0]
        c.beginPath()
        c.arc(Math.cos(cr.a) * cr.d * R, Math.sin(cr.a) * cr.d * R, cr.r * R, 0, TAU)
        c.fill()
      }
      c.restore()
      c.restore()
    }
    c.globalAlpha = 1
  }
}
