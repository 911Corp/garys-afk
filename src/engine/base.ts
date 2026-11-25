import { rng, type Rng } from './math'
import { quantize, type Palette } from './pixel'
import type { GlobalRender, SceneContext, SceneEvent, SceneInstance, SceneSettings } from './types'

/**
 * Convenience base for scenes. `setSettings` merges a partial update (the Stage sends `{}` when only
 * global options changed), then calls `configure()` so the scene can rebuild what depends on them.
 */
export abstract class BaseScene implements SceneInstance {
  canvas: HTMLCanvasElement
  w: number
  h: number
  pr: number
  s: SceneSettings
  g: GlobalRender
  t = 0
  r: Rng
  emit: (e: SceneEvent) => void

  constructor(ctx: SceneContext) {
    this.canvas = ctx.canvas
    this.w = ctx.width
    this.h = ctx.height
    this.pr = ctx.pixelRatio
    this.s = { ...ctx.settings }
    this.g = ctx.global
    this.r = rng(ctx.seed)
    this.emit = ctx.emit
  }

  num(k: string) {
    return Number(this.s[k])
  }
  str(k: string) {
    return String(this.s[k])
  }
  bool(k: string) {
    return Boolean(this.s[k])
  }

  update(dt: number) {
    this.t += dt
    this.step(dt)
  }

  resize(w: number, h: number, pr: number) {
    this.w = w
    this.h = h
    this.pr = pr
    this.layout()
  }

  setSettings(settings: SceneSettings, global: GlobalRender) {
    this.s = { ...this.s, ...settings }
    this.g = global
    this.configure()
  }

  abstract step(dt: number): void
  abstract render(): void
  /** Called after resize. */
  layout(): void {}
  /** Called after a settings change. */
  configure(): void {}
  dispose(): void {}
}

/**
 * Every scene in Gary's AFK is a PixelScene: it draws with the Canvas 2D API into a buffer sized by
 * the Stage. Smooth mode (default): a sharp HD buffer. Retro pixels mode: a ~320x180 buffer whose
 * frame is reduced to the scene's palette with ordered dithering. Design in units: `this.u` is one
 * pixel of a 180-pixel-high screen, so the same code draws at any resolution.
 */
export abstract class PixelScene extends BaseScene {
  c: CanvasRenderingContext2D
  constructor(ctx: SceneContext) {
    super(ctx)
    const c = this.canvas.getContext('2d', { alpha: false, willReadFrequently: ctx.global.retro })
    if (!c) throw new Error('Canvas 2D is not available')
    this.c = c
    c.imageSmoothingEnabled = !ctx.global.retro
  }
  /** One unit = one pixel of a 180-pixel-high screen. */
  get u() {
    return Math.min(this.w, this.h) / 180
  }
  get density() {
    return Math.max(0.25, this.g.density)
  }
  abstract palette(): Palette
  /** 0 = flat colours, 1 = strong 4x4 ordered dithering. */
  dither() {
    return 0.55
  }
  abstract draw(): void
  render() {
    const c = this.c
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    c.globalCompositeOperation = 'source-over'
    c.imageSmoothingEnabled = !this.g.retro
    this.draw()
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    c.globalCompositeOperation = 'source-over'
    c.shadowBlur = 0
    if (!this.g.retro) return
    const img = c.getImageData(0, 0, this.w, this.h)
    quantize(img, this.palette(), this.dither())
    c.putImageData(img, 0, 0)
  }
}

export { rng }
