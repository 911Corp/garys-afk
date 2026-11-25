import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

export function create(ctx: SceneContext) {
  return new LunarBase(ctx)
}

/** A small base on the Moon: lit domes, a blinking antenna, a rover making rounds, and the Earth in a black sky. */
class LunarBase extends PixelScene {
  stars: { x: number; y: number; b: number }[] = []
  ridge: number[] = []
  craters: { x: number; y: number; r: number }[] = []
  rover = { x: 0.2, dir: 1, pause: 0 }
  tracks: number[] = []
  dust: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.mono
  }
  dither() {
    return 0.5
  }
  layout() {
    const r = this.r
    this.stars = Array.from({ length: 240 }, () => ({ x: r(), y: r() * 0.7, b: r() }))
    this.ridge = Array.from({ length: 64 }, (_, i) => 0.55 + Math.sin(i * 0.35) * 0.03 + r() * 0.025)
    this.craters = Array.from({ length: 14 }, () => ({ x: r(), y: r.range(0.72, 0.98), r: r.range(0.02, 0.07) }))
  }
  step(dt: number) {
    const sp = this.num('speed')
    const rv = this.rover
    if (rv.pause > 0) rv.pause -= dt * sp
    else {
      rv.x += rv.dir * dt * 0.025 * sp
      if (rv.x > 0.92 || rv.x < 0.08) {
        rv.dir *= -1
        rv.pause = 3
      }
      if (this.r.chance(dt * 8)) this.dust.push({ x: rv.x - rv.dir * 0.02, y: 0.86, vx: -rv.dir * this.r.range(0.005, 0.02), vy: -this.r.range(0.01, 0.03), life: 1 })
      if (this.tracks.length === 0 || Math.abs(this.tracks[this.tracks.length - 1] - rv.x) > 0.01) {
        this.tracks.push(rv.x)
        if (this.tracks.length > 120) this.tracks.shift()
      }
    }
    for (const d of this.dust) {
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.vy += dt * 0.02 // low gravity
      d.life -= dt * 0.5
    }
    this.dust = this.dust.filter((d) => d.life > 0)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0b0b0c'
    c.fillRect(0, 0, w, h)
    for (const s of this.stars) {
      c.globalAlpha = 0.25 + s.b * 0.75
      c.fillStyle = '#e8e8e8'
      c.fillRect(s.x * w, s.y * h, Math.max(1, s.b * 0.8 * u), Math.max(1, s.b * 0.8 * u))
    }
    c.globalAlpha = 1
    // the Earth, half lit
    const ex = w * 0.75
    const ey = h * 0.22
    const er = Math.min(w, h) * 0.09
    glow(c, ex, ey, er * 2, 'rgba(90,160,230,0.25)')
    c.fillStyle = '#2f6fb0'
    c.beginPath()
    c.arc(ex, ey, er, 0, TAU)
    c.fill()
    c.fillStyle = '#9fd45a'
    c.globalAlpha = 0.7
    c.beginPath()
    c.ellipse(ex - er * 0.2 + Math.sin(this.t * 0.02) * er * 0.1, ey - er * 0.1, er * 0.35, er * 0.25, 0.4, 0, TAU)
    c.fill()
    c.fillStyle = '#f2f0e6'
    c.beginPath()
    c.ellipse(ex + er * 0.1, ey + er * 0.4, er * 0.5, er * 0.12, -0.2, 0, TAU)
    c.fill()
    c.globalAlpha = 1
    c.fillStyle = 'rgba(11,11,12,0.8)'
    c.beginPath()
    c.arc(ex - er * 0.45, ey + er * 0.1, er * 1.02, 0, TAU)
    c.arc(ex, ey, er, 0, TAU, true)
    c.fill()
    // distant ridge
    c.fillStyle = '#3a3a3e'
    c.beginPath()
    c.moveTo(0, h)
    this.ridge.forEach((v, i) => c.lineTo((i / (this.ridge.length - 1)) * w, v * h))
    c.lineTo(w, h)
    c.fill()
    // ground
    const gy = h * 0.66
    const g = c.createLinearGradient(0, gy, 0, h)
    g.addColorStop(0, '#5a5a60')
    g.addColorStop(1, '#8a8a90')
    c.fillStyle = g
    c.fillRect(0, gy, w, h - gy)
    for (const cr of this.craters) {
      c.fillStyle = '#4a4a50'
      c.beginPath()
      c.ellipse(cr.x * w, cr.y * h, cr.r * w, cr.r * w * 0.25, 0, 0, TAU)
      c.fill()
      c.fillStyle = '#a0a0a6'
      c.beginPath()
      c.ellipse(cr.x * w, cr.y * h + cr.r * w * 0.06, cr.r * w * 0.9, cr.r * w * 0.18, 0, 0, Math.PI)
      c.fill()
    }
    // rover tracks
    c.fillStyle = '#6a6a70'
    for (const t of this.tracks) c.fillRect(t * w, h * 0.875, Math.max(1, 0.8 * u), Math.max(1, 0.6 * u))
    // base: domes, tubes and an antenna
    const bx = w * 0.32
    const by = h * 0.78
    const s = Math.min(w, h) / 180
    c.fillStyle = '#b8b8bc'
    c.fillRect(bx - 28 * s, by - 3 * s, 70 * s, 3 * s)
    const dome = (x: number, r: number, lit: boolean) => {
      c.fillStyle = '#d8d8dc'
      c.beginPath()
      c.arc(x, by, r, Math.PI, 0)
      c.fill()
      c.strokeStyle = '#9a9aa0'
      c.lineWidth = Math.max(1, 0.4 * s)
      for (let k = 1; k < 4; k++) {
        c.beginPath()
        c.arc(x, by, r, Math.PI + k * 0.78, Math.PI + k * 0.78 + 0.001)
        c.lineTo(x, by - r * 0.1)
        c.stroke()
      }
      if (lit) {
        c.fillStyle = '#ffd166'
        c.fillRect(x - r * 0.5, by - r * 0.45, r * 0.25, r * 0.18)
        c.fillRect(x + r * 0.2, by - r * 0.45, r * 0.25, r * 0.18)
        glow(c, x, by - r * 0.4, r * 0.9, 'rgba(255,209,102,0.25)')
      }
    }
    dome(bx - 18 * s, 10 * s, true)
    dome(bx + 8 * s, 15 * s, true)
    dome(bx + 34 * s, 8 * s, false)
    c.fillStyle = '#b8b8bc'
    c.fillRect(bx + 50 * s, by - 34 * s, 1.5 * s, 34 * s)
    c.strokeStyle = '#d8d8dc'
    c.lineWidth = 1.2 * s
    c.beginPath()
    c.arc(bx + 54 * s, by - 34 * s, 6 * s, 2.2, 4.4)
    c.stroke()
    if (Math.sin(this.t * 2.5) > 0.6) glow(c, bx + 51 * s, by - 35 * s, 4 * s, 'rgba(255,106,61,0.95)')
    // flag
    c.fillStyle = '#d8d8dc'
    c.fillRect(bx - 40 * s, by - 16 * s, 0.8 * s, 16 * s)
    c.fillStyle = '#7dff8a'
    c.fillRect(bx - 39 * s, by - 16 * s, 8 * s, 5 * s)
    // rover
    const rv = this.rover
    const rx = rv.x * w
    const ry = h * 0.86
    c.fillStyle = '#e8e8e8'
    c.fillRect(rx - 7 * s, ry - 6 * s, 14 * s, 4 * s)
    c.fillRect(rx + rv.dir * 4 * s - 0.5 * s, ry - 11 * s, 1 * s, 5 * s)
    c.fillStyle = '#5aa3ad'
    c.fillRect(rx - 5 * s, ry - 8 * s, 8 * s, 2 * s)
    c.fillStyle = '#2b2925'
    for (const k of [-5, 0, 5]) {
      c.beginPath()
      c.arc(rx + k * s, ry - 1.5 * s, 2 * s, 0, TAU)
      c.fill()
    }
    glow(c, rx + rv.dir * 8 * s, ry - 4 * s, 6 * s, 'rgba(255,241,230,0.4)')
    c.fillStyle = '#a0a0a6'
    for (const d of this.dust) {
      c.globalAlpha = d.life * 0.6
      c.fillRect(d.x * w, d.y * h, Math.max(1, 0.8 * u), Math.max(1, 0.8 * u))
    }
    c.globalAlpha = 1
  }
}
