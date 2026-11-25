import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

const RULES = [
  { axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' } as Record<string, string>, angle: 25, iter: 5, len: 0.012 },
  { axiom: 'F', rules: { F: 'FF-[-F+F+F]+[+F-F-F]' } as Record<string, string>, angle: 22, iter: 4, len: 0.016 },
  { axiom: 'X', rules: { X: 'F[+X]F[-X]+X', F: 'FF' } as Record<string, string>, angle: 20, iter: 5, len: 0.011 },
  { axiom: 'X', rules: { X: 'F[-X][X]F[-X]+FX', F: 'FF' } as Record<string, string>, angle: 24, iter: 5, len: 0.011 },
]

type Seg = { x1: number; y1: number; x2: number; y2: number; depth: number }
type Plant = { x: number; segs: Seg[]; leaves: { x: number; y: number; d: number }[]; grow: number; hue: number }

export function create(ctx: SceneContext) {
  return new LSystemGarden(ctx)
}

/** A garden of L-system plants: each grows from its rule, sways in the breeze, then the bed is replanted. */
class LSystemGarden extends PixelScene {
  plants: Plant[] = []
  phase = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.plant()
  }
  palette() {
    return PX.forest16
  }
  dither() {
    return 0.35
  }
  configure() {
    this.plant()
  }
  expand(rule: (typeof RULES)[number]) {
    let s = rule.axiom
    for (let i = 0; i < rule.iter; i++) {
      let out = ''
      for (const ch of s) out += rule.rules[ch] ?? ch
      s = out
      if (s.length > 40000) break
    }
    return s
  }
  build(x: number, rule: (typeof RULES)[number], jitter: number): Plant {
    const s = this.expand(rule)
    const segs: Seg[] = []
    const leaves: { x: number; y: number; d: number }[] = []
    const stack: [number, number, number, number][] = []
    let px = 0
    let py = 0
    let a = -Math.PI / 2
    let depth = 0
    const ang = (rule.angle * Math.PI) / 180
    for (const ch of s) {
      if (ch === 'F') {
        const len = rule.len * (1 + (this.r() - 0.5) * jitter)
        const nx = px + Math.cos(a) * len
        const ny = py + Math.sin(a) * len
        segs.push({ x1: px, y1: py, x2: nx, y2: ny, depth })
        px = nx
        py = ny
      } else if (ch === '+') a += ang * (1 + (this.r() - 0.5) * jitter)
      else if (ch === '-') a -= ang * (1 + (this.r() - 0.5) * jitter)
      else if (ch === '[') {
        stack.push([px, py, a, depth])
        depth++
      } else if (ch === ']') {
        leaves.push({ x: px, y: py, d: depth })
        ;[px, py, a, depth] = stack.pop()!
      }
    }
    // normalise height to 1
    const minY = Math.min(...segs.map((s) => s.y2), -0.001)
    const k = 1 / -minY
    for (const sg of segs) {
      sg.x1 *= k
      sg.x2 *= k
      sg.y1 *= k
      sg.y2 *= k
    }
    for (const l of leaves) {
      l.x *= k
      l.y *= k
    }
    return { x, segs, leaves, grow: 0, hue: this.r() }
  }
  plant() {
    const n = Math.max(1, Math.min(5, Math.round((this.w / this.h) * 2 * this.num('plants'))))
    this.plants = Array.from({ length: n }, (_, i) => this.build((i + 0.5) / n + this.r.range(-0.04, 0.04), this.r.pick(RULES), 0.25))
    this.phase = 0
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.phase += dt
    let all = true
    for (const p of this.plants) {
      p.grow = Math.min(1, p.grow + (dt * sp) / 25)
      if (p.grow < 1) all = false
    }
    if (all && this.phase > 25 / sp + 12) this.plant()
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const sky = c.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#f0f4c8')
    sky.addColorStop(1, '#c4dc7a')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    const ground = h * 0.9
    c.fillStyle = '#4a3222'
    c.fillRect(0, ground, w, h - ground)
    c.fillStyle = '#6e4d33'
    c.fillRect(0, ground, w, 2 * u)
    const size = Math.min(h * 0.8, (w / this.plants.length) * 1.3)
    for (const p of this.plants) {
      const bx = p.x * w
      const n = Math.floor(p.segs.length * p.grow)
      c.lineCap = 'round'
      const sw = Math.sin(this.t * 0.9 + p.hue * 6) * 0.04 * this.num('wind')
      const classes: [string, number, number, number][] = [
        ['#4a3222', 0, 2, 1.4],
        ['#447a3c', 2, 4, 0.9],
        ['#649a45', 4, 99, 0.6],
      ]
      for (const [col, d0, d1, lw] of classes) {
        c.strokeStyle = col
        c.lineWidth = Math.max(1, lw * u)
        c.beginPath()
        for (let i = 0; i < n; i++) {
          const s = p.segs[i]
          if (s.depth < d0 || s.depth >= d1) continue
          c.moveTo(bx + (s.x1 + sw * s.y1 * s.y1) * size, ground + s.y1 * size)
          c.lineTo(bx + (s.x2 + sw * s.y2 * s.y2) * size, ground + s.y2 * size)
        }
        c.stroke()
      }
      c.lineCap = 'butt'
      // blossoms appear when the plant is grown
      if (p.grow > 0.85) {
        const a = (p.grow - 0.85) / 0.15
        const col = p.hue < 0.33 ? '#ffd76a' : p.hue < 0.66 ? '#f59ab4' : '#f0f4c8'
        c.fillStyle = col
        c.globalAlpha = a
        for (let i = 0; i < p.leaves.length; i += 3) {
          const l = p.leaves[i]
          c.beginPath()
          c.arc(bx + (l.x + sw * l.y * l.y) * size, ground + l.y * size, 1.3 * u, 0, TAU)
          c.fill()
        }
        c.globalAlpha = 1
      }
    }
  }
}
