import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, VT, font, glow, rr } from '../kit'

type Machine = { spin: number; speed: number; timer: number; clothes: { a: number; r: number; col: string; s: number }[]; tone: string }

export function create(ctx: SceneContext) {
  return new Laundromat(ctx)
}

/** A 24h laundromat at night: a row of machines tumbling laundry, flickering tubes, rain on the window. */
class Laundromat extends PixelScene {
  machines: Machine[] = []
  drops: { x: number; y: number; v: number }[] = []
  flicker = 1
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.cold16
  }
  dither() {
    return 0.35
  }
  layout() {
    const r = this.r
    const n = this.count()
    this.machines = Array.from({ length: n }, () => ({
      spin: r() * TAU,
      speed: r.chance(0.25) ? 0 : r.range(1.2, 2.6),
      timer: r.range(3, 48) * 60,
      tone: r.pick(['#e6f6f7', '#a6dbe5', '#ffd28a']),
      clothes: Array.from({ length: 7 }, () => ({ a: r() * TAU, r: r.range(0.15, 0.62), col: r.pick(['#ff9f5a', '#7a6aa8', '#66b0c9', '#ffd28a', '#e6f6f7', '#ff5d7a', '#3a7fa3']), s: r.range(0.18, 0.3) })),
    }))
    this.drops = Array.from({ length: 70 }, () => ({ x: r(), y: r(), v: r.range(0.3, 0.7) }))
  }
  count() {
    const perRow = Math.max(2, Math.min(6, Math.floor(this.w / (this.u * 62))))
    return this.h > this.w * 1.2 ? perRow * 2 : perRow
  }
  step(dt: number) {
    if (this.machines.length !== this.count()) this.layout()
    for (const m of this.machines) {
      if (m.speed > 0) {
        // tumble, pause, reverse, like a real cycle
        const phase = Math.sin(this.t * 0.25 + m.timer)
        m.spin += m.speed * dt * (phase > -0.3 ? 1 : -0.6)
        m.timer -= dt
        if (m.timer <= 0) {
          m.speed = 0
          m.timer = this.r.int(6, 20)
          this.emit({ type: 'chime' })
        }
      } else {
        m.timer -= dt
        if (m.timer <= 0) {
          m.speed = this.r.range(1.2, 2.6)
          m.timer = this.r.int(20, 48) * 60
        }
      }
    }
    for (const d of this.drops) {
      d.y += d.v * dt
      if (d.y > 1) d.y -= 1
    }
    this.flicker = this.num('flicker') > 0 && this.r.chance(dt * this.num('flicker') * 0.6) ? 0.55 : Math.min(1, this.flicker + dt * 4)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0e2236'
    c.fillRect(0, 0, w, h)
    // window with rainy street at night
    const wy0 = h * 0.06
    const wy1 = h * 0.38
    c.fillStyle = '#08121f'
    c.fillRect(0, wy0, w, wy1 - wy0)
    for (let i = 0; i < 9; i++) glow(c, ((i * 0.13 + 0.05) % 1) * w, wy0 + (wy1 - wy0) * (0.4 + (i % 3) * 0.15), 18 * u, ['rgba(255,159,90,0.5)', 'rgba(102,176,201,0.5)', 'rgba(255,210,138,0.5)'][i % 3])
    c.strokeStyle = 'rgba(166,219,229,0.35)'
    c.lineWidth = Math.max(1, 0.4 * u)
    for (const d of this.drops) {
      const x = d.x * w
      const y = wy0 + d.y * (wy1 - wy0)
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x - 1 * u, y + 5 * u)
      c.stroke()
    }
    // window frames and neon sign
    c.fillStyle = '#173856'
    for (let x = 0; x <= w; x += w / 3) c.fillRect(x - 1.5 * u, wy0, 3 * u, wy1 - wy0)
    c.fillRect(0, wy0 - 2 * u, w, 3 * u)
    c.fillRect(0, wy1 - 1 * u, w, 3 * u)
    font(c, Math.max(10, 12 * u), VT, 400)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const signX = w * 0.5
    const signY = wy0 + (wy1 - wy0) * 0.45
    glow(c, signX, signY, 40 * u, 'rgba(255,93,122,0.35)')
    c.fillStyle = '#ff5d7a'
    c.fillText('OPEN 24H', signX, signY)
    c.textAlign = 'left'
    // tiled wall
    c.fillStyle = '#e6f6f7'
    c.globalAlpha = 0.06
    for (let y = wy1 + 4 * u; y < h * 0.5; y += 6 * u) c.fillRect(0, y, w, Math.max(1, 0.3 * u))
    c.globalAlpha = 1
    // the machines
    const rows = h > w * 1.2 ? 2 : 1
    const n = this.machines.length / rows
    const mw = Math.min((w * 0.94) / n, 70 * u)
    const mh = mw * 1.15
    const floor = rows === 2 ? Math.min(h * 0.94, h * 0.45 + mh * 2 + 8 * u) : Math.min(h * 0.92, h * 0.45 + mh + 4 * u)
    const x0 = (w - mw * n) / 2
    this.machines.forEach((m, i) => {
      const row = Math.floor(i / n)
      // stacked: dryers on top of washers, like the real thing
      const y = floor - mh * (rows - row) - (rows === 2 && row === 0 ? 2 * u : 0)
      this.machine(m, x0 + (i % n) * mw + mw * 0.04, y, mw * 0.92, mh)
    })
    // floor
    c.fillStyle = '#22557a'
    c.fillRect(0, floor, w, h - floor)
    c.fillStyle = '#173856'
    for (let x = 0; x < w; x += 12 * u) c.fillRect(x, floor, Math.max(1, 0.4 * u), h - floor)
    // fluorescent tubes
    c.globalAlpha = 0.9 * this.flicker
    c.fillStyle = '#e6f6f7'
    c.fillRect(w * 0.1, 1 * u, w * 0.3, 2 * u)
    c.fillRect(w * 0.6, 1 * u, w * 0.3, 2 * u)
    c.globalAlpha = 1
    c.fillStyle = `rgba(8,18,31,${(1 - this.flicker) * 0.5})`
    c.fillRect(0, 0, w, h)
  }
  machine(m: Machine, x: number, y: number, mw: number, mh: number) {
    const c = this.c
    const u = this.u
    c.fillStyle = m.tone
    rr(c, x, y, mw, mh, 3 * u)
    c.fill()
    c.fillStyle = 'rgba(14,34,54,0.15)'
    c.fillRect(x, y + mh * 0.2, mw, Math.max(1, 0.5 * u))
    // control panel: display and knob
    c.fillStyle = '#08121f'
    rr(c, x + mw * 0.08, y + mh * 0.05, mw * 0.36, mh * 0.1, 1 * u)
    c.fill()
    font(c, Math.max(7, mh * 0.075), MONO, 600)
    c.fillStyle = m.speed > 0 ? '#ff9f5a' : '#66b0c9'
    c.textBaseline = 'middle'
    const mins = Math.max(0, Math.ceil(m.timer / 60))
    c.fillText(m.speed > 0 ? `${mins}:${String(Math.floor(m.timer % 60)).padStart(2, '0')}` : 'DONE', x + mw * 0.11, y + mh * 0.1)
    c.fillStyle = '#7a6aa8'
    c.beginPath()
    c.arc(x + mw * 0.78, y + mh * 0.1, mh * 0.05, 0, TAU)
    c.fill()
    // porthole
    const cx = x + mw / 2
    const cy = y + mh * 0.58
    const R = Math.min(mw, mh) * 0.34
    c.fillStyle = '#a6dbe5'
    c.beginPath()
    c.arc(cx, cy, R * 1.12, 0, TAU)
    c.fill()
    c.fillStyle = '#173856'
    c.beginPath()
    c.arc(cx, cy, R, 0, TAU)
    c.fill()
    c.save()
    c.beginPath()
    c.arc(cx, cy, R * 0.96, 0, TAU)
    c.clip()
    // water level sloshing
    const slosh = Math.sin(m.spin * 0.7) * R * 0.15 * (m.speed > 0 ? 1 : 0)
    c.fillStyle = 'rgba(102,176,201,0.55)'
    c.beginPath()
    c.moveTo(cx - R, cy + R * 0.25 + slosh)
    c.lineTo(cx + R, cy + R * 0.25 - slosh)
    c.lineTo(cx + R, cy + R)
    c.lineTo(cx - R, cy + R)
    c.fill()
    // clothes tumbling: carried up by the drum then falling
    for (const cl of m.clothes) {
      const a = cl.a + m.spin
      const lift = m.speed > 0 ? Math.max(0, Math.sin(a)) : 1
      const px = cx + Math.cos(a) * cl.r * R
      const py = cy + Math.sin(a) * cl.r * R * (0.6 + 0.4 * lift) + (m.speed > 0 ? 0 : R * 0.35)
      c.fillStyle = cl.col
      c.beginPath()
      c.ellipse(px, Math.min(cy + R * 0.8, py), cl.s * R, cl.s * R * 0.6, a, 0, TAU)
      c.fill()
    }
    // bubbles
    if (m.speed > 0) {
      c.fillStyle = 'rgba(230,246,247,0.7)'
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8 + m.spin * 0.5
        c.beginPath()
        c.arc(cx + Math.cos(a) * R * 0.75, cy + R * 0.2 + Math.sin(a * 2) * R * 0.15, R * 0.06, 0, TAU)
        c.fill()
      }
    }
    c.restore()
    // glass glare
    c.strokeStyle = 'rgba(255,255,255,0.35)'
    c.lineWidth = R * 0.08
    c.beginPath()
    c.arc(cx, cy, R * 0.78, -2.4, -1.7)
    c.stroke()
    c.textBaseline = 'alphabetic'
  }
}
