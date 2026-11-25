import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'
import { MONO, fit, font } from '../kit'

const NICKS = ['gary', 'jarvis', 'ser_wagmi', 'anon_42', 'pixel_kid', 'dialup_dan', 'moonboi99', 'xX_jeet_Xx', 'grandma_btc', 'n00b_deluxe']
const NICK_COL: Record<string, string> = { gary: '#008000', jarvis: '#800080', ser_wagmi: '#000080', anon_42: '#808000', pixel_kid: '#008080', dialup_dan: '#ff8000', moonboi99: '#ff00ff', xX_jeet_Xx: '#ff0000', grandma_btc: '#5a8cff', n00b_deluxe: '#808080' }
const LINES: [string, string][] = [
  ['gary', 'gm'],
  ['ser_wagmi', 'gm gm'],
  ['anon_42', 'anyone awake?'],
  ['jarvis', 'gary you have 3 failing tests'],
  ['gary', 'they pass on my machine'],
  ['moonboi99', 'wen moon'],
  ['grandma_btc', 'how do i make the text bigger'],
  ['pixel_kid', 'check my new homepage, it has a guestbook'],
  ['dialup_dan', 'brb mom needs the phone'],
  ['xX_jeet_Xx', 'sold everything lol'],
  ['xX_jeet_Xx', 'wait it went up'],
  ['ser_wagmi', 'it’s so over'],
  ['anon_42', 'we’re so back'],
  ['jarvis', 'reminder: not financial advice'],
  ['n00b_deluxe', 'how do i leave this room'],
  ['gary', 'few understand'],
  ['pixel_kid', 'a/s/l?'],
  ['grandma_btc', ':-)'],
  ['moonboi99', 'this is the bottom. probably'],
  ['jarvis', 'deploying to prod… just kidding, it’s friday'],
  ['ser_wagmi', 'lmao'],
  ['dialup_dan', 'back. 56k gang'],
]

type Msg = { nick: string; text: string; kind: 'say' | 'join' | 'quit' | 'me' }

export function create(ctx: SceneContext) {
  return new ChatRoom(ctx)
}

