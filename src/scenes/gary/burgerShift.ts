import { Boil, Drawing, VT } from '../../engine/gary/draw'
import { box, counterGary, ln, seed, txt } from '../../engine/gary/kit'
import type { SceneContext } from '../../engine/types'
import { GaryScene } from './garyBase'

const LINES = ['fries with that?', 'order up!', 'no, we do not take tokens', 'extra salt. like my bags.', 'have a based day', 'one burger, no FOMO']

export function create(ctx: SceneContext) {
  return new BurgerShift(ctx)
}

/** Back to burgers: the menu, the counter, a blinking OPEN sign and Gary serving. */
class BurgerShift extends GaryScene {
  idle = new Boil((v) => counterGary(0, v).ops)
  serve = new Boil((v) => counterGary(1, v).ops)
  setD: Drawing
  serveT = -1
  orderAcc = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    seed(501)
    this.setD = new Drawing([
      ...txt(470, 78, 52, 'BURGERS'),
      ...txt(470, 108, 24, 'now hiring: ex-degens'),
      ...box(100, 150, 184, 176, 7),
      ...txt(192, 190, 32, 'MENU'),
      ...txt(192, 228, 26, 'burger 4.20'),
      ...txt(192, 256, 26, 'fries 0.69'),
      ...txt(192, 284, 26, 'moonbags: no'),
      ...txt(192, 312, 26, 'hope: sold out'),
      ...ln([[318, 345], [724, 342]], 9),
      ...ln([[324, 345], [325, 446]], 8),
      ...ln([[718, 343], [720, 448]], 8),
      ...ln([[576, 314], [692, 315], [693, 338], [577, 339], [576, 314]], 6),
      ...ln([[606, 314], [604, 302]], 4),
      ...ln([[642, 314], [644, 302]], 4),
    ])
    this.nextBubble = 2
  }
  lines() {
    return LINES
  }
  step(dt: number) {
    this.idle.step(dt, this.boilOn)
    this.serve.step(dt, this.boilOn)
    this.tickBubble(dt)
    this.orderAcc += dt * this.num('rush')
    if (this.orderAcc > 7) {
      this.orderAcc = 0
      this.serveT = 0
    }
    if (this.serveT >= 0) {
      this.serveT += dt
      if (this.serveT > 1.8) this.serveT = -1
    }
  }
  draw() {
    const c = this.c
    const ink = this.pal.ink
    this.begin()
    this.setD.draw(c, ink)
    // OPEN sign, blinking like a cheap neon
    c.lineWidth = 6
    c.strokeStyle = ink
    c.fillStyle = ink
    c.strokeRect(770, 180, 120, 48)
    if (Math.floor(this.t * 1.2) % 6 !== 0) {
      c.font = `38px ${VT}`
      c.textAlign = 'center'
      c.fillText('OPEN', 830, 216)
    }
    if (this.garyOn) {
      c.save()
      c.beginPath()
      c.rect(0, 0, 960, 341)
      c.clip()
      this.enterCanon(270, 65)
      ;(this.serveT >= 0 ? this.serve : this.idle).draw(c, ink)
      c.restore()
      c.restore()
    } else {
      c.font = `28px ${VT}`
      c.textAlign = 'center'
      c.fillText('on break. back in 5. maybe.', 500, 300)
    }
    this.drawBubble(512, 176, 30)
  }
}
