import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

/** Wall looks: [mortar/dark, base, light] RGB, plus the ceiling and floor colours. */
const STYLES: Record<string, { wall: number[][]; ceil: string; floor: string; pal: string[] }> = {
  brick: { wall: [[74, 30, 22], [168, 70, 44], [214, 120, 80]], ceil: '#3a3a3a', floor: '#5a4a3a', pal: ['#000000', '#1a1210', '#4a1e16', '#8a3a24', '#a8462c', '#d67850', '#3a3a3a', '#5a4a3a', '#7a6a5a', '#9a9a9a'] },
  stone: { wall: [[50, 54, 60], [120, 126, 134], [180, 186, 192]], ceil: '#20242a', floor: '#3a3e44', pal: ['#000000', '#141618', '#32363c', '#5a5e66', '#787e86', '#b4bac0', '#20242a', '#3a3e44', '#e0e4e8'] },
  neon: { wall: [[10, 8, 30], [40, 20, 90], [255, 60, 200]], ceil: '#05040f', floor: '#0a0820', pal: ['#000000', '#05040f', '#0a0820', '#1e1240', '#2c1b5e', '#ff2e88', '#22e1ff', '#a68cff'] },
}

export function create(ctx: SceneContext) {
  return new Maze(ctx)
}

/**
 * A first-person walk through a generated maze, rendered by ray casting one column at a time.
 * The walker follows the right-hand wall, so it visits the whole maze, then a new one is built.
 */
