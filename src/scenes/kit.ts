/** Small drawing helpers shared by the v1.2 scenes. Everything here is plain Canvas 2D. */

export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace'
export const VT = '"VT323", "IBM Plex Mono", monospace'

/** Fictional tickers only. None of these refer to a real asset. */
export const TOKENS = ['$NGMI', '$WAGMI', '$SOOVER', '$SOBACK', '$RUGZILLA', '$JEETCOIN', '$HOPIUM2', '$GMGM', '$FEWUND', '$LIQD', '$COPEX', '$WENMOON'] as const

export function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2))
  c.beginPath()
  c.moveTo(x + k, y)
  c.lineTo(x + w - k, y)
  c.quadraticCurveTo(x + w, y, x + w, y + k)
  c.lineTo(x + w, y + h - k)
  c.quadraticCurveTo(x + w, y + h, x + w - k, y + h)
  c.lineTo(x + k, y + h)
  c.quadraticCurveTo(x, y + h, x, y + h - k)
  c.lineTo(x, y + k)
  c.quadraticCurveTo(x, y, x + k, y)
  c.closePath()
}

export function font(c: CanvasRenderingContext2D, px: number, family = MONO, weight = 400) {
  c.font = `${weight} ${Math.max(6, px)}px ${family}`
}

/** A soft radial glow. */
export function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, col)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  c.globalAlpha = a
  c.fillStyle = g
  c.fillRect(x - r, y - r, r * 2, r * 2)
  c.globalAlpha = 1
}

export function vgrad(c: CanvasRenderingContext2D, y0: number, y1: number, stops: string[]) {
  const g = c.createLinearGradient(0, y0, 0, y1)
  stops.forEach((s, i) => g.addColorStop(i / Math.max(1, stops.length - 1), s))
  return g
}

/** Fits a 16:9-ish "frame" (monitor, window) inside the screen with a margin, in units. */
export function frameRect(w: number, h: number, u: number, ratio = 16 / 10, margin = 14) {
  const mw = w - margin * 2 * u
  const mh = h - margin * 2 * u
  let fw = mw
  let fh = fw / ratio
  if (fh > mh) {
    fh = mh
    fw = fh * ratio
  }
  return { x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh }
}

/** Truncates text to fit a width (fast, character based for monospace). */
export function fit(c: CanvasRenderingContext2D, s: string, maxW: number) {
  if (c.measureText(s).width <= maxW) return s
  let n = s.length
  while (n > 1 && c.measureText(s.slice(0, n) + '…').width > maxW) n--
  return s.slice(0, n) + '…'
}
