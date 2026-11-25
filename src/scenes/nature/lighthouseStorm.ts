import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow } from '../kit'

export function create(ctx: SceneContext) {
  return new LighthouseStorm(ctx)
}

/** A lighthouse holds on in a storm: heavy swells, spray on the rocks, slanting rain, and the beam sweeping the dark. */
class LighthouseStorm extends PixelScene {
  rain: { x: number; y: number; v: number }[] = []
  spray: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  clouds: { x: number; y: number; r: number; v: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.rain = Array.from({ length: 260 }, () => ({ x: this.r(), y: this.r(), v: this.r.range(0.8, 1.3) }))
    this.clouds = Array.from({ length: 14 }, () => ({ x: this.r(), y: this.r.range(0, 0.25), r: this.r.range(0.08, 0.18), v: this.r.range(0.004, 0.012) }))
  }
  palette() {
    return PX.cold16
  }
  dither() {
    return 0.45
  }
  wave(x: number, layer: number) {
    const { h, u } = this
    const k = this.num('storm')
    const t = this.t * (0.6 + layer * 0.25)
    return h * (0.62 + layer * 0.08) - (Math.sin(x / (60 * u) + t + layer) * 9 + Math.sin(x / (23 * u) - t * 1.6) * 4) * u * k * (1 + layer * 0.3)
  }
  get rock() {
    return { x: this.w * (this.w > this.h ? 0.74 : 0.62), y: this.h * 0.68 }
  }
  step(dt: number) {
    const { u } = this
    const k = this.num('storm')
    for (const d of this.rain) {
      d.y += d.v * dt * 1.8
      d.x -= d.v * dt * 0.5 * k
      if (d.y > 1) d.y -= 1
      if (d.x < 0) d.x += 1
    }
    for (const cl of this.clouds) {
      cl.x -= cl.v * dt * k
      if (cl.x < -0.3) cl.x = 1.3
    }
    // spray bursts when a crest reaches the rock
    const R = this.rock
    const crest = this.wave(R.x - 20 * u, 2)
    if (crest < R.y - 8 * u && this.r.chance(dt * 25 * k))
      for (let i = 0; i < 6; i++) this.spray.push({ x: R.x - this.r.range(10, 30) * u, y: R.y - 6 * u, vx: this.r.range(-10, 25) * u, vy: -this.r.range(30, 70) * u * k, life: 1 })
    for (const s of this.spray) {
      s.vy += 80 * u * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt * 0.9
    }
    this.spray = this.spray.filter((s) => s.life > 0)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const sky = c.createLinearGradient(0, 0, 0, h * 0.7)
    sky.addColorStop(0, '#08121f')
    sky.addColorStop(1, '#22557a')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    for (const cl of this.clouds) {
      c.fillStyle = 'rgba(14,34,54,0.7)'
      c.beginPath()
      c.ellipse(cl.x * w, cl.y * h, cl.r * w, cl.r * w * 0.35, 0, 0, TAU)
      c.fill()
    }
    // rock and lighthouse
    const R = this.rock
    const s = Math.min(w, h) / 180
    c.fillStyle = '#0e2236'
    c.beginPath()
    c.moveTo(R.x - 40 * s, h)
    c.lineTo(R.x - 34 * s, R.y)
    c.lineTo(R.x - 10 * s, R.y - 8 * s)
    c.lineTo(R.x + 22 * s, R.y - 4 * s)
    c.lineTo(R.x + 44 * s, h)
    c.fill()
    const lx = R.x + 2 * s
    const base = R.y - 6 * s
    const lh = 70 * s
    for (let i = 0; i < 6; i++) {
      const y0 = base - (i * lh) / 6
      const tw = 9 * s - (i * 2.2 * s) / 6
      c.fillStyle = i % 2 ? '#e6f6f7' : '#ff5d7a'
      c.beginPath()
      c.moveTo(lx - tw, y0)
      c.lineTo(lx + tw, y0)
      c.lineTo(lx + tw - 0.4 * s, y0 - lh / 6)
      c.lineTo(lx - tw + 0.4 * s, y0 - lh / 6)
      c.fill()
    }
    const top = base - lh
    c.fillStyle = '#08121f'
    c.fillRect(lx - 7 * s, top - 2 * s, 14 * s, 2 * s)
    c.fillStyle = '#ffd28a'
    c.fillRect(lx - 5 * s, top - 9 * s, 10 * s, 7 * s)
    c.fillStyle = '#08121f'
    c.beginPath()
    c.moveTo(lx - 6 * s, top - 9 * s)
    c.lineTo(lx, top - 15 * s)
    c.lineTo(lx + 6 * s, top - 9 * s)
    c.fill()
    // the beam: a long cone that swings around the lamp
    const a = this.t * 0.9
    const dir = Math.cos(a)
    const near = Math.abs(Math.sin(a))
    const lamp = { x: lx, y: top - 5.5 * s }
    const len = Math.max(w, h) * 1.4
    const spread = 0.09 + near * 0.06
    const g = c.createLinearGradient(lamp.x, lamp.y, lamp.x + dir * len, lamp.y)
    g.addColorStop(0, `rgba(255,210,138,${0.55 * (0.4 + 0.6 * Math.abs(dir))})`)
    g.addColorStop(1, 'rgba(255,210,138,0)')
    c.fillStyle = g
    c.beginPath()
    c.moveTo(lamp.x, lamp.y)
    c.lineTo(lamp.x + dir * len, lamp.y - len * spread)
    c.lineTo(lamp.x + dir * len, lamp.y + len * spread)
    c.fill()
    glow(c, lamp.x, lamp.y, 16 * s * (1 + near), 'rgba(255,230,180,0.9)')
    // waves: three layers, back to front, with foam crests
    for (let layer = 0; layer < 3; layer++) {
      const cols = ['#173856', '#22557a', '#3a7fa3']
      c.fillStyle = cols[layer]
      c.beginPath()
      c.moveTo(0, h)
      const step = 4 * u
      for (let x = 0; x <= w + step; x += step) c.lineTo(x, this.wave(x, layer))
      c.lineTo(w, h)
      c.fill()
      c.strokeStyle = 'rgba(230,246,247,0.65)'
      c.lineWidth = Math.max(1, (0.6 + layer * 0.4) * u)
      c.beginPath()
      for (let x = 0; x <= w; x += step) {
        const y = this.wave(x, layer)
        const y2 = this.wave(x + step, layer)
        // foam where the wave tips forward
        if (y2 - y > 0.6 * u) {
          c.moveTo(x, y)
          c.lineTo(x + step, y2)
        }
      }
      c.stroke()
      if (layer === 1) {
        // the beam glints on the water
        c.fillStyle = 'rgba(255,210,138,0.25)'
        for (let i = 0; i < 12; i++) {
          const x = lamp.x + dir * (i + 1) * w * 0.06
          c.fillRect(x, this.wave(x, 1) + 2 * u, 6 * u, Math.max(1, 0.6 * u))
        }
      }
    }
    for (const sp of this.spray) {
      c.globalAlpha = sp.life
      c.fillStyle = '#e6f6f7'
      c.fillRect(sp.x, sp.y, 1.6 * u, 1.6 * u)
    }
    c.globalAlpha = 1
    // rain slanting with the wind
    const k = this.num('storm')
    c.strokeStyle = 'rgba(166,219,229,0.3)'
    c.lineWidth = Math.max(1, 0.4 * u)
    c.beginPath()
    for (const d of this.rain) {
      c.moveTo(d.x * w, d.y * h)
      c.lineTo(d.x * w - 3 * u * k, d.y * h + 8 * u)
    }
    c.stroke()
  }
}
