import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { MONO, font, rr } from '../kit'

const FILES: { name: string; msg: string; code: string }[] = [
  {
    name: 'rugCheck.ts',
    msg: 'feat: rug check v2',
    code: `// fictional scores, not financial advice
export function rugCheck(token: Token): Verdict {
  const flags = scan(token)
  if (flags.mintAuthority) return 'SCAM'
  if (flags.topHolders > 0.6) return 'Cursed'
  if (flags.lpLocked === false) return 'Sus'
  // jarvis: added a vibe check
  return vibes(token) > 0.5 ? 'Pure' : 'Mid'
}

function vibes(t: Token) {
  return t.memes.length / (t.promises.length + 1)
}`,
  },
  {
    name: 'jarvis.ts',
    msg: 'jarvis: night shift',
    code: `const jarvis = createAssistant({ name: 'Jarvis' })

jarvis.on('idle', async () => {
  await jarvis.runTests()
  await jarvis.updateDocs()
  if (isFriday()) return jarvis.say('no.')
  await jarvis.deploy({ dryRun: true })
})

export default jarvis`,
  },
  {
    name: 'afk.ts',
    msg: 'gm',
    code: `export const afk = {
  scenes: 64,
  account: false,
  ads: false,
  server: false,
}

while (gary.isAsleep()) {
  screen.play(next(afk.scenes))
  await sleep(minutes(3))
}`,
  },
]
const KW = /^(export|function|const|return|if|await|async|while|default|import|from|false|true|new)$/
const COL = { kw: '#ff7ab6', str: '#ffc83d', com: '#6b7a99', num: '#ff9a3d', fn: '#22e1ff', id: '#c4cee0', punc: '#8b95ad', ghost: '#3a4760' }

type Tok = { s: string; col: string }
function tokenize(line: string): Tok[] {
  const out: Tok[] = []
  const ci = line.indexOf('//')
  const body = ci >= 0 ? line.slice(0, ci) : line
  const re = /('[^']*'|\d+(\.\d+)?|[A-Za-z_]\w*|\s+|.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const s = m[0]
    let col = COL.punc
    if (s[0] === "'") col = COL.str
    else if (/^\d/.test(s)) col = COL.num
    else if (KW.test(s)) col = COL.kw
    else if (/^[A-Za-z_]/.test(s)) col = body[m.index + s.length] === '(' ? COL.fn : COL.id
    out.push({ s, col })
  }
  if (ci >= 0) out.push({ s: line.slice(ci), col: COL.com })
  return out
}

export function create(ctx: SceneContext) {
  return new Commit3am(ctx)
}

