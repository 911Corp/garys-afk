import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { VT, font } from '../kit'

type Ob = { x: number; kind: 'rug' | 'candle' | 'liq' | 'bear'; w: number; h: number; y: number }

const INK = '#1f2a12'
const MIDINK = '#4f6a2a'
const BG = '#8fb354'
const LIGHT = '#b8d97a'

export function create(ctx: SceneContext) {
  return new NgmiRunner(ctx)
}

/**
 * Attract mode of the NGMI runner, on the Purity-o-Meter LCD: a $NGMI coin rolls along, jumping
 * over rugs, red candles and liquidations. Sometimes it does not make it.
 */
class NgmiRunner extends PixelScene {
  obs: Ob[] = []
  y = 0
  vy = 0
  roll = 0
  speed = 70
  score = 0
  hi = 420
  dead = 0
  clouds: { x: number; y: number }[] = []
  ground: { x: number; w: number }[] = []
  spawn = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.clouds = Array.from({ length: 4 }, () => ({ x: this.r() * 320, y: this.r.range(15, 60) }))
    this.ground = Array.from({ length: 30 }, () => ({ x: this.r() * 320, w: this.r.range(2, 8) }))
  }
  palette() {
    return PX.gary
  }
  dither() {
    return 0.2
  }
  /** World units: the LCD is 320 wide, the ground at y = 0, up is positive. */
  get scale() {
    return Math.min(this.w / 200, this.h / 110)
  }
  /** Visible world width. */
  get VW() {
    return this.w / this.scale
  }
  step(dt: number) {
    const sp = this.num('speed')
    dt *= sp
    if (this.dead > 0) {
      this.dead += dt
      if (this.dead > 3) {
        this.dead = 0
        this.obs = []
        this.speed = 70
        this.score = 0
      }
      return
    }
    this.speed = Math.min(170, this.speed + dt * 2)
    this.score += dt * this.speed * 0.1
    if (this.score > this.hi) this.hi = this.score
    const move = this.speed * dt
    this.roll += move / 8
    for (const o of this.obs) o.x -= move
    this.obs = this.obs.filter((o) => o.x > -40)
    for (const g of this.ground) {
      g.x -= move
      if (g.x < -10) g.x += this.VW + 20
    }
    for (const cl of this.clouds) {
      cl.x -= move * 0.15
      if (cl.x < -30) cl.x += this.VW + 40
    }
    this.spawn -= move
    if (this.spawn <= 0) {
      const kind = this.r.pick(['rug', 'rug', 'candle', 'liq', 'bear'] as const)
      const sx = this.VW + 20
      const o: Ob =
        kind === 'rug' ? { x: sx, kind, w: 18, h: 6, y: 0 } : kind === 'candle' ? { x: sx, kind, w: 7, h: this.r.range(14, 24), y: 0 } : kind === 'liq' ? { x: sx, kind, w: 24, h: 9, y: 0 } : { x: sx, kind, w: 14, h: 8, y: this.r.chance(0.5) ? 30 : 14 }
      this.obs.push(o)
      this.spawn = this.r.range(90, 190) + this.speed * 0.4
    }
    // auto-pilot: jump when an obstacle is close; skill drops a little as speed climbs
    const coinX = 40
    const next = this.obs.find((o) => o.x + o.w > coinX - 6)
    const skill = this.num('skill')
    if (next && this.y === 0) {
      const dist = next.x - coinX
      const ideal = this.speed * 0.28
      const err = (1 - skill) * this.r.range(-25, 25)
      const duck = next.kind === 'bear' && next.y > 20
      if (!duck && dist < ideal + err && dist > 0) this.vy = 175
    }
    this.vy -= 480 * dt
    this.y = Math.max(0, this.y + this.vy * dt)
    if (this.y === 0) this.vy = 0
    // collision with a 10x10 coin
    for (const o of this.obs) {
      const hitX = o.x < coinX + 9 && o.x + o.w > coinX + 1
      const hitY = this.y < o.y + o.h && this.y + 10 > o.y
      if (hitX && hitY) {
        this.dead = 0.001
        this.emit({ type: 'blip' })
      }
    }
  }
  draw() {
    const c = this.c
    const { w, h } = this
    c.fillStyle = BG
    c.fillRect(0, 0, w, h)
    // LCD shading
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
    g.addColorStop(0, 'rgba(184,217,122,0.35)')
    g.addColorStop(1, 'rgba(31,42,18,0.25)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    const s = this.scale
    const ox = 0
    const groundY = h * 0.68
    const VW = this.VW
    const top = (groundY - h * 0.1) / s
    const X = (x: number) => ox + x * s
    const Y = (y: number) => groundY - y * s
    const px = (x: number, y: number, ww: number, hh: number, col = INK) => {
      c.fillStyle = col
      c.fillRect(Math.round(X(x)), Math.round(Y(y + hh)), Math.ceil(ww * s), Math.ceil(hh * s))
    }
    // clouds
    for (const cl of this.clouds) {
      px(cl.x, 40 + cl.y, 16, 2, MIDINK)
      px(cl.x + 4, 42 + cl.y, 8, 2, MIDINK)
    }
    // ground line and pebbles
    c.fillStyle = INK
    c.fillRect(0, Math.round(Y(0)), w, Math.max(1, Math.round(s)))
    for (const gp of this.ground) px(gp.x, -4 - (gp.w % 3), gp.w, 1, MIDINK)
    // obstacles
    for (const o of this.obs) {
      if (o.kind === 'rug') {
        // a rolled-up rug with fringe
        px(o.x, 0, o.w, 4)
        px(o.x + o.w - 5, 0, 5, 6)
        px(o.x + 2, 1, o.w - 8, 1, LIGHT)
        for (let k = 0; k < 4; k++) px(o.x - 2, k * 1.5, 2, 0.6)
      } else if (o.kind === 'candle') {
        px(o.x + 3, 0, 1, o.h + 4)
        px(o.x, 2, o.w, o.h - 2)
        px(o.x + 1, 3, o.w - 2, o.h - 4, MIDINK)
      } else if (o.kind === 'liq') {
        px(o.x, 0, o.w, o.h)
        px(o.x + 1, 1, o.w - 2, o.h - 2, LIGHT)
        c.fillStyle = INK
        font(c, 6 * s, VT)
        c.fillText('LIQ', X(o.x + 4), Y(2))
      } else {
        // a bear with flapping arms
        const flap = Math.sin(this.t * 10) > 0 ? 2 : -1
        px(o.x, o.y + 2, o.w, 5)
        px(o.x + o.w - 4, o.y + 5, 4, 4)
        px(o.x + o.w - 4, o.y + 9, 1, 1)
        px(o.x + 3, o.y + 6 + flap, 6, 1.5)
      }
    }
    // the coin, rolling
    const cx = X(45)
    const cy = Y(this.y + 5)
    const r = 5 * s
    c.save()
    c.translate(cx, cy)
    c.rotate(this.dead ? 0 : -this.roll * 0.5)
    c.fillStyle = INK
    c.beginPath()
    c.arc(0, 0, r, 0, TAU)
    c.fill()
    c.fillStyle = LIGHT
    c.beginPath()
    c.arc(0, 0, r * 0.72, 0, TAU)
    c.fill()
    c.fillStyle = INK
    font(c, 7 * s, VT)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('N', 0, 0.5 * s)
    c.restore()
    // HUD
    font(c, 9 * s, VT)
    c.textAlign = 'right'
    c.textBaseline = 'top'
    c.fillStyle = MIDINK
    c.fillText('HI ' + String(Math.floor(this.hi)).padStart(5, '0'), X(VW - 62), Y(top))
    c.fillStyle = INK
    c.fillText(String(Math.floor(this.score)).padStart(5, '0'), X(VW - 8), Y(top))
    c.textAlign = 'left'
    c.fillStyle = MIDINK
    font(c, 7 * s, VT)
    c.fillText('GARY’S ADVENTURES: NGMI  //  DEMO', X(8), Y(top))
    if (this.dead) {
      c.textAlign = 'center'
      font(c, 16 * s, VT)
      c.fillStyle = INK
      c.fillText('N G M I', X(VW / 2), Y(top * 0.62))
      font(c, 8 * s, VT)
      c.fillText('it’s so over. restarting', X(VW / 2), Y(top * 0.45))
    } else if (this.score < 30) {
      c.textAlign = 'center'
      font(c, 8 * s, VT)
      c.fillStyle = MIDINK
      if (Math.sin(this.t * 4) > 0) c.fillText('TAP TO JUMP', X(VW / 2), Y(top * 0.62))
    }
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
}
