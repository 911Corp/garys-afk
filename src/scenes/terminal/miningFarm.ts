import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, font, glow, rr } from '../kit'

type Rig = { fans: number; speed: number; led: number; temp: number }

export function create(ctx: SceneContext) {
  return new MiningFarm(ctx)
}

/** A mining farm at night: racks of rigs, fans spinning, LEDs blinking, and a green wave when a block is found. */
class MiningFarm extends PixelScene {
  rigs: Rig[] = []
  spin = 0
  hash = 412.7
  block = 848213
  found = 0
  wave = -1
  nextBlock = 12
  constructor(ctx: SceneContext) {
    super(ctx)
    this.rigs = Array.from({ length: 60 }, () => ({ fans: this.r.int(2, 3), speed: this.r.range(0.8, 1.2), led: this.r(), temp: this.r.range(58, 74) }))
  }
  palette() {
    return PX.degen
  }
  dither() {
    return 0.35
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.spin += dt * 12 * sp
    this.hash += (this.r() - 0.5) * dt * 6
    this.hash = Math.max(380, Math.min(450, this.hash))
    for (const r of this.rigs) {
      r.led = (r.led + dt * r.speed * 3) % 1
      r.temp += (this.r() - 0.5) * dt * 2
    }
    this.nextBlock -= dt * sp
    if (this.nextBlock <= 0) {
      this.nextBlock = this.r.range(10, 20)
      this.block++
      this.found = 3
      this.wave = 0
      this.emit({ type: 'chime' })
    }
    this.found = Math.max(0, this.found - dt)
    if (this.wave >= 0) {
      this.wave += dt * 1.5
      if (this.wave > 2) this.wave = -1
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#050608'
    c.fillRect(0, 0, w, h)
    // floor with cable trays
    const floor = h * 0.86
    c.fillStyle = '#0d1117'
    c.fillRect(0, floor, w, h - floor)
    c.strokeStyle = '#161b26'
    c.lineWidth = Math.max(1, u)
    for (let x = 0; x < w; x += 22 * u) {
      c.beginPath()
      c.moveTo(x, floor)
      c.lineTo(x - 30 * u, h)
      c.stroke()
    }
    // racks
    const portrait = h > w
    const cols = portrait ? 2 : Math.max(3, Math.min(5, Math.floor(w / (u * 70))))
    const rows = portrait ? 7 : 5
    const rackW = (w * 0.9) / cols
    const top = h * 0.14
    const rackH = floor - top - 4 * u
    const rigH = rackH / rows
    let k = 0
    for (let ci = 0; ci < cols; ci++) {
      const rx = w * 0.05 + ci * rackW + rackW * 0.06
      const rw = rackW * 0.88
      c.fillStyle = '#161b26'
      rr(c, rx - 3 * u, top - 3 * u, rw + 6 * u, rackH + 6 * u, 2 * u)
      c.fill()
      for (let ri = 0; ri < rows; ri++) {
        const rig = this.rigs[k++ % this.rigs.length]
        const y = top + ri * rigH
        this.rig(rig, rx, y + rigH * 0.08, rw, rigH * 0.84, ci + ri * 0.4)
      }
      // rack feet
      c.fillStyle = '#232c3d'
      c.fillRect(rx, top + rackH + 3 * u, 4 * u, floor - top - rackH - 3 * u)
      c.fillRect(rx + rw - 4 * u, top + rackH + 3 * u, 4 * u, floor - top - rackH - 3 * u)
    }
    // HUD
    const fs = Math.max(9, Math.min(6 * u, w / 40))
    font(c, fs, MONO, 600)
    c.textBaseline = 'middle'
    c.fillStyle = '#3ef07f'
    c.fillText(`HASHRATE ${this.hash.toFixed(1)} MH/s`, fs, top * 0.35)
    c.fillStyle = '#6b7a99'
    c.fillText(`BLOCK #${this.block}`, fs, top * 0.7)
    c.textAlign = 'right'
    c.fillStyle = '#ffc83d'
    c.fillText(`POWER ${(this.hash * 2.31).toFixed(0)} W`, w - fs, top * 0.35)
    c.textAlign = 'left'
    if (this.found > 0) {
      const a = Math.min(1, this.found)
      c.globalAlpha = a
      font(c, fs * 1.8, MONO, 700)
      c.textAlign = 'center'
      c.fillStyle = '#3ef07f'
      glow(c, w / 2, h * 0.5, w * 0.3, 'rgba(62,240,127,0.25)')
      c.fillText('BLOCK FOUND', w / 2, h * 0.5)
      c.textAlign = 'left'
      c.globalAlpha = 1
    }
    c.textBaseline = 'alphabetic'
  }
  rig(r: Rig, x: number, y: number, w: number, h: number, order: number) {
    const c = this.c
    const u = this.u
    c.fillStyle = '#0d1117'
    rr(c, x, y, w, h, 1.5 * u)
    c.fill()
    // fans
    const fr = Math.min(h * 0.38, (w / (r.fans + 1)) * 0.42)
    for (let f = 0; f < r.fans; f++) {
      const fx = x + (w * (f + 0.7)) / (r.fans + 0.8)
      const fy = y + h / 2
      c.fillStyle = '#05070b'
      c.beginPath()
      c.arc(fx, fy, fr, 0, TAU)
      c.fill()
      c.fillStyle = '#3a4760'
      const a0 = this.spin * r.speed + f
      for (let b = 0; b < 7; b++) {
        const a = a0 + (b * TAU) / 7
        c.beginPath()
        c.ellipse(fx + Math.cos(a) * fr * 0.5, fy + Math.sin(a) * fr * 0.5, fr * 0.45, fr * 0.16, a + 0.5, 0, TAU)
        c.fill()
      }
      c.fillStyle = '#232c3d'
      c.beginPath()
      c.arc(fx, fy, fr * 0.22, 0, TAU)
      c.fill()
      // RGB ring, green when the block wave passes
      const waveOn = this.wave >= 0 && Math.abs(this.wave - order / 6) < 0.25
      c.strokeStyle = waveOn ? '#3ef07f' : `hsl(${(order * 40 + this.t * 30) % 360},80%,55%)`
      c.globalAlpha = waveOn ? 1 : 0.55
      c.lineWidth = Math.max(1, fr * 0.08)
      c.beginPath()
      c.arc(fx, fy, fr * 1.02, 0, TAU)
      c.stroke()
      c.globalAlpha = 1
    }
    // status LEDs and temperature
    c.fillStyle = r.led < 0.5 ? '#3ef07f' : '#0e3b22'
    c.fillRect(x + 3 * u, y + 3 * u, 2 * u, 1.4 * u)
    c.fillStyle = r.temp > 72 ? '#ff4d64' : '#ffc83d'
    c.fillRect(x + 6.5 * u, y + 3 * u, 2 * u, 1.4 * u)
    if (h > 18 * u) {
      font(c, Math.max(7, h * 0.13), MONO, 500)
      c.fillStyle = '#6b7a99'
      c.textBaseline = 'top'
      c.fillText(`${r.temp.toFixed(0)}°C`, x + 3 * u, y + h - Math.max(7, h * 0.13) - 2 * u)
    }
  }
}
