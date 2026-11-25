import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

export function create(ctx: SceneContext) {
  return new OrbitStation(ctx)
}

/** A ring station turns slowly above the Earth: clouds drift, city lights on the night side, a shuttle docks. */
class OrbitStation extends PixelScene {
  stars: { x: number; y: number; b: number }[] = []
  clouds: { a: number; r: number; w: number }[] = []
  cities: { a: number; r: number }[] = []
  spin = 0
  shuttle = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.stars = Array.from({ length: 200 }, () => ({ x: this.r(), y: this.r(), b: this.r() }))
    this.clouds = Array.from({ length: 40 }, () => ({ a: this.r() * TAU, r: this.r.range(0.2, 0.98), w: this.r.range(0.04, 0.12) }))
    this.cities = Array.from({ length: 120 }, () => ({ a: this.r() * TAU, r: this.r.range(0.3, 0.99) }))
  }
  palette() {
    return PX.cold16
  }
  dither() {
    return 0.45
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.spin += dt * 0.12 * sp
    this.shuttle = (this.shuttle + dt * 0.02 * sp) % 1
    for (const cl of this.clouds) cl.a += dt * 0.004 * sp
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#020409'
    c.fillRect(0, 0, w, h)
    for (const s of this.stars) {
      c.globalAlpha = 0.3 + s.b * 0.7
      c.fillStyle = '#e6f6f7'
      c.fillRect(s.x * w, s.y * h, Math.max(1, s.b * u * 0.8), Math.max(1, s.b * u * 0.8))
    }
    c.globalAlpha = 1
    // Earth: a big disc whose top shows at the bottom of the screen
    const ER = Math.max(w, h) * 1.1
    const ex = w * 0.5
    const ey = h * 0.72 + ER
    glow(c, ex, ey, ER * 1.08, 'rgba(102,176,201,0.5)')
    c.save()
    c.beginPath()
    c.arc(ex, ey, ER, 0, TAU)
    c.clip()
    c.fillStyle = '#173856'
    c.fillRect(0, 0, w, h)
    // continents as soft blobs that drift with the clouds
    c.fillStyle = '#3a7fa3'
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.12 + this.clouds[0].a * 0.5
      const r = ER * (0.97 - (i % 3) * 0.01)
      c.beginPath()
      c.ellipse(ex + Math.cos(a) * r, ey + Math.sin(a) * r, ER * 0.05, ER * 0.02, a, 0, TAU)
      c.fill()
    }
    // clouds
    c.fillStyle = 'rgba(230,246,247,0.7)'
    for (const cl of this.clouds) {
      const a = -Math.PI / 2 + ((cl.a % 1.2) - 0.6)
      const r = ER * (0.94 + cl.r * 0.06)
      c.beginPath()
      c.ellipse(ex + Math.cos(a) * r, ey + Math.sin(a) * r, ER * cl.w * 0.4, ER * 0.006, a + Math.PI / 2, 0, TAU)
      c.fill()
    }
    // night side on the right with city lights
    const night = c.createLinearGradient(w * 0.45, 0, w, 0)
    night.addColorStop(0, 'rgba(2,4,9,0)')
    night.addColorStop(0.5, 'rgba(2,4,9,0.75)')
    night.addColorStop(1, 'rgba(2,4,9,0.92)')
    c.fillStyle = night
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#ffd28a'
    for (const ct of this.cities) {
      const a = -Math.PI / 2 + ((ct.a + this.clouds[0].a * 0.5) % 1) * 0.9 - 0.05
      const r = ER * (0.95 + ct.r * 0.05)
      const x = ex + Math.cos(a) * r
      if (x < w * 0.6) continue
      c.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 2 + ct.a * 10)
      c.fillRect(x, ey + Math.sin(a) * r, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
    }
    c.globalAlpha = 1
    c.restore()
    // atmosphere rim
    c.strokeStyle = 'rgba(166,219,229,0.6)'
    c.lineWidth = 2 * u
    c.beginPath()
    c.arc(ex, ey, ER, 0, TAU)
    c.stroke()
    // sun glare upper left
    glow(c, w * 0.08, h * 0.12, 60 * u, 'rgba(255,210,138,0.5)')
    // the ring station, seen at an angle
    const cx = w * 0.5
    const cy = h * 0.4
    const R = Math.min(w, h) * 0.3
    const tilt = 0.32
    const pts = (n: number, rad: number) => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU + this.spin
      return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad * tilt, z: Math.sin(a), a }
    })
    const ring = pts(48, R)
    // back half of the ring, then hub and spokes, then front half
    const drawRing = (front: boolean) => {
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i]
        const q = ring[(i + 1) % ring.length]
        if (p.z > 0 !== front) continue
        const shade = front ? '#a6dbe5' : '#3a7fa3'
        c.strokeStyle = shade
        c.lineWidth = R * 0.09
        c.beginPath()
        c.moveTo(p.x, p.y)
        c.lineTo(q.x, q.y)
        c.stroke()
        if (i % 4 === 0) {
          c.fillStyle = front ? '#e6f6f7' : '#22557a'
          c.fillRect(p.x - R * 0.05, p.y - R * 0.05, R * 0.1, R * 0.07)
          if (front && Math.sin(this.t * 2 + i) > 0.6) {
            c.fillStyle = '#ffd28a'
            c.fillRect(p.x - R * 0.01, p.y - R * 0.02, R * 0.02, R * 0.02)
          }
        }
      }
    }
    drawRing(false)
    c.strokeStyle = '#66b0c9'
    c.lineWidth = R * 0.025
    for (const p of pts(4, R)) {
      c.beginPath()
      c.moveTo(cx, cy)
      c.lineTo(p.x, p.y)
      c.stroke()
    }
    c.fillStyle = '#e6f6f7'
    c.beginPath()
    c.ellipse(cx, cy, R * 0.14, R * 0.14 * 0.8, 0, 0, TAU)
    c.fill()
    c.fillStyle = '#3a7fa3'
    c.fillRect(cx - R * 0.03, cy - R * 0.4, R * 0.06, R * 0.3)
    // solar panels on the mast
    c.fillStyle = '#2e2552'
    c.fillRect(cx - R * 0.35, cy - R * 0.45, R * 0.3, R * 0.1)
    c.fillRect(cx + R * 0.05, cy - R * 0.45, R * 0.3, R * 0.1)
    c.strokeStyle = '#7a6aa8'
    c.lineWidth = Math.max(1, R * 0.005)
    for (let k = 1; k < 6; k++) {
      c.beginPath()
      c.moveTo(cx - R * 0.35 + k * R * 0.05, cy - R * 0.45)
      c.lineTo(cx - R * 0.35 + k * R * 0.05, cy - R * 0.35)
      c.moveTo(cx + R * 0.05 + k * R * 0.05, cy - R * 0.45)
      c.lineTo(cx + R * 0.05 + k * R * 0.05, cy - R * 0.35)
      c.stroke()
    }
    // beacon
    if (Math.sin(this.t * 3) > 0.7) glow(c, cx, cy - R * 0.42, R * 0.08, 'rgba(255,159,90,0.9)')
    drawRing(true)
    // shuttle approaching the hub from the right
    const s = this.shuttle
    const sx = cx + R * 0.2 + (1 - s) * w * 0.7
    const sy = cy + (1 - s) * h * 0.15
    if (s < 0.95) {
      const k = R * 0.05
      c.fillStyle = '#e6f6f7'
      c.beginPath()
      c.moveTo(sx - 3 * k, sy)
      c.lineTo(sx + 2 * k, sy - 0.8 * k)
      c.lineTo(sx + 3 * k, sy + 0.6 * k)
      c.lineTo(sx + 1 * k, sy + 0.8 * k)
      c.fill()
      glow(c, sx + 3.4 * k, sy, k * 1.5, 'rgba(255,210,138,0.8)')
    }
  }
}
