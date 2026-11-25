import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

const W = 1600
const H = 900
const FLOOR = 640

type ReelState = { mode: 'stop' | 'fwd' | 'back' | 'rewind'; left: number; angA: number; angB: number; loopA: number; loopB: number }

export function create(ctx: SceneContext) {
  return new Mainframe(ctx)
}

/** A 1970s machine room: tape drives, a blinking front panel, a line printer and an operator console. */
class Mainframe extends PixelScene {
  k = 1
  ox = 0
  oy = 0
  reels: ReelState[] = []
  lamps: Uint8Array = new Uint8Array(16 * 8)
  lampAcc = 0
  lampMode = 0
  counter = 0
  paper = 0
  printLines: string[] = []
  consoleLines: string[] = []
  consoleAcc = 0
  flicker = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    for (let i = 0; i < 2; i++) this.reels.push({ mode: 'fwd', left: this.r.range(1, 4), angA: 0, angB: 1, loopA: 0.5, loopB: 0.5 })
    for (let i = 0; i < 30; i++) this.printLines.push(this.printLine())
    for (let i = 0; i < 8; i++) this.consoleLines.push(this.consoleLine())
    this.layout()
  }
  palette() {
    return PX.machine
  }
  dither() {
    return 0.3
  }
  printLine() {
    const r = this.r
    const n = () => String(r.int(0, 99999)).padStart(5, '0')
    return r.pick([`${n()}  GARY.PAYROLL   ${n()} ${n()}`, `${n()}  JOB ${r.int(100, 999)} ENDED  RC=0000`, `  TOTAL BAGS ...... ${n()}`, `${n()}  ${n()}  ${n()}  ${n()}`, '  ** END OF REPORT **', `  JARVIS SORT  ${n()} RECS`])
  }
  consoleLine() {
    const r = this.r
    return r.pick(['IEF404I GARY - AFK', `JOB ${r.int(1000, 9999)} STARTED`, 'MOUNT TAPE 0417', 'TAPE 0417 READY', `CPU ${r.int(12, 99)}%`, 'PRINTER 1 READY', 'JARVIS: ALL GOOD', `CORE ${r.int(64, 512)}K FREE`])
  }
  layout() {
    this.k = Math.min(this.w / W, this.h / H)
    this.ox = (this.w - W * this.k) / 2
    this.oy = (this.h - H * this.k) / 2
  }
  step(dt: number) {
    const act = this.num('activity')
    const d = dt * act
    for (const rl of this.reels) {
      rl.left -= d
      if (rl.left <= 0) {
        rl.mode = this.r.pick(['stop', 'fwd', 'fwd', 'back', 'rewind'] as const)
        rl.left = rl.mode === 'rewind' ? this.r.range(1.5, 3) : this.r.range(0.6, 3.5)
      }
      const sp = { stop: 0, fwd: 2.2, back: -1.6, rewind: -14 }[rl.mode]
      rl.angA += sp * d
      rl.angB += sp * d * 1.15
      // vacuum column loops wobble with the tape motion
      rl.loopA += (0.5 + Math.sin(this.t * 3 + rl.angA) * 0.35 * Math.min(1, Math.abs(sp)) - rl.loopA) * Math.min(1, dt * 6)
      rl.loopB += (0.5 + Math.cos(this.t * 2.6 + rl.angB) * 0.35 * Math.min(1, Math.abs(sp)) - rl.loopB) * Math.min(1, dt * 6)
    }
    this.lampAcc += d
    if (this.lampAcc > 0.12) {
      this.lampAcc = 0
      this.counter++
      if (this.r.chance(0.01)) this.lampMode = (this.lampMode + 1) % 3
      const L = this.lamps
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 16; col++) {
          const i = row * 16 + col
          if (row === 0) L[i] = (this.counter >> (15 - col)) & 1 // binary counter
          else if (row === 1) L[i] = col === this.counter % 16 ? 1 : 0 // chaser
          else if (this.lampMode === 0) L[i] = this.r.chance(0.35) ? 1 : 0
          else if (this.lampMode === 1) L[i] = (col + row + this.counter) % 5 === 0 ? 1 : 0
          else L[i] = this.r.chance(0.08) ? 1 - L[i] : L[i]
        }
    }
    this.paper += d * 18
    if (this.paper > 22) {
      this.paper -= 22
      this.printLines.unshift(this.printLine())
      this.printLines.length = 30
    }
    this.consoleAcc += d
    if (this.consoleAcc > 1.4) {
      this.consoleAcc = 0
      this.consoleLines.push(this.consoleLine())
      this.consoleLines.shift()
    }
    if (this.r.chance(dt / 18)) this.flicker = 0.4
    this.flicker = Math.max(0, this.flicker - dt)
  }
  draw() {
    const c = this.c
    const night = this.str('lighting') === 'night'
    c.setTransform(1, 0, 0, 1, 0, 0)
    // wall and floor fill the whole screen whatever its ratio
    const fy = this.oy + FLOOR * this.k
    const wall = c.createLinearGradient(0, 0, 0, fy)
    wall.addColorStop(0, night ? '#2a2c2b' : '#c9c3b0')
    wall.addColorStop(1, night ? '#3a3a35' : '#ddd6c2')
    c.fillStyle = wall
    c.fillRect(0, 0, this.w, fy)
    c.fillStyle = night ? '#232624' : '#9fa39b'
    c.fillRect(0, fy, this.w, this.h - fy)
    c.setTransform(this.k, 0, 0, this.k, this.ox, this.oy)
    // raised floor tiles in perspective
    c.strokeStyle = night ? 'rgba(255,255,255,0.06)' : 'rgba(40,40,35,0.25)'
    c.lineWidth = 2
    const vx = W / 2
    for (let i = -12; i <= 12; i++) {
      c.beginPath()
      c.moveTo(vx + i * 60, FLOOR)
      c.lineTo(vx + i * 260, H + 300)
      c.stroke()
    }
    for (let j = 1; j < 8; j++) {
      const y = FLOOR + Math.pow(j / 7, 1.8) * (H + 300 - FLOOR)
      c.beginPath()
      c.moveTo(-2000, y)
      c.lineTo(W + 2000, y)
      c.stroke()
    }
    // baseboard
    c.fillStyle = night ? '#1a1b1a' : '#6d6b62'
    c.fillRect(-2000, FLOOR - 14, W + 4000, 14)
    // ceiling lights
    for (let i = 0; i < 4; i++) {
      const x = 140 + i * 360
      const on = !(this.flicker > 0 && i === 2 && Math.floor(this.t * 30) % 2)
      c.fillStyle = on ? (night ? '#5d5f52' : '#fffbe8') : '#8c8a80'
      c.fillRect(x, 26, 280, 18)
      if (on && !night) {
        const g = c.createLinearGradient(0, 44, 0, 220)
        g.addColorStop(0, 'rgba(255,250,225,0.35)')
        g.addColorStop(1, 'rgba(255,250,225,0)')
        c.fillStyle = g
        c.beginPath()
        c.moveTo(x, 44)
        c.lineTo(x + 280, 44)
        c.lineTo(x + 330, 220)
        c.lineTo(x - 50, 220)
        c.fill()
      }
    }
    const shade = night ? 0.45 : 1
    this.tapeDrive(110, this.reels[0], shade, 'TAPE 0417')
    this.tapeDrive(370, this.reels[1], shade, 'TAPE 0418')
    this.cpu(630, shade, night)
    this.printer(990, shade)
    this.console(1250, shade, night)
    // night: a cold vignette, lamps glow through it
    if (night) {
      c.setTransform(1, 0, 0, 1, 0, 0)
      const g = c.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.2, this.w / 2, this.h / 2, this.w * 0.8)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,10,0.6)')
      c.fillStyle = g
      c.fillRect(0, 0, this.w, this.h)
    }
  }
  cabinet(x: number, w: number, shade: number, label: string) {
    const c = this.c
    const top = 200
    c.fillStyle = 'rgba(0,0,0,0.18)'
    c.fillRect(x + 10, FLOOR - 8, w, 12)
    const g = c.createLinearGradient(x, 0, x + w, 0)
    g.addColorStop(0, shadeHex('#d9cfb6', shade))
    g.addColorStop(1, shadeHex('#c4b99d', shade))
    c.fillStyle = g
    c.fillRect(x, top, w, FLOOR - top)
    c.fillStyle = shadeHex('#2f6f78', shade)
    c.fillRect(x, top, w, 34)
    c.fillStyle = shadeHex('#e9e2cc', shade)
    c.font = '18px "IBM Plex Mono", monospace'
    c.textAlign = 'left'
    c.fillText(label, x + 12, top + 23)
    c.strokeStyle = 'rgba(0,0,0,0.35)'
    c.lineWidth = 2
    c.strokeRect(x, top, w, FLOOR - top)
    // vent slats
    c.strokeStyle = 'rgba(0,0,0,0.18)'
    for (let y = FLOOR - 60; y < FLOOR - 16; y += 8) {
      c.beginPath()
      c.moveTo(x + 16, y)
      c.lineTo(x + w - 16, y)
      c.stroke()
    }
  }
  tapeDrive(x: number, rl: ReelState, shade: number, label: string) {
    const c = this.c
    const w = 230
    this.cabinet(x, w, shade, label)
    // glass window
    c.fillStyle = shadeHex('#3d4446', shade)
    c.fillRect(x + 16, 248, w - 32, 200)
    for (const [cx, ang] of [
      [x + 66, rl.angA],
      [x + w - 66, rl.angB],
    ] as const) {
      const cy = 312
      c.fillStyle = shadeHex('#1d1f20', shade)
      c.beginPath()
      c.arc(cx, cy, 50, 0, TAU)
      c.fill()
      c.fillStyle = shadeHex('#6b4a2a', shade) // tape pack
      c.beginPath()
      c.arc(cx, cy, 42, 0, TAU)
      c.fill()
      c.fillStyle = shadeHex('#b9bcbc', shade)
      c.beginPath()
      c.arc(cx, cy, 20, 0, TAU)
      c.fill()
      c.fillStyle = shadeHex('#1d1f20', shade)
      for (let i = 0; i < 3; i++) {
        const a = ang + (i * TAU) / 3
        c.beginPath()
        c.arc(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 5, 0, TAU)
        c.fill()
      }
      c.beginPath()
      c.arc(cx, cy, 4, 0, TAU)
      c.fill()
    }
    // vacuum columns with tape loops
    for (const [i, loop] of [
      [0, rl.loopA],
      [1, rl.loopB],
    ] as const) {
      const cx = x + 50 + i * 100
      c.fillStyle = shadeHex('#596164', shade)
      c.fillRect(cx, 380, 30, 64)
      c.strokeStyle = shadeHex('#6b4a2a', shade)
      c.lineWidth = 4
      const ly = 386 + loop * 50
      c.beginPath()
      c.moveTo(cx + 4, 380)
      c.lineTo(cx + 4, ly)
      c.arc(cx + 15, ly, 11, Math.PI, 0, true)
      c.lineTo(cx + 26, 380)
      c.stroke()
    }
    // status lamps
    const lit = rl.mode !== 'stop'
    this.lamp(x + 30, 480, lit ? '#ffb347' : '#5a4a30', lit)
    this.lamp(x + 60, 480, rl.mode === 'rewind' ? '#ff5d4a' : '#5a3030', rl.mode === 'rewind')
    this.lamp(x + 90, 480, '#7dff8a', true)
    c.fillStyle = shadeHex('#4a4537', shade)
    c.font = '14px "IBM Plex Mono", monospace'
    c.fillText(rl.mode === 'rewind' ? 'REWIND' : rl.mode === 'stop' ? 'READY' : 'ACTIVE', x + 112, 485)
  }
  lamp(x: number, y: number, color: string, on: boolean, r = 7) {
    const c = this.c
    if (on) {
      c.fillStyle = color
      c.shadowColor = color
      c.shadowBlur = 14 * this.g.intensity
    } else {
      c.fillStyle = '#3a3630'
      c.shadowBlur = 0
    }
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.fill()
    c.shadowBlur = 0
  }
  cpu(x: number, shade: number, night: boolean) {
    const c = this.c
    const w = 320
    this.cabinet(x, w, shade, 'GARY/360 CPU')
    c.fillStyle = shadeHex('#2a2b2a', shade)
    c.fillRect(x + 18, 250, w - 36, 210)
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 16; col++) {
        const on = this.lamps[row * 16 + col] === 1
        const color = row < 2 ? '#ff6a3d' : row < 5 ? '#ffd166' : '#ffffff'
        this.lamp(x + 36 + col * 17.5, 268 + row * 24, color, on, night ? 5.5 : 5)
      }
    // toggle switches
    for (let i = 0; i < 16; i++) {
      const sx = x + 36 + i * 17.5
      c.fillStyle = i % 4 < 2 ? shadeHex('#c0392b', shade) : shadeHex('#e9e2cc', shade)
      c.fillRect(sx - 5, 486, 10, 26)
      c.fillStyle = '#222'
      c.fillRect(sx - 2, (i * 7 + Math.floor(this.counter / 400)) % 3 ? 488 : 500, 4, 10)
    }
  }
  printer(x: number, shade: number) {
    const c = this.c
    const w = 240
    this.cabinet(x, w, shade, 'LINE PRINTER 1')
    // paper rising out of the top and folding behind
    const px = x + 30
    const pw = w - 60
    c.save()
    c.beginPath()
    c.rect(px, 60, pw, 150)
    c.clip()
    c.fillStyle = shadeHex('#f4f1e6', shade)
    c.fillRect(px, 60, pw, 150)
    // green bar paper
    c.fillStyle = shadeHex('#d7ecd5', shade)
    for (let i = -2; i < 10; i++) {
      const y = 210 - ((i * 44 + this.paper * 2) % 440) + 0
      if (i % 2 === 0) c.fillRect(px, y - 22, pw, 22)
    }
    c.fillStyle = shadeHex('#5b5b5b', shade)
    c.font = '9px "IBM Plex Mono", monospace'
    for (let i = 0; i < 8; i++) c.fillText(this.printLines[i].slice(0, 30), px + 8, 204 - i * 22 - this.paper)
    c.restore()
    // tractor holes
    c.fillStyle = shadeHex('#bdb8a8', shade)
    for (let y = 66; y < 206; y += 12) {
      c.fillRect(px + 2, y + ((this.paper * 0.5) % 12), 3, 3)
      c.fillRect(px + pw - 5, y + ((this.paper * 0.5) % 12), 3, 3)
    }
    // lid and window
    c.fillStyle = shadeHex('#3d4446', shade)
    c.fillRect(x + 18, 250, w - 36, 120)
    c.fillStyle = shadeHex('#f4f1e6', shade)
    c.fillRect(px, 260, pw, 100)
    c.fillStyle = shadeHex('#5b5b5b', shade)
    c.font = '10px "IBM Plex Mono", monospace'
    const strike = Math.floor(this.t * 8) % 2
    for (let i = 0; i < 6; i++) c.fillText(this.printLines[i].slice(0, 28), px + 6, 352 - i * 15 - (i === 0 && strike ? 1 : 0))
    // fanfold stack in the basket
    c.fillStyle = shadeHex('#e8e3d3', shade)
    for (let i = 0; i < 8; i++) c.fillRect(x + 24 + (i % 2) * 4, 590 - i * 6, w - 52, 5)
    this.lamp(x + 30, 400, '#7dff8a', true)
    this.lamp(x + 58, 400, '#ffb347', strike === 1)
  }
  console(x: number, shade: number, night: boolean) {
    const c = this.c
    // desk
    c.fillStyle = shadeHex('#c4b99d', shade)
    c.fillRect(x, 470, 260, FLOOR - 470)
    c.fillStyle = shadeHex('#2f6f78', shade)
    c.fillRect(x - 10, 456, 280, 18)
    // CRT terminal
    c.fillStyle = shadeHex('#d9cfb6', shade)
    c.fillRect(x + 40, 290, 180, 166)
    c.fillStyle = '#0b120c'
    c.fillRect(x + 56, 306, 148, 110)
    c.fillStyle = '#5dff7a'
    c.shadowColor = '#5dff7a'
    c.shadowBlur = (night ? 8 : 4) * this.g.intensity
    c.font = '11px "IBM Plex Mono", monospace'
    this.consoleLines.forEach((l, i) => c.fillText(l.slice(0, 21), x + 62, 322 + i * 12.5))
    c.shadowBlur = 0
    // keyboard
    c.fillStyle = shadeHex('#3a3a35', shade)
    c.fillRect(x + 50, 426, 160, 22)
    c.fillStyle = shadeHex('#d9cfb6', shade)
    for (let i = 0; i < 12; i++) c.fillRect(x + 56 + i * 13, 430, 10, 6)
    for (let i = 0; i < 11; i++) c.fillRect(x + 62 + i * 13, 439, 10, 6)
    // disk pack drive on the floor next to the desk
    c.fillStyle = shadeHex('#d9cfb6', shade)
    c.fillRect(x + 280, 500, 70, FLOOR - 500)
    c.fillStyle = shadeHex('#9da4a8', shade)
    c.beginPath()
    c.ellipse(x + 315, 500, 34, 10, 0, 0, TAU)
    c.fill()
    this.lamp(x + 300, 530, '#7dff8a', Math.floor(this.t * 3) % 4 !== 0, 5)
  }
}

function shadeHex(hex: string, k: number) {
  if (k >= 1) return hex
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * k)
  const g = Math.round(((n >> 8) & 255) * k)
  const b = Math.round((n & 255) * k)
  return `rgb(${r},${g},${b})`
}
