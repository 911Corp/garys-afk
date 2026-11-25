import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

type RGB = [number, number, number]
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

const LIGHT: Record<string, { sky: [string, string]; deep: string; mid: string; crest: string; sun: string; glint: string; night?: boolean }> = {
  day: { sky: ['#53bfcc', '#e4fbf6'], deep: '#0a3d59', mid: '#177896', crest: '#53bfcc', sun: '#ffffff', glint: '#e4fbf6' },
  sunset: { sky: ['#4a5a7a', '#e9a35a'], deep: '#03111a', mid: '#26324a', crest: '#4a5a7a', sun: '#f4d58a', glint: '#f4d58a' },
  night: { sky: ['#03111a', '#0a3d59'], deep: '#03111a', mid: '#062538', crest: '#0f5878', sun: '#e4fbf6', glint: '#93e0e0', night: true },
}

export function create(ctx: SceneContext) {
  return new OceanWaves(ctx)
}

/**
 * Open sea seen from the beach. Every pixel of water samples a sum of travelling waves in
 * perspective; the slope picks the shade, the sun leaves a path of glints, and waves break on the sand.
 */
class OceanWaves extends PixelScene {
  img: ImageData | null = null
  stars: { x: number; y: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.ocean16
  }
  dither() {
    return 0.5
  }
  layout() {
    this.img = new ImageData(this.w, this.h)
    this.stars = Array.from({ length: 60 }, () => ({ x: this.r() * this.w, y: this.r() * this.h * 0.4 }))
  }
  step() {}
  draw() {
    const c = this.c
    const { w, h, u, t } = this
    const L = LIGHT[this.str('light')] ?? LIGHT.day
    const horizon = Math.round(h * 0.42)
    const shore = Math.round(h * 0.86)
    const swell = this.num('swell')
    const wind = this.num('wind')
    const deep = hex(L.deep)
    const mid = hex(L.mid)
    const crest = hex(L.crest)
    const glint = hex(L.glint)
    const s0 = hex(L.sky[0])
    const s1 = hex(L.sky[1])
    const d = this.img!.data
    const sunX = w * 0.62
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        let col: RGB
        if (y < horizon) {
          const k = y / horizon
          col = [s0[0] + (s1[0] - s0[0]) * k, s0[1] + (s1[1] - s0[1]) * k, s0[2] + (s1[2] - s0[2]) * k]
        } else if (y < shore) {
          // perspective: z grows towards the horizon
          const z = 1 / ((y - horizon + 1) / (shore - horizon))
          const wx = (x - w / 2) * z * 0.02
          const wz = z * 1.2
          const hgt =
            Math.sin(wz * 2.0 - t * 1.1 * (0.6 + swell * 0.4)) * swell +
            Math.sin(wz * 3.3 + wx * 1.7 - t * 1.6) * 0.5 * wind +
            Math.sin(wx * 4.1 - wz * 5.2 - t * 2.3) * 0.25 * wind
          const slope = Math.cos(wz * 2.0 - t * 1.1 * (0.6 + swell * 0.4)) * swell + Math.cos(wz * 3.3 + wx * 1.7 - t * 1.6) * 0.4 * wind
          const far = Math.min(1, (z - 1) / 14)
          const k = Math.max(0, Math.min(1, 0.45 + slope * 0.3 + hgt * 0.12))
          const base: RGB = [mid[0] + (crest[0] - mid[0]) * k, mid[1] + (crest[1] - mid[1]) * k, mid[2] + (crest[2] - mid[2]) * k]
          col = [base[0] + (deep[0] - base[0]) * far * 0.6, base[1] + (deep[1] - base[1]) * far * 0.6, base[2] + (deep[2] - base[2]) * far * 0.6]
          // sun path: glints scattered in a cone below the sun
          const dx = Math.abs(x - sunX) / (w * (0.04 + (1 - far) * 0.12))
          if (dx < 1 && slope > 0.5 - (1 - dx) * 0.7 && (((x * 73856093) ^ (y * 19349663) ^ Math.floor(t * 5 + x * 0.3)) & 7) < 2) col = glint
        } else {
          col = L.night ? [38, 50, 74] : [244, 213, 138]
        }
        d[i] = col[0]
        d[i + 1] = col[1]
        d[i + 2] = col[2]
        d[i + 3] = 255
      }
    }
    c.putImageData(this.img!, 0, 0)
    if (L.night) {
      c.fillStyle = '#e4fbf6'
      for (const s of this.stars) if (s.y < horizon - 4) c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1)
    }
    // sun or moon
    const sunY = horizon - (this.str('light') === 'sunset' ? 6 : 34) * u
    c.fillStyle = L.sun
    c.beginPath()
    c.arc(sunX, sunY, (this.str('light') === 'sunset' ? 14 : 9) * u, 0, Math.PI * 2)
    c.fill()
    if (this.str('light') === 'sunset') {
      c.fillStyle = L.sky[1]
      c.fillRect(0, horizon - 1, w, 1)
    }
    // breaking waves on the sand: a foam line that rushes up and draws back
    const phase = (t * 0.25 * (0.5 + swell * 0.5)) % 1
    const reach = Math.sin(phase * Math.PI)
    const edge = shore + reach * (h - shore) * 0.7
    c.fillStyle = L.night ? '#4a5a7a' : '#93e0e0'
    for (let x = 0; x < w; x++) {
      const ey = edge + Math.sin(x * 0.08 + t) * 2 * u + Math.sin(x * 0.21 - t * 0.7) * u
      c.fillRect(x, shore, 1, Math.max(0, ey - shore))
    }
    c.fillStyle = L.night ? '#93e0e0' : '#ffffff'
    for (let x = 0; x < w; x++) {
      const ey = edge + Math.sin(x * 0.08 + t) * 2 * u + Math.sin(x * 0.21 - t * 0.7) * u
      c.fillRect(x, Math.round(ey) - 1, 1, Math.max(1, Math.round(u)))
      if ((x * 31 + Math.floor(t * 4)) % 7 === 0) c.fillRect(x, Math.round(ey) - 3 * u, 1, 1)
    }
    // foam band where waves break offshore
    c.fillStyle = L.night ? '#53bfcc' : '#e4fbf6'
    const by = shore - 3 * u + Math.sin(t * 0.9) * u
    for (let x = 0; x < w; x += 2) if (Math.sin(x * 0.15 + t * 2) + Math.sin(x * 0.05 - t) > 0.6) c.fillRect(x, Math.round(by), 2, 1)
  }
}
