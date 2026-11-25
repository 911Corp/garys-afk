/**
 * The scene contract. Every scene is a module that exports `create(ctx)` and is described by a
 * SceneEntry in its category's index file. The engine (Stage) owns the canvas, the clock, the
 * frame cap, resizing, pause/resume and disposal; scenes only update and draw.
 */

export type CategoryId = 'gary' | 'terminal' | 'cozy' | 'space' | 'retro' | 'nature' | 'pixel' | 'generative'

export type AmbienceId =
  | 'rain'
  | 'fire'
  | 'wind'
  | 'ocean'
  | 'white'
  | 'pink'
  | 'brown'
  | 'computer'
  | 'night'
  | 'underwater'
  | 'train'
  | 'storm'
  | 'arcade'
  | 'space'

export type RenderKind = 'pixel'

export type SettingValue = number | string | boolean

export type SettingDef =
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number; default: number; unit?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; default: string }
  | { key: string; label: string; type: 'toggle'; default: boolean }

export type SceneSettings = Record<string, SettingValue>

export interface SceneMeta {
  /** Stable id, used in storage, URLs and playlists. Never rename. */
  id: string
  name: string
  category: CategoryId
  description: string
  version: string
  render: RenderKind
  /** Buffer height multiplier (1 = 180 px at Balanced). Text-heavy scenes use more pixels. */
  pixelScale?: number
  /** 1 = light, 2 = medium, 3 = heavy on the CPU. */
  complexity: 1 | 2 | 3
  /** Ambiences that suit this scene, first one is the default. */
  audio: AmbienceId[]
  /** Gary can appear in this scene and the "Show Gary" setting applies. */
  gary: boolean
  /** The scene can produce bright flashes; it honours `noFlash`. */
  flashes?: boolean
  tags: string[]
}

export interface GlobalRender {
  /** 0..2, multiplies element counts where a scene supports it. */
  density: number
  /** 0..1.5, scales optional effects (glow, particles, bloom). */
  intensity: number
  showGary: boolean
  noFlash: boolean
  reducedMotion: boolean
  quality: 'low' | 'balanced' | 'high'
}

export interface SceneContext {
  canvas: HTMLCanvasElement
  /** Internal pixel size (already scaled for DPR and quality). */
  width: number
  height: number
  /** Internal pixels per CSS pixel. Use it to size strokes and text. */
  pixelRatio: number
  settings: SceneSettings
  global: GlobalRender
  /** Ask the audio engine for a one-shot (thunder, chime...). Does nothing when audio is off. */
  emit: (event: SceneEvent) => void
  /** Deterministic seed for this run. */
  seed: number
}

export type SceneEvent = { type: 'thunder'; strength: number; delay: number } | { type: 'chime' } | { type: 'blip' }

export interface SceneInstance {
  /** dt in seconds, already multiplied by the global speed and clamped. */
  update(dt: number): void
  render(): void
  resize(width: number, height: number, pixelRatio: number): void
  setSettings(settings: SceneSettings, global: GlobalRender): void
  dispose(): void
}

export interface SceneModule {
  create(ctx: SceneContext): SceneInstance
}

export interface SceneEntry {
  meta: SceneMeta
  settings: SettingDef[]
  load: () => Promise<SceneModule>
}

export function defaultSettings(defs: SettingDef[]): SceneSettings {
  const out: SceneSettings = {}
  for (const d of defs) out[d.key] = d.default
  return out
}

/** Keep only known keys with valid values; anything else falls back to the default. */
export function sanitizeSettings(defs: SettingDef[], input: unknown): SceneSettings {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const out: SceneSettings = {}
  for (const d of defs) {
    const v = src[d.key]
    if (d.type === 'range') {
      out[d.key] = typeof v === 'number' && Number.isFinite(v) ? Math.min(d.max, Math.max(d.min, v)) : d.default
    } else if (d.type === 'select') {
      out[d.key] = typeof v === 'string' && d.options.some((o) => o.value === v) ? v : d.default
    } else {
      out[d.key] = typeof v === 'boolean' ? v : d.default
    }
  }
  return out
}
