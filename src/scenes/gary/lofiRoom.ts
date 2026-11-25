import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

/**
 * Lo-fi Room: an original pixel-art attic studio at night. Drawn on a real 256x144 pixel grid
 * and scaled up without smoothing: a skylight in the rain, a desk with a CRT and a lamp,
 * hanging plants, a record spinning on the cabinet, and a dog asleep in its basket.
 */
const PW = 256
const PH = 144

const C = {
  wall: '#2b2140',
  wall2: '#33284d',
  beam: '#1c1530',
  floor: '#3d2a33',
  floor2: '#4a3340',
  sky: '#141a3a',
  sky2: '#25305e',
  glass: '#3a4a7a',
  wood: '#6b4430',
  wood2: '#8a5a3c',
  wood3: '#4a2e22',
  lamp: '#ffd27a',
  warm: '#ffb36a',
  crt: '#d9d0b8',
  crt2: '#a89f88',
  screen: '#10241c',
  green: '#7cf0a0',
  leaf: '#4f9a5a',
  leaf2: '#7cc06a',
  pot: '#c8643a',
  dog: '#e8c08a',
  dog2: '#b8865a',
  ink: '#120d1c',
  rec: '#16121e',
  label: '#ff7a8a',
  pink: '#ff9ac0',
  cream: '#f4ead8',
}

export function create(ctx: SceneContext) {
  return new LofiRoom(ctx)
}

