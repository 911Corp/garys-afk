import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { MONO, font, glow, rr } from '../kit'

/** Fictional archive entries. Words wrapped in [[ ]] are redacted. */
const FILES = [
  { cls: 'SAFE', title: 'The page that loads forever', body: ['A single web page whose progress bar has', 'reached 99% since [[2004]]. Visitors report', 'feeling calm. Do not refresh.', 'Last confirmed host: [[REDACTED]].'] },
  { cls: 'EUCLID', title: 'The guestbook that writes back', body: ['An old personal site guestbook. New entries', 'appear signed by visitors who have not', 'arrived yet. Entry [[#4471]] mentions Gary.', 'Archivist note: Gary denies everything.'] },
  { cls: 'SAFE', title: 'The infinite hit counter', body: ['A visitor counter that increments when', 'nobody is looking. Current value exceeds', 'the number of [[humans]] online.', 'Containment: leave the tab open.'] },
  { cls: 'KETER', title: 'The wallet that cannot be empty', body: ['A token page showing a balance of exactly', '[[0.0000001]] for every visitor. Attempts to', 'withdraw redirect to a 1999 webring.', 'Not financial advice. Neither is Gary.'] },
  { cls: 'EUCLID', title: 'The forum thread from tomorrow', body: ['A support thread dated one day ahead.', 'It answers questions that have not been', 'asked. Reply count: [[REDACTED]].', 'Jarvis flagged it, then went quiet.'] },
  { cls: 'SAFE', title: 'The under construction gif', body: ['A small animated worker digging since', '[[1997]]. Each year the hole is slightly', 'deeper. Nobody has seen the bottom.', 'Status: still under construction.'] },
]

export function create(ctx: SceneContext) {
  return new AnomalyArchive(ctx)
}

