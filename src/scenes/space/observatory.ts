import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Star = { r: number; a: number; b: number; col: string }

export function create(ctx: SceneContext) {
  return new Observatory(ctx)
}

/** An observatory on a hill, slit open: star trails slowly draw circles around the pole above the dome. */
class Observatory extends PixelScene {
  stars: Star[] = []
  trails!: HTMLCanvasElement
  tc!: CanvasRenderingContext2D
  angle = 0
  slit = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.35
  }
  get pole() {
    return { x: this.w * 0.62, y: this.h * 0.12 }
  }
  layout() {
    const { w, h } = this
    const R = Math.hypot(w, h)
    this.stars = Array.from({ length: Math.round(260 * this.density) }, () => ({ r: this.r() ** 0.6 * R, a: this.r() * TAU, b: this.r(), col: this.r.pick(['#f2f4ff', '#f2f4ff', '#b5d0f0', '#ffcf6a', '#ff8a5c']) }))
    this.trails = document.createElement('canvas')
    this.trails.width = w
    this.trails.height = h
    this.tc = this.trails.getContext('2d')!
    // the plate has already been exposed for a while
    this.expose(-0.9, 0)
  }
  expose(a0: number, a1: number) {
    const tc = this.tc
    const P = this.pole
    tc.lineWidth = Math.max(1, this.u * 0.5)
    for (const s of this.stars) {
      tc.strokeStyle = s.col
      tc.globalAlpha = 0.15 + s.b * 0.5
      tc.beginPath()
      tc.arc(P.x, P.y, s.r, s.a + a0, s.a + a1)
      tc.stroke()
    }
    tc.globalAlpha = 1
  }
  step(dt: number) {
    const sp = this.num('speed')
    const prev = this.angle
    this.angle += dt * 0.02 * sp
    this.slit = Math.min(1, this.slit + dt * 0.15)
    this.expose(prev, this.angle)
    // after a long exposure, the plate is wiped and starts again
    if (this.angle > 1.6) {
      this.angle = 0
      this.tc.clearRect(0, 0, this.w, this.h)
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const sky = c.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#05060d')
    sky.addColorStop(0.75, '#16244a')
    sky.addColorStop(1, '#24407a')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    // a faint band of the galaxy
    c.save()
    c.translate(w / 2, h / 2)
    c.rotate(-0.5)
    const band = c.createLinearGradient(0, -h * 0.15, 0, h * 0.15)
    band.addColorStop(0, 'rgba(181,208,240,0)')
    band.addColorStop(0.5, 'rgba(181,208,240,0.12)')
    band.addColorStop(1, 'rgba(181,208,240,0)')
    c.fillStyle = band
    c.fillRect(-w, -h * 0.15, w * 2, h * 0.3)
    c.restore()
    c.drawImage(this.trails, 0, 0)
    // current star positions
    const P = this.pole
    for (const s of this.stars) {
      c.fillStyle = s.col
      c.fillRect(P.x + Math.cos(s.a + this.angle) * s.r, P.y + Math.sin(s.a + this.angle) * s.r, Math.max(1, 0.8 * u), Math.max(1, 0.8 * u))
    }
    // hill and the observatory
    const hillY = h * 0.78
    c.fillStyle = '#0b0f1e'
    c.beginPath()
    c.moveTo(0, h)
    c.lineTo(0, hillY + 12 * u)
    c.quadraticCurveTo(w * 0.35, hillY - 16 * u, w * 0.7, hillY + 4 * u)
    c.quadraticCurveTo(w * 0.9, hillY + 12 * u, w, hillY + 6 * u)
    c.lineTo(w, h)
    c.fill()
    const s = Math.min(w, h) / 180
    const ox = w * 0.35
    const oy = hillY - 6 * u
    // building
    c.fillStyle = '#e6ecf4'
    c.fillRect(ox - 22 * s, oy - 20 * s, 44 * s, 20 * s)
    c.fillStyle = '#b9c3e6'
    c.fillRect(ox - 22 * s, oy - 20 * s, 44 * s, 2 * s)
    // red night light from the door
    c.fillStyle = '#7a1f2a'
    c.fillRect(ox + 8 * s, oy - 11 * s, 6 * s, 11 * s)
    glow(c, ox + 11 * s, oy - 3 * s, 14 * s, 'rgba(255,60,60,0.3)')
    // dome with the slit open
    c.fillStyle = '#d0d8ea'
    c.beginPath()
    c.arc(ox, oy - 20 * s, 24 * s, Math.PI, 0)
    c.fill()
    const sw = 6 * s * this.slit
    c.fillStyle = '#05060d'
    c.beginPath()
    c.moveTo(ox - sw / 2, oy - 20 * s)
    c.lineTo(ox - sw / 2 + 4 * s, oy - 43 * s)
    c.lineTo(ox + sw / 2 + 4 * s, oy - 43 * s)
    c.lineTo(ox + sw / 2, oy - 20 * s)
    c.fill()
    // the telescope inside, tracking slowly
    const ta = -1.15 + Math.sin(this.t * 0.03) * 0.05
    c.strokeStyle = '#8a92b8'
    c.lineWidth = 3 * s
    c.beginPath()
    c.moveTo(ox + 1 * s, oy - 24 * s)
    c.lineTo(ox + 1 * s + Math.cos(ta) * 16 * s, oy - 24 * s + Math.sin(ta) * 16 * s)
    c.stroke()
    glow(c, ox + 2 * s, oy - 30 * s, 8 * s, 'rgba(255,60,60,0.35)')
    c.strokeStyle = '#8a92b8'
    c.lineWidth = Math.max(1, 0.5 * s)
    c.beginPath()
    c.arc(ox, oy - 20 * s, 24 * s, Math.PI, 0)
    c.stroke()
    // a small tree beside it
    c.fillStyle = '#05060d'
    c.beginPath()
    c.moveTo(ox + 42 * s, oy)
    c.lineTo(ox + 48 * s, oy - 26 * s)
    c.lineTo(ox + 54 * s, oy)
    c.fill()
  }
}
