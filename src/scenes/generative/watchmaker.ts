import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

type Gear = { x: number; y: number; teeth: number; r: number; ratio: number; phase: number; col: string; spokes: number }

export function create(ctx: SceneContext) {
  return new Watchmaker(ctx)
}

/**
 * A watch movement on the bench: a gear train that meshes properly (each wheel turns at the
 * speed its teeth allow), an escape wheel that ticks, a balance wheel swinging, ruby jewels.
 */
class Watchmaker extends PixelScene {
  gears: Gear[] = []
  angle = 0
  tick = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.35
  }
  // plate geometry and balance wheel, computed in layout()
  px = 0
  py = 0
  plate = 0
  bx = 0
  by = 0
  br = 0
  layout() {
    const { w, h } = this
    if (!w) return
    // build the train in tooth-module units around the origin, then fit it to the plate
    const gears: Gear[] = []
    const cols = ['#d9a84a', '#e8c070', '#c8903a', '#b8b0a0']
    const add = (teeth: number, from: Gear | null, ang: number) => {
      const r = (teeth * 1.6) / 2
      let x = 0
      let y = 0
      let ratio = 1
      let phase = 0
      if (from) {
        const d = from.r + r
        x = from.x + Math.cos(ang) * d
        y = from.y + Math.sin(ang) * d
        ratio = -from.ratio * (from.teeth / teeth)
        // align teeth so they mesh at the contact point
        phase = Math.PI + ang + (Math.PI / teeth) * ((teeth + 1) % 2)
      }
      const g: Gear = { x, y, teeth, r, ratio, phase, col: cols[gears.length % cols.length], spokes: 4 + (teeth % 3) }
      gears.push(g)
      return g
    }
    const main = add(48, null, 0)
    // angles chosen offline so the wheels cluster tightly without touching
    const g2 = add(16, main, 0.75)
    const g3 = add(40, g2, -0.23)
    const g4 = add(14, g3, -1.87)
    const g5 = add(30, g4, -1.73)
    add(12, main, 1.6)
    add(24, main, -1.51)
    const esc = add(10, g5, -0.49)
    // the balance sits beside the escape wheel, on the side away from the train
    const br0 = 24
    const ox = esc.x - main.x
    const oy = esc.y - main.y
    const ol = Math.hypot(ox, oy) || 1
    const bd = esc.r + br0 + 4
    const bx0 = esc.x + (ox / ol) * bd
    const by0 = esc.y + (oy / ol) * bd
    // bounding box of everything (teeth included)
    let x0 = bx0 - br0
    let x1 = bx0 + br0
    let y0 = by0 - br0
    let y1 = by0 + br0
    for (const g of gears) {
      const e = g.r + 1.6
      x0 = Math.min(x0, g.x - e)
      x1 = Math.max(x1, g.x + e)
      y0 = Math.min(y0, g.y - e)
      y1 = Math.max(y1, g.y + e)
    }
    // smallest enclosing circle, found by a coarse-to-fine search over its centre
    const reach = (qx: number, qy: number) => {
      let r = Math.hypot(bx0 - qx, by0 - qy) + br0
      for (const g of gears) r = Math.max(r, Math.hypot(g.x - qx, g.y - qy) + g.r + 1.6)
      return r
    }
    let cx = (x0 + x1) / 2
    let cy = (y0 + y1) / 2
    let R = reach(cx, cy)
    for (let stepSize = (x1 - x0) / 4; stepSize > 0.2; stepSize /= 2) {
      let moved = true
      while (moved) {
        moved = false
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const r = reach(cx + dx * stepSize, cy + dy * stepSize)
          if (r < R) {
            R = r
            cx += dx * stepSize
            cy += dy * stepSize
            moved = true
          }
        }
      }
    }
    this.px = w / 2
    this.py = h / 2
    this.plate = Math.min(w, h) * 0.46
    const k = (this.plate * 0.9) / R
    for (const g of gears) {
      g.x = this.px + (g.x - cx) * k
      g.y = this.py + (g.y - cy) * k
      g.r *= k
    }
    this.bx = this.px + (bx0 - cx) * k
    this.by = this.py + (by0 - cy) * k
    this.br = br0 * k
    this.gears = gears
  }
  step(dt: number) {
    const sp = this.num('speed')
    // escapement: the train advances in small ticks
    this.tick += dt * sp * 5
    while (this.tick >= 1) {
      this.tick--
      this.angle += 0.012
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    // velvet bench and loupe light
    c.fillStyle = '#1a0f14'
    c.fillRect(0, 0, w, h)
    glow(c, this.px, this.py, Math.max(w, h) * 0.6, 'rgba(255,200,120,0.25)')
    // main plate
    const { px, py, plate } = this
    c.fillStyle = '#5c4434'
    c.beginPath()
    c.arc(px, py, plate, 0, TAU)
    c.fill()
    c.strokeStyle = '#8a6a52'
    c.lineWidth = Math.max(1, u)
    c.beginPath()
    c.arc(px, py, plate * 0.98, 0, TAU)
    c.stroke()
    // perlage pattern on the plate
    c.strokeStyle = 'rgba(255,230,180,0.06)'
    for (let i = 0; i < 60; i++) {
      const a = i * 2.4
      const d = (i / 60) * plate * 0.9
      c.beginPath()
      c.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, plate * 0.08, 0, TAU)
      c.stroke()
    }
    for (const g of this.gears) this.gear(g)
    // balance wheel on the right, swinging back and forth
    const { bx, by, br } = this
    const swing = Math.sin(this.t * this.num('speed') * 5) * 2.2
    c.save()
    c.translate(bx, by)
    c.rotate(swing)
    c.strokeStyle = '#e8c070'
    c.lineWidth = br * 0.1
    c.beginPath()
    c.arc(0, 0, br, 0, TAU)
    c.stroke()
    c.lineWidth = br * 0.06
    for (let k = 0; k < 3; k++) {
      const a = (k * TAU) / 3
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(Math.cos(a) * br, Math.sin(a) * br)
      c.stroke()
    }
    c.restore()
    // hairspring
    c.strokeStyle = '#d8d0c0'
    c.lineWidth = Math.max(1, 0.3 * u)
    c.beginPath()
    for (let a = 0; a < TAU * 4; a += 0.1) {
      const r = br * 0.1 + (a / (TAU * 4)) * br * 0.55 * (1 + Math.sin(swing) * 0.04)
      c.lineTo(bx + Math.cos(a + swing) * r, by + Math.sin(a + swing) * r)
    }
    c.stroke()
    this.jewel(bx, by, br * 0.12)
    // bridge across the lower plate, screwed down with two jewels
    c.fillStyle = 'rgba(200,190,170,0.85)'
    c.beginPath()
    c.moveTo(px - plate * 0.62, py + plate * 0.62)
    c.quadraticCurveTo(px, py + plate * 0.28, px + plate * 0.62, py + plate * 0.62)
    c.lineTo(px + plate * 0.54, py + plate * 0.74)
    c.quadraticCurveTo(px, py + plate * 0.44, px - plate * 0.54, py + plate * 0.74)
    c.fill()
    this.jewel(px - plate * 0.5, py + plate * 0.62, 3 * u)
    this.jewel(px + plate * 0.5, py + plate * 0.62, 3 * u)
  }
  gear(g: Gear) {
    const c = this.c
    const a = this.angle * g.ratio + g.phase
    const tooth = (g.r * TAU) / g.teeth
    c.save()
    c.translate(g.x, g.y)
    c.rotate(a)
    c.fillStyle = 'rgba(0,0,0,0.35)'
    c.beginPath()
    c.arc(tooth * 0.3, tooth * 0.4, g.r, 0, TAU)
    c.fill()
    c.fillStyle = g.col
    c.beginPath()
    for (let i = 0; i < g.teeth; i++) {
      const a0 = (i / g.teeth) * TAU
      const a1 = ((i + 0.5) / g.teeth) * TAU
      const ro = g.r + tooth * 0.42
      const ri = g.r - tooth * 0.38
      c.lineTo(Math.cos(a0) * ri, Math.sin(a0) * ri)
      c.lineTo(Math.cos(a0 + 0.12 / g.teeth * 6) * ro, Math.sin(a0 + 0.12 / g.teeth * 6) * ro)
      c.lineTo(Math.cos(a1 - 0.12 / g.teeth * 6) * ro, Math.sin(a1 - 0.12 / g.teeth * 6) * ro)
      c.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri)
    }
    c.closePath()
    c.fill()
    // spokes cut out of the wheel
    if (g.teeth > 14) {
      c.fillStyle = '#3a2418'
      for (let k = 0; k < g.spokes; k++) {
        const s0 = (k / g.spokes) * TAU + 0.18
        const s1 = ((k + 1) / g.spokes) * TAU - 0.18
        c.beginPath()
        c.arc(0, 0, g.r * 0.75, s0, s1)
        c.arc(0, 0, g.r * 0.3, s1, s0, true)
        c.closePath()
        c.fill()
      }
    }
    c.restore()
    this.jewel(g.x, g.y, Math.max(2, g.r * 0.12))
  }
  jewel(x: number, y: number, r: number) {
    const c = this.c
    c.fillStyle = '#d8d0c0'
    c.beginPath()
    c.arc(x, y, r * 1.5, 0, TAU)
    c.fill()
    c.fillStyle = '#c8203a'
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.fill()
    c.fillStyle = '#ff8aa0'
    c.beginPath()
    c.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU)
    c.fill()
  }
}
