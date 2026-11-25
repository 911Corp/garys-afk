/**
 * Gary, ported from the canonical drawing code of the Purity-o-Meter (puritymeter.netlify.app).
 *
 * The primitives (ln, blob, dot), the seeded PRNG, the stroke widths, the wobble amplitudes and the
 * five desk poses are copied as-is. The only change: instead of SVG markup they return drawing ops
 * that the canvas renders through Path2D (which accepts the exact same path data).
 *
 * New poses (asleep, sipping, sitting in the grass, at the counter) are built from the same
 * primitives and the same body proportions: head blob r=10.5/10, headset band, filled earcup,
 * torso 2.6, limbs 2.3/2.2. Do not redraw Gary by hand: add poses here, with these primitives.
 */

export const INK = '#1f2a12'
export const LCD = '#b8d97a'

export type Op =
  | { k: 'path'; d: string; w: number; fill: boolean }
  | { k: 'text'; x: number; y: number; s: number; text: string; anchor: 'start' | 'middle' }

let _seed = 1
function rnd() {
  _seed |= 0
  _seed = (_seed + 0x6d2b79f5) | 0
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const jit = (a: number) => (rnd() - 0.5) * 2 * a
const f1 = (n: number) => n.toFixed(1)
export const seed = (s: number) => {
  _seed = s
}

type P = [number, number]

/** shaky polyline: every segment is chopped up and nudged so the line wobbles */
export function ln(pts: P[], w = 2.3, amp = 0.42, step = 7): Op[] {
  let d = ''
  pts.forEach((p, i) => {
    if (!i) {
      d += `M${f1(p[0] + jit(0.5))} ${f1(p[1] + jit(0.5))}`
      return
    }
    const q = pts[i - 1]
    const n = Math.max(1, Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]) / step))
    for (let k = 1; k <= n; k++) {
      const t = k / n
      d += ` L${f1(q[0] + (p[0] - q[0]) * t + jit(amp))} ${f1(q[1] + (p[1] - q[1]) * t + jit(amp))}`
    }
  })
  return [{ k: 'path', d, w, fill: false }]
}

/** lumpy ellipse that never quite closes (or overshoots) */
export function blob(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  { w = 2.3, fill = false, amp = 0.05, from = 0, to = 6.5 }: { w?: number; fill?: boolean; amp?: number; from?: number; to?: number } = {},
): Op[] {
  const pts: P[] = []
  for (let a = from; a <= to; a += 0.42) {
    const r = 1 + jit(amp)
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r])
  }
  if (fill) return [{ k: 'path', d: `M${pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L')}Z`, w: 1, fill: true }]
  return ln(pts, w, 0.2, 99)
}

export function dot(x: number, y: number, r: number): Op[] {
  return blob(x, y, r, r * (0.8 + rnd() * 0.4), { fill: true, amp: 0.2 })
}

export function txt(x: number, y: number, s: number, text: string, anchor: 'start' | 'middle' = 'middle'): Op[] {
  return [{ k: 'text', x, y, s, text, anchor }]
}

/** Box helper (used for props: windows, frames, signs). */
export function box(x: number, y: number, w: number, h: number, sw = 2.3): Op[] {
  return ln([[x, y], [x + w, y + 0.6], [x + w + 0.4, y + h], [x - 0.3, y + h + 0.4], [x, y - 0.5]], sw)
}

/* ------------------------------------------------------------------------------------------- */
/*  Canonical head (same construction as gary() in the Purity-o-Meter)                         */
/* ------------------------------------------------------------------------------------------- */

export function head(cx: number, cy: number): Op[] {
  return [
    ...blob(cx, cy, 10.5, 10, { amp: 0.05, from: -1.2, to: 5.35 }),
    ...ln([[cx - 10, cy - 2], [cx - 9, cy - 9], [cx - 3, cy - 12.5], [cx + 4, cy - 12], [cx + 10, cy - 6]], 2.4, 0.5), // headset band
    ...blob(cx - 5, cy + 1, 3.4, 4.6, { fill: true, amp: 0.15 }), // earcup
  ]
}

