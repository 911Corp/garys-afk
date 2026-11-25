/**
 * Every sound in Gary's AFK is synthesised live with the Web Audio API: filtered noise, slow LFOs,
 * and small scheduled events (drips, crackles, clicks). No audio files, so nothing to license, and
 * the loops never have a seam. The AudioContext is only created after a user gesture.
 */
import type { AmbienceId, SceneEvent } from '../types'

interface Channel {
  gain: GainNode
  stop: () => void
}

export class AudioEngine {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  private channels = new Map<AmbienceId, Channel>()
  private noise: Record<'white' | 'pink' | 'brown', AudioBuffer> | null = null
  private levels: Partial<Record<AmbienceId, number>> = {}

  get running() {
    return this.ctx?.state === 'running'
  }

  /** Must be called from a click/tap/key handler. */
  async start() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.6
      // a gentle limiter so stacked ambiences never clip
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 4
      this.master.connect(comp).connect(this.ctx.destination)
      this.noise = { white: this.makeNoise('white'), pink: this.makeNoise('pink'), brown: this.makeNoise('brown') }
    }
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => undefined)
    this.apply()
    return this.running
  }

  suspend() {
    this.ctx?.suspend().catch(() => undefined)
  }

  setMaster(v: number) {
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
  }

  /** Desired level per ambience (0 = off). Channels are created and released as needed. */
  setLevels(levels: Partial<Record<AmbienceId, number>>) {
    this.levels = levels
    this.apply()
  }

  private apply() {
    if (!this.ctx || !this.running) return
    const t = this.ctx.currentTime
    for (const [id, ch] of this.channels) {
      const v = this.levels[id] ?? 0
      if (v <= 0.001) {
        ch.gain.gain.setTargetAtTime(0, t, 0.3)
        const old = ch
        this.channels.delete(id)
        setTimeout(() => old.stop(), 1500)
      } else ch.gain.gain.setTargetAtTime(v, t, 0.3)
    }
    for (const [id, v] of Object.entries(this.levels) as [AmbienceId, number][]) {
      if (v > 0.001 && !this.channels.has(id)) {
        const gain = this.ctx.createGain()
        gain.gain.value = 0
        gain.connect(this.master!)
        const stop = this.build(id, gain)
        gain.gain.setTargetAtTime(v, t, 0.6)
        this.channels.set(id, { gain, stop })
      }
    }
  }

  event(e: SceneEvent) {
    if (!this.ctx || !this.running) return
    if (e.type === 'thunder') setTimeout(() => this.thunder(e.strength), e.delay * 1000)
    else if (e.type === 'chime') this.chime()
    else this.blip()
  }

  /** Two soft notes, used by the focus timer and the DVD corner. */
  chime() {
    if (!this.ctx || !this.running) return
    const c = this.ctx
    ;[659.25, 987.77].forEach((f, i) => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'triangle'
      o.frequency.value = f
      const t0 = c.currentTime + i * 0.18
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(0.25, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2)
      o.connect(g).connect(this.master!)
      o.start(t0)
      o.stop(t0 + 1.3)
    })
  }

  dispose() {
    for (const ch of this.channels.values()) ch.stop()
    this.channels.clear()
    this.ctx?.close().catch(() => undefined)
    this.ctx = null
  }

  /* ---------------------------------------------------------------------------------------- */

  private makeNoise(kind: 'white' | 'pink' | 'brown') {
    const c = this.ctx!
    const len = c.sampleRate * 6
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') d[i] = w * 0.5
      else if (kind === 'pink') {
        // Paul Kellet's refined pink filter
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      } else {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      }
    }
    // crossfade the end into the start so the loop point is inaudible
    const fade = Math.floor(c.sampleRate * 0.25)
    for (let i = 0; i < fade; i++) {
      const k = i / fade
      d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k
    }
    return buf
  }

  private src(kind: 'white' | 'pink' | 'brown') {
    const s = this.ctx!.createBufferSource()
    s.buffer = this.noise![kind]
    s.loop = true
    s.start(0, Math.random() * 5)
    return s
  }

  private filt(type: BiquadFilterType, freq: number, q = 0.7) {
    const f = this.ctx!.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    return f
  }

  private lfo(rate: number, depth: number, target: AudioParam) {
    const o = this.ctx!.createOscillator()
    const g = this.ctx!.createGain()
    o.frequency.value = rate
    g.gain.value = depth
    o.connect(g).connect(target)
    o.start()
    return o
  }

  /** Random one-shots at a given average rate; returns a stop function. */
  private every(meanMs: number, fn: () => void) {
    let alive = true
    let timer = 0
    const loop = () => {
      if (!alive) return
      fn()
      timer = window.setTimeout(loop, meanMs * (0.3 + Math.random() * 1.4))
    }
    timer = window.setTimeout(loop, meanMs * Math.random())
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }

  private burst(out: AudioNode, kind: 'white' | 'pink' | 'brown', freq: number, q: number, dur: number, level: number, type: BiquadFilterType = 'bandpass') {
    const c = this.ctx!
    const s = c.createBufferSource()
    s.buffer = this.noise![kind]
    const f = this.filt(type, freq, q)
    const g = c.createGain()
    const t = c.currentTime
    g.gain.setValueAtTime(level, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(out)
    s.start(t, Math.random() * 5)
    s.stop(t + dur + 0.05)
  }

  private tone(out: AudioNode, type: OscillatorType, f0: number, f1: number, dur: number, level: number) {
    const c = this.ctx!
    const o = c.createOscillator()
    const g = c.createGain()
    const t = c.currentTime
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    g.gain.setValueAtTime(level, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private build(id: AmbienceId, out: GainNode): () => void {
    const stops: (() => void)[] = []
    const nodes: AudioScheduledSourceNode[] = []
    const chain = (s: AudioScheduledSourceNode, ...fx: AudioNode[]) => {
      nodes.push(s)
      let n: AudioNode = s
      for (const f of fx) n = n.connect(f)
      n.connect(out)
    }
    const gain = (v: number) => {
      const g = this.ctx!.createGain()
      g.gain.value = v
      return g
    }
    switch (id) {
      case 'white':
      case 'pink':
      case 'brown':
        chain(this.src(id), gain(0.5))
        break
      case 'rain':
        chain(this.src('pink'), this.filt('highpass', 500), this.filt('lowpass', 7000), gain(0.8))
        stops.push(this.every(60, () => this.burst(out, 'white', 2500 + Math.random() * 4000, 6, 0.04, 0.15)))
        break
      case 'fire': {
        chain(this.src('brown'), this.filt('lowpass', 500), gain(0.9))
        stops.push(this.every(140, () => this.burst(out, 'white', 1500 + Math.random() * 3000, 3, 0.02 + Math.random() * 0.05, 0.4)))
        stops.push(this.every(2500, () => this.burst(out, 'white', 900, 1.5, 0.18, 0.5)))
        break
      }
      case 'wind': {
        const bp = this.filt('bandpass', 500, 0.8)
        const g = gain(0.9)
        chain(this.src('pink'), bp, g)
        nodes.push(this.lfo(0.07, 300, bp.frequency), this.lfo(0.11, 0.4, g.gain))
        break
      }
      case 'ocean': {
        const g = gain(0.6)
        chain(this.src('brown'), this.filt('lowpass', 900), g)
        nodes.push(this.lfo(0.11, 0.5, g.gain))
        const g2 = gain(0.25)
        const hp = this.filt('highpass', 1800)
        chain(this.src('pink'), hp, g2)
        nodes.push(this.lfo(0.11, 0.24, g2.gain))
        break
      }
      case 'storm': {
        chain(this.src('pink'), this.filt('highpass', 400), this.filt('lowpass', 5000), gain(0.8))
        const g = gain(0.5)
        chain(this.src('brown'), this.filt('lowpass', 120), g)
        nodes.push(this.lfo(0.05, 0.4, g.gain))
        break
      }
      case 'night': {
        chain(this.src('pink'), this.filt('lowpass', 1200), gain(0.15))
        stops.push(
          this.every(900, () => {
            const f = 4200 + Math.random() * 600
            for (let k = 0; k < 3; k++) setTimeout(() => this.ctx && this.tone(out, 'sine', f, f * 0.98, 0.05, 0.05), k * 70)
          }),
        )
        break
      }
      case 'underwater': {
        chain(this.src('brown'), this.filt('lowpass', 300), gain(0.8))
        stops.push(this.every(700, () => this.tone(out, 'sine', 300 + Math.random() * 500, 900 + Math.random() * 900, 0.12, 0.12)))
        break
      }
      case 'train': {
        chain(this.src('brown'), this.filt('lowpass', 400), gain(0.8))
        let alive = true
        const clack = () => {
          if (!alive || !this.ctx) return
          this.burst(out, 'white', 700, 2, 0.08, 0.5)
          setTimeout(() => alive && this.ctx && this.burst(out, 'white', 600, 2, 0.08, 0.4), 160)
          setTimeout(clack, 1100)
        }
        clack()
        stops.push(() => (alive = false))
        break
      }
      case 'computer': {
        const hum = this.ctx!.createOscillator()
        hum.frequency.value = 50
        chain(hum, gain(0.05))
        chain(this.src('pink'), this.filt('bandpass', 900, 0.6), gain(0.35))
        stops.push(this.every(1800, () => this.burst(out, 'white', 3000, 8, 0.015, 0.25)))
        break
      }
      case 'arcade': {
        chain(this.src('pink'), this.filt('lowpass', 800), gain(0.12))
        const notes = [262, 330, 392, 523, 659, 784]
        stops.push(
          this.every(1400, () => {
            const base = notes[Math.floor(Math.random() * notes.length)]
            for (let k = 0; k < 4; k++) setTimeout(() => this.ctx && this.tone(out, 'square', base * [1, 1.25, 1.5, 2][k], base * [1, 1.25, 1.5, 2][k], 0.08, 0.025), k * 90)
          }),
        )
        break
      }
      case 'space': {
        for (const f of [55, 55.4, 82.4]) {
          const o = this.ctx!.createOscillator()
          o.frequency.value = f
          chain(o, gain(0.08))
        }
        const bp = this.filt('bandpass', 300, 2)
        chain(this.src('pink'), bp, gain(0.25))
        nodes.push(this.lfo(0.03, 150, bp.frequency))
        break
      }
    }
    for (const n of nodes) if ((n as OscillatorNode).frequency && !(n as unknown as { started?: boolean }).started) {
      try {
        n.start()
      } catch {
        /* already started */
      }
    }
    return () => {
      stops.forEach((s) => s())
      nodes.forEach((n) => {
        try {
          n.stop()
        } catch {
          /* already stopped */
        }
        n.disconnect()
      })
      out.disconnect()
    }
  }

  private thunder(strength: number) {
    if (!this.ctx || !this.running) return
    const c = this.ctx
    const s = c.createBufferSource()
    s.buffer = this.noise!.brown
    const f = this.filt('lowpass', 900)
    const g = c.createGain()
    const t = c.currentTime
    f.frequency.setValueAtTime(1200, t)
    f.frequency.exponentialRampToValueAtTime(80, t + 4)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.9 * strength, t + 0.08)
    g.gain.exponentialRampToValueAtTime(0.001, t + 5)
    s.connect(f).connect(g).connect(this.master!)
    s.start(t, Math.random() * 2)
    s.stop(t + 5.2)
  }

  private blip() {
    if (!this.ctx || !this.running) return
    this.tone(this.master!, 'square', 880, 1320, 0.08, 0.06)
  }
}

export const audio = new AudioEngine()