/** The Anomaly Archive: classified files about strange websites type themselves out under a desk lamp. */
class AnomalyArchive extends PixelScene {
  idx = 0
  chars = 0
  hold = 0
  slide = 0
  stamp = 0
  dust = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.2 + Math.random() * 0.5, p: Math.random() * 6 }))
  constructor(ctx: SceneContext) {
    super(ctx)
    this.idx = this.r.int(0, FILES.length - 1)
  }
  palette() {
    return PX.warm16
  }
  dither() {
    return 0.45
  }
  get F() {
    return FILES[this.idx]
  }
  get total() {
    return this.F.body.join('').length + this.F.title.length
  }
  step(dt: number) {
    const sp = this.num('speed')
    for (const d of this.dust) {
      d.y -= d.v * dt * 0.02
      d.x += Math.sin(this.t * 0.4 + d.p) * dt * 0.004
      if (d.y < 0) d.y = 1
    }
    if (this.slide > 0) {
      this.slide += dt * 1.2
      if (this.slide >= 1) {
        this.slide = 0
        this.idx = (this.idx + 1) % FILES.length
        this.chars = 0
        this.stamp = 0
        this.hold = 0
      }
      return
    }
    if (this.chars < this.total) this.chars += dt * 22 * sp
    else if (this.stamp < 1) {
      this.stamp = Math.min(1, this.stamp + dt * 4)
      if (this.stamp >= 1) this.emit({ type: 'blip' })
    } else {
      this.hold += dt * sp
      if (this.hold > 5) this.slide = 0.001
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#24120a'
    c.fillRect(0, 0, w, h)
    // desk wood grain
    c.strokeStyle = '#3f1f0f'
    c.lineWidth = Math.max(1, 0.6 * u)
    for (let y = 0; y < h; y += 7 * u) {
      c.beginPath()
      c.moveTo(0, y)
      for (let x = 0; x <= w; x += 20 * u) c.lineTo(x, y + Math.sin(x / (50 * u) + y) * 2 * u)
      c.stroke()
    }
    // lamp light
    glow(c, w * 0.5, h * 0.45, Math.max(w, h) * 0.6, 'rgba(255,190,79,0.45)')
    // folder under the page
    const pw = Math.min(w * 0.78, h * 0.95, 190 * u)
    const ph = pw * 1.18 > h * 0.9 ? h * 0.9 : pw * 1.18
    const px = w / 2 - pw / 2
    const py = h / 2 - ph / 2
    c.fillStyle = '#9a6a3a'
    rr(c, px - 8 * u, py + 6 * u, pw + 10 * u, ph, 2 * u)
    c.fill()
    c.fillRect(px - 8 * u, py + 2 * u, pw * 0.35, 8 * u)
    // the page
    const off = this.slide * this.slide * (w * 0.9)
    c.save()
    c.translate(off, -off * 0.1)
    c.rotate(-0.015 - this.slide * 0.2)
    c.fillStyle = 'rgba(0,0,0,0.3)'
    c.fillRect(px + 3 * u, py + 3 * u, pw, ph)
    c.fillStyle = '#f2ead6'
    c.fillRect(px, py, pw, ph)
    const F = this.F
    const fs = Math.max(7, pw / 30)
    const m = pw * 0.08
    let y = py + m
    c.textBaseline = 'top'
    font(c, fs * 0.85, MONO, 600)
    c.fillStyle = '#5c4434'
    c.fillText('THE ANOMALY ARCHIVE', px + m, y)
    c.textAlign = 'right'
    c.fillText('FILE AA-' + String(137 + this.idx * 41).padStart(4, '0'), px + pw - m, y)
    c.textAlign = 'left'
    y += fs * 1.6
    c.fillStyle = '#8a6a52'
    c.fillRect(px + m, y, pw - m * 2, Math.max(1, 0.4 * u))
    y += fs * 1
    font(c, fs * 0.85, MONO, 500)
    c.fillStyle = '#5c4434'
    c.fillText('Object class: ' + F.cls, px + m, y)
    y += fs * 1.8
    let budget = this.chars
    font(c, fs * 1.15, MONO, 600)
    c.fillStyle = '#24120a'
    const title = F.title.slice(0, Math.max(0, Math.floor(budget)))
    c.fillText(title, px + m, y, pw - m * 2)
    budget -= F.title.length
    y += fs * 2.4
    font(c, fs, MONO, 400)
    for (const line of F.body) {
      if (budget <= 0) break
      this.typeLine(line, Math.floor(budget), px + m, y, fs)
      budget -= line.replace(/\[\[|\]\]/g, '').length
      y += fs * 1.75
    }
    // signature line
    if (this.chars >= this.total) {
      y += fs
      c.fillStyle = '#8a6a52'
      c.fillText('Archivist: Gary', px + m, y)
    }
    // stamp
    if (this.stamp > 0) {
      const s = 1 + (1 - this.stamp) * 0.8
      c.save()
      c.translate(px + pw * 0.68, py + ph * 0.8)
      c.rotate(-0.22)
      c.scale(s, s)
      c.globalAlpha = this.stamp * 0.85
      c.strokeStyle = '#b8263b'
      c.lineWidth = Math.max(1.5, fs * 0.18)
      const sw = fs * 9
      c.strokeRect(-sw / 2, -fs * 1.2, sw, fs * 2.4)
      font(c, fs * 1.3, MONO, 700)
      c.fillStyle = '#b8263b'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('CLASSIFIED', 0, 0)
      c.restore()
    }
    c.restore()
    // dust in the lamp light
    c.fillStyle = '#ffe9a3'
    for (const d of this.dust) {
      c.globalAlpha = 0.25 + 0.25 * Math.sin(this.t + d.p)
      c.fillRect(d.x * w, d.y * h, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
    }
    c.globalAlpha = 1
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
  /** Draws `line` up to `n` visible characters; [[...]] spans become black bars once typed. */
  typeLine(line: string, n: number, x: number, y: number, fs: number) {
    const c = this.c
    const parts = line.split(/(\[\[.*?\]\])/)
    let left = n
    for (const p of parts) {
      if (left <= 0) return
      const red = p.startsWith('[[')
      const s = red ? p.slice(2, -2) : p
      const k = Math.min(s.length, left)
      const shown = s.slice(0, k)
      const ww = c.measureText(shown).width
      if (red) {
        c.fillStyle = '#0c0705'
        c.fillRect(x, y - fs * 0.1, ww, fs * 1.15)
      } else {
        c.fillStyle = '#3f1f0f'
        c.fillText(shown, x, y)
      }
      x += ww
      left -= s.length
    }
  }
}
