import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Jelly = { x: number; y: number; s: number; ph: number; hue: string; vx: number }
type Snow = { x: number; y: number; v: number; s: number }
type Lure = { x: number; y: number; dir: number; ph: number }

export function create(ctx: SceneContext) {
  return new Abyss(ctx)
}

/** The deep sea: marine snow drifts down, jellyfish pulse in blue light, a lure glows, a vent breathes bubbles. */
class Abyss extends PixelScene {
  jellies: Jelly[] = []
  snow: Snow[] = []
  plankton: { a: number; r: number; v: number; cx: number; cy: number }[] = []
  bubbles: { x: number; y: number; r: number }[] = []
  lure: Lure = { x: -0.2, y: 0.5, dir: 1, ph: 0 }
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return PX.ocean16
  }
  dither() {
    return 0.45
  }
  configure() {
    const r = this.r
    const n = Math.max(2, Math.round(7 * this.num('life') * this.density))
    this.jellies = Array.from({ length: n }, () => ({ x: r(), y: r.range(0.1, 0.8), s: r.range(0.6, 1.4), ph: r() * TAU, hue: r.pick(['#5ef2ff', '#a68cff', '#ff7ab6', '#7cffc4']), vx: r.range(-0.004, 0.004) }))
    this.snow = Array.from({ length: 220 }, () => ({ x: r(), y: r(), v: r.range(0.005, 0.02), s: r.range(0.4, 1.1) }))
    this.plankton = Array.from({ length: 80 }, () => ({ a: r() * TAU, r: r.range(0.02, 0.1), v: r.range(0.2, 0.6), cx: r(), cy: r.range(0.2, 0.8) }))
  }
  step(dt: number) {
    const sp = this.num('speed')
    for (const j of this.jellies) {
      const pulse = Math.max(0, Math.sin(this.t * 1.4 + j.ph))
      j.y -= pulse * dt * 0.02 * sp
      j.y += dt * 0.004 * sp
      j.x += j.vx * dt * sp
      if (j.y < -0.15) j.y = 1.1
      if (j.x < -0.1) j.x = 1.1
      if (j.x > 1.1) j.x = -0.1
    }
    for (const s of this.snow) {
      s.y += s.v * dt * sp
      s.x += Math.sin(this.t * 0.3 + s.y * 10) * dt * 0.002
      if (s.y > 1) s.y -= 1
    }
    for (const p of this.plankton) p.a += p.v * dt * sp
    if (this.r.chance(dt * 4)) this.bubbles.push({ x: 0.78 + this.r.range(-0.01, 0.01), y: 0.9, r: this.r.range(0.6, 1.6) })
    for (const b of this.bubbles) {
      b.y -= dt * 0.05 * sp
      b.x += Math.sin(this.t * 3 + b.y * 20) * dt * 0.003
    }
    this.bubbles = this.bubbles.filter((b) => b.y > -0.05)
    const L = this.lure
    L.x += L.dir * dt * 0.018 * sp
    L.ph += dt
    if (L.x > 1.3 || L.x < -0.3) {
      L.dir *= -1
      L.y = this.r.range(0.35, 0.65)
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#062538')
    g.addColorStop(0.5, '#031722')
    g.addColorStop(1, '#010a10')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // marine snow
    for (const s of this.snow) {
      c.globalAlpha = 0.25 + s.s * 0.35
      c.fillStyle = '#b8e4e4'
      c.fillRect(s.x * w, s.y * h, Math.max(1, s.s * u), Math.max(1, s.s * u))
    }
    c.globalAlpha = 1
    // plankton swirls, faint blue sparks
    for (const p of this.plankton) {
      const x = (p.cx + Math.cos(p.a) * p.r) * w
      const y = (p.cy + Math.sin(p.a * 1.3) * p.r) * h
      c.globalAlpha = 0.4 + 0.4 * Math.sin(this.t * 3 + p.a * 5)
      c.fillStyle = '#5ef2ff'
      c.fillRect(x, y, Math.max(1, 0.7 * u), Math.max(1, 0.7 * u))
    }
    c.globalAlpha = 1
    // the vent on the sea floor
    const floor = h * 0.9
    c.fillStyle = '#0b1a20'
    c.beginPath()
    c.moveTo(0, h)
    for (let x = 0; x <= w; x += 6 * u) c.lineTo(x, floor + Math.sin(x / (30 * u)) * 4 * u)
    c.lineTo(w, h)
    c.fill()
    const vx = 0.78 * w
    c.fillStyle = '#16303a'
    c.beginPath()
    c.moveTo(vx - 14 * u, floor + 4 * u)
    c.lineTo(vx - 4 * u, floor - 26 * u)
    c.lineTo(vx + 4 * u, floor - 26 * u)
    c.lineTo(vx + 14 * u, floor + 4 * u)
    c.fill()
    glow(c, vx, floor - 26 * u, 16 * u, 'rgba(255,140,80,0.35)')
    c.strokeStyle = 'rgba(184,228,228,0.6)'
    c.lineWidth = Math.max(1, 0.5 * u)
    for (const b of this.bubbles) {
      c.beginPath()
      c.arc(b.x * w, b.y * h, b.r * u * 1.5, 0, TAU)
      c.stroke()
    }
    // jellyfish
    for (const j of this.jellies) {
      const x = j.x * w
      const y = j.y * h
      const s = j.s * 10 * u
      const pulse = Math.max(0, Math.sin(this.t * 1.4 + j.ph))
      const bw = s * (1.1 - pulse * 0.2)
      const bh = s * (0.8 + pulse * 0.2)
      glow(c, x, y, s * 3, j.hue + '33')
      // tentacles trail and wave
      c.strokeStyle = j.hue
      c.globalAlpha = 0.55
      c.lineWidth = Math.max(1, 0.5 * u)
      for (let k = 0; k < 6; k++) {
        const tx = x + (k - 2.5) * bw * 0.3
        c.beginPath()
        c.moveTo(tx, y)
        for (let i = 1; i <= 8; i++) c.lineTo(tx + Math.sin(this.t * 2 + i * 0.6 + k) * s * 0.2, y + i * s * 0.35)
        c.stroke()
      }
      c.globalAlpha = 0.85
      c.fillStyle = j.hue
      c.beginPath()
      c.ellipse(x, y, bw, bh, 0, Math.PI, TAU)
      c.fill()
      c.globalAlpha = 0.5
      c.fillStyle = '#ffffff'
      c.beginPath()
      c.ellipse(x - bw * 0.3, y - bh * 0.5, bw * 0.2, bh * 0.15, -0.3, 0, TAU)
      c.fill()
      c.globalAlpha = 1
    }
    // an original deep-sea fish: dark shape, faint eye, and a glowing lure
    const L = this.lure
    const fx = L.x * w
    const fy = L.y * h + Math.sin(L.ph * 0.8) * 6 * u
    const fs = Math.min(w, h) * 0.06
    c.save()
    c.translate(fx, fy)
    c.scale(L.dir, 1)
    c.fillStyle = '#0a1820'
    c.beginPath()
    c.ellipse(0, 0, fs * 1.3, fs * 0.75, 0, 0, TAU)
    c.fill()
    c.beginPath()
    c.moveTo(-fs * 1.1, 0)
    c.lineTo(-fs * 2, -fs * 0.6)
    c.lineTo(-fs * 2, fs * 0.6)
    c.fill()
    c.strokeStyle = '#0a1820'
    c.lineWidth = Math.max(1, fs * 0.06)
    c.beginPath()
    c.moveTo(fs * 0.6, -fs * 0.6)
    c.quadraticCurveTo(fs * 1.4, -fs * 1.7, fs * 1.9, -fs * 0.9)
    c.stroke()
    c.restore()
    const lx = fx + L.dir * fs * 1.9
    const ly = fy - fs * 0.9
    glow(c, lx, ly, fs * 1.2, 'rgba(124,255,196,0.6)')
    c.fillStyle = '#c8ffe8'
    c.beginPath()
    c.arc(lx, ly, fs * 0.12, 0, TAU)
    c.fill()
    c.fillStyle = 'rgba(124,255,196,0.5)'
    c.beginPath()
    c.arc(fx + L.dir * fs * 0.8, fy - fs * 0.15, fs * 0.08, 0, TAU)
    c.fill()
  }
}