/** An old IRC-style chat room: a busy channel, a nick list, joins and quits, and nobody actually leaves. */
class ChatRoom extends PixelScene {
  msgs: Msg[] = []
  online = new Set(['gary', 'jarvis', 'ser_wagmi', 'anon_42', 'grandma_btc', 'pixel_kid'])
  i = 0
  timer = 0
  typing = ''
  constructor(ctx: SceneContext) {
    super(ctx)
    this.i = this.r.int(0, LINES.length - 1)
    for (let k = 0; k < 14; k++) this.post()
  }
  palette() {
    return PX.web
  }
  dither() {
    return 0.2
  }
  post() {
    const r = this.r
    if (r.chance(0.12)) {
      const off = NICKS.filter((n) => !this.online.has(n))
      if (off.length) {
        const n = r.pick(off)
        this.online.add(n)
        this.msgs.push({ nick: n, text: `has joined #afk-lounge`, kind: 'join' })
        return
      }
    }
    if (r.chance(0.08)) {
      const cand = [...this.online].filter((n) => n !== 'gary' && n !== 'jarvis')
      if (cand.length > 3) {
        const n = r.pick(cand)
        this.online.delete(n)
        this.msgs.push({ nick: n, text: r.pick(['has quit (Connection reset by peer)', 'has quit (brb)', 'has quit (Ping timeout)']), kind: 'quit' })
        return
      }
    }
    const [nick, text] = LINES[this.i % LINES.length]
    this.i++
    if (!this.online.has(nick)) {
      this.online.add(nick)
      this.msgs.push({ nick, text: 'has joined #afk-lounge', kind: 'join' })
    }
    if (r.chance(0.08)) this.msgs.push({ nick, text: r.pick(['waves', 'refreshes the chart', 'goes to make coffee', 'stares at the screen']), kind: 'me' })
    else this.msgs.push({ nick, text, kind: 'say' })
    if (this.msgs.length > 60) this.msgs.splice(0, this.msgs.length - 60)
  }
  step(dt: number) {
    this.timer += dt * this.num('speed')
    if (this.timer > 1.8) {
      this.timer = 0
      this.post()
    }
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    c.fillStyle = '#008080'
    c.fillRect(0, 0, w, h)
    const fs = Math.max(8, Math.min(7.5 * u, w / 44))
    const m = Math.max(4, fs * 0.8)
    const x = m
    const y = m
    const ww = w - m * 2
    const wh = h - m * 2
    // window
    c.fillStyle = '#c0c0c0'
    c.fillRect(x, y, ww, wh)
    const g = c.createLinearGradient(x, 0, x + ww, 0)
    g.addColorStop(0, '#000080')
    g.addColorStop(1, '#1084d0')
    c.fillStyle = g
    c.fillRect(x + 3, y + 3, ww - 6, fs * 1.7)
    font(c, fs, MONO, 700)
    c.fillStyle = '#ffffff'
    c.textBaseline = 'middle'
    c.fillText(fit(c, `mIRC32 - [#afk-lounge [${this.online.size}] [+nt]: gm. no financial advice here]`, ww - fs * 2), x + fs * 0.6, y + 3 + fs * 0.85)
    const top = y + fs * 2.4
    const inputH = fs * 1.8
    const nickW = w > h ? Math.min(ww * 0.22, fs * 13) : ww * 0.3
    const chatW = ww - nickW - fs * 0.9
    const chatH = wh - (top - y) - inputH - fs * 0.9
    // chat area
    c.fillStyle = '#ffffff'
    c.fillRect(x + fs * 0.3, top, chatW, chatH)
    c.fillRect(x + fs * 0.6 + chatW, top, nickW, chatH)
    c.fillRect(x + fs * 0.3, top + chatH + fs * 0.3, ww - fs * 0.6, inputH)
    font(c, fs, MONO, 400)
    const lh = fs * 1.45
    const rows = Math.floor((chatH - fs) / lh)
    // wrap messages into lines from the bottom
    const out: { pre: string; preCol: string; text: string; col: string }[] = []
    for (const msg of this.msgs.slice(-rows - 2)) {
      let pre = `<${msg.nick}> `
      let preCol = NICK_COL[msg.nick] ?? '#000000'
      let col = '#000000'
      let text = msg.text
      if (msg.kind === 'join') {
        pre = '* '
        text = `${msg.nick} ${msg.text}`
        preCol = col = '#008000'
      } else if (msg.kind === 'quit') {
        pre = '* '
        text = `${msg.nick} ${msg.text}`
        preCol = col = '#000080'
      } else if (msg.kind === 'me') {
        pre = '* '
        text = `${msg.nick} ${msg.text}`
        preCol = col = '#800080'
      }
      const room = chatW - fs * 1.2 - c.measureText(pre).width
      const words = text.split(' ')
      let line = ''
      let first = true
      for (const wd of words) {
        const t = line ? line + ' ' + wd : wd
        if (c.measureText(t).width > room && line) {
          out.push({ pre: first ? pre : '', preCol, text: line, col })
          first = false
          line = wd
        } else line = t
      }
      out.push({ pre: first ? pre : '', preCol, text: line, col })
    }
    const shown = out.slice(-rows)
    shown.forEach((l, i) => {
      const ly = top + fs * 0.8 + i * lh
      const px = x + fs * 0.8
      c.fillStyle = l.preCol
      c.fillText(l.pre, px, ly)
      c.fillStyle = l.col
      c.fillText(l.text, px + c.measureText(l.pre || ' '.repeat(0)).width + (l.pre ? 0 : c.measureText('<gary> ').width * 0.5), ly)
    })
    // nick list
    const ops = ['gary', 'jarvis']
    const list = [...this.online].sort((a, b) => (ops.includes(a) ? -1 : 0) - (ops.includes(b) ? -1 : 0) || a.localeCompare(b))
    list.forEach((n, i) => {
      const ly = top + fs * 0.8 + i * lh
      if (ly > top + chatH - fs) return
      c.fillStyle = '#000000'
      c.fillText(fit(c, (ops.includes(n) ? '@' : ' ') + n, nickW - fs), x + fs * 1 + chatW, ly)
    })
    // input line with a blinking caret
    const iy = top + chatH + fs * 0.3 + inputH / 2
    c.fillStyle = '#000000'
    const draft = 'brb'.slice(0, Math.floor(this.t % 6))
    c.fillText(draft, x + fs * 0.8, iy)
    if (Math.sin(this.t * 6) > 0) c.fillRect(x + fs * 0.8 + c.measureText(draft).width, iy - fs * 0.55, Math.max(1, fs * 0.08), fs * 1.1)
    c.textBaseline = 'alphabetic'
  }
}
