import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { MONO, font } from '../kit'

const STEPS = [
  { s: 'Dialing 555-0156…', d: 3 },
  { s: 'Handshaking…', d: 4.5 },
  { s: 'Verifying username and password…', d: 2.5 },
  { s: 'Logging on to network…', d: 2 },
  { s: 'Connected at 56,000 bps', d: 2 },
]
const PAGE = ['WELCOME TO GARY’S HOMEPAGE', 'you are visitor #000420', 'best viewed in 800x600', '* links *', '> my favorite websites', '> webring: weird web', '> sign my guestbook', '(c) 1999 no rights reserved']
const LIGHTS = ['HS', 'AA', 'CD', 'OH', 'RD', 'SD', 'TR', 'MR']

export function create(ctx: SceneContext) {
  return new DialUp(ctx)
}

/** A 56k modem connects: dialog steps, blinking modem lights, a handshake squeal, then a slow page load. */
class DialUp extends PixelScene {
  phase = 0
  timer = 0
  load = 0
  hang = 0
  wave = new Float32Array(120)
  lights = LIGHTS.map(() => 0)
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.web
  }
  dither() {
    return 0.2
  }
  get connected() {
    return this.phase >= STEPS.length
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.timer += dt * sp
    if (!this.connected) {
      if (this.timer > STEPS[this.phase].d) {
        this.timer = 0
        this.phase++
        if (this.connected) this.emit({ type: 'chime' })
      }
    } else if (this.load < 1) this.load = Math.min(1, this.load + dt * sp * 0.06)
    else {
      this.hang += dt * sp
      if (this.hang > 6) {
        this.phase = 0
        this.timer = 0
        this.load = 0
        this.hang = 0
      }
    }
    // handshake waveform: loud during dialing and handshake, quiet carrier after
    const loud = this.phase === 1 ? 1 : this.phase === 0 ? 0.35 : this.connected ? 0.12 : 0.25
    this.wave.copyWithin(0, 1)
    const f = this.phase === 1 ? 6 + Math.sin(this.t * 0.7) * 5 : 2
    this.wave[this.wave.length - 1] = loud * (Math.sin(this.t * f * 9) * 0.6 + (this.r() - 0.5) * (this.phase === 1 ? 1.2 : 0.4))
    // modem lights
    this.lights = this.lights.map((v, i) => {
      if (i === 0 || i === 6) return 1
      if (i === 2) return this.phase >= 2 ? 1 : 0
      if (i === 3) return 1
      if (i === 4 || i === 5) return this.phase >= 1 && this.r.chance(0.5) ? 1 : Math.max(0, v - dt * 6)
      if (i === 7) return 1
      return this.connected ? 1 : 0
    })
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    // desktop teal
    c.fillStyle = '#008080'
    c.fillRect(0, 0, w, h)
    const portrait = h > w
    const fs = Math.max(8, Math.min(7 * u, w / 40))
    // window geometry
    const ww = Math.min(w * 0.9, fs * 56)
    const wh = Math.min(h * (portrait ? 0.5 : 0.62), fs * 30)
    const wx = (w - ww) / 2
    const wy = portrait ? Math.max(fs, (h - wh - fs * 7) / 2) : (h - wh) / 2 - fs * 2
    this.win(wx, wy, ww, wh, this.connected ? 'Netscape - [Gary’s Homepage]' : 'Connecting to GaryNet', fs)
    const ix = wx + fs
    const iy = wy + fs * 2.6
    const iw = ww - fs * 2
    const ih = wh - fs * 3.6
    c.textBaseline = 'top'
    if (!this.connected) {
      c.fillStyle = '#c0c0c0'
      c.fillRect(ix, iy, iw, ih)
      // two little computers and a wire with moving packets
      const my = iy + ih * 0.28
      this.pc(ix + iw * 0.18, my, fs)
      this.pc(ix + iw * 0.82, my, fs)
      c.strokeStyle = '#000000'
      c.lineWidth = Math.max(1, fs * 0.12)
      c.setLineDash([fs * 0.5, fs * 0.4])
      c.lineDashOffset = -this.t * fs * 4
      c.beginPath()
      c.moveTo(ix + iw * 0.26, my)
      c.lineTo(ix + iw * 0.74, my)
      c.stroke()
      c.setLineDash([])
      font(c, fs, MONO, 500)
      c.fillStyle = '#000000'
      c.fillText('Status: ' + STEPS[this.phase].s, ix + fs, iy + ih * 0.52)
      // waveform scope
      const sx = ix + fs
      const sy = iy + ih * 0.66
      const sw = iw - fs * 2
      const sh = ih * 0.26
      c.fillStyle = '#000000'
      c.fillRect(sx, sy, sw, sh)
      c.strokeStyle = '#00ff00'
      c.lineWidth = Math.max(1, fs * 0.12)
      c.beginPath()
      for (let i = 0; i < this.wave.length; i++) {
        const x = sx + (i / (this.wave.length - 1)) * sw
        const y = sy + sh / 2 + this.wave[i] * sh * 0.45
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
      c.stroke()
    } else {
      // page loads top to bottom, images interlace
      c.fillStyle = '#000000'
      c.fillRect(ix, iy, iw, ih)
      const shown = this.load * (PAGE.length + 3)
      font(c, fs * 1.3, MONO, 700)
      const lh = fs * 1.9
      PAGE.forEach((s, i) => {
        if (i > shown) return
        const y = iy + fs + i * lh + (i > 0 ? fs * 4.5 : 0)
        if (y > iy + ih - lh) return
        if (i === 0) {
          const hue = Math.floor(this.t * 4) % 3
          c.fillStyle = ['#ffff00', '#ff00ff', '#00ffff'][hue]
          c.textAlign = 'center'
          c.fillText(s, ix + iw / 2, y)
          c.textAlign = 'left'
          font(c, fs, MONO, 400)
          // interlaced banner image
          const bh = fs * 3
          const lines = Math.floor(Math.min(1, (shown - 1) / 2) * 8)
          for (let k = 0; k < 8; k++) {
            if (k % 2 === 1 && k > lines) continue
            if (k % 2 === 0 && k / 2 > lines) continue
            c.fillStyle = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00c0c0', '#0000ff', '#800080', '#ff00ff'][k]
            c.fillRect(ix + iw * 0.2, y + fs * 1.6 + (k * bh) / 8, iw * 0.6, bh / 8 + 1)
          }
          return
        }
        c.fillStyle = s.startsWith('>') ? '#5a8cff' : '#c0c0c0'
        c.fillText(s, ix + fs * 2, y)
        if (s.startsWith('>')) c.fillRect(ix + fs * 2, y + fs * 1.15, c.measureText(s).width, Math.max(1, fs * 0.08))
      })
      // status bar
      c.fillStyle = '#c0c0c0'
      c.fillRect(ix, iy + ih - fs * 1.5, iw, fs * 1.5)
      font(c, fs * 0.85, MONO, 400)
      c.fillStyle = '#000000'
      c.fillText(this.load < 1 ? `Document: ${Math.floor(this.load * 100)}% of 48K (0.9 K/s)` : 'Document: Done', ix + fs * 0.4, iy + ih - fs * 1.3)
    }
    // external modem on the desk
    const mw = Math.min(w * 0.7, fs * 40)
    const mh = fs * 3.2
    const mx = (w - mw) / 2
    const my = Math.min(h - mh - fs * 2, wy + wh + fs * 3)
    c.fillStyle = '#d8d4c4'
    c.fillRect(mx, my, mw, mh)
    c.fillStyle = '#a8a494'
    c.fillRect(mx, my + mh * 0.8, mw, mh * 0.2)
    font(c, fs * 0.7, MONO, 500)
    c.textBaseline = 'middle'
    LIGHTS.forEach((n, i) => {
      const lx = mx + mw * 0.3 + (i * mw * 0.65) / LIGHTS.length
      const on = this.lights[i] > 0.5
      c.fillStyle = on ? (i === 2 ? '#00ff00' : '#ff0000') : '#5a1520'
      c.fillRect(lx, my + mh * 0.25, fs * 0.9, fs * 0.5)
      c.fillStyle = '#404040'
      c.fillText(n, lx, my + mh * 0.62)
    })
    c.fillStyle = '#404040'
    font(c, fs * 0.9, MONO, 700)
    c.fillText('56K', mx + fs, my + mh * 0.42)
    c.textBaseline = 'alphabetic'
  }
  pc(x: number, y: number, fs: number) {
    const c = this.c
    c.fillStyle = '#ffffff'
    c.fillRect(x - fs * 1.6, y - fs * 1.4, fs * 3.2, fs * 2.4)
    c.fillStyle = '#000080'
    c.fillRect(x - fs * 1.3, y - fs * 1.1, fs * 2.6, fs * 1.6)
    c.fillStyle = '#808080'
    c.fillRect(x - fs * 0.4, y + fs, fs * 0.8, fs * 0.5)
    c.fillRect(x - fs * 1.2, y + fs * 1.5, fs * 2.4, fs * 0.3)
  }
  win(x: number, y: number, w: number, h: number, title: string, fs: number) {
    const c = this.c
    c.fillStyle = '#c0c0c0'
    c.fillRect(x, y, w, h)
    c.fillStyle = '#ffffff'
    c.fillRect(x, y, w, 2)
    c.fillRect(x, y, 2, h)
    c.fillStyle = '#808080'
    c.fillRect(x, y + h - 2, w, 2)
    c.fillRect(x + w - 2, y, 2, h)
    const g = c.createLinearGradient(x, 0, x + w, 0)
    g.addColorStop(0, '#000080')
    g.addColorStop(1, '#1084d0')
    c.fillStyle = g
    c.fillRect(x + 4, y + 4, w - 8, fs * 1.7)
    font(c, fs, MONO, 700)
    c.fillStyle = '#ffffff'
    c.textBaseline = 'middle'
    c.fillText(title, x + fs * 0.6, y + 4 + fs * 0.85)
    for (let i = 0; i < 3; i++) {
      const bx = x + w - 6 - (i + 1) * fs * 1.5
      c.fillStyle = '#c0c0c0'
      c.fillRect(bx, y + 6, fs * 1.3, fs * 1.3)
      c.fillStyle = '#000000'
      c.fillText(['×', '□', '_'][i], bx + fs * 0.35, y + 6 + fs * 0.65)
    }
    c.textBaseline = 'alphabetic'
  }
}
