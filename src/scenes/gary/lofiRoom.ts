import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { WorldScene } from './world'

export function create(ctx: SceneContext) {
  return new LofiRoom(ctx)
}

/** A cosy room at night: rain on the window, a record spinning, a cat asleep, fairy lights. */
class LofiRoom extends WorldScene {
  drops: { x: number; y: number; v: number }[] = []
  notes: { x: number; y: number; a: number }[] = []
  steam: { x: number; y: number; a: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.drops = Array.from({ length: 70 }, () => ({ x: this.r.range(110, 470), y: this.r.range(70, 300), v: this.r.range(20, 70) }))
  }
  palette() {
    return PX.night16
  }
  step(dt: number) {
    const rain = this.num('rain')
    for (const d of this.drops) {
      d.y += d.v * dt * rain * (Math.sin(this.t * 2 + d.x) > 0.3 ? 2.5 : 0.3)
      if (d.y > 300) {
        d.y = 70
        d.x = this.r.range(110, 470)
      }
    }
    if (this.bool('music') && this.r.chance(dt * 0.8)) this.notes.push({ x: 770, y: 300, a: 0 })
    for (const n of this.notes) {
      n.a += dt
      n.y -= dt * 22
      n.x += Math.sin(n.a * 2) * dt * 14
    }
    this.notes = this.notes.filter((n) => n.a < 4)
    if (this.r.chance(dt * 2)) this.steam.push({ x: 448 + this.r.range(-3, 3), y: 352, a: 0 })
    for (const s of this.steam) {
      s.a += dt
      s.y -= dt * 14
      s.x += Math.sin(s.a * 3) * dt * 6
    }
    this.steam = this.steam.filter((s) => s.a < 2.2)
  }
  draw() {
    const c = this.c
    const t = this.t
    this.screen()
    c.fillStyle = '#1a1430'
    c.fillRect(0, 0, this.w, this.h)
    this.world()
    // wall with a soft lamp light
    c.fillStyle = '#1e1838'
    c.fillRect(-300, 0, 1560, 400)
    this.glow(300, 250, 380, 'rgba(255,170,90,A)', 0.16 * this.g.intensity)
    // window: night city, moon, rain sliding on the glass
    c.save()
    this.rr(100, 60, 380, 250, 8)
    c.clip()
    const sky = c.createLinearGradient(0, 60, 0, 310)
    sky.addColorStop(0, '#0b1030')
    sky.addColorStop(1, '#3a2a5e')
    c.fillStyle = sky
    c.fillRect(100, 60, 380, 250)
    c.fillStyle = '#f2ecd8'
    c.beginPath()
    c.arc(410, 110, 18, 0, Math.PI * 2)
    c.fill()
    this.glow(410, 110, 60, 'rgba(242,236,216,A)', 0.2)
    for (let i = 0; i < 9; i++) {
      const bx = 100 + i * 44
      const bh = 50 + ((i * 41) % 80)
      c.fillStyle = '#120e28'
      c.fillRect(bx, 310 - bh, 40, bh)
      for (let k = 0; k < 4; k++) {
        if (Math.sin(i * 2.3 + k * 1.9 + t * 0.07) > 0.1) {
          c.fillStyle = k % 2 ? 'rgba(255,190,110,0.7)' : 'rgba(255,120,170,0.5)'
          c.fillRect(bx + 8 + (k % 2) * 16, 318 - bh + Math.floor(k / 2) * 18, 8, 7)
        }
      }
    }
    c.fillStyle = 'rgba(190,200,255,0.5)'
    for (const d of this.drops) {
      c.beginPath()
      c.ellipse(d.x, d.y, 1.6, 2.6, 0, 0, Math.PI * 2)
      c.fill()
      c.fillRect(d.x - 0.5, d.y - 10, 1, 8)
    }
    c.restore()
    c.strokeStyle = '#3b2f5e'
    c.lineWidth = 8
    this.rr(100, 60, 380, 250, 8)
    c.stroke()
    c.lineWidth = 5
    c.beginPath()
    c.moveTo(290, 60)
    c.lineTo(290, 310)
    c.stroke()
    // fairy lights along the top of the window
    for (let i = 0; i < 14; i++) {
      const x = 90 + i * 30
      const y = 48 + Math.sin((i / 13) * Math.PI) * 18
      const on = 0.55 + 0.45 * Math.sin(t * 1.6 + i * 1.3)
      const col = ['rgba(255,200,120,A)', 'rgba(255,120,170,A)', 'rgba(140,220,255,A)'][i % 3]
      this.glow(x, y, 16, col, 0.5 * on * this.g.intensity)
      c.fillStyle = col.replace('A', String(0.6 + 0.4 * on))
      c.beginPath()
      c.arc(x, y, 3.5, 0, Math.PI * 2)
      c.fill()
    }
    c.strokeStyle = '#2a2244'
    c.lineWidth = 1.5
    c.beginPath()
    for (let i = 0; i < 14; i++) {
      const x = 90 + i * 30
      const y = 48 + Math.sin((i / 13) * Math.PI) * 18
      if (i) c.lineTo(x, y)
      else c.moveTo(x, y)
    }
    c.stroke()
    // bookshelf on the left
    c.fillStyle = '#2a2040'
    c.fillRect(-40, 120, 110, 280)
    const books = ['#b34a6a', '#e0a050', '#4a7ab0', '#6a5aa0', '#d0d0c0', '#3a8a7a']
    for (let s = 0; s < 3; s++) {
      c.fillStyle = '#1a142c'
      c.fillRect(-40, 200 + s * 80, 110, 6)
      for (let b = 0; b < 7; b++) {
        c.fillStyle = books[(b + s * 2) % books.length]
        c.fillRect(-34 + b * 14, 200 + s * 80 - 40 - ((b * 7) % 12), 11, 40 + ((b * 7) % 12))
      }
    }
    // desk with laptop, lamp, plant and mug
    c.fillStyle = '#3a2a3e'
    c.fillRect(80, 360, 440, 14)
    c.fillStyle = '#2a1e30'
    c.fillRect(100, 374, 14, 140)
    c.fillRect(486, 374, 14, 140)
    // laptop
    c.fillStyle = '#2b2540'
    c.beginPath()
    c.moveTo(250, 360)
    c.lineTo(370, 360)
    c.lineTo(356, 290)
    c.lineTo(264, 290)
    c.fill()
    c.fillStyle = '#6a8ad8'
    c.globalAlpha = 0.9
    c.beginPath()
    c.moveTo(270, 296)
    c.lineTo(350, 296)
    c.lineTo(360, 352)
    c.lineTo(260, 352)
    c.fill()
    c.globalAlpha = 1
    c.fillStyle = 'rgba(255,255,255,0.55)'
    for (let i = 0; i < 6; i++) c.fillRect(276 + (i % 2) * 6, 306 + i * 7, 30 + ((i * 17 + Math.floor(t)) % 40), 2)
    this.glow(310, 320, 110, 'rgba(120,150,255,A)', 0.18 * this.g.intensity)
    c.fillStyle = '#3a3358'
    c.fillRect(240, 358, 140, 5)
    // lamp
    c.fillStyle = '#d88a4a'
    c.beginPath()
    c.moveTo(150, 300)
    c.lineTo(196, 300)
    c.lineTo(184, 270)
    c.lineTo(162, 270)
    c.fill()
    c.fillStyle = '#4a3a50'
    c.fillRect(170, 300, 4, 56)
    c.fillRect(156, 354, 32, 6)
    this.glow(173, 312, 150, 'rgba(255,180,100,A)', 0.4 * this.g.intensity)
    // plant
    c.fillStyle = '#b4614a'
    c.fillRect(398, 330, 26, 30)
    c.fillStyle = '#4fa36a'
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.4 + Math.sin(t * 0.7 + i) * 0.04
      c.beginPath()
      c.ellipse(411 + Math.cos(a) * 18, 326 + Math.sin(a) * 18, 12, 4, a, 0, Math.PI * 2)
      c.fill()
    }
    // mug and steam
    c.fillStyle = '#e8d8c8'
    this.rr(438, 338, 22, 22, 4)
    c.fill()
    for (const s of this.steam) {
      c.fillStyle = `rgba(240,230,220,${0.2 * (1 - s.a / 2.2)})`
      c.beginPath()
      c.arc(s.x, s.y, 2 + s.a * 3, 0, Math.PI * 2)
      c.fill()
    }
    // record player on a cabinet
    c.fillStyle = '#3a2a3e'
    c.fillRect(660, 340, 240, 170)
    c.fillStyle = '#2a1e30'
    c.fillRect(670, 360, 105, 140)
    c.fillRect(785, 360, 105, 140)
    c.fillStyle = '#5a4060'
    this.rr(680, 300, 200, 44, 6)
    c.fill()
    const spin = this.bool('music') ? t * 3.5 : 0
    c.save()
    c.translate(770, 318)
    c.scale(1, 0.32)
    c.fillStyle = '#121018'
    c.beginPath()
    c.arc(0, 0, 70, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.08)'
    c.lineWidth = 2
    for (let r = 24; r < 68; r += 7) {
      c.beginPath()
      c.arc(0, 0, r, 0, Math.PI * 2)
      c.stroke()
    }
    c.rotate(spin)
    c.fillStyle = '#e05a7a'
    c.beginPath()
    c.arc(0, 0, 20, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.6)'
    c.fillRect(4, -3, 12, 6)
    c.restore()
    c.strokeStyle = '#c9c2d8'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(860, 306)
    c.lineTo(842, 316)
    c.lineTo(800, 320)
    c.stroke()
    // music notes floating up
    c.fillStyle = '#ffd0e0'
    c.font = '20px "IBM Plex Mono", monospace'
    for (const n of this.notes) {
      c.globalAlpha = Math.max(0, 1 - n.a / 4)
      c.fillText(n.a % 2 > 1 ? '♫' : '♪', n.x, n.y)
    }
    c.globalAlpha = 1
    // floor and rug
    c.fillStyle = '#2a1e30'
    c.fillRect(-300, 400, 1560, 200)
    c.fillStyle = '#4a2f5a'
    c.beginPath()
    c.ellipse(560, 500, 260, 34, 0, 0, Math.PI * 2)
    c.fill()
    // the cat, curled up asleep, breathing
    const br = this.g.reducedMotion ? 0 : Math.sin(t * 1.6) * 1.5
    c.fillStyle = '#6a5a8a'
    c.beginPath()
    c.ellipse(560, 486, 40, 18, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#e8a050'
    c.beginPath()
    c.ellipse(560, 480 - br * 0.5, 38, 18 + br, 0, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.ellipse(530, 478 - br * 0.5, 16, 13, -0.2, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.moveTo(518, 470)
    c.lineTo(522, 458)
    c.lineTo(530, 467)
    c.moveTo(532, 466)
    c.lineTo(540, 456)
    c.lineTo(543, 469)
    c.fill()
    c.strokeStyle = '#b06a30'
    c.lineWidth = 2
    c.beginPath()
    c.arc(524, 479, 3, 0.2, Math.PI - 0.2)
    c.moveTo(534, 479)
    c.arc(536, 479, 3, 0.2, Math.PI - 0.2)
    c.stroke()
    c.strokeStyle = '#e8a050'
    c.lineWidth = 7
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(596, 486)
    c.quadraticCurveTo(606, 500, 572, 500)
    c.stroke()
    c.lineCap = 'butt'
    // z's from the cat
    c.fillStyle = 'rgba(255,230,200,0.7)'
    c.font = '14px "IBM Plex Mono", monospace'
    const z = (t * 0.5) % 1
    c.globalAlpha = 1 - z
    c.fillText('z', 512 - z * 6, 452 - z * 26)
    c.globalAlpha = 1
  }
}
