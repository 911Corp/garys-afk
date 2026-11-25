import { PixelScene } from '../../engine/base'
import { bubble, fontsReady, lcdBackground, PALETTES, type LcdPalette } from '../../engine/gary/draw'
import type { SceneContext } from '../../engine/types'

export const W = 960
export const H = 540

/** Shared frame for the Gary's Universe scenes: 960x540 world, LCD palette, the canonical bubble. */
export abstract class GaryScene extends PixelScene {
  scale = 1
  ox = 0
  oy = 0
  pal: LcdPalette = PALETTES.lcd
  bubbleText = ''
  bubbleAge = 99
  bubbleLife = 0
  nextBubble = 3
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
  /** Lines Gary can say in this scene. Empty array: no bubbles. */
  abstract lines(): string[]
  say(text: string, life = 4.5) {
    this.bubbleText = text
    this.bubbleAge = 0
    this.bubbleLife = life
  }
  tickBubble(dt: number) {
    this.bubbleAge += dt
    if (!this.garyOn || !this.bool('bubbles')) return
    this.nextBubble -= dt
    if (this.nextBubble <= 0) {
      const l = this.lines()
      if (l.length) this.say(this.r.pick(l))
      this.nextBubble = this.r.range(9, 16)
    }
  }
  /** Draw the bubble at world coords (x, y) = where its pointy corner sits. */
  drawBubble(x: number, y: number, size = 30) {
    if (!this.garyOn || !this.bool('bubbles') || this.bubbleAge > this.bubbleLife) return
    const a = this.bubbleAge
    const pop = this.g.reducedMotion ? 1 : a < 0.35 ? 0.6 + 0.4 * Math.sin((a / 0.35) * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1
    const fade = Math.min(1, (this.bubbleLife - a) / 0.4)
    this.c.globalAlpha = Math.max(0, fade)
    // keep the whole bubble inside the composition
    this.c.font = `${size}px "VT323", monospace`
    const bw = this.c.measureText(this.bubbleText).width + size * 0.8
    x = Math.min(x, W - bw - 16)
    bubble(this.c, x, y, this.bubbleText, size, this.pal, pop)
    this.c.globalAlpha = 1
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

export const garySettingsCommon = [
  {
    key: 'palette',
    label: 'Palette',
    type: 'select' as const,
    options: [
      { value: 'lcd', label: 'LCD (original)' },
      { value: 'night', label: 'Backlight off' },
      { value: 'paper', label: 'Paper' },
    ],
    default: 'lcd',
  },
  { key: 'bubbles', label: 'Speech bubbles', type: 'toggle' as const, default: true },
  { key: 'boil', label: 'Hand-drawn line boil', type: 'toggle' as const, default: true },
]
