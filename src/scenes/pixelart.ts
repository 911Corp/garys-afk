import { PixelScene } from '../engine/base'
import type { SceneContext } from '../engine/types'

/**
 * Base for the pixel-art scenes. Each scene is composed on a small grid (the short side is
 * 144 pixels: 256x144 in landscape, 144x256 in portrait, other ratios in between), then
 * scaled to the screen by an integer-ish factor with no smoothing. Coordinates are grid pixels.
 */
export abstract class PixelArtScene extends PixelScene {
  buf!: HTMLCanvasElement
  b!: CanvasRenderingContext2D
  PW = 256
  PH = 144
  constructor(ctx: SceneContext) {
    super(ctx)
    // the grid is created on the first frame, once subclass fields are initialised
  }
  /** Grid size for the current screen; scenes may override. */
  grid() {
    const { w, h } = this
    const short = 144
    if (!w || !h) return
    if (w >= h) {
      this.PH = short
      this.PW = Math.min(320, Math.max(short, Math.round((short * w) / h)))
    } else {
      this.PW = short
      this.PH = Math.min(320, Math.max(short, Math.round((short * h) / w)))
    }
    this.buf = document.createElement('canvas')
    this.buf.width = this.PW
    this.buf.height = this.PH
    this.b = this.buf.getContext('2d')!
    this.b.imageSmoothingEnabled = false
    this.build()
  }
  layout() {
    if (this.buf) this.grid()
  }
  /** Called whenever the grid changes size: prepare static layers here. */
  build() {}
  /** Compose one frame on the grid. */
  abstract compose(): void
  px(x: number, y: number, w: number, h: number, col: string) {
    this.b.fillStyle = col
    this.b.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }
  dot(x: number, y: number, col: string) {
    this.b.fillStyle = col
    this.b.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
  /** Classic 2x2 checker dither between two colours over a rectangle. */
  dither2(x: number, y: number, w: number, h: number, a: string, bcol: string) {
    for (let yy = Math.round(y); yy < y + h; yy++)
      for (let xx = Math.round(x); xx < x + w; xx++) this.dot(xx, yy, (xx + yy) % 2 ? a : bcol)
  }
  /** Horizontal bands from a list of colours, with a dithered seam between each band. */
  bands(y0: number, y1: number, cols: string[]) {
    const n = cols.length
    const step = (y1 - y0) / n
    for (let i = 0; i < n; i++) {
      const ya = Math.round(y0 + i * step)
      const yb = Math.round(y0 + (i + 1) * step)
      this.px(0, ya, this.PW, yb - ya, cols[i])
      if (i < n - 1) for (let x = 0; x < this.PW; x++) if (x % 2 === 0) this.dot(x, yb, cols[i])
      if (i < n - 1) for (let x = 0; x < this.PW; x++) if (x % 4 === 1) this.dot(x, yb + 1, cols[i])
    }
  }
  /** A filled disc on the grid. */
  disc(cx: number, cy: number, r: number, col: string) {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y) + 0.3)
      this.px(cx - half, cy + y, half * 2 + 1, 1, col)
    }
  }
  draw() {
    if (!this.buf) this.grid()
    if (!this.buf) return
    this.compose()
    const c = this.c
    const { w, h } = this
    const s = Math.max(w / this.PW, h / this.PH)
    c.imageSmoothingEnabled = false
    c.drawImage(this.buf, (w - this.PW * s) / 2, (h - this.PH * s) / 2, this.PW * s, this.PH * s)
    c.imageSmoothingEnabled = !this.g.retro
  }
}
