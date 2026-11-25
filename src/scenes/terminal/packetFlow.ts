import { PixelScene } from '../../engine/base'
import { PALETTES as PX } from '../../engine/pixel'
import { TAU } from '../../engine/math'
import { createNoise } from '../../engine/noise'
import type { SceneContext } from '../../engine/types'

/** Simulated traffic between made-up nodes. Nothing here touches the real network. */
const SCHEMES: Record<string, { bg: [string, string]; edge: string; node: string; packets: string[]; px?: string[] }> = {
  ice: { bg: ['#06121c', '#0b1f2e'], edge: 'rgba(120,190,255,0.16)', node: '#bfe3ff', packets: ['#59c8ff', '#9ef0ff', '#ffffff'] },
  ember: { bg: ['#140805', '#22100a'], edge: 'rgba(255,150,90,0.16)', node: '#ffd2b0', packets: ['#ff7a3d', '#ffc14d', '#ff4d6d'] },
  mono: { bg: ['#0c0c0d', '#161618'], edge: 'rgba(255,255,255,0.12)', node: '#e8e8e8', packets: ['#ffffff', '#bdbdbd'] },
  lcd: { bg: ['#141b0d', '#1f2a12'], edge: 'rgba(184,217,122,0.18)', node: '#b8d97a', packets: ['#d8f59a', '#b8d97a', '#fffaf0'] },
}

interface Node {
  x: number
  y: number
  bx: number
  by: number
  hub: boolean
  pulse: number
  label: string
}
interface Packet {
  path: number[]
  seg: number
  t: number
  color: string
  speed: number
}

export function create(ctx: SceneContext) {
  return new PacketFlow(ctx)
}

