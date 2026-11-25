import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, VT, font, glow, rr } from '../kit'

const SYMS = ['7', 'rocket', 'moon', 'green', 'red', 'diamond', 'coin'] as const
type Sym = (typeof SYMS)[number]
type Reel = { pos: number; speed: number; stopAt: number; stopping: boolean }
type Machine = { reels: Reel[]; state: 'idle' | 'spin' | 'win' | 'rug'; timer: number; hue: string }

export function create(ctx: SceneContext) {
  return new DegenCasino(ctx)
}

/** A neon casino where the slot machines pay out in fictional memecoins. Mostly they rug. */
class DegenCasino extends PixelScene {
  machines: Machine[] = []
  bulbs = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.35
  }
  count() {
    return Math.max(2, Math.min(5, Math.floor(this.w / (this.u * 70))))
  }
  layout() {
    this.machines = Array.from({ length: this.count() }, (_, i) => ({
      reels: Array.from({ length: 3 }, () => ({ pos: this.r() * SYMS.length, speed: 0, stopAt: 0, stopping: false })),
      state: 'idle' as const,
      timer: this.r.range(0.5, 4),
      hue: ['#ff2e88', '#22e1ff', '#ffe95a', '#7cff6b', '#a68cff'][i % 5],
    }))
  }
  step(dt: number) {
    if (this.machines.length !== this.count()) this.layout()
    const sp = this.num('speed')
    this.bulbs += dt * 6
    for (const m of this.machines) {
      m.timer -= dt * sp
      if (m.state === 'idle' && m.timer <= 0) {
        m.state = 'spin'
        m.timer = 1.4
        m.reels.forEach((r, i) => {
          r.speed = 14 + i * 2
          r.stopping = false
          r.stopAt = 1.2 + i * 0.6
        })
      }
      if (m.state === 'spin') {
        let all = true
        m.reels.forEach((r) => {
          r.stopAt -= dt * sp
          if (r.stopAt <= 0 && !r.stopping) r.stopping = true
          if (r.stopping) {
            // ease into the next whole symbol
            const target = Math.ceil(r.pos)
            r.pos += Math.max(0.5, (target - r.pos) * 8) * dt
            if (r.pos >= target) {
              r.pos = target % SYMS.length
              r.speed = 0
            } else all = false
          } else {
            r.pos = (r.pos + r.speed * dt * sp) % SYMS.length
            all = false
          }
        })
        if (all) {
          // rig the outcome a little so the scene has something to show
          const roll = this.r()
          if (roll < 0.12 * this.num('luck')) {
            const s = this.r.int(0, SYMS.length - 1)
            m.reels.forEach((r) => (r.pos = s))
          }
          const syms = m.reels.map((r) => Math.round(r.pos) % SYMS.length)
          const win = syms[0] === syms[1] && syms[1] === syms[2]
          m.state = win ? 'win' : this.r.chance(0.25) ? 'rug' : 'idle'
          m.timer = win || m.state === 'rug' ? 3 : this.r.range(1, 3)
          if (win) this.emit({ type: 'chime' })
        }
      }
      if ((m.state === 'win' || m.state === 'rug') && m.timer <= 0) {
        m.state = 'idle'
        m.timer = this.r.range(1, 3)
      }
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#120a24'
    c.fillRect(0, 0, w, h)
    // wall panels
    c.fillStyle = '#1e1240'
    for (let x = 0; x < w; x += 24 * u) c.fillRect(x, 0, 12 * u, h * 0.7)
    // neon sign
    const fs = Math.max(12, Math.min(18 * u, w / 14))
    font(c, fs, VT)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const sy = Math.max(fs, h * 0.11)
    const flick = Math.sin(this.t * 13) > 0.97 ? 0.4 : 1
    glow(c, w / 2, sy, fs * 4, `rgba(255,46,136,${0.35 * flick})`)
    c.fillStyle = flick < 1 ? '#7a2a5a' : '#ff7ab6'
    c.fillText('DEGEN CASINO', w / 2, sy)
    font(c, fs * 0.4, MONO, 500)
    c.fillStyle = '#9af5ff'
    c.fillText('the house always rugs', w / 2, sy + fs * 0.8)
    // carpet
    const floor = h * 0.86
    c.fillStyle = '#3e2a7a'
    c.fillRect(0, floor, w, h - floor)
    c.fillStyle = '#ff2e88'
    for (let x = 0; x < w; x += 14 * u)
      for (let y = floor + 3 * u; y < h; y += 8 * u) {
        c.globalAlpha = 0.25
        c.beginPath()
        c.arc(x + ((y / (8 * u)) % 2) * 7 * u, y, 1.5 * u, 0, TAU)
        c.fill()
      }
    c.globalAlpha = 1
    // machines
    const n = this.machines.length
    const mw = Math.min((w * 0.92) / n, 74 * u)
    const mh = Math.min(h * 0.62, mw * 1.7)
    const x0 = (w - mw * n) / 2
    this.machines.forEach((m, i) => this.machine(m, x0 + i * mw + mw * 0.05, floor - mh, mw * 0.9, mh))
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
  machine(m: Machine, x: number, y: number, mw: number, mh: number) {
    const c = this.c
    const u = this.u
    glow(c, x + mw / 2, y + mh * 0.4, mw, m.hue + '33')
    // cabinet
    c.fillStyle = '#2c1b5e'
    rr(c, x, y, mw, mh, 4 * u)
    c.fill()
    c.strokeStyle = m.hue
    c.lineWidth = Math.max(1, 0.8 * u)
    c.stroke()
    // marquee bulbs
    const top = y + mh * 0.04
    const bh = mh * 0.12
    c.fillStyle = '#07040f'
    rr(c, x + mw * 0.08, top, mw * 0.84, bh, 2 * u)
    c.fill()
    for (let k = 0; k < 10; k++) {
      const on = (Math.floor(this.bulbs) + k) % 3 === 0 || m.state === 'win'
      c.fillStyle = on ? '#ffe95a' : '#5a5a7a'
      c.beginPath()
      c.arc(x + mw * 0.12 + (k * mw * 0.76) / 9, top + bh * 0.2, Math.max(1, 0.9 * u), 0, TAU)
      c.fill()
    }
    font(c, Math.max(8, bh * 0.42), VT)
    c.fillStyle = m.state === 'rug' ? '#ff2e88' : m.state === 'win' ? '#7cff6b' : m.hue
    c.fillText(m.state === 'win' ? 'JACKPOT' : m.state === 'rug' ? 'RUGGED' : '$NGMI SLOTS', x + mw / 2, top + bh * 0.62)
    // reel window
    const wy = y + mh * 0.22
    const wh = mh * 0.3
    const ww = mw * 0.84
    const wx = x + mw * 0.08
    c.fillStyle = '#f2f0e6'
    rr(c, wx, wy, ww, wh, 2 * u)
    c.fill()
    c.save()
    c.beginPath()
    c.rect(wx, wy, ww, wh)
    c.clip()
    const cw = ww / 3
    m.reels.forEach((r, ri) => {
      for (let k = -1; k <= 1; k++) {
        const idx = Math.floor(r.pos) + k
        const frac = r.pos - Math.floor(r.pos)
        const sy = wy + wh / 2 + (k - frac) * wh * 0.7
        const sym = SYMS[((idx % SYMS.length) + SYMS.length) % SYMS.length]
        this.symbol(sym, wx + cw * ri + cw / 2, sy, wh * 0.26, r.speed > 0 && !r.stopping)
      }
      if (ri) {
        c.fillStyle = '#5a5a7a'
        c.fillRect(wx + cw * ri - 0.5, wy, 1, wh)
      }
    })
    const shade = c.createLinearGradient(0, wy, 0, wy + wh)
    shade.addColorStop(0, 'rgba(7,4,15,0.5)')
    shade.addColorStop(0.3, 'rgba(7,4,15,0)')
    shade.addColorStop(0.7, 'rgba(7,4,15,0)')
    shade.addColorStop(1, 'rgba(7,4,15,0.5)')
    c.fillStyle = shade
    c.fillRect(wx, wy, ww, wh)
    c.restore()
    c.fillStyle = '#ff2e88'
    c.fillRect(wx - 2 * u, wy + wh / 2 - 0.5 * u, 2 * u, u)
    // credit display and buttons
    font(c, Math.max(7, mh * 0.04), MONO, 600)
    c.fillStyle = '#07040f'
    c.fillRect(wx, wy + wh + mh * 0.05, ww, mh * 0.07)
    c.fillStyle = '#ff9a3d'
    c.fillText(m.state === 'rug' ? 'BAL 0.00' : 'BAL 420.69', x + mw / 2, wy + wh + mh * 0.085)
    const by = wy + wh + mh * 0.18
    ;['#ff2e88', '#ffe95a', '#7cff6b'].forEach((col, k) => {
      c.fillStyle = col
      c.beginPath()
      c.arc(x + mw * (0.3 + k * 0.2), by, mw * 0.05, 0, TAU)
      c.fill()
    })
    // lever
    const pull = m.state === 'spin' && m.reels[0].stopAt > 0.8 ? 1 : 0
    c.strokeStyle = '#c4cee0'
    c.lineWidth = Math.max(1, 1.2 * u)
    c.beginPath()
    c.moveTo(x + mw, y + mh * 0.4)
    c.lineTo(x + mw + 5 * u, y + mh * (pull ? 0.42 : 0.2))
    c.stroke()
    c.fillStyle = '#ff2e88'
    c.beginPath()
    c.arc(x + mw + 5 * u, y + mh * (pull ? 0.42 : 0.2), 2.4 * u, 0, TAU)
    c.fill()
    // coin tray
    c.fillStyle = '#07040f'
    rr(c, x + mw * 0.2, y + mh * 0.82, mw * 0.6, mh * 0.08, 2 * u)
    c.fill()
    if (m.state === 'win')
      for (let k = 0; k < 6; k++) {
        c.fillStyle = '#ffe95a'
        c.beginPath()
        c.arc(x + mw * (0.28 + k * 0.09), y + mh * 0.86 + Math.sin(this.t * 10 + k) * u, 1.6 * u, 0, TAU)
        c.fill()
      }
  }
  symbol(s: Sym, x: number, y: number, r: number, blur: boolean) {
    const c = this.c
    c.globalAlpha = blur ? 0.55 : 1
    if (s === '7') {
      font(c, r * 2.2, VT)
      c.fillStyle = '#ff2e88'
      c.fillText('7', x, y)
    } else if (s === 'rocket') {
      c.fillStyle = '#5a5a7a'
      c.beginPath()
      c.moveTo(x, y - r)
      c.quadraticCurveTo(x + r * 0.5, y, x + r * 0.35, y + r * 0.7)
      c.lineTo(x - r * 0.35, y + r * 0.7)
      c.quadraticCurveTo(x - r * 0.5, y, x, y - r)
      c.fill()
      c.fillStyle = '#ff9a3d'
      c.fillRect(x - r * 0.2, y + r * 0.7, r * 0.4, r * 0.3)
    } else if (s === 'moon') {
      c.fillStyle = '#ffe95a'
      c.beginPath()
      c.arc(x, y, r * 0.8, 0, TAU)
      c.fill()
      c.fillStyle = '#f2f0e6'
      c.beginPath()
      c.arc(x + r * 0.35, y - r * 0.2, r * 0.7, 0, TAU)
      c.fill()
    } else if (s === 'green' || s === 'red') {
      c.fillStyle = s === 'green' ? '#1f8f4e' : '#b8263b'
      c.fillRect(x - r * 0.06, y - r, r * 0.12, r * 2)
      c.fillRect(x - r * 0.3, y - r * 0.6, r * 0.6, r * 1.2)
    } else if (s === 'diamond') {
      c.fillStyle = '#22e1ff'
      c.beginPath()
      c.moveTo(x, y - r * 0.8)
      c.lineTo(x + r * 0.7, y - r * 0.2)
      c.lineTo(x, y + r * 0.8)
      c.lineTo(x - r * 0.7, y - r * 0.2)
      c.fill()
    } else {
      c.fillStyle = '#ff9a3d'
      c.beginPath()
      c.arc(x, y, r * 0.8, 0, TAU)
      c.fill()
      font(c, r, VT)
      c.fillStyle = '#07040f'
      c.fillText('N', x, y)
    }
    c.globalAlpha = 1
  }
}
