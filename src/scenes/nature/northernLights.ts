import { PixelScene } from '../../engine/base'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

type RGB = [number, number, number]
const SETS: Record<string, { low: RGB; high: RGB; pal: string[] }> = {
  green: { low: [60, 255, 140], high: [40, 160, 200], pal: ['#02040a', '#06101e', '#0c1c30', '#14304a', '#1e5a5a', '#2a9a7a', '#3cff8c', '#b4ffd0', '#28a0c8', '#e6f0ff', '#101820', '#2a3440'] },
  violet: { low: [80, 255, 160], high: [190, 70, 220], pal: ['#02040a', '#06101e', '#0c1c30', '#1a1440', '#4a2a7a', '#be46dc', '#50ffa0', '#c8ffe0', '#2a9a7a', '#e6f0ff', '#101820', '#2a3440'] },
  pink: { low: [255, 90, 160], high: [120, 80, 255], pal: ['#02040a', '#06101e', '#120c24', '#2a1440', '#5a2a7a', '#ff5aa0', '#ffc0dc', '#7850ff', '#c8b4ff', '#e6f0ff', '#101820', '#2a3440'] },
}

export function create(ctx: SceneContext) {
  return new NorthernLights(ctx)
}

/** Curtains of light rippling over snowy peaks, mirrored in a still lake. */
class NorthernLights extends PixelScene {
  noise = createNoise(23)
  img: ImageData | null = null
  stars: { x: number; y: number; b: number }[] = []
  ridge: number[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return (SETS[this.str('colors')] ?? SETS.green).pal
  }
  dither() {
    return 0.6
  }
  get lake() {
    return Math.round(this.h * 0.72)
  }
  layout() {
    this.img = new ImageData(this.w, this.h)
    this.stars = Array.from({ length: Math.round((this.w * this.h) / 160) }, () => ({ x: this.r() * this.w, y: this.r() * this.lake, b: this.r() }))
    this.ridge = []
    for (let x = 0; x < this.w; x++) {
      const n = this.noise.fbm2(x * 0.012 / this.u, 7, 4)
      this.ridge.push(this.lake - (8 + n * 22 + Math.abs(this.noise.noise2(x * 0.03 / this.u, 3)) * 12) * this.u)
    }
  }
  step() {}
  draw() {
    const c = this.c
    const { w, h, t } = this
    const set = SETS[this.str('colors')] ?? SETS.green
    const inten = this.num('intensity') * this.g.intensity
    const act = this.num('activity')
    const lake = this.lake
    const d = this.img!.data
    const n = this.noise
    // sky with the aurora, computed per pixel down to the lake line
    for (let x = 0; x < w; x++) {
      const fx = x / w
      // curtain base wanders slowly; folds come from a second noise
      const base = h * (0.36 + n.noise2(fx * 1.6, t * 0.05 * act) * 0.1 + n.noise2(fx * 4, t * 0.12 * act) * 0.04)
      const rn = 0.5 + 0.5 * n.noise2(fx * 46, t * 0.4 * act)
      const rays = 0.25 + rn * rn * 1.4
      const strength = Math.max(0.15, n.noise2(fx * 2.2 + 10, t * 0.07 * act) * 0.6 + 0.75) * rays * inten
      const height = h * (0.26 + 0.1 * n.noise2(fx * 3 + 5, t * 0.1))
      for (let y = 0; y < lake; y++) {
        const i = (y * w + x) * 4
        const sky = 6 + (y / lake) * 22
        let r = 2 + sky * 0.2
        let g = 4 + sky * 0.4
        let b = 10 + sky
        const above = base - y
        if (above > -6 && above < height) {
          const k = above < 0 ? (above + 6) / 6 : Math.pow(1 - above / height, 1.4)
          const mixTop = Math.min(1, above / height)
          const a = Math.max(0, k * strength)
          r += (set.low[0] * (1 - mixTop) + set.high[0] * mixTop) * a
          g += (set.low[1] * (1 - mixTop) + set.high[1] * mixTop) * a
          b += (set.low[2] * (1 - mixTop) + set.high[2] * mixTop) * a
        }
        d[i] = Math.min(255, r)
        d[i + 1] = Math.min(255, g)
        d[i + 2] = Math.min(255, b)
        d[i + 3] = 255
      }
    }
    // stars on top of the sky only where it is still dark
    for (const s of this.stars) {
      const i = (Math.round(s.y) * w + Math.round(s.x)) * 4
      if (d[i + 1] < 70 && Math.sin(t * 1.5 + s.b * 30) > -0.5) d[i] = d[i + 1] = d[i + 2] = s.b > 0.7 ? 230 : 140
    }
    // mountains in front of the sky
    for (let x = 0; x < w; x++) {
      for (let y = Math.max(0, Math.round(this.ridge[x])); y < lake; y++) {
        const i = (y * w + x) * 4
        const snow = y - this.ridge[x] < 1.5 * this.u
        d[i] = snow ? 170 : 30
        d[i + 1] = snow ? 190 : 42
        d[i + 2] = snow ? 210 : 58
      }
    }
    // the lake mirrors everything above it, with a gentle ripple
    const refl = this.bool('reflection')
    for (let y = lake; y < h; y++) {
      const src = lake - (y - lake) - 1
      const off = Math.round(Math.sin(y * 0.6 + t * 1.5) * (y - lake) * 0.04)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        if (!refl || src < 0) {
          d[i] = 6
          d[i + 1] = 10
          d[i + 2] = 20
          continue
        }
        const sx = Math.max(0, Math.min(w - 1, x + off))
        const j = (src * w + sx) * 4
        d[i] = d[j] * 0.55
        d[i + 1] = d[j + 1] * 0.55
        d[i + 2] = d[j + 2] * 0.6
      }
    }
    c.putImageData(this.img!, 0, 0)
    // shoreline
    c.fillStyle = '#101820'
    c.fillRect(0, lake, w, Math.max(1, Math.round(this.u)))
  }
}
