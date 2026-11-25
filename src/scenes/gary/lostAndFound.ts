import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { MONO, VT, font, glow, rr } from '../kit'

/** Things the web lost. Each one gets a tag at the counter. All fictional. */
const ITEMS = [
  { kind: 'guestbook', name: 'A guestbook', note: 'last signed in 2003. 4,212 entries, 3 real.' },
  { kind: 'counter', name: 'A hit counter', note: 'still counting. nobody knows who.' },
  { kind: 'cone', name: 'An under construction sign', note: 'site was never finished.' },
  { kind: 'floppy', name: 'A floppy disk', note: 'label reads "homepage FINAL v2".' },
  { kind: 'midi', name: 'A background MIDI', note: 'autoplays. cannot be stopped.' },
  { kind: 'badge', name: 'A webring badge', note: 'the ring broke in 2006.' },
  { kind: 'gif', name: 'A spinning email GIF', note: 'the address bounces.' },
  { kind: 'key', name: 'A forum password', note: 'hunter2. returned unread.' },
]

export function create(ctx: SceneContext) {
  return new LostAndFound(ctx)
}

/** The web's lost and found, after hours: shelves of tagged boxes, and the night clerk tagging what came in. */
class LostAndFound extends PixelScene {
  idx = 0
  phase = 0
  typed = 0
  boxes: { x: number; y: number; w: number; h: number; tag: string; tone: string }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.idx = this.r.int(0, ITEMS.length - 1)
    this.layout()
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.4
  }
  layout() {
    const r = this.r
    this.boxes = []
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 9; k++)
        this.boxes.push({ x: k / 9 + r.range(0, 0.02), y: row, w: r.range(0.07, 0.095), h: r.range(0.55, 0.85), tag: String(r.int(100, 999)), tone: r.pick(['#9a6a3a', '#b8875a', '#7a5230', '#a87848']) })
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.phase += dt * sp
    const item = ITEMS[this.idx]
    if (this.phase > 1.2) this.typed = Math.min(item.note.length, this.typed + dt * 20 * sp)
    if (this.phase > 9) {
      this.phase = 0
      this.typed = 0
      this.idx = (this.idx + 1) % ITEMS.length
      this.emit({ type: 'blip' })
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#1a0f0a'
    c.fillRect(0, 0, w, h)
    // shelves of boxes behind the counter
    const top = h * 0.1
    const shelfH = h * 0.14
    for (let row = 0; row < 4; row++) {
      const y = top + row * shelfH
      c.fillStyle = '#3f1f0f'
      c.fillRect(0, y + shelfH - 2 * u, w, 3 * u)
      for (const b of this.boxes) {
        if (b.y !== row) continue
        const bw = b.w * w
        const bh = b.h * (shelfH - 4 * u)
        const bx = b.x * w
        const by = y + shelfH - 2 * u - bh
        c.fillStyle = b.tone
        c.fillRect(bx, by, bw, bh)
        c.fillStyle = 'rgba(0,0,0,0.25)'
        c.fillRect(bx, by, bw, bh * 0.15)
        c.fillStyle = '#f2ead6'
        c.fillRect(bx + bw * 0.25, by + bh * 0.4, bw * 0.5, bh * 0.28)
        font(c, Math.max(6, bh * 0.18), MONO, 600)
        c.fillStyle = '#3f1f0f'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText(b.tag, bx + bw / 2, by + bh * 0.54)
      }
    }
    c.textAlign = 'left'
    // sign
    const sy = h * 0.02
    font(c, Math.max(10, Math.min(9 * u, w / 24)), VT, 400)
    c.fillStyle = '#ffbe4f'
    c.textAlign = 'center'
    c.textBaseline = 'top'
    c.fillText('LOST & FOUND OF THE WEB  ·  NIGHT DESK', w / 2, sy)
    c.textAlign = 'left'
    // counter
    const cy = h * 0.72
    c.fillStyle = '#5c4434'
    c.fillRect(0, cy, w, h - cy)
    c.fillStyle = '#8a6a52'
    c.fillRect(0, cy, w, 3 * u)
    // lamp light on the counter
    glow(c, w * 0.5, cy, Math.max(w, h) * 0.45, 'rgba(255,190,79,0.35)')
    // the item being tagged, rising onto the counter
    const item = ITEMS[this.idx]
    const appear = Math.min(1, this.phase / 0.8)
    const leave = this.phase > 8.3 ? (this.phase - 8.3) / 0.7 : 0
    const s = Math.min(w, h) * 0.13
    const ix = w * 0.5 - (w > h ? w * 0.18 : 0)
    const iy = cy - s * 0.6 + (1 - appear) * s * 0.6 - leave * s * 0.3
    c.globalAlpha = appear * (1 - leave)
    this.item(item.kind, ix, iy, s)
    // the paper tag on a string
    const tw = Math.min(w * 0.6, Math.max(s * 4, w * 0.36))
    const tx = w > h ? w * 0.52 : w * 0.2
    const ty = w > h ? cy - s * 1.2 : cy + s * 0.5
    c.strokeStyle = '#f2ead6'
    c.lineWidth = Math.max(1, 0.5 * u)
    c.beginPath()
    c.moveTo(ix + s * 0.4, iy)
    c.lineTo(tx, ty + s * 0.3)
    c.stroke()
    c.fillStyle = '#f2ead6'
    rr(c, tx, ty, tw, s * 1.4, s * 0.1)
    c.fill()
    c.fillStyle = '#1a0f0a'
    c.beginPath()
    c.arc(tx + s * 0.18, ty + s * 0.3, s * 0.06, 0, TAU)
    c.fill()
    const fs = Math.max(8, s * 0.16)
    font(c, fs, MONO, 700)
    c.textBaseline = 'top'
    c.fillText(`FOUND: ${item.name}`, tx + s * 0.35, ty + s * 0.18, tw - s * 0.5)
    font(c, fs * 0.95, MONO, 400)
    const note = item.note.slice(0, Math.floor(this.typed))
    // wrap the note on the tag
    const words = note.split(' ')
    let line = ''
    let ly = ty + s * 0.5
    for (const wd of words) {
      const t = line ? line + ' ' + wd : wd
      if (c.measureText(t).width > tw - s * 0.6) {
        c.fillText(line, tx + s * 0.35, ly)
        ly += fs * 1.3
        line = wd
      } else line = t
    }
    c.fillText(line, tx + s * 0.35, ly)
    c.fillStyle = '#b8263b'
    c.fillText(`#${String(4400 + this.idx * 37).padStart(5, '0')}`, tx + tw - s * 1.1, ty + s * 1.1)
    c.globalAlpha = 1
    c.textBaseline = 'alphabetic'
  }
  item(kind: string, x: number, y: number, s: number) {
    const c = this.c
    if (kind === 'guestbook') {
      c.fillStyle = '#7a1f2a'
      c.fillRect(x - s * 0.6, y - s * 0.4, s * 1.2, s * 0.8)
      c.fillStyle = '#f2ead6'
      c.fillRect(x - s * 0.55, y - s * 0.35, s * 0.04, s * 0.7)
      font(c, s * 0.16, VT)
      c.fillStyle = '#ffbe4f'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('GUESTBOOK', x, y)
      c.textAlign = 'left'
    } else if (kind === 'counter') {
      c.fillStyle = '#000000'
      c.fillRect(x - s * 0.7, y - s * 0.2, s * 1.4, s * 0.4)
      font(c, s * 0.3, MONO, 700)
      c.fillStyle = '#00ff00'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(String(Math.floor(1337 + this.t * 3)).padStart(6, '0'), x, y)
      c.textAlign = 'left'
    } else if (kind === 'cone') {
      c.fillStyle = '#ff8000'
      c.beginPath()
      c.moveTo(x - s * 0.4, y + s * 0.4)
      c.lineTo(x, y - s * 0.5)
      c.lineTo(x + s * 0.4, y + s * 0.4)
      c.fill()
      c.fillStyle = '#ffffff'
      c.fillRect(x - s * 0.22, y - s * 0.05, s * 0.44, s * 0.12)
    } else if (kind === 'floppy') {
      c.fillStyle = '#2a2a3a'
      c.fillRect(x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.9)
      c.fillStyle = '#c0c0c0'
      c.fillRect(x - s * 0.22, y - s * 0.45, s * 0.44, s * 0.3)
      c.fillStyle = '#f2ead6'
      c.fillRect(x - s * 0.35, y + s * 0.02, s * 0.7, s * 0.38)
    } else if (kind === 'midi') {
      c.fillStyle = '#f2ead6'
      c.fillRect(x - s * 0.2, y - s * 0.5, s * 0.08, s * 0.7)
      c.fillRect(x + s * 0.25, y - s * 0.6, s * 0.08, s * 0.7)
      c.fillRect(x - s * 0.2, y - s * 0.6, s * 0.53, s * 0.12)
      c.beginPath()
      c.ellipse(x - s * 0.3, y + s * 0.2, s * 0.16, s * 0.12, -0.4, 0, TAU)
      c.ellipse(x + s * 0.15, y + s * 0.1, s * 0.16, s * 0.12, -0.4, 0, TAU)
      c.fill()
    } else if (kind === 'badge') {
      c.fillStyle = '#000080'
      c.fillRect(x - s * 0.7, y - s * 0.2, s * 1.4, s * 0.4)
      font(c, s * 0.15, MONO, 700)
      c.fillStyle = '#ffff00'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('<< WEBRING >>', x, y)
      c.textAlign = 'left'
    } else if (kind === 'gif') {
      c.save()
      c.translate(x, y)
      c.scale(Math.cos(this.t * 3), 1)
      c.fillStyle = '#f2ead6'
      c.fillRect(-s * 0.45, -s * 0.3, s * 0.9, s * 0.6)
      c.strokeStyle = '#b8263b'
      c.lineWidth = s * 0.05
      c.beginPath()
      c.moveTo(-s * 0.45, -s * 0.3)
      c.lineTo(0, s * 0.05)
      c.lineTo(s * 0.45, -s * 0.3)
      c.stroke()
      c.restore()
    } else {
      c.fillStyle = '#ffbe4f'
      c.beginPath()
      c.arc(x - s * 0.25, y, s * 0.2, 0, TAU)
      c.fill()
      c.fillRect(x - s * 0.1, y - s * 0.05, s * 0.6, s * 0.1)
      c.fillRect(x + s * 0.35, y, s * 0.06, s * 0.15)
    }
  }
}
