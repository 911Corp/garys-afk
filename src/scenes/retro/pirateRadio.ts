import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, VT, font, glow, rr } from '../kit'

/** Invented tracks and artists. */
const TRACKS = ['Static Bloom · The Night Shift', 'Low Tide Modem · Paper Satellites', 'Ghost in the Mempool · DJ Few Understand', 'Dial Tone Lullaby · Copper Wire Club', 'Rug Pull Blues · The Hodlers', 'Midnight Commit · Jarvis & the Bots', 'Green Candle Waltz · Moonwalk Society', 'Signal Lost · Antenna Choir']

export function create(ctx: SceneContext) {
  return new PirateRadio(ctx)
}

/** A pirate radio desk at night: VU needles bounce, tape reels turn, the dial drifts, ON AIR glows. */
class PirateRadio extends PixelScene {
  vu = [0, 0]
  vuT = [0, 0]
  reel = 0
  freq = 104.2
  track = 0
  trackT = 0
  scope = new Float32Array(96)
  constructor(ctx: SceneContext) {
    super(ctx)
    this.track = this.r.int(0, TRACKS.length - 1)
  }
  palette() {
    return PX.amber
  }
  dither() {
    return 0.35
  }
  step(dt: number) {
    // a beat-ish envelope drives the meters
    const beat = Math.pow(Math.max(0, Math.sin(this.t * 4.2)), 6)
    for (let i = 0; i < 2; i++) {
      this.vuT[i] = 0.35 + beat * 0.45 + this.r() * 0.15
      this.vu[i] += (this.vuT[i] - this.vu[i]) * Math.min(1, dt * (this.vuT[i] > this.vu[i] ? 18 : 4))
    }
    this.reel += dt * 2.4
    this.freq = 104.2 + Math.sin(this.t * 0.07) * 0.08
    this.trackT += dt
    if (this.trackT > 14) {
      this.trackT = 0
      this.track = (this.track + 1) % TRACKS.length
    }
    this.scope.copyWithin(0, 1)
    this.scope[this.scope.length - 1] = Math.sin(this.t * 40) * (0.3 + beat * 0.6) + (this.r() - 0.5) * 0.25
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#140c06'
    c.fillRect(0, 0, w, h)
    // egg-crate foam on the wall
    c.fillStyle = '#1f130a'
    const cell = 10 * u
    for (let y = 0; y < h * 0.45; y += cell)
      for (let x = (y / cell) % 2 ? cell / 2 : 0; x < w; x += cell) {
        c.beginPath()
        c.arc(x, y, cell * 0.35, 0, TAU)
        c.fill()
      }
    // ON AIR sign
    const fs = Math.max(10, Math.min(9 * u, w / 22))
    const on = Math.sin(this.t * 1.3) > -0.85
    const sx = w / 2
    const sy = h * 0.1
    if (on) glow(c, sx, sy, fs * 5, 'rgba(255,70,40,0.45)')
    c.fillStyle = on ? '#ff4a2a' : '#4a1a10'
    rr(c, sx - fs * 3.2, sy - fs * 0.9, fs * 6.4, fs * 1.8, fs * 0.3)
    c.fill()
    font(c, fs * 1.2, VT)
    c.fillStyle = on ? '#fff0d0' : '#2a0c08'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('ON AIR', sx, sy + fs * 0.05)
    // the desk: a big panel
    const px = w * 0.05
    const py = h * 0.22
    const pw = w * 0.9
    const ph = h * 0.7
    c.fillStyle = '#3a2412'
    rr(c, px, py, pw, ph, 4 * u)
    c.fill()
    c.fillStyle = '#4e3018'
    rr(c, px + 3 * u, py + 3 * u, pw - 6 * u, ph - 6 * u, 3 * u)
    c.fill()
    const portrait = h > w
    // frequency dial
    const dx = px + pw * 0.06
    const dy = py + ph * 0.06
    const dw = pw * 0.88
    const dh = ph * (portrait ? 0.1 : 0.14)
    c.fillStyle = '#1a0e06'
    rr(c, dx, dy, dw, dh, 2 * u)
    c.fill()
    glow(c, dx + dw / 2, dy + dh / 2, dw * 0.5, 'rgba(255,176,0,0.12)')
    font(c, Math.max(7, dh * 0.24), MONO, 500)
    c.fillStyle = '#ffb000'
    for (let f = 88; f <= 108; f += 2) {
      const x = dx + ((f - 87) / 22) * dw
      c.fillRect(x, dy + dh * 0.12, Math.max(1, 0.4 * u), dh * 0.22)
      c.fillText(String(f), x, dy + dh * 0.62)
    }
    const nx = dx + ((this.freq - 87) / 22) * dw
    c.fillStyle = '#ff4a2a'
    c.fillRect(nx - 0.6 * u, dy + dh * 0.05, 1.2 * u, dh * 0.9)
    // station and now playing
    font(c, Math.max(9, fs * 0.8), VT)
    c.fillStyle = '#ffb000'
    c.textAlign = 'left'
    const ty = dy + dh + ph * 0.05
    c.fillText(`RADIO NGMI  ${this.freq.toFixed(1)} FM  ·  pirate frequency`, dx, ty)
    font(c, Math.max(8, fs * 0.65), MONO, 500)
    c.fillStyle = '#ffd890'
    const np = 'now playing: ' + TRACKS[this.track]
    c.fillText(np.slice(0, Math.floor(this.trackT * 25)), dx, ty + fs)
    // VU meters
    const vuY = ty + fs * 2
    const vuH = ph * (portrait ? 0.18 : 0.3)
    const vuW = portrait ? dw / 2 - 3 * u : dw * 0.28
    for (let i = 0; i < 2; i++) {
      const vx = dx + i * (vuW + 6 * u)
      c.fillStyle = '#f2e2b0'
      rr(c, vx, vuY, vuW, vuH, 2 * u)
      c.fill()
      const cx = vx + vuW / 2
      const cy = vuY + vuH * 0.92
      const R = Math.min(vuW * 0.45, vuH * 0.8)
      c.strokeStyle = '#3a2412'
      c.lineWidth = Math.max(1, 0.5 * u)
      c.beginPath()
      c.arc(cx, cy, R, Math.PI * 1.2, Math.PI * 1.8)
      c.stroke()
      c.strokeStyle = '#c8402e'
      c.lineWidth = Math.max(1, 1.2 * u)
      c.beginPath()
      c.arc(cx, cy, R, Math.PI * 1.65, Math.PI * 1.8)
      c.stroke()
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI * (1.2 + (k / 8) * 0.6)
        c.strokeStyle = '#3a2412'
        c.lineWidth = Math.max(1, 0.4 * u)
        c.beginPath()
        c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
        c.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9)
        c.stroke()
      }
      const a = Math.PI * (1.2 + Math.min(1, this.vu[i]) * 0.6)
      c.strokeStyle = '#140c06'
      c.lineWidth = Math.max(1, 0.7 * u)
      c.beginPath()
      c.moveTo(cx, cy)
      c.lineTo(cx + Math.cos(a) * R * 1.02, cy + Math.sin(a) * R * 1.02)
      c.stroke()
      font(c, Math.max(7, vuH * 0.12), MONO, 700)
      c.fillStyle = '#3a2412'
      c.textAlign = 'center'
      c.fillText(i ? 'R' : 'L', cx, vuY + vuH * 0.25)
      c.textAlign = 'left'
    }
    // oscilloscope
    const ox = portrait ? dx : dx + 2 * (vuW + 6 * u)
    const oy = portrait ? vuY + vuH + 6 * u : vuY
    const ow = portrait ? dw : dw - 2 * (vuW + 6 * u)
    const oh = portrait ? ph * 0.12 : vuH
    c.fillStyle = '#0a0602'
    rr(c, ox, oy, ow, oh, 2 * u)
    c.fill()
    c.strokeStyle = '#ffb000'
    c.lineWidth = Math.max(1, 0.7 * u)
    c.beginPath()
    for (let i = 0; i < this.scope.length; i++) {
      const x = ox + (i / (this.scope.length - 1)) * ow
      const y = oy + oh / 2 + this.scope[i] * oh * 0.4
      if (i) c.lineTo(x, y)
      else c.moveTo(x, y)
    }
    c.stroke()
    // tape reels
    const ry = (portrait ? oy + oh : vuY + vuH) + ph * 0.06
    const rr2 = Math.min(ph * 0.14, dw * 0.12)
    for (let i = 0; i < 2; i++) {
      const cx = dx + dw * (0.25 + i * 0.5)
      const cy = ry + rr2
      if (cy + rr2 > py + ph - 4 * u) continue
      c.fillStyle = '#1a0e06'
      c.beginPath()
      c.arc(cx, cy, rr2, 0, TAU)
      c.fill()
      c.fillStyle = '#6a4020'
      c.beginPath()
      c.arc(cx, cy, rr2 * (i ? 0.55 : 0.85), 0, TAU)
      c.fill()
      c.fillStyle = '#c8a070'
      for (let k = 0; k < 3; k++) {
        const a = this.reel * (i ? 1.4 : 1) + (k * TAU) / 3
        c.beginPath()
        c.arc(cx + Math.cos(a) * rr2 * 0.3, cy + Math.sin(a) * rr2 * 0.3, rr2 * 0.1, 0, TAU)
        c.fill()
      }
      c.fillStyle = '#140c06'
      c.beginPath()
      c.arc(cx, cy, rr2 * 0.1, 0, TAU)
      c.fill()
    }
    c.textBaseline = 'alphabetic'
  }
}
