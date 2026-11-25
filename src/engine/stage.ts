import type { GlobalRender, SceneEntry, SceneEvent, SceneInstance, SceneSettings } from './types'

export interface StageOptions {
  speed: number
  fpsCap: 15 | 30 | 60
  global: GlobalRender
  onError?: (err: unknown) => void
  onEvent?: (e: SceneEvent) => void
}

/** Buffer height in pixels per quality level, before the scene's own pixelScale. */
const PIXEL_H = { low: 144, balanced: 180, high: 224 } as const

/**
 * Owns one canvas and runs one scene in it. A fresh canvas is created per scene because a canvas
 * cannot switch between 2D and WebGL contexts. Animation is time-based: scenes receive dt in
 * seconds, so they look the same at 15, 30 or 60 FPS.
 */
export class Stage {
  private host: HTMLElement
  private canvas: HTMLCanvasElement | null = null
  private scene: SceneInstance | null = null
  private entry: SceneEntry | null = null
  private raf = 0
  private last = 0
  private sinceFrame = 0
  private running = false
  private userPaused = false
  private ro: ResizeObserver
  private opts: StageOptions
  private token = 0
  private frames = 0
  private fpsWindow = 0
  /** Measured frames per second over the last second (for the performance readout). */
  measuredFps = 0
  w = 0
  h = 0

  constructor(host: HTMLElement, opts: StageOptions) {
    this.host = host
    this.opts = opts
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  async load(entry: SceneEntry, settings: SceneSettings, seed = (Math.random() * 1e9) | 0) {
    const my = ++this.token
    this.teardown()
    this.entry = entry
    let mod
    try {
      mod = await entry.load()
    } catch (e) {
      this.opts.onError?.(e)
      return
    }
    if (my !== this.token) return // another scene was requested meanwhile
    const canvas = document.createElement('canvas')
    canvas.className = 'stage-canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', `${entry.meta.name}: ${entry.meta.description}`)
    this.host.prepend(canvas)
    this.canvas = canvas
    const { w, h, pr } = this.measure()
    canvas.width = w
    canvas.height = h
    try {
      this.scene = mod.create({
        canvas,
        width: w,
        height: h,
        pixelRatio: pr,
        settings,
        global: this.opts.global,
        emit: (e) => this.opts.onEvent?.(e),
        seed,
      })
    } catch (e) {
      this.opts.onError?.(e)
      return
    }
    this.w = w
    this.h = h
    this.scene.render()
    this.startLoop()
  }

  setSettings(settings: SceneSettings) {
    this.scene?.setSettings(settings, this.opts.global)
    if (!this.running) this.scene?.render()
  }

  setOptions(opts: Partial<StageOptions>) {
    const qualityChanged = opts.global && opts.global.quality !== this.opts.global.quality
    this.opts = { ...this.opts, ...opts }
    if (opts.global && this.scene) this.scene.setSettings(this.currentSettingsPassthrough(), this.opts.global)
    if (qualityChanged) this.resize()
  }

  /** Scenes keep their own settings; global-only updates pass an empty object they merge with. */
  private currentSettingsPassthrough(): SceneSettings {
    return {}
  }

  pause() {
    this.userPaused = true
    this.stopLoop()
  }

  resume() {
    this.userPaused = false
    this.startLoop()
  }

  get paused() {
    return this.userPaused
  }

  /** Capture the current frame (used for the share/screenshot button). */
  snapshot(): string | null {
    try {
      return this.canvas?.toDataURL('image/png') ?? null
    } catch {
      return null
    }
  }

  destroy() {
    this.token++
    this.teardown()
    this.ro.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  private teardown() {
    this.stopLoop()
    try {
      this.scene?.dispose()
    } catch {
      /* a scene failing to dispose must not block the next one */
    }
    this.scene = null
    if (this.canvas) {
      this.canvas.width = this.canvas.height = 1
      this.canvas.remove()
    }
    this.canvas = null
  }

  private measure() {
    const rect = this.host.getBoundingClientRect()
    const cw = Math.max(1, rect.width)
    const ch = Math.max(1, rect.height)
    const target = PIXEL_H[this.opts.global.quality] * (this.entry?.meta.pixelScale ?? 1)
    // portrait screens: keep the short side at the target so pixels stay the same size
    const pr = target / Math.min(cw, ch)
    return { w: Math.max(16, Math.round(cw * pr)), h: Math.max(16, Math.round(ch * pr)), pr }
  }

  private resize() {
    if (!this.canvas || !this.scene) return
    const { w, h, pr } = this.measure()
    if (w === this.w && h === this.h) return
    this.w = w
    this.h = h
    this.canvas.width = w
    this.canvas.height = h
    this.scene.resize(w, h, pr)
    this.scene.render()
  }

  private onVisibility = () => {
    if (document.hidden) this.stopLoop()
    else this.startLoop()
  }

  private startLoop() {
    if (this.running || this.userPaused || !this.scene || document.hidden) return
    this.running = true
    this.last = performance.now()
    this.sinceFrame = 1
    this.raf = requestAnimationFrame(this.tick)
  }

  private stopLoop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private tick = (now: number) => {
    if (!this.running || !this.scene) return
    this.raf = requestAnimationFrame(this.tick)
    const elapsed = (now - this.last) / 1000
    this.last = now
    this.sinceFrame += elapsed
    const minFrame = 1 / this.opts.fpsCap - 0.002
    if (this.sinceFrame < minFrame) return
    const dt = Math.min(this.sinceFrame, 0.1) * this.opts.speed
    this.sinceFrame = 0
    this.frames++
    this.fpsWindow += elapsed
    try {
      this.scene.update(dt)
      this.scene.render()
    } catch (e) {
      this.stopLoop()
      this.opts.onError?.(e)
    }
    if (this.fpsWindow >= 1) {
      this.measuredFps = Math.round(this.frames / this.fpsWindow)
      this.frames = 0
      this.fpsWindow = 0
    }
  }
}
