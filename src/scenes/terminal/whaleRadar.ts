import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, TOKENS, font, glow } from '../kit'

type Blip = { a: number; d: number; size: number; lit: number; id: string; drift: number; tok: string; amt: number }

export function create(ctx: SceneContext) {
  return new WhaleRadar(ctx)
}

/** A phosphor radar tracking fictional whale wallets. Every sweep lights them up and logs their moves. */
class WhaleRadar extends PixelScene {
  blips: Blip[] = []
  log: string[] = []
  sweep = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
    for (let i = 0; i < 6; i++) this.log.push(this.line(this.blips[i % this.blips.length]))
  }
  palette() {
    return PX.phosphor
  }
  dither() {
    return 0.4
  }
  configure() {
    const n = Math.round(14 * this.num('whales') * this.density)
    while (this.blips.length < n) this.blips.push(this.blip())
    this.blips.length = Math.max(1, n)
  }
  blip(): Blip {
    const r = this.r
    let id = '0x'
    for (let i = 0; i < 4; i++) id += '0123456789abcdef'[r.int(0, 15)]
    id += '…'
    for (let i = 0; i < 2; i++) id += '0123456789abcdef'[r.int(0, 15)]
    return { a: r() * TAU, d: r.range(0.18, 0.95), size: r.range(0.5, 1.6), lit: 0, id, drift: r.range(-0.05, 0.05), tok: r.pick(TOKENS), amt: Math.round(r.range(2, 900)) * 1000 }
  }
  line(b: Blip) {
    const verbs = ['moved', 'bought', 'sold', 'bridged', 'staked', 'aped into']
    return `${b.id} ${this.r.pick(verbs)} ${b.amt.toLocaleString('en-US')} ${b.tok}`
  }
  step(dt: number) {
    const sp = this.num('speed')
    const prev = this.sweep
    this.sweep = (this.sweep + dt * sp * 0.9) % TAU
    for (const b of this.blips) {
      b.a = (b.a + b.drift * dt + TAU) % TAU
      b.lit = Math.max(0, b.lit - dt * 0.22)
      const crossed = prev <= this.sweep ? b.a > prev && b.a <= this.sweep : b.a > prev || b.a <= this.sweep
      if (crossed) {
        b.lit = 1
        if (this.r.chance(0.35)) {
          b.amt = Math.round(this.r.range(2, 900)) * 1000
          this.log.push(this.line(b))
          if (this.log.length > 14) this.log.shift()
          if (b.size > 1.3) this.emit({ type: 'blip' })
        }
      }
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#020a04'
    c.fillRect(0, 0, w, h)
    const portrait = h > w * 1.1
    const R = portrait ? Math.min(w * 0.42, h * 0.3) : Math.min(h * 0.42, w * 0.3)
    const cx = portrait ? w / 2 : w * 0.36
    const cy = portrait ? h * 0.34 : h / 2
    glow(c, cx, cy, R * 1.3, 'rgba(76,255,122,0.10)')
    c.fillStyle = '#041208'
    c.beginPath()
    c.arc(cx, cy, R, 0, TAU)
    c.fill()
    // rings and crosshair
    c.strokeStyle = '#1f8a3c'
    c.lineWidth = Math.max(1, 0.5 * u)
    for (let k = 1; k <= 4; k++) {
      c.globalAlpha = k === 4 ? 1 : 0.5
      c.beginPath()
      c.arc(cx, cy, (R * k) / 4, 0, TAU)
      c.stroke()
    }
    c.beginPath()
    c.moveTo(cx - R, cy)
    c.lineTo(cx + R, cy)
    c.moveTo(cx, cy - R)
    c.lineTo(cx, cy + R)
    c.stroke()
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU
      const l = i % 6 ? 0.03 : 0.06
      c.beginPath()
      c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
      c.lineTo(cx + Math.cos(a) * R * (1 - l), cy + Math.sin(a) * R * (1 - l))
      c.stroke()
    }
    c.globalAlpha = 1
    // sweep wedge with a fading tail
    const steps = 24
    for (let i = 0; i < steps; i++) {
      const a0 = this.sweep - (i + 1) * 0.04
      c.fillStyle = `rgba(76,255,122,${0.22 * (1 - i / steps)})`
      c.beginPath()
      c.moveTo(cx, cy)
      c.arc(cx, cy, R, a0, a0 + 0.045)
      c.fill()
    }
    c.strokeStyle = '#c8ffd6'
    c.lineWidth = Math.max(1, 0.8 * u)
    c.beginPath()
    c.moveTo(cx, cy)
    c.lineTo(cx + Math.cos(this.sweep) * R, cy + Math.sin(this.sweep) * R)
    c.stroke()
    // blips
    font(c, Math.max(7, R * 0.055), MONO, 500)
    for (const b of this.blips) {
      if (b.lit <= 0.02) continue
      const x = cx + Math.cos(b.a) * b.d * R
      const y = cy + Math.sin(b.a) * b.d * R
      const s = b.size * R * 0.035
      glow(c, x, y, s * 4, 'rgba(76,255,122,0.6)', b.lit)
      c.globalAlpha = b.lit
      c.fillStyle = '#c8ffd6'
      // a tiny whale: body, tail, spout
      c.beginPath()
      c.ellipse(x, y, s * 1.4, s * 0.8, 0, 0, TAU)
      c.fill()
      c.beginPath()
      c.moveTo(x - s * 1.2, y)
      c.lineTo(x - s * 2.3, y - s * 0.9)
      c.lineTo(x - s * 2.1, y + s * 0.5)
      c.fill()
      if (b.size > 1.2) c.fillRect(x + s * 0.3, y - s * 1.9, Math.max(1, s * 0.25), s)
      if (b.size > 1) {
        c.fillStyle = '#4cff7a'
        c.fillText(b.id, x + s * 2, y - s * 1.5)
      }
      c.globalAlpha = 1
    }
    // side panel log
    const lx = portrait ? w * 0.08 : cx + R * 1.25
    const ly = portrait ? cy + R * 1.25 : cy - R
    const lw = portrait ? w * 0.84 : w - lx - w * 0.04
    const fs = Math.max(8, Math.min(8 * u, lw / 30))
    font(c, fs, MONO, 600)
    c.fillStyle = '#4cff7a'
    c.textBaseline = 'top'
    c.fillText('WHALE WATCH', lx, ly)
    c.fillStyle = '#1f8a3c'
    c.fillRect(lx, ly + fs * 1.6, lw, Math.max(1, 0.4 * u))
    font(c, fs, MONO, 400)
    const room = Math.floor(((portrait ? h - ly : R * 2) - fs * 3) / (fs * 1.6))
    const shown = this.log.slice(-room)
    shown.forEach((s, i) => {
      c.globalAlpha = 0.35 + 0.65 * ((i + 1) / shown.length)
      c.fillStyle = i === shown.length - 1 ? '#c8ffd6' : '#4cff7a'
      let t = s
      while (t.length > 4 && c.measureText(t).width > lw) t = t.slice(0, -2)
      c.fillText(t, lx, ly + fs * 2.4 + i * fs * 1.6)
    })
    c.globalAlpha = 1
    c.textBaseline = 'alphabetic'
  }
}
