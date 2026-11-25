import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

const ALPHABETS: Record<string, string> = {
  katakana: 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789Z:.=*+-<>¦',
  binary: '01',
  hex: '0123456789ABCDEF',
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&',
  runes: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ',
  gary: 'GMNGMIWAGMIHODLSERFOMOREKT$',
}
const COLORS: Record<string, [string, string, string[]]> = {
  green: ['#4cff7a', '#c8ffd6', PX.phosphor],
  cyan: ['#36d6ff', '#e0f8ff', ['#020409', '#0a2a3a', '#147a99', '#36d6ff', '#e0f8ff']],
  amber: ['#ffb000', '#ffd98a', PX.amber],
  pink: ['#ff5fa8', '#ffe3f0', ['#07040f', '#3a0a26', '#a0205e', '#ff5fa8', '#ffe3f0']],
  white: ['#c9cdd6', '#ffffff', PX.mono],
}

interface Col {
  y: number
  speed: number
  len: number
  glyphs: string[]
  depth: number
}

export function create(ctx: SceneContext) {
  return new DigitalRain(ctx)
}

/**
 * Each column keeps its own glyph strip; we redraw the visible tail every frame (no canvas
 * feedback), so the trail length is exact at any frame rate and the result is clean in fullscreen.
 */
class DigitalRain extends PixelScene {
  cols: Col[] = []
  cell = 20
  swap = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return (COLORS[this.str('color')] ?? COLORS.green)[2]
  }
  dither() {
    return 0.15
  }
  get alphabet() {
    return ALPHABETS[this.str('alphabet')] ?? ALPHABETS.katakana
  }
  layout() {
    const density = this.num('density') * this.density
    this.cell = Math.max(7, Math.round(Math.min(this.w, this.h) / (24 * Math.sqrt(density))))
    const n = Math.ceil(this.w / this.cell)
    const rows = Math.ceil(this.h / this.cell) + 2
    this.cols = Array.from({ length: n }, () => this.makeCol(rows, true))
  }
  configure() {
    this.layout()
  }
  makeCol(rows: number, scatter: boolean): Col {
    const a = this.alphabet
    return {
      y: scatter ? this.r.range(-rows, rows) : this.r.range(-rows * 0.6, -2),
      speed: this.r.range(6, 18),
      len: Math.floor(this.r.range(8, rows * 0.9)),
      glyphs: Array.from({ length: rows + 40 }, () => a[Math.floor(this.r() * a.length)]),
      depth: this.r.range(0.45, 1),
    }
  }
  step(dt: number) {
    const rows = Math.ceil(this.h / this.cell) + 2
    const sp = this.num('speed')
    const a = this.alphabet
    for (let i = 0; i < this.cols.length; i++) {
      const col = this.cols[i]
      col.y += dt * col.speed * sp * col.depth
      if (col.y - col.len > rows) this.cols[i] = this.makeCol(rows, false)
    }
    // glyphs mutate here and there
    this.swap += dt * this.cols.length * 3
    while (this.swap > 1) {
      this.swap--
      const col = this.cols[Math.floor(this.r() * this.cols.length)]
      col.glyphs[Math.floor(this.r() * col.glyphs.length)] = a[Math.floor(this.r() * a.length)]
    }
  }
  draw() {
    const c = this.c
    const [base, head] = COLORS[this.str('color')] ?? COLORS.green
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.fillStyle = '#020403'
    c.fillRect(0, 0, this.w, this.h)
    c.font = `${Math.round(this.cell * 1.1)}px "VT323", "MS Gothic", monospace`
    c.textAlign = 'center'
    c.textBaseline = 'top'
    const glow = this.g.intensity
    for (let i = 0; i < this.cols.length; i++) {
      const col = this.cols[i]
      const x = i * this.cell + this.cell / 2
      const headRow = Math.floor(col.y)
      for (let k = 0; k < col.len; k++) {
        const row = headRow - k
        if (row < 0) break
        const y = row * this.cell
        if (y > this.h) continue
        const f = 1 - k / col.len
        if (k === 0) {
          c.fillStyle = head
          c.shadowColor = base
          c.shadowBlur = this.cell * 0.8 * glow
        } else {
          c.shadowBlur = 0
          c.fillStyle = base
        }
        c.globalAlpha = (k === 0 ? 1 : Math.pow(f, 1.4)) * col.depth
        c.fillText(col.glyphs[row % col.glyphs.length], x, y)
      }
    }
    c.globalAlpha = 1
    c.shadowBlur = 0
  }
}
