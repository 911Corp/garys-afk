/**
 * Everything Gary's AFK remembers lives in one JSON object in localStorage. It is versioned:
 * `migrate()` upgrades anything older, and `sanitize()` is used both on load and on import, so a
 * hand-edited or foreign file can never put the app in a bad state. Nothing is ever executed.
 */
import type { AmbienceId, SceneSettings } from '../engine/types'

export const SCHEMA_VERSION = 1

export type Quality = 'low' | 'balanced' | 'high'
export type ClockPos = 'tl' | 'tr' | 'bl' | 'br' | 'center'

export interface PlaylistItem {
  sceneId: string
  /** minutes */
  duration: number
}
export interface Playlist {
  id: string
  name: string
  items: PlaylistItem[]
  shuffle: boolean
  loop: boolean
  /** seconds of fade between scenes */
  transition: number
}

export interface State {
  v: number
  lastScene: string
  favorites: string[]
  recents: string[]
  sceneSettings: Record<string, SceneSettings>
  display: {
    speed: number
    brightness: number
    intensity: number
    density: number
    quality: Quality
    fps: 15 | 30 | 60
    crt: 'off' | 'subtle' | 'strong'
    showGary: boolean
    autoHide: boolean
  }
  clock: { show: boolean; date: boolean; h24: boolean; pos: ClockPos; size: number; opacity: number }
  audio: { enabled: boolean; master: number; sceneAmbience: boolean; sceneLevel: number; mix: Partial<Record<AmbienceId, number>> }
  afk: { enabled: boolean; delay: number; target: string; exitOnInput: boolean }
  focus: { work: number; short: number; long: number; rounds: number; notify: boolean; chime: boolean }
  access: { reducedMotion: 'auto' | 'on' | 'off'; noFlash: boolean; oledShift: boolean; powerSaver: boolean }
  playlists: Playlist[]
}

export const AMBIENCES: { id: AmbienceId; name: string }[] = [
  { id: 'rain', name: 'Rain' },
  { id: 'fire', name: 'Fire crackle' },
  { id: 'wind', name: 'Wind' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'storm', name: 'Storm' },
  { id: 'night', name: 'Night crickets' },
  { id: 'underwater', name: 'Underwater' },
  { id: 'train', name: 'Train' },
  { id: 'computer', name: 'Computer room' },
  { id: 'arcade', name: 'Arcade bleeps' },
  { id: 'space', name: 'Space drone' },
  { id: 'white', name: 'White noise' },
  { id: 'pink', name: 'Pink noise' },
  { id: 'brown', name: 'Brown noise' },
]

export function defaults(): State {
  return {
    v: SCHEMA_VERSION,
    lastScene: 'gary-exe',
    favorites: [],
    recents: [],
    sceneSettings: {},
    display: { speed: 1, brightness: 1, intensity: 1, density: 1, quality: 'balanced', fps: 30, crt: 'off', showGary: true, autoHide: true },
    clock: { show: true, date: false, h24: true, pos: 'tr', size: 1, opacity: 0.85 },
    audio: { enabled: false, master: 0.6, sceneAmbience: true, sceneLevel: 0.7, mix: {} },
    afk: { enabled: false, delay: 5, target: 'current', exitOnInput: true },
    focus: { work: 25, short: 5, long: 15, rounds: 4, notify: false, chime: true },
    access: { reducedMotion: 'auto', noFlash: false, oledShift: false, powerSaver: false },
    playlists: [],
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const num = (v: unknown, d: number, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const oneOf = <T extends string | number>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d)
const str = (v: unknown, d: string, max = 80) => (typeof v === 'string' && v.length <= max ? v : d)
const ids = (v: unknown, valid: (id: string) => boolean, max: number) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && valid(x)))].slice(0, max) : [])

/** Upgrade older shapes. v0 (pre-release prototypes) had no version and is mapped field by field. */
export function migrate(raw: unknown): unknown {
  if (!isObj(raw)) return raw
  const v = typeof raw.v === 'number' ? raw.v : 0
  if (v === 0) {
    // prototype exports used `favourites` and a flat `settings` object
    return { ...raw, v: 1, favorites: raw.favorites ?? raw.favourites, display: raw.display ?? raw.settings }
  }
  return raw
}

/**
 * Turn any value into a valid State. Unknown keys are dropped, out-of-range numbers clamped,
 * unknown scene ids removed. `validScene` checks ids against the catalogue.
 */
