import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, hexToRgb } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

const COLORS: Record<string, { wax: string; liquid: string; light: string }> = {
  orange: { wax: '#ff7a2a', liquid: '#5a1530', light: '#ffbe4f' },
  pink: { wax: '#ff5fa8', liquid: '#2a1450', light: '#ff9ad0' },
  green: { wax: '#7cff6b', liquid: '#0e2a3a', light: '#c8ff9a' },
  blue: { wax: '#4ab8ff', liquid: '#1a0d3a', light: '#9ad8ff' },
}

type Blob = { x: number; y: number; r: number; vy: number; heat: number; ph: number }

export function create(ctx: SceneContext) {
  return new LavaLamp(ctx)
}

/** A lava lamp in a dark room: wax blobs heat up, rise, merge, cool and sink back down. */
class LavaLamp extends PixelScene {
  blobs: Blob[] = []
  field: HTMLCanvasElement
  fc: CanvasRenderingContext2D
  img: ImageData
  FW = 72
  FH = 180
  constructor(ctx: SceneContext) {
    super(ctx)
    this.field = document.createElement('canvas')
    this.field.width = this.FW
    this.field.height = this.FH
    this.fc = this.field.getContext('2d')!
    this.img = this.fc.createImageData(this.FW, this.FH)
    this.configure()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.5
  }
  get C() {
    return COLORS[this.str('color')] ?? COLORS.orange
  }
  configure() {
    const n = Math.max(3, Math.round(6 * this.num('wax')))
    while (this.blobs.length < n)
      this.blobs.push({ x: this.r.range(0.3, 0.7), y: this.r.range(0.2, 0.95), r: this.r.range(0.07, 0.13), vy: 0, heat: this.r(), ph: this.r() * TAU })
    this.blobs.length = n
  }
  step(dt: number) {
    const sp = this.num('speed')
    for (const b of this.blobs) {
      // heat near the bottom, cool near the top
      b.heat += ((b.y > 0.85 ? 1 : b.y < 0.18 ? -1 : 0) * 0.25 - 0.01) * dt * sp
      b.heat = Math.max(0, Math.min(1, b.heat))
      const buoy = (b.heat - 0.5) * 0.09
      b.vy += -buoy * dt * sp
      b.vy *= Math.pow(0.3, dt)
      b.y += b.vy * dt * sp
      b.x = 0.5 + Math.sin(this.t * 0.2 * sp + b.ph) * 0.17 * (1 - Math.abs(b.y - 0.5))
      if (b.y > 0.97) {
        b.y = 0.97
        b.vy = 0
      }
      if (b.y < 0.06) {
        b.y = 0.06
        b.vy = 0
      }
    }
    // compute the metaball field into a small image
    const { FW, FH } = this
    const d = this.img.data
    const [wr, wg, wb] = hexToRgb(this.C.wax)
    const [lr, lg, lb] = hexToRgb(this.C.liquid)
    const bs = this.blobs.map((b) => ({ x: b.x * FW, y: b.y * FH, r2: (b.r * FW) ** 2 * 1.2 }))
    for (let y = 0; y < FH; y++) {
      // the pool of wax at the bottom of the lamp
      const pool = y > FH * 0.93 ? (y - FH * 0.93) / (FH * 0.07) * 2.5 : 0
      for (let x = 0; x < FW; x++) {
        let f = pool
        for (const b of bs) {
          const dx = x - b.x
          const dy = (y - b.y) * 0.8
          f += b.r2 / (dx * dx + dy * dy + 1)
        }
        const k = Math.max(0, Math.min(1, (f - 0.9) * 3))
        const shade = 0.75 + 0.25 * (1 - y / FH)
        const i = (y * FW + x) * 4
        d[i] = lr + (wr * shade - lr) * k
        d[i + 1] = lg + (wg * shade - lg) * k
        d[i + 2] = lb + (wb * shade - lb) * k
        d[i + 3] = 255
      }
    }
    this.fc.putImageData(this.img, 0, 0)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const C = this.C
    c.fillStyle = '#07040f'
    c.fillRect(0, 0, w, h)
    const lh = Math.min(h * 0.86, 165 * u)
    const cx = w / 2
    const top = (h - lh) / 2
    const capH = lh * 0.12
    const glassH = lh * 0.56
    const baseH = lh * 0.32
    const gTopW = lh * 0.11
    const gMidW = lh * 0.2
    const gBotW = lh * 0.14
    glow(c, cx, top + capH + glassH * 0.55, lh * 0.9, C.light + '55')
    // shelf
    c.fillStyle = '#120a24'
    c.fillRect(0, top + lh - lh * 0.02, w, h)
    c.fillStyle = '#1e1240'
    c.fillRect(0, top + lh - lh * 0.02, w, Math.max(1, u))
    glow(c, cx, top + lh, lh * 0.5, C.light + '44')
    // glass vessel path
    const gy0 = top + capH
    const gy1 = gy0 + glassH
    const vessel = () => {
      c.beginPath()
      c.moveTo(cx - gTopW, gy0)
      c.quadraticCurveTo(cx - gMidW * 1.15, gy0 + glassH * 0.62, cx - gBotW, gy1)
      c.lineTo(cx + gBotW, gy1)
      c.quadraticCurveTo(cx + gMidW * 1.15, gy0 + glassH * 0.62, cx + gTopW, gy0)
      c.closePath()
    }
    c.save()
    vessel()
    c.clip()
    c.imageSmoothingEnabled = true
    c.drawImage(this.field, cx - gMidW * 1.1, gy0, gMidW * 2.2, glassH)
    c.imageSmoothingEnabled = !this.g.retro
    // glass highlight
    c.fillStyle = 'rgba(255,255,255,0.12)'
    c.fillRect(cx - gMidW * 0.7, gy0, gMidW * 0.12, glassH)
    c.restore()
    // cap and base (brushed metal)
    const metal = (y0: number, y1: number, wt: number, wb: number) => {
      const g = c.createLinearGradient(cx - wb, 0, cx + wb, 0)
      g.addColorStop(0, '#2c1b5e')
      g.addColorStop(0.35, '#a68cff')
      g.addColorStop(0.5, '#e6e0ff')
      g.addColorStop(1, '#1e1240')
      c.fillStyle = g
      c.beginPath()
      c.moveTo(cx - wt, y0)
      c.lineTo(cx + wt, y0)
      c.lineTo(cx + wb, y1)
      c.lineTo(cx - wb, y1)
      c.fill()
    }
    metal(top, gy0, gTopW * 0.55, gTopW)
    metal(gy1, gy1 + baseH * 0.45, gBotW, gBotW * 0.75)
    metal(gy1 + baseH * 0.45, top + lh - lh * 0.02, gBotW * 0.75, gMidW * 1.05)
  }
}
