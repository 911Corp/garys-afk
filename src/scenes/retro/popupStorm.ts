import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { MONO, font } from '../kit'
import { TAU } from '../../engine/math'

const POPUPS = [
  { title: 'CONGRATULATIONS!!!', lines: ['You are the 1,000,000th visitor!', 'Click OK to claim nothing.'], icon: 'info', btn: 'OK' },
  { title: 'FREE AIRDROP', lines: ['Claim 10,000 $NGMI now!!', '(it’s a scam. never click.)'], icon: 'coin', btn: 'No thanks' },
  { title: 'Security Alert', lines: ['Never share your seed phrase.', 'Not even with Gary.'], icon: 'warning', btn: 'Got it' },
  { title: 'Your PC is SLOW', lines: ['Have you tried turning it', 'off and on again?'], icon: 'question', btn: 'OK' },
  { title: 'Hot new memecoin', lines: ['$RUGZILLA is going to 1000x!', 'Source: trust me bro'], icon: 'coin', btn: 'Close' },
  { title: 'wen moon?', lines: ['Soon™.'], icon: 'question', btn: 'OK' },
  { title: 'Jarvis', lines: ['Blocked 1 pop-up.', 'Blocked 2 pop-ups. Blocked 3...'], icon: 'jarvis', btn: 'Thanks' },
  { title: 'Update available', lines: ['Installing update 1 of 248.', 'Do not turn off your computer.'], icon: 'info', btn: 'Later' },
  { title: 'Connection lost', lines: ['Someone picked up the phone.'], icon: 'error', btn: 'Retry' },
  { title: 'It’s so over', lines: ['We’re so back.', 'It’s so over.', 'We’re so back.'], icon: 'error', btn: 'OK' },
]

type Pop = { i: number; x: number; y: number; age: number; closing: number }

export function create(ctx: SceneContext) {
  return new PopupStorm(ctx)
}

