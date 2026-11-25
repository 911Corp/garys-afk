import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

type Kind = 'tetra' | 'angel' | 'clown' | 'puffer' | 'pleco' | 'tang'
const LOOK: Record<Kind, { len: number; hgt: number; body: string; fin: string; stripe?: string }> = {
  tetra: { len: 6, hgt: 2, body: '#5ab4e5', fin: '#e2614f', stripe: '#b6e3f0' },
  angel: { len: 9, hgt: 11, body: '#f2f0e6', fin: '#8b8598', stripe: '#2b2236' },
  clown: { len: 9, hgt: 5, body: '#f3a64b', fin: '#e2614f', stripe: '#f2f0e6' },
  puffer: { len: 9, hgt: 7, body: '#f7e07a', fin: '#9fd45a', stripe: '#55305a' },
  pleco: { len: 14, hgt: 3, body: '#55305a', fin: '#2b2236' },
  tang: { len: 11, hgt: 7, body: '#2f6fb0', fin: '#f7e07a', stripe: '#0d0b14' },
}
const SETS: Record<string, Kind[]> = {
  community: ['tetra', 'tetra', 'tetra', 'angel', 'pleco'],
  reef: ['clown', 'tang', 'puffer', 'clown', 'tang'],
  mixed: ['tetra', 'tetra', 'clown', 'angel', 'puffer', 'tang', 'pleco'],
}

interface Fish {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  ph: number
  scale: number
}

export function create(ctx: SceneContext) {
  return new Aquarium(ctx)
}

