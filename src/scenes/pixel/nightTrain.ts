import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

const SCENES: Record<string, { sky: string[]; far: string; mid: string; near: string; ground: string; accent: string; snow: boolean; sea: boolean }> = {
  country: { sky: ['#0a0c22', '#10153a', '#1a2050', '#262c62'], far: '#1c2248', mid: '#141a3a', near: '#0c1128', ground: '#0a0e20', accent: '#ffcf6a', snow: false, sea: false },
  coast: { sky: ['#08102a', '#0c1838', '#122448', '#1a3058'], far: '#16264a', mid: '#0e1a36', near: '#0a1228', ground: '#080e1e', accent: '#ffd88a', snow: false, sea: true },
  snow: { sky: ['#0c1024', '#141a36', '#1e2648', '#2a345c'], far: '#5a6488', mid: '#7a86a8', near: '#c8d4ec', ground: '#e8eef8', accent: '#ffcf6a', snow: true, sea: false },
}

export function create(ctx: SceneContext) {
  return new NightTrain(ctx)
}

/**
 * Pixel art, side view: a night train crosses a stone viaduct, its windows lit, while hills,
 * a village and the moon slide by at their own speeds.
 */
class NightTrain extends PixelArtScene {
  far!: HTMLCanvasElement
  mid!: HTMLCanvasElement
  scroll = 0
  trainX = 0
  stars: { x: number; y: number; p: number }[] = []
  flakes: { x: number; y: number; v: number }[] = []
  windows: boolean[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.15
  }
  get S() {
    return SCENES[this.str('scenery')] ?? SCENES.country
  }
  configure() {
    this.build()
  }
  /** A layer twice the grid width so it can scroll and wrap seamlessly. */
  layer(fn: (px: (x: number, y: number, w: number, h: number, col: string) => void, W: number) => void) {
    const cv = document.createElement('canvas')
    cv.width = this.PW * 2
    cv.height = this.PH
    const c = cv.getContext('2d')!
    fn((x, y, w, h, col) => {
      c.fillStyle = col
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }, cv.width)
    return cv
  }
  build() {
    const { PH } = this
    const S = this.S
    const R = rng(44)
    const horizon = Math.round(PH * 0.62)
    // far hills with a few village lights
    this.far = this.layer((px, W) => {
      for (let x = 0; x < W; x++) {
        const y = Math.round(horizon - 18 - Math.abs(Math.sin((x / W) * Math.PI * 4)) * 16 - Math.sin((x / W) * Math.PI * 22) * 2)
        px(x, y, 1, PH - y, S.far)
      }
      for (let i = 0; i < 26; i++) px(R.int(0, W), R.int(horizon - 14, horizon - 4), 1, 1, S.accent)
    })
    // mid layer: rolling ground, trees or a sea line, and a lit village
    this.mid = this.layer((px, W) => {
      for (let x = 0; x < W; x++) {
        const y = Math.round(horizon - 4 - Math.sin((x / W) * Math.PI * 6) * 4)
        px(x, y, 1, PH - y, S.mid)
      }
      if (S.sea) {
        for (let x = 0; x < W; x++) px(x, horizon + 2, 1, PH - horizon - 2, '#0c1a34')
        for (let i = 0; i < 80; i++) px(R.int(0, W), R.int(horizon + 4, PH - 20), R.int(2, 6), 1, '#2a4070')
      }
      for (let i = 0; i < 14; i++) {
        const x = R.int(0, W)
        const y = Math.round(horizon - 4 - Math.sin((x / W) * Math.PI * 6) * 4)
        if (R.chance(0.5)) {
          // pine
          for (let k = 0; k < 10; k++) px(x - Math.floor(k / 3), y - 10 + k, 1 + Math.floor(k / 3) * 2, 1, S.near)
        } else {
          // cottage with a lit window
          px(x, y - 6, 8, 6, S.near)
          px(x - 1, y - 7, 10, 1, S.near)
          px(x + 1, y - 9, 6, 2, S.near)
          px(x + 2, y - 4, 2, 2, S.accent)
          if (R.chance(0.5)) px(x + 5, y - 4, 2, 2, S.accent)
        }
      }
    })
    this.stars = Array.from({ length: 50 }, () => ({ x: R.int(0, this.PW), y: R.int(0, horizon - 30), p: R() * 6 }))
    this.flakes = Array.from({ length: 50 }, () => ({ x: R() * this.PW, y: R() * PH, v: R.range(6, 14) }))
    this.windows = Array.from({ length: 64 }, () => R.chance(0.8))
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.scroll += dt * 20 * sp
    this.trainX += dt * 40 * sp
    for (const f of this.flakes) {
      f.y += f.v * dt
      f.x -= dt * 10 * sp
      if (f.y > this.PH) f.y = 0
      if (f.x < 0) f.x += this.PW
    }
  }
  compose() {
    const { PW, PH } = this
    const S = this.S
    const t = this.t
    const horizon = Math.round(PH * 0.62)
    this.bands(0, horizon, S.sky)
    for (const s of this.stars) if (Math.sin(t + s.p) > -0.4) this.dot(s.x, s.y, '#e6ecff')
    // moon with craters
    const mx = Math.round(PW * 0.78)
    this.disc(mx, 22, 9, '#f4f0dc')
    this.disc(mx - 3, 19, 2, '#d8d2b8')
    this.disc(mx + 3, 25, 1, '#d8d2b8')
    // parallax layers
    const off = (layer: HTMLCanvasElement, k: number) => {
      const W = layer.width
      const o = Math.round((this.scroll * k) % W)
      this.b.drawImage(layer, -o, 0)
      this.b.drawImage(layer, W - o, 0)
    }
    off(this.far, 0.25)
    off(this.mid, 0.7)
    // viaduct: a deck with stone arches, scrolling with the ground
    const deck = Math.round(PH * 0.72)
    const stone = S.snow ? '#8a92b0' : '#2a2a3e'
    const stone2 = S.snow ? '#a8b0c8' : '#3a3a52'
    const span = 28
    const o = Math.round(this.scroll % span)
    this.px(0, deck, PW, 4, stone2)
    this.px(0, deck + 4, PW, 1, stone)
    for (let x = -o; x < PW + span; x += span) {
      this.px(x, deck + 5, 6, PH - deck, stone)
      this.px(x + 1, deck + 5, 1, PH - deck, stone2)
      // arch curve
      for (let k = 0; k < span - 6; k++) {
        const ay = Math.round(Math.sqrt(Math.max(0, 1 - ((k - (span - 6) / 2) / ((span - 6) / 2)) ** 2)) * 8)
        this.px(x + 6 + k, deck + 5, 1, 9 - ay, stone)
      }
    }
    // the train: locomotive and carriages with lit windows, moving left to right and looping
    const carW = 46
    const cars = 5
    const len = carW * cars + 30
    const tx = Math.round((this.trainX % (PW + len)) - len)
    const ty = deck - 14
    for (let i = 0; i < cars; i++) {
      const x = tx + i * carW
      if (x > PW || x + carW < 0) continue
      this.px(x, ty, carW - 2, 12, '#3a1e2e')
      this.px(x, ty, carW - 2, 1, '#5a2e44')
      this.px(x, ty + 9, carW - 2, 1, '#c8963a')
      for (let k = 0; k < 6; k++) {
        const lit = this.windows[(i * 6 + k) % this.windows.length] && this.bool('lamp')
        this.px(x + 3 + k * 7, ty + 3, 5, 4, lit ? S.accent : '#1a1020')
      }
      // wheels
      for (const wx of [x + 6, x + carW - 10]) {
        this.px(wx, ty + 12, 4, 2, '#101018')
      }
    }
    // locomotive at the front
    const lx = tx + cars * carW
    if (lx < PW && lx + 30 > 0) {
      this.px(lx, ty - 2, 26, 14, '#2a2a36')
      this.px(lx + 18, ty - 8, 8, 8, '#2a2a36')
      this.px(lx + 4, ty - 6, 4, 4, '#2a2a36')
      this.px(lx + 26, ty + 6, 4, 6, '#1a1a24')
      this.px(lx + 20, ty - 6, 4, 3, S.accent)
      // headlight beam
      this.b.fillStyle = 'rgba(255,220,140,0.18)'
      this.b.beginPath()
      this.b.moveTo(lx + 30, ty + 4)
      this.b.lineTo(lx + 90, ty - 6)
      this.b.lineTo(lx + 90, ty + 14)
      this.b.fill()
      this.px(lx + 29, ty + 3, 2, 2, '#fff0c0')
      // smoke puffs trailing back
      for (let k = 0; k < 6; k++) {
        const sx = lx + 5 - k * 9 - ((t * 20) % 9)
        const sy = ty - 9 - k * 2
        this.disc(Math.round(sx), Math.round(sy), 2 + Math.floor(k / 2), k < 2 ? '#8a8aa0' : '#5a5a72')
      }
    }
    // reflection of the lit windows on the sea
    if (S.sea) for (let x = 0; x < PW; x += 3) if (Math.sin(x * 0.7 + t * 2) > 0.6) this.dot(x, deck + 18 + (x % 7), '#ffd88a66')
    if (S.snow) for (const f of this.flakes) this.dot(f.x, f.y, '#ffffff')
  }
}
