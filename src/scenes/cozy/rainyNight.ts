import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

const CITY: Record<string, { sky: [string, string]; win: string[] }> = {
  warm: { sky: ['#05060d', '#16244a'], win: ['#ffcf6a', '#ff8a5c', '#fff3b0'] },
  cool: { sky: ['#05060d', '#0d1226'], win: ['#b5d0f0', '#6a95d4', '#f2f4ff'] },
  neon: { sky: ['#05060d', '#2a1a3a'], win: ['#a3487a', '#ff8a5c', '#6a95d4', '#ffcf6a'] },
}

interface Drop {
  x: number
  y: number
  r: number
  vy: number
  still: boolean
}

export function create(ctx: SceneContext) {
  return new RainyNight(ctx)
}

/** Looking out of a window at a rainy city: drops sit, grow, then slide down the glass. */
class RainyNight extends PixelScene {
  city: HTMLCanvasElement | null = null
  windows: { x: number; y: number; on: boolean; c: string }[] = []
  streaks: { x: number; y: number; v: number; l: number }[] = []
  drops: Drop[] = []
  trail: { x: number; y: number; a: number }[] = []
  flash = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.5
  }
  get frame() {
    return { x: this.w * 0.08, y: this.h * 0.06, w: this.w * 0.84, h: this.h * 0.72 }
  }
  layout() {
    const { w, h, u } = this
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    const pal = CITY[this.str('city')] ?? CITY.warm
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, pal.sky[0])
    g.addColorStop(1, pal.sky[1])
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    this.windows = []
    // three rows of buildings, far to near
    for (const [layer, base, col] of [
      [0, 0.55, '#0d1226'],
      [1, 0.62, '#0a0e1c'],
      [2, 0.7, '#05060d'],
    ] as const) {
      let x = -10 * u
      while (x < w) {
        const bw = this.r.range(18, 40) * u
        const bh = this.r.range(30, 90) * u * (1 - layer * 0.15)
        const top = h * base - bh
        c.fillStyle = col
        c.fillRect(x, top, bw, h)
        if (layer > 0)
          for (let wy = top + 4 * u; wy < h * 0.8; wy += 5 * u)
            for (let wx = x + 3 * u; wx < x + bw - 3 * u; wx += 5 * u) this.windows.push({ x: wx, y: wy, on: this.r.chance(0.14), c: this.r.pick(pal.win) })
        if (this.r.chance(0.3)) c.fillRect(x + bw / 2, top - 8 * u, 1 * u, 8 * u)
        x += bw + this.r.range(1, 5) * u
      }
    }
    this.city = cv
    this.streaks = Array.from({ length: Math.round(140 * this.num('rain')) }, () => this.newStreak(true))
    this.drops = []
  }
  configure() {
    this.layout()
  }
  newStreak(any: boolean) {
    return { x: this.r.range(0, this.w), y: any ? this.r.range(0, this.h) : -10, v: this.r.range(120, 200) * this.u, l: this.r.range(3, 7) * this.u }
  }
  step(dt: number) {
    const { u } = this
    const f = this.frame
    for (const s of this.streaks) {
      s.y += s.v * dt
      s.x -= s.v * dt * 0.15
      if (s.y > this.h) Object.assign(s, this.newStreak(false))
    }
    // static drops land on the glass and slowly grow
    const want = 160 * this.num('glass') * this.density
    if (this.drops.length < want && this.r.chance(dt * 30)) this.drops.push({ x: f.x + this.r() * f.w, y: f.y + this.r() * f.h, r: this.r.range(0.6, 1.6) * u, vy: 0, still: true })
    for (const d of this.drops) {
      if (d.still) {
        d.r += dt * 0.05 * u
        if (d.r > 2.2 * u && this.r.chance(dt * 0.5)) d.still = false
      } else {
        d.vy = Math.min(40 * u, d.vy + dt * 30 * u)
        d.y += d.vy * dt * (0.6 + Math.sin(this.t * 3 + d.x) * 0.4)
        d.x += Math.sin(d.y * 0.3) * 0.08
        if (this.r.chance(dt * 6)) this.trail.push({ x: d.x, y: d.y - d.r, a: 0 })
        // swallow the small drops in its path
        for (const o of this.drops) if (o !== d && o.still && Math.abs(o.x - d.x) < d.r + o.r && Math.abs(o.y - d.y) < d.r + o.r) o.r = 0
      }
    }
    this.drops = this.drops.filter((d) => d.r > 0 && d.y < f.y + f.h)
    for (const t of this.trail) t.a += dt
    this.trail = this.trail.filter((t) => t.a < 6)
    if (this.windows.length && this.r.chance(dt * 2)) {
      const wn = this.r.pick(this.windows)
      wn.on = !wn.on
    }
    if (this.bool('lightning') && !this.g.noFlash && this.flash <= 0 && this.r.chance(dt / 40)) {
      this.flash = 0.5
      this.emit({ type: 'thunder', strength: 0.4, delay: 2.5 })
    }
    this.flash = Math.max(0, this.flash - dt)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const f = this.frame
    c.drawImage(this.city!, 0, 0)
    for (const wn of this.windows) {
      if (!wn.on) continue
      c.fillStyle = wn.c
      c.fillRect(wn.x, wn.y, 2 * u, 2 * u)
    }
    if (this.flash > 0) {
      c.fillStyle = `rgba(181,208,240,${this.flash * (this.g.reducedMotion ? 0.2 : 0.5)})`
      c.fillRect(0, 0, w, h)
    }
    // rain behind the glass
    c.fillStyle = 'rgba(181,208,240,0.45)'
    for (const s of this.streaks) {
      for (let i = 0; i < s.l; i += Math.max(1, u)) c.fillRect(Math.round(s.x + i * 0.15), Math.round(s.y - i), Math.max(1, Math.round(u * 0.6)), Math.max(1, Math.round(u)))
    }
    // a little fog at the bottom of the glass
    const fog = c.createLinearGradient(0, f.y + f.h * 0.6, 0, f.y + f.h)
    fog.addColorStop(0, 'rgba(106,149,212,0)')
    fog.addColorStop(1, 'rgba(106,149,212,0.35)')
    c.fillStyle = fog
    c.fillRect(f.x, f.y, f.w, f.h)
    // trails and drops on the glass
    for (const t of this.trail) {
      c.fillStyle = `rgba(181,208,240,${0.5 - t.a * 0.08})`
      c.fillRect(Math.round(t.x), Math.round(t.y), Math.max(1, Math.round(u * 0.7)), Math.max(1, Math.round(u * 0.7)))
    }
    for (const d of this.drops) {
      const r = Math.max(1, Math.round(d.r))
      c.fillStyle = '#16244a'
      c.fillRect(Math.round(d.x - r), Math.round(d.y - r + 1), r * 2, r * 2)
      c.fillStyle = '#6a95d4'
      c.fillRect(Math.round(d.x - r), Math.round(d.y - r), r * 2, r * 2 - 1)
      c.fillStyle = '#f2f4ff'
      c.fillRect(Math.round(d.x - r + 1), Math.round(d.y - r), Math.max(1, r - 1), 1)
    }
    // window frame and room
    c.fillStyle = '#0d1226'
    c.fillRect(0, 0, w, f.y)
    c.fillRect(0, 0, f.x, h)
    c.fillRect(f.x + f.w, 0, w, h)
    c.fillRect(0, f.y + f.h, w, h)
    c.fillStyle = '#24407a'
    c.fillRect(f.x - 3 * u, f.y - 3 * u, f.w + 6 * u, 3 * u)
    c.fillRect(f.x - 3 * u, f.y, 3 * u, f.h)
    c.fillRect(f.x + f.w, f.y, 3 * u, f.h)
    c.fillRect(f.x + f.w / 2 - 1.5 * u, f.y, 3 * u, f.h)
    c.fillRect(f.x, f.y + f.h * 0.45, f.w, 2 * u)
    // sill
    c.fillStyle = '#3a63a8'
    c.fillRect(f.x - 8 * u, f.y + f.h, f.w + 16 * u, 5 * u)
    c.fillStyle = '#16244a'
    c.fillRect(f.x - 8 * u, f.y + f.h + 5 * u, f.w + 16 * u, 2 * u)
    const sy = f.y + f.h
    if (this.bool('candle')) {
      const cx = f.x + f.w * 0.22
      const fl = Math.floor(this.t * 8) % 3
      const g = c.createRadialGradient(cx, sy - 14 * u, 1, cx, sy - 14 * u, 40 * u)
      g.addColorStop(0, 'rgba(255,138,92,0.22)')
      g.addColorStop(1, 'rgba(255,138,92,0)')
      c.fillStyle = g
      c.fillRect(cx - 40 * u, sy - 54 * u, 80 * u, 60 * u)
      c.fillStyle = '#f2f4ff'
      c.fillRect(cx - 2 * u, sy - 10 * u, 4 * u, 10 * u)
      c.fillStyle = fl ? '#ffcf6a' : '#ff8a5c'
      c.fillRect(cx - 1 * u, sy - 14 * u - (fl === 2 ? u : 0), 2 * u, 3 * u)
    }
    // mug and a small plant
    const mx = f.x + f.w * 0.7
    c.fillStyle = '#a3487a'
    c.fillRect(mx, sy - 7 * u, 7 * u, 7 * u)
    c.fillRect(mx + 7 * u, sy - 5 * u, 2 * u, 3 * u)
    c.fillStyle = '#5a2d5c'
    c.fillRect(mx + 14 * u, sy - 6 * u, 9 * u, 6 * u)
    c.fillStyle = '#3f7a4a'
    c.fillRect(mx + 15 * u, sy - 12 * u, 2 * u, 6 * u)
    c.fillRect(mx + 18 * u, sy - 15 * u, 2 * u, 9 * u)
    c.fillRect(mx + 21 * u, sy - 11 * u, 2 * u, 5 * u)
  }
}
