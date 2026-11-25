import { useSyncExternalStore } from 'react'
import { defaultSettings, sanitizeSettings, type SceneSettings } from '../engine/types'
import { sceneById } from '../scenes/registry'
import { checkImport, defaults, sanitize, SCHEMA_VERSION, type State } from './schema'

const KEY = 'garys-afk'

const validScene = (id: string) => !!sceneById(id)
const sanitizeScene = (id: string, s: unknown): SceneSettings => {
  const e = sceneById(id)
  return e ? sanitizeSettings(e.settings, s) : {}
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? sanitize(JSON.parse(raw), validScene, sanitizeScene) : defaults()
  } catch {
    return defaults() // storage blocked (private mode) or corrupted: start clean
  }
}

let state: State = load()
const subs = new Set<() => void>()
let saveTimer = 0

function persist() {
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota or private mode: the app keeps working, settings just won't persist */
    }
  }, 250)
}

export const store = {
  get: () => state,
  set(update: (s: State) => State) {
    state = update(state)
    persist()
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
  sceneSettings(id: string): SceneSettings {
    const e = sceneById(id)
    if (!e) return {}
    return { ...defaultSettings(e.settings), ...state.sceneSettings[id] }
  },
  exportJSON() {
    return JSON.stringify({ app: 'garys-afk', exportedAt: new Date().toISOString(), ...state, v: SCHEMA_VERSION }, null, 2)
  },
  /** Returns an error message, or null on success. */
  importJSON(text: string): string | null {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return 'This file is not valid JSON.'
    }
    const err = checkImport(raw)
    if (err) return err
    state = sanitize(raw, validScene, sanitizeScene)
    persist()
    subs.forEach((f) => f())
    return null
  },
  reset() {
    state = defaults()
    persist()
    subs.forEach((f) => f())
  },
}

export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => pick(store.get()))
}