class Maze extends PixelScene {
  size = 15
  grid = new Uint8Array(0)
  px = 1.5
  py = 1.5
  dir = 0
  targetDir = 0
  moving = 0
  cell = { x: 1, y: 1 }
  heading = 0
  visited = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return (STYLES[this.str('walls')] ?? STYLES.brick).pal
  }
  dither() {
    return 0.6
  }
  configure() {
    this.size = Math.round(this.num('mazeSize')) | 1
    this.build()
  }
  build() {
    const n = this.size
    const g = new Uint8Array(n * n).fill(1)
    const stack = [[1, 1]]
    g[n + 1] = 0
    while (stack.length) {
      const [x, y] = stack[stack.length - 1]
      const opts = [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ].filter(([dx, dy]) => x + dx > 0 && x + dx < n - 1 && y + dy > 0 && y + dy < n - 1 && g[(y + dy) * n + x + dx] === 1)
      if (!opts.length) {
        stack.pop()
        continue
      }
      const [dx, dy] = this.r.pick(opts)
      g[(y + dy / 2) * n + x + dx / 2] = 0
      g[(y + dy) * n + x + dx] = 0
      stack.push([x + dx, y + dy])
    }
    this.grid = g
    this.cell = { x: 1, y: 1 }
    this.px = 1.5
    this.py = 1.5
    this.heading = g[n + 2] === 0 ? 0 : 1
    this.dir = this.targetDir = this.heading * (Math.PI / 2)
    this.visited = 0
  }
  wall(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return true
    return this.grid[y * this.size + x] === 1
  }
  /** Right-hand rule on the cell grid. heading: 0 east, 1 south, 2 west, 3 north. */
  nextMove() {
    const D = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]
    for (const turn of [1, 0, 3, 2]) {
      const h = (this.heading + turn) % 4
      const nx = this.cell.x + D[h][0]
      const ny = this.cell.y + D[h][1]
      if (!this.wall(nx, ny)) {
        this.heading = h
        this.cell = { x: nx, y: ny }
        return
      }
    }
  }
  step(dt: number) {
    const sp = this.num('speed')
    // turn smoothly towards the target heading, then walk
    let dd = this.targetDir - this.dir
    while (dd > Math.PI) dd -= Math.PI * 2
    while (dd < -Math.PI) dd += Math.PI * 2
    if (Math.abs(dd) > 0.01) {
      this.dir += Math.sign(dd) * Math.min(Math.abs(dd), dt * 2.6 * sp)
      return
    }
    this.dir = this.targetDir
    const tx = this.cell.x + 0.5
    const ty = this.cell.y + 0.5
    const dx = tx - this.px
    const dy = ty - this.py
    const d = Math.hypot(dx, dy)
    if (d < 0.02) {
      this.px = tx
      this.py = ty
      this.visited++
      if (this.visited > this.size * this.size * 0.9) {
        this.build()
        return
      }
      this.nextMove()
      this.targetDir = this.heading * (Math.PI / 2)
      return
    }
    const m = Math.min(d, dt * 1.6 * sp)
    this.px += (dx / d) * m
    this.py += (dy / d) * m
  }
  draw() {
    const c = this.c
    const { w, h } = this
    const st = STYLES[this.str('walls')] ?? STYLES.brick
    c.fillStyle = st.ceil
    c.fillRect(0, 0, w, h / 2)
    c.fillStyle = st.floor
    c.fillRect(0, h / 2, w, h / 2)
    // depth fog on the floor and ceiling
    const fg = c.createLinearGradient(0, h * 0.3, 0, h * 0.7)
    fg.addColorStop(0, 'rgba(0,0,0,0)')
    fg.addColorStop(0.5, `rgba(0,0,0,${0.7 * this.num('fog')})`)
    fg.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = fg
    c.fillRect(0, 0, w, h)
    const img = c.getImageData(0, 0, w, h)
    const d = img.data
    const fov = 1.05
    const neon = this.str('walls') === 'neon'
    for (let x = 0; x < w; x++) {
      const ang = this.dir + (x / w - 0.5) * fov
      const rx = Math.cos(ang)
      const ry = Math.sin(ang)
      // DDA through the grid
      let mx = Math.floor(this.px)
      let my = Math.floor(this.py)
      const ddx = Math.abs(1 / rx)
      const ddy = Math.abs(1 / ry)
      const sx = rx < 0 ? -1 : 1
      const sy = ry < 0 ? -1 : 1
      let sdx = (rx < 0 ? this.px - mx : mx + 1 - this.px) * ddx
      let sdy = (ry < 0 ? this.py - my : my + 1 - this.py) * ddy
      let side = 0
      for (let i = 0; i < 64; i++) {
        if (sdx < sdy) {
          sdx += ddx
          mx += sx
          side = 0
        } else {
          sdy += ddy
          my += sy
          side = 1
        }
        if (this.wall(mx, my)) break
      }
      const dist = (side === 0 ? sdx - ddx : sdy - ddy) * Math.cos(ang - this.dir)
      const hitPos = side === 0 ? this.py + (sdx - ddx) * ry : this.px + (sdy - ddy) * rx
      const u = hitPos - Math.floor(hitPos)
      const lineH = h / Math.max(0.05, dist)
      const y0 = Math.max(0, Math.floor(h / 2 - lineH / 2))
      const y1 = Math.min(h - 1, Math.floor(h / 2 + lineH / 2))
      const shade = Math.max(0.15, 1 - dist * 0.09 * this.num('fog')) * (side ? 0.75 : 1)
      for (let y = y0; y <= y1; y++) {
        const v = (y - (h / 2 - lineH / 2)) / lineH
        let k: number
        if (neon) {
          k = u < 0.04 || u > 0.96 || v < 0.03 || v > 0.97 ? 2 : 0
        } else {
          // bricks: rows of 8, every other row offset by half a brick
          const row = Math.floor(v * 8)
          const bu = (u * 4 + (row % 2) * 0.5) % 1
          const mortar = v * 8 - row < 0.12 || bu < 0.05
          k = mortar ? 0 : ((row * 7 + Math.floor(u * 4 + (row % 2) * 0.5) * 3) % 5 === 0 ? 2 : 1)
        }
        const col = st.wall[k]
        const i = (y * w + x) * 4
        const s = neon && k === 2 ? 1 : shade
        d[i] = col[0] * s
        d[i + 1] = col[1] * s
        d[i + 2] = col[2] * s
      }
    }
    c.putImageData(img, 0, 0)
  }
}
