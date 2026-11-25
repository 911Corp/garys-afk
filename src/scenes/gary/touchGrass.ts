import { createNoise } from '../../engine/noise'
import { Boil, Drawing } from '../../engine/gary/draw'
import { blob, grassGary, ln, seed, type Op } from '../../engine/gary/kit'
import type { SceneContext } from '../../engine/types'
import { GaryScene } from './garyBase'

const LINES = ['is this the dip?', 'grass. bullish.', 'touched it. now what?', 'no signal. perfect.', 'sun is up. so are my bags?', 'chart says 3 min have passed', 'gm, nature', 'birds are not on-chain']

const GROUND = 436

export function create(ctx: SceneContext) {
  return new TouchGrass(ctx)
}

interface Blade {
  x: number
  h: number
  lean: number
  w: number
}

class TouchGrass extends GaryScene {
  noise = createNoise(7)
  phone = new Boil((v) => grassGary(false, v).ops)
  up = new Boil((v) => grassGary(true, v).ops)
  lookUp = false
  poseT = 0
  blades: Blade[] = []
  trunk: Drawing
  crown: Drawing
  crown2: Drawing
  groundD: Drawing
  clouds: { x: number; y: number; k: number; d: Drawing }[] = []
  birds: { x: number; y: number; v: number; ph: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    seed(301)
    this.trunk = new Drawing([...ln([[172, 436], [176, 380], [174, 330], [178, 290]], 9), ...ln([[176, 360], [210, 326]], 7)])
    seed(302)
    this.crown = new Drawing(ln([[178, 292], [128, 278], [112, 240], [128, 198], [168, 180], [208, 184], [232, 216], [236, 256], [214, 282], [178, 292]], 8))
    seed(303)
    this.crown2 = new Drawing(blob(222, 258, 32, 26, { w: 7, from: -2.6, to: 1.9 }))
    seed(304)
    this.groundD = new Drawing(ln([[78, GROUND], [500, GROUND + 1], [902, GROUND - 1]], 8))
    for (let x = 84; x < 900; x += this.r.range(9, 15)) this.blades.push({ x, h: this.r.range(12, 26), lean: this.r.range(-0.3, 0.3), w: this.r.range(3.2, 4.6) })
    for (let i = 0; i < 3; i++) {
      seed(400 + i)
      const ops: Op[] = [...ln([[0, 0], [8, -12], [26, -16], [40, -6]], 6), ...ln([[34, -10], [48, -22], [68, -20], [80, -4], [84, 0]], 6)]
      this.clouds.push({ x: this.r.range(0, 960), y: this.r.range(70, 150), k: this.r.range(0.8, 1.3), d: new Drawing(ops) })
    }
    this.nextBubble = 3
  }
  lines() {
    return LINES
  }
  /** 0 = midnight, 0.5 = noon */
  dayPhase() {
    const mode = this.str('time')
    if (mode === 'day') return 0.45
    if (mode === 'sunset') return 0.76
    if (mode === 'night') return 0.02
    return (0.4 + this.t / (this.num('cycle') * 60)) % 1
  }
  step(dt: number) {
    this.phone.step(dt, this.boilOn)
    this.up.step(dt, this.boilOn)
    this.tickBubble(dt)
    this.poseT += dt
    if (this.poseT > (this.lookUp ? 8 : 12)) {
      this.poseT = 0
      this.lookUp = !this.lookUp
    }
    const wind = this.num('wind')
    for (const cl of this.clouds) {
      cl.x += dt * (6 + wind * 10) * cl.k
      if (cl.x > 1020) cl.x = -120
    }
    const ph = this.dayPhase()
    const day = ph > 0.22 && ph < 0.8
    if (day && this.birds.length < 3 && this.r.chance(dt / 6)) this.birds.push({ x: -30, y: this.r.range(110, 200), v: this.r.range(40, 70), ph: this.r.range(0, 6) })
    for (const b of this.birds) {
      b.x += dt * b.v
      b.y += Math.sin(this.t * 0.8 + b.ph) * dt * 6
    }
    this.birds = this.birds.filter((b) => b.x < 1000)
  }
  draw() {
    const c = this.c
    const ink = this.pal.ink
    const ph = this.dayPhase()
    // darkness: 0 at noon, 1 at midnight
    const dark = Math.pow(Math.max(0, Math.cos(ph * Math.PI * 2)), 0.8)
    this.begin()
    if (dark > 0.01) {
      // night falls in dithered steps of the LCD palette
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.fillStyle = ink
      c.globalAlpha = dark * 0.55
      c.fillRect(0, 0, this.w, this.h)
      c.globalAlpha = 1
      c.setTransform(this.scale, 0, 0, this.scale, this.ox, this.oy)
    }
    // sun (day) or moon + stars (night) on an arc
    const a = (ph - 0.25) * Math.PI * 2 // sun angle: rises at 0.25, sets at 0.75
    const sx = 600 - Math.cos(a) * 320
    const sy = 360 - Math.sin(a) * 290
    c.strokeStyle = ink
    c.lineCap = 'round'
    if (sy < 330) {
      c.lineWidth = 7
      c.beginPath()
      c.arc(sx, sy, 24, 0, Math.PI * 2)
      c.stroke()
      const rot = this.t * 0.2
      c.lineWidth = 6
      for (let i = 0; i < 8; i++) {
        const t = rot + (i * Math.PI) / 4
        c.beginPath()
        c.moveTo(sx + Math.cos(t) * 36, sy + Math.sin(t) * 36)
        c.lineTo(sx + Math.cos(t) * 48, sy + Math.sin(t) * 48)
        c.stroke()
      }
    }
    const ma = a + Math.PI
    const mx = 600 - Math.cos(ma) * 320
    const my = 360 - Math.sin(ma) * 290
    if (my < 330) {
      c.lineWidth = 7
      c.beginPath()
      c.arc(mx, my, 20, Math.PI * 0.35, Math.PI * 1.55)
      c.stroke()
      if (dark > 0.4) {
        c.lineWidth = 4
        for (let i = 0; i < 9; i++) {
          const x = 300 + ((i * 137) % 620)
          const y = 60 + ((i * 71) % 200)
          c.globalAlpha = (dark - 0.4) * (0.6 + 0.4 * Math.sin(this.t * 1.2 + i))
          c.beginPath()
          c.moveTo(x - 6, y)
          c.lineTo(x + 6, y)
          c.moveTo(x, y - 6)
          c.lineTo(x, y + 6)
          c.stroke()
        }
        c.globalAlpha = 1
      }
    }
    for (const cl of this.clouds) {
      c.save()
      c.translate(cl.x, cl.y)
      c.scale(cl.k, cl.k)
      cl.d.draw(c, ink)
      c.restore()
    }
    // birds: two strokes flapping
    c.lineWidth = 5
    for (const b of this.birds) {
      const f = Math.sin(this.t * 9 + b.ph) * 7
      c.beginPath()
      c.moveTo(b.x - 12, b.y + f * 0.6)
      c.lineTo(b.x, b.y - 4)
      c.lineTo(b.x + 12, b.y + f * 0.6)
      c.stroke()
    }
    // tree, swaying from its base
    const wind = this.num('wind')
    const sway = this.g.reducedMotion ? 0 : (this.noise.noise2(this.t * 0.3, 1) * 0.02 + Math.sin(this.t * 1.1) * 0.006) * wind
    this.trunk.draw(c, ink)
    c.save()
    c.translate(176, 330)
    c.rotate(sway)
    c.translate(-176, -330)
    this.crown.draw(c, ink)
    this.crown2.draw(c, ink)
    c.restore()

    // Gary
    if (this.garyOn) {
      this.enterCanon(222, 68)
      const br = this.g.reducedMotion ? 0 : Math.sin(this.t * 1.3) * 0.25
      c.translate(0, br)
      ;(this.lookUp ? this.up : this.phone).draw(c, ink)
      c.restore()
    }

    this.groundD.draw(c, ink)
    // grass, bending with the wind
    c.lineCap = 'round'
    for (const b of this.blades) {
      const n = this.noise.noise2(b.x * 0.004 - this.t * 0.5 * (0.3 + wind), this.t * 0.2)
      const bend = this.g.reducedMotion ? b.lean : b.lean + (n * 0.6 + 0.25) * wind
      c.lineWidth = b.w
      c.beginPath()
      c.moveTo(b.x, GROUND)
      c.quadraticCurveTo(b.x + bend * b.h * 0.3, GROUND - b.h * 0.6, b.x + bend * b.h, GROUND - b.h)
      c.stroke()
    }
    this.drawBubble(486, 196, 30)
  }
}
