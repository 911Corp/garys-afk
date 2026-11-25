import { Boil, Drawing, VT } from '../../engine/gary/draw'
import { box, canonicalScreen, chair, desk, deskGary, keyboard, ln, monitor, seed, SCREEN, type DeskPose } from '../../engine/gary/kit'
import type { SceneContext } from '../../engine/types'
import { GaryScene } from './garyBase'

/** Everything here is made up: fictional tickers, a random walk, no real market data. */
type Regime = 'pump' | 'crab' | 'chop' | 'dump' | 'rug'
const POSE: Record<Regime, DeskPose> = { pump: 0, crab: 1, chop: 2, dump: 3, rug: 4 }
const SAY: Record<Regime, string[]> = {
  pump: ['wagmi', 'few understand', "we're so back", 'up only', 'LFG'],
  crab: ['probably nothing', 'crab szn', 'mid', 'DYOR', 'NFA'],
  chop: ['ser...', "who's the dev?", 'wen doxx?', 'trust me bro'],
  dump: ['ngmi', "it's so over", 'bags heavy', 'cope'],
  rug: ['RUGGED', 'SER NO', 'LP GONE', 'REKT'],
}
const TICKERS = ['$GARY', '$NGMI', '$COPE', '$HOPIUM', '$BAGS', '$WAGMI', '$SER', '$REKT', '$FOMO', '$PEPEGA2']

interface Candle {
  o: number
  h: number
  l: number
  c: number
}

export function create(ctx: SceneContext) {
  return new Trenches(ctx)
}

