import { PixelScene } from '../../engine/base'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

const PAL = ['#05060d', '#0d1226', '#16244a', '#24407a', '#3a63a8', '#6a95d4', '#b5d0f0', '#f2f4ff', '#2a1a12', '#4a2e1c', '#7a4a28', '#b4783c', '#ffcf6a', '#fff3b0', '#1d3b2a', '#3f7a4a']

export function create(ctx: SceneContext) {
  return new NightTrain(ctx)
}

/** Night train: the landscape slides by in layers while the compartment lamp glows and the tea shakes. */
class NightTrain extends PixelScene {
  noise = createNoise(19)
  dist = 0
  bump = 0
  clack = 0
  lights: { x: number; n: number }[] = []
  constructor(ctx: SceneContext) {
    super(ctx)
  }
  palette() {
    return PAL
  }
  dither() {
    return 0.45
  }
  get win() {
    const { w, h } = this
    return { x: Math.round(w * 0.1), y: Math.round(h * 0.12), w: Math.round(w * 0.8), h: Math.round(h * 0.52) }
  }
  step(dt: number) {
    const sp = this.num('speed')
    this.dist += dt * sp * 60 * this.u
    // rail joints: a little bump at a steady rhythm
    this.clack += dt * sp * 2.2
    if (this.clack > 1) {
      this.clack -= 1
      this.bump = this.g.reducedMotion ? 0 : 1
    }
    this.bump = Math.max(0, this.bump - dt * 8)
    if (this.r.chance(dt * 0.15 * sp)) this.lights.push({ x: this.dist + this.w * 1.2, n: this.r.int(3, 9) })
    this.lights = this.lights.filter((l) => l.x - this.dist * 0.5 > -this.w)
  }
  draw() {
    const c = this.c
    const { w, h, u } = this
    const W = this.win
    const scen = this.str('scenery')
    const by = Math.round(this.bump * u)
    // --- outside, clipped to the window ---
    c.save()
    c.beginPath()
    c.rect(W.x, W.y + by, W.w, W.h)
    c.clip()
    const g = c.createLinearGradient(0, W.y, 0, W.y + W.h)
    g.addColorStop(0, '#05060d')
    g.addColorStop(1, scen === 'snow' ? '#24407a' : '#16244a')
    c.fillStyle = g
    c.fillRect(W.x, W.y, W.w, W.h)
    for (let i = 0; i < 40; i++) {
      const sx = W.x + ((i * 97 - this.dist * 0.02) % W.w + W.w) % W.w
      c.fillStyle = '#b5d0f0'
      c.fillRect(Math.round(sx), W.y + ((i * 53) % (W.h * 0.5)), 1, 1)
    }
    c.fillStyle = '#f2f4ff'
    c.beginPath()
    c.arc(W.x + W.w * 0.75, W.y + W.h * 0.22, 8 * u, 0, Math.PI * 2)
    c.fill()
    const ridge = (speed: number, base: number, amp: number, freq: number, col: string, seed: number) => {
      c.fillStyle = col
      for (let x = W.x; x < W.x + W.w; x++) {
        const wx = (x + this.dist * speed) / u
        const y = W.y + W.h * base + this.noise.fbm2(wx * freq, seed, 3) * amp * u
        c.fillRect(x, Math.round(y), 1, W.y + W.h - Math.round(y))
      }
    }
    if (scen === 'coast') {
      ridge(0.05, 0.5, 14, 0.01, '#16244a', 1)
      // the sea, with moonlight glints
      c.fillStyle = '#0d1226'
      c.fillRect(W.x, W.y + W.h * 0.6, W.w, W.h)
      c.fillStyle = '#6a95d4'
      for (let i = 0; i < 30; i++) {
        const x = W.x + W.w * 0.75 + Math.sin(i * 12.9 + this.t) * 10 * u
        const y = W.y + W.h * 0.62 + i * 1.5 * u
        if (Math.sin(this.t * 4 + i) > 0) c.fillRect(Math.round(x), Math.round(y), Math.round(3 * u), 1)
      }
    } else {
      ridge(0.05, 0.42, 18, 0.008, scen === 'snow' ? '#6a95d4' : '#16244a', 1)
      ridge(0.25, 0.58, 10, 0.02, scen === 'snow' ? '#b5d0f0' : '#1d3b2a', 2)
    }
    // village lights in the middle distance
    for (const l of this.lights) {
      const lx = W.x + (l.x - this.dist * 0.5)
      for (let k = 0; k < l.n; k++) {
        c.fillStyle = k % 3 ? '#ffcf6a' : '#fff3b0'
        c.fillRect(Math.round(lx + k * 5 * u), Math.round(W.y + W.h * 0.66 - (k % 2) * 2 * u), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)))
      }
    }
    // near embankment, poles and wires rushing by
    c.fillStyle = scen === 'snow' ? '#f2f4ff' : '#05060d'
    c.fillRect(W.x, Math.round(W.y + W.h * 0.84), W.w, W.h)
    const gap = 90 * u
    const off = (this.dist * 1.6) % gap
    c.fillStyle = '#05060d'
    for (let x = W.x - off; x < W.x + W.w + gap; x += gap) {
      c.fillRect(Math.round(x), W.y + Math.round(W.h * 0.2), Math.max(2, Math.round(2 * u)), W.h)
      c.fillRect(Math.round(x - 4 * u), W.y + Math.round(W.h * 0.22), Math.round(10 * u), Math.max(1, Math.round(u)))
    }
    c.strokeStyle = '#0d1226'
    c.lineWidth = Math.max(1, Math.round(u * 0.6))
    for (let x = W.x - off; x < W.x + W.w; x += gap) {
      c.beginPath()
      c.moveTo(x, W.y + W.h * 0.23)
      c.quadraticCurveTo(x + gap / 2, W.y + W.h * 0.32, x + gap, W.y + W.h * 0.23)
      c.stroke()
    }
    // the compartment lamp reflected faintly in the glass
    if (this.bool('lamp')) {
      c.globalAlpha = 0.18
      c.fillStyle = '#ffcf6a'
      c.fillRect(W.x + W.w * 0.12, W.y + W.h * 0.5, 6 * u, 10 * u)
      c.globalAlpha = 1
    }
    c.restore()
    // --- inside ---
    c.translate(0, by)
    c.fillStyle = '#4a2e1c'
    c.fillRect(0, -2, w, W.y + 2)
    c.fillRect(0, W.y + W.h, w, h)
    c.fillRect(0, 0, W.x, h)
    c.fillRect(W.x + W.w, 0, w, h)
    c.fillStyle = '#7a4a28'
    c.fillRect(W.x - 3 * u, W.y - 3 * u, W.w + 6 * u, 3 * u)
    c.fillRect(W.x - 3 * u, W.y + W.h, W.w + 6 * u, 3 * u)
    c.fillRect(W.x - 3 * u, W.y, 3 * u, W.h)
    c.fillRect(W.x + W.w, W.y, 3 * u, W.h)
    // wall panels
    c.fillStyle = '#2a1a12'
    for (let x = 0; x < w; x += 40 * u) c.fillRect(Math.round(x), W.y + W.h + 8 * u, Math.max(1, Math.round(u)), h)
    // table, lamp and tea
    const ty = W.y + W.h + 14 * u
    c.fillStyle = '#b4783c'
    c.fillRect(W.x + W.w * 0.3, ty, W.w * 0.4, 4 * u)
    c.fillStyle = '#7a4a28'
    c.fillRect(W.x + W.w * 0.48, ty + 4 * u, 4 * u, h)
    const lx = W.x + W.w * 0.36
    if (this.bool('lamp')) {
      const lg = c.createRadialGradient(lx, ty - 10 * u, 2, lx, ty - 10 * u, 60 * u)
      lg.addColorStop(0, 'rgba(255,207,106,0.5)')
      lg.addColorStop(1, 'rgba(255,207,106,0)')
      c.fillStyle = lg
      c.fillRect(lx - 60 * u, ty - 70 * u, 120 * u, 100 * u)
    }
    c.fillStyle = '#ffcf6a'
    c.fillRect(lx - 6 * u, ty - 14 * u, 12 * u, 6 * u)
    c.fillStyle = '#7a4a28'
    c.fillRect(lx - u, ty - 8 * u, 2 * u, 8 * u)
    const cx = W.x + W.w * 0.58
    c.fillStyle = '#f2f4ff'
    c.fillRect(cx, ty - 7 * u, 8 * u, 7 * u)
    c.fillRect(cx + 8 * u, ty - 5 * u, 2 * u, 3 * u)
    c.fillStyle = '#b4783c'
    c.fillRect(cx + u, ty - 6 * u + (this.bump > 0.3 ? 1 : 0), 6 * u, u)
    // seat back on the right
    c.fillStyle = '#16244a'
    c.fillRect(w - W.x * 0.9, W.y + W.h * 0.4, W.x * 0.9, h)
    c.fillStyle = '#24407a'
    c.fillRect(w - W.x * 0.9, W.y + W.h * 0.4, W.x * 0.9, 4 * u)
    c.setTransform(1, 0, 0, 1, 0, 0)
  }
}
