import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU, rng } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, font, glow } from '../kit'

/** Terrain cells. */
const EMPTY = 0
const EARTH = 1
const STEEL = 2
const BRICK = 3

type State = 'fall' | 'walk' | 'dig' | 'bash' | 'build' | 'float' | 'dizzy' | 'exit' | 'splash'
type Critter = { x: number; y: number; dir: number; state: State; t: number; fall: number; work: number; umbrella: boolean; id: number; flat?: boolean }

export function create(ctx: SceneContext) {
  return new LittleTroop(ctx)
}

/**
 * A puzzle-platformer in attract mode, with an original crew: little round critters in orange
 * beanies drop from a hatch and march on. Some dig, some tunnel, some build stairs, some float
 * down under umbrellas, until the troop reaches the lantern door. Then a new level is carved.
 */
class LittleTroop extends PixelScene {
  cs = 3
  GW = 0
  GH = 0
  grid = new Uint8Array(0)
  shade = new Float32Array(0)
  terrain!: HTMLCanvasElement
  tc!: CanvasRenderingContext2D
  img!: ImageData
  dirty = true
  water = 0
  hatch = { x: 0, y: 0 }
  door = { x: 0, y: 0 }
  troop: Critter[] = []
  spawned = 0
  saved = 0
  lost = 0
  spawnT = 0
  skillT = 0
  tick = 0
  level = 0
  between = 0
  puffs: { x: number; y: number; life: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.layout()
  }
  palette() {
    return PX.console16
  }
  dither() {
    return 0.3
  }
  get total() {
    return Math.max(5, Math.round(30 * this.num('troop')))
  }
  layout() {
    const { w, h } = this
    if (!w || !h) return
    this.cs = Math.max(2, Math.round(Math.min(w, h) / 170))
    this.GW = Math.ceil(w / this.cs)
    this.GH = Math.ceil(h / this.cs)
    this.terrain = document.createElement('canvas')
    this.terrain.width = this.GW
    this.terrain.height = this.GH
    this.tc = this.terrain.getContext('2d')!
    this.img = this.tc.createImageData(this.GW, this.GH)
    this.newLevel()
  }
  solid(x: number, y: number) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || x >= this.GW) return true
    if (y < 0) return false
    if (y >= this.GH) return false
    return this.grid[y * this.GW + x] !== EMPTY
  }
  set(x: number, y: number, v: number) {
    if (x < 0 || y < 0 || x >= this.GW || y >= this.GH) return
    const i = y * this.GW + x
    if (this.grid[i] === STEEL && v === EMPTY) return
    this.grid[i] = v
    this.dirty = true
  }
  newLevel() {
    const { GW, GH } = this
    const R = rng(1000 + this.level * 77)
    this.level++
    this.grid = new Uint8Array(GW * GH)
    this.shade = new Float32Array(GW * GH)
    for (let i = 0; i < this.shade.length; i++) this.shade[i] = R()
    const fill = (x0: number, y0: number, x1: number, y1: number, v: number) => {
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(GH, y1); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(GW, x1); x++) this.grid[y * GW + x] = v
    }
    const portrait = GH > GW
    // ground with a pond in it
    this.water = Math.floor(GH * 0.9)
    const gapA = Math.floor(GW * R.range(0.3, 0.45))
    const gapB = gapA + Math.floor(GW * R.range(0.12, 0.2))
    for (let x = 0; x < GW; x++) {
      if (x > gapA && x < gapB) continue
      const top = Math.floor(GH * 0.84 + Math.sin(x * 0.05 + this.level) * 3)
      fill(x, top, x + 1, GH, EARTH)
    }
    // ledges stepping down from the hatch side to the door side
    const n = portrait ? 4 : 3
    const left = R.chance(0.5)
    let ex = 0
    let ey = 0
    for (let k = 0; k < n; k++) {
      const y = Math.floor(GH * (0.22 + (k * 0.5) / n) + R.range(-3, 3))
      const len = Math.floor(GW * (portrait ? R.range(0.45, 0.6) : R.range(0.3, 0.42)))
      const along = (k / Math.max(1, n - 1)) * (GW - len - GW * 0.08) + GW * 0.04
      const x0 = Math.floor(left ? along : GW - along - len)
      const th = Math.floor(R.range(5, 10))
      for (let x = x0; x < x0 + len; x++) {
        const bump = Math.floor(Math.sin(x * 0.2 + k) * 1.5 + R() * 1.2)
        fill(x, y - bump, x + 1, y + th + R.int(0, 3), EARTH)
      }
      // a wall to tunnel through on the middle ledge
      if (k === 1) fill(x0 + len * 0.55, y - 14, x0 + len * 0.55 + 6, y, EARTH)
      // a steel plate here and there
      if (k === n - 2) fill(x0 + len * 0.15, y + th - 2, x0 + len * 0.15 + 10, y + th + 1, STEEL)
      if (k === 0) {
        this.hatch = { x: x0 + Math.floor(len * 0.2), y: y - 26 }
      }
      ex = x0
      ey = y
    }
    void ex
    void ey
    // the door stands on the ground, on the far side from the hatch
    const dx = left ? Math.floor(GW * 0.86) : Math.floor(GW * 0.14)
    // stand it on the ground, below every ledge
    let dy = Math.floor(GH * 0.78)
    while (dy < GH && !this.solid(dx, dy)) dy++
    this.door = { x: dx, y: dy }
    // clear the space in front of the door
    fill(dx - 6, dy - 16, dx + 7, dy, EMPTY)
    fill(dx - 8, dy, dx + 9, dy + 2, STEEL)
    this.troop = []
    this.spawned = 0
    this.saved = 0
    this.lost = 0
    this.spawnT = -1.5
    this.dirty = true
  }
  paint() {
    const { GW, GH } = this
    const d = this.img.data
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x
        const v = this.grid[i]
        const o = i * 4
        if (v === EMPTY) {
          d[o + 3] = 0
          continue
        }
        const n = this.shade[i]
        let r: number
        let g: number
        let b: number
        const top = y > 0 && this.grid[i - GW] === EMPTY
        if (v === STEEL) {
          ;[r, g, b] = (x + y) % 6 === 0 ? [190, 196, 210] : [139, 133, 152]
        } else if (v === BRICK) {
          ;[r, g, b] = [226, 97, 79]
        } else if (top || (y > 1 && this.grid[i - 2 * GW] === EMPTY)) {
          ;[r, g, b] = n > 0.5 ? [159, 212, 90] : [62, 154, 78]
        } else {
          // layered soil with flecks
          const band = Math.floor(y / 4) % 3
          ;[r, g, b] = band === 0 ? [106, 58, 80] : band === 1 ? [85, 48, 90] : [122, 70, 74]
          if (n > 0.93) [r, g, b] = [243, 166, 75]
          else if (n < 0.08) [r, g, b] = [43, 34, 54]
        }
        d[o] = r
        d[o + 1] = g
        d[o + 2] = b
        d[o + 3] = 255
      }
    }
    this.tc.putImageData(this.img, 0, 0)
    this.dirty = false
  }
  step(dt: number) {
    if (!this.GW) return
    const sp = this.num('speed')
    for (const p of this.puffs) p.life -= dt
    this.puffs = this.puffs.filter((p) => p.life > 0)
    if (this.between > 0) {
      this.between -= dt
      if (this.between <= 0) this.newLevel()
      return
    }
    this.spawnT += dt * sp
    if (this.spawned < this.total && this.spawnT > 1.1) {
      this.spawnT = 0
      this.troop.push({ x: this.hatch.x, y: this.hatch.y + 6, dir: 1, state: 'fall', t: 0, fall: 0, work: 0, umbrella: false, id: this.spawned })
      this.spawned++
    }
    this.tick += dt * sp * 22
    while (this.tick >= 1) {
      this.tick--
      for (const c of this.troop) this.move(c)
    }
    this.troop = this.troop.filter((c) => {
      if (c.state === 'exit' && c.t > 12) {
        this.saved++
        return false
      }
      if (c.state === 'splash' && c.t > 10) {
        this.lost++
        return false
      }
      return true
    })
    // the autopilot hands out jobs
    this.skillT += dt * sp
    if (this.skillT > 2.2 / this.num('skills')) {
      this.skillT = 0
      this.assign()
    }
    if (this.spawned >= this.total && this.troop.length === 0) this.between = 4
  }
  /** Picks a walker and gives it the job that makes sense where it stands. */
  assign() {
    const walkers = this.troop.filter((c) => c.state === 'walk')
    if (!walkers.length) return
    const c = this.r.pick(walkers)
    const ahead = Math.round(c.x + c.dir * 4)
    let drop = 0
    while (drop < 200 && !this.solid(ahead, c.y + 1 + drop)) drop++
    const wall = this.solid(c.x + c.dir * 3, c.y - 5)
    const overWater = ahead > 0 && ahead < this.GW && drop > 20 && c.y + drop >= this.water - 2
    if (overWater) {
      // a flat bridge long enough to reach the far bank
      let gap = 4
      while (gap < 200 && !this.solid(c.x + c.dir * gap, c.y + 1)) gap++
      c.state = 'build'
      c.flat = true
      c.work = Math.ceil(gap / 2) + 3
    } else if (wall) {
      c.state = 'bash'
      c.work = 40
    } else if (drop > 30) c.umbrella = true
    else if (this.r.chance(0.3) && c.y < this.GH * 0.7) {
      c.state = 'dig'
      c.work = 26
    } else if (this.r.chance(0.3)) {
      c.state = 'build'
      c.work = 8
    }
  }
  move(c: Critter) {
    c.t++
    const g = this.door
    if (c.state !== 'exit' && c.state !== 'splash' && Math.abs(c.x - g.x) < 3 && Math.abs(c.y - g.y) < 4) {
      c.state = 'exit'
      c.t = 0
      if (this.saved % 5 === 0) this.emit({ type: 'blip' })
      return
    }
    if (c.state === 'exit' || c.state === 'splash' || c.state === 'dizzy') {
      if (c.state === 'dizzy' && c.t > 30) {
        c.state = 'walk'
        c.t = 0
      }
      return
    }
    if (c.y >= this.water && !this.solid(c.x, c.y + 1)) {
      c.state = 'splash'
      c.t = 0
      this.puffs.push({ x: c.x, y: this.water, life: 0.8 })
      return
    }
    const below = this.solid(c.x, c.y + 1)
    if (c.state === 'fall' || c.state === 'float') {
      if (below) {
        c.state = c.fall > 45 && !c.umbrella ? 'dizzy' : 'walk'
        c.t = 0
        c.fall = 0
        c.umbrella = false
        return
      }
      if (c.umbrella && c.fall > 8) c.state = 'float'
      const v = c.state === 'float' ? (c.t % 3 === 0 ? 1 : 0) : 2
      for (let k = 0; k < v; k++) if (!this.solid(c.x, c.y + 1)) c.y++
      c.fall += v
      if (c.y > this.GH + 10) c.state = 'splash'
      return
    }
    if (!below) {
      c.state = 'fall'
      c.fall = 0
      return
    }
    if (c.state === 'dig') {
      if (c.t % 3) return
      let any = false
      for (let x = -3; x <= 3; x++) {
        const xx = Math.round(c.x + x)
        const yy = Math.round(c.y + 1)
        if (this.grid[yy * this.GW + xx] === STEEL) {
          c.state = 'walk'
          return
        }
        if (this.solid(xx, yy) && xx >= 0 && xx < this.GW) any = true
        this.set(xx, yy, EMPTY)
      }
      c.y++
      c.work--
      if (!any || c.work <= 0) c.state = 'walk'
      return
    }
    if (c.state === 'bash') {
      if (c.t % 2) return
      let any = false
      for (let y = -8; y <= 0; y++)
        for (let x = 1; x <= 3; x++) {
          const xx = Math.round(c.x + c.dir * x)
          const yy = Math.round(c.y + y)
          if (this.solid(xx, yy) && xx > 0 && xx < this.GW - 1) any = true
          this.set(xx, yy, EMPTY)
        }
      c.x += c.dir
      c.work--
      if (!any || c.work <= 0) c.state = 'walk'
      return
    }
    if (c.state === 'build') {
      if (c.t % 6) return
      if (c.flat) {
        for (let x = 1; x <= 4; x++) this.set(Math.round(c.x + c.dir * x), Math.round(c.y + 1), BRICK)
        c.x += c.dir * 2
      } else {
        for (let x = 1; x <= 4; x++) this.set(Math.round(c.x + c.dir * x), Math.round(c.y), BRICK)
        c.x += c.dir * 2
        c.y -= 1
      }
      c.work--
      if (c.work <= 0 || this.solid(c.x + c.dir * 2, c.y - 4)) {
        c.state = 'walk'
        c.flat = false
      }
      return
    }
    // walking: step up small rises, turn at walls, keep going over edges
    if (c.t % 2) return
    // at the edge of the pond: one builds a bridge, the others wait their turn
    const ax = c.x + c.dir * 3
    if (!this.solid(ax, c.y + 1) && !this.solid(ax, c.y + 2)) {
      let d = 0
      while (d < 200 && !this.solid(ax, c.y + 1 + d)) d++
      if (c.y + d >= this.water - 1) {
        const busy = this.troop.some((o) => o.state === 'build' && o.flat)
        if (!busy) {
          let gap = 4
          while (gap < 200 && !this.solid(c.x + c.dir * gap, c.y + 1)) gap++
          c.state = 'build'
          c.flat = true
          c.work = Math.ceil(gap / 2) + 3
        } else c.dir *= -1
        return
      }
    }
    const nx = c.x + c.dir
    let up = 0
    while (up <= 4 && this.solid(nx, c.y - up)) up++
    if (up > 4 || this.solid(nx, c.y - 7 - up)) {
      c.dir *= -1
      return
    }
    c.x = nx
    c.y -= up
    let down = 0
    while (down < 3 && !this.solid(c.x, c.y + 1)) {
      c.y++
      down++
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    if (!this.GW) return
    if (this.dirty) this.paint()
    const cs = this.cs
    // dusk sky and far hills
    const sky = c.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#1e3d5c')
    sky.addColorStop(0.7, '#55305a')
    sky.addColorStop(1, '#a23e5c')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#2b2236'
    c.beginPath()
    c.moveTo(0, h)
    for (let x = 0; x <= w; x += 8 * u) c.lineTo(x, h * 0.62 - Math.sin(x / (45 * u)) * 14 * u - Math.sin(x / (13 * u)) * 3 * u)
    c.lineTo(w, h)
    c.fill()
    // water
    const wy = this.water * cs
    c.fillStyle = '#2f6fb0'
    c.fillRect(0, wy, w, h - wy)
    c.fillStyle = '#5ab4e5'
    for (let x = 0; x < w; x += 10 * u) c.fillRect(x + ((this.t * 8 * u) % (10 * u)), wy + Math.sin(x + this.t * 2) * u, 5 * u, Math.max(1, 0.6 * u))
    // terrain, pixel crisp
    c.imageSmoothingEnabled = false
    c.drawImage(this.terrain, 0, 0, this.GW * cs, this.GH * cs)
    c.imageSmoothingEnabled = !this.g.retro
    // hatch and door
    this.drawHatch(this.hatch.x * cs, this.hatch.y * cs, cs)
    this.drawDoor(this.door.x * cs, this.door.y * cs, cs)
    // the troop
    for (const k of this.troop) this.critter(k, cs)
    for (const p of this.puffs) {
      c.fillStyle = '#b6e3f0'
      c.globalAlpha = p.life
      for (let i = 0; i < 5; i++) c.fillRect(p.x * cs + (i - 2) * 2 * cs, p.y * cs - (1 - p.life) * 8 * cs - (i % 2) * 2 * cs, cs, cs)
      c.globalAlpha = 1
    }
    // status line
    const fs = Math.max(9, 5.5 * u)
    font(c, fs, MONO, 600)
    c.textBaseline = 'top'
    const pct = Math.round((this.saved / this.total) * 100)
    const label = `LEVEL ${this.level}  OUT ${this.troop.length}  HOME ${pct}%`
    const lw = c.measureText(label).width + fs
    c.fillStyle = 'rgba(13,11,20,0.55)'
    c.fillRect(w - lw - fs * 0.5, h - fs * 2.1, lw, fs * 1.6)
    c.fillStyle = '#f7e07a'
    c.fillText(label, w - lw, h - fs * 1.8)
    if (this.between > 0) {
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      font(c, fs * 2, MONO, 700)
      c.fillStyle = '#f2f0e6'
      c.fillText(`${pct}% made it home`, w / 2, h * 0.4)
      font(c, fs, MONO, 500)
      c.fillText('digging a new level...', w / 2, h * 0.4 + fs * 2.4)
      c.textAlign = 'left'
    }
    c.textBaseline = 'alphabetic'
  }
  drawHatch(x: number, y: number, cs: number) {
    const c = this.c
    c.fillStyle = '#4a2a4e'
    c.fillRect(x - 9 * cs, y - 6 * cs, 18 * cs, 8 * cs)
    c.fillStyle = '#8b8598'
    c.fillRect(x - 10 * cs, y - 7 * cs, 20 * cs, 2 * cs)
    c.fillRect(x - 10 * cs, y + 1 * cs, 20 * cs, 1 * cs)
    // doors swing open while the troop comes out
    const open = this.spawned < this.total ? 1 : Math.max(0, 1 - (this.t % 1))
    c.fillStyle = '#e2614f'
    c.fillRect(x - 8 * cs, y + 2 * cs, 7 * cs, (1 + 4 * open) * cs)
    c.fillRect(x + 1 * cs, y + 2 * cs, 7 * cs, (1 + 4 * open) * cs)
    c.fillStyle = '#f7e07a'
    c.fillRect(x - 1 * cs, y - 4 * cs, 2 * cs, 2 * cs)
  }
  drawDoor(x: number, y: number, cs: number) {
    const c = this.c
    glow(c, x, y - 8 * cs, 22 * cs, 'rgba(247,224,122,0.45)')
    c.fillStyle = '#6b3a2a'
    c.beginPath()
    c.moveTo(x - 7 * cs, y)
    c.lineTo(x - 7 * cs, y - 10 * cs)
    c.arc(x, y - 10 * cs, 7 * cs, Math.PI, 0)
    c.lineTo(x + 7 * cs, y)
    c.fill()
    c.fillStyle = '#f7e07a'
    c.beginPath()
    c.moveTo(x - 4 * cs, y)
    c.lineTo(x - 4 * cs, y - 9 * cs)
    c.arc(x, y - 9 * cs, 4 * cs, Math.PI, 0)
    c.lineTo(x + 4 * cs, y)
    c.fill()
    // lanterns either side
    for (const s of [-1, 1]) {
      const fl = Math.sin(this.t * 9 + s) > 0 ? 1 : 0
      c.fillStyle = '#2b2236'
      c.fillRect(x + s * 9 * cs - cs / 2, y - 14 * cs, cs, 14 * cs)
      c.fillStyle = fl ? '#f7e07a' : '#f3a64b'
      c.fillRect(x + s * 9 * cs - 1.5 * cs, y - 17 * cs, 3 * cs, 3 * cs)
    }
  }
  /** Original critter: a round cream body, an orange beanie with a pompom, two dot eyes, tiny feet. */
  critter(k: Critter, cs: number) {
    const c = this.c
    const x = k.x * cs
    const y = k.y * cs
    const p = cs
    if (k.state === 'splash') return
    const exitK = k.state === 'exit' ? Math.max(0, 1 - k.t / 12) : 1
    c.save()
    c.translate(x, y)
    c.scale(exitK, exitK)
    const step = k.state === 'walk' ? Math.floor(k.t / 2) % 2 : 0
    // feet
    c.fillStyle = '#2b2236'
    c.fillRect(-2 * p, -1 * p, 2 * p, p)
    c.fillRect(1 * p, -1 * p - step * p, 2 * p, p)
    // body
    c.fillStyle = '#f2f0e6'
    c.fillRect(-2 * p, -6 * p, 5 * p, 5 * p)
    c.fillRect(-3 * p, -5 * p, 7 * p, 3 * p)
    // eyes look the way it walks
    c.fillStyle = '#0d0b14'
    const ex = k.dir > 0 ? 1 : -1
    c.fillRect((0 + ex) * p, -5 * p, p, p)
    c.fillRect((2 + ex) * p, -5 * p, p, p)
    // beanie and pompom
    c.fillStyle = '#ff8a3d'
    c.fillRect(-2 * p, -8 * p, 5 * p, 2 * p)
    c.fillRect(-3 * p, -7 * p, 7 * p, p)
    c.fillStyle = '#f7e07a'
    c.fillRect(0, -9 * p, p, p)
    // tools and props
    if (k.state === 'dig' || k.state === 'bash') {
      c.fillStyle = '#8b8598'
      const swing = Math.floor(k.t / 2) % 2
      if (k.state === 'dig') c.fillRect(-1 * p, swing ? 0 : -p, 3 * p, p)
      else c.fillRect(k.dir * (3 + swing) * p, -4 * p, 2 * p, p)
    } else if (k.state === 'build') {
      c.fillStyle = '#e2614f'
      c.fillRect(k.dir * 3 * p, -3 * p, 2 * p, p)
    } else if (k.state === 'float' || (k.umbrella && k.state === 'fall')) {
      c.fillStyle = '#ff7ab6'
      c.beginPath()
      c.arc(0.5 * p, -12 * p, 5 * p, Math.PI, 0)
      c.fill()
      c.fillStyle = '#2b2236'
      c.fillRect(0, -12 * p, Math.max(1, p * 0.6), 5 * p)
    } else if (k.state === 'dizzy') {
      c.fillStyle = '#f7e07a'
      const a = k.t * 0.4
      for (let i = 0; i < 3; i++) c.fillRect(Math.cos(a + (i * TAU) / 3) * 4 * p, -11 * p + Math.sin(a + (i * TAU) / 3) * p, p, p)
    }
    c.restore()
  }
}
