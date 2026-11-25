import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

type Game = 'paddle' | 'invaders' | 'snake' | 'racer' | 'bricks'
const GAMES: Game[] = ['paddle', 'invaders', 'snake', 'racer', 'bricks']
const MARQUEE = ['PONGO', 'BLOB WARS', 'SNEK', 'NIGHT RUN', 'BRICKER']
const CAB = ['#ff2e88', '#22e1ff', '#7cff6b', '#ffe95a', '#a68cff']

export function create(ctx: SceneContext) {
  return new ArcadeRoom(ctx)
}

/**
 * A row of cabinets in attract mode, each running its own tiny game (all original, played by
 * the machine), under flickering marquees on a cosmic carpet.
 */
class ArcadeRoom extends PixelScene {
  ball = { x: 0.5, y: 0.5, vx: 0.5, vy: 0.37 }
  pads = [0.5, 0.5]
  inv = { x: 0, dir: 1, shot: -1, sx: 0, ship: 0.5 }
  snake: [number, number][] = [[5, 5]]
  snakeDir: [number, number] = [1, 0]
  food: [number, number] = [9, 6]
  snakeAcc = 0
  road = 0
  bricks: boolean[] = Array(24).fill(true)
  bball = { x: 0.5, y: 0.7, vx: 0.45, vy: -0.5 }
  carpet: HTMLCanvasElement | null = null
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.35
  }
  layout() {
    const { w, h, u } = this
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    c.fillStyle = '#120a24'
    c.fillRect(0, 0, w, h)
    // cosmic carpet: squiggles and stars
    for (let i = 0; i < (w * h) / (260 * u * u); i++) {
      const x = this.r() * w
      const y = h * 0.78 + this.r() * h * 0.22
      c.fillStyle = this.r.pick(['#22e1ff', '#ff2e88', '#ffe95a', '#7cff6b'])
      if (this.r.chance(0.5)) c.fillRect(Math.round(x), Math.round(y), Math.round(3 * u), Math.max(1, Math.round(u)))
      else c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)))
    }
    this.carpet = cv
  }
  step(dt: number) {
    const s = this.num('speed')
    const d = dt * s
    // paddle game
    const b = this.ball
    b.x += b.vx * d
    b.y += b.vy * d
    if (b.y < 0 || b.y > 1) b.vy *= -1
    this.pads[0] += (b.y - this.pads[0]) * Math.min(1, d * 4)
    this.pads[1] += (b.y - this.pads[1]) * Math.min(1, d * 3)
    if (b.x < 0.06 || b.x > 0.94) b.vx *= -1
    b.y = Math.max(0, Math.min(1, b.y))
    // invaders
    const v = this.inv
    v.x += v.dir * d * 0.15
    if (v.x > 0.2 || v.x < -0.2) v.dir *= -1
    v.ship += (Math.sin(this.t * 0.7) * 0.4 + 0.5 - v.ship) * d
    if (v.shot < 0 && this.r.chance(d)) {
      v.shot = 0.85
      v.sx = v.ship
    }
    if (v.shot >= 0) {
      v.shot -= d * 1.2
      if (v.shot < 0.1) v.shot = -1
    }
    // snake on a 16x12 grid, chasing the food
    this.snakeAcc += d * 8
    while (this.snakeAcc > 1) {
      this.snakeAcc--
      const hd = this.snake[0]
      const dx = Math.sign(this.food[0] - hd[0])
      const dy = Math.sign(this.food[1] - hd[1])
      this.snakeDir = dx ? [dx, 0] : [0, dy || 1]
      const nh: [number, number] = [(hd[0] + this.snakeDir[0] + 16) % 16, (hd[1] + this.snakeDir[1] + 12) % 12]
      this.snake.unshift(nh)
      if (nh[0] === this.food[0] && nh[1] === this.food[1]) this.food = [this.r.int(0, 15), this.r.int(0, 11)]
      else this.snake.pop()
      if (this.snake.length > 24) this.snake = this.snake.slice(0, 4)
    }
    this.road += d * 2
    // bricks
    const bb = this.bball
    bb.x += bb.vx * d
    bb.y += bb.vy * d
    if (bb.x < 0 || bb.x > 1) bb.vx *= -1
    if (bb.y > 0.9) bb.vy = -Math.abs(bb.vy)
    if (bb.y < 0) bb.vy = Math.abs(bb.vy)
    if (bb.y < 0.36) {
      const i = Math.floor(bb.x * 8) + Math.floor(bb.y / 0.12) * 8
      if (this.bricks[i]) {
        this.bricks[i] = false
        bb.vy = Math.abs(bb.vy)
      }
    }
    if (this.bricks.every((x) => !x)) this.bricks.fill(true)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.drawImage(this.carpet!, 0, 0)
    // back wall with a neon sign
    c.fillStyle = '#1e1240'
    c.fillRect(0, 0, w, h * 0.78)
    const on = Math.floor(this.t * 0.8) % 9 !== 0
    c.font = `${Math.round(16 * u)}px "VT323", monospace`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = on ? '#ff2e88' : '#3e2a7a'
    c.fillText('ARCADE', w / 2, h * 0.08)
    c.fillStyle = on ? '#22e1ff' : '#3e2a7a'
    c.font = `${Math.round(8 * u)}px "VT323", monospace`
    c.fillText('insert coin. touch grass later.', w / 2, h * 0.15)
    const n = Math.max(3, Math.min(5, Math.floor(w / (58 * u))))
    const cw = Math.min(56 * u, (w * 0.92) / n)
    const gap = (w - cw * n) / (n + 1)
    for (let i = 0; i < n; i++) {
      const x = Math.round(gap + i * (cw + gap))
      this.cabinet(x, cw, i)
    }
  }
  cabinet(x: number, cw: number, i: number) {
    const c = this.c
    const { h, u } = this
    const top = Math.round(h * 0.22)
    const bottom = Math.round(h * 0.86)
    const col = CAB[i % CAB.length]
    // light pooling on the floor
    if (this.bool('lights')) {
      const g = c.createRadialGradient(x + cw / 2, bottom, 2, x + cw / 2, bottom, cw)
      g.addColorStop(0, col + '66')
      g.addColorStop(1, col + '00')
      c.fillStyle = g
      c.fillRect(x - cw / 2, bottom - cw, cw * 2, cw * 1.6)
    }
    c.fillStyle = '#07040f'
    c.fillRect(x, top, cw, bottom - top)
    c.fillStyle = '#2c1b5e'
    c.fillRect(x + 2 * u, top + 2 * u, cw - 4 * u, bottom - top - 4 * u)
    // marquee
    const flick = Math.sin(this.t * 3 + i * 2) > -0.95
    c.fillStyle = flick ? col : '#3e2a7a'
    c.fillRect(x + 3 * u, top + 3 * u, cw - 6 * u, 12 * u)
    c.fillStyle = '#07040f'
    c.font = `${Math.round(8 * u)}px "VT323", monospace`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(MARQUEE[i % MARQUEE.length], x + cw / 2, top + 9 * u)
    // screen
    const sx = x + 5 * u
    const sy = top + 19 * u
    const sw = cw - 10 * u
    const sh = Math.round(sw * 0.8)
    c.fillStyle = '#05030a'
    c.fillRect(sx, sy, sw, sh)
    c.save()
    c.beginPath()
    c.rect(sx, sy, sw, sh)
    c.clip()
    this.game(GAMES[i % GAMES.length], sx, sy, sw, sh)
    // scanlines
    c.fillStyle = 'rgba(0,0,0,0.35)'
    for (let y = sy; y < sy + sh; y += 2) c.fillRect(sx, y, sw, 1)
    c.restore()
    // control panel: stick and buttons
    const py = sy + sh + 6 * u
    c.fillStyle = '#3e2a7a'
    c.fillRect(x + 2 * u, py, cw - 4 * u, 10 * u)
    c.fillStyle = '#07040f'
    c.fillRect(x + cw * 0.28, py - 4 * u, 2 * u, 6 * u)
    c.fillStyle = '#ff2e88'
    c.fillRect(x + cw * 0.28 - u, py - 6 * u, 4 * u, 3 * u)
    c.fillStyle = col
    c.fillRect(x + cw * 0.6, py + 3 * u, 3 * u, 3 * u)
    c.fillRect(x + cw * 0.75, py + 3 * u, 3 * u, 3 * u)
    // coin slot
    c.fillStyle = Math.floor(this.t * 2 + i) % 2 ? '#ffe95a' : '#5a5a7a'
    c.fillRect(x + cw / 2 - u, py + 22 * u, 2 * u, 5 * u)
  }
  game(g: Game, x: number, y: number, w: number, h: number) {
    const c = this.c
    const u = this.u
    const p = Math.max(1, Math.round(u))
    if (g === 'paddle') {
      c.fillStyle = '#ffffff'
      for (let yy = 0; yy < h; yy += 4 * p) c.fillRect(x + w / 2, y + yy, p, 2 * p)
      c.fillRect(x + 2 * p, y + this.pads[0] * (h - 8 * p), p * 2, 8 * p)
      c.fillRect(x + w - 4 * p, y + this.pads[1] * (h - 8 * p), p * 2, 8 * p)
      c.fillRect(x + this.ball.x * w, y + this.ball.y * (h - 2 * p), 2 * p, 2 * p)
    } else if (g === 'invaders') {
      c.fillStyle = '#7cff6b'
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 5; k++) {
          const ax = x + w * (0.2 + k * 0.15 + this.inv.x)
          const ay = y + h * (0.12 + r * 0.14)
          c.fillRect(ax, ay, 4 * p, 2 * p)
          c.fillRect(ax + (Math.floor(this.t * 2) % 2 ? 0 : 2 * p), ay + 2 * p, 2 * p, p)
        }
      c.fillStyle = '#22e1ff'
      c.fillRect(x + this.inv.ship * (w - 6 * p), y + h - 4 * p, 6 * p, 2 * p)
      c.fillRect(x + this.inv.ship * (w - 6 * p) + 2 * p, y + h - 6 * p, 2 * p, 2 * p)
      if (this.inv.shot >= 0) {
        c.fillStyle = '#ffe95a'
        c.fillRect(x + this.inv.sx * (w - 6 * p) + 3 * p, y + this.inv.shot * h, p, 3 * p)
      }
    } else if (g === 'snake') {
      const cs = w / 16
      c.fillStyle = '#ff2e88'
      c.fillRect(x + this.food[0] * cs, y + this.food[1] * (h / 12), cs, h / 12)
      c.fillStyle = '#7cff6b'
      for (const [sx, sy] of this.snake) c.fillRect(x + sx * cs, y + sy * (h / 12), cs - 0.5, h / 12 - 0.5)
    } else if (g === 'racer') {
      c.fillStyle = '#1e1240'
      c.fillRect(x, y, w, h * 0.4)
      c.fillStyle = '#2c1b5e'
      c.fillRect(x, y + h * 0.4, w, h)
      for (let k = 0; k < 8; k++) {
        const z = (k + (this.road % 1)) / 8
        const yy = y + h * 0.4 + z * z * h * 0.6
        const half = w * (0.05 + z * z * 0.45)
        c.fillStyle = k % 2 ? '#ff2e88' : '#ffffff'
        c.fillRect(x + w / 2 - half - p * 2, yy, p * 2, p)
        c.fillRect(x + w / 2 + half, yy, p * 2, p)
        c.fillStyle = '#ffe95a'
        c.fillRect(x + w / 2 - p / 2, yy, p, p)
      }
      c.fillStyle = '#22e1ff'
      c.fillRect(x + w / 2 - 4 * p + Math.sin(this.t) * 6 * p, y + h - 5 * p, 8 * p, 3 * p)
    } else {
      const bw = w / 8
      this.bricks.forEach((on, i) => {
        if (!on) return
        c.fillStyle = ['#ff2e88', '#ffe95a', '#7cff6b'][Math.floor(i / 8)]
        c.fillRect(x + (i % 8) * bw + 0.5, y + Math.floor(i / 8) * h * 0.12 + h * 0.05, bw - 1, h * 0.1)
      })
      c.fillStyle = '#ffffff'
      c.fillRect(x + this.bball.x * (w - 2 * p), y + this.bball.y * h, 2 * p, 2 * p)
      c.fillStyle = '#22e1ff'
      c.fillRect(x + this.bball.x * w - 6 * p, y + h - 3 * p, 12 * p, p)
    }
  }
}
