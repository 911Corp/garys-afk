import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, mix, rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Light = {
  sky: [string, string, string]
  far: string
  rock: [string, string, string]
  moss: [string, string]
  water: [string, string]
  mist: string
  pool: [string, string]
  leaf: [string, string]
  sun: string | null
  moon: boolean
}

const LIGHTS: Record<string, Light> = {
  day: { sky: ['#5aa9d6', '#a8d8ea', '#e9f6f2'], far: '#8fb8b0', rock: ['#2c2a26', '#4b4438', '#6d624f'], moss: ['#3f7a3a', '#6fa84a'], water: ['#cfeef3', '#ffffff'], mist: '255,255,255', pool: ['#3f8fa0', '#1d4f5c'], leaf: ['#1f4a26', '#2f6b34'], sun: '#fff6d8', moon: false },
  golden: { sky: ['#3d3a6e', '#e08a5a', '#ffd58a'], far: '#9a6a6a', rock: ['#241a1c', '#45302c', '#6e4a3a'], moss: ['#4a5a2a', '#8a8a3a'], water: ['#ffe2c0', '#fff6e6'], mist: '255,226,190', pool: ['#7a5a6a', '#2e2236'], leaf: ['#1c1f18', '#2c3020'], sun: '#ffe9a8', moon: false },
  night: { sky: ['#05070f', '#0f1a33', '#22345a'], far: '#1a2a44', rock: ['#07090e', '#121822', '#1e2836'], moss: ['#142a22', '#1f3d2e'], water: ['#9fb8d8', '#e6f0ff'], mist: '170,190,230', pool: ['#1a2a48', '#070b16'], leaf: ['#04070a', '#0a1016'], sun: null, moon: true },
}

type Puff = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number }
type Drop = { x: number; y: number; vx: number; vy: number; life: number }

export function create(ctx: SceneContext) {
  return new Waterfall(ctx)
}

/**
 * A great waterfall seen from the plunge pool: water pours through a notch in a towering cliff,
 * strikes the pool and throws up rolling mist; jungle fronds frame the view.
 * Every element is placed from one geometry (this.G), computed in layout().
 */
