import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

const PAL = ['#0b0a14', '#1c1a2e', '#2e2a4a', '#4a3e6a', '#7a5a8a', '#c47a6a', '#f2a65a', '#ffd88a', '#fff4d0', '#2a3a2a', '#3f5a32', '#6a8a42', '#a8b85a', '#5a3a2a', '#8a5a3a', '#c48a5a']

/** Villager sprite, 2 frames, 5x8. h = hood/hair, b = body, s = skin, l = legs. */
const WALK = [
  ['.hhh.', '.sss.', '.sss.', 'bbbbb', '.bbb.', '.bbb.', '.l.l.', 'l...l'],
  ['.hhh.', '.sss.', '.sss.', 'bbbbb', '.bbb.', '.bbb.', '.l.l.', '.l.l.'],
]

interface House {
  x: number
  w: number
  h: number
  roof: string
  wall: string
  chimney: boolean
}

export function create(ctx: SceneContext) {
  return new MedievalVillage(ctx)
}

/** A village at the turn of the day: windmill, smithy sparks, chimney smoke, villagers on the road, a river. */
class MedievalVillage extends PixelScene {
  houses: House[] = []
  folk: { x: number; v: number; col: string; hood: string }[] = []
  smoke: { x: number; y: number; a: number }[] = []
  sparks: { x: number; y: number; vx: number; vy: number; a: number }[] = []
  birds: { x: number; y: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PAL
  }
  dither() {
    return 0.5
  }
  get road() {
    return Math.round(this.h * 0.74)
  }
  configure() {
    this.layout()
  }
  layout() {
    const { w, u } = this
    this.houses = []
    let x = w * 0.04
    while (x < w * 0.95) {
      const hw = this.r.range(26, 40) * u
      if (x > w * 0.56 && x < w * 0.74) {
        x = w * 0.74
        continue // room for the windmill
      }
      this.houses.push({ x, w: hw, h: this.r.range(16, 26) * u, roof: this.r.pick(['#8a5a3a', '#c47a6a', '#5a3a2a']), wall: this.r.pick(['#fff4d0', '#c48a5a', '#ffd88a']), chimney: this.r.chance(0.6) })
      x += hw + this.r.range(6, 14) * u
    }
    this.folk = Array.from({ length: Math.round(this.num('villagers')) }, () => ({ x: this.r() * w, v: this.r.range(5, 11) * u * (this.r.chance(0.5) ? 1 : -1), col: this.r.pick(['#4a3e6a', '#c47a6a', '#3f5a32', '#8a5a3a']), hood: this.r.pick(['#5a3a2a', '#f2a65a', '#2e2a4a']) }))
  }
  /** 0..1 darkness, from the setting or a slow day/night cycle. */
  dark() {
    const mode = this.str('time')
    if (mode === 'day') return 0
    if (mode === 'night') return 1
    if (mode === 'dusk') return 0.45
    return 0.5 - 0.5 * Math.cos((this.t / (this.num('cycle') * 60)) * Math.PI * 2 + Math.PI * 0.6)
  }
  step(dt: number) {
    const { w, u } = this
    for (const f of this.folk) {
      f.x += f.v * dt
      if (f.x > w + 6 * u) f.x = -6 * u
      if (f.x < -6 * u) f.x = w + 6 * u
    }
    for (const hs of this.houses) if (hs.chimney && this.r.chance(dt * 1.2)) this.smoke.push({ x: hs.x + hs.w * 0.75, y: this.road - hs.h - 16 * u, a: 0 })
    for (const s of this.smoke) {
      s.a += dt
      s.y -= dt * 5 * u
      s.x += dt * 3 * u
    }
    this.smoke = this.smoke.filter((s) => s.a < 5)
    // smithy: hammer strikes throw sparks
    const smith = this.houses[1]
    if (smith && Math.floor(this.t * 1.5) !== Math.floor((this.t - dt) * 1.5))
      for (let i = 0; i < 6; i++) this.sparks.push({ x: smith.x + smith.w + 4 * u, y: this.road - 6 * u, vx: this.r.range(-12, 12) * u, vy: -this.r.range(8, 20) * u, a: 0 })
    for (const s of this.sparks) {
      s.a += dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vy += 40 * u * dt
    }
    this.sparks = this.sparks.filter((s) => s.a < 0.6)
    if (this.dark() < 0.6 && this.birds.length < 3 && this.r.chance(dt / 8)) this.birds.push({ x: -5, y: this.r.range(0.08, 0.3) * this.h })
    for (const b of this.birds) b.x += dt * 24 * u
    this.birds = this.birds.filter((b) => b.x < w + 5)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const dk = this.dark()
    const road = this.road
    const sky = c.createLinearGradient(0, 0, 0, road)
    sky.addColorStop(0, dk > 0.6 ? '#0b0a14' : dk > 0.3 ? '#4a3e6a' : '#7a5a8a')
    sky.addColorStop(1, dk > 0.6 ? '#2e2a4a' : dk > 0.3 ? '#f2a65a' : '#ffd88a')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    // sun or moon
    c.fillStyle = dk > 0.6 ? '#fff4d0' : '#fff4d0'
    c.beginPath()
    c.arc(w * 0.2, h * (0.12 + dk * 0.1), (dk > 0.6 ? 6 : 10) * u, 0, Math.PI * 2)
    c.fill()
    if (dk > 0.6) {
      c.fillStyle = '#fff4d0'
      for (let i = 0; i < 40; i++) c.fillRect((i * 97) % w, (i * 53) % (h * 0.4), 1, 1)
    }
    // distant hills
    c.fillStyle = dk > 0.6 ? '#1c1a2e' : '#3f5a32'
    for (let x = 0; x < w; x++) {
      const y = road - 24 * u - Math.sin(x * 0.015 / u) * 10 * u - Math.sin(x * 0.04 / u) * 4 * u
      c.fillRect(x, Math.round(y), 1, road)
    }
    // windmill
    const mx = w * 0.65
    const my = road
    c.fillStyle = dk > 0.6 ? '#2e2a4a' : '#c48a5a'
    for (let i = 0; i < 40 * u; i++) c.fillRect(Math.round(mx - (8 + i * 0.12) * u), Math.round(my - 40 * u + i), Math.round((16 + i * 0.24) * u), 1)
    c.fillStyle = '#5a3a2a'
    c.fillRect(mx - 3 * u, my - 10 * u, 6 * u, 10 * u)
    const hub = { x: mx, y: my - 38 * u }
    const ang = this.t * 0.6 * this.num('wind')
    c.strokeStyle = dk > 0.6 ? '#4a3e6a' : '#fff4d0'
    c.lineWidth = Math.max(1, Math.round(3 * u))
    for (let k = 0; k < 4; k++) {
      const a = ang + (k * Math.PI) / 2
      c.beginPath()
      c.moveTo(hub.x, hub.y)
      c.lineTo(hub.x + Math.cos(a) * 26 * u, hub.y + Math.sin(a) * 26 * u)
      c.stroke()
    }
    c.fillStyle = '#5a3a2a'
    c.fillRect(hub.x - 2 * u, hub.y - 2 * u, 4 * u, 4 * u)
    // houses
    for (const hs of this.houses) {
      const top = road - hs.h
      c.fillStyle = dk > 0.6 ? '#4a3e6a' : hs.wall
      c.fillRect(hs.x, top, hs.w, hs.h)
      // timber frame
      c.fillStyle = '#5a3a2a'
      c.fillRect(hs.x, top, hs.w, Math.max(1, Math.round(u)))
      c.fillRect(hs.x, top + hs.h * 0.5, hs.w, Math.max(1, Math.round(u)))
      for (let k = 0; k <= 3; k++) c.fillRect(Math.round(hs.x + (k * (hs.w - u)) / 3), top, Math.max(1, Math.round(u)), hs.h)
      // roof
      c.fillStyle = dk > 0.6 ? '#2e2a4a' : hs.roof
      const rh = hs.w * 0.45
      for (let i = 0; i < rh; i++) c.fillRect(Math.round(hs.x - 3 * u + i), Math.round(top - i), Math.round(hs.w + 6 * u - i * 2), 1)
      if (hs.chimney) c.fillRect(Math.round(hs.x + hs.w * 0.7), Math.round(top - rh * 0.8), Math.round(4 * u), Math.round(rh * 0.5))
      // windows: lit as night falls
      const lit = dk > 0.35
      c.fillStyle = lit ? (Math.sin(this.t * 4 + hs.x) > -0.7 ? '#ffd88a' : '#f2a65a') : '#2e2a4a'
      c.fillRect(Math.round(hs.x + hs.w * 0.2), Math.round(top + hs.h * 0.2), Math.round(4 * u), Math.round(4 * u))
      c.fillRect(Math.round(hs.x + hs.w * 0.6), Math.round(top + hs.h * 0.2), Math.round(4 * u), Math.round(4 * u))
      c.fillStyle = '#5a3a2a'
      c.fillRect(Math.round(hs.x + hs.w * 0.42), Math.round(road - hs.h * 0.4), Math.round(5 * u), Math.round(hs.h * 0.4))
    }
    // anvil by the smithy
    const smith = this.houses[1]
    if (smith) {
      c.fillStyle = '#1c1a2e'
      c.fillRect(smith.x + smith.w + 2 * u, road - 4 * u, 6 * u, 4 * u)
    }
    for (const s of this.sparks) {
      c.fillStyle = s.a < 0.3 ? '#fff4d0' : '#f2a65a'
      c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1)
    }
    for (const s of this.smoke) {
      c.fillStyle = `rgba(200,190,210,${0.45 * (1 - s.a / 5)})`
      const r = Math.round((2 + s.a) * u)
      c.fillRect(Math.round(s.x), Math.round(s.y), r, r)
    }
    // road and torches
    c.fillStyle = dk > 0.6 ? '#2e2a4a' : '#c48a5a'
    c.fillRect(0, road, w, 10 * u)
    if (dk > 0.4)
      for (let x = w * 0.1; x < w; x += w * 0.25) {
        const g = c.createRadialGradient(x, road - 12 * u, 1, x, road - 12 * u, 22 * u)
        g.addColorStop(0, `rgba(242,166,90,${0.5 * dk})`)
        g.addColorStop(1, 'rgba(242,166,90,0)')
        c.fillStyle = g
        c.fillRect(x - 22 * u, road - 34 * u, 44 * u, 44 * u)
        c.fillStyle = '#5a3a2a'
        c.fillRect(x - u / 2, road - 10 * u, Math.max(1, u), 10 * u)
        c.fillStyle = Math.floor(this.t * 8 + x) % 2 ? '#ffd88a' : '#f2a65a'
        c.fillRect(x - u, road - 13 * u, 2 * u, 3 * u)
      }
    // villagers
    const s = Math.max(1, Math.round(u))
    for (const f of this.folk) {
      const fr = WALK[Math.floor(this.t * 4 + f.x) % 2]
      for (let r = 0; r < fr.length; r++)
        for (let k = 0; k < fr[r].length; k++) {
          const ch = fr[r][k]
          if (ch === '.') continue
          c.fillStyle = ch === 'h' ? f.hood : ch === 's' ? '#f2a65a' : ch === 'b' ? f.col : '#1c1a2e'
          c.fillRect(Math.round(f.x) + k * s, road + 2 * u - (8 - r) * s, s, s)
        }
    }
    // river at the bottom, flowing
    const ry = road + 10 * u
    c.fillStyle = dk > 0.6 ? '#1c1a2e' : '#3f5a32'
    c.fillRect(0, ry, w, 4 * u)
    c.fillStyle = dk > 0.6 ? '#2e2a4a' : '#4a3e6a'
    c.fillRect(0, ry + 4 * u, w, h)
    c.fillStyle = dk > 0.6 ? '#4a3e6a' : '#7a5a8a'
    for (let i = 0; i < 40; i++) {
      const x = ((i * 53 + this.t * 14 * u) % (w + 20)) - 10
      const y = ry + 6 * u + ((i * 31) % Math.max(1, h - ry - 8 * u))
      c.fillRect(Math.round(x), Math.round(y), Math.round(5 * u), 1)
    }
    c.fillStyle = '#1c1a2e'
    for (const b of this.birds) {
      c.fillRect(Math.round(b.x), Math.round(b.y), s, s)
      c.fillRect(Math.round(b.x - 2 * s), Math.round(b.y - (Math.sin(this.t * 10) > 0 ? s : 0)), 2 * s, s)
      c.fillRect(Math.round(b.x + s), Math.round(b.y - (Math.sin(this.t * 10) > 0 ? s : 0)), 2 * s, s)
    }
  }
}