export function sanitize(input: unknown, validScene: (id: string) => boolean, sanitizeScene: (id: string, s: unknown) => SceneSettings): State {
  const d = defaults()
  const raw = migrate(input)
  if (!isObj(raw)) return d
  const disp = isObj(raw.display) ? raw.display : {}
  const clk = isObj(raw.clock) ? raw.clock : {}
  const au = isObj(raw.audio) ? raw.audio : {}
  const afk = isObj(raw.afk) ? raw.afk : {}
  const fo = isObj(raw.focus) ? raw.focus : {}
  const ac = isObj(raw.access) ? raw.access : {}
  const mix: Partial<Record<AmbienceId, number>> = {}
  if (isObj(au.mix)) for (const a of AMBIENCES) if (typeof au.mix[a.id] === 'number') mix[a.id] = num(au.mix[a.id], 0, 0, 1)
  const sceneSettings: Record<string, SceneSettings> = {}
  if (isObj(raw.sceneSettings)) for (const [id, s] of Object.entries(raw.sceneSettings)) if (validScene(id)) sceneSettings[id] = sanitizeScene(id, s)
  const playlists: Playlist[] = Array.isArray(raw.playlists)
    ? raw.playlists
        .filter(isObj)
        .slice(0, 50)
        .map((p, i) => ({
          id: str(p.id, `pl-${i}`, 40),
          name: str(p.name, `Playlist ${i + 1}`, 60),
          items: Array.isArray(p.items)
            ? p.items
                .filter(isObj)
                .filter((it) => typeof it.sceneId === 'string' && validScene(it.sceneId))
                .slice(0, 200)
                .map((it) => ({ sceneId: it.sceneId as string, duration: num(it.duration, 5, 0.5, 240) }))
            : [],
          shuffle: bool(p.shuffle, false),
          loop: bool(p.loop, true),
          transition: num(p.transition, 1.5, 0, 10),
        }))
    : []
  return {
    v: SCHEMA_VERSION,
    lastScene: typeof raw.lastScene === 'string' && validScene(raw.lastScene) ? raw.lastScene : d.lastScene,
    favorites: ids(raw.favorites, validScene, 64),
    recents: ids(raw.recents, validScene, 12),
    sceneSettings,
    display: {
      speed: num(disp.speed, d.display.speed, 0.25, 3),
      brightness: num(disp.brightness, d.display.brightness, 0.2, 1.4),
      intensity: num(disp.intensity, d.display.intensity, 0, 1.5),
      density: num(disp.density, d.display.density, 0.25, 2),
      quality: oneOf(disp.quality, ['low', 'balanced', 'high'] as const, d.display.quality),
      fps: oneOf(disp.fps, [15, 30, 60] as const, d.display.fps),
      crt: oneOf(disp.crt, ['off', 'subtle', 'strong'] as const, d.display.crt),
      showGary: bool(disp.showGary, d.display.showGary),
      autoHide: bool(disp.autoHide, d.display.autoHide),
    },
    clock: {
      show: bool(clk.show, d.clock.show),
      date: bool(clk.date, d.clock.date),
      h24: bool(clk.h24, d.clock.h24),
      pos: oneOf(clk.pos, ['tl', 'tr', 'bl', 'br', 'center'] as const, d.clock.pos),
      size: num(clk.size, d.clock.size, 0.5, 3),
      opacity: num(clk.opacity, d.clock.opacity, 0.1, 1),
    },
    audio: {
      enabled: bool(au.enabled, d.audio.enabled),
      master: num(au.master, d.audio.master, 0, 1),
      sceneAmbience: bool(au.sceneAmbience, d.audio.sceneAmbience),
      sceneLevel: num(au.sceneLevel, d.audio.sceneLevel, 0, 1),
      mix,
    },
    afk: {
      enabled: bool(afk.enabled, d.afk.enabled),
      delay: num(afk.delay, d.afk.delay, 1, 120),
      target: typeof afk.target === 'string' && (['current', 'random'].includes(afk.target) || playlists.some((p) => p.id === afk.target)) ? afk.target : 'current',
      exitOnInput: bool(afk.exitOnInput, d.afk.exitOnInput),
    },
    focus: {
      work: num(fo.work, d.focus.work, 1, 180),
      short: num(fo.short, d.focus.short, 1, 60),
      long: num(fo.long, d.focus.long, 1, 120),
      rounds: num(fo.rounds, d.focus.rounds, 1, 12),
      notify: bool(fo.notify, d.focus.notify),
      chime: bool(fo.chime, d.focus.chime),
    },
    access: {
      reducedMotion: oneOf(ac.reducedMotion, ['auto', 'on', 'off'] as const, d.access.reducedMotion),
      noFlash: bool(ac.noFlash, d.access.noFlash),
      oledShift: bool(ac.oledShift, d.access.oledShift),
      powerSaver: bool(ac.powerSaver, d.access.powerSaver),
    },
    playlists,
  }
}

/** Strict check for imports: reject what clearly isn't a Gary's AFK file instead of silently resetting. */
export function checkImport(raw: unknown): string | null {
  if (!isObj(raw)) return 'This file is not a Gary’s AFK settings file.'
  if (raw.app !== 'garys-afk') return 'This file was not exported by Gary’s AFK.'
  if (typeof raw.v === 'number' && raw.v > SCHEMA_VERSION) return 'This file comes from a newer version of Gary’s AFK.'
  return null
}
