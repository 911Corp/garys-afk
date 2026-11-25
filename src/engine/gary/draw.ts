import { PALETTES as PX } from '../pixel'
import type { Op } from './kit'

export const VT = '"VT323", ui-monospace, monospace'

/** Resolve once the fonts used on canvas are ready (canvas text does not wait on its own). */
export function fontsReady(): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return Promise.all([document.fonts.load(`20px ${VT}`), document.fonts.load('20px "IBM Plex Mono"')]).catch(() => undefined)
}

type Compiled = { p: Path2D; w: number; fill: boolean } | { text: string; x: number; y: number; s: number; anchor: CanvasTextAlign }

/** Ops are compiled to Path2D once and reused every frame. */
export class Drawing {
  private items: Compiled[]
  constructor(ops: Op[]) {
    this.items = ops.map((o) =>
      o.k === 'path' ? { p: new Path2D(o.d), w: o.w, fill: o.fill } : { text: o.text, x: o.x, y: o.y, s: o.s, anchor: o.anchor === 'middle' ? 'center' : 'left' },
    )
  }
  draw(c: CanvasRenderingContext2D, ink: string) {
    c.strokeStyle = ink
    c.fillStyle = ink
    c.lineCap = 'round'
    c.lineJoin = 'round'
    for (const it of this.items) {
      if ('p' in it) {
        if (it.fill) {
          c.lineWidth = 1
          c.fill(it.p)
          c.stroke(it.p)
        } else {
          c.lineWidth = it.w
          c.stroke(it.p)
        }
      } else {
        c.font = `${it.s}px ${VT}`
        c.textAlign = it.anchor
        c.textBaseline = 'alphabetic'
        c.fillText(it.text, it.x, it.y)
      }
    }
  }
}

/** Several pre-seeded variants of the same drawing, cycled a few times a second ("line boil"). */
export class Boil {
  private frames: Drawing[]
  private i = 0
  private acc = 0
  constructor(make: (variant: number) => Op[], count = 3) {
    this.frames = Array.from({ length: count }, (_, v) => new Drawing(make(v)))
  }
  step(dt: number, on: boolean, fps = 5) {
    if (!on) {
      this.i = 0
      return
    }
    this.acc += dt
    if (this.acc > 1 / fps) {
      this.acc = 0
      this.i = (this.i + 1) % this.frames.length
    }
  }
  draw(c: CanvasRenderingContext2D, ink: string) {
    this.frames[this.i].draw(c, ink)
  }
}

export interface LcdPalette {
  bg: string
  ink: string
  bubble: string
  bubbleInk: string
  pixel: string[]
}

export const PALETTES: Record<string, LcdPalette> = {
  lcd: { bg: '#b8d97a', ink: '#1f2a12', bubble: '#fffaf0', bubbleInk: '#1f2a12', pixel: PX.gary },
  night: { bg: '#1f2a12', ink: '#b8d97a', bubble: '#b8d97a', bubbleInk: '#0e1408', pixel: PX.garyNight },
  paper: { bg: '#f4efe2', ink: '#1c1b19', bubble: '#ffffff', bubbleInk: '#1c1b19', pixel: PX.garyPaper },
}

/** LCD backdrop: flat colour. */
export function lcdBackground(c: CanvasRenderingContext2D, w: number, h: number, pal: LcdPalette) {
  c.fillStyle = pal.bg
  c.fillRect(0, 0, w, h)
}

/**
 * Gary's speech bubble, original style: white, 2px ink border, rounded with a pointy bottom-left
 * corner, tilted -4deg, VT323. (x, y) is the bottom-left corner, i.e. where it points.
 */
export function bubble(c: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, pal: LcdPalette, pop = 1) {
  c.save()
  c.font = `${size}px ${VT}`
  const tw = c.measureText(text).width
  const padX = size * 0.4
  const padY = size * 0.16
  const bw = tw + padX * 2
  const bh = size + padY * 2
  c.translate(x, y)
  c.rotate((-4 * Math.PI) / 180)
  c.scale(pop, pop)
  const r = size * 0.55
  c.beginPath()
  c.moveTo(0, 0)
  c.lineTo(0, -bh + r)
  c.quadraticCurveTo(0, -bh, r, -bh)
  c.lineTo(bw - r, -bh)
  c.quadraticCurveTo(bw, -bh, bw, -bh + r)
  c.lineTo(bw, -r)
  c.quadraticCurveTo(bw, 0, bw - r, 0)
  c.lineTo(size * 0.09, 0)
  c.closePath()
  c.fillStyle = pal.bubble
  c.fill()
  c.lineWidth = Math.max(2, size * 0.09)
  c.strokeStyle = pal.bubbleInk
  c.stroke()
  c.fillStyle = pal.bubbleInk
  c.textBaseline = 'middle'
  c.textAlign = 'left'
  c.fillText(text, padX, -bh / 2 + size * 0.04)
  c.restore()
}