/** Pop-ups pile up on an old desktop (airdrops, alerts, "you won!") until Jarvis closes them all at once. */
class PopupStorm extends PixelScene {
  pops: Pop[] = []
  timer = 0
  sweep = -1
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PX.web
  }
  dither() {
    return 0.2
  }
  step(dt: number) {
    const sp = this.num('speed')
    for (const p of this.pops) {
      p.age += dt
      if (p.closing > 0) p.closing += dt * 5
    }
    this.pops = this.pops.filter((p) => p.closing < 1)
    if (this.sweep >= 0) {
      this.sweep += dt * sp
      // Jarvis closes them one by one, newest first, fast
      const open = this.pops.filter((p) => p.closing === 0)
      if (open.length && this.r.chance(dt * 18)) open[open.length - 1].closing = 0.001
      if (!open.length && this.sweep > 2.5) this.sweep = -1
      return
    }
    this.timer += dt * sp
    if (this.timer > 0.9) {
      this.timer = 0
      const last = this.pops[this.pops.length - 1]
      const cascade = last && this.r.chance(0.5)
      this.pops.push({
        i: this.r.int(0, POPUPS.length - 1),
        x: cascade ? last.x + 0.03 : this.r.range(0.05, 0.6),
        y: cascade ? last.y + 0.05 : this.r.range(0.05, 0.55),
        age: 0,
        closing: 0,
      })
      this.emit({ type: 'blip' })
      if (this.pops.length >= Math.round(10 * this.num('chaos'))) this.sweep = 0
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const fs = Math.max(9, Math.min(4.4 * u, w / 44))
    c.fillStyle = '#008080'
    c.fillRect(0, 0, w, h)
    const tb = Math.round(fs * 2.4)
    // desktop icons, 16x16 pixel art scaled to 32 "screen pixels"
    const ip = Math.max(1, Math.round(fs * 0.22))
    const icons: [string, string][] = [
      ['computer', 'My Computer'],
      ['bin', 'Recycle Bin'],
      ['folder', 'Weird Web'],
      ['text', 'wallet.txt'],
      ['app', 'gary.exe'],
    ]
    font(c, fs * 0.85, MONO, 400)
    c.textAlign = 'center'
    c.textBaseline = 'top'
    icons.forEach(([kind, label], i) => {
      const cx = fs * 3.4
      const y = fs * 1.2 + i * (16 * ip + fs * 2.6)
      if (y + 16 * ip + fs * 1.5 > h - tb) return
      this.bitmap(ICONS[kind], cx - 8 * ip, y, ip)
      c.fillStyle = '#000000'
      c.fillText(label, cx + 1, y + 16 * ip + fs * 0.35 + 1)
      c.fillStyle = '#ffffff'
      c.fillText(label, cx, y + 16 * ip + fs * 0.35)
    })
    c.textAlign = 'left'
    // pop-up windows
    for (const p of this.pops) {
      const P = POPUPS[p.i]
      // size each box to its own text, like the real ones
      font(c, fs, MONO, 400)
      const textW = Math.max(...P.lines.map((l) => c.measureText(l).width))
      font(c, fs, MONO, 700)
      const pw = Math.min(w * 0.94, Math.max(textW + fs * 5.2, c.measureText(P.title).width + fs * 4, fs * 16))
      const ph = fs * (5.6 + P.lines.length * 1.5)
      const s = Math.min(1, p.age * 8) * (1 - p.closing)
      if (s <= 0.01) continue
      const x = Math.round(p.x * (w - pw))
      const y = Math.round(Math.min(p.y * (h - ph - tb), h - tb - ph - 2))
      c.save()
      c.translate(x + pw / 2, y + ph / 2)
      c.scale(s, s)
      c.translate(-pw / 2, -ph / 2)
      this.bevel(0, 0, pw, ph, true)
      // title bar
      const g = c.createLinearGradient(3, 0, pw - 3, 0)
      g.addColorStop(0, '#000080')
      g.addColorStop(1, '#1084d0')
      c.fillStyle = g
      c.fillRect(3, 3, pw - 6, fs * 1.6)
      font(c, fs, MONO, 700)
      c.fillStyle = '#ffffff'
      c.textBaseline = 'middle'
      c.fillText(P.title, fs * 0.5, 3 + fs * 0.82)
      const bs = fs * 1.25
      this.bevel(pw - bs - 5, 3 + fs * 0.18, bs, bs * 0.9, true)
      c.fillStyle = '#000000'
      c.textAlign = 'center'
      c.fillText('×', pw - bs / 2 - 5, 3 + fs * 0.18 + bs * 0.45)
      c.textAlign = 'left'
      // message icon and text
      this.msgIcon(P.icon, fs * 2, fs * 4, fs * 1.05)
      font(c, fs, MONO, 400)
      c.fillStyle = '#000000'
      P.lines.forEach((l, i) => c.fillText(l, fs * 3.8, fs * 3.4 + i * fs * 1.5))
      // default button with the focus ring
      const bw = fs * 7
      const bh = fs * 1.7
      const bx = pw / 2 - bw / 2
      const by = ph - fs * 2.4
      c.fillStyle = '#000000'
      c.fillRect(bx - 1, by - 1, bw + 2, bh + 2)
      this.bevel(bx, by, bw, bh, true)
      c.strokeStyle = '#000000'
      c.lineWidth = 1
      c.setLineDash([1, 1])
      c.strokeRect(bx + 4.5, by + 4.5, bw - 9, bh - 9)
      c.setLineDash([])
      c.fillStyle = '#000000'
      c.textAlign = 'center'
      c.fillText(P.btn, pw / 2, by + bh / 2)
      c.textAlign = 'left'
      c.restore()
    }
    // taskbar
    c.fillStyle = '#c0c0c0'
    c.fillRect(0, h - tb, w, tb)
    c.fillStyle = '#ffffff'
    c.fillRect(0, h - tb + 1, w, 1)
    const sbw = fs * 5.6
    this.bevel(3, h - tb + 4, sbw, tb - 7, true)
    this.bitmap(ICONS.computer, 3 + fs * 0.4, h - tb + (tb - 16 * Math.max(1, Math.round(fs * 0.09))) / 2, Math.max(1, Math.round(fs * 0.09)))
    font(c, fs, MONO, 700)
    c.fillStyle = '#000000'
    c.textBaseline = 'middle'
    c.fillText('Start', 3 + fs * 2.3, h - tb / 2 + 1)
    // one button per open window, as many as fit
    const trayW = fs * 7
    const open = this.pops.filter((p) => p.closing === 0)
    const room = w - sbw - trayW - fs * 2
    const bw = Math.min(fs * 11, room / Math.max(1, open.length))
    font(c, fs * 0.85, MONO, 400)
    if (bw > fs * 3)
      open.forEach((p, i) => {
        const bx = sbw + fs + i * bw
        const active = i === open.length - 1
        this.bevel(bx, h - tb + 4, bw - 3, tb - 7, !active)
        c.fillStyle = '#000000'
        let t = POPUPS[p.i].title
        while (t.length > 2 && c.measureText(t).width > bw - fs * 1.2) t = t.slice(0, -1)
        c.fillText(t, bx + fs * 0.5, h - tb / 2 + 1)
      })
    // tray with a clock
    const tx = w - trayW - 3
    this.bevel(tx, h - tb + 4, trayW, tb - 7, false)
    const now = new Date()
    c.fillStyle = '#000000'
    c.textAlign = 'right'
    c.fillText(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`, w - fs * 0.7, h - tb / 2 + 1)
    c.textAlign = 'left'
    // Jarvis balloon from the tray while he cleans up
    if (this.sweep >= 0) {
      const bw2 = Math.min(w * 0.7, fs * 23)
      const bh2 = fs * 3.2
      const bx2 = w - bw2 - fs
      const by2 = h - tb - bh2 - fs * 1.2
      c.fillStyle = '#ffffe1'
      c.strokeStyle = '#000000'
      c.lineWidth = 1
      c.beginPath()
      c.rect(bx2, by2, bw2, bh2)
      c.moveTo(w - fs * 4, by2 + bh2)
      c.lineTo(w - fs * 3, by2 + bh2 + fs)
      c.lineTo(w - fs * 2.6, by2 + bh2)
      c.fill()
      c.stroke()
      this.msgIcon('jarvis', bx2 + fs * 1.4, by2 + bh2 / 2, fs * 0.7)
      font(c, fs, MONO, 700)
      c.fillStyle = '#000000'
      c.fillText('Jarvis', bx2 + fs * 2.6, by2 + fs * 1)
      font(c, fs * 0.9, MONO, 400)
      c.fillText('Closing all pop-ups for you.', bx2 + fs * 2.6, by2 + fs * 2.2)
    }
    c.textBaseline = 'alphabetic'
  }
  /** Classic 3D bevel: raised (buttons, windows) or sunken (pressed, tray). */
  bevel(x: number, y: number, w: number, h: number, raised: boolean) {
    const c = this.c
    c.fillStyle = '#c0c0c0'
    c.fillRect(x, y, w, h)
    const lt = raised ? '#ffffff' : '#808080'
    const dk = raised ? '#808080' : '#ffffff'
    c.fillStyle = raised ? '#dfdfdf' : '#000000'
    c.fillRect(x, y, w, 1)
    c.fillRect(x, y, 1, h)
    c.fillStyle = lt
    c.fillRect(x + 1, y + 1, w - 2, 1)
    c.fillRect(x + 1, y + 1, 1, h - 2)
    c.fillStyle = raised ? '#000000' : '#dfdfdf'
    c.fillRect(x, y + h - 1, w, 1)
    c.fillRect(x + w - 1, y, 1, h)
    c.fillStyle = dk
    c.fillRect(x + 1, y + h - 2, w - 2, 1)
    c.fillRect(x + w - 2, y + 1, 1, h - 2)
  }
  bitmap(rows: string[], x: number, y: number, p: number) {
    const c = this.c
    for (let r = 0; r < rows.length; r++)
      for (let k = 0; k < rows[r].length; k++) {
        const col = PIX[rows[r][k]]
        if (!col) continue
        c.fillStyle = col
        c.fillRect(Math.round(x + k * p), Math.round(y + r * p), p, p)
      }
  }
  /** The message-box icons of the era: error, warning, information, question, plus two of ours. */
  msgIcon(kind: string, x: number, y: number, r: number) {
    const c = this.c
    c.lineJoin = 'round'
    if (kind === 'error') {
      c.fillStyle = '#ff0000'
      c.strokeStyle = '#800000'
      c.lineWidth = Math.max(1, r * 0.1)
      c.beginPath()
      c.arc(x, y, r, 0, TAU)
      c.fill()
      c.stroke()
      c.strokeStyle = '#ffffff'
      c.lineWidth = r * 0.28
      c.beginPath()
      c.moveTo(x - r * 0.42, y - r * 0.42)
      c.lineTo(x + r * 0.42, y + r * 0.42)
      c.moveTo(x + r * 0.42, y - r * 0.42)
      c.lineTo(x - r * 0.42, y + r * 0.42)
      c.stroke()
    } else if (kind === 'warning') {
      c.fillStyle = '#ffff00'
      c.strokeStyle = '#000000'
      c.lineWidth = Math.max(1, r * 0.1)
      c.beginPath()
      c.moveTo(x, y - r * 1.05)
      c.lineTo(x + r * 1.1, y + r * 0.9)
      c.lineTo(x - r * 1.1, y + r * 0.9)
      c.closePath()
      c.fill()
      c.stroke()
      c.fillStyle = '#000000'
      c.fillRect(x - r * 0.11, y - r * 0.5, r * 0.22, r * 0.85)
      c.fillRect(x - r * 0.11, y + r * 0.48, r * 0.22, r * 0.22)
    } else if (kind === 'info' || kind === 'question') {
      // white speech balloon with a tail
      c.fillStyle = '#ffffff'
      c.strokeStyle = '#000000'
      c.lineWidth = Math.max(1, r * 0.08)
      c.beginPath()
      c.ellipse(x, y - r * 0.1, r, r * 0.85, 0, 0, TAU)
      c.moveTo(x - r * 0.35, y + r * 0.6)
      c.lineTo(x - r * 0.6, y + r * 1.1)
      c.lineTo(x + r * 0.05, y + r * 0.72)
      c.fill()
      c.stroke()
      c.fillStyle = '#ffffff'
      c.beginPath()
      c.ellipse(x, y - r * 0.1, r * 0.92, r * 0.77, 0, 0, TAU)
      c.fill()
      c.fillStyle = '#0000ff'
      if (kind === 'info') {
        c.fillRect(x - r * 0.12, y - r * 0.2, r * 0.24, r * 0.65)
        c.fillRect(x - r * 0.12, y - r * 0.55, r * 0.24, r * 0.2)
      } else {
        font(c, r * 1.4, MONO, 800)
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText('?', x, y - r * 0.05)
        c.textAlign = 'left'
      }
    } else if (kind === 'coin') {
      c.fillStyle = '#c0a000'
      c.beginPath()
      c.arc(x + r * 0.08, y + r * 0.08, r, 0, TAU)
      c.fill()
      c.fillStyle = '#ffd700'
      c.beginPath()
      c.arc(x, y, r, 0, TAU)
      c.fill()
      c.strokeStyle = '#806000'
      c.lineWidth = Math.max(1, r * 0.08)
      c.beginPath()
      c.arc(x, y, r * 0.75, 0, TAU)
      c.stroke()
      font(c, r * 1.2, MONO, 800)
      c.fillStyle = '#806000'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('$', x, y + r * 0.05)
      c.textAlign = 'left'
    } else {
      // Jarvis: a little glowing core
      c.fillStyle = '#000040'
      c.beginPath()
      c.arc(x, y, r, 0, TAU)
      c.fill()
      c.strokeStyle = '#00c0c0'
      c.lineWidth = Math.max(1, r * 0.12)
      c.beginPath()
      c.arc(x, y, r * 0.7, 0, TAU)
      c.stroke()
      c.fillStyle = '#80ffff'
      c.beginPath()
      c.arc(x, y, r * 0.3, 0, TAU)
      c.fill()
    }
    c.textBaseline = 'middle'
  }
}

const PIX: Record<string, string> = { k: '#000000', w: '#ffffff', g: '#c0c0c0', d: '#808080', b: '#000080', c: '#00c0c0', t: '#008080', y: '#ffff00', o: '#808000', n: '#00a000', e: '#e8e0c8', r: '#ff0000' }
const pad = (rows: string[]) => rows.map((r) => (r + '................').slice(0, 16))
const ICONS: Record<string, string[]> = {
  computer: pad([
    '..kkkkkkkkkkkk',
    '..keeeeeeeeeedk',
    '..kekkkkkkkkedk',
    '..kekbbbbbbkedk',
    '..kekbccbbbkedk',
    '..kekbcbbbbkedk',
    '..kekbbbbbbkedk',
    '..kekkkkkkkkedk',
    '..keeeeeeeeeedk',
    '..kddddddddddk',
    '...kkkkkkkkkk',
    '.....keedk',
    '..kkkkkkkkkkkkk',
    '.kewewewewewedk',
    'kdddddddddddddk',
    'kkkkkkkkkkkkkkk',
  ]),
  bin: pad([
    '...kkkkkkkkkk',
    '..kwwwwwwwwwwk',
    '..kggggggggggk',
    '..kkkkkkkkkkkk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '...kgwgdgwgdk',
    '....kgwgdgwk',
    '....kkkkkkkk',
  ]),
  folder: pad([
    '',
    '..kkkkk',
    '.kwyyyyk',
    'kwyyyyyykkkkkkk',
    'kwyyyyyyyyyyyyok',
    'kyyyyyyyyyyyyyok',
    'kyyyyyyyyyyyyyok',
    'kyyyyyyyyyyyyyok',
    'kyyyyyyyyyyyyyok',
    'kyyyyyyyyyyyyyok',
    'kyyyyyyyyyyyyyok',
    'kooooooooooooook',
    'kkkkkkkkkkkkkkkk',
  ]),
  text: pad([
    '..kkkkkkkkk',
    '..kwwwwwwwkk',
    '..kwwwwwwwkwk',
    '..kwbbbbbwkkkk',
    '..kwwwwwwwwwwk',
    '..kwbbbbbbbbwk',
    '..kwwwwwwwwwwk',
    '..kwbbbbbbbwwk',
    '..kwwwwwwwwwwk',
    '..kwbbbbbbbbwk',
    '..kwwwwwwwwwwk',
    '..kwbbbbbwwwwk',
    '..kwwwwwwwwwwk',
    '..kkkkkkkkkkkk',
  ]),
  app: pad([
    '',
    'kkkkkkkkkkkkkkkk',
    'kbbbbbbbbbbbbbbk',
    'kbwwbbbbbbbgkgbk',
    'kkkkkkkkkkkkkkkk',
    'kwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwnwwk',
    'kwwwwwwwwwwnnwwk',
    'kwwwwwnwwwnnwwwk',
    'kwwwwnnnwnnwwwwk',
    'kwwwnnwnnnwwwwwk',
    'kwwnnwwwnwwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kkkkkkkkkkkkkkkk',
  ]),
}
