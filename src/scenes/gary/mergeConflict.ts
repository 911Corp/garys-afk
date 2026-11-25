import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, fit, font } from '../kit'

const LANE_COLS = ['#3ef07f', '#22e1ff', '#ff7ab6', '#ffc83d', '#a77bff', '#ff9a3d']
const BRANCHES = ['feat/jarvis-voice', 'fix/rug-check', 'hotfix/friday', 'chore/vibes', 'feat/free-stack', 'exp/wen-moon', 'fix/works-on-my-machine', 'feat/purity-v2']
const MSGS = ['wip', 'fix', 'fix again', 'pls work', "revert 'pls work'", 'gm', 'ship it', 'tests pass locally', 'add dark mode', 'remove console.log', 'jarvis: refactor utils', 'jarvis: add tests', 'bump deps', 'typo', 'it works, do not touch', 'final', 'final final', 'rename everything', 'make it pop', 'handle the edge case', 'docs: readme', 'perf: cache scans']

type Row = { lane: number; hash: string; msg: string; who: string; down: number[]; curve?: [number, number]; kind: 'commit' | 'merge' | 'branch' | 'conflict' | 'resolve' }

export function create(ctx: SceneContext) {
  return new MergeConflict(ctx)
}

/** A git history that grows forever: branches fork, merge, sometimes conflict, and get resolved. */
class MergeConflict extends PixelScene {
  rows: Row[] = []
  active: number[] = [0]
  names = new Map<number, string>([[0, 'main']])
  p = 0
  timer = 0
  pendingResolve = -1
  constructor(ctx: SceneContext) {
    super(ctx)
    for (let i = 0; i < 40; i++) this.add()
    this.p = 0
  }
  palette() {
    return PX.degen
  }
  dither() {
    return 0.3
  }
  hash() {
    let s = ''
    for (let i = 0; i < 7; i++) s += '0123456789abcdef'[this.r.int(0, 15)]
    return s
  }
  add() {
    const r = this.r
    const maxL = Math.max(2, Math.min(6, Math.round(this.num('branches'))))
    const down = [...this.active]
    const who = r.chance(0.45) ? 'jarvis' : 'gary'
    let row: Row
    const branchLanes = this.active.filter((l) => l !== 0)
    if (this.pendingResolve >= 0) {
      row = { lane: this.pendingResolve, hash: this.hash(), msg: 'resolve merge conflict', who: 'jarvis', down, kind: 'resolve' }
      this.pendingResolve = -1
    } else if (this.active.length < maxL && r.chance(0.4)) {
      let b = 1
      while (this.active.includes(b)) b++
      const a = r.chance(0.7) || !branchLanes.length ? 0 : r.pick(branchLanes)
      this.names.set(b, r.pick(BRANCHES))
      row = { lane: b, hash: this.hash(), msg: r.pick(MSGS), who, down, curve: [b, a], kind: 'branch' }
      this.active = [...this.active, b].sort((x, y) => x - y)
    } else if (branchLanes.length >= 2 && r.chance(0.16)) {
      const b = r.pick(branchLanes)
      const conflict = r.chance(this.num('conflicts'))
      row = { lane: 0, hash: this.hash(), msg: conflict ? 'CONFLICT (content): src/wallet.ts' : `Merge branch '${this.names.get(b)}'`, who, down: down.filter((l) => l !== b), curve: [0, b], kind: conflict ? 'conflict' : 'merge' }
      this.active = this.active.filter((l) => l !== b)
      if (conflict) this.pendingResolve = 0
    } else {
      const lane = r.chance(0.25) || !branchLanes.length ? 0 : r.pick(branchLanes)
      row = { lane, hash: this.hash(), msg: r.pick(MSGS), who, down, kind: 'commit' }
    }
    this.rows.unshift(row)
    if (this.rows.length > 80) this.rows.pop()
    this.p = 1
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.timer += dt * sp
    if (this.timer > 1.6) {
      this.timer = 0
      this.add()
    }
    this.p = Math.max(0, this.p - dt * 2.5)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0d1117'
    c.fillRect(0, 0, w, h)
    const rowH = Math.max(12, 11 * u)
    const laneW = Math.max(10, 9 * u)
    const left = Math.max(12 * u, w * 0.06)
    const top = 26 * u
    const textX = left + laneW * 6.4
    const fs = Math.max(8, rowH * 0.52)
    // header
    c.fillStyle = '#161b26'
    c.fillRect(0, 0, w, top - 6 * u)
    font(c, fs, MONO, 600)
    c.fillStyle = '#c4cee0'
    c.textBaseline = 'middle'
    c.fillText('git log --graph --all', left, (top - 6 * u) / 2)
    c.fillStyle = '#6b7a99'
    c.textAlign = 'right'
    c.fillText(this.rows.length + '+ commits', w - left, (top - 6 * u) / 2)
    c.textAlign = 'left'
    const ease = this.p * this.p * (3 - 2 * this.p)
    const yOf = (i: number) => top + (i - ease) * rowH + rowH / 2
    const xOf = (l: number) => left + l * laneW
    c.save()
    c.beginPath()
    c.rect(0, top - 6 * u, w, h)
    c.clip()
    c.lineWidth = Math.max(1.5, 1.3 * u)
    c.lineCap = 'round'
    const rows = this.rows
    const visible = Math.min(rows.length - 1, Math.ceil((h - top) / rowH) + 2)
    for (let i = 0; i < visible; i++) {
      const R = rows[i]
      const y0 = yOf(i)
      const y1 = yOf(i + 1)
      for (const l of R.down) {
        c.strokeStyle = LANE_COLS[l % LANE_COLS.length]
        c.beginPath()
        c.moveTo(xOf(l), y0)
        c.lineTo(xOf(l), y1)
        c.stroke()
      }
      if (R.curve) {
        const [a, b] = R.curve
        c.strokeStyle = LANE_COLS[(R.kind === 'branch' ? a : b) % LANE_COLS.length]
        c.beginPath()
        c.moveTo(xOf(a), y0)
        c.bezierCurveTo(xOf(a), (y0 + y1) / 2, xOf(b), (y0 + y1) / 2, xOf(b), y1)
        c.stroke()
      }
    }
    // tips get a branch label
    const tipSeen = new Set<number>()
    for (let i = 0; i < visible; i++) {
      const R = rows[i]
      const y = yOf(i)
      if (y < top - rowH || y > h + rowH) continue
      const col = LANE_COLS[R.lane % LANE_COLS.length]
      const bad = R.kind === 'conflict'
      c.fillStyle = bad ? '#ff4d64' : col
      c.beginPath()
      c.arc(xOf(R.lane), y, (R.kind === 'merge' || bad ? 3.2 : 2.4) * u, 0, TAU)
      c.fill()
      if (R.kind === 'merge') {
        c.fillStyle = '#0d1117'
        c.beginPath()
        c.arc(xOf(R.lane), y, 1.4 * u, 0, TAU)
        c.fill()
      }
      let x = textX
      font(c, fs, MONO, 400)
      c.fillStyle = '#ffc83d'
      c.globalAlpha = i === 0 ? 1 - ease : 1
      c.fillText(R.hash, x, y)
      x += c.measureText(R.hash + '  ').width
      if (!tipSeen.has(R.lane) && this.active.includes(R.lane)) {
        tipSeen.add(R.lane)
        const name = (R.lane === 0 && i === 0 ? 'HEAD -> ' : '') + (this.names.get(R.lane) ?? '')
        const tw = c.measureText(name).width + fs
        c.fillStyle = col + '33'
        c.fillRect(x - fs * 0.3, y - fs * 0.7, tw, fs * 1.4)
        c.fillStyle = col
        c.fillText(name, x + fs * 0.2, y)
        x += tw + fs * 0.6
      }
      c.fillStyle = bad ? '#ff4d64' : R.kind === 'resolve' ? '#3ef07f' : '#c4cee0'
      const tail = '  ' + R.who
      const room = w - x - left - c.measureText(tail).width
      c.fillText(fit(c, R.msg, Math.max(fs * 3, room)), x, y)
      c.fillStyle = R.who === 'jarvis' ? '#a77bff' : '#6b7a99'
      c.textAlign = 'right'
      if (room > fs * 6) c.fillText(R.who, w - left, y)
      c.textAlign = 'left'
      c.globalAlpha = 1
    }
    c.restore()
    // fade at the bottom
    const g = c.createLinearGradient(0, h * 0.75, 0, h)
    g.addColorStop(0, 'rgba(13,17,23,0)')
    g.addColorStop(1, 'rgba(13,17,23,1)')
    c.fillStyle = g
    c.fillRect(0, h * 0.75, w, h * 0.25)
    c.textBaseline = 'alphabetic'
  }
}
