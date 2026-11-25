import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { VT, font, glow } from '../kit'

type Seg = { curve: number; hill: number; palm: number; sign: number }

export function create(ctx: SceneContext) {
  return new RetroRacer(ctx)
}

/** A coastal road at sunset, raced the arcade way: curves, hills, palm trees and a striped road to the horizon. */
class RetroRacer extends PixelScene {
  segs: Seg[] = []
  Y: number[] = []
  pos = 0
  steer = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    // build a looping track from simple sections
    const r = this.r
    for (let s = 0; s < 24; s++) {
      const curve = r.chance(0.3) ? 0 : r.range(-3, 3)
      const hill = r.range(-25, 25)
      const len = r.int(40, 90)
      for (let i = 0; i < len; i++) {
        const k = Math.sin((i / len) * Math.PI)
        this.segs.push({ curve: curve * k, hill: hill * Math.sin((i / len) * Math.PI * 2), palm: i % 6 === 0 ? (r.chance(0.5) ? -1 : 1) * (r.chance(0.7) ? 1 : 0) : 0, sign: r.chance(0.008) ? 1 : 0 })
      }
    }
    // cumulative world heights, so hills roll smoothly
    this.Y = [0]
    for (let i = 0; i < this.segs.length; i++) this.Y.push(this.Y[i] + this.segs[i].hill * 8)
  }
  palette() {
    return PX.console16
  }
  dither() {
    return 0.4
  }
  step(dt: number) {
    this.pos = (this.pos + dt * 60 * this.num('speed')) % this.segs.length
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const horizon = h * 0.5
    // sky and sun
    const sky = c.createLinearGradient(0, 0, 0, horizon)
    sky.addColorStop(0, '#2b2236')
    sky.addColorStop(0.6, '#a23e5c')
    sky.addColorStop(1, '#f3a64b')
    c.fillStyle = sky
    c.fillRect(0, 0, w, horizon)
    const cur = this.segs[Math.floor(this.pos)]
    this.steer += (cur.curve - this.steer) * 0.02
    const sunX = w / 2 - this.steer * 40 * u
    glow(c, sunX, horizon - 20 * u, 70 * u, 'rgba(247,224,122,0.5)')
    c.fillStyle = '#f7e07a'
    c.beginPath()
    c.arc(sunX, horizon - 18 * u, 30 * u, Math.PI, 0)
    c.fill()
    c.fillStyle = '#a23e5c'
    for (let k = 0; k < 5; k++) c.fillRect(sunX - 32 * u, horizon - 6 * u - k * 5 * u, 64 * u, (1 + k * 0.3) * u)
    // far hills move with the curve
    c.fillStyle = '#55305a'
    c.beginPath()
    c.moveTo(0, horizon)
    for (let x = 0; x <= w; x += 6 * u) c.lineTo(x, horizon - 10 * u - Math.sin((x + this.pos * 0.5 - this.steer * 30) / (40 * u)) * 7 * u)
    c.lineTo(w, horizon)
    c.fill()
    // sea on the left, sand on the right
    c.fillStyle = '#2f6fb0'
    c.fillRect(0, horizon, w, h - horizon)
    // pseudo-3D road (segment projection, as arcade racers did it)
    const L = 200
    const RW = 1400
    const D = 0.84
    const N = 150
    const len = this.segs.length
    const base = Math.floor(this.pos)
    const pct = this.pos - base
    const yAt = (k: number) => this.Y[((k % len) + len) % len] + Math.floor(k / len) * this.Y[len]
    const camY = 1000 + yAt(base) + (yAt(base + 1) - yAt(base)) * pct
    let x = 0
    let dx = -cur.curve * pct
    let maxY = h
    const proj: { x: number; y: number; wd: number; scale: number; seg: Seg; i: number }[] = []
    let prev: { x: number; y: number; wd: number } | null = null
    for (let n = 0; n <= N; n++) {
      const z = n * L - pct * L
      const scale = D / Math.max(1, z)
      const sx = w / 2 + scale * (x - this.steer * 120) * (w / 2)
      const sy = h / 2 - scale * (yAt(base + n) - camY) * (h / 2)
      const wd = scale * RW * (w / 2)
      const seg = this.segs[(base + n) % len]
      if (prev && z > D * 10 && sy < prev.y && sy < maxY) {
        const p = prev
        const q = { x: sx, y: sy, wd }
        const alt = Math.floor((base + n) / 3) % 2 === 0
        c.fillStyle = alt ? '#f7e07a' : '#f3a64b'
        c.fillRect(0, q.y, w, p.y - q.y + 1)
        const quad = (k: number, col: string) => {
          c.fillStyle = col
          c.beginPath()
          c.moveTo(p.x - p.wd * k, p.y)
          c.lineTo(p.x + p.wd * k, p.y)
          c.lineTo(q.x + q.wd * k, q.y)
          c.lineTo(q.x - q.wd * k, q.y)
          c.fill()
        }
        // the sea starts a little left of the road
        c.fillStyle = alt ? '#5ab4e5' : '#2f6fb0'
        c.beginPath()
        c.moveTo(0, p.y)
        c.lineTo(p.x - p.wd * 2.2, p.y)
        c.lineTo(q.x - q.wd * 2.2, q.y)
        c.lineTo(0, q.y)
        c.fill()
        quad(1.15, alt ? '#f2f0e6' : '#e2614f')
        quad(1, alt ? '#55305a' : '#4a2a4e')
        if (alt) quad(0.03, '#f2f0e6')
        maxY = q.y
      }
      if (n > 0) proj.push({ x: sx, y: sy, wd, scale, seg, i: base + n })
      prev = { x: sx, y: sy, wd }
      x += dx
      dx += seg.curve
    }
    // palms and signs, far to near
    for (let n = proj.length - 1; n >= 0; n--) {
      const p = proj[n]
      if (!p.seg.palm && !p.seg.sign) continue
      if (p.y > h || p.wd < 2) continue
      const s = p.wd / 110
      const side = p.seg.palm || 1
      const px = p.x + side * p.wd * 1.7
      if (p.seg.sign) {
        c.fillStyle = '#0d0b14'
        c.fillRect(px - 2 * s, p.y - 60 * s, 4 * s, 60 * s)
        c.fillStyle = '#e2614f'
        c.fillRect(px - 40 * s, p.y - 90 * s, 80 * s, 30 * s)
        font(c, Math.max(6, 18 * s), VT)
        c.fillStyle = '#f2f0e6'
        c.textAlign = 'center'
        c.fillText('WAGMI', px, p.y - 70 * s)
        c.textAlign = 'left'
        continue
      }
      this.palm(px, p.y, s)
    }
    // the car
    const cs = Math.min(w, h) / 180
    const cx = w / 2 + Math.sin(this.t * 0.7) * 2 * cs
    const cy = h * 0.9
    const lean = -this.steer * 2
    c.fillStyle = 'rgba(13,11,20,0.4)'
    c.fillRect(cx - 24 * cs, cy + 2 * cs, 48 * cs, 4 * cs)
    c.fillStyle = '#e2614f'
    c.beginPath()
    c.moveTo(cx - 22 * cs, cy)
    c.lineTo(cx + 22 * cs, cy)
    c.lineTo(cx + 20 * cs + lean, cy - 9 * cs)
    c.lineTo(cx - 20 * cs + lean, cy - 9 * cs)
    c.fill()
    c.fillStyle = '#a23e5c'
    c.beginPath()
    c.moveTo(cx - 14 * cs + lean, cy - 9 * cs)
    c.lineTo(cx + 14 * cs + lean, cy - 9 * cs)
    c.lineTo(cx + 10 * cs + lean * 1.5, cy - 16 * cs)
    c.lineTo(cx - 10 * cs + lean * 1.5, cy - 16 * cs)
    c.fill()
    c.fillStyle = '#1e3d5c'
    c.fillRect(cx - 9 * cs + lean * 1.4, cy - 15 * cs, 18 * cs, 4 * cs)
    c.fillStyle = '#f7e07a'
    c.fillRect(cx - 19 * cs, cy - 6 * cs, 6 * cs, 2 * cs)
    c.fillRect(cx + 13 * cs, cy - 6 * cs, 6 * cs, 2 * cs)
    c.fillStyle = '#0d0b14'
    c.fillRect(cx - 21 * cs, cy - 1 * cs, 7 * cs, 4 * cs)
    c.fillRect(cx + 14 * cs, cy - 1 * cs, 7 * cs, 4 * cs)
    c.fillStyle = '#f2f0e6'
    font(c, 4 * cs, VT)
    c.textAlign = 'center'
    c.fillText('AFK', cx, cy - 3 * cs)
    c.textAlign = 'left'
  }
  palm(x: number, y: number, s: number) {
    const c = this.c
    c.strokeStyle = '#6b3a2a'
    c.lineWidth = Math.max(1, 3 * s)
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + 8 * s, y - 25 * s, x + 4 * s, y - 50 * s)
    c.stroke()
    c.fillStyle = '#25604f'
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.55
      c.save()
      c.translate(x + 4 * s, y - 50 * s)
      c.rotate(a + Math.PI / 2)
      c.beginPath()
      c.ellipse(0, -11 * s, 3.5 * s, 12 * s, 0.25, 0, TAU)
      c.fill()
      c.restore()
    }
  }
}
