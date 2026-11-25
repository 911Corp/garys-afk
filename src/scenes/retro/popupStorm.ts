import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { MONO, font } from '../kit'

const POPUPS = [
  { title: 'CONGRATULATIONS!!!', lines: ['You are the 1,000,000th visitor!', 'Click OK to claim nothing.'], icon: '!', btn: 'OK' },
  { title: 'FREE AIRDROP', lines: ['Claim 10,000 $NGMI now!!', '(it’s a scam. never click.)'], icon: '$', btn: 'No thanks' },
  { title: 'Security Alert', lines: ['Never share your seed phrase.', 'Not even with Gary.'], icon: '!', btn: 'Got it' },
  { title: 'Your PC is SLOW', lines: ['Have you tried turning it', 'off and on again?'], icon: '?', btn: 'OK' },
  { title: 'Hot new memecoin', lines: ['$RUGZILLA is going to 1000x!', 'Source: trust me bro'], icon: '$', btn: 'Close' },
  { title: 'wen moon?', lines: ['Soon™.'], icon: '?', btn: 'OK' },
  { title: 'Jarvis', lines: ['Blocked 1 pop-up.', 'Blocked 2 pop-ups. Blocked 3...'], icon: 'J', btn: 'Thanks' },
  { title: 'Update available', lines: ['Installing update 1 of 248.', 'Do not turn off your computer.'], icon: 'i', btn: 'Later' },
  { title: 'Connection lost', lines: ['Someone picked up the phone.'], icon: 'x', btn: 'Retry' },
  { title: 'It’s so over', lines: ['We’re so back.', 'It’s so over.', 'We’re so back.'], icon: 'i', btn: 'OK' },
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
    // desktop with icons
    c.fillStyle = '#008080'
    c.fillRect(0, 0, w, h)
    const fs = Math.max(8, Math.min(6.5 * u, w / 48))
    font(c, fs * 0.85, MONO, 400)
    c.textAlign = 'center'
    const icons = ['My Computer', 'Recycle Bin', 'wallet.txt', 'gary.exe']
    icons.forEach((n, i) => {
      const ix = fs * 3
      const iy = fs * 2 + i * fs * 5.2
      if (iy > h - fs * 6) return
      c.fillStyle = ['#c0c0c0', '#c0c0c0', '#ffffff', '#00ff00'][i]
      c.fillRect(ix - fs * 1.2, iy, fs * 2.4, fs * 2)
      c.fillStyle = '#000080'
      c.fillRect(ix - fs * 0.9, iy + fs * 0.3, fs * 1.8, fs * 1.1)
      c.fillStyle = '#ffffff'
      c.fillText(n, ix, iy + fs * 3)
    })
    c.textAlign = 'left'
    // taskbar
    const tb = fs * 2.2
    c.fillStyle = '#c0c0c0'
    c.fillRect(0, h - tb, w, tb)
    c.fillStyle = '#ffffff'
    c.fillRect(0, h - tb, w, 2)
    font(c, fs, MONO, 700)
    c.fillStyle = '#000000'
    c.textBaseline = 'middle'
    c.fillRect(fs * 0.4, h - tb + fs * 0.35, fs * 5, tb - fs * 0.7)
    c.fillStyle = '#c0c0c0'
    c.fillRect(fs * 0.4 + 1, h - tb + fs * 0.35 + 1, fs * 5 - 2, tb - fs * 0.7 - 2)
    c.fillStyle = '#000000'
    c.fillText('Start', fs * 1.1, h - tb / 2)
    c.textAlign = 'right'
    c.fillText(`${this.pops.length} windows`, w - fs, h - tb / 2)
    c.textAlign = 'left'
    // pop-ups
    const pw = Math.min(w * 0.62, fs * 26)
    for (const p of this.pops) {
      const P = POPUPS[p.i]
      const ph = fs * (5 + P.lines.length * 1.5)
      const grow = Math.min(1, p.age * 8)
      const shrink = 1 - p.closing
      const s = grow * shrink
      const x = p.x * (w - pw)
      const y = Math.min(p.y * (h - ph - tb), h - tb - ph)
      c.save()
      c.translate(x + pw / 2, y + ph / 2)
      c.scale(s, s)
      c.translate(-pw / 2, -ph / 2)
      c.fillStyle = 'rgba(0,0,0,0.35)'
      c.fillRect(4, 4, pw, ph)
      c.fillStyle = '#c0c0c0'
      c.fillRect(0, 0, pw, ph)
      c.fillStyle = '#ffffff'
      c.fillRect(0, 0, pw, 2)
      c.fillRect(0, 0, 2, ph)
      c.fillStyle = '#808080'
      c.fillRect(0, ph - 2, pw, 2)
      c.fillRect(pw - 2, 0, 2, ph)
      const g = c.createLinearGradient(0, 0, pw, 0)
      g.addColorStop(0, P.icon === '$' ? '#800080' : '#000080')
      g.addColorStop(1, P.icon === '$' ? '#ff00ff' : '#1084d0')
      c.fillStyle = g
      c.fillRect(3, 3, pw - 6, fs * 1.6)
      font(c, fs, MONO, 700)
      c.fillStyle = '#ffffff'
      c.fillText(P.title, fs * 0.5, 3 + fs * 0.8)
      c.fillStyle = '#c0c0c0'
      c.fillRect(pw - fs * 1.7, 5, fs * 1.3, fs * 1.2)
      c.fillStyle = '#000000'
      c.fillText('×', pw - fs * 1.4, 5 + fs * 0.6)
      // icon
      const ix = fs * 1.6
      const iy = fs * 3.6
      c.fillStyle = P.icon === 'x' ? '#ff0000' : P.icon === '!' ? '#ffff00' : P.icon === '$' ? '#00ff00' : P.icon === 'J' ? '#800080' : '#0000ff'
      c.beginPath()
      c.arc(ix, iy, fs * 0.9, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = P.icon === '!' || P.icon === '$' ? '#000000' : '#ffffff'
      c.textAlign = 'center'
      c.fillText(P.icon, ix, iy)
      c.textAlign = 'left'
      font(c, fs, MONO, 400)
      c.fillStyle = '#000000'
      P.lines.forEach((l, i) => c.fillText(l, fs * 3.2, fs * 3.1 + i * fs * 1.5))
      // button
      const bw = fs * 6.5
      const bx = pw / 2 - bw / 2
      const by = ph - fs * 2.2
      c.fillStyle = '#000000'
      c.fillRect(bx - 1, by - 1, bw + 2, fs * 1.6 + 2)
      c.fillStyle = '#c0c0c0'
      c.fillRect(bx, by, bw, fs * 1.6)
      c.fillStyle = '#ffffff'
      c.fillRect(bx, by, bw, 1)
      c.fillStyle = '#000000'
      c.textAlign = 'center'
      c.fillText(P.btn, pw / 2, by + fs * 0.8)
      c.textAlign = 'left'
      c.restore()
    }
    // Jarvis toast while sweeping
    if (this.sweep >= 0) {
      const tw = Math.min(w * 0.6, fs * 22)
      const tx = w - tw - fs
      const ty = h - tb - fs * 3.5
      c.fillStyle = '#ffffe1'
      c.fillRect(tx, ty, tw, fs * 2.6)
      c.strokeStyle = '#000000'
      c.strokeRect(tx, ty, tw, fs * 2.6)
      font(c, fs, MONO, 700)
      c.fillStyle = '#800080'
      c.fillText('Jarvis: closing all pop-ups', tx + fs * 0.6, ty + fs * 1.3)
    }
    c.textBaseline = 'alphabetic'
  }
}