/** Fish with their own manners: tetras school, angelfish cruise, the pleco hugs the sand. */
class Aquarium extends PixelScene {
  fish: Fish[] = []
  plants: { x: number; h: number; ph: number; col: string }[] = []
  rocks: { x: number; w: number; h: number; col: string }[] = []
  bubbles: { x: number; y: number; ph: number }[] = []
  sand = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.console16
  }
  dither() {
    return 0.5
  }
  configure() {
    this.layout()
  }
  layout() {
    const { w, h, u } = this
    this.sand = h * 0.84
    const set = SETS[this.str('species')] ?? SETS.community
    const n = Math.round(this.num('fish') * this.density)
    this.fish = Array.from({ length: n }, (_, i) => {
      const kind = set[i % set.length]
      return { kind, x: this.r() * w, y: this.r.range(h * 0.15, this.sand - 10 * u), vx: 0, vy: 0, tx: this.r() * w, ty: this.r() * h, ph: this.r() * TAU, scale: this.r.range(0.85, 1.15) }
    })
    this.plants = Array.from({ length: Math.round(w / (14 * u)) }, () => ({ x: this.r() * w, h: this.r.range(20, 70) * u, ph: this.r() * TAU, col: this.r.pick(['#3e9a4e', '#25604f', '#9fd45a']) }))
    this.rocks = Array.from({ length: 6 }, () => ({ x: this.r() * w, w: this.r.range(14, 34) * u, h: this.r.range(6, 16) * u, col: this.r.pick(['#8b8598', '#55305a', '#2b2236']) }))
    this.bubbles = []
  }
  step(dt: number) {
    const { w, h, u } = this
    const tetras = this.fish.filter((f) => f.kind === 'tetra')
    const leader = tetras[0]
    for (const f of this.fish) {
      if (f.kind === 'pleco') {
        // the pleco crawls along the sand and stops for long rests
        f.ty = this.sand - 2 * u
        if (Math.abs(f.tx - f.x) < 4 * u || this.r.chance(dt / 20)) f.tx = this.r() * w
      } else if (f.kind === 'tetra' && f !== leader && leader) {
        f.tx = leader.x - Math.sign(leader.vx || 1) * 8 * u + Math.cos(f.ph) * 10 * u
        f.ty = leader.y + Math.sin(f.ph) * 8 * u
      } else if (Math.hypot(f.tx - f.x, f.ty - f.y) < 8 * u || this.r.chance(dt / 12)) {
        f.tx = this.r.range(10 * u, w - 10 * u)
        f.ty = this.r.range(h * 0.12, this.sand - 12 * u)
      }
      const speed = { tetra: 26, angel: 9, clown: 16, puffer: 7, pleco: 4, tang: 14 }[f.kind] * u
      const dx = f.tx - f.x
      const dy = f.ty - f.y
      const d = Math.hypot(dx, dy) || 1
      f.vx += ((dx / d) * speed - f.vx) * Math.min(1, dt * 1.2)
      f.vy += ((dy / d) * speed * 0.5 - f.vy) * Math.min(1, dt * 1.2)
      if (f.kind === 'pleco' && Math.abs(dx) < 4 * u) f.vx *= 0.9
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.ph += dt * (f.kind === 'tetra' ? 0.6 : 1)
    }
    if (this.r.chance(dt * 9)) this.bubbles.push({ x: w * 0.83 + this.r.range(-2, 2) * u, y: this.sand - 4 * u, ph: this.r() * TAU })
    for (const b of this.bubbles) {
      b.y -= dt * 22 * u
      b.x += Math.sin(this.t * 4 + b.ph) * 0.3
    }
    this.bubbles = this.bubbles.filter((b) => b.y > h * 0.04)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const deep = this.str('depth') === 'deep'
    const night = this.str('light') === 'moon'
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, night ? '#1e3d5c' : deep ? '#2f6fb0' : '#5ab4e5')
    g.addColorStop(1, night ? '#0d0b14' : deep ? '#1e3d5c' : '#25604f')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // light rays from the surface, swaying
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.2) + Math.sin(this.t * 0.4 + i) * 20 * u
      const rg = c.createLinearGradient(0, 0, 0, h * 0.8)
      rg.addColorStop(0, `rgba(182,227,240,${night ? 0.12 : 0.3})`)
      rg.addColorStop(1, 'rgba(182,227,240,0)')
      c.fillStyle = rg
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x + 14 * u, 0)
      c.lineTo(x + 40 * u, h * 0.8)
      c.lineTo(x + 10 * u, h * 0.8)
      c.fill()
    }
    // surface shimmer
    c.fillStyle = '#b6e3f0'
    for (let x = 0; x < w; x += 6 * u) if (Math.sin(x * 0.2 + this.t * 3) > 0.3) c.fillRect(x, h * 0.03, 4 * u, 1)
    // sand with pebbles
    c.fillStyle = night ? '#55305a' : '#f3a64b'
    c.fillRect(0, this.sand, w, h)
    c.fillStyle = night ? '#2b2236' : '#e2614f'
    for (let x = 0; x < w; x += 5 * u) c.fillRect(x + ((x * 7) % 3) * u, this.sand + ((x * 13) % 9) * u + 2 * u, u, u)
    for (const r of this.rocks) {
      c.fillStyle = r.col
      c.fillRect(r.x, this.sand - r.h, r.w, r.h + 2 * u)
      c.fillRect(r.x + 2 * u, this.sand - r.h - 2 * u, r.w - 4 * u, 2 * u)
    }
    // plants: stacked segments that sway more towards the top
    for (const p of this.plants) {
      c.fillStyle = p.col
      for (let i = 0; i < p.h; i += Math.max(1, Math.round(u))) {
        const k = i / p.h
        const x = p.x + Math.sin(this.t * 1.2 + p.ph + k * 2) * k * k * 8 * u
        c.fillRect(Math.round(x), Math.round(this.sand - i), Math.max(1, Math.round(2 * u * (1 - k * 0.5))), Math.max(1, Math.round(u)))
        if (i % Math.round(9 * u) === 0 && k > 0.2) c.fillRect(Math.round(x + (i % 2 ? 2 : -3) * u), Math.round(this.sand - i), Math.round(3 * u), Math.max(1, Math.round(u)))
      }
    }
    // bubbler stone and bubbles
    c.fillStyle = '#8b8598'
    c.fillRect(w * 0.83 - 4 * u, this.sand - 3 * u, 8 * u, 3 * u)
    c.fillStyle = '#f2f0e6'
    for (const b of this.bubbles) c.fillRect(Math.round(b.x), Math.round(b.y), Math.max(1, Math.round(u * 1.4)), Math.max(1, Math.round(u * 1.4)))
    // fish
    for (const f of this.fish) this.drawFish(f)
    if (night) {
      c.fillStyle = 'rgba(13,11,20,0.35)'
      c.fillRect(0, 0, w, h)
    }
  }
  drawFish(f: Fish) {
    const c = this.c
    const u = this.u * f.scale
    const L = LOOK[f.kind]
    const dir = f.vx >= 0 ? 1 : -1
    const len = L.len * u
    const hh = L.hgt * u
    const x = Math.round(f.x)
    const y = Math.round(f.y)
    const wag = Math.sin(this.t * (f.kind === 'tetra' ? 14 : 7) + f.ph) * u
    c.save()
    c.translate(x, y)
    c.scale(dir, 1)
    // tail
    c.fillStyle = L.fin
    c.fillRect(-len / 2 - 3 * u, -hh / 2 + wag * 0.5, 3 * u, hh)
    // body: a stepped ellipse
    c.fillStyle = L.body
    const rows = Math.max(1, Math.round(hh))
    for (let i = 0; i < rows; i++) {
      const t = (i + 0.5) / rows - 0.5
      const half = (len / 2) * Math.sqrt(Math.max(0, 1 - t * t * 4))
      c.fillRect(Math.round(-half), Math.round(-hh / 2 + i), Math.round(half * 2), 1)
    }
    if (f.kind === 'angel') {
      c.fillStyle = L.fin
      c.fillRect(-u, -hh / 2 - 3 * u, 2 * u, 3 * u)
      c.fillRect(-u, hh / 2, 2 * u, 3 * u)
    }
    if (L.stripe) {
      c.fillStyle = L.stripe
      if (f.kind === 'tetra') c.fillRect(-len / 2, -u * 0.5, len * 0.8, Math.max(1, u * 0.6))
      else {
        c.fillRect(-len * 0.1, -hh / 2 + u, Math.max(1, u), hh - 2 * u)
        if (f.kind !== 'puffer') c.fillRect(len * 0.22, -hh / 2 + u, Math.max(1, u), hh - 2 * u)
      }
    }
    // eye
    c.fillStyle = '#0d0b14'
    c.fillRect(Math.round(len / 2 - 2.5 * u), Math.round(-hh / 4), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)))
    c.restore()
  }
}