/** The five canonical faces, index = verdict level (0 Pure .. 4 SCAM). Gary looks right. */
export function face(level: number, cx: number, cy: number): Op[] {
  switch (level) {
    case 0:
      return [...ln([[cx + 1, cy - 3], [cx + 11, cy - 3.5]], 3.6, 0.3), ...ln([[cx + 3, cy + 4], [cx + 6, cy + 6.5], [cx + 10, cy + 3]], 2)]
    case 1:
      return [...dot(cx + 4, cy - 2, 1.2), ...dot(cx + 8.5, cy - 2.4, 1.6), ...ln([[cx + 3, cy + 5], [cx + 9, cy + 4.5]], 2)]
    case 2:
      return [
        ...dot(cx + 3, cy - 1.5, 1.4),
        ...dot(cx + 8, cy - 2, 1.4),
        ...ln([[cx + 2, cy - 6], [cx + 9, cy - 8.5]], 1.8),
        ...ln([[cx + 3, cy + 5], [cx + 6, cy + 3.5], [cx + 9, cy + 5.5]], 1.8, 0.3),
      ]
    case 3:
      return [
        ...blob(cx + 4, cy - 2, 2.4, 2.6, { w: 1.5 }),
        ...blob(cx + 10, cy - 2, 2.4, 2.6, { w: 1.5 }),
        ...dot(cx + 4, cy - 2, 0.7),
        ...dot(cx + 10, cy - 2, 0.7),
        ...ln([[cx + 2, cy + 6], [cx + 4, cy + 4], [cx + 6, cy + 6], [cx + 8, cy + 4], [cx + 10, cy + 6]], 1.6, 0.3),
      ]
    default:
      return [
        ...ln([[cx + 1, cy - 5], [cx + 5, cy - 1]], 1.8, 0.3),
        ...ln([[cx + 5, cy - 5], [cx + 1, cy - 1]], 1.8, 0.3),
        ...ln([[cx + 7, cy - 5], [cx + 11, cy - 1]], 1.8, 0.3),
        ...ln([[cx + 11, cy - 5], [cx + 7, cy - 1]], 1.8, 0.3),
        ...blob(cx + 6, cy + 5.5, 2.8, 3.4, { fill: true, amp: 0.2 }),
      ]
  }
}

/* ------------------------------------------------------------------------------------------- */
/*  The desk set: chair, desk, monitor, keyboard (canonical coordinates, viewBox 0 -12 140 112)  */
/* ------------------------------------------------------------------------------------------- */

export function chair(): Op[] {
  return [
    ...ln([[26, 24], [21, 26], [20, 40], [22, 55], [27, 68]]),
    ...ln([[24, 70], [56, 69]]),
    ...ln([[27, 74], [54, 73]], 1.6),
    ...ln([[41, 74], [41, 86]]),
    ...ln([[29, 92], [41, 86], [53, 92]]),
    ...dot(29, 93, 1.8),
    ...dot(53, 93, 1.8),
  ]
}
export function desk(): Op[] {
  return [...ln([[62, 64], [127, 63]]), ...ln([[67, 64], [66, 93]]), ...ln([[121, 63], [123, 93]])]
}
/** Monitor frame. The screen area is roughly x 90..121, y 31..54. */
export function monitor(): Op[] {
  return [...ln([[88, 30], [121, 28], [123, 54], [89, 56], [88, 29]]), ...ln([[106, 55], [105, 63]]), ...ln([[98, 63], [113, 62]])]
}
export const SCREEN = { x: 90.5, y: 31, w: 30.5, h: 23 }
export function keyboard(): Op[] {
  return ln([[71, 61.5], [88, 61]], 3.2, 0.4)
}

/** Canonical screen contents per verdict level (chart up, flat, zigzag, crash, RUG). */
export function canonicalScreen(level: number): Op[] {
  switch (level) {
    case 0:
      return [...ln([[92, 51], [99, 46], [104, 48], [110, 39], [118, 33]], 2), ...ln([[113, 33], [118, 33], [118, 38]], 2)]
    case 1:
      return ln([[92, 43], [98, 44], [104, 42], [111, 44], [118, 42]], 2)
    case 2:
      return ln([[92, 44], [96, 37], [100, 49], [104, 38], [108, 48], [112, 39], [117, 45]], 2, 0.4)
    case 3:
      return [...ln([[92, 34], [98, 38], [103, 37], [109, 45], [118, 51]], 2), ...ln([[113, 51], [118, 51], [118, 46]], 2)]
    default:
      return [...txt(105, 47, 13, 'RUG'), ...ln([[91, 31], [99, 40], [96, 44], [103, 53]], 1.4)]
  }
}

export type DeskPose = 0 | 1 | 2 | 3 | 4 | 'sleep' | 'sip'

export interface GaryFigure {
  ops: Op[]
  /** head centre, in the same coordinates, to place the speech bubble */
  headX: number
  headY: number
  motion: 'bob' | 'tremble' | 'breathe' | 'none'
}

