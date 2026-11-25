import { PixelScene } from '../../engine/base'
import { fontsReady, lcdBackground, PALETTES, type LcdPalette } from '../../engine/gary/draw'
import type { SceneContext } from '../../engine/types'

export const W = 960
export const H = 540

/** Frame for Gary.exe: 960x540 world and the Purity-o-Meter LCD palettes. Gary never speaks here. */
export abstract class GaryScene extends PixelScene {
  scale = 1
  ox = 0
  oy = 0
  pal: LcdPalette = PALETTES.lcd
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
    this.configure()
    fontsReady().then(() => this.render())
  }
  layout() {
    // Fit the 960x540 composition. On portrait screens fit the width and centre it vertically.
    this.scale = Math.min(this.w / W, this.h / H)
    this.ox = (this.w - W * this.scale) / 2
    this.oy = (this.h - H * this.scale) / 2
  }
  configure() {
    this.pal = PALETTES[this.str('palette')] ?? PALETTES.lcd
  }
  palette() {
    return this.pal.pixel
  }
  dither() {
    return 0.35
  }
  get boilOn() {
    return this.bool('boil') && !this.g.reducedMotion
  }
  get garyOn() {
    return this.g.showGary
  }
  begin() {
    const c = this.c
    c.setTransform(1, 0, 0, 1, 0, 0)
    lcdBackground(c, this.w, this.h, this.pal)
    c.setTransform(this.scale, 0, 0, this.scale, this.ox, this.oy)
  }
  /** Canonical figure group: canonical viewBox units scaled x4 into the 960x540 world. */
  enterCanon(x: number, y: number, k = 4) {
    this.c.save()
    this.c.translate(x, y)
    this.c.scale(k, k)
  }
  footer(text = 'Not financial advice. Neither is Gary.') {
    const c = this.c
    c.font = '24px "VT323", monospace'
    c.textAlign = 'right'
    c.fillStyle = this.pal.ink
    c.fillText(text, W - 16, H - 14)
  }
}

