import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

type Koi = { x: number; y: number; a: number; v: number; turn: number; len: number; trail: { x: number; y: number }[]; pat: number; ph: number }
type Ripple = { x: number; y: number; r: number; life: number }
type Pad = { x: number; y: number; r: number; rot: number; flower: boolean; drift: number }

const PATTERNS = [
  { base: '#ff7a2a', spots: '#fff7ee', dark: null },
  { base: '#fff7ee', spots: '#e8402a', dark: null },
  { base: '#fff7ee', spots: '#e8402a', dark: '#1a1a22' },
  { base: '#ffc83d', spots: '#ffe9a3', dark: null },
  { base: '#e8402a', spots: '#1a1a22', dark: null },
]

export function create(ctx: SceneContext) {
  return new KoiPond(ctx)
}

/** A koi pond seen from above: fish glide under lily pads, light ripples, rain drops sometimes. */
class KoiPond extends PixelScene {
  koi: Koi[] = []
  ripples: Ripple[] = []
  pads: Pad[] = []
  stones: { x: number; y: number; r: number; c: string }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.ocean16
  }
  dither() {
    return 0.4
  }
  configure() {
    this.layout()
  }
  layout() {
    const { w, h, u } = this
    const r = this.r
    const n = Math.max(2, Math.round(7 * this.num('fish') * this.density))
    this.koi = Array.from({ length: n }, () => {
      const x = r() * w
      const y = r() * h
      return { x, y, a: r() * TAU, v: r.range(10, 20) * u, turn: 0, len: r.range(30, 46) * u, trail: Array.from({ length: 14 }, () => ({ x, y })), pat: r.int(0, PATTERNS.length - 1), ph: r() * TAU }
    })
    this.pads = Array.from({ length: Math.round((w * h) / (u * u) / 4200) + 3 }, () => ({ x: r() * w, y: r() * h, r: r.range(8, 15) * u, rot: r() * TAU, flower: r.chance(0.3), drift: r.range(-0.6, 0.6) * u }))
    this.stones = []
    for (let i = 0; i < 40; i++) {
      const side = i % 4
      const t = r()
      const x = side === 0 ? t * w : side === 1 ? w : side === 2 ? t * w : 0
      const y = side === 0 ? 0 : side === 1 ? t * h : side === 2 ? h : t * h
      this.stones.push({ x, y, r: r.range(10, 22) * u, c: r.pick(['#4a5a7a', '#26324a', '#5f6b84', '#3a4660']) })
    }
  }
  step(dt: number) {
    const { w, h, u } = this
    const sp = this.num('speed')
    for (const k of this.koi) {
      k.turn += (this.r() - 0.5) * dt * 2
      k.turn *= Math.pow(0.4, dt)
      // steer away from the edges
      const m = 30 * u
      const tx = k.x < m ? 1 : k.x > w - m ? -1 : 0
      const ty = k.y < m ? 1 : k.y > h - m ? -1 : 0
      if (tx || ty) {
        const want = Math.atan2(ty, tx)
        let d = want - k.a
        while (d > Math.PI) d -= TAU
        while (d < -Math.PI) d += TAU
        k.turn += d * dt * 1.5
      }
      k.a += k.turn * dt * sp
      const v = k.v * (0.8 + 0.4 * Math.sin(this.t * 0.5 + k.ph)) * sp
      k.x += Math.cos(k.a) * v * dt
      k.y += Math.sin(k.a) * v * dt
      // body follows the head
      let px = k.x
      let py = k.y
      const seg = k.len / k.trail.length
      for (const p of k.trail) {
        const dx = p.x - px
        const dy = p.y - py
        const d = Math.hypot(dx, dy) || 1
        p.x = px + (dx / d) * seg
        p.y = py + (dy / d) * seg
        px = p.x
        py = p.y
      }
    }
    for (const p of this.pads) {
      p.x += p.drift * dt
      if (p.x < -20 * u) p.x = w + 20 * u
      if (p.x > w + 20 * u) p.x = -20 * u
    }
    const rain = this.num('rain')
    if (rain > 0 && this.r.chance(dt * rain * 3)) this.ripples.push({ x: this.r() * w, y: this.r() * h, r: 0, life: 1 })
    for (const rp of this.ripples) {
      rp.r += dt * 18 * u
      rp.life -= dt * 0.5
    }
    this.ripples = this.ripples.filter((rp) => rp.life > 0)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
    g.addColorStop(0, '#177896')
    g.addColorStop(0.6, '#0f5878')
    g.addColorStop(1, '#062538')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // caustic light lines
    c.strokeStyle = 'rgba(147,224,224,0.08)'
    c.lineWidth = 2 * u
    for (let i = 0; i < 9; i++) {
      c.beginPath()
      for (let x = 0; x <= w; x += 10 * u) {
        const y = ((i + 0.5) / 9) * h + Math.sin(x / (30 * u) + this.t * 0.6 + i) * 8 * u
        if (x) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
      c.stroke()
    }
    // koi shadows then koi
    for (const k of this.koi) this.fish(k, true)
    for (const k of this.koi) this.fish(k, false)
    // ripples
    for (const rp of this.ripples) {
      c.strokeStyle = `rgba(228,251,246,${rp.life * 0.5})`
      c.lineWidth = Math.max(1, 0.6 * u)
      c.beginPath()
      c.ellipse(rp.x, rp.y, rp.r, rp.r * 0.9, 0, 0, TAU)
      c.stroke()
    }
    // lily pads
    for (const p of this.pads) {
      c.fillStyle = 'rgba(3,17,26,0.35)'
      c.beginPath()
      c.arc(p.x + 2 * u, p.y + 3 * u, p.r, 0, TAU)
      c.fill()
      c.fillStyle = '#3f7a4a'
      c.beginPath()
      c.moveTo(p.x, p.y)
      c.arc(p.x, p.y, p.r, p.rot + 0.25, p.rot + TAU - 0.05)
      c.closePath()
      c.fill()
      c.strokeStyle = '#2b5a37'
      c.lineWidth = Math.max(1, 0.4 * u)
      for (let i = 0; i < 6; i++) {
        const a = p.rot + 0.4 + i * 1.0
        c.beginPath()
        c.moveTo(p.x, p.y)
        c.lineTo(p.x + Math.cos(a) * p.r * 0.85, p.y + Math.sin(a) * p.r * 0.85)
        c.stroke()
      }
      if (p.flower) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + p.rot
          c.fillStyle = i % 2 ? '#ffd3df' : '#f59ab4'
          c.beginPath()
          c.ellipse(p.x + Math.cos(a) * 2.5 * u, p.y + Math.sin(a) * 2.5 * u, 3 * u, 1.4 * u, a, 0, TAU)
          c.fill()
        }
        c.fillStyle = '#ffcf73'
        c.beginPath()
        c.arc(p.x, p.y, 1.4 * u, 0, TAU)
        c.fill()
      }
    }
    // stone edge
    for (const s of this.stones) {
      c.fillStyle = s.c
      c.beginPath()
      c.ellipse(s.x, s.y, s.r, s.r * 0.8, s.x, 0, TAU)
      c.fill()
    }
  }
  fish(k: Koi, shadow: boolean) {
    const c = this.c
    const u = this.u
    const P = PATTERNS[k.pat]
    const off = shadow ? 4 * u : 0
    const pts = [{ x: k.x, y: k.y }, ...k.trail]
    const width = (i: number) => {
      const t = i / (pts.length - 1)
      const f = t < 0.28 ? 0.55 + 0.45 * Math.sin((t / 0.28) * (Math.PI / 2)) : 1 - ((t - 0.28) / 0.72) * 0.82
      return k.len * 0.13 * f
    }
    // body outline from both sides
    const left: { x: number; y: number }[] = []
    const right: { x: number; y: number }[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.min(i + 1, pts.length - 1)]
      const b = pts[Math.max(i - 1, 0)]
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      const wd = width(i)
      left.push({ x: pts[i].x + Math.cos(ang + Math.PI / 2) * wd + off, y: pts[i].y + Math.sin(ang + Math.PI / 2) * wd + off })
      right.push({ x: pts[i].x + Math.cos(ang - Math.PI / 2) * wd + off, y: pts[i].y + Math.sin(ang - Math.PI / 2) * wd + off })
    }
    c.fillStyle = shadow ? 'rgba(3,17,26,0.3)' : P.base
    c.beginPath()
    left.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
    for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i].x, right[i].y)
    c.closePath()
    c.fill()
    // tail fin
    const t0 = pts[pts.length - 1]
    const t1 = pts[pts.length - 3]
    const ta = Math.atan2(t0.y - t1.y, t0.x - t1.x)
    const flap = Math.sin(this.t * 6 + k.ph) * 0.4
    c.beginPath()
    c.moveTo(t0.x + off, t0.y + off)
    c.lineTo(t0.x + Math.cos(ta + 0.5 + flap) * k.len * 0.3 + off, t0.y + Math.sin(ta + 0.5 + flap) * k.len * 0.3 + off)
    c.lineTo(t0.x + Math.cos(ta - 0.5 + flap) * k.len * 0.3 + off, t0.y + Math.sin(ta - 0.5 + flap) * k.len * 0.3 + off)
    c.fill()
    // side fins
    const f = pts[3]
    const fa = Math.atan2(pts[2].y - pts[4].y, pts[2].x - pts[4].x)
    for (const s of [-1, 1]) {
      c.beginPath()
      c.ellipse(f.x + Math.cos(fa + s * 1.7) * k.len * 0.13 + off, f.y + Math.sin(fa + s * 1.7) * k.len * 0.13 + off, k.len * 0.1, k.len * 0.04, fa + s * (0.9 + flap * 0.5), 0, TAU)
      c.fill()
    }
    if (shadow) return
    // spots
    c.fillStyle = P.spots
    for (const i of [2, 5, 8]) {
      const p = pts[i]
      c.beginPath()
      c.ellipse(p.x, p.y, width(i) * 0.7, width(i) * 0.5, i, 0, TAU)
      c.fill()
    }
    if (P.dark) {
      c.fillStyle = P.dark
      for (const i of [4, 7]) {
        c.beginPath()
        c.arc(pts[i].x, pts[i].y, width(i) * 0.35, 0, TAU)
        c.fill()
      }
    }
  }
}
