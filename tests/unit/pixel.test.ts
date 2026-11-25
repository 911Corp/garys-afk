import { describe, expect, it } from 'vitest'
import { lutFor, PALETTES, quantize } from '../../src/engine/pixel'

const img = (w: number, h: number, rgb: [number, number, number]) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) data.set([...rgb, 255], i * 4)
  return { data, width: w, height: h, colorSpace: 'srgb' } as ImageData
}

describe('palette reduction', () => {
  it('maps every pixel onto a palette colour', () => {
    const pal = PALETTES.gary
    const im = img(8, 8, [120, 160, 90])
    quantize(im, pal, 0.6)
    const allowed = new Set(pal.map((h) => h.toLowerCase()))
    for (let i = 0; i < im.data.length; i += 4) {
      const hex = '#' + [im.data[i], im.data[i + 1], im.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')
      expect(allowed.has(hex)).toBe(true)
    }
  })
  it('keeps exact palette colours untouched without dithering', () => {
    const im = img(4, 4, [0x1f, 0x2a, 0x12])
    quantize(im, PALETTES.gary, 0)
    expect(Array.from(im.data.slice(0, 3))).toEqual([0x1f, 0x2a, 0x12])
  })
  it('caches lookup tables per palette', () => {
    expect(lutFor(PALETTES.ega)).toBe(lutFor(PALETTES.ega))
  })
})
