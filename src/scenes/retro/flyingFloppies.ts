import { PixelScene } from '../../engine/base'
import type { SceneContext } from '../../engine/types'

/**
 * An original take on the "flying objects" screensaver idea: winged floppy disks and CRT monitors.
 * All sprites below are drawn for this project.
 */
const COL: Record<string, string> = {
  b: '#14284a', B: '#2f6fb0', m: '#8b8598', M: '#d8d8e0', w: '#f2f0e6', W: '#b6c4d8', k: '#0d0b14',
  c: '#b8a888', C: '#e0d4b8', s: '#1e3d5c', S: '#5ab4e5', g: '#9fd45a', r: '#e2614f',
}
const FLOPPY = [
  'BBBBBBBBBBBBBBB.',
  'BBBBmmmmmmmBBBBB',
  'BBBBmMMkkMmBBBBB',
  'BBBBmMMkkMmBBBBB',
  'BBBBmMMkkMmBBBBB',
  'BBBBmmmmmmmBBBBB',
  'BBBBBBBBBBBBBBBB',
  'BBwwwwwwwwwwwwBB',
  'BBwwwwwwwwwwwwBB',
  'BBwkkkkkkkkkwwBB',
  'BBwwwwwwwwwwwwBB',
  'BBwkkkkkkwwwwwBB',
  'BBwwwwwwwwwwwwBB',
  'BBwwwwwwwwwwwwBB',
  'bBBBBBBBBBBBBBBb',
  'bbbbbbbbbbbbbbbb',
]
const MONITOR = [
  '.CCCCCCCCCCCCCC.',
  'CCccccccccccccCC',
  'CcssSSSSSSSSscC.',
  'CcsSgSSSSSSSscC.',
  'CcsSSSSSSSSSscC.',
  'CcsSgggSSSSSscC.',
  'CcsSSSSSSSSSscC.',
  'CcsSgggggSSSscC.',
  'CcsSSSSSSSSSscC.',
  'CcssssssssssscC.',
  'CCccccccccccccC.',
  'CCcccccccccrccC.',
  '.CCCCCCCCCCCCC..',
  '....cccccccc....',
  '...CCCCCCCCCC...',
  '...cccccccccc...',
]
const WINGS = [
  ['......ww', '....wwWw', '..wwWWw.', '.wWWww..', 'wWww....', 'ww......', '........'],
  ['........', '........', 'wwwwwwww', 'WWWWWWww', 'wwwwww..', '........', '........'],
  ['........', '........', 'ww......', 'wWww....', '.wWWww..', '..wwWWw.', '....wwww'],
]

type Sprite = string[]

interface Flyer {
  x: number
  y: number
  scale: number
  ph: number
  sprite: Sprite
}

export function create(ctx: SceneContext) {
  return new FlyingFloppies(ctx)
}

class FlyingFloppies extends PixelScene {
  flyers: Flyer[] = []
  stars: { x: number; y: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return ['#000000', '#05060d', ...new Set(Object.values(COL))]
  }
  dither() {
    return 0
  }
  configure() {
    const n = Math.round(this.num('count') * this.density)
    this.flyers = Array.from({ length: n }, () => this.spawn(true))
    this.flyers.sort((a, b) => a.scale - b.scale)
    this.stars = Array.from({ length: 60 }, () => ({ x: this.r() * this.w, y: this.r() * this.h }))
  }
  pickSprite(): Sprite {
    const o = this.str('objects')
    return o === 'floppies' ? FLOPPY : o === 'monitors' ? MONITOR : this.r.chance(0.5) ? FLOPPY : MONITOR
  }
  spawn(anywhere: boolean): Flyer {
    const scale = this.r.pick([1, 1, 2, 2, 3]) * Math.max(1, Math.round(this.u))
    const x = anywhere ? this.r.range(0, this.w + 40) : this.r.range(this.w * 0.2, this.w + this.h)
    const y = anywhere ? this.r.range(-40, this.h) : -24 * scale
    return { x, y, scale, ph: this.r() * 4, sprite: this.pickSprite() }
  }
  step(dt: number) {
    const sp = this.num('speed') * 16 * this.u
    for (let i = 0; i < this.flyers.length; i++) {
      const f = this.flyers[i]
      f.x -= sp * dt * (0.6 + f.scale * 0.25)
      f.y += sp * dt * 0.5 * (0.6 + f.scale * 0.25)
      f.ph += dt * 6 * this.num('speed')
      if (f.x < -30 * f.scale || f.y > this.h + 10) this.flyers[i] = this.spawn(false)
    }
  }
  blit(sprite: string[], x: number, y: number, s: number, flip = false) {
    const c = this.c
    for (let row = 0; row < sprite.length; row++) {
      const line = sprite[row]
      for (let col = 0; col < line.length; col++) {
        const ch = line[flip ? line.length - 1 - col : col]
        if (ch === '.' || ch === ' ') continue
        c.fillStyle = COL[ch]
        c.fillRect(x + col * s, y + row * s, s, s)
      }
    }
  }
  draw() {
    const c = this.c
    c.fillStyle = this.str('sky') === 'night' ? '#05060d' : '#000000'
    c.fillRect(0, 0, this.w, this.h)
    if (this.str('sky') === 'night') {
      c.fillStyle = '#b6c4d8'
      for (const s of this.stars) c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1)
    }
    for (const f of this.flyers) {
      const s = f.scale
      const x = Math.round(f.x)
      const y = Math.round(f.y)
      const frame = [0, 1, 2, 1][Math.floor(f.ph) % 4]
      this.blit(WINGS[frame], x - 7 * s, y - 2 * s, s, true)
      this.blit(f.sprite, x, y, s)
      this.blit(WINGS[frame], x + 15 * s, y - 2 * s, s, false)
    }
  }
}
