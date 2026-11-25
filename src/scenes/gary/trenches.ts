import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { WorldScene } from './world'

/** Everything here is made up: fictional tickers, random walks, no real market data. */
const TICKERS = ['$GARY', '$NGMI', '$COPE', '$HOPIUM', '$BAGS', '$WAGMI', '$SER', '$REKT', '$FOMO']
const ALERTS = ['whale bought a lot', 'new ATH. screenshot it.', 'dev wallet moved', 'volume: asleep', 'support became resistance', 'liquidity pulled', 'funding flipped', 'someone said "early"']

interface Candle {
  o: number
  h: number
  l: number
  c: number
}

class Market {
  candles: Candle[] = []
  cur: Candle
  price = 1
  drift = 0
  vol = 0.5
  left = 0
  constructor(
    private r: () => number,
    public ticker: string,
    n: number,
  ) {
    this.cur = { o: 1, h: 1, l: 1, c: 1 }
    for (let i = 0; i < n; i++) {
      this.walk(0.4)
      this.close(n)
    }
  }
  walk(dt: number) {
    this.left -= dt
    if (this.left <= 0) {
      this.drift = (this.r() - 0.5) * 1.6
      this.vol = 0.2 + this.r() * 0.9
      this.left = 3 + this.r() * 8
    }
    const z = (this.r() + this.r() + this.r() - 1.5) * 2
    this.price = Math.max(0.0001, this.price * Math.exp((this.drift * 0.05 + this.vol * 0.07 * z) * dt * 3))
    this.cur.c = this.price
    this.cur.h = Math.max(this.cur.h, this.price)
    this.cur.l = Math.min(this.cur.l, this.price)
  }
  close(max: number) {
    this.candles.push(this.cur)
    if (this.candles.length > max) this.candles.shift()
    this.cur = { o: this.price, h: this.price, l: this.price, c: this.price }
  }
}

export function create(ctx: SceneContext) {
  return new Trenches(ctx)
}

