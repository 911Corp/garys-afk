import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

const COLORS = ['#55ffff', '#ff55ff', '#ffff55', '#55ff55', '#ff5555', '#5555ff', '#ffffff', '#ffaa00']

export function create(ctx: SceneContext) {
  return new DvdSurvivor(ctx)
}

/** A logo bounces off the edges and changes colour. The counter keeps score of perfect corners. */
class DvdSurvivor extends PixelScene {
  x = 10
  y = 10
  vx = 1
  vy = 1
  color = 0
  corners = 0
  bounces = 0
  party = 0
  lw = 60
  lh = 30
  constructor(ctx: SceneContext) {
    super(ctx)
    this.x = this.r.range(0, this.w * 0.5)
    this.y = this.r.range(0, this.h * 0.5)
    this.vx = this.r.chance(0.5) ? 1 : -1
    this.vy = this.r.chance(0.5) ? 1 : -1
    this.configure()
  }
  palette() {
    return ['#000000', ...COLORS, '#555555']
  }
  dither() {
    return 0
  }
  configure() {
    const s = this.num('size') * this.u
    const logo = this.str('logo')
    this.lw = Math.round((logo === 'ngmi' ? 56 : 70) * s)
    this.lh = Math.round((logo === 'ngmi' ? 28 : 40) * s)
  }
  step(dt: number) {
    const sp = this.num('speed') * 40 * this.u
    this.x += this.vx * sp * dt
    this.y += this.vy * sp * dt
    let hitX = false
    let hitY = false
    const maxX = this.w - this.lw
    const maxY = this.h - this.lh
    if (this.x <= 0 || this.x >= maxX) {
      this.x = Math.max(0, Math.min(maxX, this.x))
      this.vx *= -1
      hitX = true
    }
    if (this.y <= 0 || this.y >= maxY) {
      this.y = Math.max(0, Math.min(maxY, this.y))
      this.vy *= -1
      hitY = true
    }
    if (hitX || hitY) {
      this.bounces++
      this.color = (this.color + 1 + Math.floor(this.r() * (COLORS.length - 1))) % COLORS.length
      // a corner = both walls within a couple of pixels of each other
      const nearX = this.x < 2 || this.x > maxX - 2
      const nearY = this.y < 2 || this.y > maxY - 2
      if (nearX && nearY) {
        this.corners++
        this.party = 3
        this.emit({ type: 'chime' })
      }
    }
    this.party = Math.max(0, this.party - dt)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#000'
    c.fillRect(0, 0, w, h)
    const col = this.party > 0 && Math.floor(this.t * 10) % 2 ? '#ffffff' : COLORS[this.color]
    const x = Math.round(this.x)
    const y = Math.round(this.y)
    const s = this.num('size') * u
    const logo = this.str('logo')
    c.fillStyle = col
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    if (logo === 'ngmi') {
      c.font = `${Math.round(26 * s)}px "VT323", monospace`
      c.fillText('NGMI', x + this.lw / 2, y + this.lh / 2)
      c.fillRect(x, y + this.lh - 2 * s, this.lw, Math.max(1, Math.round(s)))
    } else {
      // an original wordmark: a disc-like ellipse under the name
      c.font = `${Math.round(22 * s)}px "VT323", monospace`
      c.fillText("GARY'S", x + this.lw / 2, y + this.lh * 0.3)
      c.beginPath()
      c.ellipse(x + this.lw / 2, y + this.lh * 0.76, this.lw * 0.48, this.lh * 0.24, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#000'
      c.font = `${Math.round(14 * s)}px "VT323", monospace`
      c.fillText('A F K', x + this.lw / 2, y + this.lh * 0.78)
    }
    if (this.bool('counter')) {
      c.font = `${Math.round(10 * u)}px "VT323", monospace`
      c.textAlign = 'left'
      c.textBaseline = 'top'
      c.fillStyle = '#555555'
      c.fillText(`corners ${this.corners}   bounces ${this.bounces}`, 4 * u, 3 * u)
    }
    if (this.party > 0) {
      c.font = `${Math.round(18 * u)}px "VT323", monospace`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillStyle = COLORS[Math.floor(this.t * 12) % COLORS.length]
      c.fillText('CORNER!', w / 2, h / 2)
    }
  }
}
