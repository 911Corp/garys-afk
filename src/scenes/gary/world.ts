import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

/**
 * Base for illustrated scenes composed in a 960x540 world. The world is scaled to fit and centred;
 * `fill()` paints full-bleed backgrounds so wide and tall screens never show empty bars.
 */
export abstract class WorldScene extends PixelScene {
  static W = 960
  static H = 540
  k = 1
  ox = 0
  oy = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.fit()
  }
  fit() {
    // cover a little more than contain, so the edges of the set fill wide screens
    this.k = Math.max(Math.min(this.w / 960, this.h / 540), Math.max(this.w / 960, this.h / 540) * 0.82)
    this.ox = (this.w - 960 * this.k) / 2
    this.oy = (this.h - 540 * this.k) / 2
  }
  layout() {
    this.fit()
  }
  /** Switch to world coordinates. */
  world() {
    this.c.setTransform(this.k, 0, 0, this.k, this.ox, this.oy)
  }
  /** Switch to screen coordinates (for full-bleed fills and overlays). */
  screen() {
    this.c.setTransform(1, 0, 0, 1, 0, 0)
  }
  /** Rounded rectangle path. */
  rr(x: number, y: number, w: number, h: number, r: number) {
    const c = this.c
    c.beginPath()
    c.roundRect(x, y, w, h, r)
  }
  glow(x: number, y: number, r: number, color: string, alpha: number) {
    const c = this.c
    const g = c.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color.replace('A', String(alpha)))
    g.addColorStop(1, color.replace('A', '0'))
    c.fillStyle = g
    c.fillRect(x - r, y - r, r * 2, r * 2)
  }
}
