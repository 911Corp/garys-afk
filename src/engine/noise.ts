/** Simplex noise (2D and 3D), seeded. Based on Stefan Gustavson's public-domain reference. */
import { rng } from './math'

const G3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]

export function createNoise(seed = 1) {
  const r = rng(seed)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    const t = p[i]
    p[i] = p[j]
    p[j] = t
  }
  const perm = new Uint8Array(512)
  const pm12 = new Uint8Array(512)
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
    pm12[i] = perm[i] % 12
  }

  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6
  function noise2(xin: number, yin: number) {
    const s = (xin + yin) * F2
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const t = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    let n = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      const g = G3[pm12[ii + perm[jj]]]
      t0 *= t0
      n += t0 * t0 * (g[0] * x0 + g[1] * y0)
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      const g = G3[pm12[ii + i1 + perm[jj + j1]]]
      t1 *= t1
      n += t1 * t1 * (g[0] * x1 + g[1] * y1)
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      const g = G3[pm12[ii + 1 + perm[jj + 1]]]
      t2 *= t2
      n += t2 * t2 * (g[0] * x2 + g[1] * y2)
    }
    return 70 * n
  }

  const F3 = 1 / 3
  const G3c = 1 / 6
  function noise3(xin: number, yin: number, zin: number) {
    const s = (xin + yin + zin) * F3
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const k = Math.floor(zin + s)
    const t = (i + j + k) * G3c
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const z0 = zin - (k - t)
    let i1, j1, k1, i2, j2, k2
    if (x0 >= y0) {
      if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0]
      else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1]
      else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1]
    } else {
      if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1]
      else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1]
      else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0]
    }
    const x1 = x0 - i1 + G3c, y1 = y0 - j1 + G3c, z1 = z0 - k1 + G3c
    const x2 = x0 - i2 + 2 * G3c, y2 = y0 - j2 + 2 * G3c, z2 = z0 - k2 + 2 * G3c
    const x3 = x0 - 1 + 3 * G3c, y3 = y0 - 1 + 3 * G3c, z3 = z0 - 1 + 3 * G3c
    const ii = i & 255, jj = j & 255, kk = k & 255
    let n = 0
    const corner = (x: number, y: number, z: number, gi: number) => {
      let tt = 0.6 - x * x - y * y - z * z
      if (tt < 0) return 0
      const g = G3[gi]
      tt *= tt
      return tt * tt * (g[0] * x + g[1] * y + g[2] * z)
    }
    n += corner(x0, y0, z0, pm12[ii + perm[jj + perm[kk]]])
    n += corner(x1, y1, z1, pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]])
    n += corner(x2, y2, z2, pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]])
    n += corner(x3, y3, z3, pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]])
    return 32 * n
  }

  function fbm2(x: number, y: number, oct = 4) {
    let a = 0.5, f = 1, s = 0
    for (let o = 0; o < oct; o++) {
      s += a * noise2(x * f, y * f)
      f *= 2
      a *= 0.5
    }
    return s
  }

  return { noise2, noise3, fbm2 }
}
export type Noise = ReturnType<typeof createNoise>
