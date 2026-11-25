import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { hexToRgb } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

const PRESETS: Record<string, { f: number; k: number }> = {
  coral: { f: 0.0545, k: 0.062 },
  mitosis: { f: 0.0367, k: 0.0649 },
  worms: { f: 0.078, k: 0.061 },
  maze: { f: 0.029, k: 0.057 },
}
const COLORS: Record<string, [string, string, string]> = {
  ink: ['#0d1117', '#3a4760', '#e6ecf4'],
  coral: ['#0a1830', '#e2614f', '#ffe9a3'],
  mint: ['#04110a', '#1f8f4e', '#c8ffd6'],
  violet: ['#0e0a1c', '#7a3aa8', '#ffd3df'],
}

export function create(ctx: SceneContext) {
  return new ReactionDiffusion(ctx)
}

/** Gray-Scott reaction-diffusion: two chemicals feeding and killing each other grow corals, spots and mazes. */
class ReactionDiffusion extends PixelScene {
  GW = 0
  GH = 0
  A = new Float32Array(0)
  B = new Float32Array(0)
  A2 = new Float32Array(0)
  B2 = new Float32Array(0)
  buf!: HTMLCanvasElement
  bc!: CanvasRenderingContext2D
  img!: ImageData
  drop = 0
  lut = new Uint8Array(256 * 3)
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.3
  }
  configure() {
    this.buildLut()
    if (this.lastPreset !== this.str('preset')) this.layout()
  }
  lastPreset = ''
  buildLut() {
    const C = COLORS[this.str('color')] ?? COLORS.ink
    const cs = C.map(hexToRgb)
    for (let i = 0; i < 256; i++) {
      const t = i / 255
      const [a, b, k] = t < 0.5 ? [cs[0], cs[1], t * 2] : [cs[1], cs[2], (t - 0.5) * 2]
      for (let j = 0; j < 3; j++) this.lut[i * 3 + j] = a[j] + (b[j] - a[j]) * k
    }
  }
  layout() {
    this.lastPreset = this.str('preset')
    const q = this.g.quality === 'high' ? 1.4 : this.g.quality === 'low' ? 0.7 : 1
    const short = Math.round(120 * q)
    const ratio = this.w / this.h
    this.GW = ratio >= 1 ? Math.round(short * ratio) : short
    this.GH = ratio >= 1 ? short : Math.round(short / ratio)
    const n = this.GW * this.GH
    this.A = new Float32Array(n).fill(1)
    this.B = new Float32Array(n)
    this.A2 = new Float32Array(n)
    this.B2 = new Float32Array(n)
    for (let i = 0; i < 14; i++) this.seed()
    this.buf = document.createElement('canvas')
    this.buf.width = this.GW
    this.buf.height = this.GH
    this.bc = this.buf.getContext('2d')!
    this.img = this.bc.createImageData(this.GW, this.GH)
    this.buildLut()
  }
  seed() {
    const cx = this.r.int(5, this.GW - 6)
    const cy = this.r.int(5, this.GH - 6)
    const rad = this.r.int(2, 4)
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad) this.B[(cy + y) * this.GW + cx + x] = 1
  }
  step(dt: number) {
    const P = PRESETS[this.str('preset')] ?? PRESETS.coral
    const { GW, GH } = this
    const iters = Math.max(1, Math.round(10 * this.num('speed') * Math.min(2, dt * 60)))
    let A = this.A
    let B = this.B
    let A2 = this.A2
    let B2 = this.B2
    const dA = 1
    const dB = 0.5
    for (let it = 0; it < iters; it++) {
      for (let y = 0; y < GH; y++) {
        const ym = ((y - 1 + GH) % GH) * GW
        const y0 = y * GW
        const yp = ((y + 1) % GH) * GW
        for (let x = 0; x < GW; x++) {
          const xm = (x - 1 + GW) % GW
          const xp = (x + 1) % GW
          const i = y0 + x
          const a = A[i]
          const b = B[i]
          const lapA = (A[y0 + xm] + A[y0 + xp] + A[ym + x] + A[yp + x]) * 0.2 + (A[ym + xm] + A[ym + xp] + A[yp + xm] + A[yp + xp]) * 0.05 - a
          const lapB = (B[y0 + xm] + B[y0 + xp] + B[ym + x] + B[yp + x]) * 0.2 + (B[ym + xm] + B[ym + xp] + B[yp + xm] + B[yp + xp]) * 0.05 - b
          const abb = a * b * b
          A2[i] = a + dA * lapA - abb + P.f * (1 - a)
          B2[i] = b + dB * lapB + abb - (P.k + P.f) * b
        }
      }
      ;[A, A2] = [A2, A]
      ;[B, B2] = [B2, B]
    }
    this.A = A
    this.B = B
    this.A2 = A2
    this.B2 = B2
    this.drop += dt
    if (this.drop > 6) {
      this.drop = 0
      this.seed()
    }
  }
  draw() {
    const d = this.img.data
    const n = this.GW * this.GH
    for (let i = 0; i < n; i++) {
      const k = 255 - (Math.max(0, Math.min(1, (this.A[i] - this.B[i] - 0.15) * 1.6)) * 255) | 0
      d[i * 4] = this.lut[k * 3]
      d[i * 4 + 1] = this.lut[k * 3 + 1]
      d[i * 4 + 2] = this.lut[k * 3 + 2]
      d[i * 4 + 3] = 255
    }
    this.bc.putImageData(this.img, 0, 0)
    const c = this.c
    c.imageSmoothingEnabled = true
    c.drawImage(this.buf, 0, 0, this.w, this.h)
    c.imageSmoothingEnabled = !this.g.retro
  }
}
