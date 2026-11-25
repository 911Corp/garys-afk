/**
 * Retro post-processing: every scene draws into a small buffer (≈320x180), which is then reduced to
 * a limited palette with optional 4x4 ordered (Bayer) dithering. The canvas is shown upscaled with
 * `image-rendering: pixelated`, so pixels stay crisp at any screen size.
 */

export type Palette = string[]

/** Hand-picked palettes, 4 to 16 colours, in the spirit of 8/16-bit hardware. All original lists. */
export const PALETTES = {
  /** Gary's LCD: the Purity-o-Meter background, ink and bubble white, plus two in-between shades. */
  gary: ['#1f2a12', '#4f6a2a', '#8fb354', '#b8d97a', '#fffaf0'],
  garyNight: ['#0e1408', '#1f2a12', '#4f6a2a', '#8fb354', '#b8d97a'],
  garyPaper: ['#1c1b19', '#5a5852', '#b9b4a6', '#f4efe2', '#ffffff'],
  /** 16 colours, general purpose (warm darks, cool lights). */
  console16: ['#0d0b14', '#2b2236', '#55305a', '#a23e5c', '#e2614f', '#f3a64b', '#f7e07a', '#9fd45a', '#3e9a4e', '#25604f', '#1e3d5c', '#2f6fb0', '#5ab4e5', '#b6e3f0', '#f2f0e6', '#8b8598'],
  night16: ['#05060d', '#0d1226', '#16244a', '#24407a', '#3a63a8', '#6a95d4', '#b5d0f0', '#f2f4ff', '#2a1a3a', '#5a2d5c', '#a3487a', '#ff8a5c', '#ffcf6a', '#fff3b0', '#1d3b2a', '#3f7a4a'],
  warm16: ['#0c0705', '#24120a', '#3f1f0f', '#682e14', '#9a3d16', '#cf5a1c', '#f08a2a', '#ffbe4f', '#ffe9a3', '#fffbe8', '#3a2a22', '#5c4434', '#8a6a52', '#b89a7c', '#1a1d24', '#2e3440'],
  cold16: ['#020409', '#08121f', '#0e2236', '#173856', '#22557a', '#3a7fa3', '#66b0c9', '#a6dbe5', '#e6f6f7', '#ffffff', '#1a1430', '#2e2552', '#4b3d7a', '#7a6aa8', '#ffd28a', '#ff9f5a'],
  ocean16: ['#03111a', '#062538', '#0a3d59', '#0f5878', '#177896', '#2a9bb3', '#53bfcc', '#93e0e0', '#e4fbf6', '#ffffff', '#f4d58a', '#e9a35a', '#c4643d', '#7a3a3a', '#26324a', '#4a5a7a'],
  forest16: ['#07100a', '#0f1f13', '#173020', '#22452b', '#2f5e35', '#447a3c', '#649a45', '#8fbb53', '#c4dc7a', '#f0f4c8', '#2b1d14', '#4a3222', '#6e4d33', '#a07a52', '#ffd76a', '#9ad1e8'],
  neon16: ['#07040f', '#120a24', '#1e1240', '#2c1b5e', '#3e2a7a', '#ff2e88', '#ff7ab6', '#22e1ff', '#9af5ff', '#ffe95a', '#ff9a3d', '#7cff6b', '#ffffff', '#5a5a7a', '#2a2a3e', '#a68cff'],
  machine: ['#14120f', '#2b2925', '#4a4740', '#6d6b62', '#9fa39b', '#c9c3b0', '#ddd6c2', '#f4f1e6', '#2f6f78', '#5aa3ad', '#6b4a2a', '#c0392b', '#ff6a3d', '#ffd166', '#7dff8a', '#ffffff'],
  cga: ['#000000', '#55ffff', '#ff55ff', '#ffffff'],
  amber: ['#120a02', '#4a2a04', '#9a6a08', '#ffb000', '#ffd98a'],
  phosphor: ['#020a04', '#0b3a16', '#1f8a3c', '#4cff7a', '#c8ffd6'],
  mono: ['#0b0b0c', '#3a3a3e', '#8a8a90', '#e8e8e8'],
  ega: ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'],
} satisfies Record<string, Palette>
export type PaletteId = keyof typeof PALETTES

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5)

const lutCache = new Map<string, { lut: Uint8Array; rgb: Uint8Array }>()

/** 32x32x32 lookup: RGB555 -> nearest palette index (perceptual-ish weighted distance). */
export function lutFor(pal: Palette) {
  const key = pal.join(',')
  let hit = lutCache.get(key)
  if (hit) return hit
  const rgb = new Uint8Array(pal.length * 3)
  pal.forEach((h, i) => {
    const n = parseInt(h.slice(1), 16)
    rgb[i * 3] = (n >> 16) & 255
    rgb[i * 3 + 1] = (n >> 8) & 255
    rgb[i * 3 + 2] = n & 255
  })
  const lut = new Uint8Array(32768)
  for (let r = 0; r < 32; r++)
    for (let g = 0; g < 32; g++)
      for (let b = 0; b < 32; b++) {
        const R = r * 8 + 4
        const G = g * 8 + 4
        const B = b * 8 + 4
        let best = 0
        let bd = Infinity
        for (let i = 0; i < pal.length; i++) {
          const dr = R - rgb[i * 3]
          const dg = G - rgb[i * 3 + 1]
          const db = B - rgb[i * 3 + 2]
          const d = dr * dr * 2 + dg * dg * 4 + db * db * 3
          if (d < bd) {
            bd = d
            best = i
          }
        }
        lut[(r << 10) | (g << 5) | b] = best
      }
  hit = { lut, rgb }
  lutCache.set(key, hit)
  return hit
}

/** Reduce an ImageData to the palette in place. dither 0..1 */
export function quantize(img: ImageData, pal: Palette, dither: number) {
  const { lut, rgb } = lutFor(pal)
  const d = img.data
  const w = img.width
  const spread = 48 * dither
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const x = p % w
    const y = (p / w) | 0
    const o = spread ? BAYER[((y & 3) << 2) | (x & 3)] * spread : 0
    let r = d[i] + o
    let g = d[i + 1] + o
    let b = d[i + 2] + o
    r = r < 0 ? 0 : r > 255 ? 255 : r
    g = g < 0 ? 0 : g > 255 ? 255 : g
    b = b < 0 ? 0 : b > 255 ? 255 : b
    const k = lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)] * 3
    d[i] = rgb[k]
    d[i + 1] = rgb[k + 1]
    d[i + 2] = rgb[k + 2]
    d[i + 3] = 255
  }
}
