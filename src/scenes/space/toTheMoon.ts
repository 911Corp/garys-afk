import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, clamp, mix } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, font, glow, rr } from '../kit'

export function create(ctx: SceneContext) {
  return new ToTheMoon(ctx)
}

/** "Wen moon": a little rocket climbs through the clouds, cruises through stars and reaches the Moon. Then again. */
class ToTheMoon extends PixelScene {
  p = 0
  stars: { x: number; y: number; z: number }[] = []
  clouds: { x: number; y: number; s: number }[] = []
  smoke: { x: number; y: number; r: number; life: number }[] = []
  chart: number[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.stars = Array.from({ length: 160 }, () => ({ x: this.r(), y: this.r(), z: this.r.range(0.2, 1) }))
    this.clouds = Array.from({ length: 10 }, () => ({ x: this.r(), y: this.r(), s: this.r.range(0.6, 1.4) }))
    for (let i = 0; i < 60; i++) this.chart.push(i * 0.4 + this.r.range(-2, 2))
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.45
  }
  step(dt: number) {
    const sp = this.num('speed')
    const dur = 45
    this.p += (dt * sp) / dur
    if (this.p >= 1) this.p = 0
    const v = this.speedAt()
    for (const s of this.stars) {
      s.y += v * s.z * dt * 0.25 * sp
      if (s.y > 1) {
        s.y -= 1
        s.x = this.r()
      }
    }
    for (const cl of this.clouds) {
      cl.y += v * dt * 0.6 * sp
      if (cl.y > 1.3) {
        cl.y = -0.3
        cl.x = this.r()
      }
    }
    const { w, h, u } = this
    if (this.r.chance(dt * 20)) this.smoke.push({ x: w / 2 + this.r.range(-2, 2) * u, y: this.rocketY() + 26 * u, r: 2 * u, life: 1 })
    for (const s of this.smoke) {
      s.y += (30 + v * 60) * u * dt
      s.r += dt * 6 * u
      s.life -= dt * 1.2
    }
    this.smoke = this.smoke.filter((s) => s.life > 0 && s.y < h + 10 * u)
    // the chart only goes up (mostly)
    const last = this.chart[this.chart.length - 1]
    if (this.r.chance(dt * 4)) {
      this.chart.push(last + this.r.range(-1.2, 2))
      if (this.chart.length > 60) this.chart.shift()
    }
  }
  speedAt() {
    const p = this.p
    if (p < 0.08) return p / 0.08
    if (p > 0.8) return Math.max(0.1, (1 - p) / 0.2)
    return 1
  }
  rocketY() {
    const p = this.p
    const { h } = this
    if (p < 0.06) return h * (0.62 - p * 2)
    if (p > 0.86) return h * 0.5 + (p - 0.86) * h * 0.4
    return h * 0.5 + Math.sin(this.t * 1.3) * h * 0.01
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const p = this.p
    const alt = clamp(p / 0.35, 0, 1)
    // sky: blue to black as we climb
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, mix('#3a63a8', '#05060d', alt))
    g.addColorStop(1, mix('#b5d0f0', '#0d1226', alt))
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // stars fade in
    c.fillStyle = '#f2f4ff'
    for (const s of this.stars) {
      c.globalAlpha = clamp(alt * 2 - 1, 0, 1) * s.z
      const len = Math.max(1, this.speedAt() * s.z * 6 * u)
      c.fillRect(s.x * w, s.y * h, Math.max(1, s.z * 1.2 * u), len)
    }
    c.globalAlpha = 1
    // launch pad and ground at the very start
    if (p < 0.12) {
      const gy = h * 0.78 + (p / 0.12) * h * 0.6
      c.fillStyle = '#1d3b2a'
      c.fillRect(0, gy, w, h)
      c.fillStyle = '#3f7a4a'
      c.fillRect(0, gy, w, 2 * u)
      c.fillStyle = '#5a5a7a'
      c.fillRect(w / 2 + 14 * u, gy - 60 * u, 4 * u, 60 * u)
      for (let i = 0; i < 6; i++) c.fillRect(w / 2 + 6 * u, gy - 10 * u - i * 10 * u, 12 * u, 1.2 * u)
    }
    // clouds pass during the climb
    if (alt < 1) {
      c.fillStyle = '#f2f4ff'
      for (const cl of this.clouds) {
        c.globalAlpha = (1 - alt) * 0.85
        const x = cl.x * w
        const y = cl.y * h
        for (let k = 0; k < 4; k++) {
          c.beginPath()
          c.ellipse(x + (k - 1.5) * 14 * u * cl.s, y + (k % 2) * 3 * u, 16 * u * cl.s, 7 * u * cl.s, 0, 0, TAU)
          c.fill()
        }
      }
      c.globalAlpha = 1
    }
    // the Moon grows, arrives from the top
    if (p > 0.45) {
      const m = (p - 0.45) / 0.55
      const R = (12 + m * m * 220) * u
      const my = -R * 0.4 + m * (h * 0.1 + R * 0.4)
      glow(c, w * 0.5, my, R * 1.4, 'rgba(242,244,255,0.2)')
      c.fillStyle = '#b5d0f0'
      c.beginPath()
      c.arc(w * 0.5, my, R, 0, TAU)
      c.fill()
      c.fillStyle = '#6a95d4'
      for (const [cx, cy, cr] of [
        [-0.3, -0.2, 0.18],
        [0.25, 0.1, 0.12],
        [-0.05, 0.35, 0.15],
        [0.4, -0.35, 0.08],
        [-0.45, 0.3, 0.07],
      ]) {
        c.globalAlpha = 0.6
        c.beginPath()
        c.arc(w * 0.5 + cx * R, my + cy * R, cr * R, 0, TAU)
        c.fill()
      }
      c.globalAlpha = 1
    }
    // smoke and the rocket
    for (const s of this.smoke) {
      c.globalAlpha = s.life * 0.5
      c.fillStyle = '#b5d0f0'
      c.beginPath()
      c.arc(s.x, s.y, s.r, 0, TAU)
      c.fill()
    }
    c.globalAlpha = 1
    this.rocket(w / 2, this.rocketY(), u * 1.3)
    // HUD
    const fs = Math.max(8, 6 * u)
    font(c, fs, MONO, 500)
    c.fillStyle = '#f2f4ff'
    c.textBaseline = 'top'
    const km = Math.floor(384400 * clamp(p / 0.95, 0, 1))
    c.fillText(`ALT ${km.toLocaleString('en-US')} km`, fs, fs)
    c.fillStyle = p > 0.95 ? '#fff3b0' : '#6a95d4'
    c.fillText(p > 0.9 ? 'status: we’re so back' : p < 0.05 ? 'status: gm, launching' : 'status: wen moon', fs, fs * 2.4)
    // tiny chart, only goes up
    const cw = Math.min(w * 0.3, 80 * u)
    const chh = cw * 0.4
    const cx = w - cw - fs
    const cy = fs
    c.fillStyle = 'rgba(5,6,13,0.55)'
    rr(c, cx, cy, cw, chh, 2 * u)
    c.fill()
    const mn = Math.min(...this.chart)
    const mx = Math.max(...this.chart)
    c.strokeStyle = '#3f7a4a'
    c.lineWidth = Math.max(1, 0.8 * u)
    c.beginPath()
    this.chart.forEach((v, i) => {
      const x = cx + 3 * u + (i / (this.chart.length - 1)) * (cw - 6 * u)
      const y = cy + chh - 3 * u - ((v - mn) / (mx - mn || 1)) * (chh - 6 * u)
      if (i) c.lineTo(x, y)
      else c.moveTo(x, y)
    })
    c.stroke()
    c.fillStyle = '#6a95d4'
    font(c, fs * 0.8, MONO, 500)
    c.fillText('$WENMOON', cx + 3 * u, cy + chh + 2 * u)
    c.textBaseline = 'alphabetic'
  }
  rocket(x: number, y: number, s: number) {
    const c = this.c
    const flame = 1 + Math.sin(this.t * 30) * 0.15 + this.speedAt() * 0.4
    glow(c, x, y + 22 * s, 14 * s * flame, 'rgba(255,207,106,0.6)')
    c.fillStyle = '#ff8a5c'
    c.beginPath()
    c.moveTo(x - 4 * s, y + 18 * s)
    c.quadraticCurveTo(x, y + (18 + 16 * flame) * s, x + 4 * s, y + 18 * s)
    c.fill()
    c.fillStyle = '#fff3b0'
    c.beginPath()
    c.moveTo(x - 2.2 * s, y + 18 * s)
    c.quadraticCurveTo(x, y + (18 + 9 * flame) * s, x + 2.2 * s, y + 18 * s)
    c.fill()
    // fins
    c.fillStyle = '#a3487a'
    c.beginPath()
    c.moveTo(x - 6 * s, y + 6 * s)
    c.lineTo(x - 11 * s, y + 19 * s)
    c.lineTo(x - 5 * s, y + 17 * s)
    c.fill()
    c.beginPath()
    c.moveTo(x + 6 * s, y + 6 * s)
    c.lineTo(x + 11 * s, y + 19 * s)
    c.lineTo(x + 5 * s, y + 17 * s)
    c.fill()
    // body
    c.fillStyle = '#f2f4ff'
    c.beginPath()
    c.moveTo(x, y - 22 * s)
    c.quadraticCurveTo(x + 8 * s, y - 10 * s, x + 6.5 * s, y + 18 * s)
    c.lineTo(x - 6.5 * s, y + 18 * s)
    c.quadraticCurveTo(x - 8 * s, y - 10 * s, x, y - 22 * s)
    c.fill()
    c.fillStyle = '#a3487a'
    c.beginPath()
    c.moveTo(x, y - 22 * s)
    c.quadraticCurveTo(x + 4.5 * s, y - 17 * s, x + 5.6 * s, y - 12 * s)
    c.lineTo(x - 5.6 * s, y - 12 * s)
    c.quadraticCurveTo(x - 4.5 * s, y - 17 * s, x, y - 22 * s)
    c.fill()
    // window
    c.fillStyle = '#24407a'
    c.beginPath()
    c.arc(x, y - 4 * s, 3 * s, 0, TAU)
    c.fill()
    c.strokeStyle = '#6a95d4'
    c.lineWidth = s
    c.stroke()
    c.fillStyle = '#16244a'
    font(c, 2.4 * s, MONO, 700)
    c.textAlign = 'center'
    c.fillText('WEN', x, y + 6 * s)
    c.fillText('MOON', x, y + 9.5 * s)
    c.textAlign = 'left'
  }
}
