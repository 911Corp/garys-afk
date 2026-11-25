import { PixelScene } from '../../engine/base'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

const RAMPS: Record<string, string[]> = {
  violet: ['#05030c', '#120a24', '#2a1248', '#4b1a6e', '#7a2a8c', '#b4448e', '#ff7ab6', '#ffd0e6', '#2a3a8a', '#4a7ad0', '#ffffff'],
  emerald: ['#020807', '#06201a', '#0b3a2c', '#12553c', '#1f7a4a', '#3aa35a', '#7ad07a', '#d8f5c0', '#0e3a5a', '#2f7fb0', '#ffffff'],
  fire: ['#080303', '#1f0806', '#3a0f08', '#64180a', '#9a2a0c', '#d24a12', '#ff8a2a', '#ffd38a', '#3a1450', '#7a2a8a', '#ffffff'],
}

export function create(ctx: SceneContext) {
  return new Nebula(ctx)
}

/**
 * Domain-warped noise clouds computed on the CPU at quarter resolution, a quarter of the rows per
 * frame (interlaced), so the cost stays low and the gas drifts slowly.
 */
class Nebula extends PixelScene {
  noise = createNoise(5)
  nw = 0
  nh = 0
  field = new Float32Array(0)
  hue = new Float32Array(0)
  row = 0
  img: ImageData | null = null
  tmp: HTMLCanvasElement | null = null
  stars: { x: number; y: number; b: number; big: boolean }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return RAMPS[this.str('palette')] ?? RAMPS.violet
  }
  dither() {
    return 0.7
  }
  layout() {
    this.nw = Math.ceil(this.w / 2)
    this.nh = Math.ceil(this.h / 2)
    this.field = new Float32Array(this.nw * this.nh)
    this.hue = new Float32Array(this.nw * this.nh)
    this.img = new ImageData(this.nw, this.nh)
    this.tmp = document.createElement('canvas')
    this.tmp.width = this.nw
    this.tmp.height = this.nh
    for (let y = 0; y < this.nh; y++) this.computeRow(y)
    this.configure()
  }
  configure() {
    this.stars = Array.from({ length: Math.round(this.num('stars') * 160 * this.density) }, () => ({ x: this.r() * this.w, y: this.r() * this.h, b: this.r(), big: this.r.chance(0.04) }))
  }
  computeRow(y: number) {
    const n = this.noise
    const t = this.t * 0.02 * this.num('evolve')
    const s = 1.3 / Math.min(this.nw, this.nh)
    const dens = this.num('density')
    for (let x = 0; x < this.nw; x++) {
      const px = x * s
      const py = y * s
      const wx = n.fbm2(px + t, py - t * 0.5, 3)
      const wy = n.fbm2(px + 5.2 - t * 0.3, py + 1.3, 3)
      const v = n.fbm2(px + wx * 1.2, py + wy * 1.2 + t * 0.4, 5)
      // a broad mask keeps open dark space between the clouds
      const mask = n.fbm2(px * 0.35 - 20, py * 0.35 + t * 0.2, 2) + 0.15
      const i = y * this.nw + x
      const raw = Math.max(0, v + 0.05) * 2.2 * Math.max(0, mask * 2.2)
      this.field[i] = Math.min(1, raw * raw * 2.4 * dens)
      this.hue[i] = n.noise2(px * 0.6 + 40, py * 0.6 - t)
    }
  }
  step() {
    const phase = this.row % 4
    for (let y = phase; y < this.nh; y += 4) this.computeRow(y)
    this.row++
  }
  draw() {
    const c = this.c
    const pal = this.palette()
    const toRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
    const ramp = pal.slice(0, 8).map(toRgb)
    const alt = [toRgb(pal[8]), toRgb(pal[9])]
    const d = this.img!.data
    for (let i = 0; i < this.field.length; i++) {
      const v = this.field[i]
      const f = v * (ramp.length - 1)
      const a = Math.floor(f)
      const b = Math.min(ramp.length - 1, a + 1)
      const k = f - a
      let r = ramp[a][0] + (ramp[b][0] - ramp[a][0]) * k
      let g = ramp[a][1] + (ramp[b][1] - ramp[a][1]) * k
      let bl = ramp[a][2] + (ramp[b][2] - ramp[a][2]) * k
      // a second gas tinted towards the alternate colours
      const hmix = Math.max(0, this.hue[i]) * v * 0.55
      const ac = alt[v > 0.5 ? 1 : 0]
      r += (ac[0] - r) * hmix
      g += (ac[1] - g) * hmix
      bl += (ac[2] - bl) * hmix
      d[i * 4] = r
      d[i * 4 + 1] = g
      d[i * 4 + 2] = bl
      d[i * 4 + 3] = 255
    }
    this.tmp!.getContext('2d')!.putImageData(this.img!, 0, 0)
    c.drawImage(this.tmp!, 0, 0, this.nw * 2, this.nh * 2)
    for (const s of this.stars) {
      const tw = Math.sin(this.t * 2 + s.b * 40) > -0.6
      c.fillStyle = tw ? '#ffffff' : pal[7]
      c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1)
      if (s.big) {
        c.fillStyle = pal[7]
        const l = Math.round(2 + 2 * this.u)
        c.fillRect(Math.round(s.x) - l, Math.round(s.y), l * 2 + 1, 1)
        c.fillRect(Math.round(s.x), Math.round(s.y) - l, 1, l * 2 + 1)
      }
    }
  }
}