/** 3:07 AM. Code writes itself in an editor, Jarvis suggests whole lines, then it all gets committed. */
class Commit3am extends PixelScene {
  file = 0
  lines: string[] = []
  pos = 0
  typeT = 0
  ghostLine = -1
  done = 0
  minutes = 7
  constructor(ctx: SceneContext) {
    super(ctx)
    this.load(0)
  }
  palette() {
    return PX.degen
  }
  dither() {
    return 0.3
  }
  load(i: number) {
    this.file = i % FILES.length
    this.lines = FILES[this.file].code.split('\n')
    this.pos = 0
    this.done = 0
    this.ghostLine = -1
  }
  get text() {
    return FILES[this.file].code
  }
  step(dt: number) {
    const sp = this.num('speed')
    if (this.done > 0) {
      this.done += dt
      if (this.done > 4) {
        this.minutes = (this.minutes + 3) % 60
        this.load(this.file + 1)
      }
      return
    }
    this.typeT += dt * sp
    const full = this.text
    // Jarvis ghost text: at the start of some lines, show the whole line then accept it
    const lineStart = this.pos === 0 || full[this.pos - 1] === '\n'
    const lineIdx = full.slice(0, this.pos).split('\n').length - 1
    if (lineStart && this.ghostLine < 0 && this.lines[lineIdx]?.trim().length > 12 && this.r.chance(this.num('jarvis') * 0.35)) {
      this.ghostLine = lineIdx
      this.typeT = -0.9
    }
    if (this.ghostLine >= 0) {
      if (this.typeT > 0) {
        // tab: accept the suggestion
        const end = full.indexOf('\n', this.pos)
        this.pos = end < 0 ? full.length : end + 1
        this.ghostLine = -1
        this.typeT = 0
      }
      return
    }
    const rate = 0.045 + (full[this.pos] === '\n' ? 0.25 : 0)
    while (this.typeT > rate && this.pos < full.length) {
      this.typeT -= rate
      this.pos++
      if (full[this.pos - 1] === '\n') break
    }
    if (this.pos >= full.length) {
      this.done = 0.001
      this.emit({ type: 'blip' })
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#0d1117'
    c.fillRect(0, 0, w, h)
    const fs = Math.max(8, Math.min(9 * u, w / 46))
    const lh = fs * 1.55
    const tabH = fs * 2.4
    const statusH = fs * 2
    // tabs
    c.fillStyle = '#080b10'
    c.fillRect(0, 0, w, tabH)
    font(c, fs, MONO, 400)
    c.textBaseline = 'middle'
    let tx = fs
    FILES.forEach((f, i) => {
      const tw = c.measureText(f.name).width + fs * 2.4
      if (i === this.file) {
        c.fillStyle = '#0d1117'
        c.fillRect(tx, 0, tw, tabH)
        c.fillStyle = '#3ef07f'
        c.fillRect(tx, 0, tw, Math.max(1, 0.6 * u))
      }
      c.fillStyle = i === this.file ? '#c4cee0' : '#6b7a99'
      c.fillText(f.name + (i === this.file && !this.done ? ' ●' : ''), tx + fs * 1.1, tabH / 2)
      tx += tw
    })
    // code
    const full = this.text
    const typed = full.slice(0, this.pos)
    const tl = typed.split('\n')
    const gutter = fs * 3.4
    const avail = Math.floor((h - tabH - statusH - fs) / lh)
    const curLine = tl.length - 1
    const first = Math.max(0, curLine - avail + 2)
    const x0 = gutter + fs
    for (let li = first; li < this.lines.length && li - first < avail; li++) {
      const y = tabH + fs * 0.8 + (li - first) * lh + lh / 2
      c.fillStyle = li === curLine ? '#c4cee0' : '#3a4760'
      c.textAlign = 'right'
      c.fillText(String(li + 1), gutter, y)
      c.textAlign = 'left'
      if (li === curLine && !this.done) {
        c.fillStyle = 'rgba(196,206,224,0.04)'
        c.fillRect(gutter + fs * 0.4, y - lh / 2, w, lh)
      }
      let s: string
      if (li < curLine) s = this.lines[li]
      else if (li === curLine) s = tl[curLine]
      else s = ''
      let x = x0
      for (const t of tokenize(s)) {
        c.fillStyle = t.col
        c.fillText(t.s, x, y)
        x += c.measureText(t.s).width
      }
      if (li === this.ghostLine) {
        c.fillStyle = COL.ghost
        c.fillText(this.lines[li].slice(s.length), x, y)
        const hint = '  Tab ↹ jarvis'
        c.fillStyle = '#a77bff'
        c.fillText(hint, x + c.measureText(this.lines[li].slice(s.length)).width, y)
      }
      if (li === curLine && !this.done && Math.sin(this.t * 7) > -0.2) {
        c.fillStyle = '#3ef07f'
        c.fillRect(x, y - fs * 0.6, Math.max(1, 0.5 * u), fs * 1.2)
      }
    }
    // status bar
    const sy = h - statusH
    c.fillStyle = this.done ? '#0e3b22' : '#161b26'
    c.fillRect(0, sy, w, statusH)
    c.fillStyle = this.done ? '#3ef07f' : '#c4cee0'
    const left = this.done ? `✓ committed "${FILES[this.file].msg}"` : '⎇ main*   jarvis: on'
    c.fillText(left, fs, sy + statusH / 2)
    c.textAlign = 'right'
    c.fillStyle = '#6b7a99'
    c.fillText(`Ln ${curLine + 1}   UTF-8   3:${String(this.minutes).padStart(2, '0')} AM`, w - fs, sy + statusH / 2)
    c.textAlign = 'left'
    // little toast when committed
    if (this.done) {
      const a = Math.min(1, this.done * 3)
      const tw = Math.min(w * 0.6, fs * 22)
      const th = fs * 3
      c.globalAlpha = a
      c.fillStyle = '#161b26'
      rr(c, w - tw - fs, sy - th - fs, tw, th, fs * 0.5)
      c.fill()
      c.strokeStyle = '#3ef07f'
      c.lineWidth = 1
      c.stroke()
      c.fillStyle = '#c4cee0'
      c.fillText('pushed to origin. go to sleep.', w - tw, sy - th / 2 - fs)
      c.globalAlpha = 1
    }
    c.textBaseline = 'alphabetic'
  }
}