class Waterfall extends PixelScene {
  G = { cx: 0, fw: 0, top: 0, pool: 0, spread: 0 }
  back!: HTMLCanvasElement
  front!: HTMLCanvasElement
  streak!: HTMLCanvasElement
  puff!: HTMLCanvasElement
  scroll = 0
  puffs: Puff[] = []
  drops: Drop[] = []
  birds: { a: number; r: number; v: number; y: number }[] = []
  stars: { x: number; y: number; p: number }[] = []
  vines: { x: number; y: number; len: number; ph: number }[] = []
  fronds: { x: number; y: number; a: number; len: number; side: number; ph: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.forest16
  }
  dither() {
    return 0.45
  }
  get L() {
    return LIGHTS[this.str('light')] ?? LIGHTS.day
  }
  configure() {
    this.layout()
  }
  layout() {
    const { w, h, u } = this
    if (!w || !h) return
    const L = this.L
    const portrait = h > w
    const fw = Math.min(w * (portrait ? 0.42 : 0.24), h * 0.32)
    const G = (this.G = { cx: w * 0.5, fw, top: h * (portrait ? 0.2 : 0.14), pool: h * (portrait ? 0.7 : 0.74), spread: fw * 0.14 })
    const R = rng(4242)

    // ---------- background: sky, far ridges, the cliff with its notch ----------
    const b = document.createElement('canvas')
    b.width = w
    b.height = h
    const c = b.getContext('2d')!
    const sky = c.createLinearGradient(0, 0, 0, G.pool)
    sky.addColorStop(0, L.sky[0])
    sky.addColorStop(0.6, L.sky[1])
    sky.addColorStop(1, L.sky[2])
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    for (let k = 0; k < 2; k++) {
      c.fillStyle = mix(L.far, L.sky[2], 0.5 - k * 0.3)
      c.beginPath()
      c.moveTo(0, h)
      for (let x = 0; x <= w; x += 6 * u) c.lineTo(x, G.top - (10 - k * 6) * u - Math.sin(x / ((40 + k * 25) * u) + k) * (8 + k * 4) * u - Math.sin(x / (11 * u)) * 2 * u)
      c.lineTo(w, h)
      c.fill()
    }
    // the cliff's top edge rises away from the notch the river pours through
    const edgeY = (x: number) => {
      const d = Math.abs(x - G.cx) - fw / 2
      if (d < 0) return G.top
      return G.top - Math.min(1, d / (w * 0.35)) * (G.top - h * 0.02) * 0.55 - Math.sin(x / (7 * u)) * 1.5 * u
    }
    const tops: number[] = []
    for (let x = 0; x <= w + 4 * u; x += 4 * u) tops.push(edgeY(x) - R() * 1.5 * u)
    const cliffPath = () => {
      c.beginPath()
      c.moveTo(0, h)
      tops.forEach((y, i) => c.lineTo(i * 4 * u, y))
      c.lineTo(w, h)
    }
    const rockG = c.createLinearGradient(0, G.top, 0, G.pool)
    rockG.addColorStop(0, L.rock[2])
    rockG.addColorStop(1, L.rock[1])
    c.fillStyle = rockG
    cliffPath()
    c.fill()
    c.save()
    cliffPath()
    c.clip()
    for (let i = 0; i < 260; i++) {
      const x = R() * w
      const y = R.range(0, G.pool)
      const s = R.range(6, 22) * u
      c.fillStyle = R.chance(0.5) ? L.rock[0] : L.rock[2]
      c.globalAlpha = R.range(0.15, 0.45)
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + s, y + R.range(-0.2, 0.3) * s)
      c.lineTo(x + s * R.range(0.6, 1.1), y + s * R.range(0.5, 1.2))
      c.lineTo(x - s * 0.1, y + s * R.range(0.4, 0.9))
      c.fill()
    }
    c.globalAlpha = 1
    c.strokeStyle = L.rock[0]
    c.lineWidth = Math.max(1, 0.8 * u)
    for (let y = G.top + 8 * u; y < G.pool; y += R.range(9, 16) * u) {
      c.globalAlpha = 0.5
      c.beginPath()
      for (let x = 0; x <= w; x += 8 * u) c.lineTo(x, y + Math.sin(x / (23 * u) + y) * 2 * u + (R() - 0.5) * 1.5 * u)
      c.stroke()
      // moss on each ledge, away from the water
      for (let x = R() * 20 * u; x < w; x += R.range(14, 40) * u) {
        if (Math.abs(x - G.cx) < fw * 0.75) continue
        if (R.chance(0.45)) continue
        c.globalAlpha = R.range(0.35, 0.7)
        c.fillStyle = R.chance(0.7) ? L.moss[0] : L.moss[1]
        c.beginPath()
        c.ellipse(x, y - 1 * u, R.range(4, 12) * u, R.range(1.2, 2.6) * u, 0, Math.PI, TAU)
        c.fill()
      }
    }
    c.globalAlpha = 1
    // wet, darker rock right behind the water
    const wet = c.createLinearGradient(G.cx - fw, 0, G.cx + fw, 0)
    wet.addColorStop(0, 'rgba(0,0,0,0)')
    wet.addColorStop(0.5, 'rgba(0,0,0,0.45)')
    wet.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = wet
    c.fillRect(G.cx - fw, G.top, fw * 2, G.pool - G.top)
    c.restore()
    // vegetation and a few trees along the rim
    for (let i = 0; i < tops.length; i++) {
      const x = i * 4 * u
      if (Math.abs(x - G.cx) < fw * 0.62) continue
      const y = tops[i]
      c.fillStyle = R.chance(0.5) ? L.moss[0] : L.leaf[1]
      c.beginPath()
      c.arc(x, y, R.range(3, 7) * u, 0, TAU)
      c.fill()
      if (R.chance(0.12)) {
        const th = R.range(14, 26) * u
        c.fillStyle = L.leaf[0]
        c.fillRect(x - 0.7 * u, y - th, 1.4 * u, th)
        c.beginPath()
        c.ellipse(x, y - th, R.range(6, 10) * u, R.range(4, 7) * u, 0, 0, TAU)
        c.fill()
      }
    }
    // the river channel at the lip
    c.fillStyle = L.water[0]
    c.fillRect(G.cx - fw / 2 - 2 * u, G.top - 3 * u, fw + 4 * u, 4 * u)
    this.back = b

