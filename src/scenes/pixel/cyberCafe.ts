import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, VT, font, glow } from '../kit'

type Screen = { kind: number; ph: number; t: number }

export function create(ctx: SceneContext) {
  return new CyberCafe(ctx)
}

/** An internet café in 2003, after closing: rows of CRTs still glowing, a slow ceiling fan, the price board. */
class CyberCafe extends PixelScene {
  screens: Screen[] = []
  fan = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.screens = Array.from({ length: 16 }, () => ({ kind: this.r.int(0, 5), ph: this.r() * TAU, t: this.r.range(4, 12) }))
  }
  palette() {
    return PX.console16
  }
  dither() {
    return 0.4
  }
  step(dt: number) {
    this.fan += dt * 1.6
    for (const s of this.screens) {
      s.t -= dt
      if (s.t <= 0) {
        s.kind = this.r.int(0, 5)
        s.t = this.r.range(5, 14)
      }
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0d0b14'
    c.fillRect(0, 0, w, h)
    // back wall with posters and the price board
    c.fillStyle = '#2b2236'
    c.fillRect(0, 0, w, h * 0.55)
    const fs = Math.max(8, Math.min(7 * u, w / 40))
    // price board
    const bx = w * 0.06
    const by = h * 0.08
    const bw = Math.min(w * 0.3, fs * 15)
    c.fillStyle = '#0d0b14'
    c.fillRect(bx, by, bw, fs * 6.6)
    font(c, fs * 1.1, VT)
    c.fillStyle = '#f7e07a'
    c.textBaseline = 'top'
    ;['CYBER CAFE', '1h ....... 2.00', 'print .... 0.10', 'LAN tonight 8pm'].forEach((s, i) => {
      c.fillStyle = i === 0 ? '#e2614f' : '#f7e07a'
      c.fillText(s, bx + fs * 0.6, by + fs * 0.6 + i * fs * 1.45)
    })
    // posters
    const poster = (x: number, y: number, pw: number, col: string, label: string) => {
      c.fillStyle = col
      c.fillRect(x, y, pw, pw * 1.35)
      c.fillStyle = '#0d0b14'
      c.fillRect(x + pw * 0.1, y + pw * 0.1, pw * 0.8, pw * 0.8)
      c.fillStyle = col
      c.beginPath()
      c.arc(x + pw / 2, y + pw * 0.5, pw * 0.25, 0, TAU)
      c.fill()
      font(c, pw * 0.16, VT)
      c.fillStyle = '#0d0b14'
      c.fillText(label, x + pw * 0.1, y + pw * 0.98)
    }
    const pw = Math.min(fs * 4.5, h * 0.14)
    poster(w * 0.55, h * 0.07, pw, '#5ab4e5', 'LAN 2003')
    poster(w * 0.55 + pw * 1.4, h * 0.1, pw, '#9fd45a', 'FRAG FEST')
    poster(w * 0.55 + pw * 2.8, h * 0.06, pw, '#f3a64b', 'NO FOOD')
    // ceiling fan
    const fx = w * 0.5
    const fy = h * 0.05
    c.fillStyle = '#55305a'
    c.fillRect(fx - 0.5 * u, 0, u, fy)
    c.fillStyle = '#8b8598'
    for (let k = 0; k < 4; k++) {
      const a = this.fan + (k * TAU) / 4
      c.save()
      c.translate(fx, fy)
      c.scale(1, 0.25)
      c.rotate(a)
      c.fillRect(0, -2.5 * u, 30 * u, 5 * u)
      c.restore()
    }
    c.fillStyle = '#55305a'
    c.beginPath()
    c.ellipse(fx, fy, 4 * u, 2 * u, 0, 0, TAU)
    c.fill()
    // floor
    c.fillStyle = '#1e3d5c'
    c.fillRect(0, h * 0.55, w, h * 0.45)
    c.strokeStyle = '#25604f'
    c.globalAlpha = 0.25
    for (let i = -10; i < 20; i++) {
      c.beginPath()
      c.moveTo(w / 2 + i * 20 * u, h * 0.55)
      c.lineTo(w / 2 + i * 60 * u, h)
      c.stroke()
    }
    c.globalAlpha = 1
    // two rows of desks: back row smaller
    const rows = [
      { y: h * 0.62, s: 0.7, n: Math.max(3, Math.floor(w / (u * 46))) },
      { y: h * 0.9, s: 1, n: Math.max(2, Math.floor(w / (u * 64))) },
    ]
    let si = 0
    for (const row of rows) {
      const S = u * row.s
      const deskW = w / row.n
      // desk top
      c.fillStyle = '#55305a'
      c.fillRect(0, row.y - 2 * S, w, 4 * S)
      c.fillStyle = '#2b2236'
      c.fillRect(0, row.y + 2 * S, w, 18 * S)
      for (let i = 0; i < row.n; i++) {
        const cx = deskW * (i + 0.5)
        this.crt(cx, row.y - 2 * S, S, this.screens[si++ % this.screens.length], fs)
      }
    }
    c.textBaseline = 'alphabetic'
  }
  crt(x: number, base: number, S: number, sc: Screen, fs: number) {
    const c = this.c
    const mw = 36 * S
    const mh = 30 * S
    const top = base - mh - 6 * S
    // stand and keyboard
    c.fillStyle = '#c9c3b0'
    c.fillRect(x - 6 * S, base - 6 * S, 12 * S, 6 * S)
    c.fillRect(x - 14 * S, base - 1 * S, 28 * S, 2 * S)
    // casing
    c.fillStyle = '#ddd6c2'
    c.fillRect(x - mw / 2, top, mw, mh)
    c.fillStyle = '#9fa39b'
    c.fillRect(x - mw / 2, top + mh - 3 * S, mw, 3 * S)
    // screen
    const sx = x - mw / 2 + 3 * S
    const sy = top + 3 * S
    const sw = mw - 6 * S
    const sh = mh - 9 * S
    const cols = ['#1e3d5c', '#0d0b14', '#f2f0e6', '#25604f', '#2f6fb0', '#a23e5c']
    c.fillStyle = cols[sc.kind]
    c.fillRect(sx, sy, sw, sh)
    glow(c, x, sy + sh / 2, mw * 0.9, ['rgba(90,180,229,0.18)', 'rgba(159,212,90,0.15)', 'rgba(242,240,230,0.2)', 'rgba(62,154,78,0.18)', 'rgba(47,111,176,0.2)', 'rgba(226,97,79,0.18)'][sc.kind])
    c.save()
    c.beginPath()
    c.rect(sx, sy, sw, sh)
    c.clip()
    const t = this.t + sc.ph
    if (sc.kind === 0) {
      // desktop with a bouncing window
      c.fillStyle = '#b6e3f0'
      c.fillRect(sx + (Math.sin(t) * 0.2 + 0.2) * sw, sy + sh * 0.2, sw * 0.5, sh * 0.5)
      c.fillStyle = '#2f6fb0'
      c.fillRect(sx + (Math.sin(t) * 0.2 + 0.2) * sw, sy + sh * 0.2, sw * 0.5, sh * 0.1)
    } else if (sc.kind === 1) {
      // 3D maze screensaver feel: receding frames
      c.strokeStyle = '#9fd45a'
      c.lineWidth = Math.max(1, 0.4 * S)
      for (let k = 0; k < 5; k++) {
        const z = ((t * 0.5 + k / 5) % 1)
        const f = 1 - z
        c.strokeRect(sx + (sw * (1 - f)) / 2, sy + (sh * (1 - f)) / 2, sw * f, sh * f)
      }
    } else if (sc.kind === 2) {
      // chat window
      c.fillStyle = '#0d0b14'
      for (let k = 0; k < 5; k++) c.fillRect(sx + 2 * S, sy + 2 * S + k * 3.5 * S, (sw - 4 * S) * (0.3 + ((k * 37 + Math.floor(t)) % 7) / 10), 1.4 * S)
    } else if (sc.kind === 3) {
      // a shooter, crosshair and blocky corridor
      c.fillStyle = '#3e9a4e'
      c.fillRect(sx, sy + sh * 0.6, sw, sh * 0.4)
      c.fillStyle = '#9fd45a'
      c.fillRect(sx + sw * 0.5 - 0.3 * S, sy + sh * 0.4, 0.6 * S, 3 * S)
      c.fillRect(sx + sw * 0.5 - 1.5 * S, sy + sh * 0.4 + 1.2 * S, 3 * S, 0.6 * S)
      c.fillStyle = '#a23e5c'
      c.fillRect(sx + sw * (0.3 + Math.sin(t * 2) * 0.2), sy + sh * 0.4, 3 * S, 5 * S)
    } else if (sc.kind === 4) {
      // starfield
      c.fillStyle = '#f2f0e6'
      for (let k = 0; k < 14; k++) {
        const z = ((t * 0.4 + k * 0.13) % 1)
        const a = k * 2.4
        c.fillRect(x + Math.cos(a) * z * sw * 0.6, sy + sh / 2 + Math.sin(a) * z * sh * 0.6, Math.max(1, z * 1.5 * S), Math.max(1, z * 1.5 * S))
      }
    } else {
      // "game over" text blinking
      font(c, Math.max(6, sh * 0.25), VT)
      c.fillStyle = Math.sin(t * 4) > 0 ? '#f7e07a' : '#f2f0e6'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('INSERT COIN', x, sy + sh / 2)
      c.textAlign = 'left'
    }
    // scanlines
    c.fillStyle = 'rgba(0,0,0,0.18)'
    for (let yy = sy; yy < sy + sh; yy += Math.max(2, 1.2 * S)) c.fillRect(sx, yy, sw, Math.max(1, 0.4 * S))
    c.restore()
    // power LED
    c.fillStyle = '#9fd45a'
    c.fillRect(x + mw / 2 - 5 * S, top + mh - 2 * S, 1.2 * S, 1 * S)
    void fs
    void MONO
  }
}