/**
 * Gary sitting at his desk. Poses 0..4 are the five canonical verdict poses, translated exactly
 * from gary(). 'sleep' (head down on his arms, as in the reaction pack scene "sleeping in front of
 * the charts") and 'sip' (3AM, holding a cup) are built from the same rig.
 * The body is offset by (2.5, -1.6), like the canonical <g transform>.
 */
export function deskGary(pose: DeskPose, variant = 0): GaryFigure {
  const lvSeed = typeof pose === 'number' ? pose : pose === 'sleep' ? 11 : 12
  seed(7 + lvSeed * 101 + variant * 7919)
  const H: P = [32, 66]
  let N: P = [34, 47]
  let C: P = [37, 36]
  let arms: Op[] = []
  let legs: Op[] = []
  let extra: Op[] = []
  const legsDown = () => [
    ...ln([H, [44, 66], [57, 65]]),
    ...ln([[57, 65], [58, 78], [59, 90]]),
    ...ln([[59, 90], [67, 90]]),
    ...ln([[34, 68], [46, 68], [53, 68]], 2.2),
    ...ln([[53, 68], [53, 80], [52, 91]], 2.2),
    ...ln([[52, 91], [59, 91]], 2.2),
  ]
  let lv = 1
  let motion: GaryFigure['motion'] = 'bob'
  if (pose === 0) {
    lv = 0
    N = [30, 47]
    C = [32, 36]
    arms = [...ln([[31, 51], [21, 44], [25, 32]]), ...ln([[32, 51], [45, 45], [41, 31]])]
    legs = [
      ...ln([H, [46, 64], [58, 62]]),
      ...ln([[58, 62], [66, 62], [72, 59]]),
      ...ln([[72, 59], [73, 54]]),
      ...ln([[34, 68], [48, 67], [58, 65], [68, 63], [74, 62]], 2.2),
      ...ln([[74, 62], [76, 57]], 2.2),
    ]
    extra = [...ln([[61, 25], [61, 32]], 1.8), ...ln([[57.5, 28.5], [64.5, 28.5]], 1.8), ...ln([[10, 30], [10, 35]], 1.6), ...ln([[7.5, 32.5], [12.5, 32.5]], 1.6)]
  } else if (pose === 1) {
    arms = [...ln([[35, 51], [47, 57], [60, 60], [73, 61]]), ...ln([[35, 53], [45, 60], [60, 62], [80, 62]], 2.2)]
    legs = legsDown()
  } else if (pose === 2) {
    lv = 2
    N = [40, 48]
    C = [46, 39]
    arms = [...ln([[40, 52], [50, 57], [52, 49]]), ...ln([[40, 54], [56, 60], [77, 62]], 2.2)]
    legs = legsDown()
    extra = txt(66, 32, 15, '?', 'start')
  } else if (pose === 3) {
    lv = 3
    motion = 'tremble'
    arms = [...ln([[34, 51], [23, 44], [28, 30]]), ...ln([[36, 51], [50, 45], [46, 29]])]
    legs = legsDown()
    extra = [...blob(54, 26, 1.6, 3, { fill: true }), ...blob(22, 22, 1.4, 2.6, { fill: true })]
  } else if (pose === 4) {
    lv = 4
    motion = 'tremble'
    arms = [...ln([[34, 50], [24, 39], [19, 23]]), ...ln([[36, 50], [49, 38], [57, 22]])]
    legs = [
      ...ln([H, [44, 65], [55, 62]]),
      ...ln([[55, 62], [63, 56], [68, 52]]),
      ...ln([[68, 52], [71, 47]]),
      ...ln([[34, 68], [46, 68], [53, 68]], 2.2),
      ...ln([[53, 68], [53, 80], [52, 91]], 2.2),
      ...ln([[52, 91], [59, 91]], 2.2),
    ]
    extra = [...ln([[12, 20], [7, 16]], 1.8), ...ln([[10, 30], [4, 29]], 1.8), ...ln([[74, 28], [79, 23]], 1.8), ...ln([[75, 34], [82, 32]], 1.8)]
  } else if (pose === 'sleep') {
    // slumped forward, arms folded on the desk, head resting on them, eyes closed
    motion = 'breathe'
    N = [44, 52]
    C = [55, 50]
    arms = [...ln([[42, 55], [52, 60], [70, 60.5]]), ...ln([[43, 57], [56, 62], [74, 62]], 2.2), ...ln([[70, 60.5], [58, 59.5]], 2)]
    legs = legsDown()
  } else {
    // 'sip': upright, one hand on the mouse, the other bringing a cup to his mouth
    N = [35, 47]
    C = [38, 36]
    arms = [...ln([[36, 52], [45, 58], [52, 50], [47, 43]]), ...ln([[36, 54], [48, 61], [62, 62], [80, 62]], 2.2)]
    legs = legsDown()
    extra = [...ln([[44, 37], [50, 36.5], [49.5, 45], [44.5, 45.5], [44, 37]], 2), ...ln([[50, 39], [53, 40], [50, 43]], 1.6)]
  }
  const torso = ln([H, [(H[0] + N[0]) / 2 - 1, 57], N], 2.6)
  const [cx, cy] = C
  let f: Op[]
  if (pose === 'sleep') {
    // closed eye (a short arc) and a squashed mouth, head tilted on the arms
    f = [...ln([[cx + 3, cy - 2], [cx + 5.5, cy - 0.5], [cx + 8, cy - 2]], 1.8, 0.3), ...ln([[cx + 4, cy + 5], [cx + 7, cy + 5.5]], 1.8, 0.3)]
  } else if (pose === 'sip') {
    // tired: half-closed lids over the canonical "Mid" eyes
    f = [...ln([[cx + 2, cy - 3.6], [cx + 6, cy - 3.6]], 1.6, 0.2), ...ln([[cx + 7, cy - 4], [cx + 11, cy - 4.2]], 1.6, 0.2), ...dot(cx + 4, cy - 2, 1), ...dot(cx + 8.8, cy - 2.2, 1.2)]
  } else f = face(lv, cx, cy)
  const body = [...legs, ...torso, ...arms, ...head(cx, cy), ...f, ...extra]
  return { ops: body, headX: cx + 2.5, headY: cy - 1.6, motion }
}

