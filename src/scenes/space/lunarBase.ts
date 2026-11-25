import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { rr } from '../kit'

const C = {
  sky: '#0a0c16',
  star: '#e8ecf8',
  earthSea: '#3a7ad8',
  earthLand: '#6cc070',
  earthCloud: '#f0f4ff',
  earthNight: '#0f1630',
  ground1: '#8a8e9e',
  ground2: '#a8acba',
  ground3: '#c8ccd8',
  crater: '#6e7282',
  craterRim: '#dadee8',
  hull: '#eef0f4',
  hull2: '#c8ccd6',
  stripe: '#ff7a3a',
  glass: '#3a4a6a',
  light: '#ffd27a',
  panel: '#2a3a7a',
  panel2: '#4a5aa8',
  rover: '#f4f4f0',
  tyre: '#2a2c34',
  red: '#ff4a4a',
}

export function create(ctx: SceneContext) {
  return new LunarBase(ctx)
}

/**
 * Lunar Base, in flat illustration: solid colours and clean shapes, no gradients on the ground.
 * Modules with orange bands, domes, a solar array, a lander on its pad, a rover making its rounds,
 * and the Earth hanging in a black sky.
 */
class LunarBase extends PixelScene {
  stars: { x: number; y: number; s: number }[] = []
  craters: { x: number; y: number; r: number }[] = []
  rover = { x: 0.15, dir: 1, pause: 0 }
  tracks: number[] = []
  dust: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.mono
  }
  dither() {
    return 0.2
  }
  get G() {
    return this.h * (this.h > this.w ? 0.62 : 0.6)
  }
  layout() {
    const R = rng(17)
    this.stars = Array.from({ length: 140 }, () => ({ x: R(), y: R() * 0.55, s: R.chance(0.1) ? 2 : 1 }))
    this.craters = Array.from({ length: 9 }, () => ({ x: R(), y: R.range(0.05, 0.9), r: R.range(0.03, 0.08) }))
  }
  step(dt: number) {
    const sp = this.num('speed')
    const rv = this.rover
    if (rv.pause > 0) rv.pause -= dt * sp
    else {
      rv.x += rv.dir * dt * 0.03 * sp
      if (rv.x > 0.9 || rv.x < 0.1) {
        rv.dir *= -1
        rv.pause = 2.5
      }
      if (this.r.chance(dt * 10)) this.dust.push({ x: rv.x - rv.dir * 0.015, y: 0, vx: -rv.dir * this.r.range(0.005, 0.02), vy: -this.r.range(0.02, 0.05), life: 1 })
      const last = this.tracks[this.tracks.length - 1]
      if (last === undefined || Math.abs(last - rv.x) > 0.008) {
        this.tracks.push(rv.x)
        if (this.tracks.length > 140) this.tracks.shift()
      }
    }
    for (const d of this.dust) {
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.vy += 0.03 * dt
      d.life -= dt * 0.7
    }
    this.dust = this.dust.filter((d) => d.life > 0)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const G = this.G
    const s = Math.min(w, h) / 180
    c.fillStyle = C.sky
    c.fillRect(0, 0, w, h)
    for (const st of this.stars) {
      c.fillStyle = C.star
      c.fillRect(st.x * w, st.y * h, st.s * u * 0.5 + 0.5, st.s * u * 0.5 + 0.5)
    }
    // the Earth: flat disc, two continents, a cloud band, the night side as a flat crescent
    const ex = w * 0.76
    const ey = h * 0.2
    const er = Math.min(w, h) * 0.1
    c.save()
    c.beginPath()
    c.arc(ex, ey, er, 0, TAU)
    c.clip()
    c.fillStyle = C.earthSea
    c.fillRect(ex - er, ey - er, er * 2, er * 2)
    c.fillStyle = C.earthLand
    c.beginPath()
    c.ellipse(ex - er * 0.3, ey - er * 0.2, er * 0.42, er * 0.3, 0.6, 0, TAU)
    c.ellipse(ex + er * 0.35, ey + er * 0.35, er * 0.3, er * 0.22, -0.4, 0, TAU)
    c.fill()
    c.fillStyle = C.earthCloud
    rr(c, ex - er * 0.9, ey + er * 0.02, er * 1.1, er * 0.12, er * 0.06)
    c.fill()
    rr(c, ex - er * 0.2, ey - er * 0.6, er * 0.8, er * 0.1, er * 0.05)
    c.fill()
    c.fillStyle = C.earthNight
    c.beginPath()
    c.arc(ex + er * 0.55, ey - er * 0.1, er * 1.05, 0, TAU)
    c.fill()
    c.restore()
    // ground in three flat bands
    c.fillStyle = C.ground1
    c.beginPath()
    c.moveTo(0, G)
    for (let x = 0; x <= w; x += 8) c.lineTo(x, G - Math.abs(Math.sin(x * 0.006)) * 18 * s - Math.abs(Math.sin(x * 0.023)) * 5 * s)
    c.lineTo(w, h)
    c.lineTo(0, h)
    c.fill()
    c.fillStyle = C.ground2
    c.fillRect(0, G + 6 * s, w, h)
    c.fillStyle = C.ground3
    c.fillRect(0, G + 40 * s, w, h)
    // flat craters with a lit rim
    for (const cr of this.craters) {
      const x = cr.x * w
      const y = G + 8 * s + cr.y * (h - G - 10 * s)
      const r = cr.r * w
      c.fillStyle = C.craterRim
      c.beginPath()
      c.ellipse(x, y + r * 0.06, r, r * 0.28, 0, 0, TAU)
      c.fill()
      c.fillStyle = C.crater
      c.beginPath()
      c.ellipse(x, y, r * 0.88, r * 0.22, 0, 0, TAU)
      c.fill()
    }
    // the base, left of centre
    const bx = w * (this.h > this.w ? 0.32 : 0.3)
    const by = G + 6 * s
    // solar array
    for (let k = 0; k < 3; k++) {
      const px = bx - 46 * s + k * 13 * s
      c.fillStyle = C.hull2
      c.fillRect(px + 5 * s, by - 10 * s, 1.4 * s, 10 * s)
      c.fillStyle = C.panel
      c.beginPath()
      c.moveTo(px, by - 10 * s)
      c.lineTo(px + 12 * s, by - 12 * s)
      c.lineTo(px + 12 * s, by - 20 * s)
      c.lineTo(px, by - 18 * s)
      c.fill()
      c.fillStyle = C.panel2
      c.fillRect(px + 5.6 * s, by - 18 * s, 0.8 * s, 7 * s)
    }
    // long module with an orange band and portholes
    c.fillStyle = C.hull
    rr(c, bx - 6 * s, by - 14 * s, 44 * s, 14 * s, 7 * s)
    c.fill()
    c.fillStyle = C.stripe
    c.fillRect(bx - 4 * s, by - 6 * s, 40 * s, 2.4 * s)
    for (let k = 0; k < 4; k++) {
      c.fillStyle = C.light
      c.beginPath()
      c.arc(bx + 4 * s + k * 9 * s, by - 10 * s, 1.8 * s, 0, TAU)
      c.fill()
    }
    // dome
    c.fillStyle = C.hull
    c.beginPath()
    c.arc(bx + 50 * s, by, 14 * s, Math.PI, 0)
    c.fill()
    c.fillStyle = C.glass
    c.beginPath()
    c.arc(bx + 50 * s, by, 9 * s, Math.PI, 0)
    c.fill()
    c.fillStyle = C.light
    c.fillRect(bx + 47 * s, by - 4 * s, 2 * s, 2 * s)
    c.fillRect(bx + 52 * s, by - 6 * s, 2 * s, 2 * s)
    c.fillStyle = C.hull2
    c.fillRect(bx + 36 * s, by - 6 * s, 3 * s, 6 * s)
    // antenna mast with a blinking light
    c.fillStyle = C.hull2
    c.fillRect(bx + 66 * s, by - 34 * s, 1.6 * s, 34 * s)
    c.beginPath()
    c.arc(bx + 69 * s, by - 34 * s, 5 * s, Math.PI * 0.6, Math.PI * 1.4)
    c.lineTo(bx + 69 * s, by - 34 * s)
    c.fill()
    if (Math.sin(this.t * 3) > 0.5) {
      c.fillStyle = C.red
      c.beginPath()
      c.arc(bx + 66.8 * s, by - 36 * s, 1.6 * s, 0, TAU)
      c.fill()
    }
    // lander on its pad
    const lx = w * 0.78
    const ly = G + 16 * s
    c.fillStyle = C.ground1
    c.beginPath()
    c.ellipse(lx, ly, 20 * s, 3 * s, 0, 0, TAU)
    c.fill()
    c.fillStyle = C.light
    for (let k = 0; k < 4; k++) c.fillRect(lx - 18 * s + k * 12 * s, ly - 0.6 * s, 2 * s, 1.2 * s)
    c.fillStyle = C.hull2
    c.beginPath()
    c.moveTo(lx - 12 * s, ly)
    c.lineTo(lx - 6 * s, ly - 8 * s)
    c.moveTo(lx + 12 * s, ly)
    c.lineTo(lx + 6 * s, ly - 8 * s)
    c.strokeStyle = C.hull2
    c.lineWidth = 1.4 * s
    c.stroke()
    c.fillStyle = '#e0b040'
    c.fillRect(lx - 8 * s, ly - 14 * s, 16 * s, 7 * s)
    c.fillStyle = C.hull
    rr(c, lx - 6 * s, ly - 24 * s, 12 * s, 11 * s, 3 * s)
    c.fill()
    c.fillStyle = C.glass
    c.fillRect(lx - 3 * s, ly - 21 * s, 6 * s, 3 * s)
    // rover tracks and the rover
    const ty = G + 26 * s
    c.fillStyle = C.ground1
    for (const t of this.tracks) c.fillRect(t * w, ty + 2 * s, 1.6 * s, 0.8 * s)
    const rv = this.rover
    const rx = rv.x * w
    c.fillStyle = C.rover
    rr(c, rx - 10 * s, ty - 9 * s, 20 * s, 6 * s, 2 * s)
    c.fill()
    c.fillStyle = C.stripe
    c.fillRect(rx - 10 * s, ty - 5 * s, 20 * s, 1.4 * s)
    c.fillStyle = C.glass
    c.fillRect(rx + rv.dir * 3 * s - 3 * s, ty - 8 * s, 6 * s, 3 * s)
    c.fillStyle = C.hull2
    c.fillRect(rx - rv.dir * 6 * s, ty - 15 * s, 1.2 * s, 6 * s)
    c.beginPath()
    c.arc(rx - rv.dir * 6 * s, ty - 15 * s, 2.4 * s, 0, TAU)
    c.fill()
    c.fillStyle = C.tyre
    for (const k of [-6, 0, 6]) {
      c.beginPath()
      c.arc(rx + k * s, ty - 2 * s, 2.6 * s, 0, TAU)
      c.fill()
    }
    c.fillStyle = C.ground3
    for (const d of this.dust) {
      c.globalAlpha = d.life
      c.fillRect(d.x * w, ty - 3 * s + d.y * h * 0.5, 1.4 * s, 1.4 * s)
    }
    c.globalAlpha = 1
  }
}
