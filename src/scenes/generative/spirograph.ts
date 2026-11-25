import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

const INKS: Record<string, { paper: string; pens: string[] }> = {
  night: { paper: '#07040f', pens: ['#ff7ab6', '#22e1ff', '#ffe95a', '#7cff6b', '#a68cff'] },
  paper: { paper: '#f4efe2', pens: ['#c8402e', '#2f6fb0', '#3e9a4e', '#232245', '#d9668a'] },
  gold: { paper: '#0c0705', pens: ['#ffbe4f', '#ffe9a3', '#f08a2a', '#fffbe8'] },
}

type Pen = { R: number; r: number; d: number; th: number; speed: number; col: string; px: number; py: number; life: number }

export function create(ctx: SceneContext) {
  return new Spirograph(ctx)
}

/** Gears drawing hypotrochoids: pens trace rosettes onto a sheet that slowly fades before the next set. */
class Spirograph extends PixelScene {
  sheet!: HTMLCanvasElement
  sc!: CanvasRenderingContext2D
  pens: Pen[] = []
  fade = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.2
  }
  get I() {
    return INKS[this.str('ink')] ?? INKS.night
  }
  configure() {
    this.layout()
  }
  layout() {
    this.sheet = document.createElement('canvas')
    this.sheet.width = this.w
    this.sheet.height = this.h
    this.sc = this.sheet.getContext('2d')!
    this.sc.fillStyle = this.I.paper
    this.sc.fillRect(0, 0, this.w, this.h)
    this.newPens()
  }
  newPens() {
    const n = Math.max(1, Math.round(this.num('pens')))
    const size = Math.min(this.w, this.h) * 0.38
    this.pens = Array.from({ length: n }, () => {
      const R = size
      // ratios of small integers give closed curves
      const teeth = this.r.int(5, 17)
      const ring = this.r.int(teeth + 2, teeth * 3)
      const r = (R * teeth) / ring
      const d = r * this.r.range(0.5, 1.3)
      const p = { R, r, d, th: 0, speed: this.r.range(0.7, 1.3), col: this.r.pick(this.I.pens), px: 0, py: 0, life: 0 }
      const [x, y] = this.at(p)
      p.px = x
      p.py = y
      return p
    })
  }
  at(p: Pen): [number, number] {
    const k = p.R - p.r
    return [this.w / 2 + k * Math.cos(p.th) + p.d * Math.cos((k / p.r) * p.th), this.h / 2 + k * Math.sin(p.th) - p.d * Math.sin((k / p.r) * p.th)]
  }
  step(dt: number) {
    const sp = this.num('speed')
    const sc = this.sc
    sc.lineWidth = Math.max(1, 0.45 * this.u)
    sc.globalAlpha = 0.85
    let done = true
    for (const p of this.pens) {
      const steps = Math.ceil(30 * sp * dt * 60) / 2
      sc.strokeStyle = p.col
      sc.beginPath()
      sc.moveTo(p.px, p.py)
      for (let i = 0; i < steps; i++) {
        p.th += 0.02 * p.speed
        const [x, y] = this.at(p)
        sc.lineTo(x, y)
        p.px = x
        p.py = y
      }
      sc.stroke()
      p.life += dt * sp
      if (p.life < 40) done = false
    }
    sc.globalAlpha = 1
    if (done) {
      this.fade += dt
      sc.fillStyle = this.I.paper
      sc.globalAlpha = Math.min(1, dt * 0.8)
      sc.fillRect(0, 0, this.w, this.h)
      sc.globalAlpha = 1
      if (this.fade > 4) {
        this.fade = 0
        this.newPens()
      }
    }
  }
  draw() {
    const c = this.c
    c.drawImage(this.sheet, 0, 0)
    // the gears, faint, around the active pens
    if (this.fade > 0) return
    c.strokeStyle = this.str('ink') === 'paper' ? 'rgba(35,34,69,0.25)' : 'rgba(255,255,255,0.15)'
    c.lineWidth = Math.max(1, 0.4 * this.u)
    const p = this.pens[0]
    if (!p) return
    const k = p.R - p.r
    c.beginPath()
    c.arc(this.w / 2, this.h / 2, p.R, 0, TAU)
    c.stroke()
    c.beginPath()
    c.arc(this.w / 2 + k * Math.cos(p.th), this.h / 2 + k * Math.sin(p.th), p.r, 0, TAU)
    c.stroke()
    c.fillStyle = p.col
    c.beginPath()
    c.arc(p.px, p.py, Math.max(2, 1.2 * this.u), 0, TAU)
    c.fill()
  }
}