class PacketFlow extends PixelScene {
  nodes: Node[] = []
  edges: [number, number][] = []
  adj: number[][] = []
  packets: Packet[] = []
  spawn = 0
  noise = createNoise(3)
  constructor(ctx: SceneContext) {
    super(ctx)
    this.build()
  }
  layout() {
    this.build()
  }
  configure() {
    this.build()
  }
  build() {
    const n = Math.round(this.num('nodes') * this.density)
    const topo = this.str('topology')
    const W = this.w
    const H = this.h
    const m = Math.min(W, H)
    const nodes: Node[] = []
    const mk = (x: number, y: number, hub = false): Node => ({ x, y, bx: x, by: y, hub, pulse: 0, label: `10.${this.r.int(0, 9)}.${this.r.int(0, 254)}.${this.r.int(1, 254)}` })
    const edges: [number, number][] = []
    if (topo === 'ring') {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU
        const rr = m * 0.38 * (i % 2 ? 0.82 : 1)
        nodes.push(mk(W / 2 + Math.cos(a) * rr * (W / m) * 0.9, H / 2 + Math.sin(a) * rr, i % 6 === 0))
        edges.push([i, (i + 1) % n])
      }
      for (let i = 0; i < n; i += 6) edges.push([i, (i + Math.floor(n / 2)) % n])
    } else if (topo === 'star') {
      const hubs = Math.max(3, Math.round(n / 10))
      for (let h = 0; h < hubs; h++) {
        const a = (h / hubs) * TAU
        nodes.push(mk(W / 2 + Math.cos(a) * W * 0.22, H / 2 + Math.sin(a) * H * 0.22, true))
      }
      for (let h = 0; h < hubs; h++) edges.push([h, (h + 1) % hubs])
      for (let i = hubs; i < n; i++) {
        const h = i % hubs
        const a = this.r.range(0, TAU)
        const d = this.r.range(m * 0.08, m * 0.2)
        nodes.push(mk(nodes[h].x + Math.cos(a) * d * 1.3, nodes[h].y + Math.sin(a) * d))
        edges.push([h, i])
      }
    } else if (topo === 'tree') {
      nodes.push(mk(W / 2, H * 0.12, true))
      const levels = 4
      let prev = [0]
      for (let l = 1; l <= levels && nodes.length < n; l++) {
        const next: number[] = []
        const count = Math.min(n - nodes.length, prev.length * 3)
        for (let k = 0; k < count; k++) {
          const parent = prev[Math.floor((k / count) * prev.length)]
          nodes.push(mk(W * 0.06 + ((k + 0.5) / count) * W * 0.88, H * 0.12 + (l / levels) * H * 0.76, l === 1))
          edges.push([parent, nodes.length - 1])
          next.push(nodes.length - 1)
        }
        prev = next
      }
    } else {
      // mesh: jittered grid + k nearest neighbours
      const cols = Math.round(Math.sqrt((n * W) / H))
      const rows = Math.ceil(n / cols)
      for (let i = 0; i < n; i++) {
        const cx = ((i % cols) + 0.5 + this.r.range(-0.35, 0.35)) / cols
        const cy = (Math.floor(i / cols) + 0.5 + this.r.range(-0.35, 0.35)) / rows
        nodes.push(mk(W * (0.04 + cx * 0.92), H * (0.06 + cy * 0.88), this.r.chance(0.1)))
      }
      for (let i = 0; i < n; i++) {
        const near = nodes
          .map((o, j) => ({ j, d: (o.x - nodes[i].x) ** 2 + (o.y - nodes[i].y) ** 2 }))
          .filter((o) => o.j !== i)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
        for (const o of near) if (!edges.some(([a, b]) => (a === i && b === o.j) || (a === o.j && b === i))) edges.push([i, o.j])
      }
    }
    this.nodes = nodes
    this.edges = edges
    this.adj = nodes.map(() => [])
    for (const [a, b] of edges) {
      this.adj[a].push(b)
      this.adj[b].push(a)
    }
    this.packets = []
  }
  palette() {
    const id = this.str('scheme')
    return id === 'ember' ? PX.warm16 : id === 'mono' ? PX.mono : id === 'lcd' ? PX.gary : PX.night16
  }
  dither() {
    return 0.4
  }
  route(a: number, b: number) {
    const prev = new Int32Array(this.nodes.length).fill(-1)
    prev[a] = a
    const q = [a]
    while (q.length) {
      const u = q.shift()!
      if (u === b) break
      for (const v of this.adj[u])
        if (prev[v] < 0) {
          prev[v] = u
          q.push(v)
        }
    }
    if (prev[b] < 0) return null
    const path = [b]
    while (path[0] !== a) path.unshift(prev[path[0]])
    return path
  }
  step(dt: number) {
    const sp = this.num('speed')
    const scheme = SCHEMES[this.str('scheme')] ?? SCHEMES.ice
    // gentle drift so the graph breathes
    for (let i = 0; i < this.nodes.length; i++) {
      const nd = this.nodes[i]
      const amp = Math.min(this.w, this.h) * 0.012
      nd.x = nd.bx + this.noise.noise2(i * 7.1, this.t * 0.07) * amp
      nd.y = nd.by + this.noise.noise2(i * 3.3 + 50, this.t * 0.07) * amp
      nd.pulse = Math.max(0, nd.pulse - dt * 1.6)
    }
    this.spawn += dt * sp * 11 * this.density
    while (this.spawn > 1 && this.packets.length < 260) {
      this.spawn--
      const a = this.r.int(0, this.nodes.length - 1)
      const b = this.r.int(0, this.nodes.length - 1)
      if (a === b) continue
      const path = this.route(a, b)
      if (path && path.length > 1) this.packets.push({ path, seg: 0, t: 0, color: this.r.pick(scheme.packets), speed: this.r.range(0.7, 1.3) })
      this.nodes[a].pulse = Math.max(this.nodes[a].pulse, 0.4)
    }
    const unit = Math.min(this.w, this.h) * 0.35
    for (const p of this.packets) {
      const A = this.nodes[p.path[p.seg]]
      const B = this.nodes[p.path[p.seg + 1]]
      const len = Math.hypot(B.x - A.x, B.y - A.y) || 1
      p.t += (dt * sp * unit * p.speed) / len
      while (p.t >= 1 && p.seg < p.path.length - 1) {
        p.t -= 1
        p.seg++
        this.nodes[p.path[p.seg]].pulse = Math.max(this.nodes[p.path[p.seg]].pulse, p.seg === p.path.length - 1 ? 1 : 0.35)
      }
    }
    this.packets = this.packets.filter((p) => p.seg < p.path.length - 1)
  }
  draw() {
    const c = this.c
    const sc = SCHEMES[this.str('scheme')] ?? SCHEMES.ice
    c.setTransform(1, 0, 0, 1, 0, 0)
    const g = c.createRadialGradient(this.w / 2, this.h / 2, 0, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.7)
    g.addColorStop(0, sc.bg[1])
    g.addColorStop(1, sc.bg[0])
    c.fillStyle = g
    c.fillRect(0, 0, this.w, this.h)
    const u = this.u
    c.strokeStyle = sc.edge
    c.lineWidth = 1.2 * u
    c.beginPath()
    for (const [a, b] of this.edges) {
      c.moveTo(this.nodes[a].x, this.nodes[a].y)
      c.lineTo(this.nodes[b].x, this.nodes[b].y)
    }
    c.stroke()
    // packets with a short comet tail along the edge
    c.globalCompositeOperation = 'lighter'
    for (const p of this.packets) {
      const A = this.nodes[p.path[p.seg]]
      const B = this.nodes[p.path[p.seg + 1]]
      const x = A.x + (B.x - A.x) * p.t
      const y = A.y + (B.y - A.y) * p.t
      const tt = Math.max(0, p.t - 0.25)
      const tx = A.x + (B.x - A.x) * tt
      const ty = A.y + (B.y - A.y) * tt
      const lg = c.createLinearGradient(tx, ty, x, y)
      lg.addColorStop(0, 'rgba(0,0,0,0)')
      lg.addColorStop(1, p.color)
      c.strokeStyle = lg
      c.lineWidth = 2.2 * u
      c.beginPath()
      c.moveTo(tx, ty)
      c.lineTo(x, y)
      c.stroke()
      c.fillStyle = p.color
      c.beginPath()
      c.arc(x, y, 2.4 * u, 0, TAU)
      c.fill()
    }
    for (const nd of this.nodes) {
      const r = (nd.hub ? 5 : 3) * u
      if (nd.pulse > 0) {
        c.strokeStyle = sc.node
        c.globalAlpha = nd.pulse * 0.35 * this.g.intensity
        c.lineWidth = 1.5 * u
        c.beginPath()
        c.arc(nd.x, nd.y, r + (1 - nd.pulse) * 18 * u, 0, TAU)
        c.stroke()
      }
      c.globalAlpha = 0.85
      c.fillStyle = sc.node
      c.beginPath()
      c.arc(nd.x, nd.y, r * (1 + nd.pulse * 0.4), 0, TAU)
      c.fill()
    }
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
    if (this.bool('labels')) {
      c.fillStyle = sc.node
      c.globalAlpha = 0.45
      c.font = `${Math.round(10 * u)}px "VT323", monospace`
      c.textAlign = 'left'
      for (const nd of this.nodes) if (nd.hub) c.fillText(nd.label, nd.x + 8 * u, nd.y - 6 * u)
      c.globalAlpha = 1
    }
  }
}