    this.vines = Array.from({ length: Math.max(4, Math.round(w / (u * 22))) }, () => {
      let x = R() * w
      if (Math.abs(x - G.cx) < fw * 0.7) x += (x < G.cx ? -1 : 1) * fw
      return { x, y: edgeY(x), len: R.range(20, 70) * u, ph: R() * TAU }
    })

    // ---------- foreground: dark bank, rocks, and fronds ----------
    const f = document.createElement('canvas')
    f.width = w
    f.height = h
    const fc = f.getContext('2d')!
    fc.fillStyle = L.leaf[0]
    fc.beginPath()
    fc.moveTo(0, h)
    for (let x = 0; x <= w; x += 6 * u) {
      const k = Math.abs(x - w / 2) / (w / 2)
      fc.lineTo(x, h - (6 + k * k * 34) * u - Math.sin(x / (9 * u)) * 2 * u)
    }
    fc.lineTo(w, h)
    fc.fill()
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1
      const x = side < 0 ? R.range(-10, w * 0.22) : R.range(w * 0.78, w + 10)
      const ry = h - R.range(4, 26) * u
      const rw = R.range(8, 20) * u
      const rh = R.range(5, 12) * u
      fc.fillStyle = L.rock[1]
      fc.beginPath()
      fc.ellipse(x, ry, rw, rh, 0, 0, TAU)
      fc.fill()
      fc.fillStyle = L.rock[2]
      fc.beginPath()
      fc.ellipse(x - rw * 0.2, ry - rh * 0.35, rw * 0.6, rh * 0.4, 0, 0, TAU)
      fc.fill()
      fc.fillStyle = L.moss[0]
      fc.beginPath()
      fc.ellipse(x + rw * 0.1, ry - rh * 0.8, rw * 0.5, rh * 0.25, 0, Math.PI, TAU)
      fc.fill()
    }
    this.front = f
    this.fronds = []
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1
      this.fronds.push({ x: side < 0 ? R.range(-8, 18) * u : w - R.range(-8, 18) * u, y: h - R.range(0, 40) * u, a: side < 0 ? R.range(-1.4, -0.3) : R.range(-2.8, -1.7), len: R.range(40, 75) * u, side, ph: R() * TAU })
    }

    // ---------- water texture: vertical streaks, tiled downward ----------
    const sw = Math.max(8, Math.ceil(fw + G.spread * 2))
    const sh = Math.max(64, Math.ceil(h * 0.6))
    const s = document.createElement('canvas')
    s.width = sw
    s.height = sh
    const sc = s.getContext('2d')!
    for (let i = 0; i < sw * 1.6; i++) {
      const x = R() * sw
      const y = R() * sh
      const len = R.range(0.1, 0.5) * sh
      sc.fillStyle = R.chance(0.6) ? L.water[1] : L.water[0]
      sc.globalAlpha = R.range(0.15, 0.7)
      const ww = R.range(0.5, 2.2) * u
      sc.fillRect(x, y, ww, len)
      if (y + len > sh) sc.fillRect(x, y - sh, ww, len)
    }
    this.streak = s

    // ---------- a soft mist puff sprite ----------
    const p = document.createElement('canvas')
    p.width = p.height = 64
    const pc = p.getContext('2d')!
    const pg = pc.createRadialGradient(32, 32, 0, 32, 32, 32)
    pg.addColorStop(0, `rgba(${L.mist},0.9)`)
    pg.addColorStop(0.5, `rgba(${L.mist},0.35)`)
    pg.addColorStop(1, `rgba(${L.mist},0)`)
    pc.fillStyle = pg
    pc.fillRect(0, 0, 64, 64)
    this.puff = p

    this.puffs = []
    this.drops = []
    this.birds = Array.from({ length: 4 }, () => ({ a: R() * TAU, r: R.range(0.15, 0.35), v: R.range(0.15, 0.3) * (R.chance(0.5) ? 1 : -1), y: R.range(0.3, 0.5) }))
    this.stars = Array.from({ length: 90 }, () => ({ x: R() * w, y: R() * G.top, p: R() * TAU }))
  }
  step(dt: number) {
    const { u } = this
    const G = this.G
    if (!this.streak) return
    const flow = this.num('flow')
    this.scroll = (this.scroll + dt * 150 * u * (0.6 + flow * 0.4)) % this.streak.height
    const n = dt * 14 * flow * this.density
    for (let i = 0; i < n; i++) {
      const max = this.r.range(2.5, 5)
      this.puffs.push({ x: G.cx + this.r.range(-0.6, 0.6) * G.fw, y: G.pool + this.r.range(-4, 6) * u, vx: this.r.range(-14, 14) * u, vy: -this.r.range(6, 18) * u, r: this.r.range(8, 16) * u * (0.6 + flow * 0.4), life: max, max })
    }
    for (const p of this.puffs) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= Math.pow(0.7, dt)
      p.r += dt * 9 * u
      p.life -= dt
    }
    this.puffs = this.puffs.filter((p) => p.life > 0)
    if (this.puffs.length > 260) this.puffs.splice(0, this.puffs.length - 260)
    const m = dt * 70 * flow * this.density
    for (let i = 0; i < m; i++)
      this.drops.push({ x: G.cx + this.r.range(-0.55, 0.55) * G.fw, y: G.pool, vx: this.r.range(-40, 40) * u, vy: -this.r.range(20, 60) * u, life: this.r.range(0.6, 1.3) })
    for (const d of this.drops) {
      d.vy += 90 * u * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.life -= dt
    }
    this.drops = this.drops.filter((d) => d.life > 0)
    for (const b of this.birds) b.a += b.v * dt
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const G = this.G
    const L = this.L
    const t = this.g.reducedMotion ? 0 : this.t
    c.drawImage(this.back, 0, 0)
    if (L.moon) {
      for (const s of this.stars) {
        c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(this.t * 0.6 + s.p))
        c.fillStyle = '#e6f0ff'
        c.fillRect(s.x, s.y, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
      }
      c.globalAlpha = 1
      glow(c, w * 0.78, h * 0.08, 30 * u, 'rgba(230,240,255,0.5)')
      c.fillStyle = '#f2f6ff'
      c.beginPath()
      c.arc(w * 0.78, h * 0.08, 7 * u, 0, TAU)
      c.fill()
    }
    if (L.sun) {
      // light shafts falling across the gorge
      const sx = w * 0.18
      const sy = -h * 0.05
      c.fillStyle = L.sun
      for (let i = 0; i < 5; i++) {
        const a = 0.55 + i * 0.16 + Math.sin(this.t * 0.1 + i) * 0.02
        c.globalAlpha = 0.07
        c.beginPath()
        c.moveTo(sx, sy)
        c.lineTo(sx + Math.cos(a) * h * 1.6, sy + Math.sin(a) * h * 1.6)
        c.lineTo(sx + Math.cos(a + 0.06) * h * 1.6, sy + Math.sin(a + 0.06) * h * 1.6)
        c.fill()
      }
      c.globalAlpha = 1
    }
    // vines
    c.strokeStyle = L.moss[0]
    c.lineWidth = Math.max(1, 0.8 * u)
    for (const v of this.vines) {
      const sway = Math.sin(t * 0.8 + v.ph) * 3 * u
      c.beginPath()
      c.moveTo(v.x, v.y)
      c.quadraticCurveTo(v.x + sway * 0.5, v.y + v.len * 0.5, v.x + sway, v.y + v.len)
      c.stroke()
      c.fillStyle = L.moss[1]
      for (let k = 1; k < 7; k++) {
        c.beginPath()
        c.ellipse(v.x + sway * (k / 7) + (k % 2 ? 1.2 : -1.2) * u, v.y + (v.len * k) / 7, 1.6 * u, 0.8 * u, k % 2 ? 0.5 : -0.5, 0, TAU)
        c.fill()
      }
    }
    // the water curtain leaves the lip with a slight arc, then widens as it falls
    const top = G.top
    const bot = G.pool
    const half = G.fw / 2
    c.save()
    c.beginPath()
    c.moveTo(G.cx - half, top - 2 * u)
    c.quadraticCurveTo(G.cx - half - G.spread * 0.4, top + (bot - top) * 0.15, G.cx - half - G.spread, bot)
    c.lineTo(G.cx + half + G.spread, bot)
    c.quadraticCurveTo(G.cx + half + G.spread * 0.4, top + (bot - top) * 0.15, G.cx + half, top - 2 * u)
    c.closePath()
    c.clip()
    const sx0 = G.cx - half - G.spread
    const wg = c.createLinearGradient(sx0, 0, G.cx + half + G.spread, 0)
    wg.addColorStop(0, mix(L.water[0], L.pool[0], 0.35))
    wg.addColorStop(0.3, L.water[0])
    wg.addColorStop(0.5, L.water[1])
    wg.addColorStop(0.7, L.water[0])
    wg.addColorStop(1, mix(L.water[0], L.pool[0], 0.35))
    c.fillStyle = wg
    c.fillRect(sx0, top - 2 * u, G.fw + G.spread * 2, bot - top + 4 * u)
    for (const [k, a] of [
      [1, 0.9],
      [0.6, 0.5],
    ] as const) {
      const off = (this.scroll * k) % this.streak.height
      c.globalAlpha = a
      for (let y = top - this.streak.height + off; y < bot; y += this.streak.height) c.drawImage(this.streak, sx0, y)
    }
    c.globalAlpha = 1
    c.fillStyle = 'rgba(0,0,0,0.18)'
    c.fillRect(sx0, top, G.spread + 2 * u, bot - top)
    c.fillRect(G.cx + half - 2 * u, top, G.spread + 2 * u, bot - top)
    c.restore()
    c.fillStyle = L.water[1]
    c.beginPath()
    c.ellipse(G.cx, top - 1 * u, half + 1 * u, 2.2 * u, 0, 0, TAU)
    c.fill()
    // plunge pool
    const pg = c.createLinearGradient(0, bot, 0, h)
    pg.addColorStop(0, L.pool[0])
    pg.addColorStop(1, L.pool[1])
    c.fillStyle = pg
    c.fillRect(0, bot, w, h - bot)
    const refl = c.createLinearGradient(0, bot, 0, bot + (h - bot) * 0.6)
    refl.addColorStop(0, `rgba(${L.mist},0.35)`)
    refl.addColorStop(1, `rgba(${L.mist},0)`)
    c.fillStyle = refl
    c.fillRect(sx0 - G.spread, bot, G.fw + G.spread * 4, (h - bot) * 0.6)
    c.strokeStyle = `rgba(${L.mist},0.5)`
    c.lineWidth = Math.max(1, 0.7 * u)
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.25 + i / 6) % 1
      c.globalAlpha = (1 - k) * 0.8
      c.beginPath()
      c.ellipse(G.cx, bot + 3 * u + k * 10 * u, G.fw * (0.7 + k * 1.8), (h - bot) * (0.05 + k * 0.25), 0, 0, Math.PI)
      c.stroke()
    }
    c.globalAlpha = 1
    // churning foam at the impact
    c.fillStyle = L.water[1]
    for (let i = 0; i < 14; i++) {
      const x = G.cx + Math.sin(i * 2.3 + t * 3) * G.fw * 0.55
      const y = bot + Math.cos(i * 1.7 + t * 4) * 2 * u
      c.beginPath()
      c.ellipse(x, y, (5 + (i % 4) * 2) * u, 2.5 * u, 0, 0, TAU)
      c.fill()
    }
    // a low band of mist over the pool
    const band = c.createLinearGradient(0, bot - G.fw * 0.9, 0, bot + 8 * u)
    band.addColorStop(0, `rgba(${L.mist},0)`)
    band.addColorStop(1, `rgba(${L.mist},${0.28 * Math.min(1.5, this.num('flow'))})`)
    c.fillStyle = band
    c.fillRect(G.cx - G.fw * 1.6, bot - G.fw * 0.9, G.fw * 3.2, G.fw * 0.9 + 8 * u)
    // mist and spray
    for (const p of this.puffs) {
      const k = p.life / p.max
      c.globalAlpha = Math.min(1, k * 1.6) * 0.2
      c.drawImage(this.puff, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
    }
    c.globalAlpha = 1
    c.fillStyle = L.water[1]
    for (const d of this.drops) {
      c.globalAlpha = Math.min(1, d.life)
      c.fillRect(d.x, d.y, Math.max(1, 0.7 * u), Math.max(1, 1.2 * u))
    }
    c.globalAlpha = 1
    // birds circling in front of the cliff
    c.strokeStyle = L.leaf[0]
    c.lineWidth = Math.max(1, 0.8 * u)
    for (const b of this.birds) {
      const x = G.cx + Math.cos(b.a) * b.r * w
      const y = b.y * h + Math.sin(b.a * 2) * 0.05 * h
      const fl = Math.sin(this.t * 9 + b.a * 5) * 2 * u
      c.beginPath()
      c.moveTo(x - 4 * u, y - fl)
      c.lineTo(x, y)
      c.lineTo(x + 4 * u, y - fl)
      c.stroke()
    }
    // foreground bank and fronds framing the view
    c.drawImage(this.front, 0, 0)
    for (const f of this.fronds) {
      const a = f.a + Math.sin(t * 0.9 + f.ph) * 0.05
      const ex = f.x + Math.cos(a) * f.len
      const ey = f.y + Math.sin(a) * f.len
      const mx = f.x + Math.cos(a) * f.len * 0.5 + Math.cos(a + Math.PI / 2) * f.len * 0.12 * f.side
      const my = f.y + Math.sin(a) * f.len * 0.5 + Math.sin(a + Math.PI / 2) * f.len * 0.12 * f.side
      c.strokeStyle = L.leaf[1]
      c.lineWidth = Math.max(1, u)
      c.beginPath()
      c.moveTo(f.x, f.y)
      c.quadraticCurveTo(mx, my, ex, ey)
      c.stroke()
      c.fillStyle = L.leaf[0]
      for (let k = 1; k <= 9; k++) {
        const q = k / 10
        const px = (1 - q) * (1 - q) * f.x + 2 * (1 - q) * q * mx + q * q * ex
        const py = (1 - q) * (1 - q) * f.y + 2 * (1 - q) * q * my + q * q * ey
        const ll = f.len * 0.22 * (1 - q * 0.6)
        for (const s of [-1, 1]) {
          c.beginPath()
          c.ellipse(px + Math.cos(a + s * 1.1) * ll * 0.5, py + Math.sin(a + s * 1.1) * ll * 0.5, ll * 0.5, ll * 0.12, a + s * 1.1, 0, TAU)
          c.fill()
        }
      }
    }
  }
}