/** Gary sitting cross-legged in the grass, checking his phone (Touch Grass). Ground at y = 92. */
export function grassGary(lookUp: boolean, variant = 0): GaryFigure {
  seed(7 + 21 * 101 + variant * 7919)
  const H: P = [60, 84]
  const N: P = [62, 64]
  const C: P = lookUp ? [62, 52] : [64, 53]
  const legs = [...ln([H, [72, 88], [82, 90], [70, 92]]), ...ln([[62, 86], [50, 90], [42, 91], [56, 92]], 2.2)]
  const torso = ln([H, [60, 74], N], 2.6)
  const arms = lookUp
    ? [...ln([[62, 68], [70, 76], [78, 80]]), ...ln([[61, 69], [52, 78], [44, 83]], 2.2)]
    : [...ln([[62, 68], [72, 74], [76, 66]]), ...ln([[61, 70], [70, 78], [77, 70]], 2.2)]
  const phone = lookUp ? ln([[78, 79], [84, 78], [85, 82], [79, 83], [78, 79]], 1.8) : ln([[74, 58], [80, 57.5], [81, 67], [75, 67.5], [74, 58]], 1.8)
  const f = lookUp ? face(1, C[0], C[1]) : face(2, C[0], C[1]).slice(0, 2).concat(ln([[C[0] + 3, C[1] + 5], [C[0] + 8, C[1] + 5]], 1.8))
  return { ops: [...legs, ...torso, ...arms, ...phone, ...head(C[0], C[1]), ...f], headX: C[0], headY: C[1], motion: 'breathe' }
}

/** Gary behind the burger counter with his paper cap. Counter top at y = 70. armOut: serving. */
export function counterGary(armOut: number, variant = 0): GaryFigure {
  seed(7 + 31 * 101 + variant * 7919)
  const H: P = [50, 80]
  const N: P = [50, 52]
  const C: P = [52, 40]
  const torso = ln([H, [49, 66], N], 2.6)
  const reach = 64 + armOut * 22
  const arms = [...ln([[51, 56], [60, 62], [reach, 58 - armOut * 4]]), ...ln([[50, 58], [44, 66], [46, 72]], 2.2)]
  const tray = armOut > 0.5 ? [...ln([[reach - 2, 56 - armOut * 4], [reach + 12, 55 - armOut * 4]], 2.2), ...blob(reach + 5, 52 - armOut * 4, 5, 3, { fill: true, amp: 0.15 })] : []
  const cap = [...ln([[C[0] - 9, C[1] - 7], [C[0] - 8, C[1] - 15], [C[0] + 8, C[1] - 15.5], [C[0] + 9, C[1] - 7]], 2.2), ...ln([[C[0] - 10, C[1] - 7], [C[0] + 10, C[1] - 7.5]], 2.2)]
  return { ops: [...torso, ...arms, ...tray, ...head(C[0], C[1]), ...face(1, C[0], C[1]), ...cap], headX: C[0], headY: C[1] - 8, motion: 'bob' }
}