/** An empty trading desk at night: three monitors of simulated markets glowing in a dark room. */
class Trenches extends WorldScene {
  main: Market
  side: Market
  book: number[] = []
  acc = 0
  alerts: { text: string; a: number; up: boolean }[] = []
  alertAcc = 2
  steam: { x: number; y: number; a: number }[] = []
  tape = 0
  tapeText = ''
  constructor(ctx: SceneContext) {
    super(ctx)
    this.main = new Market(this.r, this.r.pick(TICKERS), 46)
    this.side = new Market(this.r, this.r.pick(TICKERS), 60)
    this.book = Array.from({ length: 14 }, () => this.r())
    this.tapeText = TICKERS.map((t) => `${t} ${this.r.chance(0.5) ? '▲' : '▼'}${this.r.range(0.1, 42).toFixed(1)}%`).join('   ')
  }
  palette() {
    return PX.night16
  }
  step(dt: number) {
    const chaos = this.num('chaos')
    this.main.walk(dt * chaos)
    this.side.walk(dt * chaos * 1.4)
    this.acc += dt * chaos
    if (this.acc > 0.8) {
      this.acc = 0
      this.main.close(46)
      this.side.close(60)
      this.book = this.book.map((v) => Math.max(0.05, Math.min(1, v + (this.r() - 0.5) * 0.4)))
    }
    if (this.bool('alerts')) {
      this.alertAcc -= dt * chaos
      if (this.alertAcc <= 0) {
        this.alertAcc = this.r.range(3, 7)
        this.alerts.unshift({ text: this.r.pick(ALERTS), a: 0, up: this.r.chance(0.5) })
        if (this.alerts.length > 4) this.alerts.pop()
      }
    }
    for (const a of this.alerts) a.a += dt
    if (this.r.chance(dt * 2)) this.steam.push({ x: 742 + this.r.range(-5, 5), y: 404, a: 0 })
    for (const s of this.steam) {
      s.a += dt
      s.y -= dt * 16
      s.x += Math.sin(s.a * 3 + s.y * 0.1) * dt * 6
    }
    this.steam = this.steam.filter((s) => s.a < 2.4)
    this.tape += dt * 40
  }
  chart(m: Market, x: number, y: number, w: number, h: number, big: boolean) {
    const c = this.c
    const all = [...m.candles, m.cur]
    let lo = Infinity
    let hi = -Infinity
    for (const k of all) {
      lo = Math.min(lo, k.l)
      hi = Math.max(hi, k.h)
    }
    const pad = (hi - lo) * 0.12 || 0.01
    lo -= pad
    hi += pad
    const Y = (p: number) => y + h - ((p - lo) / (hi - lo)) * h
    c.strokeStyle = 'rgba(120,160,220,0.08)'
    c.lineWidth = 1
    for (let i = 1; i < 5; i++) {
      c.beginPath()
      c.moveTo(x, y + (h * i) / 5)
      c.lineTo(x + w, y + (h * i) / 5)
      c.stroke()
    }
    const cw = w / all.length
    all.forEach((k, i) => {
      const cx = x + i * cw + cw / 2
      const col = k.c >= k.o ? '#3ddc84' : '#ff5c6c'
      c.strokeStyle = col
      c.fillStyle = col
      c.lineWidth = Math.max(1, cw * 0.12)
      c.beginPath()
      c.moveTo(cx, Y(k.h))
      c.lineTo(cx, Y(k.l))
      c.stroke()
      c.fillRect(cx - cw * 0.32, Y(Math.max(k.o, k.c)), cw * 0.64, Math.max(1.5, Math.abs(Y(k.o) - Y(k.c))))
    })
    const py = Y(m.price)
    c.setLineDash([4, 4])
    c.strokeStyle = 'rgba(220,230,255,0.35)'
    c.beginPath()
    c.moveTo(x, py)
    c.lineTo(x + w, py)
    c.stroke()
    c.setLineDash([])
    c.font = `${big ? 15 : 12}px "IBM Plex Mono", monospace`
    c.fillStyle = '#e6ecf6'
    c.textAlign = 'left'
    const first = all[0].o
    const ch = (m.price / first - 1) * 100
    c.fillText(big ? `${m.ticker}/USD` : m.ticker, x, y - 10)
    c.fillStyle = ch >= 0 ? '#3ddc84' : '#ff5c6c'
    c.textAlign = 'right'
    const pct = `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%`
    c.fillText(big ? `${m.price < 0.01 ? m.price.toExponential(2) : m.price.toFixed(3)}  ${pct}` : pct, x + w, y - 10)
  }
  monitor(x: number, y: number, w: number, h: number) {
    const c = this.c
    this.glow(x + w / 2, y + h / 2, w * 0.9, 'rgba(60,110,200,A)', 0.18 * this.g.intensity)
    c.fillStyle = '#0b0d12'
    this.rr(x - 8, y - 8, w + 16, h + 16, 8)
    c.fill()
    c.fillStyle = '#060a14'
    this.rr(x, y, w, h, 3)
    c.fill()
  }
  draw() {
    const c = this.c
    this.screen()
    const bg = c.createLinearGradient(0, 0, 0, this.h)
    bg.addColorStop(0, '#05070d')
    bg.addColorStop(1, '#0b1020')
    c.fillStyle = bg
    c.fillRect(0, 0, this.w, this.h)
    this.world()
    // back window with the city at night
    c.fillStyle = '#0a1226'
    this.rr(60, 40, 840, 150, 6)
    c.fill()
    for (let i = 0; i < 60; i++) {
      const x = 70 + ((i * 137) % 820)
      const y = 150 - ((i * 53) % 90)
      const on = Math.sin(this.t * 0.3 + i * 7) > -0.6
      c.fillStyle = on ? (i % 3 ? 'rgba(255,207,106,0.55)' : 'rgba(106,149,212,0.5)') : 'rgba(40,60,100,0.4)'
      c.fillRect(x, y, 3, 3)
    }
    c.fillStyle = '#0d1630'
    for (let i = 0; i < 14; i++) c.fillRect(60 + i * 60, 170 - ((i * 37) % 40), 52, 20 + ((i * 37) % 40))
    // desk
    c.fillStyle = '#0e1220'
    c.fillRect(-200, 430, 1360, 300)
    c.fillStyle = '#1a2038'
    c.fillRect(-200, 426, 1360, 6)
    // three monitors
    this.monitor(110, 230, 190, 150)
    this.monitor(320, 200, 320, 200)
    this.monitor(660, 230, 190, 150)
    c.fillStyle = '#0b0d12'
    c.fillRect(472, 408, 16, 22)
    c.fillRect(198, 388, 12, 40)
    c.fillRect(750, 388, 12, 40)
    this.chart(this.main, 336, 232, 288, 150, true)
    this.chart(this.side, 122, 262, 166, 104, false)
    // order book
    const bx = 672
    c.font = '12px "IBM Plex Mono", monospace'
    c.textAlign = 'left'
    c.fillStyle = '#8aa0c8'
    c.fillText('ORDER BOOK', bx, 252)
    this.book.forEach((v, i) => {
      const y = 262 + i * 8
      c.fillStyle = i < 7 ? 'rgba(255,92,108,0.55)' : 'rgba(61,220,132,0.55)'
      c.fillRect(bx + 166 - v * 80, y, v * 80, 6)
      c.fillStyle = 'rgba(200,210,230,0.35)'
      c.fillRect(bx, y + 2, 40 + ((i * 13) % 20), 2)
    })
    // alerts in the corner of the main screen
    this.alerts.forEach((a, i) => {
      const alpha = Math.min(1, a.a * 3) * Math.max(0, 1 - Math.max(0, a.a - 6) / 1.5)
      if (alpha <= 0) return
      const y = 358 - i * 22
      c.globalAlpha = alpha
      c.fillStyle = 'rgba(10,16,32,0.92)'
      this.rr(346, y, 200, 18, 4)
      c.fill()
      c.fillStyle = a.up ? '#3ddc84' : '#ff5c6c'
      c.fillRect(352, y + 7, 4, 4)
      c.fillStyle = '#dde6f5'
      c.font = '11px "IBM Plex Mono", monospace'
      c.textAlign = 'left'
      c.fillText(a.text, 362, y + 13)
      c.globalAlpha = 1
    })
    // keyboard, mouse, mug and its steam
    c.fillStyle = '#151a2c'
    this.rr(380, 448, 200, 34, 4)
    c.fill()
    c.fillStyle = 'rgba(100,140,230,0.25)'
    for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) c.fillRect(388 + k * 13.5, 454 + r * 9, 10, 6)
    c.fillStyle = '#151a2c'
    this.rr(610, 456, 22, 30, 10)
    c.fill()
    c.fillStyle = '#2a3150'
    this.rr(726, 410, 32, 34, 4)
    c.fill()
    c.strokeStyle = '#2a3150'
    c.lineWidth = 5
    c.beginPath()
    c.arc(760, 426, 8, -Math.PI / 2, Math.PI / 2)
    c.stroke()
    for (const s of this.steam) {
      c.fillStyle = `rgba(200,210,235,${0.18 * (1 - s.a / 2.4)})`
      c.beginPath()
      c.arc(s.x, s.y, 3 + s.a * 3, 0, Math.PI * 2)
      c.fill()
    }
    // ticker tape along the desk edge
    c.save()
    c.beginPath()
    c.rect(0, 500, 960, 30)
    c.clip()
    c.font = '14px "IBM Plex Mono", monospace'
    c.fillStyle = '#6f84b0'
    c.textAlign = 'left'
    const tw = c.measureText(this.tapeText + '   ').width
    const off = this.tape % tw
    for (let x = -off; x < 960; x += tw) c.fillText(this.tapeText, x, 520)
    c.restore()
    c.font = '11px "IBM Plex Mono", monospace'
    c.fillStyle = 'rgba(140,160,200,0.6)'
    c.textAlign = 'right'
    c.fillText('not financial advice. neither is gary.', 944, 496)
  }
}