class Trenches extends GaryScene {
  poses = new Map<DeskPose, Boil>()
  setD: Drawing
  frameD: Drawing
  screens: Drawing[]
  regime: Regime = 'crab'
  regimeLeft = 8
  candles: Candle[] = []
  cur: Candle
  candleAcc = 0
  price = 1
  ticker = '$GARY'
  shake = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    for (const p of [0, 1, 2, 3, 4] as DeskPose[]) this.poses.set(p, new Boil((v) => deskGary(p, v).ops))
    seed(601)
    this.setD = new Drawing([...chair(), ...desk(), ...monitor(), ...keyboard()])
    seed(602)
    this.frameD = new Drawing([...box(38, 58, 432, 290, 7), ...ln([[54, 312], [454, 311]], 3)])
    this.screens = [0, 1, 2, 3, 4].map((l) => {
      seed(700 + l)
      return new Drawing(canonicalScreen(l))
    })
    this.cur = { o: 1, h: 1, l: 1, c: 1 }
    for (let i = 0; i < 40; i++) {
      this.walk(0.25)
      this.closeCandle()
    }
  }
  lines() {
    return SAY[this.regime]
  }
  setRegime(r: Regime) {
    this.regime = r
    const chaos = this.num('chaos')
    this.regimeLeft = (r === 'rug' ? 5 : this.r.range(7, 15)) / chaos
    if (this.garyOn && this.bool('bubbles')) this.say(this.r.pick(SAY[r]), 3.5)
    this.nextBubble = this.r.range(6, 10)
    if (r === 'rug') {
      this.price *= 0.08
      this.cur.c = this.price
      this.cur.l = Math.min(this.cur.l, this.price)
      this.shake = this.g.reducedMotion ? 0 : 0.6
    }
  }
  nextRegime() {
    const from = this.regime
    if (from === 'rug') {
      // a new token launches on the ashes of the old one
      this.ticker = this.r.pick(TICKERS)
      this.price = 1
      this.candles = []
      this.cur = { o: 1, h: 1, l: 1, c: 1 }
      for (let i = 0; i < 12; i++) {
        this.walk(0.15)
        this.closeCandle()
      }
        return this.setRegime('crab')
    }
    const opts: Regime[] = from === 'pump' ? ['crab', 'chop', 'dump', 'pump'] : from === 'dump' ? ['crab', 'chop', 'rug', 'pump'] : ['pump', 'dump', 'chop', 'crab']
    this.setRegime(this.r.pick(opts))
  }
  walk(dt: number) {
    const drift = { pump: 0.9, crab: 0, chop: 0, dump: -0.6, rug: -0.05 }[this.regime]
    const vol = { pump: 0.6, crab: 0.12, chop: 0.9, dump: 0.5, rug: 0.2 }[this.regime]
    const z = (this.r() + this.r() + this.r() - 1.5) * 2
    this.price *= Math.exp((drift * 0.06 + vol * 0.06 * z) * dt * 4)
    this.price = Math.max(0.0005, this.price)
    this.cur.c = this.price
    this.cur.h = Math.max(this.cur.h, this.price)
    this.cur.l = Math.min(this.cur.l, this.price)
  }
  closeCandle() {
    this.candles.push(this.cur)
    if (this.candles.length > 48) this.candles.shift()
    this.cur = { o: this.price, h: this.price, l: this.price, c: this.price }
  }
  step(dt: number) {
    for (const b of this.poses.values()) b.step(dt, this.boilOn)
    this.tickBubble(dt)
    this.regimeLeft -= dt
    if (this.regimeLeft <= 0) this.nextRegime()
    this.walk(dt)
    this.candleAcc += dt * this.num('chaos')
    if (this.candleAcc > 0.7) {
      this.candleAcc = 0
      this.closeCandle()
    }
    this.shake = Math.max(0, this.shake - dt)
  }
  draw() {
    const c = this.c
    const ink = this.pal.ink
    this.begin()
    if (this.shake > 0) c.translate(Math.sin(this.t * 80) * this.shake * 10, Math.cos(this.t * 67) * this.shake * 6)
    this.frameD.draw(c, ink)
    // big chart
    const all = [...this.candles, this.cur]
    let lo = Infinity
    let hi = -Infinity
    for (const k of all) {
      lo = Math.min(lo, k.l)
      hi = Math.max(hi, k.h)
    }
    const pad = (hi - lo) * 0.1 || 0.01
    lo -= pad
    hi += pad
    const X0 = 56
    const X1 = 452
    const Y0 = 96
    const Y1 = 300
    const y = (p: number) => Y1 - ((p - lo) / (hi - lo)) * (Y1 - Y0)
    const cw = (X1 - X0) / 49
    c.strokeStyle = ink
    c.fillStyle = ink
    all.forEach((k, i) => {
      const x = X0 + i * cw + cw / 2
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(x, y(k.h))
      c.lineTo(x, y(k.l))
      c.stroke()
      const top = y(Math.max(k.o, k.c))
      const bh = Math.max(2, Math.abs(y(k.o) - y(k.c)))
      if (k.c >= k.o) {
        c.fillStyle = this.pal.bg
        c.fillRect(x - cw * 0.32, top, cw * 0.64, bh)
        c.strokeRect(x - cw * 0.32, top, cw * 0.64, bh)
        c.fillStyle = ink
      } else c.fillRect(x - cw * 0.32, top, cw * 0.64, bh)
    })
    c.font = `28px ${VT}`
    c.textAlign = 'left'
    c.fillText(`${this.ticker}/USD  ${this.price < 0.01 ? this.price.toExponential(2) : this.price.toFixed(3)}`, 56, 86)
    c.textAlign = 'right'
    c.fillText(this.regime === 'rug' ? 'RUGGED' : this.regime.toUpperCase(), 452, 86)
    c.font = `22px ${VT}`
    c.textAlign = 'left'
    c.fillText('simulated. not a real market.', 56, 336)

    // desk + Gary, canonical units x3.6
    this.enterCanon(470, 115, 3.6)
    this.setD.draw(c, ink)
    const lvl = POSE[this.regime] as number
    if (this.regime === 'rug') this.screens[4].draw(c, ink)
    else {
      // live mini chart on Gary's monitor
      const pts = all.slice(-24)
      c.save()
      c.beginPath()
      c.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h)
      c.clip()
      c.lineWidth = 2
      c.lineJoin = 'round'
      c.beginPath()
      pts.forEach((k, i) => {
        const px = SCREEN.x + 2 + (i / 23) * (SCREEN.w - 4)
        const py = SCREEN.y + SCREEN.h - 3 - ((k.c - lo) / (hi - lo)) * (SCREEN.h - 6)
        if (i) c.lineTo(px, py)
        else c.moveTo(px, py)
      })
      c.stroke()
      c.restore()
    }
    if (this.garyOn) {
      const motion = lvl >= 3 && !this.g.reducedMotion ? Math.sin(this.t * 40) * 0.25 : Math.sin(this.t * 2.2) * 0.35
      c.save()
      c.translate(2.5 + (lvl >= 3 ? motion : 0), -1.6 + (lvl < 3 ? motion : 0))
      this.poses.get(POSE[this.regime])!.draw(c, ink)
      c.restore()
    }
    c.restore()

    // bubble above Gary's head (head centre in canonical units -> world)
    const head = this.regime === 'pump' ? [32, 36] : this.regime === 'chop' ? [46, 39] : [37, 36]
    this.drawBubble(470 + (head[0] + 6) * 3.6, 115 + (head[1] - 16) * 3.6, 30)
    this.footer()
  }
}
