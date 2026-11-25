import { Boil, Drawing, VT } from '../../engine/gary/draw'
import { box, chair, desk, deskGary, keyboard, ln, monitor, seed, SCREEN } from '../../engine/gary/kit'
import type { SceneContext } from '../../engine/types'
import { GaryScene } from './garyBase'

/** Kept short: the monitor only fits about 14 characters per line at this size. */
const LOG = ['gary is afk', 'build ok', 'tests 41/42', 'fixed #42.', 'lint: clean', 'backup done', 'docs updated', 'cache warm', 'deploy? no.', 'waiting.', 'rebasing...', 'all good']
const ZZZ = ['zzz... up only...', 'zzz... one more commit...', 'zzz... wen moon...', 'zzz... ship it...', 'zzz... gm...']

export function create(ctx: SceneContext) {
  return new GaryExe(ctx)
}

/** Gary asleep at his desk at night. Jarvis keeps typing on the screen. Nothing else. */
class GaryExe extends GaryScene {
  windowD: Drawing
  setD: Drawing
  chairD: Drawing
  gary = new Boil((v) => deskGary('sleep', v).ops)
  log: string[] = []
  logAcc = 0
  zs: { x: number; y: number; a: number }[] = []
  zAcc = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    seed(4242)
    this.windowD = new Drawing([...box(120, 110, 120, 136, 9), ...ln([[180, 112], [181, 244]], 7), ...ln([[122, 178], [238, 177]], 7)])
    seed(99)
    this.setD = new Drawing([...desk(), ...monitor(), ...keyboard()])
    seed(98)
    this.chairD = new Drawing(chair())
    for (let i = 0; i < 4; i++) this.log.push(this.r.pick(LOG))
    this.nextBubble = 5
  }
  lines() {
    return ZZZ
  }
  step(dt: number) {
    this.gary.step(dt, this.boilOn)
    this.tickBubble(dt)
    this.logAcc += dt * this.num('jarvis')
    if (this.logAcc > 2.4) {
      this.logAcc = 0
      this.log.push(this.garyOn ? this.r.pick(LOG) : this.r.pick(['gary is out', ...LOG]))
      if (this.log.length > 4) this.log.shift()
    }
    if (this.garyOn) {
      this.zAcc += dt
      if (this.zAcc > 1.8) {
        this.zAcc = 0
        this.zs.push({ x: 0, y: 0, a: 0 })
      }
    }
    for (const z of this.zs) {
      z.a += dt
      z.y -= dt * 18
      z.x += dt * 9
    }
    this.zs = this.zs.filter((z) => z.a < 3)
  }
  draw() {
    const c = this.c
    const ink = this.pal.ink
    this.begin()
    // the screen's glow on the wall
    if (this.bool('lamp')) {
      const k = 0.5 + 0.08 * Math.sin(this.t * 3)
      const g = c.createRadialGradient(684, 240, 10, 684, 240, 220)
      g.addColorStop(0, this.pal.bubble)
      g.addColorStop(1, this.pal.bg)
      c.globalAlpha = k
      c.fillStyle = g
      c.fillRect(440, 40, 500, 330)
      c.globalAlpha = 1
    }
    // window: moon crossing slowly, two stars blinking
    c.strokeStyle = ink
    c.lineCap = 'round'
    c.lineWidth = 7
    const mx = 148 + ((this.t * 0.5) % 30)
    c.beginPath()
    c.arc(mx, 144, 13, Math.PI * 0.35, Math.PI * 1.55)
    c.stroke()
    c.lineWidth = 4
    for (const [x, y, ph] of [
      [214, 138, 0],
      [150, 216, 2.1],
    ]) {
      if (Math.sin(this.t * 1.1 + ph) < -0.3) continue
      c.beginPath()
      c.moveTo(x - 6, y)
      c.lineTo(x + 6, y)
      c.moveTo(x, y - 6)
      c.lineTo(x, y + 6)
      c.stroke()
    }
    this.windowD.draw(c, ink)

    this.enterCanon(260, 68)
    this.setD.draw(c, ink)
    // Jarvis's log on the monitor
    c.save()
    c.beginPath()
    c.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h)
    c.clip()
    c.font = `5px ${VT}`
    c.textAlign = 'left'
    c.fillStyle = ink
    this.log.forEach((l, i) => c.fillText(l, SCREEN.x + 2, SCREEN.y + 6 + i * 5.2))
    if (Math.floor(this.t * 2) % 2) c.fillRect(SCREEN.x + 2, SCREEN.y + 6 + this.log.length * 5.2 - 3.6, 2.4, 4)
    c.restore()
    this.chairD.draw(c, ink)
    if (this.garyOn) {
      const br = this.g.reducedMotion ? 0 : Math.sin(this.t * 1.4) * 0.5
      c.save()
      c.translate(2.5, -1.6 + br)
      this.gary.draw(c, ink)
      c.restore()
    }
    c.restore()

    c.fillStyle = ink
    c.textAlign = 'left'
    for (const z of this.zs) {
      if (z.a > 2.6 && Math.floor(z.a * 8) % 2) continue
      c.font = `${Math.round(24 + z.a * 8)}px ${VT}`
      c.fillText(z.a < 1 ? 'z' : 'Z', 560 + z.x, 228 + z.y)
    }
    this.drawBubble(536, 128, 30)
  }
}
