import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import type { SceneContext } from '../../engine/types'
import { glow, rr } from '../kit'

export function create(ctx: SceneContext) {
  return new SleeperTrain(ctx)
}

/** A sleeper compartment at night: the landscape rolls past the window, the lamp glows, the tea trembles. */
class SleeperTrain extends PixelScene {
  dist = 0
  stars: { x: number; y: number }[] = []
  lights: { x: number; y: number; layer: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
    this.stars = Array.from({ length: 90 }, () => ({ x: this.r(), y: this.r() * 0.5 }))
    this.lights = Array.from({ length: 40 }, () => ({ x: this.r() * 6, y: this.r(), layer: this.r.int(0, 1) }))
  }
  palette() {
    return PX.night16
  }
  dither() {
    return 0.4
  }
  step(dt: number) {
    this.dist += dt * this.num('speed')
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    // gentle rocking of the whole carriage
    const rock = this.g.reducedMotion ? 0 : Math.sin(this.t * 2.2) * 0.6 * u + (Math.sin(this.t * 13) > 0.97 ? 0.8 * u : 0)
    c.fillStyle = '#16244a'
    c.fillRect(0, 0, w, h)
    c.save()
    c.translate(0, rock)
    // window
    const portrait = h > w
    const ww = portrait ? w * 0.84 : w * 0.56
    const wh = portrait ? h * 0.4 : h * 0.52
    const wx = (w - ww) / 2
    const wy = portrait ? h * 0.12 : h * 0.12
    c.save()
    rr(c, wx, wy, ww, wh, 8 * u)
    c.clip()
    const sky = c.createLinearGradient(0, wy, 0, wy + wh)
    sky.addColorStop(0, '#05060d')
    sky.addColorStop(1, '#24407a')
    c.fillStyle = sky
    c.fillRect(wx, wy, ww, wh)
    c.fillStyle = '#f2f4ff'
    for (const s of this.stars) c.fillRect(wx + s.x * ww, wy + s.y * wh, Math.max(1, 0.6 * u), Math.max(1, 0.6 * u))
    // moon, nearly still
    glow(c, wx + ww * 0.78, wy + wh * 0.22, 26 * u, 'rgba(242,244,255,0.4)')
    c.fillStyle = '#fff3d6'
    c.beginPath()
    c.arc(wx + ww * 0.78, wy + wh * 0.22, 7 * u, 0, TAU)
    c.fill()
    // parallax layers: far mountains, hills with village lights, near trees, poles
    const layers = [
      { speed: 0.02, col: '#24407a', base: 0.62, amp: 0.16, f: 0.8 },
      { speed: 0.08, col: '#16244a', base: 0.74, amp: 0.08, f: 2 },
    ]
    layers.forEach((L, li) => {
      const off = this.dist * L.speed
      c.fillStyle = L.col
      c.beginPath()
      c.moveTo(wx, wy + wh)
      for (let x = 0; x <= ww; x += 4 * u) {
        const k = x / ww + off
        c.lineTo(wx + x, wy + wh * (L.base - Math.abs(Math.sin(k * L.f * Math.PI)) * L.amp - Math.sin(k * 13) * 0.01))
      }
      c.lineTo(wx + ww, wy + wh)
      c.fill()
      if (li === 1)
        for (const lt of this.lights) {
          const x = ((((lt.x - off * 1.0) % 6) + 6) % 6) / 6
          if (x > 1) continue
          c.fillStyle = '#ffcf6a'
          c.fillRect(wx + x * ww, wy + wh * (0.76 + lt.y * 0.12), Math.max(1, 0.8 * u), Math.max(1, 0.8 * u))
        }
    })
    // near treeline rushing by
    const off2 = this.dist * 0.5
    c.fillStyle = '#05060d'
    for (let i = 0; i < 24; i++) {
      const x = ((((i * 0.13 - off2) % 1.4) + 1.4) % 1.4) - 0.2
      const th = wh * (0.18 + ((i * 37) % 10) / 60)
      c.beginPath()
      c.moveTo(wx + x * ww - 6 * u, wy + wh)
      c.lineTo(wx + x * ww, wy + wh - th)
      c.lineTo(wx + x * ww + 6 * u, wy + wh)
      c.fill()
    }
    // telegraph poles and wires whipping past
    const pole = (((this.dist * 1.6) % 1) + 1) % 1
    const px = wx + ww * (1.1 - pole * 1.4)
    c.fillStyle = '#05060d'
    c.fillRect(px, wy, 3 * u, wh)
    c.strokeStyle = '#05060d'
    c.lineWidth = Math.max(1, 0.5 * u)
    c.beginPath()
    c.moveTo(wx, wy + wh * 0.2)
    c.quadraticCurveTo(px - ww * 0.3, wy + wh * 0.28, px, wy + wh * 0.18)
    c.quadraticCurveTo(px + ww * 0.3, wy + wh * 0.28, wx + ww, wy + wh * 0.2)
    c.stroke()
    // reflection of the lamp on the glass
    glow(c, wx + ww * 0.15, wy + wh * 0.75, 20 * u, 'rgba(255,207,106,0.2)')
    c.restore()
    // window frame
    c.strokeStyle = '#6a95d4'
    c.lineWidth = 3 * u
    rr(c, wx, wy, ww, wh, 8 * u)
    c.stroke()
    // curtains, swaying with the carriage
    const sway = Math.sin(this.t * 2.2) * 2 * u
    for (const side of [-1, 1]) {
      const cx = side < 0 ? wx - 4 * u : wx + ww + 4 * u
      c.fillStyle = '#a3487a'
      c.beginPath()
      c.moveTo(cx, wy - 6 * u)
      c.lineTo(cx + side * 22 * u, wy - 6 * u)
      c.quadraticCurveTo(cx + side * 10 * u + sway, wy + wh * 0.5, cx + side * 18 * u + sway, wy + wh + 6 * u)
      c.lineTo(cx, wy + wh + 6 * u)
      c.fill()
      c.strokeStyle = '#6a2a52'
      c.lineWidth = Math.max(1, 0.6 * u)
      for (let k = 1; k < 4; k++) {
        c.beginPath()
        c.moveTo(cx + side * k * 5 * u, wy - 6 * u)
        c.lineTo(cx + side * k * 4 * u + sway * 0.6, wy + wh + 6 * u)
        c.stroke()
      }
    }
    // little table under the window, with a tea glass in a holder and a book
    const ty = wy + wh + 8 * u
    c.fillStyle = '#6b3a2a'
    c.fillRect(wx + ww * 0.25, ty, ww * 0.5, 4 * u)
    const gx = wx + ww * 0.42
    const tremble = Math.sin(this.t * 31) * 0.4 * u
    c.fillStyle = 'rgba(242,244,255,0.5)'
    c.fillRect(gx - 4 * u, ty - 12 * u, 8 * u, 12 * u)
    c.fillStyle = '#c8763a'
    c.fillRect(gx - 3.5 * u, ty - 9 * u + tremble, 7 * u, 8 * u - tremble)
    c.fillStyle = '#b5d0f0'
    c.fillRect(gx - 4.5 * u, ty - 6 * u, 9 * u, 6 * u)
    c.fillStyle = '#24407a'
    c.fillRect(wx + ww * 0.55, ty - 3 * u, 18 * u, 3 * u)
    c.fillStyle = '#ff8a5c'
    c.fillRect(wx + ww * 0.55, ty - 4.5 * u, 18 * u, 1.5 * u)
    // reading lamp on the wall
    const lx = wx - 12 * u
    const ly = wy + wh * 0.4
    if (lx > 6 * u) {
      glow(c, lx, ly, 40 * u, 'rgba(255,207,106,0.35)')
      c.fillStyle = '#ffcf6a'
      c.beginPath()
      c.arc(lx, ly, 4 * u, Math.PI, 0)
      c.fill()
    }
    // the edge of the bunk with a folded blanket
    const by = Math.min(h - 18 * u, ty + h * 0.18)
    c.fillStyle = '#24407a'
    c.fillRect(0, by, w, h - by)
    c.fillStyle = '#a3487a'
    rr(c, w * 0.08, by - 6 * u, w * 0.3, 10 * u, 3 * u)
    c.fill()
    c.fillStyle = '#f2f4ff'
    rr(c, w * 0.62, by - 8 * u, w * 0.22, 10 * u, 4 * u)
    c.fill()
    c.restore()
  }
}
