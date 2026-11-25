import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, VT, font } from '../kit'

export function create(ctx: SceneContext) {
  return new UnderConstruction(ctx)
}

/** A personal homepage from the early web: starfield tiles, a marquee, a hit counter and the eternal "under construction". */
class UnderConstruction extends PixelScene {
  stars: { x: number; y: number; p: number }[] = []
  hits = 13370
  hitT = 0
  constructor(ctx: SceneContext) {
    super(ctx)
    this.stars = Array.from({ length: 140 }, () => ({ x: this.r(), y: this.r(), p: this.r() * TAU }))
    this.hits = this.r.int(1000, 90000)
  }
  palette() {
    return PX.web
  }
  dither() {
    return 0.15
  }
  step(dt: number) {
    this.hitT += dt
    if (this.hitT > 2.5) {
      this.hitT = 0
      this.hits += this.r.int(1, 3)
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#000000'
    c.fillRect(0, 0, w, h)
    for (const s of this.stars) {
      const tw = Math.sin(this.t * 3 + s.p) > 0.7
      c.fillStyle = tw ? '#ffffff' : '#808080'
      const sz = tw ? 1.2 * u : 0.6 * u
      c.fillRect(s.x * w, s.y * h, Math.max(1, sz), Math.max(1, sz))
    }
    const fs = Math.max(9, Math.min(6.6 * u, w / 38))
    const cx = w / 2
    let y = fs * 1.4
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    // marquee
    font(c, fs, MONO, 700)
    const mq = '*** WELCOME TO MY HOMEPAGE *** gm to all visitors *** sign the guestbook *** best viewed with Netscape 4 *** '
    const mw = c.measureText(mq).width
    const off = (this.t * 50 * u) % mw
    c.fillStyle = '#ffff00'
    c.textAlign = 'left'
    c.fillText(mq + mq + mq, -off, y)
    c.textAlign = 'center'
    y += fs * 2.2
    // rainbow wordart title
    font(c, fs * 2.6, VT, 400)
    const title = 'Gary’s Corner of the Web'
    const tW = c.measureText(title).width
    const scale = Math.min(1, (w * 0.92) / tW)
    c.save()
    c.translate(cx, y)
    c.scale(scale, scale)
    let x = -tW / 2
    c.textAlign = 'left'
    for (let i = 0; i < title.length; i++) {
      const ch = title[i]
      c.fillStyle = `hsl(${(i * 22 + this.t * 120) % 360},100%,60%)`
      c.fillText(ch, x, Math.sin(this.t * 4 + i * 0.5) * fs * 0.25)
      x += c.measureText(ch).width
    }
    c.restore()
    c.textAlign = 'center'
    y += fs * 2.4
    // rainbow divider
    const dw = Math.min(w * 0.8, fs * 40)
    for (let i = 0; i < 30; i++) {
      c.fillStyle = `hsl(${i * 12},100%,50%)`
      c.fillRect(cx - dw / 2 + (i * dw) / 30, y, dw / 30 + 1, Math.max(2, fs * 0.25))
    }
    y += fs * 2
    // under construction sign with hazard stripes
    const sw = Math.min(w * 0.8, fs * 30)
    const sh = fs * 5
    const sx = cx - sw / 2
    c.save()
    c.beginPath()
    c.rect(sx, y, sw, sh)
    c.clip()
    c.fillStyle = '#ffff00'
    c.fillRect(sx, y, sw, sh)
    c.fillStyle = '#000000'
    const stripe = fs * 1.4
    const shift = (this.t * 20 * u) % (stripe * 2)
    for (let k = -sh; k < sw + sh; k += stripe * 2) {
      c.beginPath()
      c.moveTo(sx + k + shift, y)
      c.lineTo(sx + k + stripe + shift, y)
      c.lineTo(sx + k + stripe - sh + shift, y + sh)
      c.lineTo(sx + k - sh + shift, y + sh)
      c.fill()
    }
    c.fillStyle = '#ffff00'
    c.fillRect(sx + fs * 0.7, y + fs * 0.9, sw - fs * 1.4, sh - fs * 1.8)
    c.restore()
    font(c, fs * 1.4, MONO, 800)
    c.fillStyle = Math.sin(this.t * 5) > -0.3 ? '#000000' : '#ff0000'
    c.fillText('UNDER CONSTRUCTION', cx, y + sh / 2)
    // traffic cones each side of the sign
    for (const side of [-1, 1]) this.cone(cx + side * (sw / 2 + fs * 1.6), y + sh, fs)
    y += sh + fs * 2.2
    // NEW! badge spinning
    font(c, fs, MONO, 700)
    c.save()
    c.translate(cx + sw * 0.42, y - sh - fs * 2.6)
    c.rotate(Math.sin(this.t * 3) * 0.3)
    c.fillStyle = '#ff0000'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      c.beginPath()
      c.moveTo(0, 0)
      c.arc(0, 0, fs * 1.6, a, a + 0.35)
      c.fill()
    }
    c.beginPath()
    c.arc(0, 0, fs * 1.3, 0, TAU)
    c.fill()
    c.fillStyle = '#ffff00'
    c.fillText('NEW!', 0, 0)
    c.restore()
    // links
    const links = ['> my favorite websites', '> pictures of my cat', '> sign my guestbook', '> email me']
    const portrait = h > w
    links.forEach((l, i) => {
      const lx = portrait ? cx : cx + (i % 2 ? 1 : -1) * Math.min(w * 0.22, fs * 11)
      const ly = portrait ? y + i * fs * 1.7 : y + Math.floor(i / 2) * fs * 1.7
      c.fillStyle = i === Math.floor(this.t / 2) % 4 ? '#ff00ff' : '#5a8cff'
      c.fillText(l, lx, ly)
      const lw = c.measureText(l).width
      c.fillRect(lx - lw / 2, ly + fs * 0.65, lw, Math.max(1, fs * 0.08))
    })
    y += (portrait ? 4 : 2) * fs * 1.7 + fs
    // hit counter odometer
    const digits = String(this.hits).padStart(7, '0')
    font(c, fs * 1.2, MONO, 700)
    const dW = fs * 1.2
    const totalW = dW * digits.length
    c.fillStyle = '#c0c0c0'
    c.fillText('You are visitor number', cx, y)
    y += fs * 1.8
    for (let i = 0; i < digits.length; i++) {
      const dx = cx - totalW / 2 + i * dW
      c.fillStyle = '#000000'
      c.fillRect(dx, y - fs * 0.8, dW - 2, fs * 1.6)
      c.strokeStyle = '#808080'
      c.strokeRect(dx, y - fs * 0.8, dW - 2, fs * 1.6)
      c.fillStyle = '#00ff00'
      c.fillText(digits[i], dx + dW / 2 - 1, y)
    }
    y += fs * 2.2
    // webring
    font(c, fs * 0.9, MONO, 400)
    c.fillStyle = '#c0c0c0'
    if (y < h - fs) c.fillText('<< prev  |  The Weird Web Ring  |  next >>', cx, Math.min(y, h - fs))
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
  cone(x: number, base: number, fs: number) {
    const c = this.c
    c.fillStyle = '#ff8000'
    c.beginPath()
    c.moveTo(x - fs * 1.1, base)
    c.lineTo(x, base - fs * 3.6)
    c.lineTo(x + fs * 1.1, base)
    c.fill()
    c.fillStyle = '#ffffff'
    c.fillRect(x - fs * 0.62, base - fs * 1.8, fs * 1.24, fs * 0.45)
    c.fillStyle = '#ff8000'
    c.fillRect(x - fs * 1.5, base - fs * 0.25, fs * 3, fs * 0.25)
  }
}
