import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { WorldScene } from './world'

export function create(ctx: SceneContext) {
  return new NightDiner(ctx)
}

/** A retro diner after midnight: rain and passing headlights outside, neon, a coffee pot steaming on the counter. */
class NightDiner extends WorldScene {
  rain: { x: number; y: number; l: number; v: number }[] = []
  cars: { x: number; v: number; dir: number; col: string }[] = []
  steam: { x: number; y: number; a: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.rain = Array.from({ length: 140 }, () => ({ x: this.r() * 880 + 40, y: this.r() * 230 + 40, l: this.r.range(8, 16), v: this.r.range(260, 380) }))
  }
  palette() {
    return PX.neon16
  }
  step(dt: number) {
    for (const d of this.rain) {
      d.y += d.v * dt * this.num('rain')
      d.x -= d.v * dt * 0.12
      if (d.y > 268) {
        d.y = 40
        d.x = this.r() * 880 + 60
      }
    }
    if (this.cars.length < 2 && this.r.chance(dt * 0.25 * this.num('traffic'))) {
      const dir = this.r.chance(0.5) ? 1 : -1
      this.cars.push({ x: dir > 0 ? -120 : 1080, v: this.r.range(160, 260), dir, col: this.r.pick(['#ff4f6a', '#ffd27a', '#7ab8ff']) })
    }
    for (const car of this.cars) car.x += car.v * dt * car.dir
    this.cars = this.cars.filter((car) => car.x > -200 && car.x < 1160)
    if (this.r.chance(dt * 3)) this.steam.push({ x: 236 + this.r.range(-4, 4), y: 330, a: 0 })
    for (const s of this.steam) {
      s.a += dt
      s.y -= dt * 18
      s.x += Math.sin(s.a * 2.6 + s.y * 0.05) * dt * 8
    }
    this.steam = this.steam.filter((s) => s.a < 2.6)
  }
  draw() {
    const c = this.c
    const t = this.t
    this.screen()
    c.fillStyle = '#123a42'
    c.fillRect(0, 0, this.w, this.h)
    this.world()
    // wall: teal upper, red trim, cream tiles below
    c.fillStyle = '#16454e'
    c.fillRect(-300, 0, 1560, 300)
    c.fillStyle = '#b8323c'
    c.fillRect(-300, 296, 1560, 8)
    c.fillStyle = '#e8dcc0'
    c.fillRect(-300, 304, 1560, 60)
    c.fillStyle = 'rgba(0,0,0,0.08)'
    for (let x = -300; x < 1260; x += 24) c.fillRect(x, 304, 1, 60)
    // the street through the big window
    c.save()
    this.rr(40, 34, 880, 238, 10)
    c.clip()
    const sky = c.createLinearGradient(0, 34, 0, 272)
    sky.addColorStop(0, '#070b1c')
    sky.addColorStop(1, '#16203f')
    c.fillStyle = sky
    c.fillRect(40, 34, 880, 238)
    // buildings across the street
    for (let i = 0; i < 12; i++) {
      const bx = 40 + i * 76
      const bh = 60 + ((i * 47) % 70)
      c.fillStyle = '#0d1430'
      c.fillRect(bx, 212 - bh, 70, bh)
      for (let k = 0; k < 6; k++) {
        const on = Math.sin(i * 3.1 + k * 1.7 + t * 0.05) > 0.2
        c.fillStyle = on ? 'rgba(255,200,120,0.6)' : 'rgba(60,80,130,0.5)'
        c.fillRect(bx + 8 + (k % 3) * 20, 222 - bh + Math.floor(k / 3) * 22, 10, 8)
      }
    }
    // street lamp
    c.fillStyle = '#0a0f22'
    c.fillRect(160, 96, 4, 150)
    this.glow(166, 98, 70, 'rgba(255,210,140,A)', 0.35)
    // wet road and passing cars as streaks of light
    c.fillStyle = '#0a0e1e'
    c.fillRect(40, 212, 880, 60)
    for (const car of this.cars) {
      const y = car.dir > 0 ? 236 : 226
      const head = car.dir > 0 ? '#fff4d6' : car.col
      c.fillStyle = '#05070f'
      this.rr(car.x - 50, y - 12, 100, 18, 6)
      c.fill()
      this.glow(car.x + 50 * car.dir, y - 2, 44, head === '#fff4d6' ? 'rgba(255,244,214,A)' : 'rgba(255,80,100,A)', 0.55)
      c.fillStyle = `rgba(255,230,180,0.12)`
      c.fillRect(car.x - 60, y + 10, 120, 3)
    }
    // rain on the street
    c.strokeStyle = 'rgba(170,200,255,0.35)'
    c.lineWidth = 1.2
    c.beginPath()
    for (const d of this.rain) {
      c.moveTo(d.x, d.y)
      c.lineTo(d.x - d.l * 0.12, d.y + d.l)
    }
    c.stroke()
    // the neon sign hanging in the window, and its glow on the glass
    const flick = Math.floor(t * 1.3) % 9 !== 0 || this.g.reducedMotion
    c.font = '600 30px "IBM Plex Mono", monospace'
    c.textAlign = 'center'
    c.shadowColor = '#ff4f9a'
    c.shadowBlur = flick ? 18 * this.g.intensity : 0
    c.fillStyle = flick ? '#ff7ab6' : '#5a2a44'
    c.fillText('OPEN 24/7', 690, 90)
    c.shadowColor = '#42e8ff'
    c.shadowBlur = 14 * this.g.intensity
    c.fillStyle = '#8af2ff'
    c.font = '600 24px "IBM Plex Mono", monospace'
    c.fillText('BURGERS · COFFEE', 690, 128)
    c.shadowBlur = 0
    c.restore()
    // window frame and mullions
    c.strokeStyle = '#c9d2d6'
    c.lineWidth = 6
    this.rr(40, 34, 880, 238, 10)
    c.stroke()
    c.lineWidth = 4
    for (const x of [333, 627]) {
      c.beginPath()
      c.moveTo(x, 34)
      c.lineTo(x, 272)
      c.stroke()
    }
    // pendant lamps swinging a little
    for (const lx of [200, 480, 760]) {
      const sw = this.g.reducedMotion ? 0 : Math.sin(t * 0.8 + lx) * 2
      c.strokeStyle = '#0c2328'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(lx, 0)
      c.lineTo(lx + sw, 20)
      c.stroke()
      c.fillStyle = '#b8323c'
      c.beginPath()
      c.moveTo(lx + sw - 22, 36)
      c.lineTo(lx + sw + 22, 36)
      c.lineTo(lx + sw + 10, 18)
      c.lineTo(lx + sw - 10, 18)
      c.fill()
      this.glow(lx + sw, 44, 120, 'rgba(255,214,150,A)', 0.22 * this.g.intensity)
    }
    // counter
    c.fillStyle = '#c9d2d6'
    c.fillRect(-300, 360, 1560, 12)
    c.fillStyle = '#e9eef0'
    c.fillRect(-300, 360, 1560, 3)
    c.fillStyle = '#b8323c'
    c.fillRect(-300, 372, 1560, 64)
    c.fillStyle = 'rgba(255,255,255,0.12)'
    for (let x = -300; x < 1260; x += 40) c.fillRect(x, 372, 2, 64)
    // on the counter: coffee pot, pie dome, napkins, mugs, sauces
    c.fillStyle = '#2a1a14'
    this.rr(214, 326, 44, 34, 6)
    c.fill()
    c.fillStyle = '#c9d2d6'
    c.fillRect(220, 316, 32, 12)
    c.fillStyle = '#4a2a18'
    c.fillRect(218, 342, 36, 16)
    for (const s of this.steam) {
      c.fillStyle = `rgba(240,240,235,${0.22 * (1 - s.a / 2.6)})`
      c.beginPath()
      c.arc(s.x, s.y, 3 + s.a * 3.5, 0, Math.PI * 2)
      c.fill()
    }
    c.fillStyle = 'rgba(220,240,250,0.35)'
    c.beginPath()
    c.ellipse(420, 340, 46, 30, 0, Math.PI, 0)
    c.fill()
    c.fillStyle = '#e8b45a'
    c.beginPath()
    c.ellipse(420, 352, 36, 8, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#c9d2d6'
    c.fillRect(372, 356, 96, 4)
    c.fillStyle = '#e8dcc0'
    c.fillRect(560, 334, 26, 26)
    c.fillStyle = '#c9d2d6'
    c.fillRect(556, 342, 34, 18)
    for (const [x, col] of [
      [636, '#d8312c'],
      [654, '#f2c335'],
    ] as const) {
      c.fillStyle = col
      this.rr(x, 326, 12, 34, 4)
      c.fill()
    }
    c.fillStyle = '#f4f1e8'
    this.rr(720, 338, 28, 22, 4)
    c.fill()
    // checkered floor
    c.save()
    c.beginPath()
    c.rect(-300, 436, 1560, 200)
    c.clip()
    for (let y = 0; y < 5; y++)
      for (let x = -14; x < 50; x++) {
        c.fillStyle = (x + y) % 2 ? '#f0ece2' : '#1d1d22'
        c.fillRect(x * 24, 436 + y * 24, 24, 24)
      }
    c.restore()
    // stools
    for (let i = 0; i < 6; i++) {
      const sx = 120 + i * 150
      c.fillStyle = '#8a959a'
      c.fillRect(sx - 3, 470, 6, 70)
      c.fillStyle = '#d43a45'
      c.beginPath()
      c.ellipse(sx, 466, 34, 12, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#ff6f78'
      c.beginPath()
      c.ellipse(sx - 6, 462, 18, 5, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#c9d2d6'
      c.fillRect(sx - 34, 470, 68, 4)
    }
    // jukebox glow on the right edge
    const hue = (t * 40) % 360
    this.glow(930, 400, 120, `hsla(${hue},90%,60%,A)`, 0.25 * this.g.intensity)
  }
}
