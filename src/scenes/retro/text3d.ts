import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { mix } from '../../engine/math'
import type { SceneContext } from '../../engine/types'

const STYLES: Record<string, { face: [string, string]; side: [string, string] }> = {
  chrome: { face: ['#ffffff', '#9af5ff'], side: ['#5a5a7a', '#120a24'] },
  gold: { face: ['#fff3a0', '#ffb43d'], side: ['#a8541a', '#2a1206'] },
  neon: { face: ['#ffd0e6', '#ff2e88'], side: ['#1e7a9a', '#07040f'] },
}

export function create(ctx: SceneContext) {
  return new Text3d(ctx)
}

/** 3D Text, the old screensaver, with words of the trade: extruded letters spinning, seesawing and wobbling. */
class Text3d extends PixelScene {
  palette() {
    return PX.neon16
  }
  dither() {
    return 0.35
  }
  step() {}
  draw() {
    const c = this.c
    const { w, h } = this
    c.fillStyle = '#000000'
    c.fillRect(0, 0, w, h)
    const text = this.str('text')
    const S = STYLES[this.str('style')] ?? STYLES.chrome
    const sp = this.num('speed')
    const t = this.t * sp
    const motion = this.str('motion')
    let ry = 0
    let rx = 0
    let rz = 0
    if (motion === 'spin') ry = t * 0.9
    else if (motion === 'seesaw') {
      ry = Math.sin(t * 0.8) * 0.9
      rz = Math.sin(t * 0.8 + 1) * 0.15
    } else {
      ry = Math.sin(t * 0.7) * 0.6
      rx = Math.sin(t * 1.1) * 0.35
      rz = Math.sin(t * 0.5) * 0.12
    }
    const cosY = Math.cos(ry)
    const sinY = Math.sin(ry)
    // pick a font size that fits the word
    let fs = Math.min(h * 0.38, w * 0.3)
    c.font = `800 ${fs}px "IBM Plex Mono", ui-monospace, monospace`
    const tw = c.measureText(text).width
    if (tw > w * 0.78) {
      fs *= (w * 0.78) / tw
      c.font = `800 ${fs}px "IBM Plex Mono", ui-monospace, monospace`
    }
    const depth = fs * 0.2
    const layers = Math.max(6, Math.round(depth / Math.max(1, fs * 0.012)))
    const cx = w / 2 + Math.sin(t * 0.37) * w * 0.08
    const cy = h / 2 + Math.cos(t * 0.29) * h * 0.06
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    // which side faces us decides the drawing order of the extrusion
    const faceFront = cosY >= 0
    const drawLayer = (k: number, col: string | CanvasGradient) => {
      // k: 0 = front face, 1 = back face
      const z = (k - 0.5) * depth
      c.setTransform(Math.abs(cosY) < 0.04 ? 0.04 : cosY, Math.sin(rz), Math.sin(rx) * 0.3, Math.cos(rx), cx + sinY * z, cy + Math.sin(rx) * z * 0.6)
      c.fillStyle = col
      c.fillText(text, 0, 0)
      if (k === 0 || k === 1) {
        c.strokeStyle = 'rgba(7,4,15,0.6)'
        c.lineWidth = Math.max(1, fs * 0.015)
        c.strokeText(text, 0, 0)
      }
    }
    const sideGrad = (k: number) => {
      return mix(S.side[0], S.side[1], Math.min(1, k))
    }
    const order = Array.from({ length: layers + 1 }, (_, i) => i / layers)
    if (faceFront) order.reverse()
    for (const k of order) {
      const isFace = faceFront ? k === 0 : k === 1
      if (isFace) {
        const g = c.createLinearGradient(0, -fs * 0.5, 0, fs * 0.5)
        g.addColorStop(0, S.face[0])
        g.addColorStop(1, S.face[1])
        drawLayer(k, g)
      } else drawLayer(k, sideGrad(Math.abs(k - (faceFront ? 0 : 1))))
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
}