class LofiRoom extends PixelScene {
  buf: HTMLCanvasElement
  b: CanvasRenderingContext2D
  drops: { x: number; y: number; v: number }[] = []
  slides: { x: number; y: number; v: number; len: number }[] = []
  notes: { x: number; y: number; life: number; k: number }[] = []
  zz: { x: number; y: number; life: number }[] = []
  steam = [0, 0.33, 0.66]
  stars: { x: number; y: number; p: number }[] = []
  code: string[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.buf = document.createElement('canvas')
    this.buf.width = PW
    this.buf.height = PH
    this.b = this.buf.getContext('2d')!
    this.drops = Array.from({ length: 70 }, () => ({ x: 84 + this.r() * 88, y: this.r() * 60, v: this.r.range(60, 100) }))
    this.slides = Array.from({ length: 8 }, () => ({ x: 86 + this.r() * 84, y: 10 + this.r() * 40, v: this.r.range(1, 4), len: this.r.int(2, 5) }))
    this.stars = Array.from({ length: 22 }, () => ({ x: 86 + this.r() * 84, y: 10 + this.r() * 30, p: this.r() * 6 }))
    this.code = Array.from({ length: 8 }, () => this.codeLine())
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.2
  }
  codeLine() {
    return '#'.repeat(this.r.int(2, 9))
  }
  step(dt: number) {
    const rain = this.num('rain')
    for (const d of this.drops) {
      d.y += d.v * dt
      if (d.y > 62) {
        d.y = 8
        d.x = 84 + this.r() * 88
      }
    }
    for (const s of this.slides) {
      s.y += s.v * dt * (0.5 + rain * 0.5)
      if (s.y > 60) {
        s.y = 10
        s.x = 86 + this.r() * 84
      }
    }
    if (this.bool('music') && this.r.chance(dt * 0.9))
      this.notes.push({ x: 204 + this.r() * 8, y: 96, life: 1, k: this.r.int(0, 1) })
    for (const n of this.notes) {
      n.y -= dt * 8
      n.x += Math.sin(this.t * 2 + n.y * 0.3) * dt * 6
      n.life -= dt * 0.25
    }
    this.notes = this.notes.filter((n) => n.life > 0)
    if (this.r.chance(dt * 0.5)) this.zz.push({ x: 46, y: 116, life: 1 })
    for (const z of this.zz) {
      z.y -= dt * 4
      z.x += dt * 3
      z.life -= dt * 0.3
    }
    this.zz = this.zz.filter((z) => z.life > 0)
    this.steam = this.steam.map((s) => (s + dt * 0.4) % 1)
    if (this.r.chance(dt * 1.5)) {
      this.code.shift()
      this.code.push(this.codeLine())
    }
  }
  /** A filled pixel rectangle on the 256x144 grid. */
  px(x: number, y: number, w: number, h: number, col: string) {
    this.b.fillStyle = col
    this.b.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }
  draw() {
    this.compose()
    const c = this.c
    const { w, h } = this
    // cover the screen with the pixel picture, centred on the desk and skylight
    const s = Math.max(w / PW, h / PH)
    const dw = PW * s
    const dh = PH * s
    c.fillStyle = C.ink
    c.fillRect(0, 0, w, h)
    c.imageSmoothingEnabled = false
    c.drawImage(this.buf, (w - dw) / 2 + (w < h ? -s * 6 : 0), (h - dh) / 2, dw, dh)
    c.imageSmoothingEnabled = !this.g.retro
  }
  compose() {
    const b = this.b
    const t = this.t
    const px = this.px.bind(this)
    // wall with soft stripes
    px(0, 0, PW, PH, C.wall)
    for (let x = 0; x < PW; x += 8) px(x, 0, 1, 118, C.wall2)
    // sloped ceiling beams
    for (let i = 0; i < 4; i++) {
      b.fillStyle = C.beam
      b.beginPath()
      b.moveTo(i * 64, 0)
      b.lineTo(i * 64 + 6, 0)
      b.lineTo(i * 64 + 40, 8)
      b.lineTo(i * 64 + 34, 8)
      b.fill()
    }
    px(0, 0, PW, 6, C.beam)
    // skylight: sky, moon, stars, treetops, rain
    px(82, 6, 92, 58, C.wood3)
    px(84, 8, 88, 54, C.sky)
    px(84, 34, 88, 28, C.sky2)
    for (const st of this.stars) if (Math.sin(t * 1.5 + st.p) > -0.3) px(st.x, st.y, 1, 1, C.cream)
    px(150, 14, 8, 8, C.cream)
    px(149, 15, 1, 6, C.cream)
    px(158, 15, 1, 6, C.cream)
    px(152, 16, 2, 2, '#d8cfb8')
    for (let x = 84; x < 172; x += 3) {
      const th = 6 + Math.round(Math.abs(Math.sin(x * 0.7)) * 8)
      px(x, 62 - th, 3, th, '#0e1428')
    }
    for (const d of this.drops) if (this.num('rain') > 0) px(d.x, d.y, 1, 3, '#5a6aa8')
    for (const s of this.slides) px(s.x, s.y, 1, s.len, '#8a9ad0')
    // window frame cross
    px(127, 8, 2, 54, C.wood3)
    px(84, 34, 88, 2, C.wood3)
    // fairy lights along the frame
    for (let i = 0; i < 12; i++) {
      const x = 84 + i * 8
      const y = 4 + Math.round(Math.sin(i * 0.8) * 1.5) + 2
      const on = Math.sin(t * 2 + i) > -0.6
      px(x, y, 2, 2, on ? [C.lamp, C.pink, C.green][i % 3] : C.wood3)
    }
    // floor
    px(0, 118, PW, 26, C.floor)
    for (let x = 0; x < PW; x += 18) px(x, 118, 1, 26, C.floor2)
    px(0, 118, PW, 1, C.wood3)
    // rug
    px(70, 128, 110, 10, '#5a3a6a')
    for (let x = 72; x < 178; x += 6) px(x, 132, 3, 2, C.pink)
    // desk
    px(54, 88, 104, 4, C.wood2)
    px(54, 92, 104, 2, C.wood3)
    px(58, 94, 4, 24, C.wood)
    px(150, 94, 4, 24, C.wood)
    px(120, 94, 30, 14, C.wood)
    px(122, 97, 26, 1, C.wood3)
    px(122, 102, 26, 1, C.wood3)
    // CRT with scrolling code
    px(64, 62, 36, 26, C.crt)
    px(64, 86, 36, 2, C.crt2)
    px(67, 65, 30, 19, C.screen)
    this.code.forEach((ln, i) => px(69 + (i % 3) * 2, 66 + i * 2, ln.length * 2, 1, i === this.code.length - 1 ? C.cream : C.green))
    if (Math.sin(t * 6) > 0) px(69, 82, 2, 1, C.green)
    px(76, 88, 12, 1, C.crt2)
    px(92, 84, 3, 1, '#7cf0a0')
    // keyboard
    px(70, 86, 26, 2, '#cfc6ae')
    // desk lamp with its warm cone
    b.fillStyle = 'rgba(255,210,122,0.12)'
    b.beginPath()
    b.moveTo(136, 66)
    b.lineTo(116, 88)
    b.lineTo(158, 88)
    b.fill()
    px(146, 86, 8, 2, C.ink)
    px(149, 72, 2, 14, C.ink)
    px(138, 64, 12, 4, C.warm)
    px(140, 62, 8, 2, C.warm)
    px(141, 68, 6, 1, C.lamp)
    // mug with steam
    px(106, 81, 7, 7, C.cream)
    px(113, 83, 2, 3, C.cream)
    px(107, 82, 5, 1, '#8a5a3c')
    for (const s of this.steam) {
      const y = Math.round(80 - s * 10)
      const x = 108 + Math.round(Math.sin(s * 8 + t) * 1.5)
      if (s < 0.85) px(x, y, 1, 2, 'rgba(244,234,216,0.5)')
    }
    // books and a small cactus
    px(118, 80, 3, 8, C.label)
    px(121, 78, 3, 10, '#6ab0ff')
    px(124, 81, 3, 7, C.lamp)
    px(57, 83, 5, 5, C.pot)
    px(58, 77, 3, 6, C.leaf)
    px(56, 79, 2, 2, C.leaf)
    // shelf with records and plants on the right
    px(176, 46, 66, 3, C.wood2)
    px(176, 70, 66, 3, C.wood2)
    const spines = [C.label, '#6ab0ff', C.lamp, C.green, C.pink, '#a68cff', C.warm, C.cream]
    for (let i = 0; i < 14; i++) px(178 + i * 3, 56, 2, 14, spines[i % spines.length])
    for (let i = 0; i < 4; i++) px(222 + i * 4, 36, 3, 10, spines[(i + 3) % spines.length])
    // potted plants with trailing vines that sway
    for (const [x, y] of [
      [184, 38],
      [206, 62],
    ]) {
      px(x, y, 8, 8, C.pot)
      px(x + 1, y + 1, 6, 1, '#e08a5a')
      for (let k = 0; k < 4; k++) {
        const sway = Math.round(Math.sin(t * 0.8 + k + x) * 1)
        for (let j = 0; j < 6 + k * 2; j++) px(x + k * 3 - 1 + (j % 2 ? 2 : 0) + sway * (j > 4 ? 1 : 0), y + 8 + j * 3, 2, 2, j % 2 ? C.leaf : C.leaf2)
      }
      px(x - 2, y - 4, 4, 4, C.leaf2)
      px(x + 4, y - 6, 4, 6, C.leaf)
      px(x + 8, y - 3, 3, 3, C.leaf2)
    }
    // hanging plant from the ceiling
    px(40, 6, 1, 22, C.cream)
    px(35, 28, 11, 6, C.pot)
    for (let k = 0; k < 5; k++) {
      const sway = Math.round(Math.sin(t * 0.7 + k) * 1)
      for (let j = 0; j < 5 + k; j++) px(33 + k * 3 + (j % 2 ? 2 : 0) + sway, 34 + j * 3, 2, 2, j % 2 ? C.leaf : C.leaf2)
    }
    // record cabinet and turntable
    px(186, 100, 50, 18, C.wood)
    px(188, 103, 22, 12, C.wood3)
    px(212, 103, 22, 12, C.wood3)
    px(190, 92, 40, 8, '#2a2038')
    const spin = this.bool('music') ? t * 3 : 0
    px(196, 93, 18, 5, C.rec)
    px(203, 94, 4, 3, C.label)
    // a glint that sweeps round the record
    const gx = Math.round(205 + Math.cos(spin) * 7)
    px(gx, 94 + (Math.sin(spin) > 0 ? 3 : 0), 2, 1, '#5a4a6a')
    px(222, 93, 2, 2, C.crt2)
    px(216, 94, 7, 1, C.crt2)
    px(226, 95, 2, 2, this.bool('music') ? C.green : C.label)
    // speaker
    px(238, 86, 12, 32, '#2a2038')
    px(241, 92, 6, 6, C.ink)
    px(241, 104, 6, 6, C.ink)
    if (this.bool('music') && Math.sin(t * 8) > 0.3) px(242, 105, 4, 4, '#3a2e4a')
    // music notes drifting up
    for (const n of this.notes) {
      const a = Math.max(0, Math.min(1, n.life))
      b.globalAlpha = a
      px(n.x, n.y, 1, 4, C.cream)
      px(n.x - 2, n.y + 3, 3, 2, C.cream)
      if (n.k) px(n.x, n.y, 3, 1, C.cream)
      b.globalAlpha = 1
    }
    // dog asleep in its basket, breathing
    px(18, 122, 40, 12, C.wood2)
    px(18, 122, 40, 2, C.wood)
    for (let x = 20; x < 56; x += 4) px(x, 126, 2, 6, C.wood)
    const breathe = Math.sin(t * 1.6) > 0 ? 1 : 0
    px(24, 114 - breathe, 26, 9 + breathe, C.dog)
    px(26, 113 - breathe, 20, 2, C.dog)
    px(44, 116, 9, 7, C.dog)
    px(50, 114, 4, 5, C.dog2)
    px(46, 119, 2, 1, C.ink)
    px(53, 120, 2, 2, C.ink)
    px(24, 120, 6, 3, C.dog2)
    px(30, 116 - breathe, 8, 2, C.dog2)
    for (const z of this.zz) {
      b.globalAlpha = Math.max(0, z.life)
      px(z.x, z.y, 3, 1, C.cream)
      px(z.x + 2, z.y + 1, 1, 1, C.cream)
      px(z.x + 1, z.y + 2, 1, 1, C.cream)
      px(z.x, z.y + 3, 3, 1, C.cream)
      b.globalAlpha = 1
    }
    // warm vignette from the lamp
    const g = b.createRadialGradient(136, 80, 4, 136, 80, 140)
    g.addColorStop(0, 'rgba(255,180,100,0.12)')
    g.addColorStop(1, 'rgba(10,6,20,0.35)')
    b.fillStyle = g
    b.fillRect(0, 0, PW, PH)
  }
}
