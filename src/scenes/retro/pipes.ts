import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

const N = 10 // grid cells per axis
const DIRS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const
const COLS = [
  ['#aa0000', '#ff5555', '#ffaaaa'],
  ['#00aa00', '#55ff55', '#ccffcc'],
  ['#0000aa', '#5555ff', '#aaaaff'],
  ['#aa5500', '#ffff55', '#ffffcc'],
  ['#00aaaa', '#55ffff', '#ccffff'],
  ['#aa00aa', '#ff55ff', '#ffccff'],
  ['#555555', '#aaaaaa', '#ffffff'],
]

interface Seg {
  a: [number, number, number]
  b: [number, number, number]
  col: number
  joint: boolean
}

export function create(ctx: SceneContext) {
  return new Pipes(ctx)
}

/** Pipes grow one cell at a time through a 3D grid, turning at random, until the box is full. */
class Pipes extends PixelScene {
  used = new Uint8Array(N * N * N)
  segs: Seg[] = []
  heads: { p: [number, number, number]; d: number; col: number; len: number }[] = []
  acc = 0
  fade = 0
  yaw = 0.6
  nextCol = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.reset()
  }
  palette() {
    return ['#000000', ...COLS.flat()]
  }
  dither() {
    return 0
  }
  idx(p: number[]) {
    return p[0] + p[1] * N + p[2] * N * N
  }
  free(p: number[]) {
    return p.every((v) => v >= 0 && v < N) && !this.used[this.idx(p)]
  }
  reset() {
    this.nextCol = this.r.int(0, COLS.length - 1)
    this.used.fill(0)
    this.segs = []
    this.heads = []
    for (let i = 0; i < this.num('pipes'); i++) this.newHead(i)
    this.fade = 0
  }
  newHead(i: number) {
    for (let tries = 0; tries < 50; tries++) {
      const p: [number, number, number] = [this.r.int(0, N - 1), this.r.int(0, N - 1), this.r.int(0, N - 1)]
      if (this.free(p)) {
        this.used[this.idx(p)] = 1
        this.heads[i] = { p, d: this.r.int(0, 5), col: this.nextCol++ % COLS.length, len: 0 }
        return
      }
    }
  }
  grow() {
    let alive = 0
    this.heads.forEach((hd, i) => {
      if (!hd) return
      let d = hd.d
      if (this.r.chance(0.3)) d = this.r.int(0, 5)
      const tryDir = (dd: number) => {
        const n: [number, number, number] = [hd.p[0] + DIRS[dd][0], hd.p[1] + DIRS[dd][1], hd.p[2] + DIRS[dd][2]]
        return this.free(n) ? n : null
      }
      let next = tryDir(d)
      if (!next)
        for (const dd of [0, 1, 2, 3, 4, 5].sort(() => this.r() - 0.5)) {
          next = tryDir(dd)
          if (next) {
            d = dd
            break
          }
        }
      if (!next || hd.len > this.num('length')) {
        this.newHead(i)
        return
      }
      this.used[this.idx(next)] = 1
      this.segs.push({ a: hd.p, b: next, col: hd.col, joint: d !== hd.d })
      hd.p = next
      hd.d = d
      hd.len++
      alive++
    })
    if (this.segs.length > N * N * N * 0.45 || alive === 0) this.fade = 0.001
  }
  step(dt: number) {
    this.yaw += dt * 0.05 * this.num('rotate')
    if (this.fade > 0) {
      this.fade += dt
      if (this.fade > 1.5) this.reset()
      return
    }
    this.acc += dt * this.num('speed') * 12
    while (this.acc > 1) {
      this.acc--
      this.grow()
    }
  }
  project(p: number[]) {
    const s = Math.min(this.w, this.h) / (N * 1.6)
    const x = p[0] - N / 2 + 0.5
    const y = p[1] - N / 2 + 0.5
    const z = p[2] - N / 2 + 0.5
    const cs = Math.cos(this.yaw)
    const sn = Math.sin(this.yaw)
    const rx = x * cs - z * sn
    const rz = x * sn + z * cs + N * 1.6
    const f = (N * 1.6) / rz
    return { x: this.w / 2 + rx * s * f, y: this.h / 2 + y * s * f, z: rz, f, s }
  }
  draw() {
    const c = this.c
    c.fillStyle = '#000'
    c.fillRect(0, 0, this.w, this.h)
    const items = this.segs.map((sg) => {
      const A = this.project(sg.a)
      const B = this.project(sg.b)
      return { sg, A, B, z: (A.z + B.z) / 2 }
    })
    items.sort((a, b) => b.z - a.z)
    const ball = this.str('joints') === 'ball'
    for (const { sg, A, B } of items) {
      const col = COLS[sg.col]
      const r = Math.max(1.5, A.s * 0.26 * A.f)
      // a cylinder in three stripes: shadow, body, highlight
      const dx = B.x - A.x
      const dy = B.y - A.y
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      c.lineCap = ball ? 'butt' : 'square'
      for (const [k, w, cc] of [
        [0, r * 2, col[0]],
        [-0.25, r * 1.1, col[1]],
        [-0.45, r * 0.35, col[2]],
      ] as const) {
        c.strokeStyle = cc
        c.lineWidth = Math.max(1, w)
        c.beginPath()
        c.moveTo(A.x + nx * r * k, A.y + ny * r * k)
        c.lineTo(B.x + nx * r * k, B.y + ny * r * k)
        c.stroke()
      }
      if (sg.joint && ball) {
        c.fillStyle = col[1]
        c.beginPath()
        c.arc(A.x, A.y, r * 1.35, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = col[2]
        c.fillRect(Math.round(A.x - r * 0.6), Math.round(A.y - r * 0.6), Math.max(1, Math.round(r * 0.5)), Math.max(1, Math.round(r * 0.5)))
      }
    }
    if (this.fade > 0) {
      c.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade / 1.2)})`
      c.fillRect(0, 0, this.w, this.h)
    }
  }
}
