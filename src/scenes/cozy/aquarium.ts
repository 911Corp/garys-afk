import { PALETTES as PX } from '../../engine/pixel'
import { rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { PixelArtScene } from '../pixelart'

/**
 * Fish sprites, facing right. Letters map to the species colours below:
 * a = main body, b = second colour, c = fin, e = eye, w = white.
 */
const SPRITES: Record<string, string[]> = {
  tetra: ['..aaaa..', 'caabbbae', '.aaaaaa.'],
  angel: ['...c....', '..aac...', '.aabbae.', 'caaaaaa.', '.aabba..', '..aac...', '...c....'],
  barb: ['..aaa...', '.abababe', 'caaaaaaa', '.aaaaaa.'],
  tang: ['...aa...', '.aaaaa..', 'caaaaaae', '.aaaaaa.', '...aa...'],
  damsel: ['..aaa..', 'cababae', '.aaaaa.'],
  gramma: ['.aabb..', 'caabbbe', '.aabb..'],
  guppy: ['bb.aa..', 'bbaaaae', 'bb.aa..'],
}
const SPECIES: Record<string, { sprite: string; a: string; b: string; c: string }[]> = {
  community: [
    { sprite: 'tetra', a: '#4ab0e0', b: '#e8404a', c: '#8ad0f0' },
    { sprite: 'angel', a: '#e8e4d8', b: '#3a3a44', c: '#c8c4b8' },
    { sprite: 'barb', a: '#f0b040', b: '#2a2a30', c: '#e86a3a' },
    { sprite: 'guppy', a: '#c8c8d0', b: '#ff6aa0', c: '#ff6aa0' },
  ],
  reef: [
    { sprite: 'tang', a: '#ffd23a', b: '#ffd23a', c: '#ffe680' },
    { sprite: 'damsel', a: '#3a6ae8', b: '#80c0ff', c: '#3a6ae8' },
    { sprite: 'gramma', a: '#a050d0', b: '#ffd23a', c: '#a050d0' },
    { sprite: 'damsel', a: '#f0f0f0', b: '#2a2a30', c: '#f0f0f0' },
  ],
}

type Fish = { x: number; y: number; vx: number; vy: number; dir: number; kind: number; ph: number; turn: number }

export function create(ctx: SceneContext) {
  return new Aquarium(ctx)
}

/** Pixel-art aquarium: sprite fish, swaying plants, sand and pebbles, a bubbler and light from above. */
class Aquarium extends PixelArtScene {
  back!: HTMLCanvasElement
  fish: Fish[] = []
  plants: { x: number; h: number; col: number; kind: number; ph: number }[] = []
  bubbles: { x: number; y: number; s: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.ocean16
  }
  dither() {
    return 0.15
  }
  get pal() {
    const deep = this.str('depth') === 'deep'
    const moon = this.str('light') === 'moon'
    if (moon) return { water: ['#0a1630', '#0c1c3a', '#0e2244', '#10284e'], ray: 'rgba(160,190,255,0.08)', sand: ['#4a4a60', '#5a5a72', '#3a3a50'], rock: ['#24283a', '#34384e', '#444a62'], dim: 0.55 }
    if (deep) return { water: ['#0e3a5a', '#0c3050', '#0a2846', '#08203c'], ray: 'rgba(160,220,255,0.10)', sand: ['#b8a07a', '#d0b88e', '#9a8462'], rock: ['#3a4a5a', '#4e6074', '#62768a'], dim: 0.85 }
    return { water: ['#2aa0c8', '#2290b8', '#1c80a8', '#167098'], ray: 'rgba(230,250,255,0.16)', sand: ['#e8d09a', '#f4e0b0', '#c8b07a'], rock: ['#5a6a78', '#74869a', '#90a2b4'], dim: 1 }
  }
  get species() {
    const s = this.str('species')
    if (s === 'mixed') return [...SPECIES.community, ...SPECIES.reef]
    return SPECIES[s] ?? SPECIES.community
  }
  configure() {
    this.build()
  }
  build() {
    const { PW, PH } = this
    const P = this.pal
    const R = rng(8)
    const s = document.createElement('canvas')
    s.width = PW
    s.height = PH
    const c = s.getContext('2d')!
    const px = (x: number, y: number, w: number, h: number, col: string) => {
      c.fillStyle = col
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }
    const bandH = PH / P.water.length
    P.water.forEach((col, i) => {
      px(0, i * bandH, PW, bandH + 1, col)
      if (i > 0) for (let x = 0; x < PW; x += 2) px(x + (i % 2), i * bandH, 1, 1, P.water[i - 1])
    })
    // back rocks: rounded piles
    const floor = Math.round(PH * 0.84)
    for (let i = 0; i < 5; i++) {
      const rx = R.int(0, PW)
      const rw = R.int(20, 46)
      const rh = R.int(14, 30)
      for (let y = 0; y < rh; y++) {
        const half = Math.round((rw / 2) * Math.sqrt(1 - ((y - rh) / rh) ** 2))
        for (let x = -half; x <= half; x++) {
          const lit = x < -half * 0.3 && y < rh * 0.6
          px(rx + x, floor - rh + y, 1, 1, lit ? P.rock[2] : (x + y) % 5 === 0 ? P.rock[0] : P.rock[1])
        }
      }
    }
    // sand with pebbles
    for (let y = floor; y < PH; y++) for (let x = 0; x < PW; x++) {
      const wave = Math.round(Math.sin(x * 0.08) * 1.5)
      if (y < floor + wave) continue
      px(x, y, 1, 1, (x * 7 + y * 13) % 11 === 0 ? P.sand[2] : y === floor + wave ? P.sand[1] : P.sand[0])
    }
    for (let i = 0; i < PW / 5; i++) px(R.int(0, PW), R.int(floor + 3, PH - 1), R.int(1, 3), 1, R.pick([P.sand[2], '#8a6a5a', '#6a7a8a', '#c87a5a']))
    this.back = s
    this.plants = Array.from({ length: Math.round(PW / 14) }, () => ({ x: R.int(2, PW - 2), h: R.int(16, Math.round(PH * 0.55)), col: R.int(0, 2), kind: R.int(0, 2), ph: R() * 6 }))
    const n = Math.max(3, Math.round(this.num('fish')))
    const sp = this.species
    this.fish = Array.from({ length: n }, () => ({ x: R() * PW, y: R.range(10, floor - 12), vx: R.range(6, 14), vy: 0, dir: R.chance(0.5) ? 1 : -1, kind: R.int(0, sp.length - 1), ph: R() * 6, turn: R.range(3, 12) }))
    this.bubbles = []
  }
  step(dt: number) {
    if (!this.back) return
    const { PW, PH } = this
    const floor = PH * 0.84
    for (const f of this.fish) {
      f.turn -= dt
      if (f.turn < 0) {
        f.turn = this.r.range(3, 12)
        if (this.r.chance(0.4)) f.dir *= -1
        f.vy = this.r.range(-4, 4)
      }
      f.x += f.dir * f.vx * dt
      f.y += (f.vy + Math.sin(this.t * 1.5 + f.ph) * 2) * dt
      if (f.y < 8) f.vy = Math.abs(f.vy)
      if (f.y > floor - 10) f.vy = -Math.abs(f.vy)
      if (f.x < -10) f.dir = 1
      if (f.x > PW + 10) f.dir = -1
    }
    if (this.r.chance(dt * 10)) this.bubbles.push({ x: Math.round(PW * 0.82) + this.r.int(-1, 1), y: floor - 4, s: this.r.chance(0.3) ? 2 : 1 })
    for (const b of this.bubbles) {
      b.y -= dt * (18 + b.s * 6)
      if (this.r.chance(dt * 4)) b.x += this.r.chance(0.5) ? 1 : -1
    }
    this.bubbles = this.bubbles.filter((b) => b.y > 0)
  }
  compose() {
    const { PW, PH } = this
    const P = this.pal
    const t = this.t
    this.b.drawImage(this.back, 0, 0)
    // light shafts from the surface, drifting
    this.b.fillStyle = P.ray
    for (let i = 0; i < 5; i++) {
      const x = ((i * 61 + t * 3) % (PW + 60)) - 30
      this.b.beginPath()
      this.b.moveTo(x, 0)
      this.b.lineTo(x + 10, 0)
      this.b.lineTo(x + 34, PH)
      this.b.lineTo(x + 18, PH)
      this.b.fill()
    }
    // surface shimmer
    for (let x = 0; x < PW; x += 3) if (Math.sin(x * 0.4 + t * 3) > 0.5) this.dot(x, 1, '#ffffff')
    const floor = Math.round(PH * 0.84)
    // plants: tall grass blades and broad-leaf stems, swaying
    const greens = [
      ['#2e7a3a', '#4ea04a'],
      ['#3a8a4a', '#6cbf5a'],
      ['#7a3a3a', '#b05a4a'],
    ]
    for (const p of this.plants) {
      const [d, l] = greens[p.col]
      for (let k = 0; k < p.h; k++) {
        const sway = Math.round(Math.sin(t * 1.2 + p.ph + k * 0.08) * (k / p.h) * 3)
        const y = floor - k
        if (p.kind === 0) {
          this.dot(p.x + sway, y, k % 3 ? d : l)
          this.dot(p.x + 2 + Math.round(sway * 0.8), y + 2, d)
        } else {
          this.dot(p.x + sway, y, d)
          if (k % 4 === 0 && k > 2) {
            this.px(p.x + sway + 1, y, 3, 1, l)
            this.px(p.x + sway - 3, y + 2, 3, 1, l)
          }
        }
      }
    }
    // bubbler stone and the bubble column
    this.px(Math.round(PW * 0.82) - 3, floor - 3, 7, 3, '#5a5a6a')
    for (const b of this.bubbles) {
      if (b.s === 1) this.dot(b.x, b.y, '#e0f6ff')
      else {
        this.dot(b.x, b.y - 1, '#e0f6ff')
        this.dot(b.x - 1, b.y, '#e0f6ff')
        this.dot(b.x + 1, b.y, '#e0f6ff')
        this.dot(b.x, b.y + 1, '#e0f6ff')
      }
    }
    // fish
    const sp = this.species
    for (const f of this.fish) {
      const S = sp[f.kind % sp.length]
      const rows = SPRITES[S.sprite]
      const w = rows[0].length
      const z = 2
      const x0 = Math.round(f.x - w)
      const y0 = Math.round(f.y - rows.length)
      const wag = Math.sin(t * 8 + f.ph) > 0 ? 1 : 0
      rows.forEach((row, ry) => {
        for (let k = 0; k < w; k++) {
          const ch = row[k]
          if (ch === '.') continue
          const col = ch === 'a' ? S.a : ch === 'b' ? S.b : ch === 'c' ? S.c : ch === 'e' ? '#101018' : '#ffffff'
          const xx = f.dir > 0 ? x0 + k : x0 + (w - 1 - k)
          // the tail column flicks up and down
          const tail = ch === 'c' && k < 2 ? wag : 0
          const dx = xx - x0
          this.px(x0 + dx * z, y0 + (ry - tail) * z, z, z, col)
        }
      })
    }
    if (P.dim < 1) {
      this.b.fillStyle = `rgba(4,8,24,${1 - P.dim})`
      this.b.fillRect(0, 0, PW, PH)
    }
    // glass edge reflections
    this.px(0, 0, 1, PH, '#ffffff22')
    this.px(PW - 1, 0, 1, PH, '#00000033')
  }
}
